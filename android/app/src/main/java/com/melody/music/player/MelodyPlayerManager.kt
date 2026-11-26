package com.melody.music.player

import android.content.Intent
import android.media.audiofx.Equalizer
import android.net.Uri
import androidx.media3.common.MediaItem
import androidx.media3.common.MediaMetadata
import androidx.media3.common.PlaybackException
import androidx.media3.common.Player
import com.melody.music.MelodyApplication
import com.melody.music.data.api.ApiClient
import com.melody.music.data.download.MelodyDownloadManager
import com.melody.music.data.model.Song
import kotlinx.coroutines.*
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import java.io.File
import java.util.Collections

enum class RepeatState {
    OFF, ALL, ONE
}

data class EqPreset(
    val name: String,
    val gains: List<Int> // 6 bands in dB: [-10 to +10]
)

object MelodyPlayerManager {

    private var service: MelodyPlaybackService? = null
    private val scope = CoroutineScope(Dispatchers.Main + SupervisorJob())
    private var progressJob: Job? = null
    private var playJob: Job? = null
    private var equalizer: Equalizer? = null

    // Pending play request if user taps a song before foreground service finishes binding
    private var pendingSong: Song? = null
    private var pendingQueue: List<Song> = emptyList()
    private var retryCountForCurrentSong = 0

    private val _currentSong = MutableStateFlow<Song?>(null)
    val currentSong: StateFlow<Song?> = _currentSong.asStateFlow()

    private val _isPlaying = MutableStateFlow(false)
    val isPlaying: StateFlow<Boolean> = _isPlaying.asStateFlow()

    private val _isBuffering = MutableStateFlow(false)
    val isBuffering: StateFlow<Boolean> = _isBuffering.asStateFlow()

    private val _playbackError = MutableStateFlow<String?>(null)
    val playbackError: StateFlow<String?> = _playbackError.asStateFlow()

    private val _progressMs = MutableStateFlow(0L)
    val progressMs: StateFlow<Long> = _progressMs.asStateFlow()

    private val _durationMs = MutableStateFlow(0L)
    val durationMs: StateFlow<Long> = _durationMs.asStateFlow()

    private val _queue = MutableStateFlow<List<Song>>(emptyList())
    val queue: StateFlow<List<Song>> = _queue.asStateFlow()

    private val _isShuffle = MutableStateFlow(false)
    val isShuffle: StateFlow<Boolean> = _isShuffle.asStateFlow()

    private val _repeatState = MutableStateFlow(RepeatState.OFF)
    val repeatState: StateFlow<RepeatState> = _repeatState.asStateFlow()

    private val _likedSongIds = MutableStateFlow<Set<Long>>(emptySet())
    val likedSongIds: StateFlow<Set<Long>> = _likedSongIds.asStateFlow()

    // 6-Band Equalizer State
    private val _eqEnabled = MutableStateFlow(false)
    val eqEnabled: StateFlow<Boolean> = _eqEnabled.asStateFlow()

    private val _eqBands = MutableStateFlow(listOf(0, 0, 0, 0, 0, 0))
    val eqBands: StateFlow<List<Int>> = _eqBands.asStateFlow()

    private val _currentPreset = MutableStateFlow("Flat")
    val currentPreset: StateFlow<String> = _currentPreset.asStateFlow()

    private var originalQueue: List<Song> = emptyList()

    val PRESETS = listOf(
        EqPreset("Flat", listOf(0, 0, 0, 0, 0, 0)),
        EqPreset("Bass Boost", listOf(7, 5, 2, 0, -1, -2)),
        EqPreset("Vocal Boost", listOf(-2, 0, 4, 6, 3, 1)),
        EqPreset("Acoustic", listOf(3, 2, 0, 2, 4, 3)),
        EqPreset("Electronic", listOf(6, 4, -1, 2, 5, 6)),
        EqPreset("Rock", listOf(5, 3, -2, 2, 4, 5))
    )

    fun clearError() {
        _playbackError.value = null
    }

    fun bindService(playbackService: MelodyPlaybackService) {
        service = playbackService

        playbackService.player.addListener(object : Player.Listener {
            override fun onIsPlayingChanged(playing: Boolean) {
                _isPlaying.value = playing
                if (playing) {
                    _isBuffering.value = false
                    _playbackError.value = null
                    retryCountForCurrentSong = 0
                    startProgressTracker()
                } else {
                    stopProgressTracker()
                }
            }

            override fun onPlaybackStateChanged(state: Int) {
                when (state) {
                    Player.STATE_BUFFERING -> {
                        _isBuffering.value = true
                    }
                    Player.STATE_READY -> {
                        _isBuffering.value = false
                        _playbackError.value = null
                        _durationMs.value = playbackService.player.duration.coerceAtLeast(0L)
                        attachEqualizer(playbackService.player.audioSessionId)
                    }
                    Player.STATE_ENDED -> {
                        _isBuffering.value = false
                        handleTrackEnded()
                    }
                    Player.STATE_IDLE -> {
                        _isBuffering.value = false
                    }
                }
            }

            override fun onPlayerError(error: PlaybackException) {
                error.printStackTrace()
                _isPlaying.value = false
                _isBuffering.value = false
                val failedSong = _currentSong.value

                // Auto-retry once via Vercel Edge fallback if remote stream failed
                if (failedSong != null && retryCountForCurrentSong < 1 && MelodyDownloadManager.getLocalFile(failedSong.id) == null) {
                    retryCountForCurrentSong++
                    scope.launch {
                        delay(350)
                        if (_currentSong.value?.id == failedSong.id) {
                            startPlaybackInternal(failedSong, useFallbackEdge = true)
                        }
                    }
                    return
                }

                _playbackError.value = "Could not play \"${failedSong?.title ?: "track"}\". Tap play to retry."
                try {
                    playbackService.player.stop()
                    playbackService.player.clearMediaItems()
                } catch (e: Exception) {
                    e.printStackTrace()
                }
            }
        })

        // Fetch initial liked songs
        refreshFavourites()

        // If user clicked a song while service was starting up, immediately play it now!
        val queuedSong = pendingSong
        val queuedList = pendingQueue
        if (queuedSong != null) {
            pendingSong = null
            pendingQueue = emptyList()
            playSong(queuedSong, queuedList)
        }
    }

    fun unbindService() {
        stopProgressTracker()
        playJob?.cancel()
        equalizer?.release()
        equalizer = null
        service = null
    }

    private fun handleTrackEnded() {
        when (_repeatState.value) {
            RepeatState.ONE -> {
                service?.player?.seekTo(0)
                service?.player?.play()
            }
            RepeatState.ALL -> {
                next(forceLoop = true)
            }
            RepeatState.OFF -> {
                val q = _queue.value
                val cur = _currentSong.value ?: return
                val curIdx = q.indexOfFirst { it.id == cur.id }
                if (curIdx != -1 && curIdx + 1 < q.size) {
                    playSong(q[curIdx + 1])
                } else {
                    _isPlaying.value = false
                }
            }
        }
    }

    fun refreshFavourites() {
        scope.launch {
            try {
                val res = ApiClient.service.getFavourites()
                if (res.success) {
                    _likedSongIds.value = res.data.map { it.id }.toSet()
                }
            } catch (_: Exception) {
                // Offline or unauthenticated — safe to ignore
            }
        }
    }

    fun toggleLike(song: Song) {
        val isLiked = _likedSongIds.value.contains(song.id)
        val updated = if (isLiked) _likedSongIds.value - song.id else _likedSongIds.value + song.id
        _likedSongIds.value = updated

        scope.launch {
            try {
                if (isLiked) {
                    ApiClient.service.removeFavourite(song.id)
                } else {
                    ApiClient.service.addFavourite(song.id)
                }
            } catch (e: Exception) {
                e.printStackTrace()
            }
        }
    }

    fun toggleShuffle() {
        val newShuffle = !_isShuffle.value
        _isShuffle.value = newShuffle

        val cur = _currentSong.value
        if (newShuffle) {
            val list = originalQueue.toMutableList()
            if (cur != null) list.remove(cur)
            Collections.shuffle(list)
            _queue.value = if (cur != null) listOf(cur) + list else list
        } else {
            _queue.value = originalQueue
        }

        // Pre-warm upcoming shuffled track on the server in background
        val q = _queue.value
        val curIdx = if (cur != null) q.indexOfFirst { it.id == cur.id } else -1
        if (curIdx != -1 && curIdx + 1 < q.size) {
            val nextSong = q[curIdx + 1]
            if (MelodyDownloadManager.getLocalFile(nextSong.id) == null) {
                scope.launch(Dispatchers.IO) {
                    try {
                        ApiClient.service.prewarmStream(nextSong.id)
                    } catch (_: Exception) {}
                }
            }
        }
    }

    fun cycleRepeat() {
        _repeatState.value = when (_repeatState.value) {
            RepeatState.OFF -> RepeatState.ALL
            RepeatState.ALL -> RepeatState.ONE
            RepeatState.ONE -> RepeatState.OFF
        }
    }

    fun playSong(song: Song, queueList: List<Song> = emptyList()) {
        _currentSong.value = song
        _playbackError.value = null
        retryCountForCurrentSong = 0

        if (queueList.isNotEmpty()) {
            originalQueue = queueList
            if (_isShuffle.value) {
                val list = queueList.toMutableList()
                list.remove(song)
                Collections.shuffle(list)
                _queue.value = listOf(song) + list
            } else {
                _queue.value = queueList
            }
        } else if (_queue.value.none { it.id == song.id }) {
            val updated = listOf(song) + _queue.value
            originalQueue = updated
            _queue.value = updated
        }

        // If playback service isn't bound yet (cold start or OS restarted service), wake it up and queue play!
        if (service == null) {
            pendingSong = song
            pendingQueue = queueList
            _isBuffering.value = true
            try {
                val ctx = MelodyApplication.instance
                ctx.startService(Intent(ctx, MelodyPlaybackService::class.java))
            } catch (e: Exception) {
                e.printStackTrace()
            }
            return
        }

        startPlaybackInternal(song, useFallbackEdge = false)
    }

    private fun startPlaybackInternal(song: Song, useFallbackEdge: Boolean) {
        playJob?.cancel()
        _isBuffering.value = true

        try {
            service?.player?.apply {
                stop()
                clearMediaItems()
            }
        } catch (e: Exception) {
            e.printStackTrace()
        }
        _progressMs.value = 0L
        _durationMs.value = (song.durationSeconds * 1000L).coerceAtLeast(0L)

        playJob = scope.launch {
            try {
                // 1. Check local device offline storage FIRST — plays 100% WITHOUT INTERNET!
                val localFile: File? = MelodyDownloadManager.getLocalFile(song.id)
                val isOfflineLocal = localFile != null && localFile.exists()
                val mediaUri: Uri = if (isOfflineLocal) {
                    Uri.fromFile(localFile)
                } else if (useFallbackEdge) {
                    Uri.parse("https://melody-chi-nine.vercel.app/api/stream/${song.id}")
                } else {
                    val base = ApiClient.baseUrl.trimEnd('/')
                    Uri.parse("$base/api/stream/${song.id}")
                }

                val localCover = MelodyDownloadManager.getLocalCoverFile(song.id)
                val artworkUri = if (localCover != null) {
                    Uri.fromFile(localCover)
                } else {
                    Uri.parse(song.getFullCoverUrl())
                }

                val mediaMetadata = MediaMetadata.Builder()
                    .setTitle(song.title)
                    .setArtist(song.artist)
                    .setAlbumTitle(song.album ?: "Melody")
                    .setArtworkUri(artworkUri)
                    .build()

                val mediaItem = MediaItem.Builder()
                    .setUri(mediaUri)
                    .setMediaMetadata(mediaMetadata)
                    .build()

                service?.player?.apply {
                    setMediaItem(mediaItem)
                    prepare()
                    play()
                }

                // Only call network prewarm / history when streaming online
                if (!isOfflineLocal) {
                    val q = _queue.value
                    val curIdx = q.indexOfFirst { it.id == song.id }
                    if (curIdx != -1 && curIdx + 1 < q.size) {
                        val nextSong = q[curIdx + 1]
                        if (MelodyDownloadManager.getLocalFile(nextSong.id) == null) {
                            scope.launch(Dispatchers.IO) {
                                try {
                                    ApiClient.service.prewarmStream(nextSong.id)
                                } catch (_: Exception) {}
                            }
                        }
                    }

                    scope.launch(Dispatchers.IO) {
                        try {
                            ApiClient.service.recordPlayed(song.id)
                        } catch (_: Exception) {}
                    }
                }
            } catch (e: CancellationException) {
                // Superseded by another song selection
            } catch (e: Exception) {
                e.printStackTrace()
                _isPlaying.value = false
                _isBuffering.value = false
                _playbackError.value = "Playback error on \"${song.title}\". Tap play to retry."
            }
        }
    }

    fun togglePlay() {
        val cur = _currentSong.value ?: return
        val player = service?.player
        if (player == null) {
            playSong(cur)
            return
        }
        if (player.isPlaying) {
            player.pause()
        } else {
            if (player.playbackState == Player.STATE_IDLE || player.playbackState == Player.STATE_ENDED || _playbackError.value != null) {
                playSong(cur)
            } else {
                player.play()
            }
        }
    }

    fun next(forceLoop: Boolean = false) {
        val q = _queue.value
        val cur = _currentSong.value ?: return
        if (q.isEmpty()) return

        val curIdx = q.indexOfFirst { it.id == cur.id }
        if (curIdx != -1 && curIdx + 1 < q.size) {
            playSong(q[curIdx + 1])
        } else if (forceLoop || _repeatState.value == RepeatState.ALL) {
            playSong(q[0])
        }
    }

    fun prev() {
        val player = service?.player
        if (player != null && player.currentPosition > 3000) {
            player.seekTo(0)
            return
        }

        val q = _queue.value
        val cur = _currentSong.value ?: return
        if (q.isEmpty()) return

        val curIdx = q.indexOfFirst { it.id == cur.id }
        if (curIdx > 0) {
            playSong(q[curIdx - 1])
        } else {
            playSong(q.last())
        }
    }

    fun seekTo(positionMs: Long) {
        service?.player?.seekTo(positionMs)
        _progressMs.value = positionMs
    }

    private fun startProgressTracker() {
        stopProgressTracker()
        progressJob = scope.launch {
            while (isActive) {
                service?.player?.let {
                    _progressMs.value = it.currentPosition
                    if (it.duration > 0L) {
                        _durationMs.value = it.duration
                    }
                }
                delay(300)
            }
        }
    }

    private fun stopProgressTracker() {
        progressJob?.cancel()
        progressJob = null
    }

    // Audio Equalizer Controls
    private fun attachEqualizer(audioSessionId: Int) {
        try {
            if (audioSessionId != 0) {
                equalizer?.release()
                equalizer = Equalizer(0, audioSessionId).apply {
                    enabled = _eqEnabled.value
                    applyBands(this)
                }
            }
        } catch (e: Exception) {
            e.printStackTrace()
        }
    }

    fun setEqEnabled(enabled: Boolean) {
        _eqEnabled.value = enabled
        try {
            equalizer?.enabled = enabled
        } catch (e: Exception) {
            e.printStackTrace()
        }
    }

    fun setEqBand(bandIndex: Int, gainDb: Int) {
        val current = _eqBands.value.toMutableList()
        if (bandIndex in 0 until current.size) {
            current[bandIndex] = gainDb.coerceIn(-10, 10)
            _eqBands.value = current
            _currentPreset.value = "Custom"
            equalizer?.let { applyBands(it) }
        }
    }

    fun applyPreset(presetName: String) {
        val preset = PRESETS.find { it.name.equals(presetName, ignoreCase = true) } ?: return
        _currentPreset.value = preset.name
        _eqBands.value = preset.gains
        equalizer?.let { applyBands(it) }
    }

    private fun applyBands(eq: Equalizer) {
        try {
            val numBands = eq.numberOfBands.toInt()
            val minEqLevel = eq.bandLevelRange[0]
            val maxEqLevel = eq.bandLevelRange[1]
            val bands = _eqBands.value

            for (i in 0 until numBands.coerceAtMost(bands.size)) {
                val db = bands[i]
                val millibels = (db * 100).coerceIn(minEqLevel.toInt(), maxEqLevel.toInt()).toShort()
                eq.setBandLevel(i.toShort(), millibels)
            }
        } catch (e: Exception) {
            e.printStackTrace()
        }
    }
}

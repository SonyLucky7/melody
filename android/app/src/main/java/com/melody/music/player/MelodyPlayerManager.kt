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
    private var lastKnownPositionMs = 0L

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

        // Sync initial repeat mode onto ExoPlayer
        applyRepeatModeToPlayer(playbackService.player)

        playbackService.player.addListener(object : Player.Listener {
            override fun onMediaItemTransition(mediaItem: MediaItem?, reason: Int) {
                val mediaId = mediaItem?.mediaId?.toLongOrNull()
                if (mediaId != null) {
                    val matched = _queue.value.find { it.id == mediaId }
                        ?: originalQueue.find { it.id == mediaId }
                    if (matched != null && _currentSong.value?.id != matched.id) {
                        _currentSong.value = matched
                        _durationMs.value = (matched.durationSeconds * 1000L).coerceAtLeast(0L)
                        _progressMs.value = 0L
                        lastKnownPositionMs = 0L
                        retryCountForCurrentSong = 0
                        _playbackError.value = null
                        onTrackActiveSideEffects(matched)
                    }
                }
                service?.updateCustomLayout()
            }

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
                        val dur = playbackService.player.duration
                        if (dur > 0L) {
                            _durationMs.value = dur
                        }
                        attachEqualizer(playbackService.player.audioSessionId)
                    }
                    Player.STATE_ENDED -> {
                        _isBuffering.value = false
                        if (_repeatState.value == RepeatState.OFF) {
                            _isPlaying.value = false
                        }
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

                // Capture exact mid-song playback position so recovery resumes seamlessly without restarting at 0:00!
                val currentPos = playbackService.player.currentPosition.coerceAtLeast(0L)
                val resumePos = if (currentPos > 1000L) currentPos else lastKnownPositionMs
                if (resumePos > 1000L) lastKnownPositionMs = resumePos

                // Auto-retry up to 3 times with backoff (Render -> Vercel Edge -> Render fresh) at EXACT saved position!
                if (failedSong != null && retryCountForCurrentSong < 3 && MelodyDownloadManager.getLocalFile(failedSong.id) == null) {
                    val attempt = ++retryCountForCurrentSong
                    val useEdge = (attempt == 2)
                    val backoffMs = if (attempt == 1) 400L else if (attempt == 2) 700L else 1200L
                    _isBuffering.value = true
                    scope.launch {
                        delay(backoffMs)
                        if (_currentSong.value?.id == failedSong.id) {
                            startPlaybackInternal(
                                song = failedSong,
                                useFallbackEdge = useEdge,
                                resumePositionMs = resumePos,
                                cacheBust = true
                            )
                        }
                    }
                    return
                }

                _playbackError.value = "Connection lost on \"${failedSong?.title ?: "track"}\". Tap play to resume."
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

    private fun applyRepeatModeToPlayer(player: Player?) {
        player ?: return
        player.repeatMode = when (_repeatState.value) {
            RepeatState.OFF -> Player.REPEAT_MODE_OFF
            RepeatState.ALL -> Player.REPEAT_MODE_ALL
            RepeatState.ONE -> Player.REPEAT_MODE_ONE
        }
    }

    private fun buildMediaItem(song: Song, useFallbackEdge: Boolean, cacheBust: Boolean = false): MediaItem {
        val localFile: File? = MelodyDownloadManager.getLocalFile(song.id)
        val isOfflineLocal = localFile != null && localFile.exists()
        val suffix = if (cacheBust) "?r=${System.currentTimeMillis()}" else ""
        val mediaUri: Uri = if (isOfflineLocal) {
            Uri.fromFile(localFile)
        } else if (useFallbackEdge) {
            val altBase = if (ApiClient.baseUrl == ApiClient.PRIMARY_BASE_URL) {
                ApiClient.FALLBACK_BASE_URL.trimEnd('/')
            } else {
                ApiClient.PRIMARY_BASE_URL.trimEnd('/')
            }
            Uri.parse("$altBase/api/stream/${song.id}$suffix")
        } else {
            val base = ApiClient.baseUrl.trimEnd('/')
            Uri.parse("$base/api/stream/${song.id}$suffix")
        }

        val localCover = MelodyDownloadManager.getLocalCoverFile(song.id)
        val artworkUri = if (localCover != null) {
            Uri.fromFile(localCover)
        } else {
            Uri.parse(song.getFullCoverUrl())
        }

        val mediaMetadata = MediaMetadata.Builder()
            .setTitle(song.title)
            .setDisplayTitle(song.title)
            .setArtist(song.artist)
            .setSubtitle(song.artist)
            .setAlbumArtist(song.artist)
            .setAlbumTitle(song.album ?: "Melody")
            .setArtworkUri(artworkUri)
            .setIsBrowsable(false)
            .setIsPlayable(true)
            .build()

        return MediaItem.Builder()
            .setMediaId(song.id.toString())
            .setUri(mediaUri)
            .setMediaMetadata(mediaMetadata)
            .build()
    }

    private fun onTrackActiveSideEffects(song: Song) {
        val isOfflineLocal = MelodyDownloadManager.getLocalFile(song.id) != null
        if (isOfflineLocal) return

        // Pre-warm next track onto Render's NVMe disk spool so the next transition is 0ms & cut-free!
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

    fun refreshFavourites() {
        scope.launch {
            try {
                val res = ApiClient.service.getFavourites()
                if (res.success) {
                    _likedSongIds.value = res.data.map { it.id }.toSet()
                    service?.updateCustomLayout()
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
        service?.updateCustomLayout()

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

        // Update upcoming native ExoPlayer items seamlessly without interrupting current audio!
        val player = service?.player
        if (player != null && cur != null) {
            val q = _queue.value
            val curIdx = q.indexOfFirst { it.id == cur.id }
            if (curIdx != -1) {
                try {
                    val currentMediaIdx = player.currentMediaItemIndex
                    if (currentMediaIdx + 1 < player.mediaItemCount) {
                        player.removeMediaItems(currentMediaIdx + 1, player.mediaItemCount)
                    }
                    val upcoming = q.drop(curIdx + 1).take(60).map { buildMediaItem(it, useFallbackEdge = false) }
                    if (upcoming.isNotEmpty()) {
                        player.addMediaItems(upcoming)
                    }
                } catch (e: Exception) {
                    e.printStackTrace()
                }
            }
        }

        service?.updateCustomLayout()

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
        applyRepeatModeToPlayer(service?.player)
    }

    fun playSong(song: Song, queueList: List<Song> = emptyList()) {
        _currentSong.value = song
        _playbackError.value = null
        retryCountForCurrentSong = 0
        lastKnownPositionMs = 0L

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

        startPlaybackInternal(song, useFallbackEdge = false, resumePositionMs = 0L)
    }

    private fun startPlaybackInternal(
        song: Song,
        useFallbackEdge: Boolean,
        resumePositionMs: Long = 0L,
        cacheBust: Boolean = false
    ) {
        playJob?.cancel()
        _isBuffering.value = true
        _progressMs.value = resumePositionMs
        _durationMs.value = (song.durationSeconds * 1000L).coerceAtLeast(0L)

        playJob = scope.launch {
            try {
                val fullQueue = _queue.value.ifEmpty { listOf(song) }
                val targetIndex = fullQueue.indexOfFirst { it.id == song.id }.coerceAtLeast(0)

                // Window up to 100 tracks around the active song into native ExoPlayer MediaItems so
                // Lock Screen & Notification Shade have FULL Previous/Next + gapless background autoplay!
                val windowStart = (targetIndex - 20).coerceAtLeast(0)
                val windowEnd = (targetIndex + 80).coerceAtMost(fullQueue.size)
                val windowedSongs = fullQueue.subList(windowStart, windowEnd)
                val startIndexInWindow = targetIndex - windowStart

                val mediaItems = windowedSongs.mapIndexed { idx, s ->
                    buildMediaItem(
                        song = s,
                        useFallbackEdge = useFallbackEdge && idx == startIndexInWindow,
                        cacheBust = cacheBust && idx == startIndexInWindow
                    )
                }

                service?.player?.apply {
                    applyRepeatModeToPlayer(this)
                    setMediaItems(mediaItems, startIndexInWindow, resumePositionMs)
                    prepare()
                    play()
                }
                service?.updateCustomLayout()
                service?.refreshNotification(startForeground = true)

                onTrackActiveSideEffects(song)
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
                val resumePos = if (_playbackError.value != null && lastKnownPositionMs > 1000L) lastKnownPositionMs else 0L
                _playbackError.value = null
                retryCountForCurrentSong = 0
                startPlaybackInternal(cur, useFallbackEdge = false, resumePositionMs = resumePos, cacheBust = true)
            } else {
                player.play()
            }
        }
    }

    fun next(forceLoop: Boolean = false) {
        val player = service?.player
        if (player != null && player.hasNextMediaItem()) {
            player.seekToNextMediaItem()
            player.play()
            return
        }

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
        if (player != null && player.hasPreviousMediaItem()) {
            player.seekToPreviousMediaItem()
            player.play()
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
        lastKnownPositionMs = positionMs
    }

    private fun startProgressTracker() {
        stopProgressTracker()
        progressJob = scope.launch {
            while (isActive) {
                service?.player?.let {
                    val pos = it.currentPosition
                    _progressMs.value = pos
                    if (pos > 1000L) {
                        lastKnownPositionMs = pos
                    }
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

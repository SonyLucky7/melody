package com.melody.music.player

import android.net.Uri
import androidx.media3.common.MediaItem
import androidx.media3.common.MediaMetadata
import androidx.media3.common.Player
import com.melody.music.data.api.ApiClient
import com.melody.music.data.model.Song
import kotlinx.coroutines.*
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow

object MelodyPlayerManager {

    private var service: MelodyPlaybackService? = null
    private val scope = CoroutineScope(Dispatchers.Main + SupervisorJob())
    private var progressJob: Job? = null

    private val _currentSong = MutableStateFlow<Song?>(null)
    val currentSong: StateFlow<Song?> = _currentSong.asStateFlow()

    private val _isPlaying = MutableStateFlow(false)
    val isPlaying: StateFlow<Boolean> = _isPlaying.asStateFlow()

    private val _progressMs = MutableStateFlow(0L)
    val progressMs: StateFlow<Long> = _progressMs.asStateFlow()

    private val _durationMs = MutableStateFlow(0L)
    val durationMs: StateFlow<Long> = _durationMs.asStateFlow()

    private val _queue = MutableStateFlow<List<Song>>(emptyList())
    val queue: StateFlow<List<Song>> = _queue.asStateFlow()

    fun bindService(playbackService: MelodyPlaybackService) {
        service = playbackService

        playbackService.player.addListener(object : Player.Listener {
            override fun onIsPlayingChanged(playing: Boolean) {
                _isPlaying.value = playing
                if (playing) startProgressTracker() else stopProgressTracker()
            }

            override fun onPlaybackStateChanged(state: Int) {
                if (state == Player.STATE_READY) {
                    _durationMs.value = playbackService.player.duration.coerceAtLeast(0L)
                } else if (state == Player.STATE_ENDED) {
                    next()
                }
            }
        })
    }

    fun unbindService() {
        stopProgressTracker()
        service = null
    }

    fun playSong(song: Song, queueList: List<Song> = emptyList()) {
        _currentSong.value = song
        if (queueList.isNotEmpty()) {
            _queue.value = queueList
        }

        scope.launch {
            try {
                // Request 10-minute signed stream token from backend
                val playResponse = ApiClient.service.requestPlayUrl(song.id)
                val streamUrl = if (playResponse.streamUrl.startsWith("http")) {
                    playResponse.streamUrl
                } else {
                    ApiClient.baseUrl.removeSuffix("/") + playResponse.streamUrl
                }

                // Construct MediaItem with full metadata
                val mediaMetadata = MediaMetadata.Builder()
                    .setTitle(song.title)
                    .setArtist(song.artist)
                    .setAlbumTitle(song.album ?: "Melody")
                    .setArtworkUri(song.coverUrl?.let { Uri.parse(it) })
                    .build()

                val mediaItem = MediaItem.Builder()
                    .setUri(streamUrl)
                    .setMediaMetadata(mediaMetadata)
                    .build()

                service?.player?.apply {
                    setMediaItem(mediaItem)
                    prepare()
                    play()
                }

                // Fire and forget playback recording
                ApiClient.service.recordPlayed(song.id)
            } catch (e: Exception) {
                e.printStackTrace()
                _isPlaying.value = false
            }
        }
    }

    fun togglePlay() {
        val player = service?.player ?: return
        if (player.isPlaying) {
            player.pause()
        } else {
            player.play()
        }
    }

    fun next() {
        val q = _queue.value
        val cur = _currentSong.value ?: return
        if (q.isEmpty()) return

        val curIdx = q.indexOfFirst { it.id == cur.id }
        if (curIdx != -1 && curIdx + 1 < q.size) {
            playSong(q[curIdx + 1])
        } else if (q.isNotEmpty()) {
            playSong(q[0]) // Loop back to start of playlist
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
                    _durationMs.value = it.duration.coerceAtLeast(0L)
                }
                delay(500)
            }
        }
    }

    private fun stopProgressTracker() {
        progressJob?.cancel()
        progressJob = null
    }
}

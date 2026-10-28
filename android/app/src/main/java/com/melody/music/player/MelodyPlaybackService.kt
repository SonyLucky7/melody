package com.melody.music.player

import android.app.PendingIntent
import android.content.Context
import android.content.Intent
import androidx.annotation.OptIn
import androidx.media3.common.AudioAttributes
import androidx.media3.common.C
import androidx.media3.common.MediaItem
import androidx.media3.common.Player
import androidx.media3.common.util.UnstableApi
import androidx.media3.database.StandaloneDatabaseProvider
import androidx.media3.datasource.DefaultHttpDataSource
import androidx.media3.datasource.cache.CacheDataSource
import androidx.media3.datasource.cache.LeastRecentlyUsedCacheEvictor
import androidx.media3.datasource.cache.SimpleCache
import androidx.media3.exoplayer.DefaultLoadControl
import androidx.media3.exoplayer.ExoPlayer
import androidx.media3.exoplayer.source.DefaultMediaSourceFactory
import androidx.media3.session.DefaultMediaNotificationProvider
import androidx.media3.session.MediaSession
import androidx.media3.session.MediaSessionService
import com.melody.music.MainActivity
import com.melody.music.MelodyApplication
import com.melody.music.widget.MelodyAppWidgetProvider
import java.io.File

object MelodyCache {
    private var cache: SimpleCache? = null

    @Synchronized
    @OptIn(UnstableApi::class)
    fun getCache(context: Context): SimpleCache {
        if (cache == null) {
            val cacheDir = File(context.cacheDir, "melody_audio_cache")
            val evictor = LeastRecentlyUsedCacheEvictor(120L * 1024 * 1024) // 120MB LRU Cache
            val databaseProvider = StandaloneDatabaseProvider(context)
            cache = SimpleCache(cacheDir, evictor, databaseProvider)
        }
        return cache!!
    }
}

class MelodyPlaybackService : MediaSessionService() {

    private var mediaSession: MediaSession? = null
    lateinit var player: ExoPlayer

    @OptIn(UnstableApi::class)
    override fun onCreate() {
        super.onCreate()

        // 1. Audio Attributes for Music Playback
        val audioAttributes = AudioAttributes.Builder()
            .setContentType(C.AUDIO_CONTENT_TYPE_MUSIC)
            .setUsage(C.USAGE_MEDIA)
            .build()

        // 2. High-Performance Cache DataSource (Eliminates seek lag & stutter)
        val upstreamFactory = DefaultHttpDataSource.Factory()
            .setConnectTimeoutMs(20000)
            .setReadTimeoutMs(30000)
            .setAllowCrossProtocolRedirects(true)

        val cacheDataSourceFactory = CacheDataSource.Factory()
            .setCache(MelodyCache.getCache(this))
            .setUpstreamDataSourceFactory(upstreamFactory)
            .setFlags(CacheDataSource.FLAG_IGNORE_CACHE_ON_ERROR)

        // 3. Ultra-Fast Load Control (Starts playing in 500ms; seeks in 1000ms)
        val loadControl = DefaultLoadControl.Builder()
            .setBufferDurationsMs(
                /* minBufferMs = */ 15000,
                /* maxBufferMs = */ 60000,
                /* bufferForPlaybackMs = */ 500,
                /* bufferForPlaybackAfterRebufferMs = */ 1000
            )
            .build()

        // 4. Initialize ExoPlayer with Cache and Responsive Load Control
        player = ExoPlayer.Builder(this)
            .setAudioAttributes(audioAttributes, true)
            .setHandleAudioBecomingNoisy(true)
            .setWakeMode(C.WAKE_MODE_NETWORK)
            .setMediaSourceFactory(DefaultMediaSourceFactory(cacheDataSourceFactory))
            .setLoadControl(loadControl)
            .build()

        // 5. System Media Notification Provider for Lock Screen & Notification Shade
        try {
            val notificationProvider = DefaultMediaNotificationProvider.Builder(this)
                .setChannelId(MelodyApplication.PLAYBACK_CHANNEL_ID)
                .setNotificationId(1001)
                .build()
            setMediaNotificationProvider(notificationProvider)
        } catch (e: Exception) {
            e.printStackTrace()
        }

        // 6. Intent to open MainActivity when user taps notification or lock screen widget
        val intent = Intent(this, MainActivity::class.java).apply {
            flags = Intent.FLAG_ACTIVITY_SINGLE_TOP or Intent.FLAG_ACTIVITY_CLEAR_TOP
        }
        val pendingIntent = PendingIntent.getActivity(
            this,
            0,
            intent,
            PendingIntent.FLAG_IMMUTABLE or PendingIntent.FLAG_UPDATE_CURRENT
        )

        // 7. Create MediaSession for OS media controls, Android 13/14 lock screen scrubber
        mediaSession = MediaSession.Builder(this, player)
            .setSessionActivity(pendingIntent)
            .build()

        // 8. Widget Synchronization
        player.addListener(object : Player.Listener {
            override fun onIsPlayingChanged(playing: Boolean) {
                MelodyAppWidgetProvider.updateAllWidgets(
                    this@MelodyPlaybackService,
                    MelodyPlayerManager.currentSong.value,
                    playing
                )
            }

            override fun onMediaItemTransition(mediaItem: MediaItem?, reason: Int) {
                MelodyAppWidgetProvider.updateAllWidgets(
                    this@MelodyPlaybackService,
                    MelodyPlayerManager.currentSong.value,
                    player.isPlaying
                )
            }
        })

        MelodyPlayerManager.bindService(this)
    }

    override fun onGetSession(controllerInfo: MediaSession.ControllerInfo): MediaSession? {
        return mediaSession
    }

    override fun onDestroy() {
        MelodyPlayerManager.unbindService()
        mediaSession?.run {
            player.release()
            release()
            mediaSession = null
        }
        super.onDestroy()
    }
}

package com.melody.music.player

import android.app.PendingIntent
import android.content.Context
import android.content.Intent
import android.graphics.Bitmap
import android.graphics.BitmapFactory
import android.graphics.drawable.BitmapDrawable
import android.net.Uri
import android.os.Bundle
import androidx.annotation.OptIn
import androidx.media3.common.AudioAttributes
import androidx.media3.common.C
import androidx.media3.common.MediaItem
import androidx.media3.common.MediaMetadata
import androidx.media3.common.Player
import androidx.media3.common.util.BitmapLoader
import androidx.media3.common.util.UnstableApi
import androidx.media3.database.StandaloneDatabaseProvider
import androidx.media3.datasource.DataSource
import androidx.media3.datasource.DefaultDataSource
import androidx.media3.datasource.FileDataSource
import androidx.media3.datasource.cache.CacheDataSource
import androidx.media3.datasource.cache.LeastRecentlyUsedCacheEvictor
import androidx.media3.datasource.cache.SimpleCache
import androidx.media3.datasource.okhttp.OkHttpDataSource
import androidx.media3.exoplayer.DefaultLoadControl
import androidx.media3.exoplayer.ExoPlayer
import androidx.media3.exoplayer.source.DefaultMediaSourceFactory
import androidx.media3.exoplayer.upstream.DefaultLoadErrorHandlingPolicy
import androidx.media3.session.CacheBitmapLoader
import androidx.media3.session.CommandButton
import androidx.media3.session.DefaultMediaNotificationProvider
import androidx.media3.session.MediaSession
import androidx.media3.session.MediaSessionService
import androidx.media3.session.SessionCommand
import androidx.media3.session.SessionResult
import coil.Coil
import coil.request.ImageRequest
import coil.request.SuccessResult
import com.google.common.util.concurrent.Futures
import com.google.common.util.concurrent.ListenableFuture
import com.google.common.util.concurrent.MoreExecutors
import com.melody.music.MainActivity
import com.melody.music.MelodyApplication
import com.melody.music.R
import com.melody.music.widget.MelodyAppWidgetProvider
import okhttp3.ConnectionPool
import okhttp3.OkHttpClient
import java.io.File
import java.util.concurrent.Callable
import java.util.concurrent.Executors
import java.util.concurrent.TimeUnit

object MelodyCache {
    private var cache: SimpleCache? = null

    @Synchronized
    @OptIn(UnstableApi::class)
    fun getCache(context: Context): SimpleCache {
        if (cache == null) {
            val cacheDir = File(context.cacheDir, "melody_audio_cache")
            val evictor = LeastRecentlyUsedCacheEvictor(200L * 1024 * 1024) // 200 MB LRU Cache
            val databaseProvider = StandaloneDatabaseProvider(context)
            cache = SimpleCache(cacheDir, evictor, databaseProvider)
        }
        return cache!!
    }
}

/**
 * Reliable Coil-backed BitmapLoader for Android 8–16 / HyperOS / OneUI Lock Screen & Control Center artwork.
 * Handles HTTPS, WebP, JPEG, PNG, and local offline file:// cover URIs seamlessly!
 */
@OptIn(UnstableApi::class)
private class CoilBitmapLoader(private val context: Context) : BitmapLoader {
    private val executor = MoreExecutors.listeningDecorator(Executors.newFixedThreadPool(2))

    override fun decodeBitmap(data: ByteArray): ListenableFuture<Bitmap> {
        return executor.submit(Callable {
            BitmapFactory.decodeByteArray(data, 0, data.size)
                ?: throw IllegalArgumentException("Could not decode bitmap")
        })
    }

    override fun loadBitmap(uri: Uri, options: BitmapFactory.Options?): ListenableFuture<Bitmap> {
        return executor.submit(Callable {
            try {
                val request = ImageRequest.Builder(context)
                    .data(uri)
                    .allowHardware(false)
                    .size(512, 512)
                    .build()
                val result = kotlinx.coroutines.runBlocking {
                    Coil.imageLoader(context).execute(request)
                }
                if (result is SuccessResult) {
                    val bmp = (result.drawable as? BitmapDrawable)?.bitmap
                    if (bmp != null) return@Callable bmp
                }
            } catch (_: Exception) {}
            BitmapFactory.decodeResource(context.resources, R.mipmap.ic_launcher)
                ?: BitmapFactory.decodeResource(context.resources, R.drawable.ic_melody_logo)
        })
    }
}

class MelodyPlaybackService : MediaSessionService() {

    companion object {
        const val ACTION_TOGGLE_LIKE = "com.melody.music.ACTION_TOGGLE_LIKE"
        const val ACTION_TOGGLE_SHUFFLE = "com.melody.music.ACTION_TOGGLE_SHUFFLE"
    }

    private var mediaSession: MediaSession? = null
    lateinit var player: ExoPlayer

    private val likeCommand = SessionCommand(ACTION_TOGGLE_LIKE, Bundle.EMPTY)
    private val shuffleCommand = SessionCommand(ACTION_TOGGLE_SHUFFLE, Bundle.EMPTY)

    @OptIn(UnstableApi::class)
    override fun onCreate() {
        super.onCreate()

        // 1. Audio Attributes for Music Playback (automatic audio focus & ducking)
        val audioAttributes = AudioAttributes.Builder()
            .setContentType(C.AUDIO_CONTENT_TYPE_MUSIC)
            .setUsage(C.USAGE_MEDIA)
            .build()

        // 2. Resilient OkHttp DataSource (HTTP/2 pooling + automatic TCP retry on 5G/4G/Wi-Fi handoffs)
        val streamingOkHttp = OkHttpClient.Builder()
            .connectTimeout(20, TimeUnit.SECONDS)
            .readTimeout(45, TimeUnit.SECONDS)
            .writeTimeout(20, TimeUnit.SECONDS)
            .retryOnConnectionFailure(true)
            .followRedirects(true)
            .followSslRedirects(true)
            .connectionPool(ConnectionPool(8, 2, TimeUnit.MINUTES))
            .build()

        val httpDataSourceFactory = OkHttpDataSource.Factory(streamingOkHttp)
            .setUserAgent("MelodyAndroid/1.2.6")

        // Cached HTTP DataSource for remote streams + direct FileDataSource for offline file:// downloads
        val cachedHttpFactory = CacheDataSource.Factory()
            .setCache(MelodyCache.getCache(this))
            .setUpstreamDataSourceFactory(httpDataSourceFactory)
            .setCacheReadDataSourceFactory(FileDataSource.Factory())
            .setFlags(CacheDataSource.FLAG_IGNORE_CACHE_ON_ERROR)

        val defaultDataSourceFactory = DefaultDataSource.Factory(this, cachedHttpFactory)
        val smartDataSourceFactory = DataSource.Factory { defaultDataSourceFactory.createDataSource() }

        // 3. Anti-Cut LoadControl: 30s–120s ahead buffer so network dips never cut audio mid-song
        val loadControl = DefaultLoadControl.Builder()
            .setBufferDurationsMs(
                /* minBufferMs = */ 30_000,
                /* maxBufferMs = */ 120_000,
                /* bufferForPlaybackMs = */ 1_500,
                /* bufferForPlaybackAfterRebufferMs = */ 2_500
            )
            .setPrioritizeTimeOverSizeThresholds(true)
            .build()

        val mediaSourceFactory = DefaultMediaSourceFactory(smartDataSourceFactory)
            .setLoadErrorHandlingPolicy(DefaultLoadErrorHandlingPolicy(6))

        // 4. Initialize ExoPlayer with Audio Focus, Noisy-Headset Handling, and Network WakeLock
        player = ExoPlayer.Builder(this)
            .setAudioAttributes(audioAttributes, true)
            .setHandleAudioBecomingNoisy(true)
            .setWakeMode(C.WAKE_MODE_NETWORK)
            .setMediaSourceFactory(mediaSourceFactory)
            .setLoadControl(loadControl)
            .build()

        // 5. System Media Notification Provider (Lock Screen & Control Center Media Card on Android 8–16 / HyperOS)
        try {
            val notificationProvider = DefaultMediaNotificationProvider.Builder(this)
                .setChannelId(MelodyApplication.PLAYBACK_CHANNEL_ID)
                .setNotificationId(1001)
                .build()
            notificationProvider.setSmallIcon(R.drawable.ic_notif_melody_small)
            setMediaNotificationProvider(notificationProvider)
        } catch (e: Exception) {
            e.printStackTrace()
        }

        // 6. PendingIntent to open Melody when tapping the Lock Screen or Control Center card
        val intent = Intent(this, MainActivity::class.java).apply {
            flags = Intent.FLAG_ACTIVITY_SINGLE_TOP or Intent.FLAG_ACTIVITY_CLEAR_TOP
        }
        val pendingIntent = PendingIntent.getActivity(
            this,
            0,
            intent,
            PendingIntent.FLAG_IMMUTABLE or PendingIntent.FLAG_UPDATE_CURRENT
        )

        // 7. MediaSession Callback supporting Like & Shuffle buttons directly on Lock Screen & Control Center
        val sessionCallback = object : MediaSession.Callback {
            override fun onConnect(
                session: MediaSession,
                controller: MediaSession.ControllerInfo
            ): MediaSession.ConnectionResult {
                val sessionCommands = MediaSession.ConnectionResult.DEFAULT_SESSION_COMMANDS.buildUpon()
                    .add(likeCommand)
                    .add(shuffleCommand)
                    .build()
                return MediaSession.ConnectionResult.AcceptedResultBuilder(session)
                    .setAvailableSessionCommands(sessionCommands)
                    .setAvailablePlayerCommands(MediaSession.ConnectionResult.DEFAULT_PLAYER_COMMANDS)
                    .build()
            }

            override fun onPostConnect(
                session: MediaSession,
                controller: MediaSession.ControllerInfo
            ) {
                super.onPostConnect(session, controller)
                try {
                    session.setCustomLayout(controller, buildCustomButtons())
                } catch (_: Exception) {}
            }

            override fun onCustomCommand(
                session: MediaSession,
                controller: MediaSession.ControllerInfo,
                customCommand: SessionCommand,
                args: Bundle
            ): ListenableFuture<SessionResult> {
                when (customCommand.customAction) {
                    ACTION_TOGGLE_LIKE -> {
                        MelodyPlayerManager.currentSong.value?.let { song ->
                            MelodyPlayerManager.toggleLike(song)
                        }
                        updateCustomLayout()
                    }
                    ACTION_TOGGLE_SHUFFLE -> {
                        MelodyPlayerManager.toggleShuffle()
                        updateCustomLayout()
                    }
                }
                return Futures.immediateFuture(SessionResult(SessionResult.RESULT_SUCCESS))
            }
        }

        // 8. Create MediaSession with cached Coil BitmapLoader + Custom Lock Screen Buttons
        val session = MediaSession.Builder(this, player)
            .setSessionActivity(pendingIntent)
            .setCallback(sessionCallback)
            .setBitmapLoader(CacheBitmapLoader(CoilBitmapLoader(this)))
            .setCustomLayout(buildCustomButtons())
            .build()
        mediaSession = session

        // CRITICAL: Register session with MediaSessionService's MediaNotificationManager immediately!
        // Without addSession() (or a MediaController bind), Android never posts the Lock Screen / Control Center media card.
        addSession(session)

        // 9. Keep SystemUI Lock Screen, Control Center & Home Screen Widget synchronized
        player.addListener(object : Player.Listener {
            override fun onIsPlayingChanged(playing: Boolean) {
                refreshNotification(startForeground = playing)
                MelodyAppWidgetProvider.updateAllWidgets(
                    this@MelodyPlaybackService,
                    MelodyPlayerManager.currentSong.value,
                    playing
                )
            }

            override fun onPlaybackStateChanged(playbackState: Int) {
                if (playbackState == Player.STATE_READY || playbackState == Player.STATE_BUFFERING) {
                    refreshNotification(startForeground = player.playWhenReady)
                }
            }

            override fun onMediaItemTransition(mediaItem: MediaItem?, reason: Int) {
                updateCustomLayout()
                refreshNotification(startForeground = player.playWhenReady)
                MelodyAppWidgetProvider.updateAllWidgets(
                    this@MelodyPlaybackService,
                    MelodyPlayerManager.currentSong.value,
                    player.isPlaying
                )
            }

            override fun onMediaMetadataChanged(mediaMetadata: MediaMetadata) {
                refreshNotification(startForeground = player.playWhenReady)
            }
        })

        MelodyPlayerManager.bindService(this)
    }

    @OptIn(UnstableApi::class)
    fun refreshNotification(startForeground: Boolean = player.playWhenReady) {
        val session = mediaSession ?: return
        try {
            if (player.mediaItemCount > 0) {
                onUpdateNotification(session, startForeground)
            }
        } catch (e: Exception) {
            e.printStackTrace()
        }
    }

    private fun buildCustomButtons(): List<CommandButton> {
        val currentId = MelodyPlayerManager.currentSong.value?.id
        val isLiked = currentId != null && MelodyPlayerManager.likedSongIds.value.contains(currentId)
        val isShuffle = MelodyPlayerManager.isShuffle.value

        val likeButton = CommandButton.Builder()
            .setDisplayName(if (isLiked) "Saved" else "Save")
            .setIconResId(if (isLiked) R.drawable.ic_notif_check_circle else R.drawable.ic_notif_heart_outline)
            .setSessionCommand(likeCommand)
            .setEnabled(true)
            .build()

        val shuffleButton = CommandButton.Builder()
            .setDisplayName(if (isShuffle) "Shuffle On" else "Shuffle Off")
            .setIconResId(if (isShuffle) R.drawable.ic_notif_shuffle_active else R.drawable.ic_notif_shuffle)
            .setSessionCommand(shuffleCommand)
            .setEnabled(true)
            .build()

        return listOf(likeButton, shuffleButton)
    }

    fun updateCustomLayout() {
        val session = mediaSession ?: return
        try {
            session.setCustomLayout(buildCustomButtons())
            refreshNotification(startForeground = player.playWhenReady)
        } catch (e: Exception) {
            e.printStackTrace()
        }
    }

    override fun onGetSession(controllerInfo: MediaSession.ControllerInfo): MediaSession? {
        return mediaSession
    }

    // Keep music playing smoothly in background if user swipes Melody from Recents while playing
    override fun onTaskRemoved(rootIntent: Intent?) {
        val p = mediaSession?.player
        if (p == null || !p.playWhenReady || p.mediaItemCount == 0 || p.playbackState == Player.STATE_ENDED) {
            stopSelf()
        }
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

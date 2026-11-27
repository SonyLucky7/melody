package com.melody.music.widget

import android.app.PendingIntent
import android.appwidget.AppWidgetManager
import android.appwidget.AppWidgetProvider
import android.content.ComponentName
import android.content.Context
import android.content.Intent
import android.graphics.drawable.BitmapDrawable
import android.widget.RemoteViews
import coil.Coil
import coil.request.ImageRequest
import coil.request.SuccessResult
import com.melody.music.MainActivity
import com.melody.music.R
import com.melody.music.data.model.Song
import com.melody.music.player.MelodyPlayerManager
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.SupervisorJob
import kotlinx.coroutines.launch

class MelodyAppWidgetProvider : AppWidgetProvider() {

    companion object {
        const val ACTION_PLAY_PAUSE = "com.melody.music.ACTION_WIDGET_PLAY_PAUSE"
        const val ACTION_PREV = "com.melody.music.ACTION_WIDGET_PREV"
        const val ACTION_NEXT = "com.melody.music.ACTION_WIDGET_NEXT"

        private val widgetScope = CoroutineScope(Dispatchers.IO + SupervisorJob())

        private fun buildBaseRemoteViews(context: Context, song: Song?, isPlaying: Boolean): RemoteViews {
            val views = RemoteViews(context.packageName, R.layout.widget_melody_player)

            if (song != null) {
                views.setTextViewText(R.id.widget_title, song.title)
                views.setTextViewText(R.id.widget_artist, song.artist)
            } else {
                views.setTextViewText(R.id.widget_title, "Melody Music")
                views.setTextViewText(R.id.widget_artist, "Tap to open player")
                views.setImageViewResource(R.id.widget_cover, R.drawable.ic_melody_logo)
            }

            val playIconRes = if (isPlaying) R.drawable.ic_widget_pause else R.drawable.ic_widget_play
            views.setImageViewResource(R.id.widget_btn_play, playIconRes)

            val openIntent = Intent(context, MainActivity::class.java).apply {
                flags = Intent.FLAG_ACTIVITY_SINGLE_TOP or Intent.FLAG_ACTIVITY_NEW_TASK
            }
            val openPi = PendingIntent.getActivity(
                context, 0, openIntent,
                PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
            )
            views.setOnClickPendingIntent(R.id.widget_root, openPi)

            val playIntent = Intent(context, MelodyAppWidgetProvider::class.java).apply { action = ACTION_PLAY_PAUSE }
            val playPi = PendingIntent.getBroadcast(
                context, 1, playIntent,
                PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
            )
            views.setOnClickPendingIntent(R.id.widget_btn_play, playPi)

            val prevIntent = Intent(context, MelodyAppWidgetProvider::class.java).apply { action = ACTION_PREV }
            val prevPi = PendingIntent.getBroadcast(
                context, 2, prevIntent,
                PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
            )
            views.setOnClickPendingIntent(R.id.widget_btn_prev, prevPi)

            val nextIntent = Intent(context, MelodyAppWidgetProvider::class.java).apply { action = ACTION_NEXT }
            val nextPi = PendingIntent.getBroadcast(
                context, 3, nextIntent,
                PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
            )
            views.setOnClickPendingIntent(R.id.widget_btn_next, nextPi)

            return views
        }

        fun updateAllWidgets(context: Context, song: Song?, isPlaying: Boolean) {
            val appWidgetManager = AppWidgetManager.getInstance(context)
            val componentName = ComponentName(context, MelodyAppWidgetProvider::class.java)
            val appWidgetIds = appWidgetManager.getAppWidgetIds(componentName)
            if (appWidgetIds.isEmpty()) return

            // 1. Immediate text & transport button update
            for (appWidgetId in appWidgetIds) {
                appWidgetManager.updateAppWidget(appWidgetId, buildBaseRemoteViews(context, song, isPlaying))
            }

            // 2. Async album artwork loading via Coil so Home Screen Widget shows crisp song covers!
            if (song != null) {
                val appContext = context.applicationContext
                widgetScope.launch {
                    try {
                        val req = ImageRequest.Builder(appContext)
                            .data(song.getFullCoverUrl())
                            .allowHardware(false)
                            .size(192, 192)
                            .build()
                        val res = Coil.imageLoader(appContext).execute(req)
                        if (res is SuccessResult) {
                            val bmp = (res.drawable as? BitmapDrawable)?.bitmap
                            if (bmp != null) {
                                for (appWidgetId in appWidgetIds) {
                                    val views = buildBaseRemoteViews(appContext, song, MelodyPlayerManager.isPlaying.value)
                                    views.setImageViewBitmap(R.id.widget_cover, bmp)
                                    appWidgetManager.updateAppWidget(appWidgetId, views)
                                }
                            }
                        }
                    } catch (_: Exception) {}
                }
            }
        }
    }

    override fun onUpdate(context: Context, appWidgetManager: AppWidgetManager, appWidgetIds: IntArray) {
        updateAllWidgets(context, MelodyPlayerManager.currentSong.value, MelodyPlayerManager.isPlaying.value)
    }

    override fun onReceive(context: Context, intent: Intent) {
        super.onReceive(context, intent)
        val cur = MelodyPlayerManager.currentSong.value
        when (intent.action) {
            ACTION_PLAY_PAUSE -> {
                if (cur == null) {
                    val launch = Intent(context, MainActivity::class.java).apply {
                        flags = Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_SINGLE_TOP
                    }
                    context.startActivity(launch)
                } else {
                    MelodyPlayerManager.togglePlay()
                    updateAllWidgets(context, cur, !MelodyPlayerManager.isPlaying.value)
                }
            }
            ACTION_PREV -> {
                if (cur != null) {
                    MelodyPlayerManager.prev()
                    updateAllWidgets(context, MelodyPlayerManager.currentSong.value, MelodyPlayerManager.isPlaying.value)
                }
            }
            ACTION_NEXT -> {
                if (cur != null) {
                    MelodyPlayerManager.next()
                    updateAllWidgets(context, MelodyPlayerManager.currentSong.value, MelodyPlayerManager.isPlaying.value)
                }
            }
        }
    }
}

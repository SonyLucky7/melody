package com.melody.music.widget

import android.app.PendingIntent
import android.appwidget.AppWidgetManager
import android.appwidget.AppWidgetProvider
import android.content.ComponentName
import android.content.Context
import android.content.Intent
import android.widget.RemoteViews
import com.melody.music.MainActivity
import com.melody.music.R
import com.melody.music.data.model.Song
import com.melody.music.player.MelodyPlayerManager

class MelodyAppWidgetProvider : AppWidgetProvider() {

    companion object {
        const val ACTION_PLAY_PAUSE = "com.melody.music.ACTION_WIDGET_PLAY_PAUSE"
        const val ACTION_PREV = "com.melody.music.ACTION_WIDGET_PREV"
        const val ACTION_NEXT = "com.melody.music.ACTION_WIDGET_NEXT"

        fun updateAllWidgets(context: Context, song: Song?, isPlaying: Boolean) {
            val appWidgetManager = AppWidgetManager.getInstance(context)
            val componentName = ComponentName(context, MelodyAppWidgetProvider::class.java)
            val appWidgetIds = appWidgetManager.getAppWidgetIds(componentName)

            for (appWidgetId in appWidgetIds) {
                val views = RemoteViews(context.packageName, R.layout.widget_melody_player)

                // 1. Song Metadata
                if (song != null) {
                    views.setTextViewText(R.id.widget_title, song.title)
                    views.setTextViewText(R.id.widget_artist, song.artist)
                } else {
                    views.setTextViewText(R.id.widget_title, "Melody Music")
                    views.setTextViewText(R.id.widget_artist, "Tap to open player")
                }

                // 2. Play / Pause Button Icon
                val playIconRes = if (isPlaying) R.drawable.ic_widget_pause else R.drawable.ic_widget_play
                views.setImageViewResource(R.id.widget_btn_play, playIconRes)

                // 3. PendingIntents
                // Tap root to open MainActivity
                val openIntent = Intent(context, MainActivity::class.java).apply {
                    flags = Intent.FLAG_ACTIVITY_SINGLE_TOP or Intent.FLAG_ACTIVITY_NEW_TASK
                }
                val openPi = PendingIntent.getActivity(
                    context, 0, openIntent,
                    PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
                )
                views.setOnClickPendingIntent(R.id.widget_root, openPi)

                // Play / Pause button
                val playIntent = Intent(context, MelodyAppWidgetProvider::class.java).apply {
                    action = ACTION_PLAY_PAUSE
                }
                val playPi = PendingIntent.getBroadcast(
                    context, 1, playIntent,
                    PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
                )
                views.setOnClickPendingIntent(R.id.widget_btn_play, playPi)

                // Previous button
                val prevIntent = Intent(context, MelodyAppWidgetProvider::class.java).apply {
                    action = ACTION_PREV
                }
                val prevPi = PendingIntent.getBroadcast(
                    context, 2, prevIntent,
                    PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
                )
                views.setOnClickPendingIntent(R.id.widget_btn_prev, prevPi)

                // Next button
                val nextIntent = Intent(context, MelodyAppWidgetProvider::class.java).apply {
                    action = ACTION_NEXT
                }
                val nextPi = PendingIntent.getBroadcast(
                    context, 3, nextIntent,
                    PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
                )
                views.setOnClickPendingIntent(R.id.widget_btn_next, nextPi)

                appWidgetManager.updateAppWidget(appWidgetId, views)
            }
        }
    }

    override fun onUpdate(context: Context, appWidgetManager: AppWidgetManager, appWidgetIds: IntArray) {
        val curSong = MelodyPlayerManager.currentSong.value
        val isPlaying = MelodyPlayerManager.isPlaying.value
        updateAllWidgets(context, curSong, isPlaying)
    }

    override fun onReceive(context: Context, intent: Intent) {
        super.onReceive(context, intent)
        when (intent.action) {
            ACTION_PLAY_PAUSE -> {
                MelodyPlayerManager.togglePlay()
                updateAllWidgets(context, MelodyPlayerManager.currentSong.value, MelodyPlayerManager.isPlaying.value)
            }
            ACTION_PREV -> {
                MelodyPlayerManager.prev()
                updateAllWidgets(context, MelodyPlayerManager.currentSong.value, MelodyPlayerManager.isPlaying.value)
            }
            ACTION_NEXT -> {
                MelodyPlayerManager.next()
                updateAllWidgets(context, MelodyPlayerManager.currentSong.value, MelodyPlayerManager.isPlaying.value)
            }
        }
    }
}

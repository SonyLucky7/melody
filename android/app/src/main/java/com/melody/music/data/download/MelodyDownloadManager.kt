package com.melody.music.data.download

import android.content.Context
import android.os.Environment
import com.google.gson.Gson
import com.google.gson.reflect.TypeToken
import com.melody.music.data.api.ApiClient
import com.melody.music.data.model.Song
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch
import kotlinx.coroutines.withContext
import okhttp3.OkHttpClient
import okhttp3.Request
import java.io.File
import java.io.FileOutputStream
import java.io.InputStream
import java.util.concurrent.ConcurrentHashMap

data class DownloadedSong(
    val songId: Long,
    val title: String,
    val artist: String,
    val album: String?,
    val durationSeconds: Int,
    val coverUrl: String?,
    val localAudioPath: String,
    val downloadedAt: Long
) {
    fun toSong(): Song {
        return Song(
            id = songId,
            title = title,
            artist = artist,
            album = album,
            language = null,
            durationSeconds = durationSeconds,
            coverUrl = coverUrl,
            createdAt = null
        )
    }
}

object MelodyDownloadManager {

    private const val PREFS_NAME = "melody_offline_cache"
    private const val KEY_DOWNLOADS = "offline_songs_index"
    private val gson = Gson()
    private val scope = CoroutineScope(Dispatchers.IO)
    private val client = OkHttpClient()

    private val _downloadedSongs = MutableStateFlow<List<DownloadedSong>>(emptyList())
    val downloadedSongs: StateFlow<List<DownloadedSong>> = _downloadedSongs.asStateFlow()

    private val _downloadingIds = MutableStateFlow<Set<Long>>(emptySet())
    val downloadingIds: StateFlow<Set<Long>> = _downloadingIds.asStateFlow()

    private var isInitialized = false

    fun init(context: Context) {
        if (isInitialized) return
        isInitialized = true
        loadIndex(context)
    }

    private fun loadIndex(context: Context) {
        val prefs = context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)
        val json = prefs.getString(KEY_DOWNLOADS, null)
        if (!json.isNullOrEmpty()) {
            try {
                val type = object : TypeToken<Map<String, DownloadedSong>>() {}.type
                val map: Map<String, DownloadedSong> = gson.fromJson(json, type)
                // Filter out entries where file no longer exists
                val valid = map.values.filter { File(it.localAudioPath).exists() }
                _downloadedSongs.value = valid.sortedByDescending { it.downloadedAt }
            } catch (e: Exception) {
                e.printStackTrace()
                _downloadedSongs.value = emptyList()
            }
        }
    }

    private fun saveIndex(context: Context, items: List<DownloadedSong>) {
        val prefs = context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)
        val map = items.associateBy { it.songId.toString() }
        prefs.edit().putString(KEY_DOWNLOADS, gson.toJson(map)).apply()
        _downloadedSongs.value = items.sortedByDescending { it.downloadedAt }
    }

    fun isDownloaded(songId: Long): Boolean {
        return _downloadedSongs.value.any { it.songId == songId }
    }

    fun isDownloading(songId: Long): Boolean {
        return _downloadingIds.value.contains(songId)
    }

    fun getLocalFile(songId: Long): File? {
        val item = _downloadedSongs.value.find { it.songId == songId } ?: return null
        val file = File(item.localAudioPath)
        return if (file.exists() && file.length() > 0) file else null
    }

    fun downloadSong(context: Context, song: Song, onComplete: ((Boolean) -> Unit)? = null) {
        if (isDownloaded(song.id) || isDownloading(song.id)) {
            onComplete?.invoke(true)
            return
        }

        _downloadingIds.value = _downloadingIds.value + song.id

        scope.launch {
            var success = false
            try {
                // 1. High-Speed Cloudflare Edge CDN Download URL
                val fullUrl = "https://snowy-dream-9c30melody-stream.ogguvaralaxmi12.workers.dev/api/stream/${song.id}"

                // 2. Download File to app's music directory
                val musicDir = context.getExternalFilesDir(Environment.DIRECTORY_MUSIC)
                    ?: File(context.filesDir, "music")
                if (!musicDir.exists()) musicDir.mkdirs()

                val targetFile = File(musicDir, "melody_${song.id}.mp3")

                val request = Request.Builder()
                    .url(fullUrl)
                    .addHeader("x-device-id", ApiClient.deviceId)
                    .build()

                val response = client.newCall(request).execute()
                if (response.isSuccessful && response.body != null) {
                    val inputStream: InputStream = response.body!!.byteStream()
                    val outputStream = FileOutputStream(targetFile)
                    val buffer = ByteArray(8192)
                    var read: Int
                    while (inputStream.read(buffer).also { read = it } != -1) {
                        outputStream.write(buffer, 0, read)
                    }
                    outputStream.flush()
                    outputStream.close()
                    inputStream.close()

                    // 3. Save to registry
                    val downloaded = DownloadedSong(
                        songId = song.id,
                        title = song.title,
                        artist = song.artist,
                        album = song.album,
                        durationSeconds = song.durationSeconds,
                        coverUrl = song.coverUrl,
                        localAudioPath = targetFile.absolutePath,
                        downloadedAt = System.currentTimeMillis()
                    )

                    withContext(Dispatchers.Main) {
                        val currentList = _downloadedSongs.value.filter { it.songId != song.id } + downloaded
                        saveIndex(context, currentList)
                    }
                    success = true
                }
            } catch (e: Exception) {
                e.printStackTrace()
                success = false
            } finally {
                withContext(Dispatchers.Main) {
                    _downloadingIds.value = _downloadingIds.value - song.id
                    onComplete?.invoke(success)
                }
            }
        }
    }

    fun removeDownload(context: Context, songId: Long) {
        scope.launch {
            val item = _downloadedSongs.value.find { it.songId == songId } ?: return@launch
            try {
                val file = File(item.localAudioPath)
                if (file.exists()) {
                    file.delete()
                }
            } catch (e: Exception) {
                e.printStackTrace()
            }
            withContext(Dispatchers.Main) {
                val updated = _downloadedSongs.value.filter { it.songId != songId }
                saveIndex(context, updated)
            }
        }
    }
}

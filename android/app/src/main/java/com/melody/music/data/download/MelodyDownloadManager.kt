package com.melody.music.data.download

import android.content.Context
import android.os.Environment
import com.google.gson.Gson
import com.google.gson.reflect.TypeToken
import com.melody.music.data.api.ApiClient
import com.melody.music.data.model.Song
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.SupervisorJob
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
import java.util.concurrent.TimeUnit

data class DownloadedSong(
    val songId: Long,
    val title: String,
    val artist: String,
    val album: String?,
    val durationSeconds: Int,
    val coverUrl: String?,
    val localAudioPath: String,
    val localCoverPath: String? = null,
    val fileSizeBytes: Long = 0L,
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
            coverUrl = if (!localCoverPath.isNullOrBlank() && File(localCoverPath).exists()) {
                "file://$localCoverPath"
            } else {
                coverUrl
            },
            createdAt = null
        )
    }
}

object MelodyDownloadManager {

    private const val PREFS_NAME = "melody_offline_cache"
    private const val KEY_DOWNLOADS = "offline_songs_index"
    private val gson = Gson()
    private val scope = CoroutineScope(Dispatchers.IO + SupervisorJob())
    private val client = OkHttpClient.Builder()
        .connectTimeout(30, TimeUnit.SECONDS)
        .readTimeout(120, TimeUnit.SECONDS)
        .followRedirects(true)
        .followSslRedirects(true)
        .build()

    private val _downloadedSongs = MutableStateFlow<List<DownloadedSong>>(emptyList())
    val downloadedSongs: StateFlow<List<DownloadedSong>> = _downloadedSongs.asStateFlow()

    private val _downloadingIds = MutableStateFlow<Set<Long>>(emptySet())
    val downloadingIds: StateFlow<Set<Long>> = _downloadingIds.asStateFlow()

    private val _downloadProgress = MutableStateFlow<Map<Long, Int>>(emptyMap())
    val downloadProgress: StateFlow<Map<Long, Int>> = _downloadProgress.asStateFlow()

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
                // Keep only entries whose audio file still exists and is non-empty
                val valid = map.values.filter {
                    val f = File(it.localAudioPath)
                    f.exists() && f.length() > 10_000L
                }.map { item ->
                    if (item.fileSizeBytes <= 0L) {
                        item.copy(fileSizeBytes = File(item.localAudioPath).length())
                    } else item
                }
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
        return if (file.exists() && file.length() > 10_000L) file else null
    }

    fun getLocalCoverFile(songId: Long): File? {
        val item = _downloadedSongs.value.find { it.songId == songId } ?: return null
        val path = item.localCoverPath ?: return null
        val file = File(path)
        return if (file.exists() && file.length() > 0L) file else null
    }

    fun getTotalDownloadedBytes(): Long {
        return _downloadedSongs.value.sumOf {
            if (it.fileSizeBytes > 0L) it.fileSizeBytes else File(it.localAudioPath).length()
        }
    }

    fun downloadPlaylist(context: Context, songs: List<Song>, onAllComplete: (() -> Unit)? = null) {
        val toDownload = songs.filter { !isDownloaded(it.id) && !isDownloading(it.id) }
        if (toDownload.isEmpty()) {
            onAllComplete?.invoke()
            return
        }
        scope.launch {
            for (song in toDownload) {
                downloadSongSync(context, song)
            }
            withContext(Dispatchers.Main) {
                onAllComplete?.invoke()
            }
        }
    }

    fun downloadSong(context: Context, song: Song, onComplete: ((Boolean) -> Unit)? = null) {
        if (isDownloaded(song.id) || isDownloading(song.id)) {
            onComplete?.invoke(true)
            return
        }
        scope.launch {
            val ok = downloadSongSync(context, song)
            withContext(Dispatchers.Main) {
                onComplete?.invoke(ok)
            }
        }
    }

    private suspend fun downloadSongSync(context: Context, song: Song): Boolean {
        if (isDownloaded(song.id) || isDownloading(song.id)) return true

        withContext(Dispatchers.Main) {
            _downloadingIds.value = _downloadingIds.value + song.id
            _downloadProgress.value = _downloadProgress.value + (song.id to 1)
        }

        val musicDir = context.getExternalFilesDir(Environment.DIRECTORY_MUSIC)
            ?: File(context.filesDir, "music")
        if (!musicDir.exists()) musicDir.mkdirs()

        val targetFile = File(musicDir, "melody_${song.id}.mp3")
        val tmpFile = File(musicDir, "melody_${song.id}.mp3.tmp")
        var success = false

        try {
            val primaryBase = ApiClient.baseUrl.trimEnd('/')
            val fallbackBase = if (primaryBase.contains("vercel.app")) {
                ApiClient.FALLBACK_BASE_URL.trimEnd('/')
            } else {
                ApiClient.PRIMARY_BASE_URL.trimEnd('/')
            }
            val urlsToTry = listOf(
                "$primaryBase/api/stream/${song.id}",
                "$fallbackBase/api/stream/${song.id}"
            ).distinct()

            val chunkSizeBytes = 1536L * 1024L // 1.5 MB slices — 100% Vercel Serverless & Render compatible!

            for (url in urlsToTry) {
                try {
                    if (tmpFile.exists()) tmpFile.delete()

                    var offset = 0L
                    var totalLength = -1L
                    var lastPct = 1
                    var streamFailed = false

                    FileOutputStream(tmpFile).use { out ->
                        while (true) {
                            val endRange = offset + chunkSizeBytes - 1L
                            val request = Request.Builder()
                                .url(url)
                                .addHeader("x-device-id", ApiClient.deviceId)
                                .addHeader("Range", "bytes=$offset-$endRange")
                                .build()

                            val response = client.newCall(request).execute()
                            var chunkRead = 0L
                            var serverStatus = 0
                            var contentRange: String? = null
                            var contentType = ""

                            response.use { resp ->
                                serverStatus = resp.code
                                contentType = resp.header("Content-Type") ?: ""
                                contentRange = resp.header("Content-Range")

                                if (!resp.isSuccessful || resp.body == null || contentType.contains("application/json") || contentType.contains("text/html")) {
                                    streamFailed = true
                                } else {
                                    if (!contentRange.isNullOrBlank()) {
                                        val slashIdx = contentRange!!.lastIndexOf('/')
                                        if (slashIdx != -1) {
                                            val parsedTotal = contentRange!!.substring(slashIdx + 1).trim().toLongOrNull()
                                            if (parsedTotal != null && parsedTotal > 0L) {
                                                totalLength = parsedTotal
                                            }
                                        }
                                    } else if (serverStatus == 200) {
                                        val cl = resp.body!!.contentLength()
                                        if (cl > 0L) totalLength = cl
                                    }

                                    val buffer = ByteArray(16 * 1024)
                                    val inp: InputStream = resp.body!!.byteStream()
                                    inp.use { stream ->
                                        var read: Int
                                        while (stream.read(buffer).also { read = it } != -1) {
                                            out.write(buffer, 0, read)
                                            chunkRead += read
                                            offset += read
                                            if (totalLength > 0L) {
                                                val pct = ((offset * 100L) / totalLength).toInt().coerceIn(1, 99)
                                                if (pct >= lastPct + 3) {
                                                    lastPct = pct
                                                    withContext(Dispatchers.Main) {
                                                        _downloadProgress.value = _downloadProgress.value + (song.id to pct)
                                                    }
                                                }
                                            }
                                        }
                                    }
                                }
                            }

                            if (streamFailed || chunkRead <= 0L) break
                            if (serverStatus == 200 || (totalLength > 0L && offset >= totalLength)) {
                                break
                            }
                        }
                        out.flush()
                    }

                    if (!streamFailed && offset > 10_000L && (totalLength <= 0L || offset >= totalLength - 4096)) {
                        if (targetFile.exists()) targetFile.delete()
                        if (!tmpFile.renameTo(targetFile)) {
                            tmpFile.copyTo(targetFile, overwrite = true)
                            tmpFile.delete()
                        }

                        // Also cache album cover locally so offline mode displays artwork without internet!
                        val localCoverPath = downloadCoverSilently(musicDir, song)

                        val downloaded = DownloadedSong(
                            songId = song.id,
                            title = song.title,
                            artist = song.artist,
                            album = song.album,
                            durationSeconds = song.durationSeconds,
                            coverUrl = song.coverUrl,
                            localAudioPath = targetFile.absolutePath,
                            localCoverPath = localCoverPath,
                            fileSizeBytes = targetFile.length(),
                            downloadedAt = System.currentTimeMillis()
                        )

                        withContext(Dispatchers.Main) {
                            val currentList = _downloadedSongs.value.filter { it.songId != song.id } + downloaded
                            saveIndex(context, currentList)
                            _downloadProgress.value = _downloadProgress.value + (song.id to 100)
                        }
                        success = true
                    } else {
                        tmpFile.delete()
                    }
                    if (success) break
                } catch (e: Exception) {
                    e.printStackTrace()
                    if (tmpFile.exists()) tmpFile.delete()
                }
            }
        } finally {
            if (tmpFile.exists()) tmpFile.delete()
            withContext(Dispatchers.Main) {
                _downloadingIds.value = _downloadingIds.value - song.id
                _downloadProgress.value = _downloadProgress.value - song.id
            }
        }
        return success
    }

    private fun downloadCoverSilently(musicDir: File, song: Song): String? {
        return try {
            val coverUrl = song.getFullCoverUrl()
            if (!coverUrl.startsWith("http")) return null
            val coverFile = File(musicDir, "cover_${song.id}.jpg")
            if (coverFile.exists() && coverFile.length() > 500) return coverFile.absolutePath

            val req = Request.Builder().url(coverUrl).build()
            client.newCall(req).execute().use { resp ->
                if (resp.isSuccessful && resp.body != null) {
                    FileOutputStream(coverFile).use { out ->
                        resp.body!!.byteStream().copyTo(out)
                    }
                    if (coverFile.length() > 500) coverFile.absolutePath else {
                        coverFile.delete()
                        null
                    }
                } else null
            }
        } catch (_: Exception) {
            null
        }
    }

    fun removeDownload(context: Context, songId: Long) {
        scope.launch {
            val item = _downloadedSongs.value.find { it.songId == songId } ?: return@launch
            try {
                File(item.localAudioPath).takeIf { it.exists() }?.delete()
                item.localCoverPath?.let { File(it).takeIf { f -> f.exists() }?.delete() }
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

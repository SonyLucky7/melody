package com.melody.music.data.model

import com.google.gson.annotations.SerializedName

data class Song(
    @SerializedName("id") val id: Long,
    @SerializedName("title") val title: String,
    @SerializedName("artist") val artist: String,
    @SerializedName("album") val album: String?,
    @SerializedName("language") val language: String?,
    @SerializedName("duration_seconds") val durationSeconds: Int,
    @SerializedName("cover_url") val coverUrl: String?,
    @SerializedName("created_at") val createdAt: String?
) {
    fun getFullCoverUrl(): String {
        if (coverUrl.isNullOrBlank()) {
            return "https://melody-chi-nine.vercel.app/Melody-Logo-512.png"
        }
        if (coverUrl.startsWith("http://") || coverUrl.startsWith("https://")) {
            return coverUrl
        }
        // Resolves relative cover paths to high-speed global Vercel CDN
        val clean = coverUrl.removePrefix("/")
        return "https://melody-chi-nine.vercel.app/$clean"
    }

    fun getFormattedDuration(): String {
        val minutes = durationSeconds / 60
        val seconds = durationSeconds % 60
        return String.format("%d:%02d", minutes, seconds)
    }
}

data class SongResponse(
    @SerializedName("success") val success: Boolean,
    @SerializedName("data") val data: List<Song>,
    @SerializedName("total") val total: Int
)

data class PlayUrlResponse(
    @SerializedName("success") val success: Boolean,
    @SerializedName("songId") val songId: Long,
    @SerializedName("streamUrl") val streamUrl: String,
    @SerializedName("expiresInSeconds") val expiresInSeconds: Int
)

data class Playlist(
    @SerializedName("id") val id: Long,
    @SerializedName("name") val name: String,
    @SerializedName("total_songs") val totalSongs: Int? = 0
)

data class PlaylistsResponse(
    @SerializedName("success") val success: Boolean,
    @SerializedName("data") val data: List<Playlist>
)

data class PlaylistSongsResponse(
    @SerializedName("success") val success: Boolean,
    @SerializedName("playlist") val playlist: Playlist,
    @SerializedName("songs") val songs: List<Song>
)

data class ActiveDevice(
    @SerializedName("device_id") val deviceId: String,
    @SerializedName("device_name") val deviceName: String,
    @SerializedName("last_active_at") val lastActiveAt: String
)

data class AndroidUserProfile(
    @SerializedName("firstName") val firstName: String,
    @SerializedName("surname") val surname: String,
    @SerializedName("mobile") val mobile: String,
    @SerializedName("email") val email: String?,
    @SerializedName("plan") val plan: String,
    @SerializedName("expiresAt") val expiresAt: String?,
    @SerializedName("licenceKey") val licenceKey: String,
    @SerializedName("formattedKey") val formattedKey: String
)

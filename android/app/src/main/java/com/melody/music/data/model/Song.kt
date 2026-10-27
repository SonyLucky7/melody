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
)

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
    @SerializedName("total_songs") val totalSongs: Int?
)

data class ActiveDevice(
    @SerializedName("device_id") val deviceId: String,
    @SerializedName("device_name") val deviceName: String,
    @SerializedName("last_active_at") val lastActiveAt: String
)

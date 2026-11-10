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
        if (coverUrl.isNullOrBlank() || coverUrl.contains("Melody-Logo")) {
            val alb = album?.lowercase() ?: ""
            val art = artist.lowercase()
            val tit = title.lowercase()
            if (alb.contains("motivation vol. 1") || alb == "motivation 1") {
                return "https://images.unsplash.com/photo-1517838277536-f5f99be501cd?w=600&auto=format&fit=crop&q=80"
            }
            if (alb.contains("motivation vol. 2") || alb == "motivation 2") {
                return "https://images.unsplash.com/photo-1534438327276-14e5300c3a48?w=600&auto=format&fit=crop&q=80"
            }
            if (alb.contains("phonk") || alb.contains("brazil") || tit.contains("phonk") || tit.contains("montagem") || tit.contains("automotivo")) {
                return "https://image-cdn-ak.spotifycdn.com/image/ab67706c0000d72c469ab8293c7d2056b6c9df23"
            }
            if (art.contains("weeknd")) {
                return "https://melody-chi-nine.vercel.app/covers/the-weeknd-avatar.jpg"
            }
            if (art.contains("moose wala")) {
                return "https://melody-chi-nine.vercel.app/covers/desi-295-mvs26s80.jpg"
            }
            if (art.contains("honey singh")) {
                return "https://melody-chi-nine.vercel.app/covers/desi-dope-shope-mvs2dv2r.jpg"
            }
            if (art.contains("lana")) {
                return "https://melody-chi-nine.vercel.app/covers/lana-collection.jpg"
            }
            if (art.contains("ariana")) {
                return "https://melody-chi-nine.vercel.app/covers/ariana-7-rings-mvrzjch5.jpg"
            }
            if (alb.contains("slowed") || tit.contains("slowed") || tit.contains("reverb")) {
                return "https://melody-chi-nine.vercel.app/covers/weeknd-song-7.jpg"
            }
            return "https://melody-chi-nine.vercel.app/Melody-Logo-512.png"
        }
        if (coverUrl.startsWith("http://") || coverUrl.startsWith("https://")) {
            return coverUrl
        }
        // Resolves relative cover paths to high-speed global Vercel CDN
        val clean = coverUrl.removePrefix("/").replace(" ", "%20")
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
    @SerializedName("total_songs") val totalSongs: Int? = 0,
    @SerializedName("cover_url") val coverUrl: String? = null,
    @SerializedName("description") val description: String? = null
)

val PUBLIC_PLAYLISTS = listOf(
    Playlist(
        10L,
        "Motivation Vol. 1",
        92,
        "https://images.unsplash.com/photo-1517838277536-f5f99be501cd?w=600&auto=format&fit=crop&q=80",
        "Drake, Lil Wayne, 50 Cent, Eminem & high-energy workout bangers."
    ),
    Playlist(
        11L,
        "Motivation Vol. 2",
        91,
        "https://images.unsplash.com/photo-1534438327276-14e5300c3a48?w=600&auto=format&fit=crop&q=80",
        "Trophies, Steady Mobbin, We Dem Boyz, Black and Yellow workout power."
    ),
    Playlist(
        12L,
        "Brazil Phonk Essentials",
        327,
        "https://image-cdn-ak.spotifycdn.com/image/ab67706c0000d72c469ab8293c7d2056b6c9df23",
        "Montagem, Automotivo, Brazilian drift phonk, funk pesado & bass boosts."
    ),
    Playlist(
        9L,
        "TikTok Phonk",
        323,
        "https://image-cdn-ak.spotifycdn.com/image/ab67706c0000d72c469ab8293c7d2056b6c9df23",
        "Kordhell, DVRST, Hensonn, phonk drift and bass heavy tracks."
    ),
    Playlist(
        3L,
        "Slowed + Reverb Essentials",
        137,
        "https://melody-chi-nine.vercel.app/covers/weeknd-song-7.jpg",
        "Late night slowed and reverbed vibes, lofi & atmospheric chill."
    ),
    Playlist(
        4L,
        "Sidhu Moose Wala Legends",
        9,
        "https://melody-chi-nine.vercel.app/covers/desi-295-mvs26s80.jpg",
        "295, The Last Ride, Legend, Levels, So High & all iconic anthems."
    ),
    Playlist(
        5L,
        "Yo Yo Honey Singh Blockbusters",
        10,
        "https://melody-chi-nine.vercel.app/covers/desi-dope-shope-mvs2dv2r.jpg",
        "Dope Shope, Blue Eyes, Desi Kalakaar, Love Dose & legendary Punjabi hits."
    ),
    Playlist(
        6L,
        "The Weeknd Master Collection",
        54,
        "https://melody-chi-nine.vercel.app/covers/the-weeknd-avatar.jpg",
        "Blinding Lights, Starboy, After Hours, Die For You & Abel classics."
    ),
    Playlist(
        7L,
        "Lana Del Rey Aesthetics",
        31,
        "https://melody-chi-nine.vercel.app/covers/lana-collection.jpg",
        "Summertime Sadness, Video Games, Young and Beautiful, Born to Die."
    ),
    Playlist(
        8L,
        "Ariana Grande Top Hits",
        60,
        "https://melody-chi-nine.vercel.app/covers/ariana-7-rings-mvrzjch5.jpg",
        "7 rings, thank u next, Dangerous Woman, positions & pop royalty."
    )
)

fun isArtistMatch(songArtist: String?, targetArtist: String?): Boolean {
    if (songArtist.isNullOrBlank() || targetArtist.isNullOrBlank()) return false
    val s = songArtist.lowercase().trim()
    val t = targetArtist.lowercase().trim()
    if (s == t) return true
    if (s.contains(t) || t.contains(s)) return true

    val sClean = s.replace(Regex("[^a-z0-9]"), "")
    val tClean = t.replace(Regex("[^a-z0-9]"), "")
    if (sClean.isNotEmpty() && tClean.isNotEmpty() && (sClean.contains(tClean) || tClean.contains(sClean))) return true

    val aliases = mapOf(
        "the weeknd" to listOf("weeknd", "abel tesfaye", "the weekend"),
        "yo yo honey singh" to listOf("honey singh", "yo yo", "honeysingh"),
        "sidhu moose wala" to listOf("sidhu", "moose wala", "moosewala"),
        "lana del rey" to listOf("lana", "del rey", "elizabeth grant"),
        "ariana grande" to listOf("ariana"),
        "2pac" to listOf("tupac", "makaveli"),
        "50 cent" to listOf("50cent", "curtis jackson"),
        "eminem" to listOf("slim shady", "marshall mathers")
    )

    for ((canonical, aliasList) in aliases) {
        val isTarget = t.contains(canonical) || aliasList.any { t.contains(it) }
        val isSong = s.contains(canonical) || aliasList.any { s.contains(it) }
        if (isTarget && isSong) return true
    }

    val tokens = songArtist.split(Regex("[,/&|;]|(?:\\s+ft\\.?\\s+)|\\s+feat\\.?\\s+", RegexOption.IGNORE_CASE))
        .map { it.trim().lowercase() }
    return tokens.any { it == t || it.contains(t) || t.contains(it) }
}

fun getPlaylistSongsFallback(playlist: Playlist, allSongs: List<Song>): List<Song> {
    val nameLower = playlist.name.lowercase()
    val id = playlist.id
    return when {
        id == 10L || nameLower.contains("motivation vol. 1") || nameLower == "motivation 1" ->
            allSongs.filter { it.album?.equals("Motivation Vol. 1", ignoreCase = true) == true }
        id == 11L || nameLower.contains("motivation vol. 2") || nameLower == "motivation 2" ->
            allSongs.filter { it.album?.equals("Motivation Vol. 2", ignoreCase = true) == true }
        nameLower.contains("motivation") ->
            allSongs.filter { it.album?.contains("motivation", ignoreCase = true) == true }
        id == 12L || nameLower.contains("brazil") ->
            allSongs.filter {
                it.album?.contains("brazil", ignoreCase = true) == true ||
                it.title.contains("montagem", ignoreCase = true) ||
                it.title.contains("automotivo", ignoreCase = true) ||
                it.album?.contains("phonk", ignoreCase = true) == true ||
                it.language?.equals("phonk", ignoreCase = true) == true ||
                it.title.contains("phonk", ignoreCase = true)
            }
        id == 9L || nameLower.contains("phonk") ->
            allSongs.filter {
                it.album?.contains("phonk", ignoreCase = true) == true ||
                it.language?.equals("phonk", ignoreCase = true) == true ||
                it.title.contains("phonk", ignoreCase = true) ||
                it.title.contains("montagem", ignoreCase = true) ||
                it.album?.contains("brazil", ignoreCase = true) == true
            }
        id == 3L || nameLower.contains("slowed") || nameLower.contains("reverb") ->
            allSongs.filter {
                it.title.contains("slowed", ignoreCase = true) ||
                it.title.contains("reverb", ignoreCase = true) ||
                it.album?.contains("slowed", ignoreCase = true) == true
            }
        id == 4L || nameLower.contains("sidhu") || nameLower.contains("moose") ->
            allSongs.filter { isArtistMatch(it.artist, "Sidhu Moose Wala") }
        id == 5L || nameLower.contains("honey") || nameLower.contains("yo yo") ->
            allSongs.filter { isArtistMatch(it.artist, "Yo Yo Honey Singh") }
        id == 6L || nameLower.contains("weeknd") ->
            allSongs.filter { isArtistMatch(it.artist, "The Weeknd") }
        id == 7L || nameLower.contains("lana") ->
            allSongs.filter { isArtistMatch(it.artist, "Lana Del Rey") }
        id == 8L || nameLower.contains("ariana") ->
            allSongs.filter { isArtistMatch(it.artist, "Ariana Grande") }
        else -> {
            val byAlbum = allSongs.filter { it.album?.equals(nameLower, ignoreCase = true) == true }
            if (byAlbum.isNotEmpty()) byAlbum else emptyList()
        }
    }
}

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

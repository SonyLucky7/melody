package com.melody.music.ui.tv

import androidx.activity.compose.BackHandler
import androidx.compose.animation.animateColorAsState
import androidx.compose.animation.core.animateFloatAsState
import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.focusable
import androidx.compose.foundation.interaction.MutableInteractionSource
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.LazyRow
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.draw.scale
import androidx.compose.ui.focus.onFocusChanged
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.input.key.*
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import coil.compose.AsyncImage
import com.melody.music.data.api.ApiClient
import com.melody.music.data.model.Playlist
import com.melody.music.data.model.PUBLIC_PLAYLISTS
import com.melody.music.data.model.Song
import com.melody.music.data.model.getPlaylistSongsFallback
import com.melody.music.player.MelodyPlayerManager
import com.melody.music.ui.screens.ARTIST_PROFILES
import com.melody.music.ui.theme.MelodyCard
import com.melody.music.ui.theme.MelodyPrimary
import com.melody.music.ui.theme.MelodyTextSecondary

/**
 * Spotify TV 10-Foot Leanback Experience for Android TV & Google TV.
 * Features a left navigation rail, cinematic billboard banner,
 * horizontal D-Pad focusable shelves, and integrated Now Playing mini-dock.
 */
@Composable
fun TvMainScreen(
    songs: List<Song>,
    onSongClick: (Song, List<Song>) -> Unit,
    onSwitchToMobileMode: () -> Unit,
    onOpenActivation: () -> Unit = {},
    modifier: Modifier = Modifier
) {
    var selectedTab by remember { mutableStateOf(0) }
    var selectedPlaylistInTv by remember { mutableStateOf<Playlist?>(null) }
    var isFullPlayerVisible by remember { mutableStateOf(false) }
    var searchQuery by remember { mutableStateOf("") }

    val currentSong by MelodyPlayerManager.currentSong.collectAsState()
    val isPlaying by MelodyPlayerManager.isPlaying.collectAsState()
    val progressMs by MelodyPlayerManager.progressMs.collectAsState()
    val durationMs by MelodyPlayerManager.durationMs.collectAsState()

    // Categorized track lists
    val phonkSongs = remember(songs) {
        songs.filter {
            it.album?.contains("phonk", ignoreCase = true) == true ||
            it.album?.contains("brazil", ignoreCase = true) == true ||
            it.language?.equals("phonk", ignoreCase = true) == true ||
            it.title.contains("phonk", ignoreCase = true) ||
            it.title.contains("montagem", ignoreCase = true) ||
            it.title.contains("automotivo", ignoreCase = true)
        }
    }

    val slowedSongs = remember(songs) {
        songs.filter {
            it.title.contains("slowed", ignoreCase = true) ||
            it.title.contains("reverb", ignoreCase = true) ||
            it.album?.contains("slowed", ignoreCase = true) == true
        }
    }

    val motivationSongs = remember(songs) {
        songs.filter { it.album?.contains("motivation", ignoreCase = true) == true }
    }

    val trendingSongs = remember(songs) {
        songs.take(20)
    }

    // Helper: Play song and immediately launch TV Now Playing screen
    val playSongAndOpenPlayer: (Song, List<Song>) -> Unit = { song, queue ->
        onSongClick(song, queue)
        isFullPlayerVisible = true
    }

    // Hardware remote back button interceptor for Android TV
    BackHandler(enabled = isFullPlayerVisible || selectedPlaylistInTv != null || selectedTab != 0) {
        when {
            isFullPlayerVisible -> isFullPlayerVisible = false
            selectedPlaylistInTv != null -> selectedPlaylistInTv = null
            selectedTab != 0 -> selectedTab = 0
        }
    }

    Box(
        modifier = modifier
            .fillMaxSize()
            .background(Color(0xFF09090D))
    ) {
        Row(modifier = Modifier.fillMaxSize()) {
            // ==========================================
            // 1. LEFT LEANBACK NAVIGATION RAIL (SIDEBAR)
            // ==========================================
            Column(
                modifier = Modifier
                    .width(224.dp)
                    .fillMaxHeight()
                    .background(Color(0xFF101017))
                    .border(BorderStroke(1.dp, Color.White.copy(alpha = 0.05f)))
                    .padding(top = 28.dp, bottom = 24.dp, start = 14.dp, end = 14.dp),
                verticalArrangement = Arrangement.SpaceBetween
            ) {
                // Top: Melody TV Branding
                Column(modifier = Modifier.fillMaxWidth()) {
                    Row(
                        verticalAlignment = Alignment.CenterVertically,
                        horizontalArrangement = Arrangement.spacedBy(10.dp),
                        modifier = Modifier.padding(horizontal = 8.dp, vertical = 6.dp)
                    ) {
                        Box(
                            modifier = Modifier
                                .size(36.dp)
                                .clip(RoundedCornerShape(8.dp))
                                .background(MelodyPrimary),
                            contentAlignment = Alignment.Center
                        ) {
                            Text(
                                text = "M",
                                color = Color.White,
                                fontWeight = FontWeight.Black,
                                fontSize = 20.sp
                            )
                        }
                        Column {
                            Text(
                                text = "MELODY TV",
                                color = Color.White,
                                fontWeight = FontWeight.Black,
                                fontSize = 14.sp,
                                letterSpacing = 0.5.sp
                            )
                            Text(
                                text = "Spotify TV Edition",
                                color = Color(0xFF34D399),
                                fontWeight = FontWeight.Bold,
                                fontSize = 10.sp
                            )
                        }
                    }

                    Spacer(modifier = Modifier.height(24.dp))

                    // Nav Menu Items with Remote OK Support
                    TvNavRailItem(
                        icon = Icons.Default.Home,
                        label = "Home",
                        isSelected = selectedTab == 0 && selectedPlaylistInTv == null,
                        onClick = {
                            selectedPlaylistInTv = null
                            selectedTab = 0
                        }
                    )

                    TvNavRailItem(
                        icon = Icons.Default.Search,
                        label = "Search",
                        isSelected = selectedTab == 1 && selectedPlaylistInTv == null,
                        onClick = {
                            selectedPlaylistInTv = null
                            selectedTab = 1
                        }
                    )

                    TvNavRailItem(
                        icon = Icons.Default.QueueMusic,
                        label = "Playlists",
                        isSelected = selectedTab == 2 || selectedPlaylistInTv != null,
                        onClick = {
                            selectedPlaylistInTv = null
                            selectedTab = 2
                        }
                    )

                    TvNavRailItem(
                        icon = Icons.Default.LibraryMusic,
                        label = "Your Library",
                        isSelected = selectedTab == 3 && selectedPlaylistInTv == null,
                        onClick = {
                            selectedPlaylistInTv = null
                            selectedTab = 3
                        }
                    )

                    TvNavRailItem(
                        icon = if (ApiClient.isActivated) Icons.Default.Person else Icons.Default.Key,
                        label = if (ApiClient.isActivated) "VIP Account" else "Activate VIP",
                        isSelected = selectedTab == 4 && selectedPlaylistInTv == null,
                        onClick = {
                            selectedPlaylistInTv = null
                            selectedTab = 4
                        }
                    )
                }

                // Bottom: Switch to Mobile Mode + Mini Now Playing Card
                Column(
                    modifier = Modifier.fillMaxWidth(),
                    verticalArrangement = Arrangement.spacedBy(10.dp)
                ) {
                    // Mobile UI Switcher Button
                    TvFocusableItem(
                        onClick = onSwitchToMobileMode,
                        shape = RoundedCornerShape(8.dp),
                        focusedScale = 1.04f
                    ) { isFocused ->
                        Row(
                            verticalAlignment = Alignment.CenterVertically,
                            horizontalArrangement = Arrangement.spacedBy(8.dp),
                            modifier = Modifier
                                .fillMaxWidth()
                                .background(if (isFocused) Color(0xFF262635) else Color.White.copy(alpha = 0.04f))
                                .padding(horizontal = 10.dp, vertical = 8.dp)
                        ) {
                            Icon(
                                imageVector = Icons.Default.Smartphone,
                                contentDescription = "Switch to Mobile UI",
                                tint = if (isFocused) Color.White else MelodyTextSecondary,
                                modifier = Modifier.size(16.dp)
                            )
                            Text(
                                text = "Mobile View",
                                color = if (isFocused) Color.White else MelodyTextSecondary,
                                fontSize = 11.sp,
                                fontWeight = FontWeight.Medium
                            )
                        }
                    }

                    // Mini Now Playing Dock Pill
                    if (currentSong != null) {
                        TvFocusableItem(
                            onClick = { isFullPlayerVisible = true },
                            shape = RoundedCornerShape(10.dp),
                            focusedScale = 1.05f
                        ) { isFocused ->
                            Row(
                                verticalAlignment = Alignment.CenterVertically,
                                horizontalArrangement = Arrangement.spacedBy(8.dp),
                                modifier = Modifier
                                    .fillMaxWidth()
                                    .background(if (isFocused) Color(0xFF2E2244) else Color(0xFF1A1A24))
                                    .border(BorderStroke(if (isFocused) 1.5.dp else 0.dp, MelodyPrimary), RoundedCornerShape(10.dp))
                                    .padding(8.dp)
                            ) {
                                AsyncImage(
                                    model = currentSong!!.getFullCoverUrl(),
                                    contentDescription = currentSong!!.title,
                                    modifier = Modifier
                                        .size(38.dp)
                                        .clip(RoundedCornerShape(6.dp)),
                                    contentScale = ContentScale.Crop
                                )

                                Column(modifier = Modifier.weight(1f)) {
                                    Text(
                                        text = currentSong!!.title,
                                        color = Color.White,
                                        fontSize = 11.sp,
                                        fontWeight = FontWeight.Bold,
                                        maxLines = 1,
                                        softWrap = false,
                                        overflow = TextOverflow.Ellipsis
                                    )
                                    Text(
                                        text = currentSong!!.artist,
                                        color = MelodyTextSecondary,
                                        fontSize = 9.sp,
                                        maxLines = 1,
                                        softWrap = false,
                                        overflow = TextOverflow.Ellipsis
                                    )
                                }

                                Icon(
                                    imageVector = if (isPlaying) Icons.Default.Pause else Icons.Default.PlayArrow,
                                    contentDescription = "Play/Pause",
                                    tint = MelodyPrimary,
                                    modifier = Modifier
                                        .size(20.dp)
                                        .clickable { MelodyPlayerManager.togglePlay() }
                                )
                            }
                        }
                    }
                }
            }

            // ==========================================
            // 2. MAIN 10-FOOT STAGE (SPOTIFY TV SHELVES)
            // ==========================================
            Box(
                modifier = Modifier
                    .weight(1f)
                    .fillMaxHeight()
                    .padding(start = 28.dp, end = 36.dp, top = 26.dp, bottom = 28.dp)
            ) {
                if (selectedPlaylistInTv != null) {
                    // PLAYLIST DRILLDOWN DETAIL SCREEN
                    TvPlaylistDetailView(
                        playlist = selectedPlaylistInTv!!,
                        allSongs = songs,
                        onBack = { selectedPlaylistInTv = null },
                        onSongClick = playSongAndOpenPlayer
                    )
                } else {
                    when (selectedTab) {
                        0 -> {
                            // HOME VIEW (Billboard + Horizontal Shelves)
                            LazyColumn(
                                verticalArrangement = Arrangement.spacedBy(28.dp),
                                modifier = Modifier.fillMaxSize()
                            ) {
                                // Top Cinematic Billboard Banner
                                item {
                                    TvBillboardBanner(
                                        title = "Brazil Phonk & Montagem",
                                        subtitle = "VTZEAT, Bibi Babydoll, Mc Gw & Brazilian Drift Funk",
                                        description = "Ultra high-bass Brazilian phonk, slowed to perfection, and viral TikTok drift anthems in studio 320k FLAC lossless audio.",
                                        coverUrl = "https://image-cdn-ak.spotifycdn.com/image/ab67706c0000d72c469ab8293c7d2056b6c9df23",
                                        onPlayClick = {
                                            if (phonkSongs.isNotEmpty()) {
                                                playSongAndOpenPlayer(phonkSongs[0], phonkSongs)
                                            }
                                        }
                                    )
                                }

                                // Shelf 1: Brazil Phonk & Montagem
                                if (phonkSongs.isNotEmpty()) {
                                    item {
                                        TvShelfSection(
                                            title = "🇧🇷 Brazil Phonk & Montagem (${phonkSongs.size})",
                                            subtitle = "Heavy 808s, Brazilian drift funk, and TikTok bass anthems"
                                        ) {
                                            LazyRow(horizontalArrangement = Arrangement.spacedBy(16.dp)) {
                                                items(phonkSongs) { song ->
                                                    TvSongCard(
                                                        song = song,
                                                        onClick = { playSongAndOpenPlayer(song, phonkSongs) }
                                                    )
                                                }
                                            }
                                        }
                                    }
                                }

                                // Shelf 2: Curated Playlists
                                item {
                                    TvShelfSection(
                                        title = "🎧 Curated Studio Playlists",
                                        subtitle = "Lossless collections curated for home audio systems"
                                    ) {
                                        LazyRow(horizontalArrangement = Arrangement.spacedBy(18.dp)) {
                                            items(PUBLIC_PLAYLISTS) { pl ->
                                                TvPlaylistCard(
                                                    playlist = pl,
                                                    onClick = {
                                                        selectedPlaylistInTv = pl
                                                    }
                                                )
                                            }
                                        }
                                    }
                                }

                                // Shelf 3: Trending & Popular
                                if (trendingSongs.isNotEmpty()) {
                                    item {
                                        TvShelfSection(
                                            title = "🔥 Trending & Popular Bangers",
                                            subtitle = "The most played chart-toppers on Melody worldwide"
                                        ) {
                                            LazyRow(horizontalArrangement = Arrangement.spacedBy(16.dp)) {
                                                items(trendingSongs) { song ->
                                                    TvSongCard(
                                                        song = song,
                                                        onClick = { playSongAndOpenPlayer(song, trendingSongs) }
                                                    )
                                                }
                                            }
                                        }
                                    }
                                }

                                // Shelf 4: Top Legendary Artists
                                item {
                                    TvShelfSection(
                                        title = "🌟 Featured Icons & Artists",
                                        subtitle = "Explore full discographies from legendary recording artists"
                                    ) {
                                        LazyRow(horizontalArrangement = Arrangement.spacedBy(18.dp)) {
                                            items(ARTIST_PROFILES.entries.toList()) { entry ->
                                                val artist = entry.value
                                                TvArtistCard(
                                                    name = artist.name,
                                                    imageUrl = artist.imageUrl,
                                                    rank = artist.rank,
                                                    onClick = {
                                                        val artistSongs = songs.filter {
                                                            it.artist.contains(artist.name, ignoreCase = true)
                                                        }
                                                        if (artistSongs.isNotEmpty()) {
                                                            playSongAndOpenPlayer(artistSongs[0], artistSongs)
                                                        }
                                                    }
                                                )
                                            }
                                        }
                                    }
                                }

                                // Shelf 5: Slowed + Reverb Essentials
                                if (slowedSongs.isNotEmpty()) {
                                    item {
                                        TvShelfSection(
                                            title = "🌙 Late Night Slowed + Reverb",
                                            subtitle = "Atmospheric, chill and reverb aesthetics for relaxation"
                                        ) {
                                            LazyRow(horizontalArrangement = Arrangement.spacedBy(16.dp)) {
                                                items(slowedSongs) { song ->
                                                    TvSongCard(
                                                        song = song,
                                                        onClick = { playSongAndOpenPlayer(song, slowedSongs) }
                                                    )
                                                }
                                            }
                                        }
                                    }
                                }

                                // Shelf 6: Workout Motivation
                                if (motivationSongs.isNotEmpty()) {
                                    item {
                                        TvShelfSection(
                                            title = "⚡ Workout & Power Motivation",
                                            subtitle = "Drake, 50 Cent, Wiz Khalifa & high-energy pump"
                                        ) {
                                            LazyRow(horizontalArrangement = Arrangement.spacedBy(16.dp)) {
                                                items(motivationSongs) { song ->
                                                    TvSongCard(
                                                        song = song,
                                                        onClick = { playSongAndOpenPlayer(song, motivationSongs) }
                                                    )
                                                }
                                            }
                                        }
                                    }
                                }

                                item {
                                    Spacer(modifier = Modifier.height(100.dp))
                                }
                            }
                        }

                        1 -> {
                            // SEARCH VIEW
                            TvSearchView(
                                songs = songs,
                                searchQuery = searchQuery,
                                onQueryChange = { searchQuery = it },
                                onSongClick = playSongAndOpenPlayer
                            )
                        }

                        2 -> {
                            // PLAYLISTS VIEW
                            LazyColumn(
                                verticalArrangement = Arrangement.spacedBy(20.dp),
                                modifier = Modifier.fillMaxSize()
                            ) {
                                item {
                                    Text(
                                        text = "All Playlists & Collections",
                                        color = Color.White,
                                        fontSize = 26.sp,
                                        fontWeight = FontWeight.Black,
                                        softWrap = false
                                    )
                                    Text(
                                        text = "Select any collection to view all tracks and play lossless audio",
                                        color = MelodyTextSecondary,
                                        fontSize = 13.sp
                                    )
                                }
                                item {
                                    LazyRow(horizontalArrangement = Arrangement.spacedBy(18.dp)) {
                                        items(PUBLIC_PLAYLISTS) { pl ->
                                            TvPlaylistCard(
                                                playlist = pl,
                                                onClick = {
                                                    selectedPlaylistInTv = pl
                                                }
                                            )
                                        }
                                    }
                                }
                            }
                        }

                        3 -> {
                            // LIBRARY VIEW
                            val likedIds = MelodyPlayerManager.likedSongIds.collectAsState().value
                            val likedSongs = remember(songs, likedIds) {
                                songs.filter { likedIds.contains(it.id) }
                            }

                            LazyColumn(
                                verticalArrangement = Arrangement.spacedBy(24.dp),
                                modifier = Modifier.fillMaxSize()
                            ) {
                                item {
                                    Row(
                                        verticalAlignment = Alignment.CenterVertically,
                                        horizontalArrangement = Arrangement.spacedBy(16.dp)
                                    ) {
                                        Text(
                                            text = "Your Library",
                                            color = Color.White,
                                            fontSize = 26.sp,
                                            fontWeight = FontWeight.Black,
                                            softWrap = false
                                        )

                                        if (likedSongs.isNotEmpty()) {
                                            TvFocusableItem(
                                                onClick = { playSongAndOpenPlayer(likedSongs[0], likedSongs) },
                                                shape = RoundedCornerShape(20.dp),
                                                focusedScale = 1.05f
                                            ) { isFocused ->
                                                Row(
                                                    verticalAlignment = Alignment.CenterVertically,
                                                    horizontalArrangement = Arrangement.spacedBy(6.dp),
                                                    modifier = Modifier
                                                        .background(if (isFocused) Color.White else MelodyPrimary, RoundedCornerShape(20.dp))
                                                        .padding(horizontal = 16.dp, vertical = 7.dp)
                                                ) {
                                                    Icon(
                                                        imageVector = Icons.Default.PlayArrow,
                                                        contentDescription = "Play",
                                                        tint = if (isFocused) Color.Black else Color.White,
                                                        modifier = Modifier.size(16.dp)
                                                    )
                                                    Text(
                                                        text = "Play All Liked",
                                                        color = if (isFocused) Color.Black else Color.White,
                                                        fontSize = 12.sp,
                                                        fontWeight = FontWeight.Bold,
                                                        softWrap = false
                                                    )
                                                }
                                            }
                                        }
                                    }
                                }

                                if (likedSongs.isNotEmpty()) {
                                    item {
                                        TvShelfSection(
                                            title = "❤️ Liked Songs (${likedSongs.size})",
                                            subtitle = "Your favorite music ready to play in lossless audio"
                                        ) {
                                            LazyRow(horizontalArrangement = Arrangement.spacedBy(16.dp)) {
                                                items(likedSongs) { song ->
                                                    TvSongCard(
                                                        song = song,
                                                        onClick = { playSongAndOpenPlayer(song, likedSongs) }
                                                    )
                                                }
                                            }
                                        }
                                    }
                                } else {
                                    item {
                                        Box(
                                            modifier = Modifier
                                                .fillMaxWidth()
                                                .height(180.dp)
                                                .background(Color(0xFF14141C), RoundedCornerShape(16.dp)),
                                            contentAlignment = Alignment.Center
                                        ) {
                                            Text(
                                                text = "No liked songs yet. Heart songs while playing to add them here!",
                                                color = MelodyTextSecondary,
                                                fontSize = 14.sp
                                            )
                                        }
                                    }
                                }
                            }
                        }

                        4 -> {
                            // VIP / LICENCE VIEW
                            Box(
                                modifier = Modifier
                                    .fillMaxWidth()
                                    .background(Color(0xFF14141C), RoundedCornerShape(20.dp))
                                    .border(BorderStroke(1.dp, Color.White.copy(alpha = 0.08f)), RoundedCornerShape(20.dp))
                                    .padding(32.dp)
                            ) {
                                Column(verticalArrangement = Arrangement.spacedBy(18.dp)) {
                                    Row(
                                        verticalAlignment = Alignment.CenterVertically,
                                        horizontalArrangement = Arrangement.spacedBy(12.dp)
                                    ) {
                                        Box(
                                            modifier = Modifier
                                                .size(44.dp)
                                                .clip(RoundedCornerShape(12.dp))
                                                .background(MelodyPrimary),
                                            contentAlignment = Alignment.Center
                                        ) {
                                            Icon(
                                                imageVector = Icons.Default.Star,
                                                contentDescription = "VIP",
                                                tint = Color.White,
                                                modifier = Modifier.size(26.dp)
                                            )
                                        }

                                        Column {
                                            Text(
                                                text = "Melody VIP TV Edition",
                                                color = Color.White,
                                                fontSize = 24.sp,
                                                fontWeight = FontWeight.Black,
                                                softWrap = false
                                            )
                                            Text(
                                                text = if (ApiClient.isActivated) "Active • Studio Lossless FLAC Tier" else "Standard Tier • VIP Activation Available",
                                                color = if (ApiClient.isActivated) Color(0xFF34D399) else Color(0xFFD8B4FE),
                                                fontSize = 13.sp,
                                                fontWeight = FontWeight.Bold
                                            )
                                        }
                                    }

                                    Text(
                                        text = "Experience 320kbps studio lossless FLAC streaming on all your home theater and Google TV devices.",
                                        color = Color(0xFFD1D5DB),
                                        fontSize = 14.sp,
                                        lineHeight = 20.sp
                                    )

                                    Row(
                                        horizontalArrangement = Arrangement.spacedBy(12.dp),
                                        verticalAlignment = Alignment.CenterVertically
                                    ) {
                                        Text(
                                            text = "TV Device ID:",
                                            color = MelodyTextSecondary,
                                            fontSize = 12.sp
                                        )
                                        Box(
                                            modifier = Modifier
                                                .background(Color.White.copy(alpha = 0.08f), RoundedCornerShape(6.dp))
                                                .padding(horizontal = 8.dp, vertical = 4.dp)
                                        ) {
                                            Text(
                                                text = ApiClient.deviceId.take(18) + "...",
                                                color = Color.White,
                                                fontSize = 11.sp,
                                                fontFamily = androidx.compose.ui.text.font.FontFamily.Monospace
                                            )
                                        }
                                    }

                                    Spacer(modifier = Modifier.height(6.dp))

                                    // Dedicated VIP Activation Button
                                    TvFocusableItem(
                                        onClick = onOpenActivation,
                                        shape = RoundedCornerShape(30.dp),
                                        focusedScale = 1.05f
                                    ) { isFocused ->
                                        Row(
                                            verticalAlignment = Alignment.CenterVertically,
                                            horizontalArrangement = Arrangement.spacedBy(10.dp),
                                            modifier = Modifier
                                                .background(
                                                    if (isFocused) Color.White else MelodyPrimary,
                                                    RoundedCornerShape(30.dp)
                                                )
                                                .padding(horizontal = 26.dp, vertical = 13.dp)
                                        ) {
                                            Icon(
                                                imageVector = Icons.Default.Key,
                                                contentDescription = "Key",
                                                tint = if (isFocused) Color.Black else Color.White,
                                                modifier = Modifier.size(18.dp)
                                            )
                                            Text(
                                                text = if (ApiClient.isActivated) "Update VIP Key / Re-activate" else "Enter VIP License Key",
                                                color = if (isFocused) Color.Black else Color.White,
                                                fontWeight = FontWeight.Black,
                                                fontSize = 13.sp,
                                                softWrap = false
                                            )
                                        }
                                    }
                                }
                            }
                        }
                    }
                }
            }
        }

        // ==========================================
        // 3. FULL-SCREEN SPOTIFY TV PLAYER OVERLAY
        // ==========================================
        if (isFullPlayerVisible && currentSong != null) {
            TvPlayerScreen(
                song = currentSong!!,
                isPlaying = isPlaying,
                progressMs = progressMs,
                durationMs = durationMs,
                onTogglePlay = { MelodyPlayerManager.togglePlay() },
                onNext = { MelodyPlayerManager.next() },
                onPrev = { MelodyPlayerManager.prev() },
                onSeekTo = { pos -> MelodyPlayerManager.seekTo(pos) },
                onDismiss = { isFullPlayerVisible = false }
            )
        }
    }
}

/**
 * Spotify TV Playlist Detail Drill-Down Screen.
 * Shows playlist artwork, track list, and allows direct track selection with D-Pad remote.
 */
@Composable
fun TvPlaylistDetailView(
    playlist: Playlist,
    allSongs: List<Song>,
    onBack: () -> Unit,
    onSongClick: (Song, List<Song>) -> Unit
) {
    val playlistTracks = remember(playlist, allSongs) {
        getPlaylistSongsFallback(playlist, allSongs)
    }

    LazyColumn(
        verticalArrangement = Arrangement.spacedBy(20.dp),
        modifier = Modifier.fillMaxSize()
    ) {
        // Top Nav: Back Button
        item {
            TvFocusableItem(
                onClick = onBack,
                shape = RoundedCornerShape(20.dp),
                focusedScale = 1.05f
            ) { isFocused ->
                Row(
                    verticalAlignment = Alignment.CenterVertically,
                    horizontalArrangement = Arrangement.spacedBy(8.dp),
                    modifier = Modifier
                        .background(
                            if (isFocused) Color.White else Color.White.copy(alpha = 0.08f),
                            RoundedCornerShape(20.dp)
                        )
                        .padding(horizontal = 16.dp, vertical = 8.dp)
                ) {
                    Icon(
                        imageVector = Icons.Default.ArrowBack,
                        contentDescription = "Back",
                        tint = if (isFocused) Color.Black else Color.White,
                        modifier = Modifier.size(16.dp)
                    )
                    Text(
                        text = "Back to Playlists",
                        color = if (isFocused) Color.Black else Color.White,
                        fontSize = 12.sp,
                        fontWeight = FontWeight.Bold,
                        softWrap = false
                    )
                }
            }
        }

        // Playlist Hero Header Card
        item {
            Row(
                modifier = Modifier
                    .fillMaxWidth()
                    .background(Color(0xFF14141E), RoundedCornerShape(20.dp))
                    .padding(24.dp),
                verticalAlignment = Alignment.CenterVertically,
                horizontalArrangement = Arrangement.spacedBy(28.dp)
            ) {
                Box(
                    modifier = Modifier
                        .size(160.dp)
                        .clip(RoundedCornerShape(14.dp))
                        .background(MelodyCard)
                ) {
                    AsyncImage(
                        model = playlist.coverUrl ?: "https://melody-chi-nine.vercel.app/Melody-Logo-512.png",
                        contentDescription = playlist.name,
                        modifier = Modifier.fillMaxSize(),
                        contentScale = ContentScale.Crop
                    )
                }

                Column(
                    modifier = Modifier.weight(1f),
                    verticalArrangement = Arrangement.spacedBy(8.dp)
                ) {
                    Box(
                        modifier = Modifier
                            .background(MelodyPrimary, RoundedCornerShape(4.dp))
                            .padding(horizontal = 8.dp, vertical = 3.dp)
                    ) {
                        Text(
                            text = "SPOTIFY TV PLAYLIST",
                            color = Color.White,
                            fontSize = 10.sp,
                            fontWeight = FontWeight.Black,
                            letterSpacing = 1.sp,
                            softWrap = false
                        )
                    }

                    Text(
                        text = playlist.name,
                        color = Color.White,
                        fontSize = 28.sp,
                        fontWeight = FontWeight.Black,
                        lineHeight = 36.sp,
                        softWrap = false,
                        maxLines = 1,
                        overflow = TextOverflow.Ellipsis
                    )

                    Text(
                        text = playlist.description ?: "${playlistTracks.size} lossless tracks curated for home audio",
                        color = MelodyTextSecondary,
                        fontSize = 13.sp,
                        lineHeight = 18.sp,
                        maxLines = 2,
                        overflow = TextOverflow.Ellipsis
                    )

                    Spacer(modifier = Modifier.height(4.dp))

                    Row(
                        verticalAlignment = Alignment.CenterVertically,
                        horizontalArrangement = Arrangement.spacedBy(14.dp)
                    ) {
                        // Play All Button
                        if (playlistTracks.isNotEmpty()) {
                            TvFocusableItem(
                                onClick = { onSongClick(playlistTracks[0], playlistTracks) },
                                shape = RoundedCornerShape(30.dp),
                                focusedScale = 1.05f
                            ) { isFocused ->
                                Row(
                                    verticalAlignment = Alignment.CenterVertically,
                                    horizontalArrangement = Arrangement.spacedBy(8.dp),
                                    modifier = Modifier
                                        .background(if (isFocused) Color.White else MelodyPrimary, RoundedCornerShape(30.dp))
                                        .padding(horizontal = 22.dp, vertical = 11.dp)
                                ) {
                                    Icon(
                                        imageVector = Icons.Default.PlayArrow,
                                        contentDescription = "Play All",
                                        tint = if (isFocused) Color.Black else Color.White,
                                        modifier = Modifier.size(18.dp)
                                    )
                                    Text(
                                        text = "Play All (${playlistTracks.size})",
                                        color = if (isFocused) Color.Black else Color.White,
                                        fontWeight = FontWeight.Black,
                                        fontSize = 12.sp,
                                        softWrap = false
                                    )
                                }
                            }
                        }

                        Text(
                            text = "${playlistTracks.size} Tracks • 320k Lossless FLAC",
                            color = Color(0xFF34D399),
                            fontSize = 12.sp,
                            fontWeight = FontWeight.Bold,
                            softWrap = false
                        )
                    }
                }
            }
        }

        // Track List Rows
        item {
            Text(
                text = "Tracks in this Playlist",
                color = Color.White,
                fontSize = 18.sp,
                fontWeight = FontWeight.Bold,
                softWrap = false
            )
        }

        items(playlistTracks) { song ->
            val idx = playlistTracks.indexOf(song) + 1
            TvFocusableItem(
                onClick = { onSongClick(song, playlistTracks) },
                shape = RoundedCornerShape(10.dp),
                focusedScale = 1.02f
            ) { isFocused ->
                Row(
                    modifier = Modifier
                        .fillMaxWidth()
                        .background(if (isFocused) Color(0xFF262638) else Color(0xFF13131B))
                        .padding(horizontal = 16.dp, vertical = 10.dp),
                    verticalAlignment = Alignment.CenterVertically,
                    horizontalArrangement = Arrangement.spacedBy(14.dp)
                ) {
                    Text(
                        text = "$idx",
                        color = if (isFocused) MelodyPrimary else MelodyTextSecondary,
                        fontSize = 13.sp,
                        fontWeight = FontWeight.Bold,
                        modifier = Modifier.width(28.dp)
                    )

                    AsyncImage(
                        model = song.getFullCoverUrl(),
                        contentDescription = song.title,
                        modifier = Modifier
                            .size(44.dp)
                            .clip(RoundedCornerShape(8.dp)),
                        contentScale = ContentScale.Crop
                    )

                    Column(modifier = Modifier.weight(1f)) {
                        Text(
                            text = song.title,
                            color = Color.White,
                            fontSize = 14.sp,
                            fontWeight = FontWeight.Bold,
                            lineHeight = 18.sp,
                            maxLines = 1,
                            softWrap = false,
                            overflow = TextOverflow.Ellipsis
                        )
                        Text(
                            text = song.artist,
                            color = if (isFocused) Color(0xFFD8B4FE) else MelodyTextSecondary,
                            fontSize = 12.sp,
                            lineHeight = 16.sp,
                            maxLines = 1,
                            softWrap = false,
                            overflow = TextOverflow.Ellipsis
                        )
                    }

                    Box(
                        modifier = Modifier
                            .background(Color(0x3310B981), RoundedCornerShape(4.dp))
                            .padding(horizontal = 6.dp, vertical = 2.dp)
                    ) {
                        Text(
                            text = "320K",
                            color = Color(0xFF34D399),
                            fontSize = 10.sp,
                            fontWeight = FontWeight.Bold,
                            softWrap = false
                        )
                    }
                }
            }
        }

        item {
            Spacer(modifier = Modifier.height(80.dp))
        }
    }
}

@Composable
fun TvShelfSection(
    title: String,
    subtitle: String,
    content: @Composable () -> Unit
) {
    Column(modifier = Modifier.fillMaxWidth()) {
        Text(
            text = title,
            color = Color.White,
            fontSize = 18.sp,
            fontWeight = FontWeight.Black,
            letterSpacing = (-0.3).sp,
            softWrap = false
        )
        Text(
            text = subtitle,
            color = MelodyTextSecondary,
            fontSize = 12.sp,
            fontWeight = FontWeight.Medium,
            softWrap = false
        )
        Spacer(modifier = Modifier.height(14.dp))
        content()
    }
}

@Composable
fun TvNavRailItem(
    icon: ImageVector,
    label: String,
    isSelected: Boolean,
    onClick: () -> Unit
) {
    var isFocused by remember { mutableStateOf(false) }
    val scale by animateFloatAsState(if (isFocused) 1.05f else 1.0f, label = "nav_scale")
    val interactionSource = remember { MutableInteractionSource() }

    val bgColor by animateColorAsState(
        targetValue = when {
            isFocused -> Color(0xFF282838)
            isSelected -> Color(0x33A855F7)
            else -> Color.Transparent
        },
        label = "nav_bg"
    )

    Row(
        verticalAlignment = Alignment.CenterVertically,
        horizontalArrangement = Arrangement.spacedBy(12.dp),
        modifier = Modifier
            .fillMaxWidth()
            .scale(scale)
            .clip(RoundedCornerShape(10.dp))
            .background(bgColor)
            .border(
                BorderStroke(if (isFocused) 2.dp else 0.dp, if (isFocused) Color.White else Color.Transparent),
                RoundedCornerShape(10.dp)
            )
            .onFocusChanged { isFocused = it.isFocused }
            .focusable(interactionSource = interactionSource)
            .onKeyEvent { keyEvent ->
                if (keyEvent.type == KeyEventType.KeyUp &&
                    (keyEvent.key == Key.DirectionCenter || keyEvent.key == Key.Enter || keyEvent.key == Key.NumPadEnter)) {
                    onClick()
                    true
                } else false
            }
            .clickable(interactionSource = interactionSource, indication = null) { onClick() }
            .padding(horizontal = 14.dp, vertical = 10.dp)
    ) {
        Icon(
            imageVector = icon,
            contentDescription = label,
            tint = if (isSelected || isFocused) Color.White else MelodyTextSecondary,
            modifier = Modifier.size(20.dp)
        )
        Text(
            text = label,
            color = if (isSelected || isFocused) Color.White else MelodyTextSecondary,
            fontSize = 13.sp,
            fontWeight = if (isSelected || isFocused) FontWeight.Bold else FontWeight.Medium,
            softWrap = false
        )
    }
    Spacer(modifier = Modifier.height(4.dp))
}

@Composable
fun TvSearchView(
    songs: List<Song>,
    searchQuery: String,
    onQueryChange: (String) -> Unit,
    onSongClick: (Song, List<Song>) -> Unit
) {
    val quickFilters = listOf("All", "Brazil Phonk", "The Weeknd", "Sidhu Moose Wala", "Honey Singh", "Slowed", "Motivation")
    var selectedFilter by remember { mutableStateOf("All") }

    val filtered = remember(songs, searchQuery, selectedFilter) {
        songs.filter { song ->
            val matchQuery = searchQuery.isBlank() ||
                song.title.contains(searchQuery, ignoreCase = true) ||
                song.artist.contains(searchQuery, ignoreCase = true) ||
                (song.album?.contains(searchQuery, ignoreCase = true) == true)

            val matchFilter = when (selectedFilter) {
                "Brazil Phonk" -> song.album?.contains("phonk", true) == true || song.album?.contains("brazil", true) == true || song.title.contains("montagem", true)
                "The Weeknd" -> song.artist.contains("weeknd", true)
                "Sidhu Moose Wala" -> song.artist.contains("moose wala", true)
                "Honey Singh" -> song.artist.contains("honey singh", true)
                "Slowed" -> song.title.contains("slowed", true) || song.album?.contains("slowed", true) == true
                "Motivation" -> song.album?.contains("motivation", true) == true
                else -> true
            }

            matchQuery && matchFilter
        }
    }

    Column(
        modifier = Modifier.fillMaxSize(),
        verticalArrangement = Arrangement.spacedBy(16.dp)
    ) {
        Text(
            text = "Search Melody TV",
            color = Color.White,
            fontSize = 26.sp,
            fontWeight = FontWeight.Black,
            softWrap = false
        )

        // Remote-Focusable Search Text Field
        OutlinedTextField(
            value = searchQuery,
            onValueChange = onQueryChange,
            placeholder = { Text("Search 825+ songs, artists, playlists...", color = MelodyTextSecondary, fontSize = 14.sp) },
            singleLine = true,
            leadingIcon = {
                Icon(
                    imageVector = Icons.Default.Search,
                    contentDescription = "Search",
                    tint = MelodyPrimary,
                    modifier = Modifier.size(20.dp)
                )
            },
            trailingIcon = {
                if (searchQuery.isNotEmpty()) {
                    IconButton(onClick = { onQueryChange("") }) {
                        Icon(
                            imageVector = Icons.Default.Clear,
                            contentDescription = "Clear",
                            tint = Color.White,
                            modifier = Modifier.size(18.dp)
                        )
                    }
                }
            },
            colors = OutlinedTextFieldDefaults.colors(
                focusedTextColor = Color.White,
                unfocusedTextColor = Color.White,
                focusedBorderColor = MelodyPrimary,
                unfocusedBorderColor = Color.White.copy(alpha = 0.2f),
                focusedContainerColor = Color(0xFF14141C),
                unfocusedContainerColor = Color(0xFF14141C)
            ),
            modifier = Modifier
                .fillMaxWidth(0.85f)
                .padding(vertical = 4.dp)
        )

        // Quick Category Filter Pills
        LazyRow(horizontalArrangement = Arrangement.spacedBy(10.dp)) {
            items(quickFilters) { filter ->
                val isSelected = selectedFilter == filter
                TvFocusableItem(
                    onClick = { selectedFilter = filter },
                    shape = RoundedCornerShape(20.dp),
                    focusedScale = 1.08f
                ) { isFocused ->
                    Box(
                        modifier = Modifier
                            .background(
                                when {
                                    isFocused -> Color.White
                                    isSelected -> MelodyPrimary
                                    else -> Color.White.copy(alpha = 0.08f)
                                },
                                RoundedCornerShape(20.dp)
                            )
                            .padding(horizontal = 16.dp, vertical = 8.dp)
                    ) {
                        Text(
                            text = filter,
                            color = if (isFocused) Color.Black else Color.White,
                            fontSize = 12.sp,
                            fontWeight = FontWeight.Bold,
                            softWrap = false
                        )
                    }
                }
            }
        }

        Spacer(modifier = Modifier.height(6.dp))

        // Results Shelf
        TvShelfSection(
            title = "Search Results (${filtered.size})",
            subtitle = "Direct playback from studio lossless catalog"
        ) {
            LazyRow(horizontalArrangement = Arrangement.spacedBy(16.dp)) {
                items(filtered) { song ->
                    TvSongCard(
                        song = song,
                        onClick = { onSongClick(song, filtered) }
                    )
                }
            }
        }
    }
}

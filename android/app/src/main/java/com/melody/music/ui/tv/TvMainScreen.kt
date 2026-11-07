package com.melody.music.ui.tv

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
    modifier: Modifier = Modifier
) {
    var selectedTab by remember { mutableStateOf(0) }
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
                    .width(220.dp)
                    .fillMaxHeight()
                    .background(Color(0xFF101017))
                    .border(BorderStroke(1.dp, Color.White.copy(alpha = 0.05f)))
                    .padding(vertical = 20.dp, horizontal = 12.dp),
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

                    // Nav Menu Items
                    TvNavRailItem(
                        icon = Icons.Default.Home,
                        label = "Home",
                        isSelected = selectedTab == 0,
                        onClick = { selectedTab = 0 }
                    )

                    TvNavRailItem(
                        icon = Icons.Default.Search,
                        label = "Search",
                        isSelected = selectedTab == 1,
                        onClick = { selectedTab = 1 }
                    )

                    TvNavRailItem(
                        icon = Icons.Default.QueueMusic,
                        label = "Playlists",
                        isSelected = selectedTab == 2,
                        onClick = { selectedTab = 2 }
                    )

                    TvNavRailItem(
                        icon = Icons.Default.LibraryMusic,
                        label = "Your Library",
                        isSelected = selectedTab == 3,
                        onClick = { selectedTab = 3 }
                    )

                    TvNavRailItem(
                        icon = if (ApiClient.isActivated) Icons.Default.Person else Icons.Default.Key,
                        label = if (ApiClient.isActivated) "VIP Account" else "Activate VIP",
                        isSelected = selectedTab == 4,
                        onClick = { selectedTab = 4 }
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
                                        overflow = TextOverflow.Ellipsis
                                    )
                                    Text(
                                        text = currentSong!!.artist,
                                        color = MelodyTextSecondary,
                                        fontSize = 9.sp,
                                        maxLines = 1,
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
                    .padding(horizontal = 32.dp, vertical = 20.dp)
            ) {
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
                                            onSongClick(phonkSongs[0], phonkSongs)
                                        }
                                    }
                                )
                            }

                            // Shelf 1: Brazil Phonk & Montagem
                            if (phonkSongs.isNotEmpty()) {
                                item {
                                    TvShelfSection(
                                        title = "🇧🇷 Brazil Phonk & Montagem",
                                        subtitle = "Heavy 808s, Brazilian drift funk, and TikTok bass anthems"
                                    ) {
                                        LazyRow(horizontalArrangement = Arrangement.spacedBy(16.dp)) {
                                            items(phonkSongs) { song ->
                                                TvSongCard(
                                                    song = song,
                                                    onClick = { onSongClick(song, phonkSongs) }
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
                                                    val plTracks = getPlaylistSongsFallback(pl, songs)
                                                    if (plTracks.isNotEmpty()) {
                                                        onSongClick(plTracks[0], plTracks)
                                                    }
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
                                                    onClick = { onSongClick(song, trendingSongs) }
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
                                                        onSongClick(artistSongs[0], artistSongs)
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
                                                    onClick = { onSongClick(song, slowedSongs) }
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
                                                    onClick = { onSongClick(song, motivationSongs) }
                                                )
                                            }
                                        }
                                    }
                                }
                            }

                            item {
                                Spacer(modifier = Modifier.height(40.dp))
                            }
                        }
                    }

                    1 -> {
                        // SEARCH VIEW
                        TvSearchView(
                            songs = songs,
                            searchQuery = searchQuery,
                            onQueryChange = { searchQuery = it },
                            onSongClick = onSongClick
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
                                    text = "All Playlists",
                                    color = Color.White,
                                    fontSize = 24.sp,
                                    fontWeight = FontWeight.Black
                                )
                            }
                            item {
                                LazyRow(horizontalArrangement = Arrangement.spacedBy(18.dp)) {
                                    items(PUBLIC_PLAYLISTS) { pl ->
                                        TvPlaylistCard(
                                            playlist = pl,
                                            onClick = {
                                                val plTracks = getPlaylistSongsFallback(pl, songs)
                                                if (plTracks.isNotEmpty()) {
                                                    onSongClick(plTracks[0], plTracks)
                                                }
                                            }
                                        )
                                    }
                                }
                            }
                        }
                    }

                    3 -> {
                        // LIBRARY VIEW
                        val likedSongs = remember(songs, MelodyPlayerManager.likedSongIds) {
                            val ids = MelodyPlayerManager.likedSongIds.value
                            songs.filter { ids.contains(it.id) }
                        }

                        LazyColumn(
                            verticalArrangement = Arrangement.spacedBy(20.dp),
                            modifier = Modifier.fillMaxSize()
                        ) {
                            item {
                                Text(
                                    text = "Your Library",
                                    color = Color.White,
                                    fontSize = 24.sp,
                                    fontWeight = FontWeight.Black
                                )
                            }

                            if (likedSongs.isNotEmpty()) {
                                item {
                                    TvShelfSection(
                                        title = "❤️ Liked Songs (${likedSongs.size})",
                                        subtitle = "Your favorite music ready to play"
                                    ) {
                                        LazyRow(horizontalArrangement = Arrangement.spacedBy(16.dp)) {
                                            items(likedSongs) { song ->
                                                TvSongCard(
                                                    song = song,
                                                    onClick = { onSongClick(song, likedSongs) }
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
                                            .height(200.dp)
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
                                .padding(32.dp)
                        ) {
                            Column(verticalArrangement = Arrangement.spacedBy(16.dp)) {
                                Text(
                                    text = "Melody VIP TV Edition",
                                    color = Color.White,
                                    fontSize = 24.sp,
                                    fontWeight = FontWeight.Black
                                )
                                Text(
                                    text = "Studio 320kbps lossless streaming is active across all TV devices.",
                                    color = Color(0xFFD8B4FE),
                                    fontSize = 14.sp
                                )
                                Text(
                                    text = "Unlimited offline downloads, zero advertisements, and multi-device cloud synchronization enabled.",
                                    color = MelodyTextSecondary,
                                    fontSize = 12.sp
                                )
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
            letterSpacing = (-0.3).sp
        )
        Text(
            text = subtitle,
            color = MelodyTextSecondary,
            fontSize = 12.sp,
            fontWeight = FontWeight.Medium
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
            fontWeight = if (isSelected || isFocused) FontWeight.Bold else FontWeight.Medium
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
            fontSize = 24.sp,
            fontWeight = FontWeight.Black
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
                            fontWeight = FontWeight.Bold
                        )
                    }
                }
            }
        }

        Spacer(modifier = Modifier.height(10.dp))

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

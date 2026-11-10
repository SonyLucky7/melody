package com.melody.music.ui.screens

import androidx.activity.compose.BackHandler
import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
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
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import coil.compose.AsyncImage
import com.melody.music.data.api.ApiClient
import com.melody.music.data.download.DownloadedSong
import com.melody.music.data.download.MelodyDownloadManager
import com.melody.music.data.model.Playlist
import com.melody.music.data.model.PUBLIC_PLAYLISTS
import com.melody.music.data.model.getPlaylistSongsFallback
import com.melody.music.data.model.Song
import com.melody.music.player.MelodyPlayerManager
import com.melody.music.ui.theme.*
import kotlinx.coroutines.launch

@Composable
fun LibraryScreen(
    songs: List<Song>,
    onSongClick: (Song, List<Song>) -> Unit,
    onArtistClick: (String) -> Unit,
    modifier: Modifier = Modifier
) {
    var selectedFilter by remember { mutableStateOf("All") }
    val filters = listOf("All", "Playlists", "Artists", "Downloaded")

    val likedSongIds by MelodyPlayerManager.likedSongIds.collectAsState()
    val downloadedSongs by MelodyDownloadManager.downloadedSongs.collectAsState()

    val likedSongs = remember(likedSongIds, songs) {
        songs.filter { likedSongIds.contains(it.id) }
    }

    var activeSubView by remember { mutableStateOf<String?>(null) } // "LIKED" or "DOWNLOADED"
    var selectedPlaylist by remember { mutableStateOf<Playlist?>(null) }
    var playlists by remember { mutableStateOf<List<Playlist>>(PUBLIC_PLAYLISTS) }
    var showCreateDialog by remember { mutableStateOf(false) }
    var newPlaylistName by remember { mutableStateOf("") }
    val coroutineScope = rememberCoroutineScope()

    fun refreshPlaylists() {
        coroutineScope.launch {
            try {
                val res = ApiClient.apiService.getPlaylists()
                if (res.success && res.data.isNotEmpty()) {
                    val map = LinkedHashMap<Long, Playlist>()
                    PUBLIC_PLAYLISTS.forEach { map[it.id] = it }
                    res.data.forEach {
                        val existing = map[it.id]
                        map[it.id] = it.copy(coverUrl = it.coverUrl ?: existing?.coverUrl)
                    }
                    playlists = map.values.toList()
                }
            } catch (e: Exception) {
                e.printStackTrace()
            }
        }
    }

    LaunchedEffect(Unit) {
        refreshPlaylists()
    }

    BackHandler(enabled = activeSubView != null || selectedPlaylist != null || showCreateDialog) {
        if (showCreateDialog) {
            showCreateDialog = false
            newPlaylistName = ""
        } else if (activeSubView != null) {
            activeSubView = null
        } else if (selectedPlaylist != null) {
            selectedPlaylist = null
            refreshPlaylists()
        }
    }

    if (activeSubView == "LIKED") {
        LikedSongsScreen(
            likedSongs = likedSongs,
            onBack = { activeSubView = null },
            onSongClick = { song -> onSongClick(song, likedSongs) }
        )
        return
    }

    if (activeSubView == "DOWNLOADED") {
        DownloadedSongsScreen(
            downloaded = downloadedSongs,
            onBack = { activeSubView = null },
            onSongClick = { song -> onSongClick(song, downloadedSongs.map { it.toSong() }) }
        )
        return
    }

    if (selectedPlaylist != null) {
        CustomPlaylistScreen(
            playlist = selectedPlaylist!!,
            allSongs = songs,
            onBack = {
                selectedPlaylist = null
                refreshPlaylists()
            },
            onSongClick = { song, playlistSongs -> onSongClick(song, playlistSongs) },
            onPlaylistDeleted = {
                selectedPlaylist = null
                refreshPlaylists()
            }
        )
        return
    }

    if (showCreateDialog) {
        AlertDialog(
            onDismissRequest = {
                showCreateDialog = false
                newPlaylistName = ""
            },
            title = {
                Text(
                    text = "New Playlist",
                    fontWeight = FontWeight.Bold,
                    color = Color.White
                )
            },
            text = {
                Column {
                    Text(
                        text = "Give your playlist a name to sync to your cloud library.",
                        fontSize = 13.sp,
                        color = MelodyTextSecondary,
                        modifier = Modifier.padding(bottom = 12.dp)
                    )
                    OutlinedTextField(
                        value = newPlaylistName,
                        onValueChange = { newPlaylistName = it },
                        placeholder = { Text("My Playlist #1", color = MelodyTextMuted) },
                        singleLine = true,
                        colors = OutlinedTextFieldDefaults.colors(
                            focusedBorderColor = MelodyPrimary,
                            unfocusedBorderColor = MelodyBorder,
                            focusedTextColor = Color.White,
                            unfocusedTextColor = Color.White
                        ),
                        modifier = Modifier.fillMaxWidth()
                    )
                }
            },
            containerColor = MelodyCard,
            confirmButton = {
                Button(
                    onClick = {
                        val name = newPlaylistName.trim()
                        if (name.isNotEmpty()) {
                            coroutineScope.launch {
                                try {
                                    val res = ApiClient.apiService.createPlaylist(mapOf("name" to name))
                                    if (res.isSuccessful) {
                                        refreshPlaylists()
                                    }
                                } catch (e: Exception) {
                                    e.printStackTrace()
                                }
                            }
                            showCreateDialog = false
                            newPlaylistName = ""
                        }
                    },
                    colors = ButtonDefaults.buttonColors(containerColor = MelodyPrimary),
                    enabled = newPlaylistName.trim().isNotEmpty()
                ) {
                    Text("Create", fontWeight = FontWeight.Bold)
                }
            },
            dismissButton = {
                TextButton(onClick = {
                    showCreateDialog = false
                    newPlaylistName = ""
                }) {
                    Text("Cancel", color = MelodyTextSecondary)
                }
            }
        )
    }

    LazyColumn(
        modifier = modifier
            .fillMaxSize()
            .background(MelodyBg)
            .statusBarsPadding()
            .padding(horizontal = 16.dp)
    ) {
        // Top Header
        item {
            Spacer(modifier = Modifier.height(16.dp))
            Row(
                modifier = Modifier.fillMaxWidth(),
                verticalAlignment = Alignment.CenterVertically,
                horizontalArrangement = Arrangement.SpaceBetween
            ) {
                Row(
                    verticalAlignment = Alignment.CenterVertically,
                    horizontalArrangement = Arrangement.spacedBy(12.dp)
                ) {
                    Box(
                        modifier = Modifier
                            .size(36.dp)
                            .clip(CircleShape)
                            .background(MelodyPrimary),
                        contentAlignment = Alignment.Center
                    ) {
                        Text(
                            text = "M",
                            color = Color.White,
                            fontWeight = FontWeight.Bold,
                            fontSize = 16.sp
                        )
                    }
                    Text(
                        text = "Your Library",
                        fontSize = 24.sp,
                        fontWeight = FontWeight.Bold,
                        color = Color.White
                    )
                }

                Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                    IconButton(onClick = { showCreateDialog = true }) {
                        Icon(Icons.Default.Add, "New playlist", tint = Color.White)
                    }
                }
            }

            Spacer(modifier = Modifier.height(16.dp))
        }

        // Filter Chips
        item {
            LazyRow(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                items(filters) { filter ->
                    val isSelected = selectedFilter == filter
                    FilterChip(
                        selected = isSelected,
                        onClick = { selectedFilter = filter },
                        label = { Text(filter, fontSize = 12.sp, fontWeight = FontWeight.SemiBold) },
                        colors = FilterChipDefaults.filterChipColors(
                            selectedContainerColor = MelodyPrimary,
                            selectedLabelColor = Color.White,
                            containerColor = MelodyCard,
                            labelColor = MelodyTextSecondary
                        )
                    )
                }
            }
            Spacer(modifier = Modifier.height(20.dp))
        }

        // Section: Liked Songs Card
        if (selectedFilter == "All" || selectedFilter == "Playlists") {
            item {
                Row(
                    modifier = Modifier
                        .fillMaxWidth()
                        .clip(RoundedCornerShape(8.dp))
                        .clickable { activeSubView = "LIKED" }
                        .padding(vertical = 8.dp),
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Box(
                        modifier = Modifier
                            .size(64.dp)
                            .clip(RoundedCornerShape(6.dp))
                            .background(
                                Brush.linearGradient(
                                    listOf(Color(0xFF8B5CF6), Color(0xFFD946EF))
                                )
                            ),
                        contentAlignment = Alignment.Center
                    ) {
                        Icon(
                            Icons.Default.Favorite,
                            contentDescription = "Liked",
                            tint = Color.White,
                            modifier = Modifier.size(32.dp)
                        )
                    }

                    Spacer(modifier = Modifier.width(16.dp))

                    Column(modifier = Modifier.weight(1f)) {
                        Text(
                            text = "Liked Songs",
                            fontSize = 16.sp,
                            fontWeight = FontWeight.Bold,
                            color = Color.White
                        )
                        Row(
                            verticalAlignment = Alignment.CenterVertically,
                            horizontalArrangement = Arrangement.spacedBy(4.dp)
                        ) {
                            Icon(
                                Icons.Default.PushPin,
                                contentDescription = "Pinned",
                                tint = MelodyPrimary,
                                modifier = Modifier.size(12.dp)
                            )
                            Text(
                                text = "Playlist • ${likedSongs.size} songs",
                                fontSize = 13.sp,
                                color = MelodyTextSecondary
                            )
                        }
                    }
                }
            }

            // User's Cloud Playlists
            items(playlists) { pl ->
                Row(
                    modifier = Modifier
                        .fillMaxWidth()
                        .clip(RoundedCornerShape(8.dp))
                        .clickable { selectedPlaylist = pl }
                        .padding(vertical = 8.dp),
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Box(
                        modifier = Modifier
                            .size(64.dp)
                            .clip(RoundedCornerShape(6.dp))
                            .background(
                                Brush.linearGradient(
                                    listOf(Color(0xFF0D9488), Color(0xFF14B8A6))
                                )
                            ),
                        contentAlignment = Alignment.Center
                    ) {
                        Icon(
                            Icons.Default.QueueMusic,
                            contentDescription = "Playlist",
                            tint = Color.White,
                            modifier = Modifier.size(32.dp)
                        )
                    }

                    Spacer(modifier = Modifier.width(16.dp))

                    Column(modifier = Modifier.weight(1f)) {
                        Text(
                            text = pl.name,
                            fontSize = 16.sp,
                            fontWeight = FontWeight.Bold,
                            color = Color.White,
                            maxLines = 1,
                            overflow = TextOverflow.Ellipsis
                        )
                        Text(
                            text = "Playlist • ${pl.totalSongs ?: 0} songs",
                            fontSize = 13.sp,
                            color = MelodyTextSecondary
                        )
                    }
                }
            }

            // Public Curated Playlists (Spotify-grade)
            items(com.melody.music.data.model.PUBLIC_PLAYLISTS) { pl ->
                Row(
                    modifier = Modifier
                        .fillMaxWidth()
                        .clip(RoundedCornerShape(8.dp))
                        .clickable { selectedPlaylist = pl }
                        .padding(vertical = 8.dp),
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    AsyncImage(
                        model = pl.coverUrl ?: "https://melody-chi-nine.vercel.app/Melody-Logo-512.png",
                        contentDescription = pl.name,
                        modifier = Modifier
                            .size(64.dp)
                            .clip(RoundedCornerShape(6.dp)),
                        contentScale = ContentScale.Crop
                    )

                    Spacer(modifier = Modifier.width(16.dp))

                    Column(modifier = Modifier.weight(1f)) {
                        Text(
                            text = pl.name,
                            fontSize = 16.sp,
                            fontWeight = FontWeight.Bold,
                            color = Color.White,
                            maxLines = 1,
                            overflow = TextOverflow.Ellipsis
                        )
                        Text(
                            text = pl.description ?: "Curated Playlist • ${pl.totalSongs ?: 0} tracks",
                            fontSize = 12.sp,
                            color = MelodyTextSecondary,
                            maxLines = 1,
                            overflow = TextOverflow.Ellipsis
                        )
                    }
                }
            }
        }

        // Section: Downloaded Songs Card
        if (selectedFilter == "All" || selectedFilter == "Downloaded") {
            item {
                Row(
                    modifier = Modifier
                        .fillMaxWidth()
                        .clip(RoundedCornerShape(8.dp))
                        .clickable { activeSubView = "DOWNLOADED" }
                        .padding(vertical = 8.dp),
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Box(
                        modifier = Modifier
                            .size(64.dp)
                            .clip(RoundedCornerShape(6.dp))
                            .background(Color(0xFF1E293B)),
                        contentAlignment = Alignment.Center
                    ) {
                        Icon(
                            Icons.Default.DownloadDone,
                            contentDescription = "Downloaded",
                            tint = MelodyOffline,
                            modifier = Modifier.size(32.dp)
                        )
                    }

                    Spacer(modifier = Modifier.width(16.dp))

                    Column(modifier = Modifier.weight(1f)) {
                        Text(
                            text = "Downloaded Music",
                            fontSize = 16.sp,
                            fontWeight = FontWeight.Bold,
                            color = Color.White
                        )
                        Text(
                            text = "Auto-downloaded • ${downloadedSongs.size} songs locally",
                            fontSize = 13.sp,
                            color = MelodyTextSecondary
                        )
                    }
                }
            }
        }

        // Section: Artists
        if (selectedFilter == "All" || selectedFilter == "Artists") {
            item {
                Spacer(modifier = Modifier.height(12.dp))
                Text(
                    text = "Artists",
                    fontSize = 18.sp,
                    fontWeight = FontWeight.Bold,
                    color = Color.White,
                    modifier = Modifier.padding(bottom = 8.dp)
                )
            }

            val allFeaturedArtists = listOf(
                "Sidhu Moose Wala",
                "Yo Yo Honey Singh",
                "The Weeknd",
                "Lana Del Rey",
                "Ariana Grande",
                "2Pac",
                "50 Cent"
            )
            items(allFeaturedArtists) { artistName ->
                val profile = ARTIST_PROFILES[artistName]
                Row(
                    modifier = Modifier
                        .fillMaxWidth()
                        .clip(RoundedCornerShape(8.dp))
                        .clickable { onArtistClick(artistName) }
                        .padding(vertical = 8.dp),
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    AsyncImage(
                        model = profile?.imageUrl ?: "https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=200",
                        contentDescription = artistName,
                        modifier = Modifier
                            .size(64.dp)
                            .clip(CircleShape),
                        contentScale = ContentScale.Crop
                    )

                    Spacer(modifier = Modifier.width(16.dp))

                    Column(modifier = Modifier.weight(1f)) {
                        Text(
                            text = artistName,
                            fontSize = 16.sp,
                            fontWeight = FontWeight.Bold,
                            color = Color.White
                        )
                        Text(
                            text = "Artist",
                            fontSize = 13.sp,
                            color = MelodyTextSecondary
                        )
                    }
                }
            }
        }

        item {
            Spacer(modifier = Modifier.height(100.dp))
        }
    }
}

@Composable
fun CustomPlaylistScreen(
    playlist: Playlist,
    allSongs: List<Song> = emptyList(),
    onBack: () -> Unit,
    onSongClick: (Song, List<Song>) -> Unit,
    onPlaylistDeleted: () -> Unit
) {
    BackHandler {
        onBack()
    }
    val fallbackSongs = remember(playlist, allSongs) {
        getPlaylistSongsFallback(playlist, allSongs)
    }
    var songs by remember { mutableStateOf(fallbackSongs) }
    var isLoading by remember { mutableStateOf(fallbackSongs.isEmpty()) }
    var showDeleteConfirm by remember { mutableStateOf(false) }
    val coroutineScope = rememberCoroutineScope()

    LaunchedEffect(fallbackSongs) {
        if (songs.isEmpty() && fallbackSongs.isNotEmpty()) {
            songs = fallbackSongs
            isLoading = false
        }
    }

    LaunchedEffect(allSongs) {
        val recomputed = getPlaylistSongsFallback(playlist, allSongs)
        if (recomputed.isNotEmpty() && (songs.isEmpty() || songs.size < recomputed.size)) {
            songs = recomputed
            isLoading = false
        }
    }

    fun loadSongs() {
        coroutineScope.launch {
            if (songs.isEmpty()) isLoading = true
            try {
                val res = ApiClient.apiService.getPlaylistSongs(playlist.id)
                val combined = linkedMapOf<Long, Song>()
                if (res.success && res.songs.isNotEmpty()) {
                    res.songs.forEach { combined[it.id] = it }
                }
                fallbackSongs.forEach {
                    if (!combined.containsKey(it.id)) {
                        combined[it.id] = it
                    }
                }
                if (combined.isNotEmpty()) {
                    songs = combined.values.toList()
                }
            } catch (e: Exception) {
                if (songs.isEmpty() && fallbackSongs.isNotEmpty()) {
                    songs = fallbackSongs
                }
            } finally {
                isLoading = false
            }
        }
    }

    LaunchedEffect(playlist.id) {
        loadSongs()
    }

    if (showDeleteConfirm) {
        AlertDialog(
            onDismissRequest = { showDeleteConfirm = false },
            title = { Text("Delete Playlist", color = Color.White, fontWeight = FontWeight.Bold) },
            text = { Text("Are you sure you want to delete '${playlist.name}'? This cannot be undone.", color = MelodyTextSecondary) },
            containerColor = MelodyCard,
            confirmButton = {
                TextButton(
                    onClick = {
                        showDeleteConfirm = false
                        coroutineScope.launch {
                            try {
                                ApiClient.apiService.deletePlaylist(playlist.id)
                                onPlaylistDeleted()
                            } catch (e: Exception) {
                                e.printStackTrace()
                            }
                        }
                    }
                ) {
                    Text("Delete", color = Color(0xFFEF4444), fontWeight = FontWeight.Bold)
                }
            },
            dismissButton = {
                TextButton(onClick = { showDeleteConfirm = false }) {
                    Text("Cancel", color = MelodyTextSecondary)
                }
            }
        )
    }

    LazyColumn(
        modifier = Modifier
            .fillMaxSize()
            .background(MelodyBg)
    ) {
        item {
            Box(
                modifier = Modifier
                    .fillMaxWidth()
                    .height(260.dp)
                    .background(
                        Brush.verticalGradient(
                            listOf(Color(0xFF4A148C), Color(0xFF1E0A3C), MelodyBg)
                        )
                    )
                    .statusBarsPadding()
                    .padding(16.dp)
            ) {
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.SpaceBetween,
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    IconButton(
                        onClick = onBack,
                        modifier = Modifier
                            .size(36.dp)
                            .background(Color(0x66000000), CircleShape)
                    ) {
                        Icon(Icons.Default.ArrowBack, contentDescription = "Back", tint = Color.White)
                    }

                    if (playlist.id > 11L) {
                        IconButton(
                            onClick = { showDeleteConfirm = true },
                            modifier = Modifier
                                .size(36.dp)
                                .background(Color(0x66000000), CircleShape)
                        ) {
                            Icon(Icons.Default.Delete, contentDescription = "Delete Playlist", tint = Color.White)
                        }
                    }
                }

                Row(
                    modifier = Modifier
                        .align(Alignment.BottomStart)
                        .padding(bottom = 8.dp),
                    verticalAlignment = Alignment.Bottom,
                    horizontalArrangement = Arrangement.spacedBy(16.dp)
                ) {
                    AsyncImage(
                        model = playlist.coverUrl ?: "https://melody-chi-nine.vercel.app/Melody-Logo-512.png",
                        contentDescription = playlist.name,
                        modifier = Modifier
                            .size(110.dp)
                            .clip(RoundedCornerShape(8.dp)),
                        contentScale = ContentScale.Crop
                    )

                    Column {
                        Text(
                            text = if (playlist.id <= 11L) "CURATED PLAYLIST" else "PLAYLIST",
                            fontSize = 11.sp,
                            fontWeight = FontWeight.ExtraBold,
                            color = MelodyPrimary
                        )
                        Text(
                            text = playlist.name,
                            fontSize = 24.sp,
                            fontWeight = FontWeight.Black,
                            color = Color.White,
                            maxLines = 2,
                            overflow = TextOverflow.Ellipsis
                        )
                        Text(
                            text = "${songs.size} songs • 320k Studio Free",
                            fontSize = 12.sp,
                            color = MelodyTextSecondary
                        )
                    }
                }
            }
        }

        item {
            Row(
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(horizontal = 16.dp, vertical = 12.dp),
                horizontalArrangement = Arrangement.End
            ) {
                if (songs.isNotEmpty()) {
                    FloatingActionButton(
                        onClick = { onSongClick(songs.first(), songs) },
                        containerColor = MelodyPrimary,
                        contentColor = Color.White,
                        shape = CircleShape,
                        modifier = Modifier.size(56.dp)
                    ) {
                        Icon(Icons.Default.PlayArrow, contentDescription = "Play All", modifier = Modifier.size(32.dp))
                    }
                }
            }
        }

        if (isLoading) {
            item {
                Box(
                    modifier = Modifier
                        .fillMaxWidth()
                        .padding(top = 40.dp),
                    contentAlignment = Alignment.Center
                ) {
                    CircularProgressIndicator(color = MelodyPrimary)
                }
            }
        } else if (songs.isEmpty()) {
            item {
                Box(
                    modifier = Modifier
                        .fillMaxWidth()
                        .padding(top = 40.dp),
                    contentAlignment = Alignment.Center
                ) {
                    Column(horizontalAlignment = Alignment.CenterHorizontally) {
                        Icon(
                            Icons.Default.MusicNote,
                            contentDescription = "Empty",
                            tint = MelodyTextMuted,
                            modifier = Modifier.size(48.dp)
                        )
                        Spacer(modifier = Modifier.height(12.dp))
                        Text("Playlist is empty", color = Color.White, fontSize = 16.sp, fontWeight = FontWeight.Bold)
                        Text("Add songs from anywhere in Melody", color = MelodyTextSecondary, fontSize = 13.sp)
                    }
                }
            }
        } else {
            items(songs) { song ->
                SongListItem(
                    song = song,
                    onClick = { onSongClick(song, songs) },
                    trailingContent = {
                        IconButton(onClick = {
                            coroutineScope.launch {
                                try {
                                    ApiClient.apiService.removeSongFromPlaylist(playlist.id, song.id)
                                    loadSongs()
                                } catch (e: Exception) {
                                    e.printStackTrace()
                                }
                            }
                        }) {
                            Icon(Icons.Default.Close, contentDescription = "Remove", tint = MelodyTextSecondary)
                        }
                    }
                )
                Spacer(modifier = Modifier.height(6.dp))
            }
        }

        item {
            Spacer(modifier = Modifier.height(100.dp))
        }
    }
}

@Composable
fun LikedSongsScreen(
    likedSongs: List<Song>,
    onBack: () -> Unit,
    onSongClick: (Song) -> Unit
) {
    BackHandler {
        onBack()
    }
    LazyColumn(
        modifier = Modifier
            .fillMaxSize()
            .background(MelodyBg)
    ) {
        item {
            Box(
                modifier = Modifier
                    .fillMaxWidth()
                    .height(240.dp)
                    .background(
                        Brush.verticalGradient(
                            listOf(Color(0xFF8B5CF6), Color(0xFF6D28D9), MelodyBg)
                        )
                    )
                    .statusBarsPadding()
                    .padding(16.dp)
            ) {
                IconButton(
                    onClick = onBack,
                    modifier = Modifier
                        .size(36.dp)
                        .background(Color(0x66000000), CircleShape)
                        .align(Alignment.TopStart)
                ) {
                    Icon(Icons.Default.ArrowBack, contentDescription = "Back", tint = Color.White)
                }

                Column(modifier = Modifier.align(Alignment.BottomStart)) {
                    Text(
                        text = "Liked Songs",
                        fontSize = 32.sp,
                        fontWeight = FontWeight.Black,
                        color = Color.White
                    )
                    Text(
                        text = "${likedSongs.size} songs • Saved to your library",
                        fontSize = 13.sp,
                        color = Color.White.copy(alpha = 0.8f)
                    )
                }
            }
        }

        item {
            Row(
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(horizontal = 16.dp, vertical = 12.dp),
                horizontalArrangement = Arrangement.End
            ) {
                if (likedSongs.isNotEmpty()) {
                    FloatingActionButton(
                        onClick = { onSongClick(likedSongs.first()) },
                        containerColor = MelodyPrimary,
                        contentColor = Color.White,
                        shape = CircleShape,
                        modifier = Modifier.size(56.dp)
                    ) {
                        Icon(Icons.Default.PlayArrow, contentDescription = "Play All", modifier = Modifier.size(32.dp))
                    }
                }
            }
        }

        if (likedSongs.isEmpty()) {
            item {
                Box(
                    modifier = Modifier
                        .fillMaxWidth()
                        .padding(top = 40.dp),
                    contentAlignment = Alignment.Center
                ) {
                    Column(horizontalAlignment = Alignment.CenterHorizontally) {
                        Icon(
                            Icons.Default.FavoriteBorder,
                            contentDescription = "Empty",
                            tint = MelodyTextMuted,
                            modifier = Modifier.size(48.dp)
                        )
                        Spacer(modifier = Modifier.height(12.dp))
                        Text("No liked songs yet", color = Color.White, fontSize = 16.sp, fontWeight = FontWeight.Bold)
                        Text("Songs you like will appear here", color = MelodyTextSecondary, fontSize = 13.sp)
                    }
                }
            }
        } else {
            items(likedSongs) { song ->
                SongListItem(song = song, onClick = { onSongClick(song) })
                Spacer(modifier = Modifier.height(6.dp))
            }
        }

        item {
            Spacer(modifier = Modifier.height(100.dp))
        }
    }
}

@Composable
fun DownloadedSongsScreen(
    downloaded: List<DownloadedSong>,
    onBack: () -> Unit,
    onSongClick: (Song) -> Unit
) {
    BackHandler {
        onBack()
    }
    LazyColumn(
        modifier = Modifier
            .fillMaxSize()
            .background(MelodyBg)
    ) {
        item {
            Box(
                modifier = Modifier
                    .fillMaxWidth()
                    .height(240.dp)
                    .background(
                        Brush.verticalGradient(
                            listOf(Color(0xFF0284C7), Color(0xFF0369A1), MelodyBg)
                        )
                    )
                    .statusBarsPadding()
                    .padding(16.dp)
            ) {
                IconButton(
                    onClick = onBack,
                    modifier = Modifier
                        .size(36.dp)
                        .background(Color(0x66000000), CircleShape)
                        .align(Alignment.TopStart)
                ) {
                    Icon(Icons.Default.ArrowBack, contentDescription = "Back", tint = Color.White)
                }

                Column(modifier = Modifier.align(Alignment.BottomStart)) {
                    Row(
                        verticalAlignment = Alignment.CenterVertically,
                        horizontalArrangement = Arrangement.spacedBy(8.dp)
                    ) {
                        Icon(Icons.Default.DownloadDone, "Downloaded", tint = Color.White, modifier = Modifier.size(20.dp))
                        Text("Offline Storage", color = Color.White, fontSize = 13.sp, fontWeight = FontWeight.Bold)
                    }
                    Text(
                        text = "Downloaded Music",
                        fontSize = 32.sp,
                        fontWeight = FontWeight.Black,
                        color = Color.White
                    )
                    Text(
                        text = "${downloaded.size} songs stored on device • Instant 0-data playback",
                        fontSize = 13.sp,
                        color = Color.White.copy(alpha = 0.8f)
                    )
                }
            }
        }

        item {
            Row(
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(horizontal = 16.dp, vertical = 12.dp),
                horizontalArrangement = Arrangement.End
            ) {
                if (downloaded.isNotEmpty()) {
                    FloatingActionButton(
                        onClick = { onSongClick(downloaded.first().toSong()) },
                        containerColor = MelodyPrimary,
                        contentColor = Color.White,
                        shape = CircleShape,
                        modifier = Modifier.size(56.dp)
                    ) {
                        Icon(Icons.Default.PlayArrow, contentDescription = "Play All", modifier = Modifier.size(32.dp))
                    }
                }
            }
        }

        if (downloaded.isEmpty()) {
            item {
                Box(
                    modifier = Modifier
                        .fillMaxWidth()
                        .padding(top = 40.dp),
                    contentAlignment = Alignment.Center
                ) {
                    Column(horizontalAlignment = Alignment.CenterHorizontally) {
                        Icon(
                            Icons.Default.CloudDownload,
                            contentDescription = "Empty",
                            tint = MelodyTextMuted,
                            modifier = Modifier.size(48.dp)
                        )
                        Spacer(modifier = Modifier.height(12.dp))
                        Text("No offline downloads yet", color = Color.White, fontSize = 16.sp, fontWeight = FontWeight.Bold)
                        Text("Tap download icon on any song to store locally", color = MelodyTextSecondary, fontSize = 13.sp)
                    }
                }
            }
        } else {
            items(downloaded) { item ->
                val song = item.toSong()
                SongListItem(song = song, onClick = { onSongClick(song) })
                Spacer(modifier = Modifier.height(6.dp))
            }
        }

        item {
            Spacer(modifier = Modifier.height(100.dp))
        }
    }
}

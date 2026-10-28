package com.melody.music.ui.screens

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
import com.melody.music.data.download.DownloadedSong
import com.melody.music.data.download.MelodyDownloadManager
import com.melody.music.data.model.Song
import com.melody.music.player.MelodyPlayerManager
import com.melody.music.ui.theme.*

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
                    IconButton(onClick = {}) {
                        Icon(Icons.Default.Search, "Search in library", tint = Color.White)
                    }
                    IconButton(onClick = {}) {
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

            val artists = listOf("The Weeknd", "Lana Del Rey")
            items(artists) { artistName ->
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
fun LikedSongsScreen(
    likedSongs: List<Song>,
    onBack: () -> Unit,
    onSongClick: (Song) -> Unit
) {
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

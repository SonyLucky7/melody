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
import androidx.compose.material.icons.filled.PlayArrow
import androidx.compose.material.icons.filled.Refresh
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import coil.compose.AsyncImage
import com.melody.music.data.model.Song
import com.melody.music.ui.theme.*

@Composable
fun HomeScreen(
    songs: List<Song>,
    onSongClick: (Song, List<Song>) -> Unit,
    onArtistClick: (String) -> Unit,
    onRefresh: (() -> Unit)? = null,
    modifier: Modifier = Modifier
) {
    var selectedLanguage by remember { mutableStateOf("") }
    val languages = listOf("All", "English", "Hindi", "Tamil", "Telugu", "Punjabi")

    val filteredSongs = remember(songs, selectedLanguage) {
        if (selectedLanguage.isEmpty() || selectedLanguage == "All") {
            songs
        } else {
            songs.filter { it.language?.equals(selectedLanguage, ignoreCase = true) == true }
        }
    }

    LazyColumn(
        modifier = modifier
            .fillMaxSize()
            .background(MelodyBg)
            .padding(horizontal = 16.dp)
    ) {
        item {
            Spacer(modifier = Modifier.height(24.dp))
            Row(
                modifier = Modifier.fillMaxWidth(),
                verticalAlignment = Alignment.CenterVertically,
                horizontalArrangement = Arrangement.SpaceBetween
            ) {
                Text(
                    text = "Good evening",
                    fontSize = 26.sp,
                    fontWeight = FontWeight.ExtraBold,
                    color = Color.White
                )

                if (onRefresh != null) {
                    IconButton(onClick = onRefresh) {
                        Icon(Icons.Default.Refresh, contentDescription = "Refresh", tint = MelodyTextSecondary)
                    }
                }
            }

            Spacer(modifier = Modifier.height(16.dp))
        }

        // Quick Picks Grid (2x3)
        if (songs.size >= 2) {
            item {
                Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
                    val quickPicks = songs.take(6)
                    for (i in 0 until quickPicks.size step 2) {
                        Row(
                            modifier = Modifier.fillMaxWidth(),
                            horizontalArrangement = Arrangement.spacedBy(8.dp)
                        ) {
                            QuickPickCard(
                                song = quickPicks[i],
                                onClick = { onSongClick(quickPicks[i], songs) },
                                modifier = Modifier.weight(1f)
                            )
                            if (i + 1 < quickPicks.size) {
                                QuickPickCard(
                                    song = quickPicks[i + 1],
                                    onClick = { onSongClick(quickPicks[i + 1], songs) },
                                    modifier = Modifier.weight(1f)
                                )
                            } else {
                                Spacer(modifier = Modifier.weight(1f))
                            }
                        }
                    }
                }
                Spacer(modifier = Modifier.height(24.dp))
            }
        }

        // Popular Artists (The Weeknd & Lana Del Rey circular avatars)
        item {
            Text(
                text = "Popular Artists",
                fontSize = 20.sp,
                fontWeight = FontWeight.Bold,
                color = Color.White,
                modifier = Modifier.padding(bottom = 12.dp)
            )

            LazyRow(
                horizontalArrangement = Arrangement.spacedBy(16.dp),
                modifier = Modifier.fillMaxWidth()
            ) {
                val featuredArtists = listOf("The Weeknd", "Lana Del Rey")
                items(featuredArtists) { artistName ->
                    val profile = ARTIST_PROFILES[artistName]
                    Column(
                        horizontalAlignment = Alignment.CenterHorizontally,
                        modifier = Modifier
                            .width(100.dp)
                            .clickable { onArtistClick(artistName) }
                    ) {
                        AsyncImage(
                            model = profile?.imageUrl ?: "https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=200",
                            contentDescription = artistName,
                            modifier = Modifier
                                .size(90.dp)
                                .clip(CircleShape),
                            contentScale = ContentScale.Crop
                        )
                        Spacer(modifier = Modifier.height(8.dp))
                        Text(
                            text = artistName,
                            color = Color.White,
                            fontSize = 13.sp,
                            fontWeight = FontWeight.Bold,
                            maxLines = 1,
                            overflow = TextOverflow.Ellipsis
                        )
                        Text(
                            text = "Artist",
                            color = MelodyTextSecondary,
                            fontSize = 11.sp
                        )
                    }
                }
            }

            Spacer(modifier = Modifier.height(24.dp))
        }

        // Language Filter Pills
        item {
            LazyRow(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                items(languages) { lang ->
                    val isSelected = (selectedLanguage.isEmpty() && lang == "All") || selectedLanguage == lang
                    FilterChip(
                        selected = isSelected,
                        onClick = { selectedLanguage = if (lang == "All") "" else lang },
                        label = { Text(lang, fontSize = 12.sp, fontWeight = FontWeight.SemiBold) },
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

        // Section Title: Featured Tracks
        item {
            Text(
                text = "Featured Tracks",
                fontSize = 20.sp,
                fontWeight = FontWeight.Bold,
                color = Color.White,
                modifier = Modifier.padding(bottom = 12.dp)
            )
        }

        if (filteredSongs.isEmpty()) {
            item {
                Box(
                    modifier = Modifier
                        .fillMaxWidth()
                        .padding(vertical = 40.dp),
                    contentAlignment = Alignment.Center
                ) {
                    Column(horizontalAlignment = Alignment.CenterHorizontally) {
                        CircularProgressIndicator(color = MelodyPrimary, modifier = Modifier.size(36.dp))
                        Spacer(modifier = Modifier.height(12.dp))
                        Text("Connecting to Melody Cloud...", color = MelodyTextSecondary, fontSize = 13.sp)
                    }
                }
            }
        } else {
            // Song Rows with key for instant 120fps recycle
            items(filteredSongs, key = { it.id }) { song ->
                SongListItem(
                    song = song,
                    onClick = { onSongClick(song, filteredSongs) }
                )
                Spacer(modifier = Modifier.height(8.dp))
            }
        }

        item {
            Spacer(modifier = Modifier.height(100.dp))
        }
    }
}

@Composable
fun QuickPickCard(song: Song, onClick: () -> Unit, modifier: Modifier = Modifier) {
    Row(
        modifier = modifier
            .clip(RoundedCornerShape(6.dp))
            .background(MelodyCard)
            .clickable { onClick() },
        verticalAlignment = Alignment.CenterVertically
    ) {
        AsyncImage(
            model = song.getFullCoverUrl(),
            contentDescription = song.title,
            modifier = Modifier.size(54.dp),
            contentScale = ContentScale.Crop
        )
        Text(
            text = song.title,
            color = Color.White,
            fontSize = 13.sp,
            fontWeight = FontWeight.Bold,
            maxLines = 2,
            overflow = TextOverflow.Ellipsis,
            modifier = Modifier.padding(horizontal = 10.dp)
        )
    }
}

@Composable
fun SongListItem(
    song: Song,
    onClick: () -> Unit,
    trailingContent: (@Composable () -> Unit)? = null
) {
    Row(
        modifier = Modifier
            .fillMaxWidth()
            .clip(RoundedCornerShape(8.dp))
            .clickable { onClick() }
            .padding(vertical = 4.dp),
        verticalAlignment = Alignment.CenterVertically
    ) {
        AsyncImage(
            model = song.getFullCoverUrl(),
            contentDescription = song.title,
            modifier = Modifier
                .size(48.dp)
                .clip(RoundedCornerShape(6.dp)),
            contentScale = ContentScale.Crop
        )

        Spacer(modifier = Modifier.width(12.dp))

        Column(modifier = Modifier.weight(1f)) {
            Text(
                text = song.title,
                fontSize = 15.sp,
                fontWeight = FontWeight.SemiBold,
                color = Color.White,
                maxLines = 1,
                overflow = TextOverflow.Ellipsis
            )
            Text(
                text = "${song.artist} • ${song.album ?: "Single"}",
                fontSize = 13.sp,
                color = MelodyTextSecondary,
                maxLines = 1,
                overflow = TextOverflow.Ellipsis
            )
        }

        if (trailingContent != null) {
            trailingContent()
        } else {
            IconButton(onClick = onClick) {
                Icon(Icons.Default.PlayArrow, contentDescription = "Play", tint = MelodyTextSecondary)
            }
        }
    }
}

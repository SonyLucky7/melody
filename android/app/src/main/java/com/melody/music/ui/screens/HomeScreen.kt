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
import com.melody.music.data.model.Playlist
import com.melody.music.data.model.PUBLIC_PLAYLISTS
import com.melody.music.data.model.Song
import com.melody.music.ui.theme.*

@Composable
fun HomeScreen(
    songs: List<Song>,
    onSongClick: (Song, List<Song>) -> Unit,
    onArtistClick: (String) -> Unit,
    onPlaylistClick: (Playlist) -> Unit,
    onRefresh: (() -> Unit)? = null,
    onSwitchToTvMode: (() -> Unit)? = null,
    modifier: Modifier = Modifier
) {
    var selectedLanguage by remember { mutableStateOf("") }
    val languages = listOf("All", "English", "Punjabi", "Hindi", "Phonk", "Slowed")

    val greeting = remember {
        val hour = java.util.Calendar.getInstance().get(java.util.Calendar.HOUR_OF_DAY)
        when {
            hour < 12 -> "Good morning"
            hour < 18 -> "Good afternoon"
            else -> "Good evening"
        }
    }

    val filteredSongs = remember(songs, selectedLanguage) {
        if (selectedLanguage.isEmpty() || selectedLanguage == "All") {
            songs
        } else if (selectedLanguage.equals("Phonk", ignoreCase = true)) {
            songs.filter {
                it.album?.contains("phonk", true) == true ||
                it.language?.equals("phonk", true) == true ||
                it.title.contains("phonk", true) ||
                it.title.contains("montagem", true)
            }
        } else if (selectedLanguage.equals("Slowed", ignoreCase = true)) {
            songs.filter {
                it.title.contains("slowed", true) ||
                it.title.contains("reverb", true) ||
                it.album?.contains("slowed", true) == true
            }
        } else {
            songs.filter { it.language?.equals(selectedLanguage, ignoreCase = true) == true }
        }
    }

    // Pick 6 diverse high-profile songs for the 2x3 Quick Picks grid
    val quickPicks = remember(songs) {
        if (songs.size <= 6) songs else {
            val picks = mutableListOf<Song>()
            val sidhu = songs.find { it.artist.contains("moose wala", ignoreCase = true) }
            val weeknd = songs.find { it.artist.contains("weeknd", ignoreCase = true) }
            val honey = songs.find { it.artist.contains("honey singh", ignoreCase = true) }
            val motivation = songs.find { it.album?.contains("motivation", ignoreCase = true) == true }
            val phonk = songs.find {
                it.album?.contains("phonk", ignoreCase = true) == true ||
                it.language?.equals("phonk", ignoreCase = true) == true
            }
            val ariana = songs.find { it.artist.contains("ariana", ignoreCase = true) }

            if (sidhu != null) picks.add(sidhu)
            if (weeknd != null) picks.add(weeknd)
            if (honey != null) picks.add(honey)
            if (motivation != null) picks.add(motivation)
            if (phonk != null) picks.add(phonk)
            if (ariana != null) picks.add(ariana)

            for (s in songs) {
                if (picks.size >= 6) break
                if (!picks.contains(s)) picks.add(s)
            }
            picks
        }
    }

    val featuredArtists = remember {
        listOf(
            "Sidhu Moose Wala",
            "Yo Yo Honey Singh",
            "The Weeknd",
            "Lana Del Rey",
            "Ariana Grande",
            "2Pac",
            "50 Cent"
        )
    }

    val motivationSongs = remember(songs) {
        songs.filter { it.album?.contains("motivation", ignoreCase = true) == true }.take(12)
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
                    text = greeting,
                    fontSize = 26.sp,
                    fontWeight = FontWeight.ExtraBold,
                    color = Color.White
                )

                Row(verticalAlignment = Alignment.CenterVertically) {
                    if (onSwitchToTvMode != null) {
                        IconButton(onClick = onSwitchToTvMode) {
                            Icon(Icons.Default.Tv, contentDescription = "Spotify TV Mode", tint = MelodyPrimary)
                        }
                    }
                    if (onRefresh != null) {
                        IconButton(onClick = onRefresh) {
                            Icon(Icons.Default.Refresh, contentDescription = "Refresh", tint = MelodyTextSecondary)
                        }
                    }
                }
            }

            Spacer(modifier = Modifier.height(16.dp))
        }

        // 1. Spotify 2x3 Quick Picks Grid with high-res album covers
        if (quickPicks.isNotEmpty()) {
            item {
                Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
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

        // 2. Featured Playlists & Mixes Carousel (HORIZONTAL SCROLL - Exact Spotify Pattern)
        item {
            Text(
                text = "Featured Playlists & Mixes",
                fontSize = 20.sp,
                fontWeight = FontWeight.Bold,
                color = Color.White,
                modifier = Modifier.padding(bottom = 12.dp)
            )

            LazyRow(
                horizontalArrangement = Arrangement.spacedBy(14.dp),
                modifier = Modifier.fillMaxWidth()
            ) {
                items(PUBLIC_PLAYLISTS) { playlist ->
                    PlaylistCard(
                        playlist = playlist,
                        onClick = { onPlaylistClick(playlist) }
                    )
                }
            }

            Spacer(modifier = Modifier.height(24.dp))
        }

        // 3. Popular Artists (HORIZONTAL SCROLL - Sidhu Moose Wala, Honey Singh, Weeknd, Lana, Ariana, 2Pac, 50 Cent)
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
                items(featuredArtists) { artistName ->
                    val profile = ARTIST_PROFILES[artistName]
                    Column(
                        horizontalAlignment = Alignment.CenterHorizontally,
                        modifier = Modifier
                            .width(100.dp)
                            .clickable { onArtistClick(artistName) }
                    ) {
                        AsyncImage(
                            model = profile?.imageUrl ?: "https://melody-chi-nine.vercel.app/covers/the-weeknd-avatar.jpg",
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

        // 4. Workout & Heavy Motivation Section (HORIZONTAL SCROLL)
        if (motivationSongs.isNotEmpty()) {
            item {
                Text(
                    text = "Heavy Motivation & Workout",
                    fontSize = 20.sp,
                    fontWeight = FontWeight.Bold,
                    color = Color.White,
                    modifier = Modifier.padding(bottom = 12.dp)
                )

                LazyRow(
                    horizontalArrangement = Arrangement.spacedBy(14.dp),
                    modifier = Modifier.fillMaxWidth()
                ) {
                    items(motivationSongs) { mSong ->
                        Column(
                            modifier = Modifier
                                .width(130.dp)
                                .clickable { onSongClick(mSong, motivationSongs) }
                        ) {
                            AsyncImage(
                                model = mSong.getFullCoverUrl(),
                                contentDescription = mSong.title,
                                modifier = Modifier
                                    .size(130.dp)
                                    .clip(RoundedCornerShape(8.dp)),
                                contentScale = ContentScale.Crop
                            )
                            Spacer(modifier = Modifier.height(8.dp))
                            Text(
                                text = mSong.title,
                                color = Color.White,
                                fontSize = 13.sp,
                                fontWeight = FontWeight.Bold,
                                maxLines = 1,
                                overflow = TextOverflow.Ellipsis
                            )
                            Text(
                                text = mSong.artist,
                                color = MelodyTextSecondary,
                                fontSize = 11.sp,
                                maxLines = 1,
                                overflow = TextOverflow.Ellipsis
                            )
                        }
                    }
                }

                Spacer(modifier = Modifier.height(24.dp))
            }
        }

        // 5. Language Filter Pills
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

        // 6. Section Title: Featured Tracks
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
fun PlaylistCard(
    playlist: Playlist,
    onClick: () -> Unit,
    modifier: Modifier = Modifier
) {
    Column(
        modifier = modifier
            .width(140.dp)
            .clickable { onClick() }
    ) {
        AsyncImage(
            model = playlist.coverUrl ?: "https://melody-chi-nine.vercel.app/Melody-Logo-512.png",
            contentDescription = playlist.name,
            modifier = Modifier
                .size(140.dp)
                .clip(RoundedCornerShape(8.dp)),
            contentScale = ContentScale.Crop
        )
        Spacer(modifier = Modifier.height(8.dp))
        Text(
            text = playlist.name,
            color = Color.White,
            fontSize = 13.sp,
            fontWeight = FontWeight.Bold,
            maxLines = 1,
            overflow = TextOverflow.Ellipsis
        )
        Text(
            text = playlist.description ?: "${playlist.totalSongs ?: 0} tracks • 320k Free",
            color = MelodyTextSecondary,
            fontSize = 11.sp,
            lineHeight = 14.sp,
            maxLines = 2,
            overflow = TextOverflow.Ellipsis
        )
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

package com.melody.music.ui.screens

import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.LazyRow
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.lazy.itemsIndexed
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
import com.melody.music.data.model.Song
import com.melody.music.player.MelodyPlayerManager
import com.melody.music.ui.theme.*

data class ArtistProfile(
    val name: String,
    val imageUrl: String,
    val bannerUrl: String,
    val monthlyListeners: String,
    val rank: String,
    val bio: String
)

val ARTIST_PROFILES = mapOf(
    "The Weeknd" to ArtistProfile(
        name = "The Weeknd",
        imageUrl = "https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=800&auto=format&fit=crop&q=80",
        bannerUrl = "https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=1200&auto=format&fit=crop&q=80",
        monthlyListeners = "112,450,290 monthly listeners",
        rank = "#1 in the world",
        bio = "Abel Makkonen Tesfaye, known professionally as The Weeknd, is a Canadian singer, songwriter, and record producer known for his sonic versatility and dark lyricism."
    ),
    "Lana Del Rey" to ArtistProfile(
        name = "Lana Del Rey",
        imageUrl = "https://images.unsplash.com/photo-1516450360452-9312f5e86fc7?w=800&auto=format&fit=crop&q=80",
        bannerUrl = "https://images.unsplash.com/photo-1470225620780-dba8ba36b745?w=1200&auto=format&fit=crop&q=80",
        monthlyListeners = "62,890,140 monthly listeners",
        rank = "#18 in the world",
        bio = "Elizabeth Woolridge Grant, known professionally as Lana Del Rey, is an American singer-songwriter celebrated for cinematic quality and tragic romance melancholia."
    )
)

@Composable
fun ArtistScreen(
    artistName: String,
    songs: List<Song>,
    onBack: () -> Unit,
    onSongClick: (Song, List<Song>) -> Unit,
    modifier: Modifier = Modifier
) {
    val profile = ARTIST_PROFILES[artistName] ?: ArtistProfile(
        name = artistName,
        imageUrl = "https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=800&auto=format&fit=crop&q=80",
        bannerUrl = "https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=1200&auto=format&fit=crop&q=80",
        monthlyListeners = "45,210,800 monthly listeners",
        rank = "#42 in the world",
        bio = "Verified recording artist on Melody High-Fidelity music network."
    )

    var isFollowing by remember { mutableStateOf(false) }
    val artistSongs = remember(songs, artistName) {
        songs.filter { it.artist.contains(artistName, ignoreCase = true) }
    }

    val currentSong by MelodyPlayerManager.currentSong.collectAsState()
    val isPlaying by MelodyPlayerManager.isPlaying.collectAsState()

    LazyColumn(
        modifier = modifier
            .fillMaxSize()
            .background(MelodyBg)
    ) {
        // Hero Header Banner
        item {
            Box(
                modifier = Modifier
                    .fillMaxWidth()
                    .height(300.dp)
            ) {
                AsyncImage(
                    model = profile.bannerUrl,
                    contentDescription = profile.name,
                    contentScale = ContentScale.Crop,
                    modifier = Modifier.fillMaxSize()
                )

                // Dark Spotify Gradient Overlay
                Box(
                    modifier = Modifier
                        .fillMaxSize()
                        .background(
                            Brush.verticalGradient(
                                colors = listOf(
                                    Color.Transparent,
                                    Color(0x66121212),
                                    MelodyBg
                                )
                            )
                        )
                )

                // Back Button & Top Options
                Row(
                    modifier = Modifier
                        .fillMaxWidth()
                        .statusBarsPadding()
                        .padding(horizontal = 16.dp, vertical = 8.dp),
                    horizontalArrangement = Arrangement.SpaceBetween,
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    IconButton(
                        onClick = onBack,
                        modifier = Modifier
                            .size(36.dp)
                            .background(Color(0x80000000), CircleShape)
                    ) {
                        Icon(
                            Icons.Default.ArrowBack,
                            contentDescription = "Back",
                            tint = Color.White
                        )
                    }

                    IconButton(
                        onClick = { },
                        modifier = Modifier
                            .size(36.dp)
                            .background(Color(0x80000000), CircleShape)
                    ) {
                        Icon(
                            Icons.Default.MoreVert,
                            contentDescription = "Options",
                            tint = Color.White
                        )
                    }
                }

                // Artist Details Overlay at Bottom of Banner
                Column(
                    modifier = Modifier
                        .align(Alignment.BottomStart)
                        .padding(horizontal = 16.dp, vertical = 12.dp)
                ) {
                    Row(
                        verticalAlignment = Alignment.CenterVertically,
                        horizontalArrangement = Arrangement.spacedBy(6.dp)
                    ) {
                        Icon(
                            Icons.Default.CheckCircle,
                            contentDescription = "Verified",
                            tint = MelodyPrimary,
                            modifier = Modifier.size(18.dp)
                        )
                        Text(
                            text = "Verified Artist",
                            color = Color.White,
                            fontSize = 12.sp,
                            fontWeight = FontWeight.SemiBold
                        )
                    }

                    Spacer(modifier = Modifier.height(4.dp))

                    Text(
                        text = profile.name,
                        color = Color.White,
                        fontSize = 34.sp,
                        fontWeight = FontWeight.Black,
                        maxLines = 1,
                        overflow = TextOverflow.Ellipsis
                    )

                    Spacer(modifier = Modifier.height(4.dp))

                    Text(
                        text = profile.monthlyListeners,
                        color = MelodyTextSecondary,
                        fontSize = 13.sp,
                        fontWeight = FontWeight.Medium
                    )
                }
            }
        }

        // Action Buttons Row: Follow, Shuffle, and Big Purple Play FAB
        item {
            Row(
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(horizontal = 16.dp, vertical = 16.dp),
                verticalAlignment = Alignment.CenterVertically,
                horizontalArrangement = Arrangement.SpaceBetween
            ) {
                Row(
                    verticalAlignment = Alignment.CenterVertically,
                    horizontalArrangement = Arrangement.spacedBy(16.dp)
                ) {
                    OutlinedButton(
                        onClick = { isFollowing = !isFollowing },
                        shape = RoundedCornerShape(20.dp),
                        colors = ButtonDefaults.outlinedButtonColors(
                            containerColor = if (isFollowing) MelodyPrimary else Color.Transparent,
                            contentColor = Color.White
                        ),
                        border = ButtonDefaults.outlinedButtonBorder.copy(
                            brush = Brush.linearGradient(
                                listOf(
                                    if (isFollowing) MelodyPrimary else MelodyTextSecondary,
                                    if (isFollowing) MelodyPrimaryVariant else MelodyTextSecondary
                                )
                            )
                        ),
                        contentPadding = PaddingValues(horizontal = 16.dp, vertical = 6.dp)
                    ) {
                        Text(
                            text = if (isFollowing) "Following" else "Follow",
                            fontWeight = FontWeight.Bold,
                            fontSize = 13.sp
                        )
                    }

                    IconButton(
                        onClick = { MelodyPlayerManager.toggleShuffle() }
                    ) {
                        Icon(
                            Icons.Default.Shuffle,
                            contentDescription = "Shuffle",
                            tint = if (MelodyPlayerManager.isShuffle.collectAsState().value) MelodyPrimary else MelodyTextSecondary,
                            modifier = Modifier.size(24.dp)
                        )
                    }
                }

                // Big Purple Play/Pause Button
                val isCurrentArtistPlaying = currentSong != null &&
                        currentSong?.artist?.contains(artistName, ignoreCase = true) == true &&
                        isPlaying

                FloatingActionButton(
                    onClick = {
                        if (isCurrentArtistPlaying) {
                            MelodyPlayerManager.togglePlay()
                        } else if (artistSongs.isNotEmpty()) {
                            onSongClick(artistSongs.first(), artistSongs)
                        }
                    },
                    containerColor = MelodyPrimary,
                    contentColor = Color.White,
                    shape = CircleShape,
                    modifier = Modifier.size(56.dp)
                ) {
                    Icon(
                        imageVector = if (isCurrentArtistPlaying) Icons.Default.Pause else Icons.Default.PlayArrow,
                        contentDescription = "Play Artist",
                        modifier = Modifier.size(32.dp)
                    )
                }
            }
        }

        // Popular Section Title
        item {
            Text(
                text = "Popular",
                fontSize = 20.sp,
                fontWeight = FontWeight.Bold,
                color = Color.White,
                modifier = Modifier.padding(horizontal = 16.dp, vertical = 8.dp)
            )
        }

        // Artist's Popular Tracks
        itemsIndexed(artistSongs.ifEmpty { songs.take(5) }) { index, song ->
            val isThisPlaying = currentSong?.id == song.id
            ArtistTrackRow(
                index = index + 1,
                song = song,
                isPlaying = isThisPlaying && isPlaying,
                onClick = { onSongClick(song, artistSongs.ifEmpty { songs }) }
            )
        }

        // Discography / Releases Section
        item {
            Spacer(modifier = Modifier.height(24.dp))
            Text(
                text = "Popular Releases",
                fontSize = 20.sp,
                fontWeight = FontWeight.Bold,
                color = Color.White,
                modifier = Modifier.padding(horizontal = 16.dp, vertical = 8.dp)
            )

            LazyRow(
                contentPadding = PaddingValues(horizontal = 16.dp),
                horizontalArrangement = Arrangement.spacedBy(16.dp)
            ) {
                val albums = artistSongs.mapNotNull { it.album }.distinct().ifEmpty {
                    listOf("Highlights", "After Hours", "Starboy", "Born to Die")
                }

                items(albums) { albumTitle ->
                    ReleaseCard(
                        albumTitle = albumTitle,
                        artistName = profile.name,
                        coverUrl = artistSongs.find { it.album == albumTitle }?.coverUrl ?: profile.imageUrl
                    )
                }
            }
        }

        // About Artist Card
        item {
            Spacer(modifier = Modifier.height(28.dp))
            Text(
                text = "About",
                fontSize = 20.sp,
                fontWeight = FontWeight.Bold,
                color = Color.White,
                modifier = Modifier.padding(horizontal = 16.dp, vertical = 8.dp)
            )

            Card(
                shape = RoundedCornerShape(16.dp),
                colors = CardDefaults.cardColors(containerColor = MelodySurface),
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(horizontal = 16.dp)
            ) {
                Box(
                    modifier = Modifier
                        .fillMaxWidth()
                        .height(200.dp)
                ) {
                    AsyncImage(
                        model = profile.imageUrl,
                        contentDescription = profile.name,
                        contentScale = ContentScale.Crop,
                        modifier = Modifier.fillMaxSize()
                    )
                    Box(
                        modifier = Modifier
                            .fillMaxSize()
                            .background(
                                Brush.verticalGradient(
                                    colors = listOf(Color.Transparent, Color(0xCC181818), MelodySurface)
                                )
                            )
                    )
                    Column(
                        modifier = Modifier
                            .align(Alignment.BottomStart)
                            .padding(16.dp)
                    ) {
                        Text(
                            text = profile.rank,
                            fontSize = 18.sp,
                            fontWeight = FontWeight.ExtraBold,
                            color = Color.White
                        )
                        Text(
                            text = profile.monthlyListeners,
                            fontSize = 13.sp,
                            color = MelodyTextSecondary
                        )
                        Spacer(modifier = Modifier.height(6.dp))
                        Text(
                            text = profile.bio,
                            fontSize = 12.sp,
                            color = MelodyTextSecondary,
                            maxLines = 3,
                            overflow = TextOverflow.Ellipsis
                        )
                    }
                }
            }

            Spacer(modifier = Modifier.height(100.dp)) // padding for bottom player
        }
    }
}

@Composable
fun ArtistTrackRow(
    index: Int,
    song: Song,
    isPlaying: Boolean,
    onClick: () -> Unit
) {
    Row(
        modifier = Modifier
            .fillMaxWidth()
            .clickable { onClick() }
            .padding(horizontal = 16.dp, vertical = 8.dp),
        verticalAlignment = Alignment.CenterVertically
    ) {
        // Track number or playing animation
        Box(
            modifier = Modifier.width(28.dp),
            contentAlignment = Alignment.CenterStart
        ) {
            if (isPlaying) {
                Icon(
                    Icons.Default.GraphicEq,
                    contentDescription = "Playing",
                    tint = MelodyPrimary,
                    modifier = Modifier.size(18.dp)
                )
            } else {
                Text(
                    text = index.toString(),
                    color = MelodyTextSecondary,
                    fontSize = 14.sp,
                    fontWeight = FontWeight.Medium
                )
            }
        }

        AsyncImage(
            model = song.coverUrl ?: "file:///android_asset/ic_melody_logo.png",
            contentDescription = song.title,
            modifier = Modifier
                .size(44.dp)
                .clip(RoundedCornerShape(6.dp)),
            contentScale = ContentScale.Crop
        )

        Spacer(modifier = Modifier.width(12.dp))

        Column(modifier = Modifier.weight(1f)) {
            Text(
                text = song.title,
                fontSize = 15.sp,
                fontWeight = FontWeight.SemiBold,
                color = if (isPlaying) MelodyPrimary else Color.White,
                maxLines = 1,
                overflow = TextOverflow.Ellipsis
            )
            Text(
                text = "${(song.durationSeconds / 60)}:${String.format("%02d", song.durationSeconds % 60)} • ${song.album ?: "Single"}",
                fontSize = 12.sp,
                color = MelodyTextSecondary,
                maxLines = 1,
                overflow = TextOverflow.Ellipsis
            )
        }

        IconButton(onClick = onClick) {
            Icon(
                Icons.Default.MoreVert,
                contentDescription = "More",
                tint = MelodyTextSecondary,
                modifier = Modifier.size(20.dp)
            )
        }
    }
}

@Composable
fun ReleaseCard(
    albumTitle: String,
    artistName: String,
    coverUrl: String
) {
    Column(
        modifier = Modifier
            .width(140.dp)
            .clip(RoundedCornerShape(8.dp))
            .clickable { }
    ) {
        AsyncImage(
            model = coverUrl,
            contentDescription = albumTitle,
            modifier = Modifier
                .size(140.dp)
                .clip(RoundedCornerShape(8.dp)),
            contentScale = ContentScale.Crop
        )
        Spacer(modifier = Modifier.height(8.dp))
        Text(
            text = albumTitle,
            color = Color.White,
            fontSize = 14.sp,
            fontWeight = FontWeight.Bold,
            maxLines = 1,
            overflow = TextOverflow.Ellipsis
        )
        Text(
            text = "Album • $artistName",
            color = MelodyTextSecondary,
            fontSize = 12.sp,
            maxLines = 1,
            overflow = TextOverflow.Ellipsis
        )
    }
}

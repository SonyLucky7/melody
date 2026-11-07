package com.melody.music.ui.tv

import androidx.activity.compose.BackHandler
import androidx.compose.animation.animateColorAsState
import androidx.compose.animation.core.animateFloatAsState
import androidx.compose.animation.core.tween
import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.focusable
import androidx.compose.foundation.interaction.MutableInteractionSource
import androidx.compose.foundation.layout.*
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
import androidx.compose.ui.draw.shadow
import androidx.compose.ui.focus.onFocusChanged
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
import com.melody.music.player.RepeatState
import com.melody.music.ui.theme.MelodyCard
import com.melody.music.ui.theme.MelodyPrimary
import com.melody.music.ui.theme.MelodyTextSecondary

/**
 * Spotify TV Full-Screen Now Playing Experience.
 * Designed for 10-foot viewing with D-Pad remote controls, large album artwork,
 * ambient background glow, live progress tracking, and upcoming queue preview.
 */
@Composable
fun TvPlayerScreen(
    song: Song,
    isPlaying: Boolean,
    progressMs: Long,
    durationMs: Long,
    onTogglePlay: () -> Unit,
    onNext: () -> Unit,
    onPrev: () -> Unit,
    onSeekTo: (Long) -> Unit,
    onDismiss: () -> Unit,
    modifier: Modifier = Modifier
) {
    BackHandler {
        onDismiss()
    }

    val isShuffle by MelodyPlayerManager.isShuffle.collectAsState()
    val repeatState by MelodyPlayerManager.repeatState.collectAsState()
    val likedIds by MelodyPlayerManager.likedSongIds.collectAsState()
    val isLiked = likedIds.contains(song.id)
    val queue by MelodyPlayerManager.queue.collectAsState()

    // Up next in queue (next 4 songs)
    val curIdx = queue.indexOfFirst { it.id == song.id }
    val upNextSongs = remember(queue, curIdx) {
        if (curIdx != -1 && curIdx + 1 < queue.size) {
            queue.subList(curIdx + 1, (curIdx + 5).coerceAtMost(queue.size))
        } else emptyList()
    }

    Box(
        modifier = modifier
            .fillMaxSize()
            .background(Color(0xFF08080C))
    ) {
        // Ambient glow backdrop behind album art
        Box(
            modifier = Modifier
                .size(600.dp)
                .align(Alignment.CenterStart)
                .offset(x = (-50).dp)
                .background(
                    Brush.radialGradient(
                        colors = listOf(
                            MelodyPrimary.copy(alpha = 0.25f),
                            Color(0xFF3B0764).copy(alpha = 0.15f),
                            Color.Transparent
                        )
                    )
                )
        )

        Column(
            modifier = Modifier
                .fillMaxSize()
                .padding(horizontal = 48.dp, vertical = 28.dp)
        ) {
            // TV Header Bar
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.between,
                verticalAlignment = Alignment.CenterVertically
            ) {
                Row(
                    verticalAlignment = Alignment.CenterVertically,
                    horizontalArrangement = Arrangement.spacedBy(10.dp)
                ) {
                    Box(
                        modifier = Modifier
                            .background(MelodyPrimary, RoundedCornerShape(6.dp))
                            .padding(horizontal = 10.dp, vertical = 4.dp)
                    ) {
                        Text(
                            text = "NOW PLAYING",
                            color = Color.White,
                            fontSize = 11.sp,
                            fontWeight = FontWeight.Black,
                            letterSpacing = 1.sp
                        )
                    }

                    Text(
                        text = "Melody TV Studio Lossless",
                        color = MelodyTextSecondary,
                        fontSize = 13.sp,
                        fontWeight = FontWeight.Medium
                    )
                }

                // Close / Back hint button
                TvControlIconButton(
                    icon = Icons.Default.KeyboardArrowDown,
                    contentDescription = "Return to browsing",
                    size = 40.dp,
                    onClick = onDismiss
                )
            }

            Spacer(modifier = Modifier.height(24.dp))

            // Main Split: Left Artwork & Metadata, Right Controls & Queue
            Row(
                modifier = Modifier
                    .fillMaxWidth()
                    .weight(1f),
                horizontalArrangement = Arrangement.spacedBy(48.dp),
                verticalAlignment = Alignment.CenterVertically
            ) {
                // Left Column: Big 3D Vinyl Album Artwork
                Column(
                    modifier = Modifier.width(360.dp),
                    horizontalAlignment = Alignment.Start
                ) {
                    Box(
                        modifier = Modifier
                            .size(340.dp)
                            .shadow(24.dp, RoundedCornerShape(20.dp), ambientColor = Color.Black, spotColor = MelodyPrimary)
                            .clip(RoundedCornerShape(20.dp))
                            .border(1.5.dp, Color.White.copy(alpha = 0.15f), RoundedCornerShape(20.dp))
                            .background(MelodyCard)
                    ) {
                        AsyncImage(
                            model = song.getFullCoverUrl(),
                            contentDescription = song.title,
                            modifier = Modifier.fillMaxSize(),
                            contentScale = ContentScale.Crop
                        )
                    }

                    Spacer(modifier = Modifier.height(20.dp))

                    Text(
                        text = song.title,
                        color = Color.White,
                        fontSize = 26.sp,
                        fontWeight = FontWeight.Black,
                        lineHeight = 32.sp,
                        maxLines = 1,
                        overflow = TextOverflow.Ellipsis
                    )

                    Spacer(modifier = Modifier.height(2.dp))

                    Text(
                        text = song.artist,
                        color = Color(0xFFD8B4FE),
                        fontSize = 18.sp,
                        fontWeight = FontWeight.SemiBold,
                        lineHeight = 24.sp,
                        maxLines = 1,
                        overflow = TextOverflow.Ellipsis
                    )

                    Spacer(modifier = Modifier.height(8.dp))

                    Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                        Box(
                            modifier = Modifier
                                .background(Color(0x3310B981), RoundedCornerShape(4.dp))
                                .border(1.dp, Color(0xFF10B981), RoundedCornerShape(4.dp))
                                .padding(horizontal = 8.dp, vertical = 3.dp)
                        ) {
                            Text(
                                text = "320K FLAC LOSSLESS",
                                color = Color(0xFF34D399),
                                fontSize = 10.sp,
                                fontWeight = FontWeight.Black
                            )
                        }

                        Box(
                            modifier = Modifier
                                .background(Color.White.copy(alpha = 0.08f), RoundedCornerShape(4.dp))
                                .padding(horizontal = 8.dp, vertical = 3.dp)
                        ) {
                            Text(
                                text = song.album ?: "Melody TV",
                                color = Color(0xFFD1D5DB),
                                fontSize = 10.sp,
                                fontWeight = FontWeight.Bold,
                                maxLines = 1
                            )
                        }
                    }
                }

                // Right Column: TV Playback Transport Controls + Progress + Up Next
                Column(
                    modifier = Modifier
                        .weight(1f)
                        .fillMaxHeight(),
                    verticalArrangement = Arrangement.SpaceEvenly
                ) {
                    // Transport Buttons Row
                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.Center,
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        // Shuffle Toggle
                        TvControlIconButton(
                            icon = Icons.Default.Shuffle,
                            contentDescription = "Shuffle",
                            tint = if (isShuffle) MelodyPrimary else MelodyTextSecondary,
                            onClick = { MelodyPlayerManager.toggleShuffle() }
                        )

                        Spacer(modifier = Modifier.width(16.dp))

                        // Previous
                        TvControlIconButton(
                            icon = Icons.Default.SkipPrevious,
                            contentDescription = "Previous Song",
                            size = 52.dp,
                            onClick = onPrev
                        )

                        Spacer(modifier = Modifier.width(20.dp))

                        // Big Central Play / Pause Button
                        TvFocusablePlayButton(
                            isPlaying = isPlaying,
                            onClick = onTogglePlay
                        )

                        Spacer(modifier = Modifier.width(20.dp))

                        // Next
                        TvControlIconButton(
                            icon = Icons.Default.SkipNext,
                            contentDescription = "Next Song",
                            size = 52.dp,
                            onClick = onNext
                        )

                        Spacer(modifier = Modifier.width(16.dp))

                        // Repeat
                        TvControlIconButton(
                            icon = when (repeatState) {
                                RepeatState.ONE -> Icons.Default.RepeatOne
                                else -> Icons.Default.Repeat
                            },
                            contentDescription = "Repeat",
                            tint = if (repeatState != RepeatState.OFF) MelodyPrimary else MelodyTextSecondary,
                            onClick = { MelodyPlayerManager.cycleRepeat() }
                        )

                        Spacer(modifier = Modifier.width(16.dp))

                        // Like / Favorite
                        TvControlIconButton(
                            icon = if (isLiked) Icons.Default.Favorite else Icons.Default.FavoriteBorder,
                            contentDescription = "Like",
                            tint = if (isLiked) Color(0xFFEC4899) else MelodyTextSecondary,
                            onClick = { MelodyPlayerManager.toggleLike(song) }
                        )
                    }

                    // Seekable Progress Bar
                    Column(modifier = Modifier.fillMaxWidth()) {
                        val progressFraction = if (durationMs > 0) {
                            (progressMs.toFloat() / durationMs.toFloat()).coerceIn(0f, 1f)
                        } else 0f

                        Slider(
                            value = progressFraction,
                            onValueChange = { frac ->
                                onSeekTo((frac * durationMs).toLong())
                            },
                            colors = SliderDefaults.colors(
                                thumbColor = Color.White,
                                activeTrackColor = MelodyPrimary,
                                inactiveTrackColor = Color.White.copy(alpha = 0.15f)
                            ),
                            modifier = Modifier.fillMaxWidth()
                        )

                        Row(
                            modifier = Modifier.fillMaxWidth(),
                            horizontalArrangement = Arrangement.SpaceBetween
                        ) {
                            Text(
                                text = formatTime(progressMs),
                                color = MelodyTextSecondary,
                                fontSize = 12.sp,
                                fontFamily = androidx.compose.ui.text.font.FontFamily.Monospace
                            )
                            Text(
                                text = formatTime(durationMs),
                                color = MelodyTextSecondary,
                                fontSize = 12.sp,
                                fontFamily = androidx.compose.ui.text.font.FontFamily.Monospace
                            )
                        }
                    }

                    // Up Next Queue Shelf
                    if (upNextSongs.isNotEmpty()) {
                        Column(modifier = Modifier.fillMaxWidth()) {
                            Text(
                                text = "UP NEXT IN QUEUE",
                                color = MelodyTextSecondary,
                                fontSize = 11.sp,
                                fontWeight = FontWeight.Black,
                                letterSpacing = 1.sp
                            )

                            Spacer(modifier = Modifier.height(10.dp))

                            LazyRow(
                                horizontalArrangement = Arrangement.spacedBy(14.dp),
                                modifier = Modifier.fillMaxWidth()
                            ) {
                                items(upNextSongs) { nextSong ->
                                    TvFocusableItem(
                                        onClick = { MelodyPlayerManager.playSong(nextSong) },
                                        modifier = Modifier.width(220.dp),
                                        shape = RoundedCornerShape(10.dp)
                                    ) { isFocused ->
                                        Row(
                                            modifier = Modifier
                                                .fillMaxWidth()
                                                .background(if (isFocused) Color(0xFF222230) else Color(0xFF13131A))
                                                .padding(8.dp),
                                            verticalAlignment = Alignment.CenterVertically,
                                            horizontalArrangement = Arrangement.spacedBy(10.dp)
                                        ) {
                                            AsyncImage(
                                                model = nextSong.getFullCoverUrl(),
                                                contentDescription = nextSong.title,
                                                modifier = Modifier
                                                    .size(46.dp)
                                                    .clip(RoundedCornerShape(6.dp)),
                                                contentScale = ContentScale.Crop
                                            )
                                            Column(modifier = Modifier.weight(1f)) {
                                                Text(
                                                    text = nextSong.title,
                                                    color = Color.White,
                                                    fontSize = 12.sp,
                                                    fontWeight = FontWeight.Bold,
                                                    maxLines = 1,
                                                    overflow = TextOverflow.Ellipsis
                                                )
                                                Text(
                                                    text = nextSong.artist,
                                                    color = MelodyTextSecondary,
                                                    fontSize = 10.sp,
                                                    maxLines = 1,
                                                    overflow = TextOverflow.Ellipsis
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
        }
    }
}

@Composable
fun TvControlIconButton(
    icon: androidx.compose.ui.graphics.vector.ImageVector,
    contentDescription: String,
    size: androidx.compose.ui.unit.Dp = 46.dp,
    tint: Color = Color.White,
    onClick: () -> Unit
) {
    var isFocused by remember { mutableStateOf(false) }
    val scale by animateFloatAsState(if (isFocused) 1.15f else 1.0f, label = "icon_btn_scale")
    val interactionSource = remember { MutableInteractionSource() }

    Box(
        modifier = Modifier
            .size(size)
            .scale(scale)
            .clip(CircleShape)
            .background(if (isFocused) Color.White.copy(alpha = 0.2f) else Color.White.copy(alpha = 0.05f))
            .border(BorderStroke(if (isFocused) 2.dp else 0.dp, Color.White), CircleShape)
            .onFocusChanged { isFocused = it.isFocused }
            .focusable(interactionSource = interactionSource)
            .clickable(interactionSource = interactionSource, indication = null) { onClick() },
        contentAlignment = Alignment.Center
    ) {
        Icon(
            imageVector = icon,
            contentDescription = contentDescription,
            tint = if (isFocused) Color.White else tint,
            modifier = Modifier.size(size * 0.55f)
        )
    }
}

@Composable
fun TvFocusablePlayButton(
    isPlaying: Boolean,
    onClick: () -> Unit
) {
    var isFocused by remember { mutableStateOf(false) }
    val scale by animateFloatAsState(if (isFocused) 1.12f else 1.0f, label = "play_btn_scale")
    val interactionSource = remember { MutableInteractionSource() }

    Box(
        modifier = Modifier
            .size(72.dp)
            .scale(scale)
            .shadow(16.dp, CircleShape, ambientColor = MelodyPrimary, spotColor = MelodyPrimary)
            .clip(CircleShape)
            .background(if (isFocused) Color.White else MelodyPrimary)
            .border(BorderStroke(if (isFocused) 3.dp else 0.dp, MelodyPrimary), CircleShape)
            .onFocusChanged { isFocused = it.isFocused }
            .focusable(interactionSource = interactionSource)
            .clickable(interactionSource = interactionSource, indication = null) { onClick() },
        contentAlignment = Alignment.Center
    ) {
        Icon(
            imageVector = if (isPlaying) Icons.Default.Pause else Icons.Default.PlayArrow,
            contentDescription = if (isPlaying) "Pause" else "Play",
            tint = if (isFocused) Color.Black else Color.White,
            modifier = Modifier.size(40.dp)
        )
    }
}

private fun formatTime(ms: Long): String {
    val totalSeconds = (ms / 1000).coerceAtLeast(0L)
    val minutes = totalSeconds / 60
    val seconds = totalSeconds % 60
    return String.format("%d:%02d", minutes, seconds)
}

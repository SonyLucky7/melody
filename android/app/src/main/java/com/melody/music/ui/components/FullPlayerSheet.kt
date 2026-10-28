package com.melody.music.ui.components

import androidx.compose.animation.core.*
import androidx.compose.foundation.Canvas
import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.draw.rotate
import androidx.compose.ui.draw.shadow
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.StrokeCap
import androidx.compose.ui.graphics.drawscope.Stroke
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import coil.compose.AsyncImage
import com.melody.music.data.download.MelodyDownloadManager
import com.melody.music.data.model.Song
import com.melody.music.player.MelodyPlayerManager
import com.melody.music.player.RepeatState
import com.melody.music.ui.theme.*

private fun formatTime(ms: Long): String {
    val totalSeconds = (ms / 1000).coerceAtLeast(0)
    val minutes = totalSeconds / 60
    val seconds = totalSeconds % 60
    return String.format("%d:%02d", minutes, seconds)
}

enum class PlayerTheme {
    COVER, VINYL, WAVEFORM
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun FullPlayerSheet(
    song: Song?,
    isPlaying: Boolean,
    progressMs: Long,
    durationMs: Long,
    onTogglePlay: () -> Unit,
    onNext: () -> Unit,
    onPrev: () -> Unit,
    onSeekTo: (Long) -> Unit,
    onDismiss: () -> Unit
) {
    if (song == null) return

    val context = LocalContext.current
    var selectedTheme by remember { mutableStateOf(PlayerTheme.COVER) }
    var isEqualizerOpen by remember { mutableStateOf(false) }

    val likedSongIds by MelodyPlayerManager.likedSongIds.collectAsState()
    val isLiked = likedSongIds.contains(song.id)

    val downloadedSongs by MelodyDownloadManager.downloadedSongs.collectAsState()
    val downloadingIds by MelodyDownloadManager.downloadingIds.collectAsState()
    val isDownloaded = downloadedSongs.any { it.songId == song.id }
    val isDownloading = downloadingIds.contains(song.id)

    val shuffleOn by MelodyPlayerManager.isShuffle.collectAsState()
    val repeatState by MelodyPlayerManager.repeatState.collectAsState()

    var sliderValue by remember { mutableFloatStateOf(0f) }
    var isDraggingSlider by remember { mutableStateOf(false) }

    val currentSliderPos = if (isDraggingSlider) {
        sliderValue
    } else {
        if (durationMs > 0) (progressMs.toFloat() / durationMs.toFloat()).coerceIn(0f, 1f) else 0f
    }

    Box(
        modifier = Modifier
            .fillMaxSize()
            .background(
                Brush.verticalGradient(
                    colors = listOf(Color(0xFF28183E), Color(0xFF140D20), MelodyBg)
                )
            )
            .statusBarsPadding()
            .navigationBarsPadding()
            .padding(horizontal = 24.dp, vertical = 12.dp)
    ) {
        Column(
            modifier = Modifier.fillMaxSize(),
            horizontalAlignment = Alignment.CenterHorizontally
        ) {
            // Top Bar
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically
            ) {
                IconButton(onClick = onDismiss) {
                    Icon(
                        imageVector = Icons.Default.KeyboardArrowDown,
                        contentDescription = "Dismiss",
                        tint = Color.White,
                        modifier = Modifier.size(32.dp)
                    )
                }

                // Theme Switcher Segmented Pills
                Row(
                    modifier = Modifier
                        .clip(RoundedCornerShape(20.dp))
                        .background(Color(0x33FFFFFF))
                        .padding(2.dp),
                    horizontalArrangement = Arrangement.spacedBy(2.dp)
                ) {
                    listOf(
                        PlayerTheme.COVER to "Cover",
                        PlayerTheme.VINYL to "Vinyl",
                        PlayerTheme.WAVEFORM to "Wave"
                    ).forEach { (theme, label) ->
                        val isSelected = selectedTheme == theme
                        Box(
                            modifier = Modifier
                                .clip(RoundedCornerShape(18.dp))
                                .background(if (isSelected) MelodyPrimary else Color.Transparent)
                                .clickable { selectedTheme = theme }
                                .padding(horizontal = 12.dp, vertical = 4.dp)
                        ) {
                            Text(
                                text = label,
                                fontSize = 11.sp,
                                fontWeight = FontWeight.Bold,
                                color = if (isSelected) Color.White else MelodyTextSecondary
                            )
                        }
                    }
                }

                // High-Fi 320k badge
                Box(
                    modifier = Modifier
                        .clip(RoundedCornerShape(6.dp))
                        .background(Color(0x33A855F7))
                        .padding(horizontal = 8.dp, vertical = 3.dp)
                ) {
                    Text(
                        text = "320k FLAC",
                        color = MelodyPrimary,
                        fontSize = 11.sp,
                        fontWeight = FontWeight.Bold
                    )
                }
            }

            Spacer(modifier = Modifier.height(16.dp))

            // Main Visual Area (Spotify Cover / Vinyl / Waveform)
            Box(
                modifier = Modifier
                    .weight(1f)
                    .fillMaxWidth(),
                contentAlignment = Alignment.Center
            ) {
                when (selectedTheme) {
                    PlayerTheme.COVER -> {
                        // Spotify Standard Artwork View: Large high-res square with soft shadow
                        AsyncImage(
                            model = song.getFullCoverUrl(),
                            contentDescription = song.title,
                            modifier = Modifier
                                .fillMaxWidth(0.92f)
                                .aspectRatio(1f)
                                .shadow(elevation = 16.dp, shape = RoundedCornerShape(16.dp))
                                .clip(RoundedCornerShape(16.dp)),
                            contentScale = ContentScale.Crop
                        )
                    }
                    PlayerTheme.VINYL -> {
                        VinylTurntableView(
                            song = song,
                            isPlaying = isPlaying
                        )
                    }
                    PlayerTheme.WAVEFORM -> {
                        WaveformAuraView(
                            song = song,
                            isPlaying = isPlaying
                        )
                    }
                }
            }

            Spacer(modifier = Modifier.height(20.dp))

            // Track Details + Heart & Action Buttons
            Row(
                modifier = Modifier.fillMaxWidth(),
                verticalAlignment = Alignment.CenterVertically,
                horizontalArrangement = Arrangement.SpaceBetween
            ) {
                Column(modifier = Modifier.weight(1f)) {
                    Text(
                        text = song.title,
                        fontSize = 22.sp,
                        fontWeight = FontWeight.Bold,
                        color = Color.White,
                        maxLines = 1,
                        overflow = TextOverflow.Ellipsis
                    )
                    Text(
                        text = song.artist,
                        fontSize = 15.sp,
                        color = MelodyTextSecondary,
                        maxLines = 1,
                        overflow = TextOverflow.Ellipsis
                    )
                }

                Row(
                    verticalAlignment = Alignment.CenterVertically,
                    horizontalArrangement = Arrangement.spacedBy(4.dp)
                ) {
                    // Equalizer Button
                    IconButton(onClick = { isEqualizerOpen = true }) {
                        Icon(
                            Icons.Default.Tune,
                            contentDescription = "Equalizer",
                            tint = if (MelodyPlayerManager.eqEnabled.collectAsState().value) MelodyPrimary else MelodyTextSecondary,
                            modifier = Modifier.size(24.dp)
                        )
                    }

                    // Download Offline Button
                    IconButton(
                        onClick = {
                            if (isDownloaded) {
                                MelodyDownloadManager.removeDownload(context, song.id)
                            } else {
                                MelodyDownloadManager.downloadSong(context, song)
                            }
                        }
                    ) {
                        if (isDownloading) {
                            CircularProgressIndicator(
                                modifier = Modifier.size(20.dp),
                                color = MelodyPrimary,
                                strokeWidth = 2.dp
                            )
                        } else {
                            Icon(
                                imageVector = if (isDownloaded) Icons.Default.DownloadDone else Icons.Default.FileDownload,
                                contentDescription = "Download Offline",
                                tint = if (isDownloaded) MelodyOffline else MelodyTextSecondary,
                                modifier = Modifier.size(24.dp)
                            )
                        }
                    }

                    // Like Button (Purple Heart)
                    IconButton(onClick = { MelodyPlayerManager.toggleLike(song) }) {
                        Icon(
                            imageVector = if (isLiked) Icons.Default.Favorite else Icons.Default.FavoriteBorder,
                            contentDescription = "Like",
                            tint = if (isLiked) MelodyPrimary else Color.White,
                            modifier = Modifier.size(26.dp)
                        )
                    }
                }
            }

            Spacer(modifier = Modifier.height(12.dp))

            // Seekbar
            Slider(
                value = currentSliderPos,
                onValueChange = {
                    isDraggingSlider = true
                    sliderValue = it
                },
                onValueChangeFinished = {
                    isDraggingSlider = false
                    onSeekTo((sliderValue * durationMs).toLong())
                },
                modifier = Modifier.fillMaxWidth(),
                colors = SliderDefaults.colors(
                    thumbColor = Color.White,
                    activeTrackColor = MelodyPrimary,
                    inactiveTrackColor = Color(0xFF2A2A3E)
                )
            )

            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween
            ) {
                Text(
                    text = formatTime(if (isDraggingSlider) (sliderValue * durationMs).toLong() else progressMs),
                    color = MelodyTextSecondary,
                    fontSize = 12.sp
                )
                Text(
                    text = formatTime(durationMs),
                    color = MelodyTextSecondary,
                    fontSize = 12.sp
                )
            }

            Spacer(modifier = Modifier.height(16.dp))

            // Playback Controls Row (Shuffle, Prev, Play/Pause, Next, Repeat)
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceEvenly,
                verticalAlignment = Alignment.CenterVertically
            ) {
                // Shuffle
                IconButton(onClick = { MelodyPlayerManager.toggleShuffle() }) {
                    Icon(
                        Icons.Default.Shuffle,
                        contentDescription = "Shuffle",
                        tint = if (shuffleOn) MelodyPrimary else MelodyTextSecondary,
                        modifier = Modifier.size(26.dp)
                    )
                }

                // Previous
                IconButton(onClick = onPrev) {
                    Icon(
                        Icons.Default.SkipPrevious,
                        contentDescription = "Previous",
                        tint = Color.White,
                        modifier = Modifier.size(38.dp)
                    )
                }

                // Play / Pause FAB
                FloatingActionButton(
                    onClick = onTogglePlay,
                    containerColor = MelodyPrimary,
                    contentColor = Color.White,
                    shape = CircleShape,
                    modifier = Modifier.size(68.dp)
                ) {
                    Icon(
                        imageVector = if (isPlaying) Icons.Default.Pause else Icons.Default.PlayArrow,
                        contentDescription = if (isPlaying) "Pause" else "Play",
                        modifier = Modifier.size(38.dp)
                    )
                }

                // Next
                IconButton(onClick = onNext) {
                    Icon(
                        Icons.Default.SkipNext,
                        contentDescription = "Next",
                        tint = Color.White,
                        modifier = Modifier.size(38.dp)
                    )
                }

                // Repeat (Off, All, One)
                IconButton(onClick = { MelodyPlayerManager.cycleRepeat() }) {
                    when (repeatState) {
                        RepeatState.OFF -> Icon(
                            Icons.Default.Repeat,
                            contentDescription = "Repeat Off",
                            tint = MelodyTextSecondary,
                            modifier = Modifier.size(26.dp)
                        )
                        RepeatState.ALL -> Icon(
                            Icons.Default.Repeat,
                            contentDescription = "Repeat All",
                            tint = MelodyPrimary,
                            modifier = Modifier.size(26.dp)
                        )
                        RepeatState.ONE -> Icon(
                            Icons.Default.RepeatOne,
                            contentDescription = "Repeat One",
                            tint = MelodyPrimary,
                            modifier = Modifier.size(26.dp)
                        )
                    }
                }
            }

            Spacer(modifier = Modifier.height(16.dp))
        }

        // Equalizer Modal Sheet
        if (isEqualizerOpen) {
            EqualizerSheet(onDismiss = { isEqualizerOpen = false })
        }
    }
}

@Composable
fun VinylTurntableView(
    song: Song,
    isPlaying: Boolean
) {
    val infiniteTransition = rememberInfiniteTransition()
    val rotation by infiniteTransition.animateFloat(
        initialValue = 0f,
        targetValue = 360f,
        animationSpec = infiniteRepeatable(
            animation = tween(durationMillis = 3000, easing = LinearEasing),
            repeatMode = RepeatMode.Restart
        )
    )

    val tonearmAngle by animateFloatAsState(
        targetValue = if (isPlaying) 22f else 0f,
        animationSpec = spring(stiffness = Spring.StiffnessLow)
    )

    Box(
        modifier = Modifier
            .fillMaxWidth(0.92f)
            .aspectRatio(1f),
        contentAlignment = Alignment.Center
    ) {
        // Vinyl Record Disc
        Box(
            modifier = Modifier
                .fillMaxSize(0.85f)
                .rotate(if (isPlaying) rotation else 0f)
                .clip(CircleShape)
                .background(Color(0xFF141418)),
            contentAlignment = Alignment.Center
        ) {
            Canvas(modifier = Modifier.fillMaxSize()) {
                val center = Offset(size.width / 2f, size.height / 2f)
                val maxR = size.width / 2f
                val grooveColor = Color(0x22FFFFFF)
                val highlightColor = Color(0x18A855F7)

                for (r in listOf(0.94f, 0.88f, 0.82f, 0.76f, 0.70f, 0.64f, 0.58f, 0.52f)) {
                    drawCircle(
                        color = grooveColor,
                        radius = maxR * r,
                        center = center,
                        style = Stroke(width = 1.2f)
                    )
                }

                // Vinyl sheen
                drawCircle(
                    brush = Brush.sweepGradient(
                        colors = listOf(
                            Color.Transparent,
                            highlightColor,
                            Color.Transparent,
                            highlightColor,
                            Color.Transparent
                        ),
                        center = center
                    ),
                    radius = maxR,
                    center = center
                )
            }

            // Center Record Label (Song Artwork)
            Box(
                modifier = Modifier
                    .fillMaxSize(0.42f)
                    .clip(CircleShape)
                    .background(Color(0xFF222230)),
                contentAlignment = Alignment.Center
            ) {
                AsyncImage(
                    model = song.getFullCoverUrl(),
                    contentDescription = song.title,
                    modifier = Modifier
                        .fillMaxSize()
                        .clip(CircleShape),
                    contentScale = ContentScale.Crop
                )

                // Center Spindle Hole
                Box(
                    modifier = Modifier
                        .size(14.dp)
                        .clip(CircleShape)
                        .background(Color(0xFF0F0F13))
                )
            }
        }

        // Mechanical Tonearm
        Box(
            modifier = Modifier
                .fillMaxSize()
                .padding(top = 10.dp, end = 12.dp),
            contentAlignment = Alignment.TopEnd
        ) {
            Canvas(
                modifier = Modifier
                    .size(90.dp, 150.dp)
                    .rotate(tonearmAngle)
            ) {
                // Pivot base
                drawCircle(
                    color = Color(0xFF6B7280),
                    radius = 14f,
                    center = Offset(size.width - 18f, 18f)
                )
                drawCircle(
                    color = MelodyPrimary,
                    radius = 7f,
                    center = Offset(size.width - 18f, 18f)
                )

                // Arm bar
                drawLine(
                    color = Color(0xFFE5E7EB),
                    start = Offset(size.width - 18f, 18f),
                    end = Offset(18f, size.height - 24f),
                    strokeWidth = 5f,
                    cap = StrokeCap.Round
                )

                // Cartridge / Stylus head
                drawRoundRect(
                    color = MelodyPrimary,
                    topLeft = Offset(8f, size.height - 34f),
                    size = androidx.compose.ui.geometry.Size(20f, 28f),
                    cornerRadius = androidx.compose.ui.geometry.CornerRadius(4f, 4f)
                )
            }
        }
    }
}

@Composable
fun WaveformAuraView(
    song: Song,
    isPlaying: Boolean
) {
    val infiniteTransition = rememberInfiniteTransition()
    val pulse by infiniteTransition.animateFloat(
        initialValue = 0.88f,
        targetValue = 1.12f,
        animationSpec = infiniteRepeatable(
            animation = tween(durationMillis = 1400, easing = FastOutSlowInEasing),
            repeatMode = RepeatMode.Reverse
        )
    )

    Box(
        modifier = Modifier
            .fillMaxWidth()
            .aspectRatio(1f),
        contentAlignment = Alignment.Center
    ) {
        Canvas(modifier = Modifier.fillMaxSize()) {
            val center = Offset(size.width / 2f, size.height / 2f)
            val baseRadius = (size.width / 3f) * (if (isPlaying) pulse else 1f)

            for (i in 1..4) {
                drawCircle(
                    color = MelodyPrimary.copy(alpha = 0.15f / i),
                    radius = baseRadius + (i * 22f),
                    center = center
                )
            }
        }

        AsyncImage(
            model = song.getFullCoverUrl(),
            contentDescription = song.title,
            modifier = Modifier
                .fillMaxSize(0.6f)
                .clip(CircleShape),
            contentScale = ContentScale.Crop
        )
    }
}

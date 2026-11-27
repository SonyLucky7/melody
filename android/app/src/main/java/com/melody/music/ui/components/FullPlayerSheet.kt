package com.melody.music.ui.components

import androidx.compose.animation.core.*
import androidx.compose.foundation.Canvas
import androidx.compose.foundation.background
import androidx.compose.foundation.border
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
import androidx.compose.ui.draw.alpha
import androidx.compose.ui.draw.blur
import androidx.compose.ui.draw.clip
import androidx.compose.ui.draw.rotate
import androidx.compose.ui.draw.scale
import androidx.compose.ui.draw.shadow
import androidx.compose.ui.geometry.CornerRadius
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.geometry.Size
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.Path
import androidx.compose.ui.graphics.StrokeCap
import androidx.compose.ui.graphics.TransformOrigin
import androidx.compose.ui.graphics.drawscope.Stroke
import androidx.compose.ui.graphics.graphicsLayer
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
import kotlin.math.PI
import kotlin.math.abs
import kotlin.math.cos
import kotlin.math.sin

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
    val eqEnabled by MelodyPlayerManager.eqEnabled.collectAsState()

    val downloadedSongs by MelodyDownloadManager.downloadedSongs.collectAsState()
    val downloadingIds by MelodyDownloadManager.downloadingIds.collectAsState()
    val downloadProgressMap by MelodyDownloadManager.downloadProgress.collectAsState()
    val isBuffering by MelodyPlayerManager.isBuffering.collectAsState()
    val playbackError by MelodyPlayerManager.playbackError.collectAsState()
    val isDownloaded = downloadedSongs.any { it.songId == song.id }
    val isDownloading = downloadingIds.contains(song.id)
    val downloadPct = downloadProgressMap[song.id]

    val shuffleOn by MelodyPlayerManager.isShuffle.collectAsState()
    val repeatState by MelodyPlayerManager.repeatState.collectAsState()

    var sliderValue by remember { mutableFloatStateOf(0f) }
    var isDraggingSlider by remember { mutableStateOf(false) }

    val currentSliderPos = if (isDraggingSlider) {
        sliderValue
    } else {
        if (durationMs > 0) (progressMs.toFloat() / durationMs.toFloat()).coerceIn(0f, 1f) else 0f
    }

    val coverScale by animateFloatAsState(
        targetValue = if (isPlaying) 1f else 0.93f,
        animationSpec = spring(dampingRatio = 0.8f, stiffness = Spring.StiffnessLow),
        label = "cover_scale"
    )

    Box(
        modifier = Modifier
            .fillMaxSize()
            .background(Color(0xFF09090B))
    ) {
        // 1. Real Ambient Album-Art Studio Backdrop (adapts organically to every song cover!)
        AsyncImage(
            model = song.getFullCoverUrl(),
            contentDescription = null,
            modifier = Modifier
                .fillMaxSize()
                .scale(1.35f)
                .blur(48.dp)
                .alpha(0.36f),
            contentScale = ContentScale.Crop
        )
        Box(
            modifier = Modifier
                .fillMaxSize()
                .background(
                    Brush.verticalGradient(
                        colors = listOf(
                            Color(0xA609090B),
                            Color(0xCC09090B),
                            Color(0xF5070709)
                        )
                    )
                )
        )

        Column(
            modifier = Modifier
                .fillMaxSize()
                .statusBarsPadding()
                .navigationBarsPadding()
                .padding(horizontal = 24.dp, vertical = 12.dp),
            horizontalAlignment = Alignment.CenterHorizontally
        ) {
            // Top Editorial Header
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
                        modifier = Modifier.size(30.dp)
                    )
                }

                // Clean Monochrome Segmented Switcher
                Row(
                    modifier = Modifier
                        .clip(RoundedCornerShape(22.dp))
                        .background(Color(0x16FFFFFF))
                        .border(1.dp, Color(0x18FFFFFF), RoundedCornerShape(22.dp))
                        .padding(3.dp),
                    horizontalArrangement = Arrangement.spacedBy(2.dp)
                ) {
                    listOf(
                        PlayerTheme.COVER to "Cover",
                        PlayerTheme.VINYL to "Vinyl",
                        PlayerTheme.WAVEFORM to "Studio"
                    ).forEach { (theme, label) ->
                        val isSelected = selectedTheme == theme
                        Box(
                            modifier = Modifier
                                .clip(RoundedCornerShape(18.dp))
                                .background(if (isSelected) Color.White else Color.Transparent)
                                .clickable { selectedTheme = theme }
                                .padding(horizontal = 13.dp, vertical = 5.dp)
                        ) {
                            Text(
                                text = label,
                                fontSize = 11.sp,
                                fontWeight = FontWeight.SemiBold,
                                color = if (isSelected) Color(0xFF09090B) else Color(0xB3FFFFFF)
                            )
                        }
                    }
                }

                // Subtle Studio Audio Badge
                Box(
                    modifier = Modifier
                        .clip(RoundedCornerShape(8.dp))
                        .background(Color(0x14FFFFFF))
                        .border(1.dp, Color(0x1AFFFFFF), RoundedCornerShape(8.dp))
                        .padding(horizontal = 8.dp, vertical = 4.dp)
                ) {
                    Text(
                        text = "320K",
                        color = Color(0xCCFFFFFF),
                        fontSize = 10.sp,
                        fontWeight = FontWeight.Bold,
                        letterSpacing = 0.8.sp
                    )
                }
            }

            Spacer(modifier = Modifier.height(14.dp))

            // Main Visual Stage (Cover / Audiophile Vinyl / Studio Spectrum)
            Box(
                modifier = Modifier
                    .weight(1f)
                    .fillMaxWidth(),
                contentAlignment = Alignment.Center
            ) {
                when (selectedTheme) {
                    PlayerTheme.COVER -> {
                        AsyncImage(
                            model = song.getFullCoverUrl(),
                            contentDescription = song.title,
                            modifier = Modifier
                                .fillMaxWidth(0.90f)
                                .aspectRatio(1f)
                                .scale(coverScale)
                                .shadow(elevation = 24.dp, shape = RoundedCornerShape(18.dp))
                                .clip(RoundedCornerShape(18.dp))
                                .border(1.dp, Color(0x24FFFFFF), RoundedCornerShape(18.dp)),
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

            Spacer(modifier = Modifier.height(18.dp))

            // Track Details + Tactile Actions
            Row(
                modifier = Modifier.fillMaxWidth(),
                verticalAlignment = Alignment.CenterVertically,
                horizontalArrangement = Arrangement.SpaceBetween
            ) {
                Column(modifier = Modifier.weight(1f)) {
                    Text(
                        text = song.title,
                        fontSize = 23.sp,
                        fontWeight = FontWeight.Bold,
                        color = Color.White,
                        maxLines = 1,
                        overflow = TextOverflow.Ellipsis
                    )
                    Spacer(modifier = Modifier.height(2.dp))
                    Text(
                        text = song.artist,
                        fontSize = 15.sp,
                        color = Color(0xA6FFFFFF),
                        maxLines = 1,
                        overflow = TextOverflow.Ellipsis
                    )
                }

                Row(
                    verticalAlignment = Alignment.CenterVertically,
                    horizontalArrangement = Arrangement.spacedBy(2.dp)
                ) {
                    IconButton(onClick = { isEqualizerOpen = true }) {
                        Icon(
                            Icons.Default.Tune,
                            contentDescription = "Equalizer",
                            tint = if (eqEnabled) Color.White else Color(0x88FFFFFF),
                            modifier = Modifier.size(23.dp)
                        )
                    }

                    // Offline Download (Android Exclusive)
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
                            Box(contentAlignment = Alignment.Center) {
                                CircularProgressIndicator(
                                    modifier = Modifier.size(22.dp),
                                    color = Color.White,
                                    strokeWidth = 2.dp
                                )
                                if (downloadPct != null) {
                                    Text(
                                        text = "$downloadPct",
                                        fontSize = 7.sp,
                                        fontWeight = FontWeight.Bold,
                                        color = Color.White
                                    )
                                }
                            }
                        } else {
                            Icon(
                                imageVector = if (isDownloaded) Icons.Default.DownloadDone else Icons.Default.FileDownload,
                                contentDescription = "Download Offline",
                                tint = if (isDownloaded) MelodyOffline else Color(0x88FFFFFF),
                                modifier = Modifier.size(23.dp)
                            )
                        }
                    }

                    // Like Button
                    IconButton(onClick = { MelodyPlayerManager.toggleLike(song) }) {
                        Icon(
                            imageVector = if (isLiked) Icons.Default.Favorite else Icons.Default.FavoriteBorder,
                            contentDescription = "Like",
                            tint = if (isLiked) Color(0xFFFB7185) else Color(0xCCFFFFFF),
                            modifier = Modifier.size(25.dp)
                        )
                    }
                }
            }

            Spacer(modifier = Modifier.height(10.dp))

            if (playbackError != null) {
                Row(
                    modifier = Modifier
                        .fillMaxWidth()
                        .clip(RoundedCornerShape(10.dp))
                        .background(Color(0x33EF4444))
                        .clickable { onTogglePlay() }
                        .padding(horizontal = 12.dp, vertical = 8.dp),
                    verticalAlignment = Alignment.CenterVertically,
                    horizontalArrangement = Arrangement.spacedBy(8.dp)
                ) {
                    Icon(
                        imageVector = Icons.Default.ErrorOutline,
                        contentDescription = "Playback Error",
                        tint = Color(0xFFFCA5A5),
                        modifier = Modifier.size(18.dp)
                    )
                    Text(
                        text = "$playbackError • Tap Play to retry",
                        color = Color(0xFFFECACA),
                        fontSize = 12.sp,
                        maxLines = 2,
                        overflow = TextOverflow.Ellipsis
                    )
                }
                Spacer(modifier = Modifier.height(8.dp))
            }

            // Crisp Monochrome Scrubber
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
                    activeTrackColor = Color.White,
                    inactiveTrackColor = Color(0x2EFFFFFF)
                )
            )

            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween
            ) {
                Text(
                    text = formatTime(if (isDraggingSlider) (sliderValue * durationMs).toLong() else progressMs),
                    color = Color(0x80FFFFFF),
                    fontSize = 11.sp,
                    fontWeight = FontWeight.Medium
                )
                Text(
                    text = formatTime(durationMs),
                    color = Color(0x80FFFFFF),
                    fontSize = 11.sp,
                    fontWeight = FontWeight.Medium
                )
            }

            Spacer(modifier = Modifier.height(14.dp))

            // High-Contrast Monochrome Transport Row
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceEvenly,
                verticalAlignment = Alignment.CenterVertically
            ) {
                IconButton(onClick = { MelodyPlayerManager.toggleShuffle() }) {
                    Icon(
                        Icons.Default.Shuffle,
                        contentDescription = "Shuffle",
                        tint = if (shuffleOn) Color.White else Color(0x66FFFFFF),
                        modifier = Modifier.size(24.dp)
                    )
                }

                IconButton(onClick = onPrev) {
                    Icon(
                        Icons.Default.SkipPrevious,
                        contentDescription = "Previous",
                        tint = Color.White,
                        modifier = Modifier.size(38.dp)
                    )
                }

                // Pure White Tactile Play / Pause FAB
                FloatingActionButton(
                    onClick = onTogglePlay,
                    containerColor = Color.White,
                    contentColor = Color(0xFF09090B),
                    shape = CircleShape,
                    modifier = Modifier.size(66.dp)
                ) {
                    if (isBuffering) {
                        CircularProgressIndicator(
                            modifier = Modifier.size(28.dp),
                            color = Color(0xFF09090B),
                            strokeWidth = 3.dp
                        )
                    } else {
                        Icon(
                            imageVector = if (isPlaying) Icons.Default.Pause else Icons.Default.PlayArrow,
                            contentDescription = if (isPlaying) "Pause" else "Play",
                            modifier = Modifier.size(36.dp)
                        )
                    }
                }

                IconButton(onClick = onNext) {
                    Icon(
                        Icons.Default.SkipNext,
                        contentDescription = "Next",
                        tint = Color.White,
                        modifier = Modifier.size(38.dp)
                    )
                }

                IconButton(onClick = { MelodyPlayerManager.cycleRepeat() }) {
                    when (repeatState) {
                        RepeatState.OFF -> Icon(
                            Icons.Default.Repeat,
                            contentDescription = "Repeat Off",
                            tint = Color(0x66FFFFFF),
                            modifier = Modifier.size(24.dp)
                        )
                        RepeatState.ALL -> Icon(
                            Icons.Default.Repeat,
                            contentDescription = "Repeat All",
                            tint = Color.White,
                            modifier = Modifier.size(24.dp)
                        )
                        RepeatState.ONE -> Icon(
                            Icons.Default.RepeatOne,
                            contentDescription = "Repeat One",
                            tint = Color.White,
                            modifier = Modifier.size(24.dp)
                        )
                    }
                }
            }

            Spacer(modifier = Modifier.height(14.dp))
        }

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
    val infiniteTransition = rememberInfiniteTransition(label = "vinyl_spin")
    val rotation by infiniteTransition.animateFloat(
        initialValue = 0f,
        targetValue = 360f,
        animationSpec = infiniteRepeatable(
            animation = tween(durationMillis = 10500, easing = LinearEasing),
            repeatMode = RepeatMode.Restart
        ),
        label = "vinyl_angle"
    )

    val tonearmAngle by animateFloatAsState(
        targetValue = if (isPlaying) 20f else 0f,
        animationSpec = spring(dampingRatio = 0.78f, stiffness = Spring.StiffnessVeryLow),
        label = "tonearm_angle"
    )

    Box(
        modifier = Modifier
            .fillMaxWidth(0.94f)
            .aspectRatio(1f),
        contentAlignment = Alignment.Center
    ) {
        // Outer Brushed Platter Lip
        Box(
            modifier = Modifier
                .fillMaxSize(0.86f)
                .shadow(28.dp, CircleShape)
                .clip(CircleShape)
                .background(
                    Brush.linearGradient(
                        colors = listOf(Color(0xFF3F3F46), Color(0xFF18181B), Color(0xFF09090B))
                    )
                )
                .padding(4.dp),
            contentAlignment = Alignment.Center
        ) {
            // Spinning 180g Pressed Vinyl Disc + Paper Label
            Box(
                modifier = Modifier
                    .fillMaxSize()
                    .rotate(if (isPlaying) rotation else 0f)
                    .clip(CircleShape)
                    .background(Color(0xFF0C0C0E)),
                contentAlignment = Alignment.Center
            ) {
                Canvas(modifier = Modifier.fillMaxSize()) {
                    val center = Offset(size.width / 2f, size.height / 2f)
                    val maxR = size.width / 2f
                    val grooveRadii = listOf(
                        0.96f, 0.93f, 0.90f, 0.87f, 0.84f, 0.81f,
                        0.76f, 0.73f, 0.70f, 0.67f, 0.64f, 0.61f,
                        0.56f, 0.53f, 0.50f, 0.47f, 0.43f
                    )
                    grooveRadii.forEachIndexed { idx, frac ->
                        drawCircle(
                            color = if (idx % 3 == 0) Color(0x16FFFFFF) else Color(0x0BFFFFFF),
                            radius = maxR * frac,
                            center = center,
                            style = Stroke(width = 1.1f)
                        )
                    }
                }

                // Matte Paper Center Label (zero purple border)
                Box(
                    modifier = Modifier
                        .fillMaxSize(0.37f)
                        .clip(CircleShape)
                        .border(2.dp, Color(0xCC000000), CircleShape),
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
                }
            }

            // STATIONARY Anisotropic Studio Light Reflection (does NOT rotate with disc)
            Canvas(modifier = Modifier.fillMaxSize()) {
                val center = Offset(size.width / 2f, size.height / 2f)
                val maxR = size.width / 2f
                drawCircle(
                    brush = Brush.sweepGradient(
                        colorStops = arrayOf(
                            0.00f to Color.Transparent,
                            0.07f to Color(0x28FFFFFF),
                            0.14f to Color.Transparent,
                            0.50f to Color.Transparent,
                            0.57f to Color(0x20FFFFFF),
                            0.64f to Color.Transparent,
                            1.00f to Color.Transparent
                        ),
                        center = center
                    ),
                    radius = maxR * 0.96f,
                    center = center,
                    style = Stroke(width = maxR * 0.54f)
                )
            }

            // Stationary Brushed Steel Center Spindle
            Box(
                modifier = Modifier
                    .size(16.dp)
                    .clip(CircleShape)
                    .background(Color(0xFF09090B))
                    .border(1.dp, Color(0x33FFFFFF), CircleShape),
                contentAlignment = Alignment.Center
            ) {
                Box(
                    modifier = Modifier
                        .size(8.dp)
                        .clip(CircleShape)
                        .background(
                            Brush.radialGradient(
                                colors = listOf(Color(0xFFF4F4F5), Color(0xFF71717A), Color(0xFF27272A))
                            )
                        )
                )
            }
        }

        // Precision Brushed-Titanium S-Curved Tonearm (cleanly pivoted around real bearing center)
        Box(
            modifier = Modifier
                .fillMaxSize()
                .padding(top = 6.dp, end = 2.dp),
            contentAlignment = Alignment.TopEnd
        ) {
            Canvas(
                modifier = Modifier
                    .size(104.dp, 210.dp)
                    .graphicsLayer {
                        transformOrigin = TransformOrigin(0.76f, 0.19f)
                        rotationZ = tonearmAngle
                    }
            ) {
                val px = size.width * 0.76f
                val py = size.height * 0.19f

                // Gimbal base ring
                drawCircle(
                    brush = Brush.radialGradient(
                        colors = listOf(Color(0xFF52525B), Color(0xFF18181B)),
                        center = Offset(px, py),
                        radius = 34f
                    ),
                    radius = 32f,
                    center = Offset(px, py)
                )
                drawCircle(
                    color = Color(0x33FFFFFF),
                    radius = 32f,
                    center = Offset(px, py),
                    style = Stroke(width = 2f)
                )

                // Counterweight cylinder behind pivot
                drawRoundRect(
                    color = Color(0xFF27272A),
                    topLeft = Offset(px - 11f, py - 46f),
                    size = Size(22f, 28f),
                    cornerRadius = CornerRadius(5f, 5f)
                )

                // S-curved brushed titanium arm tube
                val armPath = Path().apply {
                    moveTo(px, py - 18f)
                    lineTo(px, py)
                    cubicTo(
                        px, size.height * 0.48f,
                        px + 6f, size.height * 0.66f,
                        size.width * 0.34f, size.height * 0.86f
                    )
                }
                drawPath(
                    path = armPath,
                    brush = Brush.linearGradient(
                        colors = listOf(Color(0xFFF4F4F5), Color(0xFFA1A1AA), Color(0xFFE4E4E7))
                    ),
                    style = Stroke(width = 7f, cap = StrokeCap.Round)
                )

                // Gimbal bearing cap
                drawCircle(color = Color(0xFFE4E4E7), radius = 10f, center = Offset(px, py))
                drawCircle(color = Color(0xFF18181B), radius = 5f, center = Offset(px, py))

                // Matte SME headshell at arm tip
                drawRoundRect(
                    color = Color(0xFF27272A),
                    topLeft = Offset(size.width * 0.24f, size.height * 0.83f),
                    size = Size(22f, 34f),
                    cornerRadius = CornerRadius(5f, 5f)
                )
                drawRoundRect(
                    color = Color(0x55FFFFFF),
                    topLeft = Offset(size.width * 0.24f, size.height * 0.83f),
                    size = Size(22f, 34f),
                    cornerRadius = CornerRadius(5f, 5f),
                    style = Stroke(width = 1.5f)
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
    val infiniteTransition = rememberInfiniteTransition(label = "studio_spectrum")
    val phase by infiniteTransition.animateFloat(
        initialValue = 0f,
        targetValue = (2.0 * PI).toFloat(),
        animationSpec = infiniteRepeatable(
            animation = tween(durationMillis = 2200, easing = LinearEasing),
            repeatMode = RepeatMode.Restart
        ),
        label = "spectrum_phase"
    )

    Column(
        modifier = Modifier.fillMaxWidth(),
        horizontalAlignment = Alignment.CenterHorizontally,
        verticalArrangement = Arrangement.spacedBy(26.dp)
    ) {
        AsyncImage(
            model = song.getFullCoverUrl(),
            contentDescription = song.title,
            modifier = Modifier
                .fillMaxWidth(0.62f)
                .aspectRatio(1f)
                .shadow(22.dp, RoundedCornerShape(18.dp))
                .clip(RoundedCornerShape(18.dp))
                .border(1.dp, Color(0x26FFFFFF), RoundedCornerShape(18.dp)),
            contentScale = ContentScale.Crop
        )

        // Precision 28-bar Monochrome Studio Spectrum Equalizer
        Canvas(
            modifier = Modifier
                .fillMaxWidth(0.92f)
                .height(68.dp)
        ) {
            val barCount = 28
            val spacing = size.width / barCount
            val barW = spacing * 0.48f
            val maxH = size.height * 0.88f

            for (i in 0 until barCount) {
                val normCenter = abs(i - (barCount - 1) / 2f) / (barCount / 2f)
                val envelope = (1f - normCenter * 0.65f).coerceAtLeast(0.22f)
                val h = if (isPlaying) {
                    val w1 = (sin(phase + i * 0.45f) * 0.5f + 0.5f)
                    val w2 = (cos(phase * 1.5f - i * 0.30f) * 0.5f + 0.5f)
                    (8f + (w1 * 0.6f + w2 * 0.4f) * maxH * envelope).coerceAtMost(maxH)
                } else {
                    10f * envelope
                }
                val x = i * spacing + (spacing - barW) / 2f
                drawRoundRect(
                    brush = Brush.verticalGradient(
                        colors = listOf(Color.White, Color(0x55FFFFFF)),
                        startY = size.height - h,
                        endY = size.height
                    ),
                    topLeft = Offset(x, size.height - h),
                    size = Size(barW, h),
                    cornerRadius = CornerRadius(barW / 2f, barW / 2f)
                )
            }
        }
    }
}

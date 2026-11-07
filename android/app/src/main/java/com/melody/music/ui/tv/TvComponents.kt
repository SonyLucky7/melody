package com.melody.music.ui.tv

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
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.PlayArrow
import androidx.compose.material3.Icon
import androidx.compose.material3.Text
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
import com.melody.music.data.model.Playlist
import com.melody.music.data.model.Song
import com.melody.music.ui.theme.MelodyCard
import com.melody.music.ui.theme.MelodyPrimary
import com.melody.music.ui.theme.MelodyTextSecondary

/**
 * Base focusable card container for Android TV D-Pad remote navigation.
 * Scales up smoothly and draws a high-contrast glowing border on focus.
 */
@Composable
fun TvFocusableItem(
    onClick: () -> Unit,
    modifier: Modifier = Modifier,
    shape: androidx.compose.ui.graphics.Shape = RoundedCornerShape(12.dp),
    focusedScale: Float = 1.04f,
    content: @Composable (isFocused: Boolean) -> Unit
) {
    var isFocused by remember { mutableStateOf(false) }
    val scale by animateFloatAsState(
        targetValue = if (isFocused) focusedScale else 1.0f,
        animationSpec = tween(durationMillis = 200),
        label = "tv_card_scale"
    )
    val borderColor by animateColorAsState(
        targetValue = if (isFocused) Color.White else Color.Transparent,
        animationSpec = tween(durationMillis = 200),
        label = "tv_card_border"
    )
    val interactionSource = remember { MutableInteractionSource() }

    Box(
        modifier = modifier
            .scale(scale)
            .shadow(
                elevation = if (isFocused) 14.dp else 4.dp,
                shape = shape,
                ambientColor = if (isFocused) MelodyPrimary else Color.Black,
                spotColor = if (isFocused) MelodyPrimary else Color.Black
            )
            .clip(shape)
            .border(BorderStroke(if (isFocused) 2.5.dp else 0.dp, borderColor), shape)
            .onFocusChanged { isFocused = it.isFocused }
            .focusable(interactionSource = interactionSource)
            .clickable(interactionSource = interactionSource, indication = null) { onClick() }
    ) {
        content(isFocused)
    }
}

/**
 * Spotify-Style TV Song Card for horizontal carousels.
 */
@Composable
fun TvSongCard(
    song: Song,
    onClick: () -> Unit,
    modifier: Modifier = Modifier
) {
    TvFocusableItem(
        onClick = onClick,
        modifier = modifier.width(180.dp),
        shape = RoundedCornerShape(12.dp)
    ) { isFocused ->
        Column(
            modifier = Modifier
                .fillMaxWidth()
                .background(if (isFocused) Color(0xFF22222E) else Color(0xFF14141C))
                .padding(10.dp)
        ) {
            Box(
                modifier = Modifier
                    .size(160.dp)
                    .clip(RoundedCornerShape(8.dp))
                    .background(MelodyCard)
            ) {
                AsyncImage(
                    model = song.getFullCoverUrl(),
                    contentDescription = song.title,
                    modifier = Modifier.fillMaxSize(),
                    contentScale = ContentScale.Crop
                )

                // Play overlay on focus
                if (isFocused) {
                    Box(
                        modifier = Modifier
                            .fillMaxSize()
                            .background(Color.Black.copy(alpha = 0.35f)),
                        contentAlignment = Alignment.Center
                    ) {
                        Box(
                            modifier = Modifier
                                .size(44.dp)
                                .clip(CircleShape)
                                .background(MelodyPrimary),
                            contentAlignment = Alignment.Center
                        ) {
                            Icon(
                                imageVector = Icons.Default.PlayArrow,
                                contentDescription = "Play",
                                tint = Color.White,
                                modifier = Modifier.size(28.dp)
                            )
                        }
                    }
                }

                // 320k Lossless Badge
                Box(
                    modifier = Modifier
                        .align(Alignment.BottomEnd)
                        .padding(6.dp)
                        .background(Color.Black.copy(alpha = 0.75f), RoundedCornerShape(4.dp))
                        .padding(horizontal = 5.dp, vertical = 2.dp)
                ) {
                    Text(
                        text = "320K",
                        color = Color(0xFF34D399),
                        fontSize = 9.sp,
                        fontWeight = FontWeight.Black
                    )
                }
            }

            Spacer(modifier = Modifier.height(10.dp))

            Text(
                text = song.title,
                color = if (isFocused) Color.White else Color(0xFFE5E7EB),
                fontSize = 14.sp,
                fontWeight = FontWeight.Bold,
                lineHeight = 19.sp,
                maxLines = 1,
                overflow = TextOverflow.Ellipsis
            )

            Spacer(modifier = Modifier.height(2.dp))

            Text(
                text = song.artist,
                color = if (isFocused) Color(0xFFD8B4FE) else MelodyTextSecondary,
                fontSize = 12.sp,
                lineHeight = 16.sp,
                maxLines = 1,
                overflow = TextOverflow.Ellipsis
            )
        }
    }
}

/**
 * Spotify-Style TV Playlist Card.
 */
@Composable
fun TvPlaylistCard(
    playlist: Playlist,
    onClick: () -> Unit,
    modifier: Modifier = Modifier
) {
    TvFocusableItem(
        onClick = onClick,
        modifier = modifier.width(200.dp),
        shape = RoundedCornerShape(14.dp)
    ) { isFocused ->
        Column(
            modifier = Modifier
                .fillMaxWidth()
                .background(if (isFocused) Color(0xFF22222E) else Color(0xFF14141C))
                .padding(12.dp)
        ) {
            Box(
                modifier = Modifier
                    .size(176.dp)
                    .clip(RoundedCornerShape(10.dp))
                    .background(MelodyCard)
            ) {
                AsyncImage(
                    model = playlist.coverUrl ?: "https://melody-chi-nine.vercel.app/Melody-Logo-512.png",
                    contentDescription = playlist.name,
                    modifier = Modifier.fillMaxSize(),
                    contentScale = ContentScale.Crop
                )

                if (isFocused) {
                    Box(
                        modifier = Modifier
                            .fillMaxSize()
                            .background(Color.Black.copy(alpha = 0.35f)),
                        contentAlignment = Alignment.Center
                    ) {
                        Box(
                            modifier = Modifier
                                .size(48.dp)
                                .clip(CircleShape)
                                .background(MelodyPrimary),
                            contentAlignment = Alignment.Center
                        ) {
                            Icon(
                                imageVector = Icons.Default.PlayArrow,
                                contentDescription = "Play",
                                tint = Color.White,
                                modifier = Modifier.size(30.dp)
                            )
                        }
                    }
                }
            }

            Spacer(modifier = Modifier.height(10.dp))

            Text(
                text = playlist.name,
                color = Color.White,
                fontSize = 14.sp,
                fontWeight = FontWeight.Bold,
                lineHeight = 19.sp,
                maxLines = 1,
                overflow = TextOverflow.Ellipsis
            )

            Spacer(modifier = Modifier.height(2.dp))

            Text(
                text = playlist.description ?: "${playlist.totalSongs ?: 0} tracks • Lossless",
                color = if (isFocused) Color(0xFFD8B4FE) else MelodyTextSecondary,
                fontSize = 11.sp,
                lineHeight = 15.sp,
                maxLines = 2,
                overflow = TextOverflow.Ellipsis
            )
        }
    }
}

/**
 * Spotify-Style TV Artist Circle Card.
 */
@Composable
fun TvArtistCard(
    name: String,
    imageUrl: String,
    rank: String,
    onClick: () -> Unit,
    modifier: Modifier = Modifier
) {
    TvFocusableItem(
        onClick = onClick,
        modifier = modifier.width(160.dp),
        shape = RoundedCornerShape(16.dp)
    ) { isFocused ->
        Column(
            horizontalAlignment = Alignment.CenterHorizontally,
            modifier = Modifier
                .fillMaxWidth()
                .background(if (isFocused) Color(0xFF22222E) else Color(0xFF14141C))
                .padding(12.dp)
        ) {
            AsyncImage(
                model = imageUrl,
                contentDescription = name,
                modifier = Modifier
                    .size(130.dp)
                    .clip(CircleShape)
                    .border(
                        BorderStroke(if (isFocused) 3.dp else 1.dp, if (isFocused) MelodyPrimary else Color.White.copy(alpha = 0.15f)),
                        CircleShape
                    ),
                contentScale = ContentScale.Crop
            )

            Spacer(modifier = Modifier.height(10.dp))

            Text(
                text = name,
                color = Color.White,
                fontSize = 13.sp,
                fontWeight = FontWeight.Bold,
                maxLines = 1,
                overflow = TextOverflow.Ellipsis
            )

            Text(
                text = rank,
                color = if (isFocused) Color(0xFFD8B4FE) else MelodyTextSecondary,
                fontSize = 11.sp,
                maxLines = 1,
                overflow = TextOverflow.Ellipsis
            )
        }
    }
}

/**
 * Spotify TV Cinematic Hero Billboard Banner.
 */
@Composable
fun TvBillboardBanner(
    title: String,
    subtitle: String,
    description: String,
    coverUrl: String,
    onPlayClick: () -> Unit,
    modifier: Modifier = Modifier
) {
    Box(
        modifier = modifier
            .fillMaxWidth()
            .heightIn(min = 270.dp)
            .clip(RoundedCornerShape(22.dp))
            .background(Color(0xFF161622))
    ) {
        // Backdrop Image
        AsyncImage(
            model = coverUrl,
            contentDescription = title,
            modifier = Modifier.fillMaxSize(),
            contentScale = ContentScale.Crop
        )

        // Cinematic Spotify Gradients
        Box(
            modifier = Modifier
                .fillMaxSize()
                .background(
                    Brush.horizontalGradient(
                        colors = listOf(
                            Color(0xFF09090E).copy(alpha = 0.96f),
                            Color(0xFF09090E).copy(alpha = 0.88f),
                            Color(0xFF09090E).copy(alpha = 0.45f),
                            Color.Transparent
                        )
                    )
                )
        )

        Box(
            modifier = Modifier
                .fillMaxSize()
                .background(
                    Brush.verticalGradient(
                        colors = listOf(
                            Color.Transparent,
                            Color(0xFF09090E).copy(alpha = 0.85f)
                        )
                    )
                )
        )

        // Banner Content with Safe Anti-Clipping Padding
        Column(
            modifier = Modifier
                .fillMaxWidth()
                .padding(vertical = 24.dp, horizontal = 28.dp),
            verticalArrangement = Arrangement.Center
        ) {
            Row(
                verticalAlignment = Alignment.CenterVertically,
                horizontalArrangement = Arrangement.spacedBy(8.dp)
            ) {
                Box(
                    modifier = Modifier
                        .background(MelodyPrimary, RoundedCornerShape(4.dp))
                        .padding(horizontal = 8.dp, vertical = 3.dp)
                ) {
                    Text(
                        text = "FEATURED ON MELODY TV",
                        color = Color.White,
                        fontSize = 10.sp,
                        fontWeight = FontWeight.Black,
                        letterSpacing = 1.sp
                    )
                }

                Box(
                    modifier = Modifier
                        .background(Color(0x3310B981), RoundedCornerShape(4.dp))
                        .border(1.dp, Color(0xFF10B981), RoundedCornerShape(4.dp))
                        .padding(horizontal = 8.dp, vertical = 3.dp)
                ) {
                    Text(
                        text = "320K LOSSLESS FLAC",
                        color = Color(0xFF34D399),
                        fontSize = 10.sp,
                        fontWeight = FontWeight.Bold
                    )
                }
            }

            Spacer(modifier = Modifier.height(10.dp))

            Text(
                text = title,
                color = Color.White,
                fontSize = 28.sp,
                fontWeight = FontWeight.Black,
                letterSpacing = (-0.5).sp,
                lineHeight = 36.sp,
                maxLines = 1,
                overflow = TextOverflow.Ellipsis
            )

            Text(
                text = subtitle,
                color = Color(0xFFD8B4FE),
                fontSize = 14.sp,
                fontWeight = FontWeight.SemiBold,
                lineHeight = 20.sp,
                maxLines = 1,
                overflow = TextOverflow.Ellipsis
            )

            Spacer(modifier = Modifier.height(6.dp))

            Text(
                text = description,
                color = Color(0xFF9CA3AF),
                fontSize = 12.sp,
                lineHeight = 18.sp,
                maxLines = 2,
                overflow = TextOverflow.Ellipsis,
                modifier = Modifier.widthIn(max = 520.dp)
            )

            Spacer(modifier = Modifier.height(18.dp))

            // Action Buttons Row: Play Collection + Save to Library (No-wrap Pills)
            Row(
                verticalAlignment = Alignment.CenterVertically,
                horizontalArrangement = Arrangement.spacedBy(12.dp)
            ) {
                TvFocusableItem(
                    onClick = onPlayClick,
                    shape = RoundedCornerShape(30.dp),
                    focusedScale = 1.05f
                ) { isFocused ->
                    Row(
                        verticalAlignment = Alignment.CenterVertically,
                        horizontalArrangement = Arrangement.spacedBy(8.dp),
                        modifier = Modifier
                            .background(
                                if (isFocused) Color.White else MelodyPrimary,
                                RoundedCornerShape(30.dp)
                            )
                            .padding(horizontal = 24.dp, vertical = 11.dp)
                    ) {
                        Icon(
                            imageVector = Icons.Default.PlayArrow,
                            contentDescription = "Play",
                            tint = if (isFocused) Color.Black else Color.White,
                            modifier = Modifier.size(18.dp)
                        )
                        Text(
                            text = "Play Collection",
                            color = if (isFocused) Color.Black else Color.White,
                            fontWeight = FontWeight.Black,
                            fontSize = 12.sp,
                            maxLines = 1
                        )
                    }
                }

                TvFocusableItem(
                    onClick = { /* Save to Library */ },
                    shape = RoundedCornerShape(30.dp),
                    focusedScale = 1.05f
                ) { isFocused ->
                    Row(
                        verticalAlignment = Alignment.CenterVertically,
                        horizontalArrangement = Arrangement.spacedBy(8.dp),
                        modifier = Modifier
                            .background(
                                if (isFocused) Color(0xFF323242) else Color.White.copy(alpha = 0.08f),
                                RoundedCornerShape(30.dp)
                            )
                            .border(BorderStroke(1.dp, Color.White.copy(alpha = 0.15f)), RoundedCornerShape(30.dp))
                            .padding(horizontal = 20.dp, vertical = 11.dp)
                    ) {
                        Text(
                            text = "Save to Library",
                            color = Color.White,
                            fontWeight = FontWeight.Bold,
                            fontSize = 12.sp,
                            maxLines = 1
                        )
                    }
                }
            }
        }
    }
}

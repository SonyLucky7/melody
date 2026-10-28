package com.melody.music.ui.components

import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Favorite
import androidx.compose.material.icons.filled.FavoriteBorder
import androidx.compose.material.icons.filled.Pause
import androidx.compose.material.icons.filled.PlayArrow
import androidx.compose.material3.*
import androidx.compose.runtime.Composable
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
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
import com.melody.music.player.MelodyPlayerManager
import com.melody.music.ui.theme.MelodyCard
import com.melody.music.ui.theme.MelodyPrimary
import com.melody.music.ui.theme.MelodyTextSecondary

@Composable
fun MiniPlayerBar(
    song: Song?,
    isPlaying: Boolean,
    progressMs: Long,
    durationMs: Long,
    onTogglePlay: () -> Unit,
    onClick: () -> Unit,
    modifier: Modifier = Modifier
) {
    if (song == null) return

    val likedSongIds by MelodyPlayerManager.likedSongIds.collectAsState()
    val isLiked = likedSongIds.contains(song.id)

    val progress = if (durationMs > 0) (progressMs.toFloat() / durationMs.toFloat()).coerceIn(0f, 1f) else 0f

    Column(
        modifier = modifier
            .fillMaxWidth()
            .padding(horizontal = 8.dp, vertical = 2.dp)
            .clip(RoundedCornerShape(8.dp))
            .background(MelodyCard)
            .clickable { onClick() }
    ) {
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .padding(horizontal = 10.dp, vertical = 6.dp),
            verticalAlignment = Alignment.CenterVertically
        ) {
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
                    color = Color.White,
                    fontSize = 14.sp,
                    fontWeight = FontWeight.Bold,
                    maxLines = 1,
                    overflow = TextOverflow.Ellipsis
                )
                Text(
                    text = song.artist,
                    color = MelodyTextSecondary,
                    fontSize = 12.sp,
                    maxLines = 1,
                    overflow = TextOverflow.Ellipsis
                )
            }

            // Quick Heart Like Button
            IconButton(
                onClick = { MelodyPlayerManager.toggleLike(song) },
                modifier = Modifier.size(36.dp)
            ) {
                Icon(
                    imageVector = if (isLiked) Icons.Default.Favorite else Icons.Default.FavoriteBorder,
                    contentDescription = "Like",
                    tint = if (isLiked) MelodyPrimary else Color.White,
                    modifier = Modifier.size(20.dp)
                )
            }

            // Play / Pause Button
            IconButton(
                onClick = onTogglePlay,
                modifier = Modifier.size(36.dp)
            ) {
                Icon(
                    imageVector = if (isPlaying) Icons.Default.Pause else Icons.Default.PlayArrow,
                    contentDescription = if (isPlaying) "Pause" else "Play",
                    tint = Color.White,
                    modifier = Modifier.size(26.dp)
                )
            }
        }

        LinearProgressIndicator(
            progress = progress,
            modifier = Modifier
                .fillMaxWidth()
                .height(2.dp),
            color = MelodyPrimary,
            trackColor = Color(0xFF333333)
        )
    }
}

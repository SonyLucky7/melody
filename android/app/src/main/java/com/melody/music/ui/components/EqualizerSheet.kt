package com.melody.music.ui.components

import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyRow
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Close
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.melody.music.player.MelodyPlayerManager
import com.melody.music.ui.theme.*

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun EqualizerSheet(
    onDismiss: () -> Unit
) {
    val eqEnabled by MelodyPlayerManager.eqEnabled.collectAsState()
    val bands by MelodyPlayerManager.eqBands.collectAsState()
    val currentPreset by MelodyPlayerManager.currentPreset.collectAsState()

    val bandLabels = listOf("60Hz", "230Hz", "910Hz", "3.6kHz", "14kHz", "Air")

    ModalBottomSheet(
        onDismissRequest = onDismiss,
        containerColor = MelodySurface,
        dragHandle = { BottomSheetDefaults.DragHandle(color = MelodyDivider) }
    ) {
        Column(
            modifier = Modifier
                .fillMaxWidth()
                .padding(horizontal = 24.dp, vertical = 8.dp)
                .navigationBarsPadding()
        ) {
            // Header Row
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically
            ) {
                Column {
                    Text(
                        text = "Equalizer",
                        fontSize = 20.sp,
                        fontWeight = FontWeight.Bold,
                        color = Color.White
                    )
                    Text(
                        text = "Studio DSP Audio Processor",
                        fontSize = 12.sp,
                        color = MelodyTextSecondary
                    )
                }

                Row(
                    verticalAlignment = Alignment.CenterVertically,
                    horizontalArrangement = Arrangement.spacedBy(8.dp)
                ) {
                    Switch(
                        checked = eqEnabled,
                        onCheckedChange = { MelodyPlayerManager.setEqEnabled(it) },
                        colors = SwitchDefaults.colors(
                            checkedThumbColor = Color.White,
                            checkedTrackColor = MelodyPrimary,
                            uncheckedThumbColor = MelodyTextSecondary,
                            uncheckedTrackColor = MelodyCard
                        )
                    )
                    IconButton(onClick = onDismiss) {
                        Icon(Icons.Default.Close, contentDescription = "Close", tint = Color.White)
                    }
                }
            }

            Spacer(modifier = Modifier.height(16.dp))

            // Presets Horizontal Row
            Text(
                text = "Presets",
                fontSize = 13.sp,
                fontWeight = FontWeight.Bold,
                color = MelodyTextSecondary,
                modifier = Modifier.padding(bottom = 8.dp)
            )

            LazyRow(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                items(MelodyPlayerManager.PRESETS) { preset ->
                    val isSelected = currentPreset.equals(preset.name, ignoreCase = true)
                    FilterChip(
                        selected = isSelected,
                        onClick = {
                            MelodyPlayerManager.applyPreset(preset.name)
                            if (!eqEnabled) MelodyPlayerManager.setEqEnabled(true)
                        },
                        label = { Text(preset.name, fontSize = 12.sp, fontWeight = FontWeight.SemiBold) },
                        colors = FilterChipDefaults.filterChipColors(
                            selectedContainerColor = MelodyPrimary,
                            selectedLabelColor = Color.White,
                            containerColor = MelodyCard,
                            labelColor = MelodyTextSecondary
                        )
                    )
                }
            }

            Spacer(modifier = Modifier.height(24.dp))

            // 6 Full-Width Precision Band Sliders (tactile & easy to drag on any phone)
            Column(
                modifier = Modifier.fillMaxWidth(),
                verticalArrangement = Arrangement.spacedBy(6.dp)
            ) {
                bands.forEachIndexed { index, gain ->
                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        verticalAlignment = Alignment.CenterVertically,
                        horizontalArrangement = Arrangement.spacedBy(12.dp)
                    ) {
                        Text(
                            text = bandLabels.getOrElse(index) { "Band" },
                            fontSize = 12.sp,
                            fontWeight = FontWeight.SemiBold,
                            color = MelodyTextSecondary,
                            modifier = Modifier.width(48.dp)
                        )

                        Slider(
                            value = gain.toFloat(),
                            onValueChange = {
                                MelodyPlayerManager.setEqBand(index, it.toInt())
                                if (!eqEnabled) MelodyPlayerManager.setEqEnabled(true)
                            },
                            valueRange = -10f..10f,
                            steps = 19,
                            modifier = Modifier.weight(1f),
                            colors = SliderDefaults.colors(
                                thumbColor = Color.White,
                                activeTrackColor = MelodyPrimary,
                                inactiveTrackColor = MelodyCard
                            )
                        )

                        Text(
                            text = if (gain > 0) "+${gain}dB" else "${gain}dB",
                            fontSize = 12.sp,
                            fontWeight = FontWeight.Bold,
                            color = if (gain != 0) MelodyPrimary else MelodyTextMuted,
                            modifier = Modifier.width(44.dp)
                        )
                    }
                }
            }

            Spacer(modifier = Modifier.height(24.dp))
        }
    }
}

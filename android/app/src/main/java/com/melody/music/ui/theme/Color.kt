package com.melody.music.ui.theme

import androidx.compose.material3.darkColorScheme
import androidx.compose.ui.graphics.Color

val MelodyBg = Color(0xFF0F0F13)
val MelodySurface = Color(0xFF16161F)
val MelodyCard = Color(0xFF1B1B26)
val MelodyCardHover = Color(0xFF262636)
val MelodyPrimary = Color(0xFF3B82F6) // Melody vibrant blue
val MelodyPrimaryVariant = Color(0xFF60A5FA)
val MelodyTextPrimary = Color(0xFFFFFFFF)
val MelodyTextSecondary = Color(0xFFA0A0B2)
val MelodyDivider = Color(0xFF242434)
val MelodyEmerald = Color(0xFF10B981)

val MelodyColorScheme = darkColorScheme(
    primary = MelodyPrimary,
    onPrimary = Color.White,
    surface = MelodySurface,
    onSurface = MelodyTextPrimary,
    background = MelodyBg,
    onBackground = MelodyTextPrimary
)

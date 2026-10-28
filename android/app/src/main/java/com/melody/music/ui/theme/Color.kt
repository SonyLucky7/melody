package com.melody.music.ui.theme

import androidx.compose.material3.darkColorScheme
import androidx.compose.ui.graphics.Color

// Spotify Dark Palette with Melody Brand Purple Accent
val MelodyPrimary = Color(0xFFA855F7) // Melody Brand Purple
val MelodyPrimaryVariant = Color(0xFF9333EA) // Deep Purple
val MelodyPrimaryLight = Color(0xFFC084FC) // Light Purple
val MelodyPrimaryDark = Color(0xFF7E22CE) // Dark Purple
val MelodyPrimaryGlow = Color(0x33A855F7) // 20% Purple Glow

val MelodyBg = Color(0xFF121212) // Spotify Pure Dark Background
val MelodySurface = Color(0xFF181818) // Spotify Card Surface
val MelodyCard = Color(0xFF242424) // Spotify Elevated Tile
val MelodyCardHover = Color(0xFF2A2A2A)
val MelodyCardActive = Color(0xFF333333)

val MelodyTextPrimary = Color(0xFFFFFFFF)
val MelodyTextSecondary = Color(0xFFB3B3B3)
val MelodyTextMuted = Color(0xFF727272)
val MelodyDivider = Color(0xFF282828)

// Status & Special Accents
val MelodyEmerald = Color(0xFF10B981)
val MelodyHeart = Color(0xFFA855F7)
val MelodyOffline = Color(0xFF38BDF8) // Cyan for downloaded/offline

// Spotify-style Browse Category Colors
val GenrePop = Color(0xFF8D67AB)
val GenreHipHop = Color(0xFFBA5D07)
val GenreIndie = Color(0xFF608108)
val GenreRock = Color(0xFFE91429)
val GenreChill = Color(0xFF477D95)
val GenreDance = Color(0xFFD84000)
val GenreBollywood = Color(0xFF0D73EC)
val GenreRnb = Color(0xFFDC148C)

val MelodyColorScheme = darkColorScheme(
    primary = MelodyPrimary,
    onPrimary = Color.White,
    primaryContainer = MelodyPrimaryVariant,
    onPrimaryContainer = Color.White,
    surface = MelodySurface,
    onSurface = MelodyTextPrimary,
    background = MelodyBg,
    onBackground = MelodyTextPrimary,
    surfaceVariant = MelodyCard,
    onSurfaceVariant = MelodyTextSecondary
)

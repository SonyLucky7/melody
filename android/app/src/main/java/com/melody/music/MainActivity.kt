package com.melody.music

import android.content.ComponentName
import android.content.Context
import android.content.Intent
import android.content.ServiceConnection
import android.os.Bundle
import android.os.IBinder
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.*
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Home
import androidx.compose.material.icons.filled.Key
import androidx.compose.material.icons.filled.LibraryMusic
import androidx.compose.material.icons.filled.Search
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.unit.dp
import androidx.core.view.WindowCompat
import com.melody.music.data.api.ApiClient
import com.melody.music.data.model.Song
import com.melody.music.player.MelodyPlaybackService
import com.melody.music.player.MelodyPlayerManager
import com.melody.music.ui.components.ActivationDialog
import com.melody.music.ui.components.FullPlayerSheet
import com.melody.music.ui.components.MiniPlayerBar
import com.melody.music.ui.screens.HomeScreen
import com.melody.music.ui.theme.MelodyBg
import com.melody.music.ui.theme.MelodyColorScheme
import com.melody.music.ui.theme.MelodyPrimary
import kotlinx.coroutines.launch

class MainActivity : ComponentActivity() {

    private val serviceConnection = object : ServiceConnection {
        override fun onServiceConnected(name: ComponentName?, binder: IBinder?) {}
        override fun onServiceDisconnected(name: ComponentName?) {}
    }

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        WindowCompat.setDecorFitsSystemWindows(window, false)

        // Start & bind playback foreground service
        val serviceIntent = Intent(this, MelodyPlaybackService::class.java)
        startService(serviceIntent)
        bindService(serviceIntent, serviceConnection, Context.BIND_AUTO_CREATE)

        setContent {
            MaterialTheme(colorScheme = MelodyColorScheme) {
                MelodyApp()
            }
        }
    }

    override fun onDestroy() {
        unbindService(serviceConnection)
        super.onDestroy()
    }
}

@Composable
fun MelodyApp() {
    var selectedTab by remember { mutableStateOf(0) }
    var songs by remember { mutableStateOf<List<Song>>(emptyList()) }
    var isFullPlayerVisible by remember { mutableStateOf(false) }
    var isActivationDialogOpen by remember { mutableStateOf(false) }

    val currentSong by MelodyPlayerManager.currentSong.collectAsState()
    val isPlaying by MelodyPlayerManager.isPlaying.collectAsState()
    val progressMs by MelodyPlayerManager.progressMs.collectAsState()
    val durationMs by MelodyPlayerManager.durationMs.collectAsState()
    val queue by MelodyPlayerManager.queue.collectAsState()

    val scope = rememberCoroutineScope()

    LaunchedEffect(Unit) {
        scope.launch {
            try {
                val res = ApiClient.service.getSongs()
                songs = res.data
            } catch (e: Exception) {
                e.printStackTrace()
            }
        }
    }

    Scaffold(
        containerColor = MelodyBg,
        bottomBar = {
            Column {
                // Persistent Spotify-style Floating Mini Player
                if (currentSong != null) {
                    MiniPlayerBar(
                        song = currentSong,
                        isPlaying = isPlaying,
                        progressMs = progressMs,
                        durationMs = durationMs,
                        onTogglePlay = { MelodyPlayerManager.togglePlay() },
                        onClick = { isFullPlayerVisible = true }
                    )
                }

                // Bottom Navigation
                NavigationBar(
                    containerColor = Color(0xFF121218),
                    tonalElevation = 8.dp
                ) {
                    NavigationBarItem(
                        selected = selectedTab == 0,
                        onClick = { selectedTab = 0 },
                        icon = { Icon(Icons.Default.Home, contentDescription = "Home") },
                        label = { Text("Home") },
                        colors = NavigationBarItemDefaults.colors(
                            selectedIconColor = MelodyPrimary,
                            selectedTextColor = MelodyPrimary,
                            unselectedIconColor = Color(0xFFA0A0B0),
                            unselectedTextColor = Color(0xFFA0A0B0),
                            indicatorColor = Color(0x223B82F6)
                        )
                    )
                    NavigationBarItem(
                        selected = selectedTab == 1,
                        onClick = { selectedTab = 1 },
                        icon = { Icon(Icons.Default.Search, contentDescription = "Search") },
                        label = { Text("Search") },
                        colors = NavigationBarItemDefaults.colors(
                            selectedIconColor = MelodyPrimary,
                            selectedTextColor = MelodyPrimary,
                            unselectedIconColor = Color(0xFFA0A0B0),
                            unselectedTextColor = Color(0xFFA0A0B0),
                            indicatorColor = Color(0x223B82F6)
                        )
                    )
                    NavigationBarItem(
                        selected = selectedTab == 2,
                        onClick = { selectedTab = 2 },
                        icon = { Icon(Icons.Default.LibraryMusic, contentDescription = "Library") },
                        label = { Text("Library") },
                        colors = NavigationBarItemDefaults.colors(
                            selectedIconColor = MelodyPrimary,
                            selectedTextColor = MelodyPrimary,
                            unselectedIconColor = Color(0xFFA0A0B0),
                            unselectedTextColor = Color(0xFFA0A0B0),
                            indicatorColor = Color(0x223B82F6)
                        )
                    )
                    NavigationBarItem(
                        selected = false,
                        onClick = { isActivationDialogOpen = true },
                        icon = { Icon(Icons.Default.Key, contentDescription = "Key") },
                        label = { Text("Licence") },
                        colors = NavigationBarItemDefaults.colors(
                            unselectedIconColor = Color(0xFFA0A0B0),
                            unselectedTextColor = Color(0xFFA0A0B0)
                        )
                    )
                }
            }
        }
    ) { innerPadding ->
        Box(
            modifier = Modifier
                .fillMaxSize()
                .padding(innerPadding)
        ) {
            when (selectedTab) {
                0 -> HomeScreen(
                    songs = songs,
                    onSongClick = { song ->
                        MelodyPlayerManager.playSong(song, songs)
                    }
                )
                1 -> HomeScreen(
                    songs = songs,
                    onSongClick = { song ->
                        MelodyPlayerManager.playSong(song, songs)
                    }
                )
                2 -> HomeScreen(
                    songs = songs,
                    onSongClick = { song ->
                        MelodyPlayerManager.playSong(song, songs)
                    }
                )
            }

            // Full Player Screen Sheet Overlay
            if (isFullPlayerVisible && currentSong != null) {
                FullPlayerSheet(
                    song = currentSong,
                    isPlaying = isPlaying,
                    progressMs = progressMs,
                    durationMs = durationMs,
                    onTogglePlay = { MelodyPlayerManager.togglePlay() },
                    onNext = { MelodyPlayerManager.next() },
                    onPrev = { MelodyPlayerManager.prev() },
                    onSeekTo = { pos -> MelodyPlayerManager.seekTo(pos) },
                    onDismiss = { isFullPlayerVisible = false }
                )
            }

            // Key Activation Dialog
            ActivationDialog(
                isOpen = isActivationDialogOpen,
                onDismiss = { isActivationDialogOpen = false },
                onActivated = {
                    // refresh catalog
                }
            )
        }
    }
}

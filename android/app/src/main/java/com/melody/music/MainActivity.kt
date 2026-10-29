package com.melody.music

import android.content.ComponentName
import android.content.Context
import android.content.Intent
import android.content.ServiceConnection
import android.os.Bundle
import android.os.IBinder
import androidx.activity.ComponentActivity
import androidx.activity.compose.BackHandler
import androidx.activity.compose.setContent
import androidx.compose.foundation.layout.*
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Home
import androidx.compose.material.icons.filled.Key
import androidx.compose.material.icons.filled.LibraryMusic
import androidx.compose.material.icons.filled.Person
import androidx.compose.material.icons.filled.Search
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.unit.dp
import androidx.core.view.WindowCompat
import com.melody.music.ads.MelodyLaunchAdManager
import com.melody.music.data.api.ApiClient
import com.melody.music.data.model.Song
import com.melody.music.data.model.Playlist
import com.melody.music.player.MelodyPlaybackService
import com.melody.music.player.MelodyPlayerManager
import com.melody.music.ui.components.ActivationDialog
import com.melody.music.ui.components.FullPlayerSheet
import com.melody.music.ui.components.MiniPlayerBar
import com.melody.music.ui.screens.ArtistScreen
import com.melody.music.ui.screens.HomeScreen
import com.melody.music.ui.screens.LibraryScreen
import com.melody.music.ui.screens.CustomPlaylistScreen
import com.melody.music.ui.screens.ProfileScreen
import com.melody.music.ui.screens.SearchScreen
import com.melody.music.ui.theme.MelodyBg
import com.melody.music.ui.theme.MelodyColorScheme
import com.melody.music.ui.theme.MelodyPrimary
import com.melody.music.ui.theme.MelodyTextSecondary
import kotlinx.coroutines.launch

class MainActivity : ComponentActivity() {

    private val serviceConnection = object : ServiceConnection {
        override fun onServiceConnected(name: ComponentName?, binder: IBinder?) {}
        override fun onServiceDisconnected(name: ComponentName?) {}
    }

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        WindowCompat.setDecorFitsSystemWindows(window, false)

        // Initialize persistent API & Device ID session
        ApiClient.init(applicationContext)
        MelodyPlayerManager.refreshFavourites()

        // 1 Full Ad on Application Launch/Open Only
        MelodyLaunchAdManager.init(applicationContext)
        MelodyLaunchAdManager.showLaunchAdIfFirstOpen(this)

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
    var selectedArtist by remember { mutableStateOf<String?>(null) }
    var selectedPlaylist by remember { mutableStateOf<Playlist?>(null) }
    var songs by remember { mutableStateOf<List<Song>>(emptyList()) }
    var isFullPlayerVisible by remember { mutableStateOf(false) }
    var isActivationDialogOpen by remember { mutableStateOf(false) }

    val currentSong by MelodyPlayerManager.currentSong.collectAsState()
    val isPlaying by MelodyPlayerManager.isPlaying.collectAsState()
    val progressMs by MelodyPlayerManager.progressMs.collectAsState()
    val durationMs by MelodyPlayerManager.durationMs.collectAsState()

    val scope = rememberCoroutineScope()
    val context = androidx.compose.ui.platform.LocalContext.current

    // Request notification permission on Android 13+ so Lock Screen & System Controls appear
    if (android.os.Build.VERSION.SDK_INT >= android.os.Build.VERSION_CODES.TIRAMISU) {
        val launcher = androidx.activity.compose.rememberLauncherForActivityResult(
            androidx.activity.result.contract.ActivityResultContracts.RequestPermission()
        ) { }
        LaunchedEffect(Unit) {
            launcher.launch(android.Manifest.permission.POST_NOTIFICATIONS)
        }
    }

    // Update Home Screen Widget when song or playback changes
    LaunchedEffect(currentSong, isPlaying) {
        com.melody.music.widget.MelodyAppWidgetProvider.updateAllWidgets(context, currentSong, isPlaying)
    }

    // Handle Android hardware back button
    BackHandler(enabled = selectedArtist != null || selectedPlaylist != null || isFullPlayerVisible) {
        if (isFullPlayerVisible) {
            isFullPlayerVisible = false
        } else if (selectedArtist != null) {
            selectedArtist = null
        } else if (selectedPlaylist != null) {
            selectedPlaylist = null
        }
    }

    fun loadCatalog() {
        scope.launch {
            for (attempt in 1..4) {
                try {
                    val res = ApiClient.service.getSongs(limit = 1000)
                    if (res.success && res.data.isNotEmpty()) {
                        songs = res.data
                        break
                    }
                } catch (e: Exception) {
                    e.printStackTrace()
                    kotlinx.coroutines.delay(1500L * attempt)
                }
            }
        }
    }

    LaunchedEffect(Unit) {
        loadCatalog()
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

                // Spotify Standard Bottom Navigation (Home, Search, Your Library, Licence)
                NavigationBar(
                    containerColor = Color(0xFF121212),
                    tonalElevation = 8.dp
                ) {
                    NavigationBarItem(
                        selected = selectedTab == 0 && selectedArtist == null && selectedPlaylist == null,
                        onClick = {
                            selectedTab = 0
                            selectedArtist = null
                            selectedPlaylist = null
                        },
                        icon = { Icon(Icons.Default.Home, contentDescription = "Home") },
                        label = { Text("Home") },
                        colors = NavigationBarItemDefaults.colors(
                            selectedIconColor = MelodyPrimary,
                            selectedTextColor = MelodyPrimary,
                            unselectedIconColor = MelodyTextSecondary,
                            unselectedTextColor = MelodyTextSecondary,
                            indicatorColor = Color(0x22A855F7)
                        )
                    )
                    NavigationBarItem(
                        selected = selectedTab == 1 && selectedArtist == null && selectedPlaylist == null,
                        onClick = {
                            selectedTab = 1
                            selectedArtist = null
                            selectedPlaylist = null
                        },
                        icon = { Icon(Icons.Default.Search, contentDescription = "Search") },
                        label = { Text("Search") },
                        colors = NavigationBarItemDefaults.colors(
                            selectedIconColor = MelodyPrimary,
                            selectedTextColor = MelodyPrimary,
                            unselectedIconColor = MelodyTextSecondary,
                            unselectedTextColor = MelodyTextSecondary,
                            indicatorColor = Color(0x22A855F7)
                        )
                    )
                    NavigationBarItem(
                        selected = selectedTab == 2 && selectedArtist == null && selectedPlaylist == null,
                        onClick = {
                            selectedTab = 2
                            selectedArtist = null
                            selectedPlaylist = null
                        },
                        icon = { Icon(Icons.Default.LibraryMusic, contentDescription = "Library") },
                        label = { Text("Your Library") },
                        colors = NavigationBarItemDefaults.colors(
                            selectedIconColor = MelodyPrimary,
                            selectedTextColor = MelodyPrimary,
                            unselectedIconColor = MelodyTextSecondary,
                            unselectedTextColor = MelodyTextSecondary,
                            indicatorColor = Color(0x22A855F7)
                        )
                    )
                    NavigationBarItem(
                        selected = selectedTab == 3 && selectedArtist == null && selectedPlaylist == null,
                        onClick = {
                            selectedTab = 3
                            selectedArtist = null
                            selectedPlaylist = null
                        },
                        icon = {
                            Icon(
                                if (ApiClient.isActivated) Icons.Default.Person else Icons.Default.Key,
                                contentDescription = "Profile"
                            )
                        },
                        label = { Text(if (ApiClient.isActivated) "Profile" else "VIP") },
                        colors = NavigationBarItemDefaults.colors(
                            selectedIconColor = MelodyPrimary,
                            selectedTextColor = MelodyPrimary,
                            unselectedIconColor = MelodyTextSecondary,
                            unselectedTextColor = MelodyTextSecondary,
                            indicatorColor = Color(0x22A855F7)
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
            if (selectedArtist != null) {
                ArtistScreen(
                    artistName = selectedArtist!!,
                    songs = songs,
                    onBack = { selectedArtist = null },
                    onSongClick = { song, queue ->
                        MelodyPlayerManager.playSong(song, queue)
                    }
                )
            } else if (selectedPlaylist != null) {
                CustomPlaylistScreen(
                    playlist = selectedPlaylist!!,
                    allSongs = songs,
                    onBack = { selectedPlaylist = null },
                    onSongClick = { song, queue ->
                        MelodyPlayerManager.playSong(song, queue)
                    },
                    onPlaylistDeleted = { selectedPlaylist = null }
                )
            } else {
                when (selectedTab) {
                    0 -> HomeScreen(
                        songs = songs,
                        onSongClick = { song, queue ->
                            MelodyPlayerManager.playSong(song, queue)
                        },
                        onArtistClick = { artistName ->
                            selectedArtist = artistName
                        },
                        onPlaylistClick = { playlist ->
                            selectedPlaylist = playlist
                        },
                        onRefresh = { loadCatalog() }
                    )
                    1 -> SearchScreen(
                        songs = songs,
                        onSongClick = { song ->
                            MelodyPlayerManager.playSong(song, songs)
                        }
                    )
                    2 -> LibraryScreen(
                        songs = songs,
                        onSongClick = { song, queue ->
                            MelodyPlayerManager.playSong(song, queue)
                        },
                        onArtistClick = { artistName ->
                            selectedArtist = artistName
                        }
                    )
                    3 -> ProfileScreen(
                        onOpenActivation = { isActivationDialogOpen = true }
                    )
                }
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
                    scope.launch {
                        try {
                            val res = ApiClient.service.getSongs()
                            songs = res.data
                        } catch (e: Exception) {
                            e.printStackTrace()
                        }
                    }
                }
            )
        }
    }
}

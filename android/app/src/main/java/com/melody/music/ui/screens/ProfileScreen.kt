package com.melody.music.ui.screens

import android.widget.Toast
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.LocalClipboardManager
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.AnnotatedString
import androidx.compose.ui.text.font.FontFamily
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.melody.music.data.api.ApiClient
import com.melody.music.player.MelodyPlayerManager
import com.melody.music.ui.theme.*

@Composable
fun ProfileScreen(
    onOpenActivation: () -> Unit,
    modifier: Modifier = Modifier
) {
    val context = LocalContext.current
    val clipboardManager = LocalClipboardManager.current
    val isActivated = ApiClient.isActivated
    var liveUser by remember { mutableStateOf(ApiClient.currentUser) }
    var activeDevicesCount by remember { mutableStateOf(1) }

    LaunchedEffect(isActivated) {
        if (isActivated) {
            try {
                val res = ApiClient.service.getDevices()
                if (res.isSuccessful) {
                    val body = res.body()
                    val userMap = body?.get("user") as? Map<*, *>
                    if (userMap != null) {
                        val parsed = com.google.gson.Gson().fromJson(com.google.gson.Gson().toJson(userMap), com.melody.music.data.model.AndroidUserProfile::class.java)
                        liveUser = parsed
                        ApiClient.currentUser = parsed
                        ApiClient.saveSession(context, ApiClient.deviceToken ?: "", parsed)
                    }
                    val count = (body?.get("count") as? Number)?.toInt() ?: 1
                    activeDevicesCount = count
                }
            } catch (e: Exception) {
                e.printStackTrace()
            }
        }
    }

    val user = liveUser ?: ApiClient.currentUser
    val likedSongIds by MelodyPlayerManager.likedSongIds.collectAsState()

    LazyColumn(
        modifier = modifier
            .fillMaxSize()
            .background(MelodyBg)
            .statusBarsPadding()
            .padding(horizontal = 20.dp)
    ) {
        item {
            Spacer(modifier = Modifier.height(20.dp))
            Text(
                text = "Your Profile",
                fontSize = 28.sp,
                fontWeight = FontWeight.Black,
                color = Color.White
            )
            Spacer(modifier = Modifier.height(16.dp))
        }

        if (isActivated && user != null) {
            // Authenticated VIP Profile View
            item {
                // Profile Banner Card
                Box(
                    modifier = Modifier
                        .fillMaxWidth()
                        .clip(RoundedCornerShape(24.dp))
                        .background(
                            Brush.linearGradient(
                                colors = listOf(Color(0xFF3B0764), Color(0xFF1E1B4B), Color(0xFF121212))
                            )
                        )
                        .border(1.dp, Color(0x33A855F7), RoundedCornerShape(24.dp))
                        .padding(20.dp)
                ) {
                    Column(
                        horizontalAlignment = Alignment.CenterHorizontally,
                        modifier = Modifier.fillMaxWidth()
                    ) {
                        // Large Avatar with Gold Crown
                        Box(contentAlignment = Alignment.BottomEnd) {
                            Box(
                                modifier = Modifier
                                    .size(80.dp)
                                    .clip(CircleShape)
                                    .background(
                                        Brush.linearGradient(
                                            listOf(MelodyPrimary, Color(0xFF6366F1), Color(0xFFEC4899))
                                        )
                                    )
                                    .border(2.dp, Color.White.copy(alpha = 0.3f), CircleShape),
                                contentAlignment = Alignment.Center
                            ) {
                                val initials = "${user.firstName.take(1)}${user.surname.take(1)}".uppercase()
                                Text(
                                    text = initials.ifBlank { "VIP" },
                                    color = Color.White,
                                    fontSize = 28.sp,
                                    fontWeight = FontWeight.Black
                                )
                            }

                            Box(
                                modifier = Modifier
                                    .size(24.dp)
                                    .clip(CircleShape)
                                    .background(Color(0xFFFBBF24)),
                                contentAlignment = Alignment.Center
                            ) {
                                Icon(
                                    Icons.Default.Star,
                                    contentDescription = "VIP",
                                    tint = Color.Black,
                                    modifier = Modifier.size(14.dp)
                                )
                            }
                        }

                        Spacer(modifier = Modifier.height(12.dp))

                        // User Full Name
                        Text(
                            text = "${user.firstName} ${user.surname}",
                            fontSize = 22.sp,
                            fontWeight = FontWeight.Bold,
                            color = Color.White
                        )

                        // Mobile & Email
                        Text(
                            text = "+91 ${user.mobile}" + (user.email?.let { " • $it" } ?: ""),
                            fontSize = 12.sp,
                            color = MelodyTextSecondary
                        )

                        Spacer(modifier = Modifier.height(10.dp))

                        // VIP Badge
                        Surface(
                            shape = RoundedCornerShape(50),
                            color = Color(0x33FBBF24),
                            border = androidx.compose.foundation.BorderStroke(1.dp, Color(0x66FBBF24))
                        ) {
                            Text(
                                text = if (user.plan == "lifetime") "✨ LIFETIME VIP (FOREVER)" else "✨ ANNUAL VIP",
                                fontSize = 11.sp,
                                fontWeight = FontWeight.Bold,
                                color = Color(0xFFFBBF24),
                                modifier = Modifier.padding(horizontal = 14.dp, vertical = 4.dp)
                            )
                        }
                    }
                }

                Spacer(modifier = Modifier.height(16.dp))
            }

            // Stats Cards
            item {
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.spacedBy(10.dp)
                ) {
                    Box(
                        modifier = Modifier
                            .weight(1f)
                            .clip(RoundedCornerShape(16.dp))
                            .background(Color(0xFF1E1E1E))
                            .border(1.dp, Color.White.copy(alpha = 0.05f), RoundedCornerShape(16.dp))
                            .padding(14.dp),
                        contentAlignment = Alignment.Center
                    ) {
                        Column(horizontalAlignment = Alignment.CenterHorizontally) {
                            Icon(Icons.Default.Favorite, contentDescription = "Liked", tint = Color(0xFFEC4899), modifier = Modifier.size(20.dp))
                            Spacer(modifier = Modifier.height(4.dp))
                            Text(text = likedSongIds.size.toString(), fontSize = 18.sp, fontWeight = FontWeight.Black, color = Color.White)
                            Text(text = "Liked Songs", fontSize = 11.sp, color = MelodyTextSecondary)
                        }
                    }

                    Box(
                        modifier = Modifier
                            .weight(1f)
                            .clip(RoundedCornerShape(16.dp))
                            .background(Color(0xFF1E1E1E))
                            .border(1.dp, Color.White.copy(alpha = 0.05f), RoundedCornerShape(16.dp))
                            .padding(14.dp),
                        contentAlignment = Alignment.Center
                    ) {
                        Column(horizontalAlignment = Alignment.CenterHorizontally) {
                            Icon(Icons.Default.Devices, contentDescription = "Devices", tint = MelodyPrimary, modifier = Modifier.size(20.dp))
                            Spacer(modifier = Modifier.height(4.dp))
                            Text(text = "$activeDevicesCount / 5", fontSize = 18.sp, fontWeight = FontWeight.Black, color = Color.White)
                            Text(text = "Active Devices", fontSize = 11.sp, color = MelodyTextSecondary)
                        }
                    }
                }

                Spacer(modifier = Modifier.height(16.dp))
            }

            // Licence Key Card with 1-Tap Copy
            item {
                Box(
                    modifier = Modifier
                        .fillMaxWidth()
                        .clip(RoundedCornerShape(20.dp))
                        .background(Color(0xFF181818))
                        .border(1.dp, Color(0x33A855F7), RoundedCornerShape(20.dp))
                        .padding(16.dp)
                ) {
                    Column {
                        Row(
                            modifier = Modifier.fillMaxWidth(),
                            horizontalArrangement = Arrangement.SpaceBetween,
                            verticalAlignment = Alignment.CenterVertically
                        ) {
                            Text(
                                text = "LICENCE KEY",
                                fontSize = 10.sp,
                                fontWeight = FontWeight.Bold,
                                color = MelodyPrimary,
                                letterSpacing = 1.sp
                            )
                            Text(
                                text = "Never Expires",
                                fontSize = 11.sp,
                                color = MelodyTextSecondary
                            )
                        }

                        Spacer(modifier = Modifier.height(8.dp))

                        Row(
                            modifier = Modifier
                                .fillMaxWidth()
                                .clip(RoundedCornerShape(12.dp))
                                .background(Color.Black.copy(alpha = 0.5f))
                                .padding(horizontal = 14.dp, vertical = 10.dp),
                            horizontalArrangement = Arrangement.SpaceBetween,
                            verticalAlignment = Alignment.CenterVertically
                        ) {
                            Text(
                                text = user.formattedKey.ifBlank { user.licenceKey },
                                color = Color.White,
                                fontFamily = FontFamily.Monospace,
                                fontWeight = FontWeight.Bold,
                                fontSize = 15.sp,
                                letterSpacing = 1.sp
                            )

                            Button(
                                onClick = {
                                    clipboardManager.setText(AnnotatedString(user.formattedKey))
                                    Toast.makeText(context, "Key copied to clipboard!", Toast.LENGTH_SHORT).show()
                                },
                                colors = ButtonDefaults.buttonColors(
                                    containerColor = MelodyPrimary
                                ),
                                contentPadding = PaddingValues(horizontal = 12.dp, vertical = 6.dp),
                                shape = RoundedCornerShape(8.dp)
                            ) {
                                Icon(Icons.Default.ContentCopy, contentDescription = "Copy", modifier = Modifier.size(14.dp))
                                Spacer(modifier = Modifier.width(4.dp))
                                Text("Copy", fontSize = 11.sp, fontWeight = FontWeight.Bold)
                            }
                        }

                        Spacer(modifier = Modifier.height(8.dp))
                        Text(
                            text = "💡 Use this key on web or other phones to load all your playlists and liked songs automatically!",
                            fontSize = 11.sp,
                            color = MelodyTextSecondary
                        )
                    }
                }

                Spacer(modifier = Modifier.height(20.dp))
            }

            // Log Out Button
            item {
                Button(
                    onClick = {
                        ApiClient.clearSession(context)
                        Toast.makeText(context, "Logged out successfully", Toast.LENGTH_SHORT).show()
                    },
                    modifier = Modifier.fillMaxWidth(),
                    colors = ButtonDefaults.buttonColors(
                        containerColor = Color(0x22EF4444),
                        contentColor = Color(0xFFEF4444)
                    ),
                    shape = RoundedCornerShape(14.dp)
                ) {
                    Icon(Icons.Default.ExitToApp, contentDescription = "Logout")
                    Spacer(modifier = Modifier.width(8.dp))
                    Text("Log Out on this Phone", fontWeight = FontWeight.Bold)
                }

                Spacer(modifier = Modifier.height(80.dp))
            }
        } else {
            // Unauthenticated Guest View
            item {
                Box(
                    modifier = Modifier
                        .fillMaxWidth()
                        .clip(RoundedCornerShape(24.dp))
                        .background(
                            Brush.linearGradient(
                                colors = listOf(Color(0xFF3B0764), Color(0xFF1E1B4B))
                            )
                        )
                        .padding(24.dp)
                ) {
                    Column(horizontalAlignment = Alignment.CenterHorizontally) {
                        Box(
                            modifier = Modifier
                                .size(64.dp)
                                .clip(CircleShape)
                                .background(MelodyPrimary),
                            contentAlignment = Alignment.Center
                        ) {
                            Icon(Icons.Default.VpnKey, contentDescription = "Key", tint = Color.White, modifier = Modifier.size(32.dp))
                        }

                        Spacer(modifier = Modifier.height(16.dp))

                        Text(
                            text = "Melody VIP Access",
                            fontSize = 22.sp,
                            fontWeight = FontWeight.Black,
                            color = Color.White
                        )

                        Spacer(modifier = Modifier.height(6.dp))

                        Text(
                            text = "Log in with your licence key to unlock unlimited downloads, 320kbps audio, and sync your playlists across 5 devices.",
                            fontSize = 13.sp,
                            color = MelodyTextSecondary,
                            textAlign = androidx.compose.ui.text.style.TextAlign.Center
                        )

                        Spacer(modifier = Modifier.height(20.dp))

                        Button(
                            onClick = onOpenActivation,
                            modifier = Modifier.fillMaxWidth(),
                            colors = ButtonDefaults.buttonColors(
                                containerColor = MelodyPrimary
                            ),
                            shape = RoundedCornerShape(14.dp)
                        ) {
                            Text("Activate Licence Key / Buy VIP", fontWeight = FontWeight.Bold, fontSize = 14.sp)
                        }
                    }
                }

                Spacer(modifier = Modifier.height(80.dp))
            }
        }
    }
}

package com.melody.music.ui.components

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.compose.ui.window.Dialog
import com.google.gson.Gson
import com.melody.music.data.api.ApiClient
import com.melody.music.data.model.AndroidUserProfile
import com.melody.music.player.MelodyPlayerManager
import com.melody.music.ui.theme.MelodyCard
import com.melody.music.ui.theme.MelodyPrimary
import kotlinx.coroutines.launch

@Composable
fun ActivationDialog(
    isOpen: Boolean,
    onDismiss: () -> Unit,
    onActivated: () -> Unit
) {
    if (!isOpen) return

    var keyInput by remember { mutableStateOf("") }
    var firstName by remember { mutableStateOf("") }
    var surname by remember { mutableStateOf("") }
    var mobile by remember { mutableStateOf("") }

    var tab by remember { mutableStateOf(0) } // 0: Activate, 1: Generate Free
    var statusMsg by remember { mutableStateOf("") }
    var isLoading by remember { mutableStateOf(false) }
    val scope = rememberCoroutineScope()
    val context = LocalContext.current

    Dialog(onDismissRequest = onDismiss) {
        Card(
            shape = RoundedCornerShape(20.dp),
            colors = CardDefaults.cardColors(containerColor = MelodyCard),
            modifier = Modifier.fillMaxWidth()
        ) {
            Column(
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(20.dp)
            ) {
                Text(
                    text = "Licence Key Activation",
                    fontSize = 18.sp,
                    fontWeight = FontWeight.Bold,
                    color = Color.White
                )
                Text(
                    text = "12-character device licence key",
                    fontSize = 12.sp,
                    color = Color(0xFFA0A0B0),
                    modifier = Modifier.padding(bottom = 16.dp)
                )

                TabRow(
                    selectedTabIndex = tab,
                    containerColor = Color(0xFF14141E),
                    contentColor = MelodyPrimary
                ) {
                    Tab(
                        selected = tab == 0,
                        onClick = { tab = 0; statusMsg = "" },
                        text = { Text("Activate Key", fontSize = 12.sp, fontWeight = FontWeight.Bold) }
                    )
                    Tab(
                        selected = tab == 1,
                        onClick = { tab = 1; statusMsg = "" },
                        text = { Text("Get Free Key", fontSize = 12.sp, fontWeight = FontWeight.Bold) }
                    )
                }

                Spacer(modifier = Modifier.height(16.dp))

                if (statusMsg.isNotEmpty()) {
                    Text(
                        text = statusMsg,
                        color = if (statusMsg.contains("success", ignoreCase = true) || statusMsg.contains("generated", ignoreCase = true)) Color(0xFF10B981) else Color(0xFFEF4444),
                        fontSize = 12.sp,
                        modifier = Modifier.padding(bottom = 8.dp)
                    )
                }

                if (tab == 0) {
                    OutlinedTextField(
                        value = keyInput,
                        onValueChange = { keyInput = it.uppercase() },
                        label = { Text("Key (e.g. RAHS-HA98-7654)") },
                        modifier = Modifier.fillMaxWidth(),
                        colors = OutlinedTextFieldDefaults.colors(
                            focusedBorderColor = MelodyPrimary,
                            unfocusedBorderColor = Color(0xFF2A2A3E),
                            focusedTextColor = Color.White,
                            unfocusedTextColor = Color.White
                        )
                    )

                    Spacer(modifier = Modifier.height(16.dp))

                    Button(
                        onClick = {
                            if (keyInput.isBlank()) return@Button
                            isLoading = true
                            scope.launch {
                                try {
                                    val res = ApiClient.service.activateKey(
                                        mapOf(
                                            "key" to keyInput.trim(),
                                            "device_id" to ApiClient.deviceId,
                                            "device_name" to "Android Phone"
                                        )
                                    )
                                    if (res.isSuccessful && res.body()?.get("success") == true) {
                                        val token = res.body()?.get("token") as? String
                                        val userMap = res.body()?.get("user") as? Map<*, *>
                                        val userProfile = if (userMap != null) {
                                            val gson = Gson()
                                            gson.fromJson(gson.toJson(userMap), AndroidUserProfile::class.java)
                                        } else null

                                        if (token != null) {
                                            ApiClient.saveSession(context, token, userProfile)
                                        }

                                        MelodyPlayerManager.refreshFavourites()
                                        statusMsg = "Activated successfully!"
                                        onActivated()
                                        onDismiss()
                                    } else {
                                        statusMsg = (res.body()?.get("message") as? String) ?: "Activation failed"
                                    }
                                } catch (e: Exception) {
                                    statusMsg = e.message ?: "Network error"
                                } finally {
                                    isLoading = false
                                }
                            }
                        },
                        enabled = !isLoading,
                        modifier = Modifier.fillMaxWidth(),
                        colors = ButtonDefaults.buttonColors(containerColor = MelodyPrimary)
                    ) {
                        Text(if (isLoading) "Activating..." else "Activate Device")
                    }
                } else {
                    OutlinedTextField(
                        value = firstName,
                        onValueChange = { firstName = it },
                        label = { Text("First Name (e.g. Rahul)") },
                        modifier = Modifier.fillMaxWidth()
                    )
                    Spacer(modifier = Modifier.height(8.dp))
                    OutlinedTextField(
                        value = surname,
                        onValueChange = { surname = it },
                        label = { Text("Surname (e.g. Sharma)") },
                        modifier = Modifier.fillMaxWidth()
                    )
                    Spacer(modifier = Modifier.height(8.dp))
                    OutlinedTextField(
                        value = mobile,
                        onValueChange = { mobile = it },
                        label = { Text("Mobile (e.g. 9876543210)") },
                        modifier = Modifier.fillMaxWidth()
                    )

                    Spacer(modifier = Modifier.height(16.dp))

                    Button(
                        onClick = {
                            if (firstName.isBlank() || surname.isBlank() || mobile.isBlank()) return@Button
                            isLoading = true
                            scope.launch {
                                try {
                                    val res = ApiClient.service.getFreeKey(
                                        mapOf(
                                            "first_name" to firstName.trim(),
                                            "surname" to surname.trim(),
                                            "mobile" to mobile.trim()
                                        )
                                    )
                                    val data = res.body()?.get("data") as? Map<*, *>
                                    val key = data?.get("formattedKey") as? String
                                    if (key != null) {
                                        keyInput = key
                                        tab = 0
                                        statusMsg = "Key generated: $key. Tap Activate!"
                                    } else {
                                        statusMsg = "Failed to generate key"
                                    }
                                } catch (e: Exception) {
                                    statusMsg = e.message ?: "Network error"
                                } finally {
                                    isLoading = false
                                }
                            }
                        },
                        enabled = !isLoading,
                        modifier = Modifier.fillMaxWidth(),
                        colors = ButtonDefaults.buttonColors(containerColor = MelodyPrimary)
                    ) {
                        Text(if (isLoading) "Generating..." else "Generate Free Key")
                    }
                }
            }
        }
    }
}

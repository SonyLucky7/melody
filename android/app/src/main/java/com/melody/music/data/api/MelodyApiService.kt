package com.melody.music.data.api

import android.content.Context
import com.google.gson.Gson
import com.melody.music.data.model.*
import okhttp3.OkHttpClient
import okhttp3.logging.HttpLoggingInterceptor
import retrofit2.Response
import retrofit2.Retrofit
import retrofit2.converter.gson.GsonConverterFactory
import retrofit2.http.*
import java.util.UUID
import java.util.concurrent.TimeUnit

interface MelodyApiService {

    @GET("api/songs")
    suspend fun getSongs(
        @Query("search") search: String? = null,
        @Query("language") language: String? = null,
        @Query("limit") limit: Int = 100,
        @Query("offset") offset: Int = 0
    ): SongResponse

    @GET("api/songs/{id}")
    suspend fun getSongDetails(@Path("id") id: Long): Response<Map<String, Any>>

    @GET("api/songs/{id}/play")
    suspend fun requestPlayUrl(@Path("id") id: Long): PlayUrlResponse

    @POST("api/songs/{id}/played")
    suspend fun recordPlayed(@Path("id") id: Long): Response<Unit>

    @GET("api/history")
    suspend fun getRecentlyPlayed(): SongResponse

    // --- Favourites (PostgreSQL Synced) ---
    @GET("api/favourites")
    suspend fun getFavourites(): SongResponse

    @POST("api/favourites/{id}")
    suspend fun addFavourite(@Path("id") id: Long): Response<Unit>

    @DELETE("api/favourites/{id}")
    suspend fun removeFavourite(@Path("id") id: Long): Response<Unit>

    // --- Playlists (PostgreSQL Synced) ---
    @GET("api/playlists")
    suspend fun getPlaylists(): PlaylistsResponse

    @POST("api/playlists")
    suspend fun createPlaylist(@Body body: Map<String, String>): Response<Map<String, Any>>

    @GET("api/playlists/{id}")
    suspend fun getPlaylistSongs(@Path("id") id: Long): PlaylistSongsResponse

    @POST("api/playlists/{id}/songs")
    suspend fun addSongToPlaylist(@Path("id") playlistId: Long, @Body body: Map<String, Long>): Response<Unit>

    @DELETE("api/playlists/{id}/songs/{songId}")
    suspend fun removeSongFromPlaylist(@Path("id") playlistId: Long, @Path("songId") songId: Long): Response<Unit>

    @DELETE("api/playlists/{id}")
    suspend fun deletePlaylist(@Path("id") playlistId: Long): Response<Unit>

    // --- Authentication & Devices ---
    @POST("activate")
    suspend fun activateKey(@Body body: Map<String, String>): Response<Map<String, Any>>

    @GET("devices")
    suspend fun getDevices(): Response<Map<String, Any>>

    @POST("devices/{deviceId}/logout")
    suspend fun logoutDevice(@Path("deviceId") deviceId: String): Response<Unit>

    @POST("api/checkout/free")
    suspend fun getFreeKey(@Body body: Map<String, String>): Response<Map<String, Any>>
}

object ApiClient {
    // Production Render URL with 24/7 keep-alive
    var baseUrl = "https://melody-mzsm.onrender.com/"
    var deviceToken: String? = null
    var deviceId: String = "android-" + UUID.randomUUID().toString().take(12)
    var currentUser: AndroidUserProfile? = null

    val isActivated: Boolean
        get() = !deviceToken.isNullOrBlank()

    fun init(context: Context) {
        val prefs = context.getSharedPreferences("melody_prefs", Context.MODE_PRIVATE)
        
        // Persistent unique device ID (prevents hitting 5-device limit on restart)
        var savedDeviceId = prefs.getString("device_id", null)
        if (savedDeviceId.isNullOrBlank()) {
            savedDeviceId = "android-" + UUID.randomUUID().toString().take(12)
            prefs.edit().putString("device_id", savedDeviceId).apply()
        }
        deviceId = savedDeviceId

        // Persistent session token
        deviceToken = prefs.getString("device_token", null)

        // Persistent user profile
        val userJson = prefs.getString("user_profile", null)
        if (!userJson.isNullOrBlank()) {
            try {
                currentUser = Gson().fromJson(userJson, AndroidUserProfile::class.java)
            } catch (e: Exception) {
                e.printStackTrace()
            }
        }
    }

    fun saveSession(context: Context, token: String, user: AndroidUserProfile?) {
        deviceToken = token
        currentUser = user
        val prefs = context.getSharedPreferences("melody_prefs", Context.MODE_PRIVATE)
        val editor = prefs.edit().putString("device_token", token)
        if (user != null) {
            editor.putString("user_profile", Gson().toJson(user))
        }
        editor.apply()
    }

    fun clearSession(context: Context) {
        deviceToken = null
        currentUser = null
        val prefs = context.getSharedPreferences("melody_prefs", Context.MODE_PRIVATE)
        prefs.edit().remove("device_token").remove("user_profile").apply()
    }

    private val okHttpClient: OkHttpClient by lazy {
        OkHttpClient.Builder()
            .addInterceptor { chain ->
                val requestBuilder = chain.request().newBuilder()
                    .addHeader("x-device-id", deviceId)
                deviceToken?.let { token ->
                    requestBuilder.addHeader("Authorization", "Bearer $token")
                }
                chain.proceed(requestBuilder.build())
            }
            .addInterceptor(HttpLoggingInterceptor().apply {
                level = HttpLoggingInterceptor.Level.BASIC
            })
            .connectTimeout(30, TimeUnit.SECONDS)
            .readTimeout(30, TimeUnit.SECONDS)
            .build()
    }

    val service: MelodyApiService by lazy {
        Retrofit.Builder()
            .baseUrl(baseUrl)
            .client(okHttpClient)
            .addConverterFactory(GsonConverterFactory.create())
            .build()
            .create(MelodyApiService::class.java)
    }

    val apiService: MelodyApiService
        get() = service
}

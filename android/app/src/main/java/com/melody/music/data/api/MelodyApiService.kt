package com.melody.music.data.api

import com.melody.music.data.model.*
import okhttp3.OkHttpClient
import okhttp3.logging.HttpLoggingInterceptor
import retrofit2.Response
import retrofit2.Retrofit
import retrofit2.converter.gson.GsonConverterFactory
import retrofit2.http.*
import java.util.concurrent.TimeUnit

interface MelodyApiService {

    @GET("api/songs")
    suspend fun getSongs(
        @Query("search") search: String? = null,
        @Query("language") language: String? = null,
        @Query("limit") limit: Int = 50
    ): SongResponse

    @GET("api/songs/{id}")
    suspend fun getSongDetails(@Path("id") id: Long): Response<Map<String, Any>>

    @GET("api/songs/{id}/play")
    suspend fun requestPlayUrl(@Path("id") id: Long): PlayUrlResponse

    @POST("api/songs/{id}/played")
    suspend fun recordPlayed(@Path("id") id: Long): Response<Unit>

    @GET("api/history")
    suspend fun getRecentlyPlayed(): SongResponse

    @GET("api/favourites")
    suspend fun getFavourites(): SongResponse

    @POST("api/favourites/{id}")
    suspend fun addFavourite(@Path("id") id: Long): Response<Unit>

    @DELETE("api/favourites/{id}")
    suspend fun removeFavourite(@Path("id") id: Long): Response<Unit>

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
    // Production Render URL with UptimeRobot 24/7 keep-alive
    var baseUrl = "https://melody-mzsm.onrender.com/"
    var deviceToken: String? = null
    var deviceId: String = "android-device-" + System.currentTimeMillis().toString().takeLast(6)

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
}

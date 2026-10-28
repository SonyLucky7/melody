package com.melody.music.ads

import android.app.Activity
import android.content.Context
import android.content.SharedPreferences
import android.os.Handler
import android.os.Looper
import android.util.Log
import com.google.android.gms.ads.AdError
import com.google.android.gms.ads.AdRequest
import com.google.android.gms.ads.FullScreenContentCallback
import com.google.android.gms.ads.LoadAdError
import com.google.android.gms.ads.MobileAds
import com.google.android.gms.ads.interstitial.InterstitialAd
import com.google.android.gms.ads.interstitial.InterstitialAdLoadCallback
import com.melody.music.data.api.ApiClient
import com.melody.music.player.MelodyPlayerManager

/**
 * Melody Production Ad & Listening Session Engine
 *
 * Rules:
 * - Free Guest:
 *     * Watch 1 full ad on app launch (unlocks 30 mins free music).
 *     * If closed after 20 mins and reopened, watch 1 ad again on launch (session-based).
 *     * Every 30 mins of active listening -> pauses playback, displays full ad, resumes and resets to 30 mins.
 * - Annual VIP:
 *     * Zero launch ads.
 *     * Every 1 hour (3600s) of active listening -> full ad displays.
 * - Lifetime VIP:
 *     * Zero launch ads.
 *     * Every 3 hours (10800s) CUMULATIVE listening across days/sessions -> full ad displays.
 */
object MelodyAdManager {

    private const val TAG = "MelodyAdManager"

    // Official Google Test Interstitial Ad Unit ID (replace with production ID in AdMob console)
    private const val INTERSTITIAL_AD_UNIT_ID = "ca-app-pub-3940256099942544/1033173712"

    private var interstitialAd: InterstitialAd? = null
    private var isLoadingAd = false
    private var isAdShowing = false

    // Session-based state (in-memory: clears whenever app process terminates)
    var hasWatchedLaunchAdThisSession = false
    var guestSecondsRemaining = 30 * 60 // 30 mins

    // VIP Listening counters
    var annualSecondsListened = 0

    private val mainHandler = Handler(Looper.getMainLooper())

    private var currentActivity: java.lang.ref.WeakReference<Activity>? = null

    fun attachActivity(activity: Activity) {
        currentActivity = java.lang.ref.WeakReference(activity)
    }

    fun detachActivity(activity: Activity) {
        if (currentActivity?.get() == activity) {
            currentActivity = null
        }
    }

    fun init(context: Context) {
        MobileAds.initialize(context) { status ->
            Log.d(TAG, "AdMob MobileAds initialized: $status")
            preloadInterstitial(context)
        }
    }

    fun preloadInterstitial(context: Context) {
        if (interstitialAd != null || isLoadingAd) return
        isLoadingAd = true

        val adRequest = AdRequest.Builder().build()
        InterstitialAd.load(
            context,
            INTERSTITIAL_AD_UNIT_ID,
            adRequest,
            object : InterstitialAdLoadCallback() {
                override fun onAdLoaded(ad: InterstitialAd) {
                    interstitialAd = ad
                    isLoadingAd = false
                    Log.d(TAG, "Melody Interstitial Ad preloaded successfully.")
                }

                override fun onAdFailedToLoad(loadAdError: LoadAdError) {
                    interstitialAd = null
                    isLoadingAd = false
                    Log.w(TAG, "Melody Interstitial Ad failed to load: ${loadAdError.message}")
                }
            }
        )
    }

    /**
     * Checks if a launch ad is required on opening app (Free Guests only)
     */
    fun checkLaunchAd(activity: Activity) {
        val user = ApiClient.currentUser
        if (user != null) {
            // VIP users never get launch ads
            return
        }

        if (!hasWatchedLaunchAdThisSession) {
            mainHandler.postDelayed({
                showInterstitial(activity, reason = "guest_launch") {
                    hasWatchedLaunchAdThisSession = true
                    guestSecondsRemaining = 30 * 60
                    Log.d(TAG, "Guest launch ad watched, granted 30 min free music pass.")
                }
            }, 1000)
        }
    }

    /**
     * Called every 1 second of active playback from MelodyPlayerManager
     */
    fun onPlaybackSecondTick(targetActivity: Activity? = null) {
        if (isAdShowing) return
        val activity = targetActivity ?: currentActivity?.get()
        val user = ApiClient.currentUser

        if (user == null) {
            // 1. Free Guest: Count down 30 minutes active listening
            guestSecondsRemaining--
            if (guestSecondsRemaining <= 0) {
                guestSecondsRemaining = 30 * 60
                triggerListeningAdBreak(activity, reason = "guest_30m")
            }
        } else if (user.plan == "annual") {
            // 2. Annual VIP: Count up to 1 hour (3600 seconds)
            annualSecondsListened++
            if (annualSecondsListened >= 3600) {
                annualSecondsListened = 0
                triggerListeningAdBreak(activity, reason = "annual_60m")
            }
        } else if (user.plan == "lifetime") {
            // 3. Lifetime VIP: Count up to 3 hours (10800s) cumulative across all days/sessions
            if (activity != null) {
                val prefs = activity.getSharedPreferences("melody_prefs", Context.MODE_PRIVATE)
                val current = prefs.getInt("lifetime_cumulative_seconds", 0) + 1
                if (current >= 10800) {
                    prefs.edit().putInt("lifetime_cumulative_seconds", 0).apply()
                    triggerListeningAdBreak(activity, reason = "lifetime_180m")
                } else {
                    prefs.edit().putInt("lifetime_cumulative_seconds", current).apply()
                }
            }
        }
    }

    private fun triggerListeningAdBreak(activity: Activity?, reason: String) {
        if (activity == null) return

        mainHandler.post {
            val wasPlaying = MelodyPlayerManager.isPlaying.value
            if (wasPlaying) {
                MelodyPlayerManager.togglePlay() // Pause audio smoothly
            }

            showInterstitial(activity, reason) {
                // Resume audio once ad is dismissed
                if (wasPlaying && !MelodyPlayerManager.isPlaying.value) {
                    MelodyPlayerManager.togglePlay()
                }
            }
        }
    }

    fun showInterstitial(activity: Activity, reason: String, onDismissed: () -> Unit) {
        val ad = interstitialAd
        if (ad != null) {
            isAdShowing = true
            ad.fullScreenContentCallback = object : FullScreenContentCallback() {
                override fun onAdDismissedFullScreenContent() {
                    interstitialAd = null
                    isAdShowing = false
                    preloadInterstitial(activity)
                    onDismissed()
                }

                override fun onAdFailedToShowFullScreenContent(adError: AdError) {
                    interstitialAd = null
                    isAdShowing = false
                    preloadInterstitial(activity)
                    onDismissed()
                }

                override fun onAdShowedFullScreenContent() {
                    Log.d(TAG, "Showing Melody full ad: $reason")
                }
            }
            ad.show(activity)
        } else {
            // Ad not ready: reload and proceed without blocking playback
            preloadInterstitial(activity)
            onDismissed()
        }
    }
}

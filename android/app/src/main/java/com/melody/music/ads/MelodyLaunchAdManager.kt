package com.melody.music.ads

import android.app.Activity
import android.content.Context
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

/**
 * Melody Launch Ad Engine
 * Rule: Exactly 1 full ad only when the user opens the application.
 * Never interrupts music during playback!
 */
object MelodyLaunchAdManager {

    private const val TAG = "MelodyLaunchAd"
    private const val AD_UNIT_ID = "ca-app-pub-2649114568233395/6656692006"

    private var interstitialAd: InterstitialAd? = null
    private var isLoading = false
    private var hasShownLaunchAdThisOpen = false

    fun init(context: Context) {
        try {
            MobileAds.initialize(context) {
                preloadAd(context)
            }
        } catch (e: Exception) {
            Log.w(TAG, "MobileAds init skipped: ${e.message}")
        }
    }

    private fun preloadAd(context: Context) {
        if (interstitialAd != null || isLoading) return
        isLoading = true

        val request = AdRequest.Builder().build()
        InterstitialAd.load(
            context,
            AD_UNIT_ID,
            request,
            object : InterstitialAdLoadCallback() {
                override fun onAdLoaded(ad: InterstitialAd) {
                    interstitialAd = ad
                    isLoading = false
                    Log.d(TAG, "Launch Ad preloaded successfully.")
                }

                override fun onAdFailedToLoad(error: LoadAdError) {
                    interstitialAd = null
                    isLoading = false
                    Log.w(TAG, "Launch Ad failed to load: ${error.message}")
                }
            }
        )
    }

    /**
     * Shows 1 full ad on application launch/open
     */
    fun showLaunchAdIfFirstOpen(activity: Activity) {
        if (hasShownLaunchAdThisOpen) return

        Handler(Looper.getMainLooper()).postDelayed({
            if (activity.isFinishing || activity.isDestroyed) return@postDelayed
            val ad = interstitialAd
            if (ad != null) {
                ad.fullScreenContentCallback = object : FullScreenContentCallback() {
                    override fun onAdDismissedFullScreenContent() {
                        interstitialAd = null
                        hasShownLaunchAdThisOpen = true
                        Log.d(TAG, "Launch Ad completed. Continuous music playback unlocked.")
                    }

                    override fun onAdFailedToShowFullScreenContent(error: AdError) {
                        interstitialAd = null
                        hasShownLaunchAdThisOpen = true
                    }
                }
                try {
                    ad.show(activity)
                } catch (e: Exception) {
                    Log.w(TAG, "Launch Ad show skipped: ${e.message}")
                }
            } else {
                // If not preloaded yet, mark shown and preload for next app open
                hasShownLaunchAdThisOpen = true
                preloadAd(activity)
            }
        }, 1200)
    }
}

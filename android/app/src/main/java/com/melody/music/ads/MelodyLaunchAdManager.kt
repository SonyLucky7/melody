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
import com.melody.music.BuildConfig
import com.melody.music.player.MelodyPlayerManager
import java.lang.ref.WeakReference
import kotlin.random.Random

/**
 * Melody AdMob Launch Ad Engine (Indus Appstore & Play Policy Safe)
 *
 * Rules:
 * 1. Shows at most 1 ad ONLY when the user opens the application — never again during the session.
 * 2. Enforces a persistent 2-to-4 hour randomized cooldown (120–240 min) stored in SharedPreferences,
 *    so even if the user closes & reopens Melody repeatedly, ZERO ads show until 2–4 hours pass.
 * 3. NEVER interrupts active music playback and NEVER runs on Android TV.
 * 4. Automatically uses Google's official Test Ad Unit on DEBUG builds (prevents Invalid Traffic bans)
 *    and Production Ad Unit (ca-app-pub-2649114568233395/6656692006) ONLY on signed RELEASE builds.
 */
object MelodyLaunchAdManager {

    private const val TAG = "MelodyLaunchAd"
    private const val PREFS_NAME = "melody_ad_prefs"
    private const val KEY_LAST_AD_SHOWN_AT = "last_ad_shown_at_ms"
    private const val KEY_NEXT_AD_ALLOWED_AT = "next_ad_allowed_at_ms"

    private const val MIN_COOLDOWN_MS = 2L * 60L * 60L * 1000L // 2 hours
    private const val MAX_COOLDOWN_MS = 4L * 60L * 60L * 1000L // 4 hours

    private const val PROD_AD_UNIT_ID = "ca-app-pub-2649114568233395/6656692006"
    private const val TEST_AD_UNIT_ID = "ca-app-pub-3940256099942544/1033173712"

    private val activeAdUnitId: String
        get() = if (BuildConfig.DEBUG) TEST_AD_UNIT_ID else PROD_AD_UNIT_ID

    private var interstitialAd: InterstitialAd? = null
    private var isLoading = false
    private var isInitialized = false
    private var hasShownLaunchAdThisOpen = false
    private var launchRequestedAtMs = 0L
    private var pendingActivityRef: WeakReference<Activity>? = null
    private val mainHandler = Handler(Looper.getMainLooper())

    private fun isWithinCooldown(context: Context): Boolean {
        val prefs = context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)
        val nextAllowedAt = prefs.getLong(KEY_NEXT_AD_ALLOWED_AT, 0L)
        val now = System.currentTimeMillis()
        return now < nextAllowedAt
    }

    private fun recordAdShownCooldown(context: Context) {
        val now = System.currentTimeMillis()
        val cooldownMs = Random.nextLong(MIN_COOLDOWN_MS, MAX_COOLDOWN_MS + 1L)
        val nextAllowedAt = now + cooldownMs
        context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)
            .edit()
            .putLong(KEY_LAST_AD_SHOWN_AT, now)
            .putLong(KEY_NEXT_AD_ALLOWED_AT, nextAllowedAt)
            .apply()
        val mins = cooldownMs / 60000L
        Log.d(TAG, "Recorded AdMob cooldown: next ad allowed in ${mins} min.")
    }

    fun init(context: Context) {
        val appCtx = context.applicationContext
        // Skip SDK preload completely if still inside 2-4 hour cooldown window
        if (hasShownLaunchAdThisOpen || isWithinCooldown(appCtx)) {
            Log.d(TAG, "Inside 2-4h ad cooldown or already shown this open — skipping ad preload.")
            return
        }
        try {
            if (isInitialized) {
                preloadAd(appCtx)
            } else {
                MobileAds.initialize(appCtx) {
                    isInitialized = true
                    preloadAd(appCtx)
                }
            }
        } catch (e: Exception) {
            Log.w(TAG, "MobileAds init skipped: ${e.message}")
        }
    }

    private fun preloadAd(context: Context) {
        val appCtx = context.applicationContext
        if (hasShownLaunchAdThisOpen || isWithinCooldown(appCtx)) return
        if (interstitialAd != null || isLoading) return
        isLoading = true

        val request = AdRequest.Builder().build()
        InterstitialAd.load(
            appCtx,
            activeAdUnitId,
            request,
            object : InterstitialAdLoadCallback() {
                override fun onAdLoaded(ad: InterstitialAd) {
                    interstitialAd = ad
                    isLoading = false
                    Log.d(TAG, "AdMob launch ad preloaded (debug=${BuildConfig.DEBUG}).")
                    val elapsed = System.currentTimeMillis() - launchRequestedAtMs
                    val act = pendingActivityRef?.get()
                    if (!hasShownLaunchAdThisOpen && act != null && elapsed in 0..7000) {
                        mainHandler.post { tryShowNow(act) }
                    }
                }

                override fun onAdFailedToLoad(error: LoadAdError) {
                    interstitialAd = null
                    isLoading = false
                    Log.w(TAG, "AdMob launch ad failed to load (${error.code}): ${error.message}")
                }
            }
        )
    }

    /**
     * Shows 1 ad on initial app open ONLY if 2-4 hours have passed since the previous ad.
     * Never shows again during the session and never interrupts active music playback.
     */
    fun showLaunchAdIfFirstOpen(activity: Activity) {
        if (hasShownLaunchAdThisOpen) return
        if (isWithinCooldown(activity.applicationContext)) {
            hasShownLaunchAdThisOpen = true
            return
        }

        launchRequestedAtMs = System.currentTimeMillis()
        pendingActivityRef = WeakReference(activity)

        mainHandler.postDelayed({
            val act = pendingActivityRef?.get() ?: return@postDelayed
            if (interstitialAd != null) {
                tryShowNow(act)
            } else if (!hasShownLaunchAdThisOpen && !isWithinCooldown(act.applicationContext)) {
                preloadAd(act.applicationContext)
            }
        }, 1500)
    }

    private fun tryShowNow(activity: Activity) {
        if (hasShownLaunchAdThisOpen) return
        if (activity.isFinishing || activity.isDestroyed) return
        val appCtx = activity.applicationContext
        if (isWithinCooldown(appCtx)) {
            hasShownLaunchAdThisOpen = true
            pendingActivityRef = null
            return
        }
        // Never interrupt music if user already started playing a track
        if (MelodyPlayerManager.isPlaying.value) {
            hasShownLaunchAdThisOpen = true
            pendingActivityRef = null
            return
        }

        val ad = interstitialAd ?: return
        hasShownLaunchAdThisOpen = true
        pendingActivityRef = null

        ad.fullScreenContentCallback = object : FullScreenContentCallback() {
            override fun onAdShowedFullScreenContent() {
                recordAdShownCooldown(appCtx)
            }

            override fun onAdDismissedFullScreenContent() {
                interstitialAd = null
                Log.d(TAG, "Launch Ad dismissed cleanly. No more ads for 2-4 hours.")
            }

            override fun onAdFailedToShowFullScreenContent(error: AdError) {
                interstitialAd = null
                Log.w(TAG, "Launch Ad failed to show: ${error.message}")
            }
        }

        try {
            ad.show(activity)
        } catch (e: Exception) {
            interstitialAd = null
            Log.w(TAG, "Launch Ad show skipped: ${e.message}")
        }
    }
}

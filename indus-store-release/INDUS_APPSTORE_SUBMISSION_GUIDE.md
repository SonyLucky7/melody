# Indus Appstore (PhonePe) Submission Guide — Melody v1.2.3

Everything in `indus-store-release/` is pre-built, signed with your permanent production release keystore, R8-optimized, security-hardened, and ready for direct upload to the **Indus Appstore Developer Console** (`https://developer.indusappstore.com/`).

---

## 1. Ready-to-Upload Release Binaries & Graphics

| Asset | File Path | Specification |
| :--- | :--- | :--- |
| **App Bundle (Recommended)** | `indus-store-release/Melody-v1.2.3-indus-release.aab` | Production Release-signed `.aab`, R8 minified, `versionCode 15`, `minSdk 24`, `targetSdk 34` |
| **Universal Release APK** | `indus-store-release/Melody-v1.2.3-indus-release.apk` | Production Release-signed `.apk` (v1+v2+v3 APK Signature Scheme, zipaligned, `debuggable=false`) |
| **App Icon** | `indus-store-release/icon-512x512.png` | Exact `512 × 512 px`, 32-bit PNG, full-bleed square (no baked corners), `< 200 KB` |
| **Feature Graphic / Banner** | `indus-store-release/feature-graphic-1024x500.png` | Exact `1024 × 500 px`, 24-bit opaque PNG (no alpha channel) |
| **Android TV Banner** | `indus-store-release/tv-banner-320x180.png` | Exact `320 × 180 px`, PNG |
| **Phone Screenshots (5)** | `indus-store-release/screenshots/01-*.png` … `05-*.png` | `1080 × 1920 px` (9:16 portrait PNGs) |

---

## 2. Production App Signing Details (KEEP BACKED UP!)

> **CRITICAL**: Back up `android/keystore/melody-release.jks` AND `android/keystore.properties` to encrypted offline storage / password manager immediately! Both files are intentionally `.gitignore`'d so they are never pushed to public GitHub. If you ever lose the `.jks` keystore, you will not be able to publish updates for `com.melody.music` on Indus Appstore.

- **Package Name (`applicationId`)**: `com.melody.music`
  *(If Indus Appstore ever reports `com.melody.music` is already registered by another publisher, change `applicationId` in `android/app/build.gradle` — e.g., to `in.melodymusic.app` — and rebuild `bundleRelease assembleRelease`.)*
- **Version Name / Code**: `1.2.3` / `15`
- **Key Alias**: `melody-release`
- **Validity**: 10,000 days (~27 years, until April 2054)
- **SHA-1 Fingerprint**: `C0:5D:16:6C:E0:33:58:99:B1:27:03:FA:4B:E2:D0:12:60:84:BE:45`
- **SHA-256 Fingerprint**: `86:61:72:40:13:AC:53:AF:6C:28:9E:39:9C:A2:C9:B9:2E:25:42:5A:3D:D4:89:E8:85:DC:AA:EA:63:CE:69:CD`

---

## 3. Copy-Paste Store Listing Metadata

- **App Title**: `Melody — HD Music & Offline Player`
- **Category**: `Music & Audio`
- **Content Rating**: `Everyone / 3+` (or `12+` if any tracks contain explicit lyrics)
- **Pricing**: `Free` (Contains Ads: **Yes** — Google AdMob single launch ad; In-App Purchases: **No**)
- **Privacy Policy URL**: `https://melody-chi-nine.vercel.app/privacy.html`
- **Terms of Service URL**: `https://melody-chi-nine.vercel.app/terms.html`
- **Official Website**: `https://melody-chi-nine.vercel.app`
- **Developer Support Email**: *(Enter your preferred public developer contact email in the Indus Appstore Console)*

### Short Description (78 characters)
```text
Stream 320kbps HD music, curated Telugu & global playlists, and offline audio.
```

### Full Description (Copy-Paste Ready — Zero Third-Party Trademarks)
```text
Melody is a fast, modern music streaming and offline audio player built for Android phones, tablets, and Android TV / Google TV.

KEY FEATURES:
• High-Fidelity 320kbps Streaming — Smooth, anti-cut playback engine engineered with smart pre-buffering for uninterrupted listening even on mobile data.
• True Offline Listening Mode — Save your favorite songs directly inside the app's private local storage and play anytime in Airplane Mode with zero internet.
• Curated Public Playlists — Instant access to Telugu melodies (A Telugu), Punjabi classics, Phonk & Workout mixes, Slowed + Reverb, and global pop hits.
• Native Lock Screen & Notification Controls — Full album artwork, interactive progress scrubber, Previous / Play-Pause / Next, Save/Like, and Shuffle right from your lock screen, notification shade, and Bluetooth / car stereo.
• 6-Band Studio Equalizer — Fine-tune Sub-Bass, Punch, Warmth, Vocals, Presence, and Air with built-in audio presets.
• Home Screen Music Widget — Control playback with live album artwork straight from your launcher.
• Universal Android TV & Google TV Edition — Full 10-foot Leanback interface with smooth D-Pad remote navigation included in the same app.
• Cross-Device Library Sync — Optionally sync your custom playlists, liked songs, and recently played history across your devices.

PRIVACY & SECURITY:
Melody uses encrypted HTTPS-only networking and requests only the minimal permissions required for audio streaming and lock screen media controls — never your camera, contacts, SMS, or location.
```

### Release Notes (What's New in v1.2.3)
```text
• Production release optimized for Indus Appstore with full R8 shrinking and HTTPS-only security hardening.
• Added native Lock Screen & Notification media controls with interactive progress scrubber, Save, and Shuffle.
• Upgraded anti-cut OkHttp + ExoPlayer streaming engine with 30s–120s smart buffering and offline local downloads.
• Added public curated Telugu ("A Telugu") and global playlists across Phone & Android TV.
• Upgraded 6-band Equalizer precision sliders, Home Screen Widget artwork, and Android TV navigation.
```

---

## 4. Permissions & Data Safety Declaration Guide

When the Indus Appstore Console asks about permissions & data handling:

| Permission / Question | Declaration Answer |
| :--- | :--- |
| `INTERNET` & `ACCESS_NETWORK_STATE` | Streaming audio over HTTPS and detecting offline mode. |
| `FOREGROUND_SERVICE_MEDIA_PLAYBACK` | Standard Android Media3 foreground service for uninterrupted background music playback with screen locked. |
| `POST_NOTIFICATIONS` | Displays system media playback notification and lock screen controls on Android 13+. |
| `WAKE_LOCK` | Prevents CPU sleep stuttering while streaming audio in the background. |
| **Contains Ads?** | **Yes** — Google AdMob (`com.google.android.gms:play-services-ads:23.0.0`, `app-ads.txt` live at `https://melody-chi-nine.vercel.app/app-ads.txt`). |
| **Sensitive Permissions (Camera, Location, Contacts, SMS, Storage)?** | **None requested.** Offline downloads use private app sandbox storage (`context.filesDir`). |
| **Data Encrypted in Transit?** | **Yes** (`usesCleartextTraffic="false"` enforced in `AndroidManifest.xml` & `network_security_config.xml`). |

---

## 5. Step-by-Step Upload Walkthrough (`developer.indusappstore.com`)

1. Open **[developer.indusappstore.com](https://developer.indusappstore.com/)** and sign in / complete developer KYC verification (Individual or Organization — PAN/GST/Bank verification as prompted by PhonePe Indus Console).
2. Click **Add New App** → enter **App Name** (`Melody — HD Music & Offline Player`), select **Android**, Category **Music & Audio**, and **Free**.
3. Go to **App Releases / Upload Build** → upload **`indus-store-release/Melody-v1.2.3-indus-release.aab`** (or `.apk` if you prefer single-file APK distribution).
4. Under **Store Listing / Graphics**:
   - Upload `icon-512x512.png` (App Icon)
   - Upload `feature-graphic-1024x500.png` (Feature Graphic)
   - Upload all 5 screenshots from `indus-store-release/screenshots/`
   - Paste Short Description, Full Description, and Release Notes from Section 3 above (optionally enable Indus's built-in 12 Indian language listing translations — Telugu, Hindi, Tamil, etc.!).
5. Under **Privacy & Compliance**:
   - Paste Privacy Policy URL: `https://melody-chi-nine.vercel.app/privacy.html`
   - Declare **Contains Ads: Yes** (Google AdMob) and complete the Content Rating questionnaire.
6. Click **Submit for Review**! Indus Appstore performs automated security/malware scanning followed by manual review (typically 1–3 business days).

> **Important Note for Existing Beta/Debug APK Users**: Because `v1.2.3` is signed with your new permanent **Production Release Keystore** (instead of the temporary Android debug key used in `v1.2.2`), uninstall the old debug APK once before installing `v1.2.3`. Every future update (`v1.2.4+`) from Indus Appstore or direct APK will upgrade smoothly in-place without uninstalling!

---

## 6. Google AdMob + Indus Appstore Monetization Guide (IMPORTANT!)

Your Android app already integrates **Google AdMob (`play-services-ads:23.0.0`)** cleanly:
- **AdMob App ID** (`AndroidManifest.xml`): `ca-app-pub-2649114568233395~5170104530`
- **Production Ad Unit ID** (`MelodyLaunchAdManager.kt`): `ca-app-pub-2649114568233395/6656692006`
- **Debug Safety Guard**: Debug builds automatically use Google's official test ad unit (`ca-app-pub-3940256099942544/1033173712`) so local development never triggers AdMob Invalid Traffic penalties; signed Release builds (`v1.2.3`) use your real production Ad Unit ID.
- **`app-ads.txt` Verified**: Live at `https://melody-chi-nine.vercel.app/app-ads.txt` (`google.com, pub-2649114568233395, DIRECT, f08c47fec0942fa0`).
- **Frequency Capped & Music-Safe**: Displays at most **1 ad on initial app open**, followed by a persistent **2–4 hour randomized cooldown** (`SharedPreferences`) so reopening the app shows zero repeat ads during that window. Disabled on Android TV (`!isTvDevice`) and never interrupts active music playback.

### Crucial AdMob Limitation on Indus Appstore (How to Unlock 100% Full Ad Revenue)
As of 2026, **Indus Appstore is not yet on Google AdMob's officially supported store list** (AdMob currently verifies apps via **Google Play**, **Amazon Appstore**, **Samsung Galaxy Store**, **OPPO App Market**, **VIVO App Store**, and **Xiaomi GetApps**).
- If Melody is published **only** on Indus Appstore, Google AdMob will keep ad delivery in **Limited Ad Serving** (very low ad fill).
- **₹0 / Free Fix (Dual-Publish with the Exact Same Signed Build)**:
  1. Upload the **exact same** `Melody-v1.2.3-indus-release.apk` (same `com.melody.music` package ID & same release signature) to **Amazon Appstore** (`developer.amazon.com`, free account) OR **Samsung Galaxy Store** (`seller.samsungapps.com`, free account) OR **Google Play Console**.
  2. Set **Developer Website** in that store listing to `https://melody-chi-nine.vercel.app` so Google AdMob automatically crawls `https://melody-chi-nine.vercel.app/app-ads.txt`.
  3. In **AdMob Console → Apps → App settings**, link your Amazon/Samsung/Play store listing. Once AdMob marks the app **Ready**, full ad serving activates for ALL installs — including your Indus Appstore users!

---

## 7. Optional: Configure GitHub Actions for Signed CI Releases

To let `.github/workflows/build-android.yml` automatically sign future releases with the exact same Indus release key, add these 4 Repository Secrets in GitHub (`Settings → Secrets and variables → Actions`):
- `MELODY_KEYSTORE_BASE64`: Base64 of `android/keystore/melody-release.jks`
- `MELODY_KEYSTORE_PASSWORD`: `storePassword` from `android/keystore.properties`
- `MELODY_KEY_ALIAS`: `melody-release`
- `MELODY_KEY_PASSWORD`: `keyPassword` from `android/keystore.properties`

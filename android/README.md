# Melody Android Application (Media3 / ExoPlayer + Jetpack Compose)

Redesigned Spotify-style native Android music player for **Melody** with AndroidX Media3 ExoPlayer audio pipeline, Option 1 licence activation, and persistent foreground playback service.

---

## 📱 Features
- **AndroidX Media3 ExoPlayer**: Audio streaming with 64 KB HTTP 206 range requests, seamless seeking, and hardware audio offload (`C.AUDIO_CONTENT_TYPE_MUSIC`, `C.USAGE_MEDIA`).
- **Foreground Playback Service**: System notification with playback controls (Play/Pause, Next, Previous) and lockscreen artwork integration via `MediaSession`.
- **Jetpack Compose Material 3 UI**:
  - Immersive Spotify-style dark theme (`#0F0F13`).
  - Home screen with "Good evening" greeting, 2x3 quick picks grid, and language filters (All, English, Hindi, Tamil, Telugu, Punjabi).
  - Floating bottom `MiniPlayerBar` with real-time linear progress indicator.
  - Expandable `FullPlayerSheet` with large album artwork, seek slider, and high-fidelity "320k" audio badge.
- **Option 1 Key Activation (`RAHS-HA98-7654`)**:
  - Direct key activation dialog.
  - Instant free key generator (First name + Surname + Mobile number).
  - 5-device concurrency management.
- **Melody Branding**: Uses the official app icon and logos from `logos/Melody-Logo-Pack`.

---

## 🛠️ How to Build & Run

### 1. Requirements
- Android Studio Hedgehog (2023.1.1) or newer
- JDK 17
- Android SDK 34 (minSdk 24)

### 2. Configure Backend URL
In `android/app/src/main/java/com/melody/music/data/api/MelodyApiService.kt`:
```kotlin
// For Android Emulator (10.0.2.2 maps to localhost of your dev PC):
var baseUrl = "http://10.0.2.2:5000/"

// For physical device testing over Wi-Fi:
var baseUrl = "http://192.168.1.X:5000/"
```

### 3. Build Debug APK
```bash
cd android
./gradlew assembleDebug
```
The APK will be generated at:
`android/app/build/outputs/apk/debug/app-debug.apk`

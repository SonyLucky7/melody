# ==============================================================================
# Melody Android Production ProGuard / R8 Rules (Indus Appstore & Play Release)
# ==============================================================================

# Preserve line numbers for clean crash diagnostics
-keepattributes SourceFile,LineNumberTable
-renamesourcefileattribute SourceFile

# Keep Kotlin Metadata & Coroutines
-keep class kotlin.Metadata { *; }
-keepclassmembers class kotlinx.coroutines.** {
    volatile <fields>;
}

# Keep Melody API Data Models (Gson reflection)
-keep class com.melody.music.data.model.** { *; }
-keepattributes Signature,InnerClasses,EnclosingMethod,*Annotation*

# Retrofit 2
-keepattributes RuntimeVisibleAnnotations, RuntimeVisibleParameterAnnotations
-keepclassmembers,allowshrinking,allowobfuscation interface * {
    @retrofit2.http.* <methods>;
}
-dontwarn org.codehaus.mojo.animal_sniffer.IgnoreJRERequirement
-dontwarn javax.annotation.**
-dontwarn kotlin.Unit
-dontwarn retrofit2.KotlinExtensions
-dontwarn retrofit2.KotlinExtensions$*
-if interface * { @retrofit2.http.* <methods>; }
-keep,allowobfuscation interface <1>
-if interface * { @retrofit2.http.* <methods>; }
-keep,allowobfuscation interface * extends <1>

# Gson
-keep class com.google.gson.** { *; }
-keep class * extends com.google.gson.TypeAdapter
-keep class * extends com.google.gson.TypeAdapterFactory
-keep class * extends com.google.gson.JsonSerializer
-keep class * extends com.google.gson.JsonDeserializer

# OkHttp 4 & Okio
-dontwarn okhttp3.**
-dontwarn okio.**
-dontwarn javax.annotation.**
-dontwarn org.conscrypt.**
-dontwarn org.bouncycastle.**
-dontwarn org.openjsse.**

# AndroidX Media3 (ExoPlayer + MediaSession + OkHttp DataSource)
-keep class androidx.media3.** { *; }
-dontwarn androidx.media3.**

# Coil Image Loading
-keep class coil.** { *; }
-dontwarn coil.**

# Google Mobile Ads (AdMob)
-keep public class com.google.android.gms.ads.** { public *; }
-keep public class com.google.ads.** { public *; }
-dontwarn com.google.android.gms.**

# App Widgets & Playback Service (manifest-referenced components)
-keep public class com.melody.music.MelodyApplication { *; }
-keep public class com.melody.music.MainActivity { *; }
-keep public class com.melody.music.player.MelodyPlaybackService { *; }
-keep public class com.melody.music.widget.MelodyAppWidgetProvider { *; }

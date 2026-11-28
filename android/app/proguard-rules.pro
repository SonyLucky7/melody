# ==============================================================================
# Melody Android Production ProGuard / R8 Rules (Retrofit + Suspend + Gson Safe)
# ==============================================================================

-keepattributes SourceFile,LineNumberTable
-renamesourcefileattribute SourceFile
-keepattributes Signature,InnerClasses,EnclosingMethod,*Annotation*,Exceptions,AnnotationDefault
-keepattributes RuntimeVisibleAnnotations,RuntimeVisibleParameterAnnotations

# Keep Kotlin Metadata & Coroutines Continuation (REQUIRED for Retrofit 2 suspend functions!)
-keep class kotlin.Metadata { *; }
-keep class kotlin.coroutines.Continuation { *; }
-keep class kotlin.coroutines.Continuation** { *; }
-keepclassmembers class kotlinx.coroutines.** {
    volatile <fields>;
}

# Keep ALL Melody API interfaces, Data Models, and Offline Download Models un-obfuscated
-keep interface com.melody.music.data.api.MelodyApiService { *; }
-keep class com.melody.music.data.api.** { *; }
-keep class com.melody.music.data.model.** { *; }
-keep class com.melody.music.data.download.DownloadedSong { *; }

# Retrofit 2
-keep class retrofit2.** { *; }
-keepclassmembers interface * {
    @retrofit2.http.* <methods>;
}
-dontwarn org.codehaus.mojo.animal_sniffer.IgnoreJRERequirement
-dontwarn javax.annotation.**
-dontwarn kotlin.Unit
-dontwarn retrofit2.KotlinExtensions
-dontwarn retrofit2.KotlinExtensions$*

# Gson + Anonymous TypeToken Subclasses (REQUIRED for Gson fromJson<List<Song>> / Map<String, DownloadedSong>)
-keep class com.google.gson.** { *; }
-keep class * extends com.google.gson.reflect.TypeToken { *; }
-keep public class * implements java.lang.reflect.Type
-keep class * extends com.google.gson.TypeAdapter
-keep class * extends com.google.gson.TypeAdapterFactory
-keep class * extends com.google.gson.JsonSerializer
-keep class * extends com.google.gson.JsonDeserializer

# OkHttp 4 & Okio
-dontwarn okhttp3.**
-dontwarn okio.**
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

# App Widgets & Playback Service
-keep public class com.melody.music.MelodyApplication { *; }
-keep public class com.melody.music.MainActivity { *; }
-keep public class com.melody.music.player.MelodyPlaybackService { *; }
-keep public class com.melody.music.widget.MelodyAppWidgetProvider { *; }

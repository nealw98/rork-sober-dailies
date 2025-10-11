# Add project specific ProGuard rules here.
# By default, the flags in this file are appended to flags specified
# in /usr/local/Cellar/android-sdk/24.3.3/tools/proguard/proguard-android.txt
# You can edit the include path and order by changing the proguardFiles
# directive in build.gradle.
#
# For more details, see
#   http://developer.android.com/guide/developing/tools/proguard.html

# React Native Core
-keep,allowobfuscation @interface com.facebook.proguard.annotations.DoNotStrip
-keep,allowobfuscation @interface com.facebook.proguard.annotations.KeepGettersAndSetters
-keep,allowobfuscation @interface com.facebook.common.internal.DoNotStrip
-keep @com.facebook.proguard.annotations.DoNotStrip class *
-keep @com.facebook.common.internal.DoNotStrip class *
-keepclassmembers class * {
    @com.facebook.proguard.annotations.DoNotStrip *;
    @com.facebook.common.internal.DoNotStrip *;
}

# Keep React Native classes and JNI methods
-keep class com.facebook.react.** { *; }
-keep class com.facebook.jni.** { *; }
-keep class com.facebook.hermes.** { *; }

# Keep SoLoader classes (critical for loading native libraries)
-keep class com.facebook.soloader.** { *; }

# Keep all native methods (JNI)
-keepclasseswithmembernames,includedescriptorclasses class * {
    native <methods>;
}

# Keep React Native feature flags (fixes libreact_featureflagsjni.so issue)
-keep class com.facebook.react.internal.featureflags.** { *; }
-keep interface com.facebook.react.internal.featureflags.** { *; }

# Keep TurboModules
-keep class com.facebook.react.turbomodule.** { *; }
-keep interface com.facebook.react.turbomodule.** { *; }

# Keep ReactInstanceManager and related classes
-keep class com.facebook.react.ReactInstanceManager { *; }
-keep class com.facebook.react.bridge.** { *; }
-keep class com.facebook.react.uimanager.** { *; }
-keep class com.facebook.react.modules.** { *; }

# react-native-reanimated
-keep class com.swmansion.reanimated.** { *; }

# Add any project specific keep options here:

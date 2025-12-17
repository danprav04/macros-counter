# Add this file to the root of your project directory

# Preserve React Native and Expo classes that are required at runtime
-keep class com.facebook.react.** { *; }
-keep class com.facebook.soloader.** { *; }
-keep class expo.** { *; }
-keep class host.exp.exponent.** { *; }

# Keep hermes debugger
-keep class com.facebook.hermes.inspector.** { *; }

# Keep native modules and view managers
-keep public class * extends com.facebook.react.bridge.BaseJavaModule
-keep public class * extends com.facebook.react.uimanager.ViewManager

# Prevent R8 from removing annotations
-keepattributes *Annotation*

# Keep Javascript and source-code related attributes
-keepattributes JavascriptInterface,SourceFile,LineNumberTable

# Keep static inner classes with this pattern
-keep class **.R$* { *; }

# For react-native-reanimated
-keep class com.swmansion.reanimated.** { *; }

# For react-native-screens
-keep class com.swmansion.rnscreens.** { *; }

# For react-native-svg
-keep public class com.horcrux.svg.** {*;}

# For react-native-webview
-keepclassmembers class * {
    @android.webkit.JavascriptInterface <methods>;
}

# For react-native-google-mobile-ads
-keep public class com.google.android.gms.ads.** {
   public *;
}
-keep public class com.google.android.gms.internal.ads.** {
   public *;
}
-keep class com.google.android.gms.ads.internal.ClientApi {
    *;
}

# -------------------------------------------------------------------------
# React Native IAP & Google Play Billing Rules
# -------------------------------------------------------------------------

# Keep Google Play Billing Library (Crucial for v6+)
-keep class com.android.billingclient.** { *; }

# Keep React Native IAP library classes
-keep class com.dooboolab.rniap.** { *; }

# Keep Google Play Services API (Needed for some billing intents)
-keep class com.google.android.gms.common.api.** { *; }

# Kotlin Metadata (Required for billing client reflection to work correctly)
-keep class kotlin.Metadata { *; }

# -------------------------------------------------------------------------
# React Native Nitro Modules (Required for IAP v14+)
# -------------------------------------------------------------------------

# Keep Nitro Modules interfaces (prevent stripping of hybrid objects)
-keep class com.margelo.nitro.** { *; }
-keep class com.facebook.react.turbo.** { *; }
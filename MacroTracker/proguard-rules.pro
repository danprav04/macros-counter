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

# Keep Javascript an source-code related attributes
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

# Add any other rules for third-party libraries that require them here
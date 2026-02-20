export default {
  name: "Macros Vision AI",
  slug: "MacroTracker",
  version: "4.5.0",
  runtimeVersion: {
    policy: "appVersion"
  },
  owner: "danprav",
  orientation: "portrait",
  icon: "./assets/icon.png",
  scheme: "macrosvisionai",
  userInterfaceStyle: "automatic",
  updates: {
    url: "https://u.expo.dev/25ac2bcf-78a3-4f2c-a635-4fcaae7b93f1"
  },
  splash: {
    image: "./assets/splash.png",
    resizeMode: "contain",
    backgroundColor: "#000000"
  },
  androidStatusBar: {
    backgroundColor: "#000000",
    translucent: false,
    barStyle: "light-content"
  },
  assetBundlePatterns: [
    "**/*"
  ],
  ios: {
    supportsTablet: true,
    bundleIdentifier: "com.macrosvisionai.app",
    infoPlist: {
      UIStatusBarStyle: "UIStatusBarStyleAutomatic",
      NSCameraUsageDescription: "Allow $(PRODUCT_NAME) to access your camera to take photos of food for macro analysis.",
      NSPhotoLibraryUsageDescription: "Allow $(PRODUCT_NAME) to access your photos to select food images for macro analysis.",
      GADApplicationIdentifier: "ca-app-pub-5977125521868950~5744485886"
    }
  },
  android: {
    adaptiveIcon: {
      foregroundImage: "./assets/adaptive-icon.png",
      backgroundColor: "#ffffff"
    },
    package: "com.macrosvisionai.app",
    versionCode: 22,
    userInterfaceStyle: "automatic",
    permissions: [
      "android.permission.CAMERA",
      "android.permission.READ_EXTERNAL_STORAGE",
      "android.permission.WRITE_EXTERNAL_STORAGE",
      "android.permission.ACCESS_NETWORK_STATE",
      "android.permission.FOREGROUND_SERVICE",
      "android.permission.WAKE_LOCK",
      "com.android.vending.BILLING"
    ],
    intentFilters: [
      {
        action: "VIEW",
        autoVerify: true,
        data: [
          {
            scheme: "https",
            host: "v1.macros-vision-ai.xyz"
          }
        ],
        category: [
          "BROWSABLE",
          "DEFAULT"
        ]
      }
    ]
  },
  web: {
    favicon: "./assets/favicon.png"
  },
  plugins: [
    [
      "expo-build-properties",
      {
        android: {
          kotlinVersion: "2.1.20",
          compileSdkVersion: 35,
          targetSdkVersion: 35,
          ndkVersion: "27.0.12077973"
        }
      }
    ],
    "./plugins/withAndroidProguard.js",
    "./plugins/withGradleMemory.js",
    "expo-dev-client",
    [
      "react-native-google-mobile-ads",
      {
        androidAppId: "ca-app-pub-5977125521868950~5744485886",
        iosAppId: "ca-app-pub-5977125521868950~5744485886",
        userTrackingUsageDescription: "This identifier will be used to deliver personalized ads to you."
      }
    ],
    "expo-document-picker",
    [
      "expo-image-picker",
      {
        photosPermission: "Allow $(PRODUCT_NAME) to access your photos to select food images for macro analysis.",
        cameraPermission: "Allow $(PRODUCT_NAME) to access your camera to take photos of food for macro analysis.",
        microphonePermission: false
      }
    ],
    "expo-secure-store",
    "expo-localization",
    "react-native-iap"
  ],
  extra: {
    eas: {
      projectId: "25ac2bcf-78a3-4f2c-a635-4fcaae7b93f1"
    },
    storeLinks: {
      ios: "https://apps.apple.com/app/your-app-id",
      android: "https://play.google.com/store/apps/details?id=com.macrosvisionai.app"
    },
    env: {
      BACKEND_URL_PRODUCTION: "https://v1.macros-vision-ai.xyz",
      BACKEND_URL_DEVELOPMENT: "https://v1.macros-vision-ai.xyz"
    }
  }
};
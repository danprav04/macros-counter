// App.tsx
import "react-native-get-random-values"; // MUST BE FIRST
import Toast from "react-native-toast-message";
import React, { useEffect } from "react";
import AppNavigator from "./src/navigation/AppNavigator";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { Text, TextInput } from "react-native";
import { AuthProvider } from "./src/context/AuthContext";
import { initializeAds } from './src/services/adService';

// --- FONT SCALING PATCH ---
if ((Text as any).defaultProps == null) (Text as any).defaultProps = {};
(Text as any).defaultProps.allowFontScaling = false;
if ((TextInput as any).defaultProps == null) (TextInput as any).defaultProps = {};
(TextInput as any).defaultProps.allowFontScaling = false;
// --- END FONT SCALING PATCH ---

const App = () => {
  useEffect(() => {
    // Initialize the ad service when the app starts.
    initializeAds();
  }, []);

  return (
    <AuthProvider>
      <SafeAreaProvider>
        <AppNavigator />
        <Toast />
      </SafeAreaProvider>
    </AuthProvider>
  );
};

export default App;
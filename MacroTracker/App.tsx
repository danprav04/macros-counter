// MacroTracker/App.tsx

import "react-native-get-random-values"; // MUST BE FIRST
import Toast from "react-native-toast-message";
import React, { useEffect, useState } from "react"; // Added useState
import AppNavigator from "./src/navigation/AppNavigator";
import { SafeAreaProvider } from "react-native-safe-area-context";
// 1. Add LogBox to imports
import { Text, TextInput, LogBox } from "react-native"; 
import { AuthProvider } from "./src/context/AuthContext";
import { CostsProvider } from "./src/context/CostsContext";
import { initializeAds } from './src/services/adService';
import { AdsConsent, AdsConsentStatus } from 'react-native-google-mobile-ads'; // Added Import

// --- FONT SCALING PATCH ---
if ((Text as any).defaultProps == null) (Text as any).defaultProps = {};
(Text as any).defaultProps.allowFontScaling = false;
if ((TextInput as any).defaultProps == null) (TextInput as any).defaultProps = {};
(TextInput as any).defaultProps.allowFontScaling = false;
// --- END FONT SCALING PATCH ---

// 2. Add Log Suppression
LogBox.ignoreLogs([
  'Each child in a list should have a unique "key" prop',
]);

const App = () => {
  const [isMobileAdsStart, setIsMobileAdsStart] = useState(false);

  useEffect(() => {
    const loadConsent = async () => {
      try {
        // 1. Request the latest consent info from Google
        const consentInfo = await AdsConsent.requestInfoUpdate();

        // 2. If a form is available (e.g., user is in Europe/US), load and show it
        if (
          consentInfo.isConsentFormAvailable &&
          consentInfo.status === AdsConsentStatus.REQUIRED
        ) {
          const { status } = await AdsConsent.loadAndShowConsentFormIfRequired();
          // status is the new consent status after the user clicked a button
        }
      } catch (error) {
        console.log('Error checking consent:', error);
      } finally {
        // 3. Initialize the Ads SDK (only after consent flow is done!)
        await initializeAds();
        setIsMobileAdsStart(true); 
      }
    };

    loadConsent();
  }, []);

  // Optional: You can return a loading screen (null) until ads are ready, 
  // or just let the app load immediately while ads init in background.
  // if (!isMobileAdsStart) return null; 

  return (
    <AuthProvider>
      <CostsProvider>
        <SafeAreaProvider>
          <AppNavigator />
          <Toast />
        </SafeAreaProvider>
      </CostsProvider>
    </AuthProvider>
  );
};

export default App;
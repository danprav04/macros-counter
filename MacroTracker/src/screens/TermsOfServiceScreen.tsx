// src/screens/TermsOfServiceScreen.tsx
import React, { useState } from 'react';
import { View, StyleSheet, ActivityIndicator } from 'react-native';
import { WebView } from 'react-native-webview';
import { useTheme } from '@rneui/themed';
import Constants from 'expo-constants';

const TermsOfServiceScreen: React.FC = () => {
  const { theme } = useTheme();
  const [isLoading, setIsLoading] = useState(true);

  // The ToS is a public document served by the backend
  const termsUrl = `${Constants.expoConfig?.extra?.env?.BACKEND_URL_PRODUCTION}/terms-of-service`;

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <WebView
        source={{ uri: termsUrl }}
        onLoadStart={() => setIsLoading(true)}
        onLoadEnd={() => setIsLoading(false)}
        onError={(syntheticEvent) => {
          const { nativeEvent } = syntheticEvent;
          console.warn('WebView error: ', nativeEvent);
          setIsLoading(false);
        }}
        style={styles.webview}
        // Transparent logic to ensure seamless background transition
        containerStyle={{ backgroundColor: theme.colors.background }}
      />
      {isLoading && (
        <View style={[styles.loadingOverlay, { backgroundColor: theme.colors.background }]}>
          <ActivityIndicator size="large" color={theme.colors.primary} />
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  webview: {
    flex: 1,
    opacity: 0.99, // Rendering hack for some Android versions to prevent white flash
  },
  loadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
  },
});

export default TermsOfServiceScreen;
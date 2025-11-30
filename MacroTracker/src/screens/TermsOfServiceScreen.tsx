// src/screens/TermsOfServiceScreen.tsx
import React, { useState } from 'react';
import { View, StyleSheet, ActivityIndicator } from 'react-native';
import { WebView } from 'react-native-webview';
import { useTheme } from '@rneui/themed';
import { TERMS_OF_SERVICE_HTML } from '../constants/termsOfServiceText';

const TermsOfServiceScreen: React.FC = () => {
  const { theme } = useTheme();
  const [isLoading, setIsLoading] = useState(true);

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <WebView
        originWhitelist={['*']}
        source={{ html: TERMS_OF_SERVICE_HTML }}
        style={[styles.webview, { backgroundColor: theme.colors.background }]}
        onLoadEnd={() => setIsLoading(false)}
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
  },
  loadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
  },
});

export default TermsOfServiceScreen;
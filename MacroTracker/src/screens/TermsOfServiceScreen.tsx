// src/screens/TermsOfServiceScreen.tsx
import React, { useState, useMemo } from 'react';
import { View, StyleSheet, ActivityIndicator } from 'react-native';
import { WebView } from 'react-native-webview';
import { useTheme } from '@rneui/themed';
import { getTermsOfServiceHTML, TermsHtmlColors } from '../constants/termsOfServiceText';

const TermsOfServiceScreen: React.FC = () => {
  const { theme } = useTheme();
  const [isLoading, setIsLoading] = useState(true);

  // Generate the HTML based on the current theme colors
  const htmlContent = useMemo(() => {
    // Define theme-aware colors for the HTML content
    const colors: TermsHtmlColors = {
      background: theme.colors.background,
      text: theme.colors.text,
      primary: theme.colors.primary,
      // Logic from SettingsScreen backup warning container for consistency
      warningBackground: theme.mode === 'light' ? '#fff3cd' : '#3e2e1e', 
      // Yellow text in light mode, lighter yellow/orange in dark mode for readability
      warningText: theme.mode === 'light' ? '#856404' : '#f59e0b',
      warningBorder: theme.colors.warning,
      error: theme.colors.error,
      divider: theme.colors.divider,
    };

    return getTermsOfServiceHTML(colors);
  }, [theme]);

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <WebView
        originWhitelist={['*']}
        source={{ html: htmlContent }}
        style={[styles.webview, { backgroundColor: theme.colors.background }]}
        onLoadEnd={() => setIsLoading(false)}
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
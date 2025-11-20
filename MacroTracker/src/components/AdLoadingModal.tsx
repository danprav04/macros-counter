// src/components/AdLoadingModal.tsx
import React, { useEffect, useState } from 'react';
import { View, ActivityIndicator, StyleSheet } from 'react-native';
import { Overlay, Text, useTheme, makeStyles } from '@rneui/themed';
import { setAdLoadingListener } from '../services/adService';
import { t } from '../localization/i18n';

const AdLoadingModal: React.FC = () => {
  const [isVisible, setIsVisible] = useState(false);
  const { theme } = useTheme();
  const styles = useStyles();

  useEffect(() => {
    // Register listener to show/hide modal based on ad service state
    setAdLoadingListener((isLoading) => {
      setIsVisible(isLoading);
    });
    
    // Cleanup listener on unmount
    return () => setAdLoadingListener(null);
  }, []);

  return (
    <Overlay 
      isVisible={isVisible} 
      overlayStyle={styles.overlay} 
      backdropStyle={styles.backdrop}
      animationType="fade"
    >
      <View style={styles.content}>
        <ActivityIndicator size="large" color={theme.colors.primary} />
        <Text h4 h4Style={styles.text}>{t('ads.loading')}</Text>
      </View>
    </Overlay>
  );
};

const useStyles = makeStyles((theme) => ({
  overlay: {
    backgroundColor: theme.colors.card,
    borderRadius: 15,
    padding: 30,
    width: '80%',
    maxWidth: 300,
    elevation: 5,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
  },
  backdrop: {
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  content: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  text: {
    marginTop: 20,
    color: theme.colors.text,
    textAlign: 'center',
    fontSize: 18,
  },
}));

export default AdLoadingModal;
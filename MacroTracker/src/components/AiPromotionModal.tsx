// src/components/AiPromotionModal.tsx
import React from 'react';
import { View, StyleSheet, Modal } from 'react-native';
import { Text, Button, Icon, useTheme } from '@rneui/themed';
import { saveSettings, loadSettings } from '../services/storageService';
import { Settings } from '../types/settings';
import { t } from '../localization/i18n';

interface AiPromotionModalProps {
  isVisible: boolean;
  onClose: () => void;
  onTryNow: () => void;
}

const AiPromotionModal: React.FC<AiPromotionModalProps> = ({ isVisible, onClose, onTryNow }) => {
  const { theme } = useTheme();

  const handleDismiss = async () => {
    try {
        const current = await loadSettings();
        const updated: Settings = { ...current, isAiPromoDismissed: true };
        await saveSettings(updated);
    } catch (e) {
        console.warn("Failed to save dismiss pref");
    }
    onClose();
  };

  const handleTryNow = () => {
      onTryNow();
      handleDismiss(); // Also dismiss future prompts if they try it
  };

  return (
    <Modal visible={isVisible} transparent animationType="slide" onRequestClose={handleDismiss}>
      <View style={styles.backdrop}>
        <View style={[styles.container, { backgroundColor: theme.colors.card }]}>
          <View style={styles.iconContainer}>
             <Icon name="auto-awesome" type="material" size={40} color={theme.colors.white} />
          </View>
          
          <Text h4 style={[styles.title, { color: theme.colors.text }]}>
            {t('aiPromo.title')}
          </Text>
          
          <Text style={[styles.message, { color: theme.colors.grey2 }]}>
            {t('aiPromo.message')}
          </Text>

          <Button
            title={t('aiPromo.tryNow')}
            onPress={handleTryNow}
            buttonStyle={[styles.button, { backgroundColor: theme.colors.primary }]}
            containerStyle={styles.buttonContainer}
            icon={<Icon name="arrow-right" type="material-community" color="white" size={20} style={{marginLeft: 10}} />}
            iconRight
          />
          
          <Button
            title={t('aiPromo.dontShowAgain')}
            type="clear"
            onPress={handleDismiss}
            titleStyle={{ color: theme.colors.grey3, fontSize: 13 }}
          />
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 30,
  },
  container: {
    width: '100%',
    maxWidth: 340,
    borderRadius: 24,
    padding: 30,
    alignItems: 'center',
    elevation: 10,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 5 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
  },
  iconContainer: {
      width: 70,
      height: 70,
      borderRadius: 35,
      backgroundColor: '#9C27B0', // Purple for AI
      justifyContent: 'center',
      alignItems: 'center',
      marginBottom: 20,
      elevation: 5,
  },
  title: {
    marginBottom: 10,
    textAlign: 'center',
    fontWeight: 'bold',
  },
  message: {
    textAlign: 'center',
    marginBottom: 25,
    fontSize: 16,
    lineHeight: 24,
  },
  buttonContainer: {
    width: '100%',
    marginBottom: 10,
  },
  button: {
    borderRadius: 12,
    paddingVertical: 14,
  },
});

export default AiPromotionModal;
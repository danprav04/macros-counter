// src/components/RatingRequestModal.tsx
import React from 'react';
import { View, StyleSheet, Modal } from 'react-native';
import { Text, Button, Icon, useTheme } from '@rneui/themed';
import { handleRemindLater, handleDismissRating, handleRateNow } from '../services/ratingService';
import { t } from '../localization/i18n';

interface RatingRequestModalProps {
  isVisible: boolean;
  onClose: () => void;
}

const RatingRequestModal: React.FC<RatingRequestModalProps> = ({ isVisible, onClose }) => {
  const { theme } = useTheme();

  const onRemindLater = async () => {
    await handleRemindLater();
    onClose();
  };

  const onDismiss = async () => {
    await handleDismissRating();
    onClose();
  };

  const onRate = async () => {
    await handleRateNow();
    onClose();
  };

  return (
    <Modal visible={isVisible} transparent animationType="slide" onRequestClose={onRemindLater}>
      <View style={styles.backdrop}>
        <View style={[styles.container, { backgroundColor: theme.colors.card }]}>
          <View style={styles.iconContainer}>
            <Icon name="star" type="material" size={40} color={theme.colors.white} />
          </View>
          
          <Text h4 style={[styles.title, { color: theme.colors.text }]}>
            {t('ratingRequest.title')}
          </Text>
          
          <Text style={[styles.message, { color: theme.colors.secondary }]}>
            {t('ratingRequest.message')}
          </Text>

          <Button
            title={t('ratingRequest.rateNow')}
            onPress={onRate}
            buttonStyle={[styles.button, { backgroundColor: theme.colors.primary }]}
            containerStyle={styles.buttonContainer}
            icon={<Icon name="star" type="material" color="white" size={20} style={{marginLeft: 10}} />}
            iconRight
          />
          
          <Button
            title={t('ratingRequest.remindLater')}
            type="clear"
            onPress={onRemindLater}
            titleStyle={{ color: theme.colors.grey3, fontSize: 13 }}
          />
          
          <Button
            title={t('ratingRequest.dismiss')}
            type="clear"
            onPress={onDismiss}
            titleStyle={{ color: theme.colors.grey4, fontSize: 12 }}
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
    backgroundColor: '#FFA000', // Amber/Gold for rating
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

export default RatingRequestModal;

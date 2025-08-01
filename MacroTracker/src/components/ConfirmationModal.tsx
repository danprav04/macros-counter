// src/components/ConfirmationModal.tsx
// components/ConfirmationModal.tsx
import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Overlay, Button, Input, Text, useTheme } from '@rneui/themed';
import { t } from '../localization/i18n';

interface ConfirmationModalProps {
  isVisible: boolean;
  onCancel: () => void;
  onConfirm: () => void;
  confirmationText: string;
  setConfirmationText: (text: string) => void;
  title?: string;
  message?: string;
  inputPlaceholder?: string;
}

const ConfirmationModal: React.FC<ConfirmationModalProps> = ({
  isVisible,
  onCancel,
  onConfirm,
  confirmationText,
  setConfirmationText,
  title,
  message,
  inputPlaceholder
}) => {
  const { theme } = useTheme();

  const modalTitle = title || t('confirmationModal.defaultTitle');
  const modalMessage = message || t('confirmationModal.defaultMessage');
  const modalPlaceholder = inputPlaceholder || t('confirmationModal.enterTextPlaceholder');
  const isConfirmDisabled = confirmationText === "";


  return (
    <Overlay
      isVisible={isVisible}
      onBackdropPress={onCancel}
      overlayStyle={[styles.overlay, { backgroundColor: theme.colors.card }]}
      backdropStyle={styles.backdrop}
    >
      <View style={styles.container}>
        <Text style={[styles.title, {color: theme.colors.text}]}>{modalTitle}</Text>
        <Text style={[styles.message, {color: theme.colors.text}]}>{modalMessage}</Text>
        <Input
          placeholder={modalPlaceholder}
          placeholderTextColor={theme.colors.grey3} // Adjusted for better visibility
          value={confirmationText}
          onChangeText={setConfirmationText}
          containerStyle={styles.inputContainer}
          inputStyle={{ color: theme.colors.text, textAlign: 'left' }}
          inputContainerStyle={{borderBottomColor: theme.colors.text}}
        />
        <View style={styles.buttonContainer}>
          <Button title={t('confirmationModal.cancel')} onPress={onCancel} type="outline" buttonStyle={styles.button} />
          <Button
            title={t('confirmationModal.confirm')}
            onPress={onConfirm}
            color="error"
            buttonStyle={styles.button}
            disabled={isConfirmDisabled}
            accessibilityState={{ disabled: isConfirmDisabled }}
          />
        </View>
      </View>
    </Overlay>
  );
};

const styles = StyleSheet.create({
    overlay: {
        borderRadius: 10,
        width: '80%',
        padding: 0,
    },
  container: {
    padding: 20,
    borderRadius: 10,
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 10,
    textAlign: 'center',
  },
  message: {
    marginBottom: 15,
    textAlign: 'center'
  },
  inputContainer: {
    marginBottom: 20,
  },
  buttonContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  button: {
    width: 100,
    padding: 10,
  },
  backdrop: {
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
});

export default ConfirmationModal;
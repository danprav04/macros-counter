// src/components/DeleteAccountModal.tsx
import React, { useState } from 'react';
import { View, StyleSheet, Alert } from 'react-native';
import { Overlay, Button, Input, Text, useTheme, Icon } from '@rneui/themed';
import { deleteCurrentUserAccount } from '../services/backendService';
import { BackendError } from '../services/backendService';
import { t } from '../localization/i18n';

interface DeleteAccountModalProps {
  isVisible: boolean;
  onClose: () => void;
  onAccountDeleted: () => void;
}

const DeleteAccountModal: React.FC<DeleteAccountModalProps> = ({
  isVisible,
  onClose,
  onAccountDeleted,
}) => {
  const { theme } = useTheme();
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isPasswordVisible, setIsPasswordVisible] = useState(false);

  const handleConfirmDelete = async () => {
    if (!password) {
      Alert.alert(t('deleteAccountModal.alertPasswordRequiredTitle'), t('deleteAccountModal.alertPasswordRequiredMessage'));
      return;
    }
    setIsLoading(true);
    try {
      await deleteCurrentUserAccount(password);
      Alert.alert(
        t('deleteAccountModal.alertSuccessTitle'),
        t('deleteAccountModal.alertSuccessMessage'),
        [{ text: 'OK', onPress: onAccountDeleted }]
      );
      onClose();
    } catch (error) {
      if (error instanceof BackendError) {
        Alert.alert(t('deleteAccountModal.alertFailedTitle'), error.message);
      } else {
        Alert.alert(t('deleteAccountModal.alertFailedTitle'), t('deleteAccountModal.alertFailedMessage'));
      }
    } finally {
      setIsLoading(false);
      setPassword('');
    }
  };

  const handleCancel = () => {
    setPassword('');
    onClose();
  };

  return (
    <Overlay
      isVisible={isVisible}
      onBackdropPress={handleCancel}
      overlayStyle={[styles.overlay, { backgroundColor: theme.colors.card }]}
    >
      <View style={styles.container}>
        <Icon name="alert-circle-outline" type="material-community" size={40} color={theme.colors.error} />
        <Text h4 h4Style={[styles.title, { color: theme.colors.error }]}>
          {t('deleteAccountModal.title')}
        </Text>
        <Text style={[styles.message, { color: theme.colors.text }]}>
          {t('deleteAccountModal.irreversibleWarning')}
        </Text>
        <Input
          placeholder={t('deleteAccountModal.passwordPlaceholder')}
          value={password}
          onChangeText={setPassword}
          secureTextEntry={!isPasswordVisible}
          containerStyle={styles.inputContainer}
          inputStyle={{ color: theme.colors.text, textAlign: 'left' }}
          inputContainerStyle={{ borderBottomColor: theme.colors.text }}
          autoCapitalize="none"
          rightIcon={
            <Icon
                name={isPasswordVisible ? 'eye-off' : 'eye'}
                type="material-community"
                color={theme.colors.grey3}
                onPress={() => setIsPasswordVisible(!isPasswordVisible)}
            />
          }
        />
        <View style={styles.buttonContainer}>
          <Button title={t('deleteAccountModal.buttonCancel')} onPress={handleCancel} type="outline" buttonStyle={styles.button} />
          <Button
            title={t('deleteAccountModal.buttonConfirm')}
            onPress={handleConfirmDelete}
            color="error"
            buttonStyle={styles.button}
            loading={isLoading}
            disabled={isLoading}
          />
        </View>
      </View>
    </Overlay>
  );
};

const styles = StyleSheet.create({
  overlay: { borderRadius: 15, width: '90%', padding: 0 },
  container: { padding: 25, borderRadius: 15, alignItems: 'center' },
  title: { marginBottom: 15, textAlign: 'center' },
  message: { marginBottom: 20, textAlign: 'center', fontSize: 15, lineHeight: 22 },
  inputContainer: { marginBottom: 20 },
  buttonContainer: { flexDirection: 'row', justifyContent: 'space-around', width: '100%' },
  button: { width: 120, paddingVertical: 10 },
});

export default DeleteAccountModal;
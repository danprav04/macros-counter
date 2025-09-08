// src/components/DeleteAccountModal.tsx
import React, { useState } from 'react';
import { View, StyleSheet, Alert } from 'react-native';
import { Overlay, Button, Input, Text, useTheme, Icon } from '@rneui/themed';
import { deleteCurrentUserAccount } from '../services/backendService';
import { BackendError } from '../services/backendService';

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
      Alert.alert('Password Required', 'Please enter your password to confirm.');
      return;
    }
    setIsLoading(true);
    try {
      await deleteCurrentUserAccount(password);
      Alert.alert(
        'Account Deleted',
        'Your account and all associated data have been successfully deleted.',
        [{ text: 'OK', onPress: onAccountDeleted }]
      );
      onClose();
    } catch (error) {
      if (error instanceof BackendError) {
        Alert.alert('Deletion Failed', error.message);
      } else {
        Alert.alert('Deletion Failed', 'An unexpected error occurred. Please try again.');
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
          Delete Account
        </Text>
        <Text style={[styles.message, { color: theme.colors.text }]}>
          This action is irreversible. All your data, including entries and food items, will be permanently deleted.
        </Text>
        <Input
          placeholder="Enter your password to confirm"
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
          <Button title="Cancel" onPress={handleCancel} type="outline" buttonStyle={styles.button} />
          <Button
            title="Confirm Delete"
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
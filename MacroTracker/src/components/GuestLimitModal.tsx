// src/components/GuestLimitModal.tsx
import React from 'react';
import { View, StyleSheet, Modal } from 'react-native';
import { Text, Button, Icon, useTheme } from '@rneui/themed';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../navigation/AppNavigator';

interface GuestLimitModalProps {
  isVisible: boolean;
  onClose: () => void;
  featureName?: string;
}

type NavProp = NativeStackNavigationProp<RootStackParamList>;

const GuestLimitModal: React.FC<GuestLimitModalProps> = ({ isVisible, onClose, featureName = "AI Features" }) => {
  const { theme } = useTheme();
  const navigation = useNavigation<NavProp>();

  const handleRegister = () => {
    onClose();
    navigation.navigate('Auth', { screen: 'Register' });
  };

  const handleLogin = () => {
    onClose();
    navigation.navigate('Auth', { screen: 'Login' });
  };

  return (
    <Modal visible={isVisible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <View style={[styles.container, { backgroundColor: theme.colors.card }]}>
          <Icon name="shield-account" type="material-community" size={50} color={theme.colors.primary} />
          <Text h4 style={[styles.title, { color: theme.colors.text }]}>
            Account Required
          </Text>
          <Text style={[styles.message, { color: theme.colors.secondary }]}>
            To use {featureName}, you need to create an account. This ensures your data is backed up and allows for secure AI processing.
          </Text>
          
          <Button
            title="Create Free Account"
            onPress={handleRegister}
            buttonStyle={styles.registerButton}
            containerStyle={styles.buttonContainer}
          />
          
          <Button
            title="Log In"
            type="outline"
            onPress={handleLogin}
            buttonStyle={styles.loginButton}
            containerStyle={styles.buttonContainer}
          />
          
          <Button
            title="Not Now"
            type="clear"
            onPress={onClose}
            titleStyle={{ color: theme.colors.grey3 }}
          />
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  container: {
    width: '100%',
    maxWidth: 350,
    borderRadius: 20,
    padding: 25,
    alignItems: 'center',
    elevation: 5,
  },
  title: {
    marginTop: 15,
    marginBottom: 10,
    textAlign: 'center',
  },
  message: {
    textAlign: 'center',
    marginBottom: 25,
    fontSize: 15,
    lineHeight: 22,
  },
  buttonContainer: {
    width: '100%',
    marginBottom: 10,
  },
  registerButton: {
    borderRadius: 10,
    paddingVertical: 12,
  },
  loginButton: {
    borderRadius: 10,
    paddingVertical: 12,
  },
});

export default GuestLimitModal;
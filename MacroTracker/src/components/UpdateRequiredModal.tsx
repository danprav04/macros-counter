// src/components/UpdateRequiredModal.tsx
import React from 'react';
import { View, Modal, StyleSheet, Linking } from 'react-native';
import { Text, Button, Icon, useTheme } from '@rneui/themed';
import { SafeAreaView } from 'react-native-safe-area-context';

interface UpdateRequiredModalProps {
  isVisible: boolean;
  storeUrl: string;
}

const UpdateRequiredModal: React.FC<UpdateRequiredModalProps> = ({ isVisible, storeUrl }) => {
  const { theme } = useTheme();

  const handleUpdatePress = () => {
    Linking.canOpenURL(storeUrl).then(supported => {
      if (supported) {
        Linking.openURL(storeUrl);
      } else {
        console.log(`Don't know how to open URI: ${storeUrl}`);
      }
    });
  };

  return (
    <Modal visible={isVisible} transparent={true} animationType="fade">
      <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]}>
        <Icon name="arrow-up-circle" type="material-community" size={60} color={theme.colors.primary} />
        <Text h3 style={[styles.title, { color: theme.colors.text }]}>
          Update Required
        </Text>
        <Text style={[styles.message, { color: theme.colors.secondary }]}>
          A new version of the app is available. Please update to continue using all features and get the latest improvements.
        </Text>
        <Button
          title="Update Now"
          onPress={handleUpdatePress}
          buttonStyle={styles.button}
          titleStyle={styles.buttonTitle}
          icon={<Icon name="store-mall-directory" type="material" color={theme.colors.white} style={{ marginRight: 10 }} />}
        />
      </SafeAreaView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 30,
  },
  title: {
    marginTop: 20,
    marginBottom: 15,
    textAlign: 'center',
    fontWeight: 'bold',
  },
  message: {
    textAlign: 'center',
    fontSize: 16,
    lineHeight: 24,
    marginBottom: 30,
  },
  button: {
    borderRadius: 8,
    paddingVertical: 12,
    paddingHorizontal: 30,
  },
  buttonTitle: {
    fontWeight: 'bold',
    fontSize: 16,
  },
});

export default UpdateRequiredModal;
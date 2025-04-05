// components/ConfirmationModal.tsx
import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Overlay, Button, Input, Text, useTheme } from '@rneui/themed';

interface ConfirmationModalProps {
  isVisible: boolean;
  onCancel: () => void;
  onConfirm: () => void;
  confirmationText: string;
  setConfirmationText: (text: string) => void;
  title?: string; // Optional title
  message?: string;  //Optional message
}

const ConfirmationModal: React.FC<ConfirmationModalProps> = ({
  isVisible,
  onCancel,
  onConfirm,
  confirmationText,
  setConfirmationText,
  title = "Confirm Action", //default title
  message = "Are you sure you want to perform this action?"
}) => {
  const { theme } = useTheme();

  return (
    <Overlay
      isVisible={isVisible}
      onBackdropPress={onCancel}
      overlayStyle={styles.overlay}
      backdropStyle={styles.backdrop} // Add the backdropStyle
    >
      <View style={[styles.container, {backgroundColor: theme.colors.background}]}>
        <Text style={[styles.title, {color: theme.colors.text}]}>{title}</Text>
        <Text style={[styles.message, {color: theme.colors.text}]}>{message}</Text>
        <Input
          placeholder="Enter confirmation text"
          placeholderTextColor={theme.colors.text}
          value={confirmationText}
          onChangeText={setConfirmationText}
          containerStyle={styles.inputContainer}
          inputStyle={{ color: theme.colors.text }}
          inputContainerStyle={{borderBottomColor: theme.colors.text}}
        />
        <View style={styles.buttonContainer}>
          <Button title="Cancel" onPress={onCancel} type="outline" buttonStyle={styles.button} />
          <Button
            title="Confirm"
            onPress={onConfirm}
            color="error"
            buttonStyle={styles.button}
            disabled={confirmationText === ""}  //Disable when empty
          />
        </View>
      </View>
    </Overlay>
  );
};

const styles = StyleSheet.create({
    overlay: {
        borderRadius: 10,
        width: '80%', // Responsive width
        padding: 6,
        backgroundColor: 'rgba(200, 200, 200, 0.5)'
    },
  container: {
    padding: 20,
    borderRadius: 7,
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 10,
    textAlign: 'center', //center align
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
  backdrop: {  // Add styles for the backdrop
    backgroundColor: 'rgba(0, 0, 0, 0.5)', // Semi-transparent black
  },
});

export default ConfirmationModal;
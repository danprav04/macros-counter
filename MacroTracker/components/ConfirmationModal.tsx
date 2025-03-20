import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Overlay, Button, Input, Text } from '@rneui/themed';

interface ConfirmationModalProps {
    isVisible: boolean;
    onCancel: () => void;
    onConfirm: () => void;
    confirmationText: string;
    setConfirmationText: (text: string) => void;
}
const ConfirmationModal: React.FC<ConfirmationModalProps> = ({ isVisible, onCancel, onConfirm, confirmationText, setConfirmationText }) => {


    return (
        <Overlay isVisible={isVisible} onBackdropPress={onCancel}>
            <View style={styles.container}>
                <Text style={styles.text}>Type "CLEAR DATA" to confirm:</Text>
                <Input
                    placeholder="Enter confirmation text"
                    value={confirmationText}
                    onChangeText={setConfirmationText}
                />
                <View style={styles.buttonContainer}>
                    <Button title="Cancel" onPress={onCancel} type="outline" buttonStyle={styles.button}/>
                    <Button title="Confirm" onPress={onConfirm} color="error" buttonStyle={styles.button}/>
                </View>
            </View>
        </Overlay>
    );
};
const styles = StyleSheet.create({
    container: {
        padding: 20,
        width: 300,
    },
    text: {
        marginBottom: 10
    },
    buttonContainer: {
        flexDirection: 'row',
        justifyContent: 'space-around',
        marginTop: 20,
    },
    button: {
        width: 100
    }
});

export default ConfirmationModal;
// src/screens/RegisterScreen.tsx
import React, { useState } from 'react';
import { View, StyleSheet, Alert, TouchableOpacity, SafeAreaView } from 'react-native';
import { Input, Button, Text, Icon, useTheme } from '@rneui/themed';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { AuthStackParamList } from '../navigation/AppNavigator';
import { registerUser } from '../services/authService';

type RegisterScreenNavigationProp = NativeStackNavigationProp<AuthStackParamList, 'Register'>;

const RegisterScreen: React.FC = () => {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const navigation = useNavigation<RegisterScreenNavigationProp>();
    const { theme } = useTheme();

    const handleRegister = async () => {
        if (!email || !password) {
            Alert.alert('Missing Fields', 'Please fill in all fields.');
            return;
        }
        if (password.length < 8) {
            Alert.alert('Password Too Short', 'Password must be at least 8 characters long.');
            return;
        }
        setIsLoading(true);
        try {
            const response = await registerUser(email, password);
            Alert.alert(
                'Check Your Email',
                response.message,
                [{ text: 'OK', onPress: () => navigation.navigate('Login') }]
            );
        } catch (error: any) {
            // Error is handled and alerted by the authService
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]}>
            <Text h2 style={[styles.title, { color: theme.colors.text }]}>Create Account</Text>
            <Input
                placeholder="Email"
                leftIcon={<Icon name="envelope" type="font-awesome" size={20} color={theme.colors.grey3} />}
                onChangeText={setEmail}
                value={email}
                keyboardType="email-address"
                autoCapitalize="none"
                containerStyle={styles.inputContainer}
                inputStyle={{ color: theme.colors.text }}
            />
            <Input
                placeholder="Password (min 8 characters)"
                leftIcon={<Icon name="lock" type="font-awesome" size={24} color={theme.colors.grey3} />}
                onChangeText={setPassword}
                value={password}
                secureTextEntry
                containerStyle={styles.inputContainer}
                inputStyle={{ color: theme.colors.text }}
            />
            <Button
                title="Register"
                onPress={handleRegister}
                loading={isLoading}
                buttonStyle={styles.button}
                containerStyle={styles.buttonContainer}
            />
            <TouchableOpacity onPress={() => navigation.navigate('Login')}>
                <Text style={[styles.switchText, { color: theme.colors.primary }]}>Already have an account? Log In</Text>
            </TouchableOpacity>
        </SafeAreaView>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        padding: 20,
    },
    title: {
        marginBottom: 30,
    },
    inputContainer: {
        width: '100%',
        marginBottom: 10,
    },
    button: {
        height: 50,
        borderRadius: 8,
    },
    buttonContainer: {
        width: '100%',
        marginTop: 20,
    },
    switchText: {
        marginTop: 20,
        textDecorationLine: 'underline',
    },
});

export default RegisterScreen;
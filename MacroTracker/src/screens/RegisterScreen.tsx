// src/screens/RegisterScreen.tsx
import React, { useState } from 'react';
import { View, StyleSheet, Alert, TouchableOpacity, SafeAreaView } from 'react-native';
import { Input, Button, Text, Icon, useTheme } from '@rneui/themed';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { AuthStackParamList } from '../navigation/AppNavigator';
import { registerUser } from '../services/authService';
import { t } from '../localization/i18n';
import useDelayedLoading from '../hooks/useDelayedLoading';

type RegisterScreenNavigationProp = NativeStackNavigationProp<AuthStackParamList, 'Register'>;

const RegisterScreen: React.FC = () => {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [isPasswordVisible, setIsPasswordVisible] = useState(false);
    const [isConfirmPasswordVisible, setIsConfirmPasswordVisible] = useState(false);
    const navigation = useNavigation<RegisterScreenNavigationProp>();
    const { theme } = useTheme();
    const showIsLoading = useDelayedLoading(isLoading);

    const handleRegister = async () => {
        if (!email || !password || !confirmPassword) {
            Alert.alert(t('registerScreen.alert.missingFields'), t('registerScreen.alert.missingFieldsMessage'));
            return;
        }
        if (password.length < 8) {
            Alert.alert(t('registerScreen.alert.passwordTooShort'), t('registerScreen.alert.passwordTooShortMessage'));
            return;
        }
        if (password !== confirmPassword) {
            Alert.alert(t('registerScreen.alert.passwordsDoNotMatch'), t('registerScreen.alert.passwordsDoNotMatchMessage'));
            return;
        }

        setIsLoading(true);
        try {
            const response = await registerUser(email, password);
            Alert.alert(
                t('registerScreen.alert.successTitle'),
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
            <Text h2 style={[styles.title, { color: theme.colors.text }]}>{t('registerScreen.title')}</Text>
            <Input
                placeholder={t('registerScreen.emailPlaceholder')}
                leftIcon={<Icon name="envelope" type="font-awesome" size={20} color={theme.colors.grey3} />}
                onChangeText={setEmail}
                value={email}
                keyboardType="email-address"
                autoCapitalize="none"
                containerStyle={styles.inputContainer}
                inputStyle={{ color: theme.colors.text }}
            />
            <Input
                placeholder={t('registerScreen.passwordPlaceholder')}
                leftIcon={<Icon name="lock" type="font-awesome" size={24} color={theme.colors.grey3} />}
                rightIcon={
                    <Icon 
                        name={isPasswordVisible ? 'eye-slash' : 'eye'} 
                        type="font-awesome" 
                        color={theme.colors.grey3}
                        onPress={() => setIsPasswordVisible(!isPasswordVisible)}
                    />
                }
                onChangeText={setPassword}
                value={password}
                secureTextEntry={!isPasswordVisible}
                containerStyle={styles.inputContainer}
                inputStyle={{ color: theme.colors.text }}
            />
            <Input
                placeholder={t('registerScreen.confirmPasswordPlaceholder')}
                leftIcon={<Icon name="lock" type="font-awesome" size={24} color={theme.colors.grey3} />}
                rightIcon={
                    <Icon 
                        name={isConfirmPasswordVisible ? 'eye-slash' : 'eye'} 
                        type="font-awesome" 
                        color={theme.colors.grey3}
                        onPress={() => setIsConfirmPasswordVisible(!isConfirmPasswordVisible)}
                    />
                }
                onChangeText={setConfirmPassword}
                value={confirmPassword}
                secureTextEntry={!isConfirmPasswordVisible}
                containerStyle={styles.inputContainer}
                inputStyle={{ color: theme.colors.text }}
            />
            <Button
                title={t('registerScreen.registerButton')}
                onPress={handleRegister}
                loading={showIsLoading}
                disabled={isLoading}
                buttonStyle={styles.button}
                containerStyle={styles.buttonContainer}
            />
            <TouchableOpacity onPress={() => navigation.navigate('Login')}>
                <Text style={[styles.switchText, { color: theme.colors.primary }]}>{t('registerScreen.loginPrompt')}</Text>
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
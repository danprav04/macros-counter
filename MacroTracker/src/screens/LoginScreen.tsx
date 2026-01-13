// src/screens/LoginScreen.tsx
import React, { useState } from 'react';
import { View, StyleSheet, Alert, TouchableOpacity, SafeAreaView, KeyboardAvoidingView, Platform, ScrollView } from 'react-native';
import { Input, Button, Text, Icon, useTheme } from '@rneui/themed';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { AuthStackParamList, RootStackParamList } from '../navigation/AppNavigator';
import { useAuth, AuthContextType } from '../context/AuthContext';
import { loginUser } from '../services/authService';
import { t } from '../localization/i18n';
import useDelayedLoading from '../hooks/useDelayedLoading';

// Nav prop can navigate within Auth stack but also reset root stack
type LoginScreenNavigationProp = NativeStackNavigationProp<AuthStackParamList & RootStackParamList, 'Login'>;

const KEYBOARD_VERTICAL_OFFSET = Platform.OS === "ios" ? 0 : 0;

const LoginScreen: React.FC = () => {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [isPasswordVisible, setIsPasswordVisible] = useState(false);
    const navigation = useNavigation<LoginScreenNavigationProp>();
    const { login } = useAuth() as AuthContextType;
    const { theme } = useTheme();
    const showIsLoading = useDelayedLoading(isLoading);

    const handleLogin = async () => {
        if (!email || !password) {
            Alert.alert('Missing Fields', 'Please enter both email and password.');
            return;
        }
        setIsLoading(true);
        try {
            const response = await loginUser(email, password);
            if (response.access_token) {
                await login(response);
                // Explicitly navigate to Main after successful login to clear Auth screens from stack
                // Resetting root navigator state
                navigation.reset({
                    index: 0,
                    routes: [{ name: 'Main' }],
                });
            }
        } catch (error: any) {
            // Error is handled and alerted by the authService
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <SafeAreaView style={[styles.safeArea, { backgroundColor: theme.colors.background }]}>
            <KeyboardAvoidingView 
                style={styles.keyboardAvoidingView} 
                behavior={Platform.OS === "ios" ? "padding" : "height"}
                keyboardVerticalOffset={KEYBOARD_VERTICAL_OFFSET}
            >
                <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
                    <Text h2 style={[styles.title, { color: theme.colors.text }]}>Welcome Back</Text>
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
                        placeholder="Password"
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
                    <Button
                        title="Login"
                        onPress={handleLogin}
                        loading={showIsLoading}
                        disabled={isLoading}
                        buttonStyle={styles.button}
                        containerStyle={styles.buttonContainer}
                    />
                    <TouchableOpacity onPress={() => navigation.navigate('ForgotPassword')}>
                        <Text style={[styles.forgotPassword, { color: theme.colors.secondary }]}>
                            {t('forgotPasswordScreen.forgotPasswordLink')}
                        </Text>
                    </TouchableOpacity>
                    <TouchableOpacity onPress={() => navigation.navigate('Register')}>
                        <Text style={[styles.switchText, { color: theme.colors.primary }]}>Don't have an account? Sign Up</Text>
                    </TouchableOpacity>
                </ScrollView>
            </KeyboardAvoidingView>
        </SafeAreaView>
    );
};

const styles = StyleSheet.create({
    safeArea: {
        flex: 1,
    },
    keyboardAvoidingView: {
        flex: 1,
    },
    scrollContent: {
        flexGrow: 1,
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
    forgotPassword: {
        marginTop: 15,
        textAlign: 'center'
    },
    switchText: {
        marginTop: 20,
        textDecorationLine: 'underline',
    },
});

export default LoginScreen;
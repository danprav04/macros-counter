// src/screens/ForgotPasswordScreen.tsx
import React, { useState } from 'react';
import { View, StyleSheet, TouchableOpacity, SafeAreaView } from 'react-native';
import { Alert } from '../components/CustomAlert';
import { Input, Button, Text, Icon, useTheme } from '@rneui/themed';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { AuthStackParamList } from '../navigation/AppNavigator';
import { requestPasswordReset } from '../services/authService';
import { t } from '../localization/i18n';
import useDelayedLoading from '../hooks/useDelayedLoading';

type ForgotPasswordScreenNavigationProp = NativeStackNavigationProp<AuthStackParamList, 'ForgotPassword'>;

const ForgotPasswordScreen: React.FC = () => {
    const [email, setEmail] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const navigation = useNavigation<ForgotPasswordScreenNavigationProp>();
    const { theme } = useTheme();
    const showIsLoading = useDelayedLoading(isLoading);

    const handleSendLink = async () => {
        if (!email.trim()) {
            Alert.alert('Email Required', 'Please enter your email address.');
            return;
        }
        setIsLoading(true);
        try {
            const response = await requestPasswordReset(email);
            Alert.alert(
                t('forgotPasswordScreen.alertSuccessTitle'),
                response.message,
                [{ text: 'OK', onPress: () => navigation.goBack() }]
            );
        } catch (error: any) {
            // Error is handled and alerted by the authService
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]}>
            <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
                <Icon name="arrow-left" type="material-community" color={theme.colors.text} size={28} />
            </TouchableOpacity>
            <View style={styles.content}>
                <Text h3 style={[styles.title, { color: theme.colors.text }]}>
                    {t('forgotPasswordScreen.title')}
                </Text>
                <Text style={[styles.instructions, { color: theme.colors.secondary }]}>
                    {t('forgotPasswordScreen.instructions')}
                </Text>
                <Input
                    placeholder={t('forgotPasswordScreen.emailPlaceholder')}
                    leftIcon={<Icon name="envelope" type="font-awesome" size={20} color={theme.colors.grey3} />}
                    onChangeText={setEmail}
                    value={email}
                    keyboardType="email-address"
                    autoCapitalize="none"
                    autoFocus={true}
                    containerStyle={styles.inputContainer}
                    inputStyle={{ color: theme.colors.text }}
                />
                <Button
                    title={t('forgotPasswordScreen.buttonText')}
                    onPress={handleSendLink}
                    loading={showIsLoading}
                    disabled={isLoading}
                    buttonStyle={styles.button}
                    containerStyle={styles.buttonContainer}
                />
                 <TouchableOpacity onPress={() => navigation.navigate('Login')}>
                    <Text style={[styles.switchText, { color: theme.colors.primary }]}>
                        {t('forgotPasswordScreen.backToLogin')}
                    </Text>
                </TouchableOpacity>
            </View>
        </SafeAreaView>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    backButton: {
        position: 'absolute',
        top: 60,
        left: 20,
        zIndex: 1,
    },
    content: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        padding: 20,
    },
    title: {
        marginBottom: 15,
        textAlign: 'center',
    },
    instructions: {
        marginBottom: 30,
        textAlign: 'center',
        fontSize: 16,
        paddingHorizontal: 10,
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

export default ForgotPasswordScreen;

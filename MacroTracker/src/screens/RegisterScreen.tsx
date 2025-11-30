// src/screens/RegisterScreen.tsx
import React, { useState } from 'react';
import { View, StyleSheet, Alert, TouchableOpacity, SafeAreaView, Platform, ScrollView } from 'react-native';
import { Input, Button, Text, Icon, useTheme } from '@rneui/themed';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import DateTimePicker, { DateTimePickerEvent } from '@react-native-community/datetimepicker';
import { AuthStackParamList } from '../navigation/AppNavigator';
import { registerUser } from '../services/authService';
import { t } from '../localization/i18n';
import useDelayedLoading from '../hooks/useDelayedLoading';
import { formatDateISO } from '../utils/dateUtils';
import TermsGate from '../components/TermsGate';

type RegisterScreenNavigationProp = NativeStackNavigationProp<AuthStackParamList, 'Register'>;

const RegisterScreen: React.FC = () => {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [dateOfBirth, setDateOfBirth] = useState<Date | null>(null);
    const [showDatePicker, setShowDatePicker] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [isPasswordVisible, setIsPasswordVisible] = useState(false);
    const [isConfirmPasswordVisible, setIsConfirmPasswordVisible] = useState(false);
    const [isTermsAgreed, setIsTermsAgreed] = useState(false);
    
    const navigation = useNavigation<RegisterScreenNavigationProp>();
    const { theme } = useTheme();
    const showIsLoading = useDelayedLoading(isLoading);

    const onDateChange = (event: DateTimePickerEvent, selectedDate?: Date) => {
        const currentDate = selectedDate;
        setShowDatePicker(Platform.OS === 'ios');
        if (currentDate) {
            setDateOfBirth(currentDate);
        }
    };

    const handleRegister = async () => {
        if (!isTermsAgreed) {
            Alert.alert(t('registerScreen.alert.termsRequiredTitle'), t('registerScreen.alert.termsRequiredMessage'));
            return;
        }

        if (!email || !password || !confirmPassword) {
            Alert.alert(t('registerScreen.alert.missingFields'), t('registerScreen.alert.missingFieldsMessage'));
            return;
        }
        if (!dateOfBirth) {
            Alert.alert(t('registerScreen.alert.dobRequiredTitle'), t('registerScreen.alert.dobRequiredMessage'));
            return;
        }

        const today = new Date();
        const birthDate = new Date(dateOfBirth);
        let age = today.getFullYear() - birthDate.getFullYear();
        const monthDifference = today.getMonth() - birthDate.getMonth();
        if (monthDifference < 0 || (monthDifference === 0 && today.getDate() < birthDate.getDate())) {
            age--;
        }

        if (age < 18) {
            Alert.alert(t('registerScreen.alert.underageTitle'), t('registerScreen.alert.underageMessage'));
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
            <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
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
                <TouchableOpacity onPress={() => setShowDatePicker(true)} style={[styles.dateInput, { borderColor: theme.colors.grey3 }]}>
                    <Icon name="calendar" type="font-awesome" size={20} color={theme.colors.grey3} style={styles.dateIcon} />
                    <Text style={[styles.dateText, { color: dateOfBirth ? theme.colors.text : theme.colors.grey3 }]}>
                        {dateOfBirth ? formatDateISO(dateOfBirth) : t('registerScreen.dobPlaceholder')}
                    </Text>
                </TouchableOpacity>

                {showDatePicker && (
                    <DateTimePicker
                        testID="dateTimePicker"
                        value={dateOfBirth || new Date(new Date().setFullYear(new Date().getFullYear() - 18))}
                        mode="date"
                        display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                        onChange={onDateChange}
                        maximumDate={new Date()}
                    />
                )}

                <TermsGate onAgreementChange={setIsTermsAgreed} />

                <Button
                    title={t('registerScreen.registerButton')}
                    onPress={handleRegister}
                    loading={showIsLoading}
                    disabled={isLoading || !isTermsAgreed}
                    buttonStyle={styles.button}
                    containerStyle={styles.buttonContainer}
                />
                <TouchableOpacity onPress={() => navigation.navigate('Login')}>
                    <Text style={[styles.switchText, { color: theme.colors.primary }]}>{t('registerScreen.loginPrompt')}</Text>
                </TouchableOpacity>
            </ScrollView>
        </SafeAreaView>
    );
};

const styles = StyleSheet.create({
    container: {
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
    dateInput: {
        flexDirection: 'row',
        alignItems: 'center',
        width: '100%',
        height: 50,
        borderBottomWidth: 1,
        paddingHorizontal: 10,
        marginBottom: 10,
    },
    dateIcon: {
        marginRight: 10,
    },
    dateText: {
        fontSize: 16,
    },
    button: {
        height: 50,
        borderRadius: 8,
    },
    buttonContainer: {
        width: '100%',
        marginTop: 10,
    },
    switchText: {
        marginTop: 20,
        textDecorationLine: 'underline',
        paddingBottom: 20,
    },
});

export default RegisterScreen;
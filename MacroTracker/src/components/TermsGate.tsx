// src/components/TermsGate.tsx
import React, { useState, useEffect } from 'react';
import { View, StyleSheet, TouchableOpacity } from 'react-native';
import { Text, CheckBox, useTheme, Icon } from '@rneui/themed';
import { useNavigation } from '@react-navigation/native';
import { t } from '../localization/i18n';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { AuthStackParamList } from '../navigation/AppNavigator';

type AuthNavProp = NativeStackNavigationProp<AuthStackParamList>;

export interface Consents {
    tosAgreed: boolean;
    healthDataConsent: boolean;
    dataTransferConsent: boolean;
    notMedicalDeviceAck: boolean;
}

interface TermsGateProps {
  onConsentsChange: (consents: Consents) => void;
}

const TermsGate: React.FC<TermsGateProps> = ({ onConsentsChange }) => {
  const { theme } = useTheme();
  const navigation = useNavigation<AuthNavProp>();

  const [consents, setConsents] = useState<Consents>({
      tosAgreed: false,
      healthDataConsent: false,
      dataTransferConsent: false,
      notMedicalDeviceAck: false,
  });

  useEffect(() => {
      onConsentsChange(consents);
  }, [consents]);

  const toggleConsent = (key: keyof Consents) => {
      setConsents(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const openTerms = () => navigation.navigate('TermsOfService');
  const openPrivacy = () => navigation.navigate('PrivacyPolicy');

  return (
    <View style={styles.container}>
        <Text style={[styles.title, { color: theme.colors.text }]}>{t('termsGate.title')}</Text>
        
        {/* 1. Terms of Service */}
        <CheckBox
            checked={consents.tosAgreed}
            onPress={() => toggleConsent('tosAgreed')}
            title={
                <Text style={[styles.checkboxText, { color: theme.colors.text }]}>
                    {t('termsGate.agreeTerms')} 
                    <Text style={[styles.link, { color: theme.colors.primary }]} onPress={openTerms}> ({t('termsGate.viewTerms')})</Text>
                </Text>
            }
            containerStyle={styles.checkboxContainer}
            textStyle={{ color: theme.colors.text }}
        />

        {/* 2. Explicit Health Data Consent */}
        <CheckBox
            checked={consents.healthDataConsent}
            onPress={() => toggleConsent('healthDataConsent')}
            title={
                <Text style={[styles.checkboxText, { color: theme.colors.text }]}>
                    {t('termsGate.consentHealth')} 
                    <Text style={[styles.link, { color: theme.colors.primary }]} onPress={openPrivacy}> ({t('termsGate.viewPrivacy')})</Text>
                </Text>
            }
            containerStyle={styles.checkboxContainer}
            textStyle={{ color: theme.colors.text }}
        />

        {/* 3. Data Transfer Consent */}
        <CheckBox
            checked={consents.dataTransferConsent}
            onPress={() => toggleConsent('dataTransferConsent')}
            title={t('termsGate.consentTransfer')}
            containerStyle={styles.checkboxContainer}
            textStyle={[styles.checkboxText, { color: theme.colors.text }]}
        />

        {/* 4. Medical Disclaimer Acknowledgement */}
        <CheckBox
            checked={consents.notMedicalDeviceAck}
            onPress={() => toggleConsent('notMedicalDeviceAck')}
            title={t('termsGate.notMedical')}
            containerStyle={styles.checkboxContainer}
            textStyle={[styles.checkboxText, { color: theme.colors.text, fontWeight: 'bold' }]}
            checkedColor={theme.colors.warning}
        />
        
        <View style={styles.disclaimerContainer}>
            <Icon 
              name="alert-circle-outline" 
              type="material-community" 
              size={16} 
              color={theme.colors.grey3} 
              style={styles.icon} 
            />
            <Text style={[styles.disclaimer, { color: theme.colors.grey3 }]}>
              {t('disclaimers.medicalDisclaimer')}
            </Text>
        </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginVertical: 10,
    width: '100%',
  },
  title: {
      fontSize: 16,
      fontWeight: 'bold',
      marginBottom: 10,
      marginLeft: 10,
  },
  checkboxContainer: {
      backgroundColor: 'transparent',
      borderWidth: 0,
      marginLeft: 0,
      marginRight: 0,
      paddingVertical: 5,
  },
  checkboxText: {
      fontSize: 13,
      fontWeight: 'normal',
      marginLeft: 10,
      flexShrink: 1,
  },
  link: {
    fontWeight: 'bold',
    textDecorationLine: 'underline',
  },
  disclaimerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 10,
    paddingHorizontal: 10,
  },
  disclaimer: {
    fontSize: 12,
    fontStyle: 'italic',
  },
  icon: {
    marginRight: 6,
  }
});

export default TermsGate;
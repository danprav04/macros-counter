// src/components/TermsGate.tsx
import React, { useState } from 'react';
import { View, StyleSheet } from 'react-native';
import { Text, Switch, useTheme, Icon } from '@rneui/themed';
import { useNavigation } from '@react-navigation/native';
import { t } from '../localization/i18n';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { AuthStackParamList } from '../navigation/AppNavigator';

type AuthNavProp = NativeStackNavigationProp<AuthStackParamList>;

interface TermsGateProps {
  onAgreementChange: (agreed: boolean) => void;
}

const TermsGate: React.FC<TermsGateProps> = ({ onAgreementChange }) => {
  const { theme } = useTheme();
  const [isAgreed, setIsAgreed] = useState(false);
  const navigation = useNavigation<AuthNavProp>();

  const handleToggle = (value: boolean) => {
    setIsAgreed(value);
    onAgreementChange(value);
  };

  const openTerms = () => {
    navigation.navigate('TermsOfService');
  };

  const openPrivacy = () => {
    navigation.navigate('PrivacyPolicy');
  };

  return (
    <View style={styles.container}>
      <View style={styles.row}>
        <Switch
          value={isAgreed}
          onValueChange={handleToggle}
          trackColor={{ false: theme.colors.grey3, true: theme.colors.success }}
          thumbColor={theme.colors.white}
          style={styles.switch}
        />
        <View style={styles.textContainer}>
          <Text style={[styles.text, { color: theme.colors.text }]}>
            {t('termsGate.iAgree')}
            <Text style={[styles.link, { color: theme.colors.primary }]} onPress={openTerms}>
              {t('termsGate.viewTerms')}
            </Text>
            {t('termsGate.and')}
            <Text style={[styles.link, { color: theme.colors.primary }]} onPress={openPrivacy}>
              {t('termsGate.viewPrivacy')}
            </Text>
            {'.'}
          </Text>
          <View style={styles.disclaimerContainer}>
            <Icon 
              name="alert-circle-outline" 
              type="material-community" 
              size={14} 
              color={theme.colors.warning} 
              style={styles.icon} 
            />
            <Text style={[styles.disclaimer, { color: theme.colors.warning }]}>
              {t('termsGate.notMedicalDevice')}
            </Text>
          </View>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginVertical: 20,
    paddingHorizontal: 10,
    width: '100%', // Critical fix for alignItems: 'center' in parent
  },
  row: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  switch: {
    marginRight: 15,
    marginTop: 0,
    transform: [{ scaleX: 0.8 }, { scaleY: 0.8 }], // Slightly smaller switch for better visual balance
  },
  textContainer: {
    flex: 1,
    paddingTop: 4, // Align text with switch
  },
  text: {
    fontSize: 14,
    lineHeight: 20,
    textAlign: 'left',
  },
  link: {
    fontWeight: 'bold',
    textDecorationLine: 'underline',
  },
  disclaimerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
  },
  disclaimer: {
    fontSize: 12,
    fontWeight: 'bold',
    textAlign: 'left',
  },
  icon: {
    marginRight: 4,
  }
});

export default TermsGate;
// src/screens/SettingsScreen.tsx
import React, { useState, useEffect, useCallback, useMemo } from "react";
import { View, ScrollView, Alert, StyleSheet, ActivityIndicator, Platform, I18nManager, InteractionManager } from "react-native";
import { Text, makeStyles, Button, Icon, useTheme, ListItem } from "@rneui/themed";
import { Picker } from '@react-native-picker/picker';
import * as Updates from 'expo-updates'; // <--- ADDED IMPORT

import DailyGoalsInput from "../components/DailyGoalsInput";
import DataManagementButtons from "../components/DataManagementButtons";
import ThemeSwitch from "../components/ThemeSwitch";
import StatisticsChart from "../components/StatisticsChart";
import AccountSettings from "../components/AccountSettings";
import DeleteAccountModal from "../components/DeleteAccountModal";
import { loadDailyEntries } from "../services/storageService";
import { Settings, Statistics, MacroType, MacroData, LanguageCode, macros as macroKeysSetting } from "../types/settings";
import { parseISO, isValid, startOfDay } from "date-fns";
import { DailyEntry } from "../types/dailyEntry";
import { useFocusEffect, useNavigation } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import Toast from "react-native-toast-message";
import { t } from "../localization/i18n";
import i18n from '../localization/i18n';
import { useAuth, AuthContextType } from '../context/AuthContext';
import { showRewardedAd } from '../services/adService';
import { resendVerificationEmail } from "../services/backendService";
import useDelayedLoading from "../hooks/useDelayedLoading";
import { AdsConsent, AdsConsentPrivacyOptionsRequirementStatus } from 'react-native-google-mobile-ads';

interface SettingsScreenProps {
  onThemeChange: (theme: "light" | "dark" | "system") => void;
  onLocaleChange: (locale: LanguageCode) => void; 
  onDataOperation: () => void; 
  onLogout: () => void;
}

type SettingsStackParamList = {
  SettingsHome: undefined; 
  Questionnaire: undefined; 
  PrivacyPolicy: undefined;
  TermsOfService: undefined;
};

type SettingsNavigationProp = NativeStackNavigationProp<SettingsStackParamList, 'SettingsHome'>;

const calculateMovingAverage = (data: MacroData[], windowSize: number): MacroData[] => {
    if (windowSize <= 1) return data;
    const movingAverageData: MacroData[] = [];
    for (let i = 0; i < data.length; i++) {
        const currentPoint = data[i];
        if (currentPoint.y === null) {
            movingAverageData.push({ x: currentPoint.x, y: null });
            continue;
        }

        const windowStart = Math.max(0, i - windowSize + 1);
        const windowSlice = data.slice(windowStart, i + 1);
        
        let sum = 0;
        let count = 0;
        for (const point of windowSlice) {
            if (point.y !== null) {
                sum += point.y;
                count++;
            }
        }

        const average = count > 0 ? sum / count : 0;
        movingAverageData.push({ x: currentPoint.x, y: Math.round(average) });
    }
    return movingAverageData;
};

const SettingsScreen: React.FC<SettingsScreenProps> = ({ onThemeChange, onLocaleChange, onDataOperation, onLogout }) => {
  const { theme } = useTheme();
  const styles = useStyles();
  const navigation = useNavigation<SettingsNavigationProp>(); 
  const { user, settings, refreshUser, changeDailyGoals, reloadSettings } = useAuth() as AuthContextType;

  const [statistics, setStatistics] = useState<Statistics>({ calories: [], protein: [], carbs: [], fat: [] });
  
  const [isUserRefreshing, setIsUserRefreshing] = useState(false);
  const [isStatisticsLoading, setIsStatisticsLoading] = useState(true);
  
  const [isAdLoading, setIsAdLoading] = useState(false);
  const [isDeleteModalVisible, setIsDeleteModalVisible] = useState(false);

  const [isPrivacyButtonVisible, setIsPrivacyButtonVisible] = useState(false);

  const showStatisticsLoading = useDelayedLoading(isStatisticsLoading);

  useEffect(() => {
    const checkConsentRequirement = async () => {
      try {
        const consentInfo = await AdsConsent.requestInfoUpdate();
        if (
          consentInfo.privacyOptionsRequirementStatus ===
          AdsConsentPrivacyOptionsRequirementStatus.REQUIRED
        ) {
          setIsPrivacyButtonVisible(true);
        } else {
          setIsPrivacyButtonVisible(false);
        }
      } catch (error) {
        console.log("Error checking consent status:", error);
        setIsPrivacyButtonVisible(false);
      }
    };

    checkConsentRequirement();
  }, []);

  const getStatisticsData = useCallback((
    dailyEntries: DailyEntry[],
    macro: MacroType,
    currentGoals: { [key in MacroType]: number }
  ): MacroData[][] => {
    const intakeDataMap = new Map<number, number>(); 
    const goalDataMap = new Map<number, number>();   

    dailyEntries.forEach((entry) => {
      try {
        const entryDate = parseISO(entry.date);
        if (!isValid(entryDate)) return;
        const entryTimestamp = startOfDay(entryDate).getTime();
        let intakeValue = 0;
        if (entry.items && Array.isArray(entry.items)) {
          intakeValue = entry.items.reduce((total, item) => {
            if (item.food && typeof item.food[macro] === 'number' && typeof item.grams === 'number' && item.grams > 0) {
              return total + (item.food[macro] / 100) * item.grams;
            }
            return total;
          }, 0);
        }
        intakeDataMap.set(entryTimestamp, (intakeDataMap.get(entryTimestamp) || 0) + Math.round(intakeValue));

        if (macro === "calories") {
          const goalValue = currentGoals[macro] ?? 0;
           if (intakeDataMap.has(entryTimestamp)) {
             goalDataMap.set(entryTimestamp, Math.round(goalValue));
           }
        }
      } catch (parseError) {
        console.error(`Error processing entry ${entry.date} for statistics:`, parseError);
      }
    });

    const sortedTimestamps = Array.from(intakeDataMap.keys()).sort((a,b) => a - b);
    
    const allPoints: MacroData[] = [];
    const GAP_THRESHOLD = 21 * 24 * 60 * 60 * 1000; // 21 days

    if (sortedTimestamps.length > 0) {
        let lastTimestamp = sortedTimestamps[0];
        allPoints.push({ x: lastTimestamp, y: intakeDataMap.get(lastTimestamp) || 0 });

        for (let i = 1; i < sortedTimestamps.length; i++) {
            const currentTimestamp = sortedTimestamps[i];
            if (currentTimestamp - lastTimestamp > GAP_THRESHOLD) {
                allPoints.push({ x: lastTimestamp + 60000, y: null }); 
            }
            allPoints.push({ x: currentTimestamp, y: intakeDataMap.get(currentTimestamp) || 0 });
            lastTimestamp = currentTimestamp;
        }
    }
    
    const finalIntakeData = allPoints;
    const movingAverageData = calculateMovingAverage(finalIntakeData, 7);

    if (macro === "calories") {
        const finalGoalData: MacroData[] = allPoints.map(point => {
            if (point.y === null) {
                return { x: point.x, y: null };
            }
            const goalForDay = goalDataMap.get(point.x) ?? currentGoals[macro] ?? 0;
            return { x: point.x, y: goalForDay };
        });
        return [finalIntakeData, movingAverageData, finalGoalData];
    }
    return [finalIntakeData, movingAverageData];
  }, []);

  useFocusEffect(
    useCallback(() => {
        let isActive = true;
        
        const task = InteractionManager.runAfterInteractions(async () => {
            try {
                await Promise.all([
                    refreshUser ? refreshUser() : Promise.resolve(),
                    reloadSettings ? reloadSettings() : Promise.resolve()
                ]);
            } catch (error) {
                if (isActive) {
                    console.error("Failed to refresh user/settings data", error);
                }
            } finally {
                if (isActive) {
                    setIsUserRefreshing(false);
                }
            }
        });

        return () => { 
          isActive = false; 
          task.cancel();
        };
    }, [refreshUser, reloadSettings])
  );

  useFocusEffect(
      useCallback(() => {
          let isActive = true;
          
          const task = InteractionManager.runAfterInteractions(async () => {
              if (!settings) return;
              try {
                  const loadedEntries = await loadDailyEntries();
                  if (!isActive) return;

                  const updatedStats: Statistics = { calories: [], protein: [], carbs: [], fat: [] };
                  (macroKeysSetting as readonly MacroType[]).forEach(macro => {
                      updatedStats[macro] = getStatisticsData(loadedEntries, macro, settings.dailyGoals);
                  });
                  setStatistics(updatedStats);
              } catch (error) {
                  console.error("SettingsScreen: Failed to update statistics:", error);
              } finally {
                  if (isActive) {
                      setIsStatisticsLoading(false);
                  }
              }
          });

          return () => { 
            isActive = false; 
            task.cancel();
          };
      }, [settings, getStatisticsData])
  );
  
  useEffect(() => {
    navigation.setOptions({ title: t('settingsScreen.title') });
  }, [navigation, i18n.locale]);
  
  const handleWatchAd = async () => {
    if (!user?.client_id || isAdLoading) return;
    setIsAdLoading(true);

    const rewardEarned = await showRewardedAd(user.client_id);
    setIsAdLoading(false);

    if (rewardEarned) {
      Toast.show({
        type: 'success',
        text1: 'Reward Earned!',
        text2: 'Your coin balance will update shortly.',
        position: 'bottom'
      });
      setTimeout(() => {
        refreshUser?.();
      }, 3000); 
    } else {
      console.log("Ad was closed without earning a reward.");
    }
  };

  const handleGoalChange = useCallback(async (goalType: MacroType, value: string) => {
    const numericValue = parseFloat(value);
    const validatedValue = isNaN(numericValue) || numericValue < 0 ? 0 : numericValue;

    if (changeDailyGoals && settings) {
      const updatedGoals = { ...settings.dailyGoals, [goalType]: validatedValue };
      changeDailyGoals(updatedGoals);
    }
  }, [settings, changeDailyGoals]);

  const localDataOperationHandler = useCallback(async () => {
    setIsUserRefreshing(true);
    try {
      if (reloadSettings) {
        await reloadSettings();
      }
      await refreshUser?.();
      onDataOperation(); 
      Toast.show({ type: 'info', text1: t('dataManagement.dataReloaded'), position: 'bottom'});
    } catch (error) { 
        Alert.alert(t('dailyEntryScreen.errorLoad'), t('dailyEntryScreen.errorLoadMessage')); 
    } finally { 
        setIsUserRefreshing(false); 
    }
  }, [reloadSettings, refreshUser, onDataOperation, t]);

  const handleLanguageChange = (newLanguage: LanguageCode) => {
    onLocaleChange(newLanguage); 
  };
  
  const handleResendVerification = useCallback(async () => {
    try {
        const response = await resendVerificationEmail();
        Toast.show({
            type: 'success',
            text1: t('accountSettings.requestSent'),
            text2: response.message,
            position: 'bottom'
        });
        if (refreshUser) {
            setTimeout(() => refreshUser(), 1000);
        }
    } catch (error) {
        console.error("Failed to resend verification email:", error);
    }
  }, [refreshUser, t]);

  const handlePrivacyPolicyPress = () => {
      navigation.navigate('PrivacyPolicy');
  };

  const handleTermsOfServicePress = () => {
      navigation.navigate('TermsOfService');
  };

  const handlePrivacySettingsPress = async () => {
    try {
      await AdsConsent.showPrivacyOptionsForm();
    } catch (error) {
      console.log('Error showing privacy settings:', error);
      Alert.alert("Info", "Privacy options are not available.");
    }
  };

  const handleNavigateToQuestionnaire = () => navigation.navigate('Questionnaire');
  const handleLogout = () => Alert.alert(t('settingsScreen.account.logoutConfirmTitle'), t('settingsScreen.account.logoutConfirmMessage'), [ { text: t('confirmationModal.cancel'), style: 'cancel' }, { text: t('settingsScreen.account.logout'), style: 'destructive', onPress: onLogout } ], { cancelable: true });

  const LANGUAGES = useMemo(() => [
    { code: 'system', label: t('settingsScreen.language.system') },
    { code: 'en', label: t('settingsScreen.language.english') },
    { code: 'ru', label: t('settingsScreen.language.russian') },
    { code: 'he', label: t('settingsScreen.language.hebrew') },
  ], [i18n.locale]);

  if (!settings) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={theme.colors.primary} />
        <Text style={styles.loadingText}>{t('app.initializing')}</Text>
      </View>
    );
  }

  return (
    <>
      <ScrollView style={styles.container} contentContainerStyle={styles.scrollContentContainer} keyboardShouldPersistTaps="handled">
          <Text h3 style={styles.sectionTitle}>{t('settingsScreen.account.title')}</Text>
          <AccountSettings
            user={user}
            isLoading={isUserRefreshing}
            isAdLoading={isAdLoading}
            onWatchAd={handleWatchAd}
            onResendVerification={handleResendVerification}
          />
          
          <ListItem bottomDivider onPress={handleLogout} containerStyle={styles.actionItem}>
              <Icon name="logout" type="material-community" color={theme.colors.primary} />
              <ListItem.Content>
                  <ListItem.Title style={styles.actionItemTitle}>
                      {t('settingsScreen.account.logout')}
                  </ListItem.Title>
              </ListItem.Content>
              <ListItem.Chevron color={theme.colors.primary} />
          </ListItem>
          <ListItem onPress={() => setIsDeleteModalVisible(true)} containerStyle={styles.actionItem}>
              <Icon name="account-remove-outline" type="material-community" color={theme.colors.error} />
              <ListItem.Content>
                  <ListItem.Title style={styles.deleteTitle}>
                      {t('settingsScreen.account.deleteAccount')}
                  </ListItem.Title>
              </ListItem.Content>
              <ListItem.Chevron color={theme.colors.error} />
          </ListItem>

          <Text h3 style={styles.sectionTitle}>{t('settingsScreen.general.title')}</Text>
          
          <ThemeSwitch currentTheme={settings.theme} onToggle={onThemeChange} />

          <ListItem bottomDivider containerStyle={{ backgroundColor: theme.colors.background }}>
              <ListItem.Content>
                  <ListItem.Title style={styles.listItemTitle}>{t('settingsScreen.language.title')}</ListItem.Title>
              </ListItem.Content>
          </ListItem>
          <View style={Platform.OS === 'ios' ? {} : styles.pickerContainerAndroid}>
              <Picker
                  selectedValue={settings.language}
                  onValueChange={(itemValue) => handleLanguageChange(itemValue as LanguageCode)}
                  style={[styles.pickerStyle, Platform.OS === 'android' ? { color: theme.colors.text, backgroundColor: theme.colors.background } : {}]}
                  itemStyle={[styles.pickerItemStyle, Platform.OS === 'ios' ? { color: theme.colors.text } : {}]}
                  dropdownIconColor={theme.colors.text}
              >
                {LANGUAGES.map((lang) => (
                    <Picker.Item key={lang.code} label={lang.label} value={lang.code} />
                ))}
              </Picker>
          </View>
          <ListItem bottomDivider onPress={handlePrivacyPolicyPress} containerStyle={styles.actionItem}>
                <Icon name="shield-check-outline" type="material-community" color={theme.colors.secondary} />
                <ListItem.Content>
                    <ListItem.Title style={[styles.listItemTitle, {color: theme.colors.secondary}]}>
                        {t('settingsScreen.general.privacyPolicy')}
                    </ListItem.Title>
                </ListItem.Content>
                <ListItem.Chevron color={theme.colors.secondary} />
            </ListItem>
            
            <ListItem bottomDivider onPress={handleTermsOfServicePress} containerStyle={styles.actionItem}>
                <Icon name="file-document-outline" type="material-community" color={theme.colors.secondary} />
                <ListItem.Content>
                    <ListItem.Title style={[styles.listItemTitle, {color: theme.colors.secondary}]}>
                        {t('settingsScreen.general.termsOfService')}
                    </ListItem.Title>
                </ListItem.Content>
                <ListItem.Chevron color={theme.colors.secondary} />
            </ListItem>

          {isPrivacyButtonVisible && (
            <ListItem bottomDivider onPress={handlePrivacySettingsPress} containerStyle={styles.actionItem}>
                  <Icon name="cog-outline" type="material-community" color={theme.colors.secondary} />
                  <ListItem.Content>
                      <ListItem.Title style={[styles.listItemTitle, {color: theme.colors.secondary}]}>
                          Privacy Settings
                      </ListItem.Title>
                  </ListItem.Content>
                  <ListItem.Chevron color={theme.colors.secondary} />
            </ListItem>
          )}

          <View style={styles.sectionHeaderWithButton}>
              <Text h3 style={[styles.sectionTitle, styles.sectionTitleInline]}>{t('settingsScreen.dailyGoals.title')}</Text>
              <Button
                  title={t('settingsScreen.goals.estimateButton')}
                  type="solid"
                  onPress={handleNavigateToQuestionnaire}
                  buttonStyle={styles.estimateButton}
                  titleStyle={styles.estimateButtonTitle}
                  icon={<Icon name="calculator-variant" type="material-community" color="white" size={20} style={{marginRight: 6}} />}
              />
          </View>
          <View style={styles.inputGroup}>
              <DailyGoalsInput dailyGoals={settings.dailyGoals} onGoalChange={handleGoalChange} />
          </View>

          <Text h3 style={styles.sectionTitle}>{t('settingsScreen.statistics.title')}</Text>
          <View style={[styles.chartContainer, isStatisticsLoading && styles.chartLoadingContainer]}>
            {showStatisticsLoading ? (
                <ActivityIndicator size="large" color={theme.colors.primary} />
            ) : (
              <StatisticsChart statistics={statistics} />
            )}
          </View>

          <Text h3 style={styles.sectionTitle}>{t('settingsScreen.dataManagement.title')}</Text>
          <View style={styles.buttonGroup}>
              <DataManagementButtons onDataOperation={localDataOperationHandler} />
          </View>
          
          <View style={styles.backupWarningContainer}>
              <Icon name="alert" type="material-community" color={theme.colors.warning} size={18} />
              <Text style={styles.backupWarningText}>{t('dataManagement.backupWarning')}</Text>
          </View>

          <View style={styles.disclaimerContainer}>
              <Icon name="alert-circle-outline" type="material-community" color={theme.colors.grey3} size={16} />
              <Text style={styles.disclaimerText}>{t('disclaimers.medicalDisclaimer')}</Text>
          </View>

          {/* --- ADDED: Version & Update Info for Debugging --- */}
          <View style={styles.versionContainer}>
            <Text style={styles.versionText}>Runtime: {Updates.runtimeVersion}</Text>
            <Text style={styles.versionText}>Channel: {Updates.channel || 'dev'}</Text>
            <Text style={styles.versionText}>Update ID: {Updates.updateId || 'Embedded Binary'}</Text>
          </View>
          
      </ScrollView>
      <DeleteAccountModal
        isVisible={isDeleteModalVisible}
        onClose={() => setIsDeleteModalVisible(false)}
        onAccountDeleted={onLogout}
      />
    </>
  );
};

const useStyles = makeStyles((theme) => ({
  container: { flex: 1, backgroundColor: theme.colors.background, },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: theme.colors.background,
  },
  loadingText: {
    marginTop: 10,
    color: theme.colors.text,
    fontSize: 16,
  },
  scrollContentContainer: { padding: 15, paddingBottom: 40, },
  sectionTitle: {
    color: theme.colors.text, marginTop: 25, marginBottom: 15, paddingLeft: 5,
    borderLeftWidth: 3, borderLeftColor: theme.colors.primary,
    textAlign: I18nManager.isRTL ? 'right' : 'left',
    fontSize: 20, fontWeight: 'bold',
  },
  sectionHeaderWithButton: {
    flexDirection: I18nManager.isRTL ? 'row-reverse' : 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 25,
    marginBottom: 10, 
  },
  sectionTitleInline: {
    marginTop: 0, 
    marginBottom: 0, 
    borderLeftWidth: 0, 
    paddingLeft: 0,
    flexShrink: 1,
  },
  estimateButton: {
    backgroundColor: theme.colors.primary,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    elevation: 2,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 1.5,
  },
  estimateButtonTitle: {
    color: 'white',
    fontSize: 14,
    fontWeight: '600',
  },
  listItemTitle: {
    color: theme.colors.text,
    textAlign: I18nManager.isRTL ? 'right' : 'left',
    fontWeight: '500',
  },
  actionItem: {
      backgroundColor: theme.colors.background,
      borderBottomWidth: 1,
      borderColor: theme.colors.divider,
  },
  actionItemTitle: {
      color: theme.colors.primary,
      textAlign: I18nManager.isRTL ? 'right' : 'left',
      fontWeight: 'bold',
  },
  deleteTitle: {
      color: theme.colors.error,
      textAlign: I18nManager.isRTL ? 'right' : 'left',
      fontWeight: 'bold',
  },
  inputGroup: { marginBottom: 10, paddingHorizontal: 5, },
  buttonGroup: { marginBottom: 10, paddingHorizontal: 5, },
  backupWarningContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 15,
    marginBottom: 20,
    marginTop: 5,
    backgroundColor: theme.mode === 'light' ? '#fff3cd' : '#3e2e1e', // Subtle yellow/brown background
    paddingVertical: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: theme.colors.warning,
  },
  backupWarningText: {
    marginLeft: 8,
    fontSize: 13,
    color: theme.colors.warning, // Or a text color that contrasts well
    fontWeight: '500',
    textAlign: 'center',
    flexShrink: 1,
  },
  chartContainer: {
    marginBottom: 20,
  },
  chartLoadingContainer: {
    height: 250,
    justifyContent: 'center',
    alignItems: 'center',
  },
  pickerContainerAndroid: {
    backgroundColor: theme.colors.background,
    borderRadius: 8,
    borderWidth: 0,
    borderColor: theme.colors.divider,
    marginBottom: 10,
    marginTop: -5,
    justifyContent: 'center',
    height: 58, 
  },
  pickerStyle: {
    width: '100%',
    height: Platform.OS === 'ios' ? 120 : 58, 
  },
  pickerItemStyle: {
    textAlign: I18nManager.isRTL ? 'right' : 'left',
  },
  disclaimerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 10,
    marginTop: 30,
    opacity: 0.8,
  },
  disclaimerText: {
    marginLeft: 8,
    fontSize: 12,
    color: theme.colors.grey3,
    fontStyle: 'italic',
    textAlign: 'center',
  },
  // Added Styles for Version info
  versionContainer: {
    alignItems: 'center',
    marginTop: 20,
    marginBottom: 20,
    opacity: 0.6,
  },
  versionText: {
    color: theme.colors.grey3,
    fontSize: 10,
    textAlign: 'center',
  },
}));

export default SettingsScreen;
// src/screens/SettingsScreen.tsx
import React, { useState, useEffect, useCallback, useMemo } from "react";
import { View, ScrollView, Alert, StyleSheet, ActivityIndicator, Platform, I18nManager } from "react-native";
import { Text, makeStyles, Button, Icon, useTheme, ListItem } from "@rneui/themed";
import { Picker } from '@react-native-picker/picker';
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
import Constants from 'expo-constants';
import useDelayedLoading from "../hooks/useDelayedLoading";


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
  
  const [isUserRefreshing, setIsUserRefreshing] = useState(true);
  const [isStatisticsLoading, setIsStatisticsLoading] = useState(true);
  
  const [isAdLoading, setIsAdLoading] = useState(false);
  const [isDeleteModalVisible, setIsDeleteModalVisible] = useState(false);

  const showStatisticsLoading = useDelayedLoading(isStatisticsLoading);

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
        setIsUserRefreshing(true);
        const refreshUserData = async () => {
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
        };
        refreshUserData();
        return () => { isActive = false; };
    }, [refreshUser, reloadSettings])
  );

  useFocusEffect(
      useCallback(() => {
          let isActive = true;
          const loadAndProcessStats = async () => {
              if (!settings) return;
              setIsStatisticsLoading(true);
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
          };

          loadAndProcessStats();
          return () => { isActive = false; };
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
            key="accountSettings"
            user={user}
            isLoading={isUserRefreshing}
            isAdLoading={isAdLoading}
            onWatchAd={handleWatchAd}
            onResendVerification={handleResendVerification}
          />
          
          {/* Wrapped in View with keys on children to prevent unique key warning */}
          <View>
              <ListItem key="logout" bottomDivider onPress={handleLogout} containerStyle={styles.actionItem}>
                  <Icon key="icon" name="logout" type="material-community" color={theme.colors.primary} />
                  <ListItem.Content key="content">
                      <ListItem.Title style={styles.actionItemTitle}>
                          {t('settingsScreen.account.logout')}
                      </ListItem.Title>
                  </ListItem.Content>
                  <ListItem.Chevron key="chevron" color={theme.colors.primary} />
              </ListItem>
              <ListItem key="delete" onPress={() => setIsDeleteModalVisible(true)} containerStyle={styles.actionItem}>
                  <Icon key="icon" name="account-remove-outline" type="material-community" color={theme.colors.error} />
                  <ListItem.Content key="content">
                      <ListItem.Title style={styles.deleteTitle}>
                          {t('settingsScreen.account.deleteAccount')}
                      </ListItem.Title>
                  </ListItem.Content>
                  <ListItem.Chevron key="chevron" color={theme.colors.error} />
              </ListItem>
          </View>

          <Text h3 style={styles.sectionTitle}>{t('settingsScreen.general.title')}</Text>
          
          {/* Wrapped in View with keys on children */}
          <View>
              <ThemeSwitch key="themeSwitch" currentTheme={settings.theme} onToggle={onThemeChange} />

              <ListItem key="languageLabel" bottomDivider containerStyle={{ backgroundColor: theme.colors.background }}>
                  <ListItem.Content key="content">
                      <ListItem.Title style={styles.listItemTitle}>{t('settingsScreen.language.title')}</ListItem.Title>
                  </ListItem.Content>
              </ListItem>
              <View key="pickerContainer" style={Platform.OS === 'ios' ? {} : styles.pickerContainerAndroid}>
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
              <ListItem key="privacyPolicy" bottomDivider onPress={handlePrivacyPolicyPress} containerStyle={styles.actionItem}>
                    <Icon key="icon" name="shield-check-outline" type="material-community" color={theme.colors.secondary} />
                    <ListItem.Content key="content">
                        <ListItem.Title style={[styles.listItemTitle, {color: theme.colors.secondary}]}>
                            {t('settingsScreen.general.privacyPolicy')}
                        </ListItem.Title>
                    </ListItem.Content>
                    <ListItem.Chevron key="chevron" color={theme.colors.secondary} />
                </ListItem>
          </View>

          <View style={styles.sectionHeaderWithButton}>
              <Text h3 style={[styles.sectionTitle, styles.sectionTitleInline]}>{t('settingsScreen.dailyGoals.title')}</Text>
              <Button
                  title={t('settingsScreen.goals.estimateButton')}
                  type="outline"
                  onPress={handleNavigateToQuestionnaire}
                  buttonStyle={styles.estimateButton}
                  titleStyle={styles.estimateButtonTitle}
                  icon={<Icon name="calculator-variant" type="material-community" color={theme.colors.primary} size={18} />}
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
          <View style={styles.disclaimerContainer}>
              <Icon name="alert-circle-outline" type="material-community" color={theme.colors.grey2} size={16} />
              <Text style={styles.disclaimerText}>{t('disclaimers.medicalDisclaimer')}</Text>
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
    borderColor: theme.colors.primary,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 20,
  },
  estimateButtonTitle: {
    color: theme.colors.primary,
    fontSize: 14,
    fontWeight: '600',
    marginLeft: I18nManager.isRTL ? 0 : 5,
    marginRight: I18nManager.isRTL ? 5 : 0,
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
    color: theme.colors.grey2,
    fontStyle: 'italic',
    textAlign: 'center',
  },
}));

export default SettingsScreen;
// src/screens/SettingsScreen.tsx
import React, { useState, useEffect, useCallback } from "react";
import { View, ScrollView, Alert, StyleSheet, ActivityIndicator, Platform, I18nManager } from "react-native";
import { Text, makeStyles, Button, Icon, useTheme, ListItem } from "@rneui/themed";
import { Picker } from '@react-native-picker/picker';
import DailyGoalsInput from "../components/DailyGoalsInput";
import DataManagementButtons from "../components/DataManagementButtons";
import ThemeSwitch from "../components/ThemeSwitch";
import StatisticsChart from "../components/StatisticsChart";
import AccountSettings from "../components/AccountSettings";
import { loadSettings, saveSettings, loadDailyEntries } from "../services/storageService";
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

interface SettingsScreenProps {
  onThemeChange: (theme: "light" | "dark" | "system") => void;
  onLocaleChange: (locale: LanguageCode) => void;
  onDataOperation: () => void; 
  onLogout: () => void;
}

type SettingsStackParamList = {
  SettingsHome: undefined; 
  Questionnaire: undefined; 
};

type SettingsNavigationProp = NativeStackNavigationProp<SettingsStackParamList, 'SettingsHome'>;

const calculateMovingAverage = (data: MacroData[], windowSize: number): MacroData[] => {
    if (windowSize <= 1) return data;
    const movingAverageData: MacroData[] = [];
    for (let i = 0; i < data.length; i++) {
        const windowStart = Math.max(0, i - windowSize + 1);
        const windowSlice = data.slice(windowStart, i + 1);
        const sum = windowSlice.reduce((acc, point) => acc + point.y, 0);
        const average = sum / windowSlice.length;
        movingAverageData.push({ x: data[i].x, y: Math.round(average) });
    }
    return movingAverageData;
};

const SettingsScreen: React.FC<SettingsScreenProps> = ({ onThemeChange, onLocaleChange, onDataOperation, onLogout }) => {
  const { theme } = useTheme();
  const styles = useStyles();
  const navigation = useNavigation<SettingsNavigationProp>(); 
  const { user, settings, refreshUser, changeDailyGoals, reloadSettings } = useAuth() as AuthContextType;

  const [statistics, setStatistics] = useState<Statistics>({ calories: [], protein: [], carbs: [], fat: [] });
  const [chartUpdateKey, setChartUpdateKey] = useState(0);
  const [isDataLoading, setIsDataLoading] = useState(true); 
  const [isAdLoading, setIsAdLoading] = useState(false);

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

    const sortedTimestamps = Array.from(new Set([...intakeDataMap.keys(), ...goalDataMap.keys()])).sort((a,b) => a - b);
    
    const finalIntakeData: MacroData[] = sortedTimestamps.map(ts => ({ x: ts, y: intakeDataMap.get(ts) || 0 }));
    const movingAverageData = calculateMovingAverage(finalIntakeData, 7);

    if (macro === "calories") {
        const finalGoalData: MacroData[] = sortedTimestamps.map(ts => ({ x: ts, y: goalDataMap.get(ts) || currentGoals[macro] || 0 }));
        return [finalIntakeData, movingAverageData, finalGoalData];
    }
    return [finalIntakeData, movingAverageData];
  }, []);

  const updateStatistics = useCallback(async (currentGoals: { [key in MacroType]: number }) => {
    try {
        const loadedEntries = await loadDailyEntries();
        const updatedStats: Statistics = { calories: [], protein: [], carbs: [], fat: [] };
        (macroKeysSetting as readonly MacroType[]).forEach(macro => {
            updatedStats[macro] = getStatisticsData(loadedEntries, macro, currentGoals);
        });
        setStatistics(updatedStats);
    } catch (error) {
        console.error("SettingsScreen: Failed to update statistics:", error);
    }
  }, [getStatisticsData]);

  useFocusEffect( useCallback(() => {
      let isActive = true;
      setIsDataLoading(true);
      const loadAndProcessData = async () => {
        try {
          if (!isActive) return;
          // Refresh user data (including coins) every time the screen is focused.
          if (refreshUser) {
              await refreshUser();
          }
          if (reloadSettings) {
            await reloadSettings();
          }
        } catch (error) {
          if (isActive) Alert.alert(t('dailyEntryScreen.errorLoad'), t('dailyEntryScreen.errorLoadMessage'));
        } finally {
          if (isActive) setIsDataLoading(false);
        }
      };
      loadAndProcessData();
      return () => { isActive = false; };
    }, [reloadSettings, refreshUser, t]) 
  );
  
  useEffect(() => {
    if (settings) {
        updateStatistics(settings.dailyGoals);
        navigation.setOptions({ title: t('settingsScreen.title') });
        setChartUpdateKey(prev => prev + 1);
    }
  }, [settings, updateStatistics, navigation, t]);
  
  const handleWatchAd = async () => {
    if (!user?.client_id || isAdLoading) return;
    setIsAdLoading(true);

    const rewardEarned = await showRewardedAd(user.client_id);
    setIsAdLoading(false);

    if (rewardEarned) {
      Toast.show({
        type: 'success',
        text1: 'Reward Earned!',
        text2: 'Your coin balance will update on your next action.',
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

    if (changeDailyGoals) {
      const updatedGoals = { ...settings.dailyGoals, [goalType]: validatedValue };
      changeDailyGoals(updatedGoals);
    }
  }, [settings.dailyGoals, changeDailyGoals]);

  const localDataOperationHandler = useCallback(async () => {
    setIsDataLoading(true);
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
        setIsDataLoading(false); 
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
            text1: 'Request Sent',
            text2: response.message,
            position: 'bottom'
        });
        if (refreshUser) {
            setTimeout(() => refreshUser(), 1000);
        }
    } catch (error) {
        // Error is handled by backendService which shows an alert
        console.error("Failed to resend verification email:", error);
    }
  }, [refreshUser]);

  const handleNavigateToQuestionnaire = () => navigation.navigate('Questionnaire');
  const handleLogout = () => Alert.alert(t('settingsScreen.account.logoutConfirmTitle'), t('settingsScreen.account.logoutConfirmMessage'), [ { text: t('confirmationModal.cancel'), style: 'cancel' }, { text: t('settingsScreen.account.logout'), style: 'destructive', onPress: onLogout } ], { cancelable: true });

  if (isDataLoading || !settings) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={theme.colors.primary} />
        <Text style={styles.loadingText}>{t('app.initializing')}</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.scrollContentContainer} keyboardShouldPersistTaps="handled">
        <Text h3 style={styles.sectionTitle}>{t('settingsScreen.account.title')}</Text>
        <AccountSettings
          user={user}
          isLoading={!user && isDataLoading}
          isAdLoading={isAdLoading}
          onWatchAd={handleWatchAd}
          onResendVerification={handleResendVerification}
        />
        <ListItem bottomDivider onPress={handleLogout} containerStyle={styles.logoutItem}>
            <Icon name="logout" type="material-community" color={theme.colors.error} />
            <ListItem.Content>
                <ListItem.Title style={styles.logoutTitle}>
                    {t('settingsScreen.account.logout')}
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
                <Picker.Item label={t('settingsScreen.language.system')} value="system" />
                <Picker.Item label={t('settingsScreen.language.english')} value="en" />
                <Picker.Item label={t('settingsScreen.language.russian')} value="ru" />
                <Picker.Item label={t('settingsScreen.language.hebrew')} value="he" />
            </Picker>
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
        <View style={styles.chartContainer}>
            <StatisticsChart statistics={statistics} key={`${chartUpdateKey}-${i18n.locale}-${theme.mode}`} />
        </View>

        <Text h3 style={styles.sectionTitle}>{t('settingsScreen.dataManagement.title')}</Text>
        <View style={styles.buttonGroup}>
            <DataManagementButtons onDataOperation={localDataOperationHandler} />
        </View>
    </ScrollView>
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
  listItem: {
      backgroundColor: theme.colors.background,
      paddingVertical: 15,
  },
  listItemTitle: {
    color: theme.colors.text,
    textAlign: I18nManager.isRTL ? 'right' : 'left',
    fontWeight: '500',
  },
  logoutItem: {
    backgroundColor: theme.colors.background,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: theme.colors.divider,
  },
  logoutTitle: {
      color: theme.colors.error,
      textAlign: I18nManager.isRTL ? 'right' : 'left',
      fontWeight: 'bold',
  },
  valueText: {
      color: theme.colors.text,
      fontSize: 14,
  },
  coinValue: {
      color: theme.colors.primary,
      fontWeight: 'bold',
      fontSize: 16,
  },
  coinContainer: {
      flexDirection: 'row',
      alignItems: 'center',
  },
  adButton: {
      marginLeft: 15,
      padding: 5,
  },
  inputGroup: { marginBottom: 10, paddingHorizontal: 5, },
  buttonGroup: { marginBottom: 10, paddingHorizontal: 5, },
  button: { marginBottom: 10, borderRadius: 8, },
  chartContainer: {
    marginBottom: 20,
  },
  pickerContainerAndroid: {
    backgroundColor: theme.colors.background,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: theme.colors.divider,
    marginBottom: 10,
    marginTop: -5,
  },
  pickerStyle: {
    width: '100%',
    height: Platform.OS === 'ios' ? 120 : 50,
  },
  pickerItemStyle: {
    textAlign: I18nManager.isRTL ? 'right' : 'left',
  },
}));

export default SettingsScreen;
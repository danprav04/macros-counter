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
import { getUserStatus, addCoinsToUser, BackendError } from "../services/backendService";
import { t } from "../localization/i18n";
import i18n from '../localization/i18n';

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
  const [settings, setSettings] = useState<Settings>({
    theme: "system",
    language: "system",
    dailyGoals: { calories: 0, protein: 0, carbs: 0, fat: 0 },
    settingsHistory: [],
  });

  const [statistics, setStatistics] = useState<Statistics>({
    calories: [], protein: [], carbs: [], fat: [],
  });
  const [chartUpdateKey, setChartUpdateKey] = useState(0);
  const [userCoins, setUserCoins] = useState<number | null>(null);
  const [isLoadingCoins, setIsLoadingCoins] = useState(false);
  const [isAddingCoins, setIsAddingCoins] = useState(false);
  const [isDataLoading, setIsDataLoading] = useState(true); 

  const { theme } = useTheme();
  const styles = useStyles();
  const navigation = useNavigation<SettingsNavigationProp>(); 

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
        if (!isValid(entryDate)) {
          console.warn(`Invalid date in getStatisticsData: ${entry.date}`);
          return;
        }
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
    
    const finalIntakeData: MacroData[] = sortedTimestamps.map(ts => ({
        x: ts,
        y: intakeDataMap.get(ts) || 0
    }));

    const movingAverageData = calculateMovingAverage(finalIntakeData, 7);

    if (macro === "calories") {
        const finalGoalData: MacroData[] = sortedTimestamps.map(ts => ({
            x: ts,
            y: goalDataMap.get(ts) || currentGoals[macro] || 0
        }));
        return [finalIntakeData, movingAverageData, finalGoalData];
    }
    return [finalIntakeData, movingAverageData];
  }, []);


  const updateStatistics = useCallback(async (currentGoals: { [key in MacroType]: number }) => {
    try {
        const loadedEntries = await loadDailyEntries();
        const updatedStats: Statistics = {
            calories: [], protein: [], carbs: [], fat: []
        };
        (macroKeysSetting as readonly MacroType[]).forEach(macro => {
            updatedStats[macro] = getStatisticsData(loadedEntries, macro, currentGoals);
        });
        setStatistics(updatedStats);
        setChartUpdateKey((prevKey) => prevKey + 1);
    } catch (error) {
        console.error("SettingsScreen: Failed to update statistics:", error);
    }
  }, [getStatisticsData]);

  const fetchUserStatus = useCallback(async () => {
    setIsLoadingCoins(true);
    try { 
      const status = await getUserStatus(); 
      setUserCoins(status.coins); 
    }
    catch (error) {
      setUserCoins(null);
      const message = error instanceof BackendError ? error.message : t('backendService.errorNetworkConnection');
      Toast.show({ 
        type: 'error', 
        text1: t('accountSettings.errorLoadCoins'), 
        text2: message, 
        position: 'bottom', 
      });
    }
    finally { setIsLoadingCoins(false); }
  }, [t]);

  useFocusEffect( useCallback(() => {
      let isActive = true;
      setIsDataLoading(true);
      const loadAndProcessData = async () => {
        try {
          const loadedSettings = await loadSettings();
          if (!isActive) return;
          setSettings(loadedSettings);
          navigation.setOptions({ title: t('settingsScreen.title') });
          await fetchUserStatus();
          await updateStatistics(loadedSettings.dailyGoals);
        } catch (error) {
          if (isActive) {
            Alert.alert(t('dailyEntryScreen.errorLoad'), t('dailyEntryScreen.errorLoadMessage'));
          }
        } finally {
          if (isActive) setIsDataLoading(false);
        }
      };
      loadAndProcessData();
      return () => { isActive = false; };
    }, [updateStatistics, fetchUserStatus, navigation, t]) 
  );

  const handleGoalChange = useCallback(async (goalType: MacroType, value: string) => {
    const numericValue = parseFloat(value);
    const validatedValue = isNaN(numericValue) || numericValue < 0 ? 0 : numericValue;

    setSettings((prevSettings) => {
      const updatedGoals = { ...prevSettings.dailyGoals, [goalType]: validatedValue };
      const updatedSettings: Settings = { ...prevSettings, dailyGoals: updatedGoals };
      
      saveSettings(updatedSettings)
        .then(() => {
          updateStatistics(updatedSettings.dailyGoals);
        })
        .catch((error) => {
          Alert.alert(t('dailyEntryScreen.errorSave'), t('dailyEntryScreen.errorSaveMessage'));
        });
      return updatedSettings;
    });
  }, [updateStatistics, t]);


  const localDataOperationHandler = useCallback(async () => {
    setIsDataLoading(true);
    try {
      const reloadedSettings = await loadSettings();
      setSettings(reloadedSettings);
      await updateStatistics(reloadedSettings.dailyGoals);
      await fetchUserStatus();
      onThemeChange(reloadedSettings.theme); 
      onLocaleChange(reloadedSettings.language); 
      
      onDataOperation(); 

      Toast.show({ type: 'info', text1: t('dataManagement.dataReloaded'), position: 'bottom'});
    }
    catch (error) { Alert.alert(t('dailyEntryScreen.errorLoad'), t('dailyEntryScreen.errorLoadMessage')); }
    finally { setIsDataLoading(false); }
  }, [updateStatistics, onThemeChange, onLocaleChange, fetchUserStatus, onDataOperation, t]);

    const handleAddTestCoins = useCallback(async () => {
        setIsAddingCoins(true);
        try { 
            const amount = 10; 
            const updatedStatus = await addCoinsToUser(amount); 
            setUserCoins(updatedStatus.coins); 
            Toast.show({ type: 'success', text1: t('accountSettings.coinsAdded'), text2: `${t('accountSettings.coinBalance')}: ${updatedStatus.coins}`, position: 'bottom' }); 
        }
        catch (error) { 
            const message = error instanceof BackendError ? error.message : t('backendService.errorNetworkConnection');
            Toast.show({ type: 'error', text1: t('accountSettings.errorAddCoins'), text2: message, position: 'bottom' }); 
        }
        finally { setIsAddingCoins(false); }
    }, [t]);

  const handleLanguageChange = (newLanguage: LanguageCode) => {
    setSettings(prev => ({...prev, language: newLanguage}));
    onLocaleChange(newLanguage); 
  };

  const handleNavigateToQuestionnaire = () => {
    navigation.navigate('Questionnaire');
  };

  const handleLogout = () => {
    Alert.alert(
        t('settingsScreen.account.logoutConfirmTitle'),
        t('settingsScreen.account.logoutConfirmMessage'),
        [
            { text: t('confirmationModal.cancel'), style: 'cancel' },
            { text: t('settingsScreen.account.logout'), style: 'destructive', onPress: onLogout },
        ],
        { cancelable: true }
    );
  };

  if (isDataLoading) {
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
             userCoins={userCoins}
             isLoadingCoins={isLoadingCoins}
             isAddingCoins={isAddingCoins}
             onAddTestCoins={handleAddTestCoins}
        />

        <Text h3 style={styles.sectionTitle}>{t('settingsScreen.account.actions')}</Text>
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
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
import { NativeStackNavigationProp } from "@react-navigation/native-stack"; // For navigation
import { clearIconCache } from "../utils/iconUtils";
import Toast from "react-native-toast-message";
import { getUserStatus, addCoinsToUser, BackendError } from "../services/backendService";
import { t } from "../localization/i18n";
import i18n from '../localization/i18n';

interface SettingsScreenProps {
  onThemeChange: (theme: "light" | "dark" | "system") => void;
  onLocaleChange: (locale: LanguageCode) => void;
  onDataOperation: () => void; // This prop now comes from AppNavigator and is handleFoodChange
}

// Define param list for Settings Stack
type SettingsStackParamList = {
  SettingsHome: undefined; // Current screen (SettingsScreen)
  Questionnaire: undefined; // The new QuestionnaireScreen
};

type SettingsNavigationProp = NativeStackNavigationProp<SettingsStackParamList, 'SettingsHome'>;


const SettingsScreen: React.FC<SettingsScreenProps> = ({ onThemeChange, onLocaleChange, onDataOperation }) => {
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
  const [isClearingCache, setIsClearingCache] = useState(false);
  const [userCoins, setUserCoins] = useState<number | null>(null);
  const [isLoadingCoins, setIsLoadingCoins] = useState(false);
  const [isAddingCoins, setIsAddingCoins] = useState(false);
  const [isDataLoading, setIsDataLoading] = useState(true); // For initial load

  const { theme } = useTheme();
  const styles = useStyles();
  const navigation = useNavigation<SettingsNavigationProp>(); // Typed navigation

  const getStatisticsData = useCallback((
    dailyEntries: DailyEntry[],
    macro: MacroType,
    currentGoals: { [key in MacroType]: number }
  ): MacroData[][] => {
    const intakeDataMap = new Map<number, number>(); // timestamp -> value
    const goalDataMap = new Map<number, number>();   // timestamp -> value (for calories)

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

    if (macro === "calories") {
        const finalGoalData: MacroData[] = sortedTimestamps.map(ts => ({
            x: ts,
            y: goalDataMap.get(ts) || currentGoals[macro] || 0
        }));
        return [finalIntakeData, finalGoalData];
    }
    return [finalIntakeData];
  }, []);


  const updateStatistics = useCallback(async (currentGoals: { [key in MacroType]: number }) => {
    console.log("SettingsScreen: Updating statistics with goals:", currentGoals);
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
        console.log("SettingsScreen: Statistics updated.");
    } catch (error) {
        console.error("SettingsScreen: Failed to update statistics:", error);
    }
  }, [getStatisticsData]);

  const fetchUserStatus = useCallback(async () => {
    setIsLoadingCoins(true);
    try { const status = await getUserStatus(); setUserCoins(status.coins); }
    catch (error) {
      setUserCoins(null);
      Toast.show({ type: 'error', text1: t('accountSettings.errorLoadCoins'), text2: error instanceof BackendError ? error.message : t('backendService.errorNetworkConnection'), position: 'bottom', });
    }
    finally { setIsLoadingCoins(false); }
  }, []);

  useFocusEffect( useCallback(() => {
      let isActive = true;
      setIsDataLoading(true);
      const loadAndProcessData = async () => {
        try {
          const loadedSettings = await loadSettings();
          if (!isActive) return;
          setSettings(loadedSettings);
          // Update title based on loaded settings (language might have changed)
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
    }, [updateStatistics, fetchUserStatus, navigation]) // Added navigation to dependency array
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
  }, [updateStatistics]);


  // This local function is passed to DataManagementButtons.
  // It now also calls the onDataOperation prop received from AppNavigator.
  const localDataOperationHandler = useCallback(async () => {
    setIsDataLoading(true);
    try {
      const reloadedSettings = await loadSettings();
      setSettings(reloadedSettings);
      await updateStatistics(reloadedSettings.dailyGoals);
      await fetchUserStatus();
      onThemeChange(reloadedSettings.theme); // Update theme via AppNavigator's callback
      onLocaleChange(reloadedSettings.language); // Update locale via AppNavigator's callback
      
      onDataOperation(); // <= THIS IS THE KEY CHANGE: Call the prop from AppNavigator

      Toast.show({ type: 'info', text1: t('dataManagement.dataReloaded'), position: 'bottom'});
    }
    catch (error) { Alert.alert(t('dailyEntryScreen.errorLoad'), t('dailyEntryScreen.errorLoadMessage')); }
    finally { setIsDataLoading(false); }
  }, [updateStatistics, onThemeChange, onLocaleChange, fetchUserStatus, onDataOperation]);

   const handleClearIconCache = useCallback(async () => {
      setIsClearingCache(true);
      try { await clearIconCache(); Toast.show({ type: 'success', text1: t('settings.iconsCacheCleared'), text2: t('settings.iconsCacheClearedMessage'), position: 'bottom' }); }
      catch (error) { Toast.show({ type: 'error', text1: t('settings.errorClearCache'), text2: error instanceof Error ? error.message : t('settings.errorClearCacheMessage'), position: 'bottom' }); }
      finally { setIsClearingCache(false); }
   }, []);

    const handleAddTestCoins = useCallback(async () => {
        setIsAddingCoins(true);
        try { const amount = 10; const updatedStatus = await addCoinsToUser(amount); setUserCoins(updatedStatus.coins); Toast.show({ type: 'success', text1: t('accountSettings.coinsAdded'), text2: `${t('accountSettings.coinBalance')}: ${updatedStatus.coins}`, position: 'bottom' }); }
        catch (error) { Toast.show({ type: 'error', text1: t('accountSettings.errorAddCoins'), text2: error instanceof BackendError ? error.message : t('backendService.errorNetworkConnection'), position: 'bottom' }); }
        finally { setIsAddingCoins(false); }
    }, []);

  const handleLanguageChange = (newLanguage: LanguageCode) => {
    setSettings(prev => ({...prev, language: newLanguage}));
    onLocaleChange(newLanguage); // This calls App.tsx's handleLocaleChange
  };

  const handleNavigateToQuestionnaire = () => {
    navigation.navigate('Questionnaire');
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

        <Text h3 style={styles.sectionTitle}>{t('settingsScreen.cacheManagement.title')}</Text>
        <View style={styles.buttonGroup}>
            <Button title={t('settings.refreshIcons')} onPress={handleClearIconCache} buttonStyle={[styles.button, { backgroundColor: theme.colors.secondary }]}
                    icon={<Icon name="refresh-outline" type="ionicon" color="white" size={20} style={{ marginRight: 8 }} />}
                    loading={isClearingCache} disabled={isClearingCache} />
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
    marginBottom: 10, // Reduced bottom margin as inputs follow directly
  },
  sectionTitleInline: {
    marginTop: 0, // Reset margin for inline title
    marginBottom: 0, // Reset margin
    borderLeftWidth: 0, // Remove border for inline version or style differently
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

// src/screens/SettingsScreen.tsx
// src/screens/SettingsScreen.tsx
import React, { useState, useEffect, useCallback } from "react";
import { View, ScrollView, Alert, StyleSheet, ActivityIndicator, Platform } from "react-native";
import { Text, makeStyles, Button, Icon, useTheme, ListItem } from "@rneui/themed";
import { Picker } from '@react-native-picker/picker'; // Import Picker
import DailyGoalsInput from "../components/DailyGoalsInput";
import DataManagementButtons from "../components/DataManagementButtons";
import ThemeSwitch from "../components/ThemeSwitch";
import StatisticsChart from "../components/StatisticsChart";
import AccountSettings from "../components/AccountSettings";
import { loadSettings, saveSettings, loadDailyEntries } from "../services/storageService";
import { Settings, Statistics, MacroType, MacroData, LanguageCode } from "../types/settings";
import { parseISO, isValid } from "date-fns";
import { DailyEntry } from "../types/dailyEntry";
import { useFocusEffect } from "@react-navigation/native";
import { clearIconCache } from "../utils/iconUtils";
import Toast from "react-native-toast-message";
import { getUserStatus, addCoinsToUser, BackendError } from "../services/backendService";
import { t } from "../localization/i18n";
import i18n from '../localization/i18n'; // For direct locale access if needed

interface SettingsScreenProps {
  onThemeChange: (theme: "light" | "dark" | "system") => void;
  onLocaleChange: (locale: LanguageCode) => void;
  onDataOperation: () => void;
}

const SettingsScreen: React.FC<SettingsScreenProps> = ({ onThemeChange, onLocaleChange }) => {
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

  const { theme } = useTheme();
  const styles = useStyles();

  const getStatisticsData = useCallback(( dailyEntries: DailyEntry[], macro: MacroType, currentGoals: { [key in MacroType]: number } ): MacroData[][] => {
    const intakeData: MacroData[] = []; const goalData: MacroData[] = [];
    dailyEntries.forEach((entry) => {
       try {
            const entryDate = parseISO(entry.date); if (!isValid(entryDate)) { console.warn(`Invalid date: ${entry.date}`); return; }
            const entryTimestamp = entryDate.getTime(); let intakeValue = 0;
            if (entry.items && Array.isArray(entry.items)) intakeValue = entry.items.reduce((total, item) => { if (item.food && typeof item.food[macro] === 'number' && typeof item.grams === 'number' && item.grams > 0) return total + (item.food[macro] / 100) * item.grams; return total; }, 0);
            const goalValue = currentGoals[macro] ?? 0; intakeData.push({ x: entryTimestamp, y: Math.round(intakeValue) });
            if (macro === "calories") goalData.push({ x: entryTimestamp, y: Math.round(goalValue) });
        } catch (parseError) { console.error(`Error processing entry ${entry.date}:`, parseError); }
    });
    intakeData.sort((a, b) => a.x - b.x); if (macro === "calories") { goalData.sort((a, b) => a.x - b.x); return [intakeData, goalData]; } else return [intakeData];
  }, []);

  const updateStatistics = useCallback(async (currentGoals: { [key in MacroType]: number }) => {
    console.log("SettingsScreen: Updating statistics...");
    try {
        const loadedEntries = await loadDailyEntries(); const updatedStats: Statistics = {
            calories: getStatisticsData(loadedEntries, "calories", currentGoals), protein: getStatisticsData(loadedEntries, "protein", currentGoals),
            carbs: getStatisticsData(loadedEntries, "carbs", currentGoals), fat: getStatisticsData(loadedEntries, "fat", currentGoals), };
        setStatistics(updatedStats); setChartUpdateKey((prevKey) => prevKey + 1); console.log("SettingsScreen: Statistics updated.");
    } catch (error) { console.error("SettingsScreen: Failed to update statistics:", error); }
  }, [getStatisticsData]);

  const fetchUserStatus = useCallback(async () => {
    setIsLoadingCoins(true);
    try { const status = await getUserStatus(); setUserCoins(status.coins); }
    catch (error) { setUserCoins(null); Toast.show({ type: 'error', text1: t('accountSettings.errorLoadCoins'), text2: error instanceof BackendError ? error.message : 'Check connection.', position: 'bottom', }); }
    finally { setIsLoadingCoins(false); }
  }, []);

  useFocusEffect( useCallback(() => {
      let isActive = true;
      const loadAndProcessData = async () => { try { const loadedSettings = await loadSettings(); if (!isActive) return; setSettings(loadedSettings); await fetchUserStatus(); updateStatistics(loadedSettings.dailyGoals); } catch (error) { if (isActive) { Alert.alert(t('dailyEntryScreen.errorLoad'), t('dailyEntryScreen.errorLoadMessage')); } } };
      loadAndProcessData(); return () => { isActive = false; };
    }, [updateStatistics, fetchUserStatus])
  );

  const handleGoalChange = useCallback(async (goalType: MacroType, value: string) => {
    const numericValue = parseFloat(value) || 0; let latestSettings: Settings | null = null;
    setSettings((prevSettings) => { const updatedGoals = { ...prevSettings.dailyGoals, [goalType]: numericValue }; const updatedSettings: Settings = { ...prevSettings, dailyGoals: updatedGoals }; latestSettings = updatedSettings;
      (async () => { if (!latestSettings) return; try { await saveSettings(latestSettings); updateStatistics(latestSettings.dailyGoals); } catch (error) { Alert.alert(t('dailyEntryScreen.errorSave')); } })();
      return updatedSettings; });
  }, [updateStatistics]);

  const handleDataOperation = useCallback(async () => {
    try { const reloadedSettings = await loadSettings(); setSettings(reloadedSettings); updateStatistics(reloadedSettings.dailyGoals); fetchUserStatus(); onThemeChange(reloadedSettings.theme); onLocaleChange(reloadedSettings.language); Toast.show({ type: 'info', text1: t('dataManagement.dataReloaded'), position: 'bottom'}); }
    catch (error) { Alert.alert(t('dailyEntryScreen.errorLoad')); }
  }, [updateStatistics, onThemeChange, onLocaleChange, fetchUserStatus]);

   const handleClearIconCache = useCallback(async () => {
      setIsClearingCache(true);
      try { await clearIconCache(); Toast.show({ type: 'success', text1: t('settings.iconsCacheCleared'), text2: t('settings.iconsCacheClearedMessage'), position: 'bottom' }); }
      catch (error) { Toast.show({ type: 'error', text1: t('settings.errorClearCache'), text2: error instanceof Error ? error.message : t('settings.errorClearCacheMessage'), position: 'bottom' }); }
      finally { setIsClearingCache(false); }
   }, []);

    const handleAddTestCoins = useCallback(async () => {
        setIsAddingCoins(true);
        try { const amount = 10; const updatedStatus = await addCoinsToUser(amount); setUserCoins(updatedStatus.coins); Toast.show({ type: 'success', text1: t('accountSettings.coinsAdded'), text2: `${t('accountSettings.coinBalance')}: ${updatedStatus.coins}`, position: 'bottom' }); }
        catch (error) { Toast.show({ type: 'error', text1: t('accountSettings.errorAddCoins'), text2: error instanceof BackendError ? error.message : 'Try again.', position: 'bottom' }); }
        finally { setIsAddingCoins(false); }
    }, []);

  const handleLanguageChange = (newLanguage: LanguageCode) => {
    setSettings(prev => ({...prev, language: newLanguage})); // Optimistically update local state
    onLocaleChange(newLanguage); // Propagate to App.tsx
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.scrollContentContainer}>
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
                <ListItem.Title style={{ color: theme.colors.text }}>{t('settingsScreen.language.title')}</ListItem.Title>
            </ListItem.Content>
        </ListItem>
        <View style={Platform.OS === 'ios' ? {} : styles.pickerContainerAndroid}>
            <Picker
                selectedValue={settings.language}
                onValueChange={(itemValue: string) => handleLanguageChange(itemValue as LanguageCode)}
                style={Platform.OS === 'android' ? { color: theme.colors.text, backgroundColor: theme.colors.background } : {}}
                itemStyle={Platform.OS === 'ios' ? { color: theme.colors.text } : {}}
                dropdownIconColor={theme.colors.text}
            >
                <Picker.Item label={t('settingsScreen.language.system')} value="system" />
                <Picker.Item label={t('settingsScreen.language.english')} value="en" />
                <Picker.Item label={t('settingsScreen.language.russian')} value="ru" />
                <Picker.Item label={t('settingsScreen.language.hebrew')} value="he" />
            </Picker>
        </View>


        <Text h3 style={styles.sectionTitle}>{t('settingsScreen.dailyGoals.title')}</Text>
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
            <StatisticsChart statistics={statistics} key={chartUpdateKey} />
        </View>

        <Text h3 style={styles.sectionTitle}>{t('settingsScreen.dataManagement.title')}</Text>
        <View style={styles.buttonGroup}>
            <DataManagementButtons onDataOperation={handleDataOperation} />
        </View>
    </ScrollView>
  );
};

const useStyles = makeStyles((theme) => ({
  container: { flex: 1, backgroundColor: theme.colors.background, },
  scrollContentContainer: { padding: 15, paddingBottom: 40, },
  sectionTitle: {
    color: theme.colors.text, marginTop: 25, marginBottom: 15, paddingLeft: 5,
    borderLeftWidth: 3, borderLeftColor: theme.colors.primary, textAlign: 'left', // Ensure left alignment for RTL
  },
  inputGroup: { marginBottom: 10, paddingHorizontal: 5, },
  buttonGroup: { marginBottom: 10, paddingHorizontal: 5, },
  button: { marginBottom: 10, borderRadius: 8, },
  chartContainer: { minHeight: 300, height: 'auto', marginBottom: 20, },
  pickerContainerAndroid: {
    backgroundColor: theme.colors.grey5, // A slightly different background for Android picker container
    borderRadius: 8,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: theme.colors.grey3,
  },
}));

export default SettingsScreen;
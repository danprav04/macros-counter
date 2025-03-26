// SettingsScreen.tsx
import React, { useState, useEffect, useCallback } from "react";
import { View, ScrollView, Alert, Platform } from "react-native";
import { Text, makeStyles } from "@rneui/themed";
import { Picker } from '@react-native-picker/picker';
import DailyGoalsInput from "../components/DailyGoalsInput";
import DataManagementButtons from "../components/DataManagementButtons";
import ThemeSwitch from "../components/ThemeSwitch";
import StatisticsChart from "../components/StatisticsChart";
import { loadSettings, saveSettings, loadDailyEntries } from "../services/storageService";
import { Settings, Statistics, MacroType, MacroData } from "../types/settings";
import { parseISO, isBefore, formatISO } from "date-fns";
import { formatDate, formatDateReadable } from "../utils/dateUtils";
import { useTheme } from "@rneui/themed";
import { DailyEntry } from "../types/dailyEntry";
import { useFocusEffect } from "@react-navigation/native";
import { useTranslation } from 'react-i18next';

interface SettingsScreenProps {
  onThemeChange: (theme: "light" | "dark" | "system") => void;
  onDataOperation: () => void;
}

const SettingsScreen: React.FC<SettingsScreenProps> = ({ onThemeChange, onDataOperation }) => {
  const [settings, setSettings] = useState<Settings>({
    theme: "system",
    dailyGoals: { calories: 2000, protein: 50, carbs: 200, fat: 70 },
    language: undefined,
  });

  // ... (other state: statistics, chartUpdateKey, dataChangeCounter) ...
  const [statistics, setStatistics] = useState<Statistics>({ calories: [], protein: [], carbs: [], fat: [] });
  const [chartUpdateKey, setChartUpdateKey] = useState(0);
  const [dataChangeCounter, setDataChangeCounter] = useState(0);


  const { theme } = useTheme();
  const styles = useStyles();
  const { t, i18n } = useTranslation();
  const [currentLanguage, setCurrentLanguage] = useState(i18n.language || 'en');

  // Load initial settings
  const loadInitialSettings = useCallback(async () => {
    console.log("SettingsScreen: Loading initial settings...");
    const loadedSettings = await loadSettings();
    console.log("SettingsScreen: Loaded settings:", loadedSettings);

    // --- FIX 1: Correctly merge default goals ---
    // Spread loaded goals first, then apply defaults for any missing keys
    const completeDailyGoals = {
        calories: 2000, protein: 50, carbs: 200, fat: 70, // Defaults first
        ...(loadedSettings?.dailyGoals || {}), // THEN spread loaded goals to override defaults
    };
    // --- END FIX 1 ---

    setSettings({
        ...loadedSettings, // Load theme, language, history (this spread is fine)
        dailyGoals: completeDailyGoals, // Set the correctly merged goals object
    });
    setCurrentLanguage(loadedSettings.language || i18n.language || 'en');
    console.log("SettingsScreen: Settings state updated. Current language for picker:", loadedSettings.language || i18n.language || 'en');
  }, []);

  // Handle language change (keep as is)
  const handleLanguageChange = async (lang: string) => { /* ... */
    if (lang && lang !== currentLanguage) {
        console.log(`SettingsScreen: Attempting to change language to ${lang}`);
      try {
        await i18n.changeLanguage(lang);
        setCurrentLanguage(lang);
        setSettings(prev => ({...prev, language: lang}));
        console.log(`SettingsScreen: Language successfully changed to ${lang}`);
      } catch (error) {
          console.error("SettingsScreen: Failed to change language", error);
          Alert.alert(t('common.error'), t('settingsScreen.languageChangeFailed', 'Failed to change language.'));
      }
    }
  };

  // Handle goal change
  const handleGoalChange = useCallback(async (goalType: MacroType, value: string) => {
    const numericValue = parseFloat(value) || 0;

    setSettings((prevSettings) => {
        // --- FIX 2: Correctly merge default goals ---
        // Ensure we start with a valid goals object (even if prevSettings.dailyGoals was somehow partial)
        const baseGoals = {
            calories: 2000, protein: 50, carbs: 200, fat: 70, // Defaults first
            ...(prevSettings.dailyGoals || {}), // THEN spread previous goals
        };

        // Apply the specific change
        const updatedGoals = {
            ...baseGoals,
            [goalType]: numericValue
        };
        // --- END FIX 2 ---

        const updatedSettings: Settings = {
            ...prevSettings,
            dailyGoals: updatedGoals, // Use the correctly merged and updated goals
        };

        (async () => {
            console.log("SettingsScreen: Saving goal changes:", updatedSettings);
            await saveSettings(updatedSettings);
            setChartUpdateKey((prevKey) => prevKey + 1);
        })();

        return updatedSettings;
    });
  }, []);

   // --- Statistics Calculation --- (Keep existing logic)
   const getStatisticsData = useCallback(/* ... */ (dailyEntries: DailyEntry[], macro: MacroType ): MacroData[][] => {
        const intakeData: MacroData[] = [];
        const goalData: MacroData[] = []; // For calories goal
          dailyEntries.forEach((entry) => {
              const entryDate = parseISO(entry.date);
            const relevantGoals = settings.dailyGoals; // Use current settings state
            const intakeValue = entry.items.reduce((total, item) => total + (item.food[macro] / 100) * item.grams, 0);
            const goalValue = relevantGoals[macro] ?? 0; // Use ?? 0 for safety
            intakeData.push({ x: entryDate.getTime(), y: intakeValue });
            if (macro === "calories") { goalData.push({ x: entryDate.getTime(), y: goalValue }); }
          });
        intakeData.sort((a, b) => a.x - b.x);
          if (macro === "calories") { goalData.sort((a,b) => a.x - b.x); return [intakeData, goalData]; }
          else { return [intakeData]; }
     }, [settings.dailyGoals]); // Depends on settings.dailyGoals

    // --- Statistics Update Function --- (Keep existing logic)
    const updateStatistics = useCallback(/* ... */ async () => {
        console.log("SettingsScreen: Updating statistics...");
        const loadedEntries = await loadDailyEntries();
        const updatedStats: Statistics = {
            calories: getStatisticsData(loadedEntries, "calories"),
            protein: getStatisticsData(loadedEntries, "protein"),
            carbs: getStatisticsData(loadedEntries, "carbs"),
            fat: getStatisticsData(loadedEntries, "fat"),
        };
        setStatistics(updatedStats);
        console.log("SettingsScreen: Statistics updated.");
     }, [getStatisticsData]); // Depends on getStatisticsData function

    // --- Effects --- (Keep existing logic)
    useFocusEffect(/* ... */ useCallback(() => {
            console.log("SettingsScreen: Focus effect triggered.");
            let isActive = true;
            const loadAndAnalyze = async () => {
                await loadInitialSettings();
                if (isActive) { await updateStatistics(); }
            };
            loadAndAnalyze();
            return () => { isActive = false; console.log("SettingsScreen: Focus effect cleanup."); };
        }, [loadInitialSettings, updateStatistics]));

    useEffect(/* ... */ () => {
        if (dataChangeCounter > 0) {
             console.log("SettingsScreen: Data change detected, updating statistics.");
            (async () => { await updateStatistics(); setChartUpdateKey((prevKey) => prevKey + 1); })();
        }
     }, [dataChangeCounter, updateStatistics]);

    // --- Callback for Data Management --- (Keep existing logic)
    const handleDataOperation = useCallback(/* ... */ () => {
        console.log("SettingsScreen: Data operation occurred.");
        setDataChangeCounter((prevCounter) => prevCounter + 1);
         loadInitialSettings();
    }, [loadInitialSettings]);

  // --- Render --- (Keep existing JSX structure)
  return (
    <ScrollView style={styles.container} keyboardShouldPersistTaps="handled">
      {/* General Section */}
      <Text h3 style={[styles.sectionTitle, { color: theme.colors.text }]}>{t('settingsScreen.general')}</Text>
      <ThemeSwitch currentTheme={settings.theme} onToggle={onThemeChange} />

      {/* Language Section */}
      <Text h3 style={[styles.sectionTitle, { color: theme.colors.text }]}>{t('settingsScreen.language')}</Text>
      <View style={[styles.pickerContainer, { backgroundColor: theme.colors.grey5, borderColor: theme.colors.divider }]}>
        <Picker selectedValue={currentLanguage} onValueChange={(itemValue) => handleLanguageChange(itemValue)} style={[styles.picker, { color: theme.colors.text }]} dropdownIconColor={theme.colors.text} mode="dropdown" >
          <Picker.Item label="English" value="en" />
          <Picker.Item label="Русский (Russian)" value="ru" />
          <Picker.Item label="עברית (Hebrew)" value="he" />
        </Picker>
      </View>

      {/* Daily Goals Section */}
      <Text h3 style={[styles.sectionTitle, { color: theme.colors.text }]}>{t('settingsScreen.dailyGoals')}</Text>
      <DailyGoalsInput dailyGoals={settings.dailyGoals} onGoalChange={handleGoalChange} />

      {/* Statistics Section */}
      <Text h3 style={[styles.sectionTitle, { color: theme.colors.text }]}>{t('settingsScreen.statistics')}</Text>
      <StatisticsChart statistics={statistics} key={`chart-${chartUpdateKey}`} />

      {/* Data Management Section */}
      <Text h3 style={[styles.sectionTitle, { color: theme.colors.text }]}>{t('settingsScreen.dataManagement')}</Text>
      <DataManagementButtons onDataOperation={handleDataOperation} />

      <View style={{ height: 30 }} />
    </ScrollView>
  );
};

// --- Styles --- (Keep existing styles)
const useStyles = makeStyles(/* ... */ (theme) => ({
  container: { flex: 1, padding: 15, backgroundColor: theme.colors.background, },
  sectionTitle: { marginTop: 20, marginBottom: 10, fontWeight: 'bold', },
  button: { marginBottom: 10, },
   pickerContainer: { borderRadius: 8, marginBottom: 15, borderWidth: 1, overflow: 'hidden', justifyContent: 'center', },
  picker: { width: '100%', height: Platform.OS === 'ios' ? 180 : 50, backgroundColor: 'transparent', },
}));

export default SettingsScreen;
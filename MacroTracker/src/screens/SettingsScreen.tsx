// SettingsScreen.tsx
import React, { useState, useEffect, useCallback } from "react";
import { View, ScrollView, Alert } from "react-native";
import { Text, makeStyles } from "@rneui/themed";
import DailyGoalsInput from "../components/DailyGoalsInput";
import DataManagementButtons from "../components/DataManagementButtons";
import ThemeSwitch from "../components/ThemeSwitch";
import StatisticsChart from "../components/StatisticsChart";
import { loadSettings, saveSettings, loadDailyEntries } from "../services/storageService";
import { Settings, Statistics, MacroType, MacroData } from "../types/settings";
import { parseISO, isBefore, formatISO } from "date-fns";
import { formatDate, formatDateReadable } from "../utils/dateUtils"; // Use custom formatDate
import { useTheme } from "@rneui/themed";
import { DailyEntry } from "../types/dailyEntry";
import { useFocusEffect } from "@react-navigation/native";

interface SettingsScreenProps {
  onThemeChange: (theme: "light" | "dark" | "system") => void;
  onDataOperation: () => void;
}

const SettingsScreen: React.FC<SettingsScreenProps> = ({ onThemeChange, onDataOperation }) => {
  const [settings, setSettings] = useState<Settings>({
    theme: "system",
    dailyGoals: {
      calories: 2000,
      protein: 50,
      carbs: 200,
      fat: 70,
    },
  });

  const [statistics, setStatistics] = useState<Statistics>({
    calories: [],
    protein: [],
    carbs: [],
    fat: [],
  });
  // Removed settingsHistory
  const [chartUpdateKey, setChartUpdateKey] = useState(0);
  const [dataChangeCounter, setDataChangeCounter] = useState(0);

  const { theme } = useTheme();
  const styles = useStyles();

  const loadInitialSettings = useCallback(async () => {
    const loadedSettings = await loadSettings();

    setSettings((prevSettings) => ({
      ...prevSettings,
      ...loadedSettings,
      dailyGoals: {
        ...prevSettings.dailyGoals,
        ...(loadedSettings?.dailyGoals || {}),
      },
    }));
  }, []);

  useEffect(() => {
    loadInitialSettings();
  }, [loadInitialSettings]);


  const handleGoalChange = useCallback(async (goalType: MacroType, value: string) => {
    const numericValue = parseFloat(value) || 0;

    setSettings((prevSettings) => {
      const updatedGoals = { ...prevSettings.dailyGoals, [goalType]: numericValue };
      const updatedSettings: Settings = {
        ...prevSettings,
        dailyGoals: updatedGoals,
      };

      // Removed settings history update

      (async () => {
        await saveSettings(updatedSettings); // Simplified save
        setChartUpdateKey((prevKey) => prevKey + 1);
      })();

      return updatedSettings;
    });
    }, []); // Removed settingsHistory dependency


    const getStatisticsData = useCallback(
      (
        dailyEntries: DailyEntry[],
        macro: MacroType,
      ): MacroData[][] => { // Return type annotation
        const intakeData: MacroData[] = [];
        const goalData: MacroData[] = []; // For calories goal

          dailyEntries.forEach((entry) => {
              const entryDate = parseISO(entry.date);
            // Use current settings for all entries
            const relevantGoals = settings.dailyGoals;

            const intakeValue = entry.items.reduce(
              (total, item) => total + (item.food[macro] / 100) * item.grams,
              0
            );
            const goalValue = relevantGoals[macro] ?? 0;

            // Add to intake data (for all macros)
            intakeData.push({ x: entryDate.getTime(), y: intakeValue });

            // Add to goal data (only for calories)
            if (macro === "calories") {
              goalData.push({ x: entryDate.getTime(), y: goalValue });
            }
          });

          // Sort both arrays by date
        intakeData.sort((a, b) => a.x - b.x);
          if (macro === "calories") {
              goalData.sort((a,b) => a.x - b.x);
          }

        // Return as an array of arrays
        if (macro === "calories") {
          return [intakeData, goalData]; // Two series: intake and goal
        } else {
          return [intakeData]; // One series: intake only
        }
      },
      [settings.dailyGoals] // Only settings.dailyGoals as dependency
    );


  const updateStatistics = useCallback(async () => {
    const loadedEntries = await loadDailyEntries();

    // Calculate statistics for each macro
    const updatedStats: Statistics = {
      calories: getStatisticsData(loadedEntries, "calories"),
      protein: getStatisticsData(loadedEntries, "protein"),
      carbs: getStatisticsData(loadedEntries, "carbs"),
      fat: getStatisticsData(loadedEntries, "fat"),
    };

    setStatistics(updatedStats);
  }, [getStatisticsData]);

   useFocusEffect(
    useCallback(() => {
      (async () => {
        await loadInitialSettings();
        await updateStatistics();
      })();
    }, [loadInitialSettings, updateStatistics])
  );

  useEffect(() => {
    (async () => {
      if (dataChangeCounter > 0) {
        await updateStatistics();
        setChartUpdateKey((prevKey) => prevKey + 1);
      }
    })();
  }, [dataChangeCounter, updateStatistics]);

  const handleDataOperation = useCallback(() => {
    setDataChangeCounter((prevCounter) => prevCounter + 1);
  }, []);

  return (
    <ScrollView style={styles.container}>
      <Text h3 style={[styles.sectionTitle, { color: theme.colors.text }]}>General</Text>
      <ThemeSwitch currentTheme={settings.theme} onToggle={onThemeChange} />

      <Text h3 style={[styles.sectionTitle, { color: theme.colors.text }]}>Daily Goals</Text>
      <DailyGoalsInput dailyGoals={settings.dailyGoals} onGoalChange={handleGoalChange} />

      <Text h3 style={[styles.sectionTitle, { color: theme.colors.text }]}>Statistics</Text>
      <StatisticsChart statistics={statistics} key={chartUpdateKey} />

      <Text h3 style={[styles.sectionTitle, { color: theme.colors.text }]}>Data Management</Text>
      <DataManagementButtons onDataOperation={handleDataOperation} />
    </ScrollView>
  );
};
const useStyles = makeStyles((theme) => ({
  container: {
    flex: 1,
    padding: 10,
    backgroundColor: theme.colors.background,
  },
  sectionTitle: {
    marginTop: 20,
    marginBottom: 10,
  },
  button: {
    marginBottom: 10,
  },
}));

export default SettingsScreen;

// components/StatisticsChart.tsx (No changes needed here)
// Remains the same as in the previous, corrected version.  The key changes were in SettingsScreen.
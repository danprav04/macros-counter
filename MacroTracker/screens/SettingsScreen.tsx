// screens/SettingsScreen.tsx
import React, { useState, useEffect, useCallback } from "react";
import { View, ScrollView, Alert } from "react-native";
import { Text, makeStyles } from "@rneui/themed";
import DailyGoalsInput from "../components/DailyGoalsInput";
import DataManagementButtons from "../components/DataManagementButtons";
import ThemeSwitch from "../components/ThemeSwitch";
import StatisticsChart from "../components/StatisticsChart";
import { loadSettings, saveSettings, loadDailyEntries } from "../services/storageService";
import {
Settings,
Statistics,
SettingsScreenProps,
MacroType,
MacroData
} from "../types/settings"; // Import types from settings

import { parseISO, isBefore } from "date-fns";
import { formatDate } from "../utils/dateUtils";
import { useTheme } from "@rneui/themed";
import { DailyEntry } from "../types/dailyEntry";


const SettingsScreen: React.FC<SettingsScreenProps> = ({ onThemeChange }) => {
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
  const [settingsHistory, setSettingsHistory] = useState<
    { date: string; settings: Settings }[]
  >([]);

  const { theme } = useTheme();
  const styles = useStyles();

  const loadInitialSettings = useCallback(async () => {
    const loadedSettings = await loadSettings();
    const loadedSettingsHistory = loadedSettings?.settingsHistory || []; // Handle potentially undefined settingsHistory

    setSettings((prevSettings) => ({
      ...prevSettings,
      ...loadedSettings,
      dailyGoals: {
        ...prevSettings.dailyGoals,
        ...(loadedSettings?.dailyGoals || {}),
      },
    }));
    setSettingsHistory(loadedSettingsHistory);
  }, []);

  useEffect(() => {
    loadInitialSettings();
  }, [loadInitialSettings]);


    const handleGoalChange = (goalType: MacroType, value: string) => {
      const numericValue = parseFloat(value) || 0;
      const updatedGoals = { ...settings.dailyGoals, [goalType]: numericValue };

      setSettings((prevSettings) => {
        const updatedSettings: Settings = {
          ...prevSettings,
          dailyGoals: updatedGoals,
        };

        // Update settings history
        const newSettingsHistory = [
          ...settingsHistory,
          { date: formatDate(new Date()), settings: updatedSettings },
        ];
        saveSettings({ ...updatedSettings, settingsHistory: newSettingsHistory }); // Save history
        setSettingsHistory(newSettingsHistory);

        return updatedSettings;
      });
  };

    const handleDataCleared = async () => {
        try {
          await loadInitialSettings(); // Reload settings and clear inputs
          // Reset statistics, *then* reload entries (to avoid double loading)
          setStatistics({
            calories: [],
            protein: [],
            carbs: [],
            fat: [],
          });
          setSettingsHistory([]);
          const loadedEntries = await loadDailyEntries(); // Reload to get empty entries
          updateStatistics(loadedEntries, settingsHistory)
        } catch (error) {
          Alert.alert("Error", "Failed to clear data.");
        }
    };

      const getStatisticsData = useCallback((
        dailyEntries: DailyEntry[],
        macro: MacroType,
        settingsHistory: { date: string; settings: Settings }[]
      ) => {
        const intakeData = dailyEntries
          .map((entry) => {
            const entryDate = parseISO(entry.date);
            // Find the settings that were in effect *on that date*
            const relevantSettings = settingsHistory
              .filter((sh) => !isBefore(entryDate, parseISO(sh.date))) // Filter out future settings
              .sort((a, b) => parseISO(b.date).getTime() - parseISO(a.date).getTime())[0]?.settings ?? settings; // Get most recent, fallback to current

            const intakeValue = entry.items.reduce(
              (total, item) => total + (item.food[macro] / 100) * item.grams,
              0
            );
            const goalValue = relevantSettings.dailyGoals?.[macro] ?? 0; // Default to 0 if undefined

            return {
              x: entryDate.getTime(), // Convert date to timestamp
              y: intakeValue,
              goal: goalValue,
            };
          })
          .sort((a, b) => a.x - b.x);

          const intakeSeries: MacroData[] = intakeData.map(item => ({ x: item.x, y: item.y }));

          if (macro === "calories") {
              const goalSeries: MacroData[] = intakeData.map(item => ({ x: item.x, y: item.goal }));
              return [intakeSeries, goalSeries]; // Return *both* series
            } else {
              return [intakeSeries]; // Only intake for other macros
            }
      }, [settings]);


  const updateStatistics = useCallback((loadedEntries: DailyEntry[], settingsHistory: { date: string; settings: Settings }[]) => {
        setStatistics({
            calories: getStatisticsData(loadedEntries, "calories", settingsHistory),
            protein: getStatisticsData(loadedEntries, "protein", settingsHistory),
            carbs: getStatisticsData(loadedEntries, "carbs", settingsHistory),
            fat: getStatisticsData(loadedEntries, "fat", settingsHistory),
        });
    }, [getStatisticsData]);

  useEffect(() => {
        const loadStatistics = async () => {
            const loadedEntries = await loadDailyEntries();
            updateStatistics(loadedEntries, settingsHistory);
        };
        loadStatistics();
  }, [settingsHistory, updateStatistics]);


 return (
    <ScrollView style={styles.container}>
      <Text h3 style={[styles.sectionTitle, { color: theme.colors.text }]}>
        General
      </Text>
      <ThemeSwitch
        isDarkMode={settings.theme === "dark"}
        onToggle={() =>
          onThemeChange(settings.theme === "dark" ? "light" : "dark")
        }
      />

      <Text h3 style={[styles.sectionTitle, { color: theme.colors.text }]}>
        Daily Goals
      </Text>
      <DailyGoalsInput
        dailyGoals={settings.dailyGoals}
        onGoalChange={handleGoalChange}
      />

      <Text h3 style={[styles.sectionTitle, { color: theme.colors.text }]}>
        Statistics
      </Text>
      <StatisticsChart statistics={statistics} />

      <Text h3 style={[styles.sectionTitle, { color: theme.colors.text }]}>
        Data Management
      </Text>
      <DataManagementButtons onDataCleared={handleDataCleared} />
    </ScrollView>
  );
};

const useStyles = makeStyles((theme) => ({
    container: {
        flex: 1,
        padding: 10,
        backgroundColor: theme.colors.background
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
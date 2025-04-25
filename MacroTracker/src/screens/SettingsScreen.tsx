// SettingsScreen.tsx (Added Refresh Icons Button)
import React, { useState, useEffect, useCallback } from "react";
import { View, ScrollView, Alert } from "react-native";
import { Text, makeStyles, Button, Icon } from "@rneui/themed"; // Import Button
import DailyGoalsInput from "../components/DailyGoalsInput";
import DataManagementButtons from "../components/DataManagementButtons";
import ThemeSwitch from "../components/ThemeSwitch";
import StatisticsChart from "../components/StatisticsChart";
import { loadSettings, saveSettings, loadDailyEntries } from "../services/storageService";
import { Settings, Statistics, MacroType, MacroData } from "../types/settings";
import { parseISO, isBefore, formatISO, isValid } from "date-fns";
import { formatDateReadable } from "../utils/dateUtils";
import { useTheme } from "@rneui/themed";
import { DailyEntry } from "../types/dailyEntry";
import { useFocusEffect } from "@react-navigation/native";
import { clearIconCache } from "../utils/iconUtils"; // Import cache clearing function
import Toast from "react-native-toast-message"; // Import Toast

interface SettingsScreenProps {
  onThemeChange: (theme: "light" | "dark" | "system") => void;
  // Removed onDataOperation as DataManagementButtons handles its own refresh trigger now
}

const SettingsScreen: React.FC<SettingsScreenProps> = ({ onThemeChange }) => {
  const [settings, setSettings] = useState<Settings>({
    theme: "system",
    dailyGoals: { calories: 2000, protein: 150, carbs: 200, fat: 70 },
    // settingsHistory is no longer managed here
  });

  const [statistics, setStatistics] = useState<Statistics>({
    calories: [], protein: [], carbs: [], fat: [],
  });
  const [chartUpdateKey, setChartUpdateKey] = useState(0);
  const [dataChangeCounter, setDataChangeCounter] = useState(0); // For DataManagement trigger
  const [isClearingCache, setIsClearingCache] = useState(false); // State for icon cache button

  const { theme } = useTheme();
  const styles = useStyles();

  // --- Load Initial Settings ---
  const loadInitialSettings = useCallback(async () => {
    const loadedSettings = await loadSettings(); // loadSettings handles defaults now
    setSettings(loadedSettings);
  }, []);

  useEffect(() => {
    loadInitialSettings();
  }, [loadInitialSettings]);

  // --- Handle Goal Changes ---
  const handleGoalChange = useCallback(async (goalType: MacroType, value: string) => {
    const numericValue = parseFloat(value) || 0; // Default to 0 if parse fails

    setSettings((prevSettings) => {
      const updatedGoals = { ...prevSettings.dailyGoals, [goalType]: numericValue };
      const updatedSettings: Settings = { ...prevSettings, dailyGoals: updatedGoals };

      // Save settings immediately in the background (no need for history tracking here)
      (async () => {
        try {
            await saveSettings(updatedSettings);
             console.log("Settings saved successfully after goal change.");
             // Trigger chart update after save completes (optional, depends if chart uses settings directly)
             setChartUpdateKey((prevKey) => prevKey + 1);
             await updateStatistics(); // Re-calculate statistics after goals change
        } catch (error) {
             console.error("Failed to save settings after goal change:", error);
             Alert.alert("Save Error", "Could not save goal changes.");
             // Optionally revert settings state here if save fails
        }
      })();

      return updatedSettings; // Return updated state immediately for UI responsiveness
    });
  }, []); // No dependencies needed if it saves directly

  // --- Statistics Calculation ---
  const getStatisticsData = useCallback((
    dailyEntries: DailyEntry[],
    macro: MacroType,
    currentGoals: { [key in MacroType]: number } // Pass current goals
   ): MacroData[][] => {
    const intakeData: MacroData[] = [];
    const goalData: MacroData[] = []; // For calories goal

    dailyEntries.forEach((entry) => {
       try {
            // Ensure date is valid before processing
            const entryDate = parseISO(entry.date);
            if (!isValid(entryDate)) {
                console.warn(`Skipping entry with invalid date: ${entry.date}`);
                return; // Skip this entry
            }

            const entryTimestamp = entryDate.getTime();
            let intakeValue = 0;

            // Ensure items array exists
            if (entry.items && Array.isArray(entry.items)) {
                intakeValue = entry.items.reduce((total, item) => {
                    // Add checks for valid item structure
                    if (item.food && typeof item.food[macro] === 'number' && typeof item.grams === 'number' && item.grams > 0) {
                        return total + (item.food[macro] / 100) * item.grams;
                    }
                    return total; // Skip invalid item
                }, 0);
            }

            const goalValue = currentGoals[macro] ?? 0; // Use passed goals

            intakeData.push({ x: entryTimestamp, y: Math.round(intakeValue) }); // Round intake

            if (macro === "calories") {
                goalData.push({ x: entryTimestamp, y: Math.round(goalValue) }); // Round goal
            }
        } catch (parseError) {
             console.error(`Error processing entry for date ${entry.date}:`, parseError);
        }
    });

    // Sort both arrays by date timestamp
    intakeData.sort((a, b) => a.x - b.x);
    if (macro === "calories") {
        goalData.sort((a, b) => a.x - b.x);
        return [intakeData, goalData]; // Two series: intake and goal
    } else {
        return [intakeData]; // One series: intake only
    }
  }, []); // No dependencies needed, relies on arguments

  // --- Update Statistics State ---
  const updateStatistics = useCallback(async () => {
    console.log("SettingsScreen: Updating statistics...");
    try {
        const loadedEntries = await loadDailyEntries();
        // IMPORTANT: Use the *current* settings state for calculating goals
        const currentGoals = settings.dailyGoals;

        const updatedStats: Statistics = {
            calories: getStatisticsData(loadedEntries, "calories", currentGoals),
            protein: getStatisticsData(loadedEntries, "protein", currentGoals),
            carbs: getStatisticsData(loadedEntries, "carbs", currentGoals),
            fat: getStatisticsData(loadedEntries, "fat", currentGoals),
        };

        setStatistics(updatedStats);
        setChartUpdateKey((prevKey) => prevKey + 1); // Trigger chart re-render
        console.log("SettingsScreen: Statistics updated.");
    } catch (error) {
         console.error("SettingsScreen: Failed to update statistics:", error);
    }
  }, [getStatisticsData, settings.dailyGoals]); // Depend on calculator func and current goals

  // --- Load Data on Focus ---
  useFocusEffect(
    useCallback(() => {
      console.log("SettingsScreen: Focused. Loading settings and statistics.");
      (async () => {
        await loadInitialSettings(); // Load latest settings first
        await updateStatistics();    // Then update stats based on loaded settings
      })();
      // Cleanup optional
      return () => console.log("SettingsScreen: Unfocused.");
    }, [loadInitialSettings, updateStatistics]) // Rerun if these functions change identity
  );

  // --- Handle Data Management Button Trigger ---
  // This function is passed to DataManagementButtons and called by it
  const handleDataOperation = useCallback(async () => {
    console.log("SettingsScreen: Data operation triggered. Reloading settings and statistics.");
    // Reload everything after import/clear
    await loadInitialSettings();
    await updateStatistics();
    // Optionally trigger theme refresh if settings import changed theme?
    // onThemeChange(settings.theme); // Be careful with timing here
    Toast.show({ type: 'info', text1: 'Data reloaded.', position: 'bottom'});
  }, [loadInitialSettings, updateStatistics]); // Dependencies needed

  // --- Handle Icon Cache Clearing ---
   const handleClearIconCache = useCallback(async () => {
      console.log("SettingsScreen: Clearing icon cache...");
      setIsClearingCache(true);
      try {
          await clearIconCache();
          Toast.show({
              type: 'success',
              text1: 'Food Icon Cache Cleared',
              text2: 'Icons will refresh when viewed.',
              position: 'bottom'
          });
          console.log("SettingsScreen: Icon cache cleared successfully.");
      } catch (error) {
           console.error("SettingsScreen: Failed to clear icon cache:", error);
           Toast.show({
              type: 'error',
              text1: 'Failed to Clear Cache',
              text2: error instanceof Error ? error.message : 'An unknown error occurred.',
              position: 'bottom'
           });
      } finally {
          setIsClearingCache(false);
      }
   }, []); // No dependencies needed

  // --- Render ---
  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.scrollContentContainer}>
      <Text h3 style={styles.sectionTitle}>General</Text>
      <ThemeSwitch currentTheme={settings.theme} onToggle={onThemeChange} />

      <Text h3 style={styles.sectionTitle}>Daily Goals</Text>
      <View style={styles.inputGroup}>
        <DailyGoalsInput dailyGoals={settings.dailyGoals} onGoalChange={handleGoalChange} />
      </View>

       <Text h3 style={styles.sectionTitle}>Cache Management</Text>
       <View style={styles.buttonGroup}>
            <Button
                title="Refresh Food Icons"
                onPress={handleClearIconCache}
                buttonStyle={[styles.button, { backgroundColor: theme.colors.secondary }]} // Use secondary color
                icon={<Icon name="refresh-outline" type="ionicon" color="white" size={20} style={{ marginRight: 8 }} />}
                loading={isClearingCache}
                disabled={isClearingCache}
            />
       </View>


      <Text h3 style={styles.sectionTitle}>Statistics</Text>
      {/* Wrap chart in a view to control layout/prevent shrinking */}
      <View style={styles.chartContainer}>
        <StatisticsChart statistics={statistics} key={chartUpdateKey} />
      </View>


      <Text h3 style={styles.sectionTitle}>Data Management</Text>
      <View style={styles.buttonGroup}>
        <DataManagementButtons onDataOperation={handleDataOperation} />
      </View>
    </ScrollView>
  );
};

const useStyles = makeStyles((theme) => ({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  scrollContentContainer: {
     padding: 15, // Add padding to the scroll view content
     paddingBottom: 40, // Extra padding at the bottom
  },
  sectionTitle: {
    color: theme.colors.text,
    marginTop: 25, // Increased spacing between sections
    marginBottom: 15, // Spacing below title
    paddingLeft: 5, // Slight indent
    borderLeftWidth: 3,
    borderLeftColor: theme.colors.primary, // Accent line
  },
  inputGroup: {
     marginBottom: 10, // Space below input group
     paddingHorizontal: 5,
  },
   buttonGroup: {
      marginBottom: 10, // Space below button group
      paddingHorizontal: 5,
   },
  button: { // Default button style within sections
    marginBottom: 10,
    borderRadius: 8,
  },
  chartContainer: {
    minHeight: 300, // Ensure chart has enough space, adjust as needed
    marginBottom: 20, // Space below chart
  },
}));

export default SettingsScreen;
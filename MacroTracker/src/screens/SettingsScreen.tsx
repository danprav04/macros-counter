// src/screens/SettingsScreen.tsx
import React, { useState, useEffect, useCallback } from "react";
import { View, ScrollView, Alert, StyleSheet, ActivityIndicator } from "react-native";
import { Text, makeStyles, Button, Icon, ListItem, useTheme } from "@rneui/themed"; // Import ListItem
import DailyGoalsInput from "../components/DailyGoalsInput";
import DataManagementButtons from "../components/DataManagementButtons";
import ThemeSwitch from "../components/ThemeSwitch";
import StatisticsChart from "../components/StatisticsChart";
import { loadSettings, saveSettings, loadDailyEntries } from "../services/storageService";
import { Settings, Statistics, MacroType, MacroData } from "../types/settings";
import { parseISO, isValid } from "date-fns";
import { DailyEntry } from "../types/dailyEntry";
import { useFocusEffect } from "@react-navigation/native";
import { clearIconCache } from "../utils/iconUtils";
import Toast from "react-native-toast-message";
// Import backend service functions
import { getUserStatus, addCoinsToUser, UserStatus, BackendError } from "../services/backendService";

interface SettingsScreenProps {
  onThemeChange: (theme: "light" | "dark" | "system") => void;
}

const SettingsScreen: React.FC<SettingsScreenProps> = ({ onThemeChange }) => {
  // Initial default state - will be overwritten by loadSettings
  const [settings, setSettings] = useState<Settings>({
    theme: "system",
    dailyGoals: { calories: 0, protein: 0, carbs: 0, fat: 0 },
    settingsHistory: [],
  });

  const [statistics, setStatistics] = useState<Statistics>({
    calories: [], protein: [], carbs: [], fat: [],
  });
  const [chartUpdateKey, setChartUpdateKey] = useState(0);
  const [isClearingCache, setIsClearingCache] = useState(false);
  // State for user coins
  const [userCoins, setUserCoins] = useState<number | null>(null);
  const [isLoadingCoins, setIsLoadingCoins] = useState(false);
  const [isAddingCoins, setIsAddingCoins] = useState(false);

  const { theme } = useTheme();
  const styles = useStyles();

  // --- Statistics Calculation (No change needed here) ---
  const getStatisticsData = useCallback((
    dailyEntries: DailyEntry[],
    macro: MacroType,
    currentGoals: { [key in MacroType]: number }
   ): MacroData[][] => {
    const intakeData: MacroData[] = [];
    const goalData: MacroData[] = [];

    dailyEntries.forEach((entry) => {
       try {
            const entryDate = parseISO(entry.date);
            if (!isValid(entryDate)) {
                console.warn(`Skipping entry with invalid date: ${entry.date}`);
                return;
            }

            const entryTimestamp = entryDate.getTime();
            let intakeValue = 0;

            if (entry.items && Array.isArray(entry.items)) {
                intakeValue = entry.items.reduce((total, item) => {
                    if (item.food && typeof item.food[macro] === 'number' && typeof item.grams === 'number' && item.grams > 0) {
                        return total + (item.food[macro] / 100) * item.grams;
                    }
                    return total;
                }, 0);
            }

            const goalValue = currentGoals[macro] ?? 0;

            intakeData.push({ x: entryTimestamp, y: Math.round(intakeValue) });

            if (macro === "calories") {
                goalData.push({ x: entryTimestamp, y: Math.round(goalValue) });
            }
        } catch (parseError) {
             console.error(`Error processing entry for date ${entry.date}:`, parseError);
        }
    });

    intakeData.sort((a, b) => a.x - b.x);
    if (macro === "calories") {
        goalData.sort((a, b) => a.x - b.x);
        return [intakeData, goalData];
    } else {
        return [intakeData];
    }
  }, []);

  // --- Update Statistics State ---
  // Modified: Accepts goals as argument, removed settings.dailyGoals dependency
  const updateStatistics = useCallback(async (currentGoals: { [key in MacroType]: number }) => {
    console.log("SettingsScreen: Updating statistics...");
    try {
        const loadedEntries = await loadDailyEntries();
        // Use the passed currentGoals
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
    // Dependency only on the calculation function now
  }, [getStatisticsData]);

  // --- Fetch User Status ---
  const fetchUserStatus = useCallback(async () => {
    setIsLoadingCoins(true);
    try {
        console.log("SettingsScreen: Fetching user status...");
        const status = await getUserStatus();
        setUserCoins(status.coins);
        console.log(`SettingsScreen: User status fetched. Coins: ${status.coins}`);
    } catch (error) {
        console.error("SettingsScreen: Failed to fetch user status:", error);
        setUserCoins(null); // Indicate error state
        // Optionally show a toast or alert
         Toast.show({
           type: 'error',
           text1: 'Could not load coin balance',
           text2: error instanceof BackendError ? error.message : 'Please check connection.',
           position: 'bottom',
         });
    } finally {
        setIsLoadingCoins(false);
    }
  }, []);


  // --- Load Data on Focus ---
  // Modified: Loads settings, sets state, then calls updateStatistics and fetchUserStatus
  useFocusEffect(
    useCallback(() => {
      let isActive = true; // Prevent state updates if component is unmounted quickly
      console.log("SettingsScreen: Focused. Loading settings, user status, and statistics.");

      const loadAndProcessData = async () => {
        try {
          // Load settings first
          const loadedSettings = await loadSettings();
          if (!isActive) return; // Check flag before state update
          setSettings(loadedSettings); // Update settings state

          // Fetch user status (coins)
          await fetchUserStatus(); // Fetch coins

          // Now update statistics using the just-loaded goals
          // Pass the goals directly to avoid dependency loop
          updateStatistics(loadedSettings.dailyGoals);

        } catch (error) {
           if (isActive) {
                console.error("SettingsScreen: Error during focus effect data load:", error);
                // Handle error appropriately, e.g., show an alert
                 Alert.alert("Load Error", "Failed to load settings or statistics data.");
           }
        }
      };

      loadAndProcessData();

      return () => {
        isActive = false; // Set flag on unmount/blur
        console.log("SettingsScreen: Unfocused.");
      };
      // Dependencies are now only on the stable updateStatistics and fetchUserStatus callbacks
    }, [updateStatistics, fetchUserStatus])
  );


  // --- Handle Goal Changes ---
  // Modified: Uses functional state update and passes new goals directly to updateStatistics
  const handleGoalChange = useCallback(async (goalType: MacroType, value: string) => {
    const numericValue = parseFloat(value) || 0;

    // Use functional update for settings to get the latest state reliably
    let latestSettings: Settings | null = null;
    setSettings((prevSettings) => {
      const updatedGoals = { ...prevSettings.dailyGoals, [goalType]: numericValue };
      const updatedSettings: Settings = { ...prevSettings, dailyGoals: updatedGoals };
      latestSettings = updatedSettings; // Store the updated object

      // Trigger save and stats update in the background
      (async () => {
          if (!latestSettings) return; // Should always be set, but good practice
        try {
          await saveSettings(latestSettings);
          console.log("Settings saved successfully after goal change.");
          // Update statistics immediately with the new goals
          updateStatistics(latestSettings.dailyGoals);
        } catch (error) {
          console.error("Failed to save settings or update stats after goal change:", error);
          Alert.alert("Save Error", "Could not save goal changes.");
          // Optional: Revert UI state if save/update fails critically?
          // E.g., reload settings: setSettings(await loadSettings());
        }
      })();

      return updatedSettings; // Return updated state immediately for UI responsiveness
    });
  }, [updateStatistics]); // Dependency is only on the stable updateStatistics callback


  // --- Handle Data Management Button Trigger ---
  // Modified: Reloads settings AND passes the new goals to updateStatistics, AND refetches user status
  const handleDataOperation = useCallback(async () => {
    console.log("SettingsScreen: Data operation triggered. Reloading settings, user status, and statistics.");
    try {
        const reloadedSettings = await loadSettings();
        setSettings(reloadedSettings); // Update settings state
        updateStatistics(reloadedSettings.dailyGoals); // Update stats with new goals
        fetchUserStatus(); // Refetch user status
        // Trigger theme change if it was altered by import
        onThemeChange(reloadedSettings.theme);
        Toast.show({ type: 'info', text1: 'Data reloaded.', position: 'bottom'});
    } catch (error) {
        console.error("Error reloading data after operation:", error);
        Alert.alert("Reload Error", "Failed to reload data after operation.");
    }
  }, [updateStatistics, onThemeChange, fetchUserStatus]);

  // --- Handle Icon Cache Clearing (No change needed) ---
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
   }, []);

    // --- Handle Add Coins Button ---
    const handleAddTestCoins = useCallback(async () => {
        setIsAddingCoins(true);
        try {
            const amountToAdd = 10;
            console.log(`SettingsScreen: Attempting to add ${amountToAdd} coins...`);
            const updatedStatus = await addCoinsToUser(amountToAdd);
            setUserCoins(updatedStatus.coins); // Update displayed coins
            console.log(`SettingsScreen: Coins added successfully. New balance: ${updatedStatus.coins}`);
            Toast.show({
                type: 'success',
                text1: `${amountToAdd} Coins Added!`,
                text2: `New balance: ${updatedStatus.coins}`,
                position: 'bottom'
            });
        } catch (error) {
            console.error("SettingsScreen: Failed to add coins:", error);
             Toast.show({
                type: 'error',
                text1: 'Failed to Add Coins',
                text2: error instanceof BackendError ? error.message : 'Please try again.',
                position: 'bottom'
             });
        } finally {
            setIsAddingCoins(false);
        }
    }, []);

  // --- Render ---
  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.scrollContentContainer}>
      <Text h3 style={styles.sectionTitle}>Account</Text>
        <ListItem bottomDivider containerStyle={styles.listItem}>
            {/* Changed Icon */}
            <Icon name="database" type="material-community" color={theme.colors.warning} />
            <ListItem.Content>
                <ListItem.Title style={styles.listItemTitle}>Coin Balance</ListItem.Title>
            </ListItem.Content>
            {isLoadingCoins ? (
                 <ActivityIndicator size="small" color={theme.colors.primary} />
             ) : (
                 <Text style={styles.coinValue}>{userCoins !== null ? userCoins : 'N/A'}</Text>
             )}
        </ListItem>
        {/* REMOVE OR PROTECT THIS BUTTON IN PRODUCTION */}
        <Button
            title="Add 10 Coins (Test)"
            onPress={handleAddTestCoins}
            buttonStyle={[styles.button, { backgroundColor: theme.colors.success, marginTop: 10 }]}
            icon={<Icon name="plus-circle-outline" type="material-community" color="white" size={20} style={{ marginRight: 8 }} />}
            loading={isAddingCoins}
            disabled={isAddingCoins || isLoadingCoins}
        />
        <Text style={styles.testButtonWarning}>
             Note: The "Add Coins" button is for testing/development only and should be removed or secured for production releases.
        </Text>


      <Text h3 style={styles.sectionTitle}>General</Text>
      {/* Pass settings.theme which is updated by useFocusEffect */}
      <ThemeSwitch currentTheme={settings.theme} onToggle={onThemeChange} />

      <Text h3 style={styles.sectionTitle}>Daily Goals</Text>
      <View style={styles.inputGroup}>
        {/* Pass settings.dailyGoals which is updated by useFocusEffect & handleGoalChange */}
        <DailyGoalsInput dailyGoals={settings.dailyGoals} onGoalChange={handleGoalChange} />
      </View>

       <Text h3 style={styles.sectionTitle}>Cache Management</Text>
       <View style={styles.buttonGroup}>
            <Button
                title="Refresh Food Icons"
                onPress={handleClearIconCache}
                buttonStyle={[styles.button, { backgroundColor: theme.colors.secondary }]}
                icon={<Icon name="refresh-outline" type="ionicon" color="white" size={20} style={{ marginRight: 8 }} />}
                loading={isClearingCache}
                disabled={isClearingCache}
            />
       </View>


      <Text h3 style={styles.sectionTitle}>Statistics</Text>
      <View style={styles.chartContainer}>
        {/* Statistics and key are updated by updateStatistics */}
        <StatisticsChart statistics={statistics} key={chartUpdateKey} />
      </View>


      <Text h3 style={styles.sectionTitle}>Data Management</Text>
      <View style={styles.buttonGroup}>
        <DataManagementButtons onDataOperation={handleDataOperation} />
      </View>
    </ScrollView>
  );
};

// Styles (adjusted from original)
const useStyles = makeStyles((theme) => ({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  scrollContentContainer: {
     padding: 15,
     paddingBottom: 40,
  },
  sectionTitle: {
    color: theme.colors.text,
    marginTop: 25,
    marginBottom: 15,
    paddingLeft: 5,
    borderLeftWidth: 3,
    borderLeftColor: theme.colors.primary,
  },
  inputGroup: {
     marginBottom: 10,
     paddingHorizontal: 5,
  },
   buttonGroup: {
      marginBottom: 10,
      paddingHorizontal: 5,
   },
  button: {
    marginBottom: 10,
    borderRadius: 8,
  },
  chartContainer: {
    minHeight: 300,
    height: 'auto',
    marginBottom: 20,
  },
  // Styles for Coin Display
  listItem: {
    backgroundColor: theme.colors.background,
    paddingVertical: 15, // Add some padding
  },
  listItemTitle: {
    color: theme.colors.text,
    fontWeight: '500',
  },
  coinValue: {
    color: theme.colors.primary,
    fontWeight: 'bold',
    fontSize: 16,
  },
  testButtonWarning: {
    fontSize: 12,
    color: theme.colors.grey3,
    fontStyle: 'italic',
    textAlign: 'center',
    marginTop: 0,
    marginBottom: 15,
    marginHorizontal: 10,
  },
}));

export default SettingsScreen;
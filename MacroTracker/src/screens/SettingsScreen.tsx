// src/screens/SettingsScreen.tsx
import React, { useState, useEffect, useCallback } from "react";
import { View, ScrollView, Alert, StyleSheet, ActivityIndicator } from "react-native";
import { Text, makeStyles, Button, Icon, useTheme } from "@rneui/themed";
import DailyGoalsInput from "../components/DailyGoalsInput";
import DataManagementButtons from "../components/DataManagementButtons";
import ThemeSwitch from "../components/ThemeSwitch";
import StatisticsChart from "../components/StatisticsChart";
import AccountSettings from "../components/AccountSettings"; // Import extracted component
import { loadSettings, saveSettings, loadDailyEntries } from "../services/storageService";
import { Settings, Statistics, MacroType, MacroData } from "../types/settings";
import { parseISO, isValid } from "date-fns";
import { DailyEntry } from "../types/dailyEntry";
import { useFocusEffect } from "@react-navigation/native";
import { clearIconCache } from "../utils/iconUtils";
import Toast from "react-native-toast-message";
import { getUserStatus, addCoinsToUser, BackendError } from "../services/backendService";

interface SettingsScreenProps {
  onThemeChange: (theme: "light" | "dark" | "system") => void;
  // Prop added by AppNavigator for data reload propagation
  onDataOperation: () => void; // Callback from AppNavigator
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
  // State for user coins (moved to this screen as it manages the AccountSettings component)
  const [userCoins, setUserCoins] = useState<number | null>(null);
  const [isLoadingCoins, setIsLoadingCoins] = useState(false);
  const [isAddingCoins, setIsAddingCoins] = useState(false);

  const { theme } = useTheme();
  const styles = useStyles();

  // --- Statistics Calculation (unchanged) ---
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

  // --- Update Statistics State (unchanged) ---
  const updateStatistics = useCallback(async (currentGoals: { [key in MacroType]: number }) => {
    console.log("SettingsScreen: Updating statistics...");
    try {
        const loadedEntries = await loadDailyEntries(); const updatedStats: Statistics = {
            calories: getStatisticsData(loadedEntries, "calories", currentGoals), protein: getStatisticsData(loadedEntries, "protein", currentGoals),
            carbs: getStatisticsData(loadedEntries, "carbs", currentGoals), fat: getStatisticsData(loadedEntries, "fat", currentGoals), };
        setStatistics(updatedStats); setChartUpdateKey((prevKey) => prevKey + 1); console.log("SettingsScreen: Statistics updated.");
    } catch (error) { console.error("SettingsScreen: Failed to update statistics:", error); }
  }, [getStatisticsData]);

  // --- Fetch User Status (unchanged) ---
  const fetchUserStatus = useCallback(async () => {
    setIsLoadingCoins(true);
    try { console.log("Fetching user status..."); const status = await getUserStatus(); setUserCoins(status.coins); console.log(`User status fetched. Coins: ${status.coins}`); }
    catch (error) { console.error("Failed to fetch user status:", error); setUserCoins(null); Toast.show({ type: 'error', text1: 'Could not load coin balance', text2: error instanceof BackendError ? error.message : 'Check connection.', position: 'bottom', }); }
    finally { setIsLoadingCoins(false); }
  }, []);

  // --- Load Data on Focus (unchanged) ---
  useFocusEffect( useCallback(() => {
      let isActive = true; console.log("SettingsScreen: Focused. Loading data.");
      const loadAndProcessData = async () => { try { const loadedSettings = await loadSettings(); if (!isActive) return; setSettings(loadedSettings); await fetchUserStatus(); updateStatistics(loadedSettings.dailyGoals); } catch (error) { if (isActive) { console.error("Error loading data:", error); Alert.alert("Load Error", "Failed to load settings or stats."); } } };
      loadAndProcessData(); return () => { isActive = false; console.log("SettingsScreen: Unfocused."); };
    }, [updateStatistics, fetchUserStatus])
  );

  // --- Handle Goal Changes (unchanged) ---
  const handleGoalChange = useCallback(async (goalType: MacroType, value: string) => {
    const numericValue = parseFloat(value) || 0; let latestSettings: Settings | null = null;
    setSettings((prevSettings) => { const updatedGoals = { ...prevSettings.dailyGoals, [goalType]: numericValue }; const updatedSettings: Settings = { ...prevSettings, dailyGoals: updatedGoals }; latestSettings = updatedSettings;
      (async () => { if (!latestSettings) return; try { await saveSettings(latestSettings); console.log("Settings saved."); updateStatistics(latestSettings.dailyGoals); } catch (error) { console.error("Failed save/update stats:", error); Alert.alert("Save Error"); } })();
      return updatedSettings; });
  }, [updateStatistics]);

  // --- Handle Data Management Button Trigger (unchanged) ---
  const handleDataOperation = useCallback(async () => {
    console.log("Data operation triggered. Reloading...");
    try { const reloadedSettings = await loadSettings(); setSettings(reloadedSettings); updateStatistics(reloadedSettings.dailyGoals); fetchUserStatus(); onThemeChange(reloadedSettings.theme); Toast.show({ type: 'info', text1: 'Data reloaded.', position: 'bottom'}); }
    catch (error) { console.error("Error reloading data:", error); Alert.alert("Reload Error"); }
  }, [updateStatistics, onThemeChange, fetchUserStatus]);

  // --- Handle Icon Cache Clearing (unchanged) ---
   const handleClearIconCache = useCallback(async () => {
      console.log("Clearing icon cache..."); setIsClearingCache(true);
      try { await clearIconCache(); Toast.show({ type: 'success', text1: 'Icon Cache Cleared', text2: 'Icons will refresh.', position: 'bottom' }); console.log("Icon cache cleared."); }
      catch (error) { console.error("Failed to clear icon cache:", error); Toast.show({ type: 'error', text1: 'Failed to Clear Cache', text2: error instanceof Error ? error.message : 'Unknown error.', position: 'bottom' }); }
      finally { setIsClearingCache(false); }
   }, []);

   // --- Handle Add Coins Button (unchanged) ---
    const handleAddTestCoins = useCallback(async () => {
        setIsAddingCoins(true);
        try { const amount = 10; console.log(`Adding ${amount} coins...`); const updatedStatus = await addCoinsToUser(amount); setUserCoins(updatedStatus.coins); console.log(`Coins added. New balance: ${updatedStatus.coins}`); Toast.show({ type: 'success', text1: `${amount} Coins Added!`, text2: `Balance: ${updatedStatus.coins}`, position: 'bottom' }); }
        catch (error) { console.error("Failed to add coins:", error); Toast.show({ type: 'error', text1: 'Failed to Add Coins', text2: error instanceof BackendError ? error.message : 'Try again.', position: 'bottom' }); }
        finally { setIsAddingCoins(false); }
    }, []);

  // --- Render ---
  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.scrollContentContainer}>
        {/* Account Section using AccountSettings Component */}
        <Text h3 style={styles.sectionTitle}>Account</Text>
        <AccountSettings
             userCoins={userCoins}
             isLoadingCoins={isLoadingCoins}
             isAddingCoins={isAddingCoins}
             onAddTestCoins={handleAddTestCoins}
        />

        {/* General Section (unchanged) */}
        <Text h3 style={styles.sectionTitle}>General</Text>
        <ThemeSwitch currentTheme={settings.theme} onToggle={onThemeChange} />

        {/* Goals Section (unchanged) */}
        <Text h3 style={styles.sectionTitle}>Daily Goals</Text>
        <View style={styles.inputGroup}>
            <DailyGoalsInput dailyGoals={settings.dailyGoals} onGoalChange={handleGoalChange} />
        </View>

        {/* Cache Management Section (unchanged) */}
        <Text h3 style={styles.sectionTitle}>Cache Management</Text>
        <View style={styles.buttonGroup}>
            <Button title="Refresh Food Icons" onPress={handleClearIconCache} buttonStyle={[styles.button, { backgroundColor: theme.colors.secondary }]}
                    icon={<Icon name="refresh-outline" type="ionicon" color="white" size={20} style={{ marginRight: 8 }} />}
                    loading={isClearingCache} disabled={isClearingCache} />
        </View>

        {/* Statistics Section (unchanged) */}
        <Text h3 style={styles.sectionTitle}>Statistics</Text>
        <View style={styles.chartContainer}>
            <StatisticsChart statistics={statistics} key={chartUpdateKey} />
        </View>

        {/* Data Management Section (unchanged) */}
        <Text h3 style={styles.sectionTitle}>Data Management</Text>
        <View style={styles.buttonGroup}>
            <DataManagementButtons onDataOperation={handleDataOperation} />
        </View>
    </ScrollView>
  );
};

// Styles (AccountSettings styles moved)
const useStyles = makeStyles((theme) => ({
  container: { flex: 1, backgroundColor: theme.colors.background, },
  scrollContentContainer: { padding: 15, paddingBottom: 40, },
  sectionTitle: {
    color: theme.colors.text, marginTop: 25, marginBottom: 15, paddingLeft: 5,
    borderLeftWidth: 3, borderLeftColor: theme.colors.primary, },
  inputGroup: { marginBottom: 10, paddingHorizontal: 5, },
  buttonGroup: { marginBottom: 10, paddingHorizontal: 5, },
  button: { marginBottom: 10, borderRadius: 8, },
  chartContainer: { minHeight: 300, height: 'auto', marginBottom: 20, },
}));

export default SettingsScreen;
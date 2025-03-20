import React, { useState, useEffect, useCallback } from 'react';
import { View, Alert, ScrollView } from 'react-native';
import { saveSettings, loadSettings, Settings, clearAllData, loadDailyEntries } from '../services/storageService';
import { Button, ListItem, Text, Switch, Input, makeStyles, useTheme } from '@rneui/themed';
import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from 'expo-file-system';
import { formatDate } from '../utils/dateUtils';
// Import Victory with the type any to bypass type checking
import Victory from 'victory-native';
import ConfirmationModal from '../components/ConfirmationModal';
import { DailyEntry } from '../types/dailyEntry';

// Define a type for the Victory module to suppress errors
type VictoryType = any;
const V: VictoryType = Victory;

const macros = ['calories', 'protein', 'carbs', 'fat'] as const;
type MacroType = (typeof macros)[number];

interface MacroData {
  x: Date;
  y: number;
}

interface Statistics {
  calories: MacroData[];
  protein: MacroData[];
  carbs: MacroData[];
  fat: MacroData[];
}

const SettingsScreen: React.FC = () => {
  const [settings, setSettings] = useState<Settings>({ theme: 'system', dailyGoals: {} });
  const [isConfirmationVisible, setIsConfirmationVisible] = useState(false);
  const [confirmationText, setConfirmationText] = useState('');
  const [statistics, setStatistics] = useState<Statistics>({ calories: [], protein: [], carbs: [], fat: [] });

  const { theme } = useTheme();
  const styles = useStyles();

  const loadInitialSettings = useCallback(async () => {
    const loadedSettings = await loadSettings();
    setSettings(loadedSettings || { theme: 'system', dailyGoals: {} });
  }, []);

  useEffect(() => {
    loadInitialSettings();
  }, [loadInitialSettings]);

  const handleThemeChange = async (newTheme: 'light' | 'dark' | 'system') => {
    const updatedSettings = { ...settings, theme: newTheme };
    setSettings(updatedSettings);
    await saveSettings(updatedSettings);
  };

  const handleGoalChange = async (goalType: MacroType, value: string) => {
    const numericValue = parseFloat(value) || 0;
    const updatedGoals = { ...settings.dailyGoals, [goalType]: numericValue };
    const updatedSettings = { ...settings, dailyGoals: updatedGoals };
    setSettings(updatedSettings);
    await saveSettings(updatedSettings);
  };

  const handleExportData = async () => {
    try {
      const dailyEntries = await loadDailyEntries();
      const csvData = [
        ['Date', 'Food Name', 'Grams', 'Calories', 'Protein', 'Carbs', 'Fat'],
        ...dailyEntries.flatMap(entry =>
          entry.items.map(item => [
            entry.date,
            item.food.name,
            item.grams,
            item.food.calories,
            item.food.protein,
            item.food.carbs,
            item.food.fat
          ])
        )
      ];
      const csvString = csvData.map(row => row.join(',')).join('\n');
      const fileUri = FileSystem.documentDirectory + `macro_data_${formatDate(new Date())}.csv`;
      await FileSystem.writeAsStringAsync(fileUri, csvString, { encoding: FileSystem.EncodingType.UTF8 });
      Alert.alert('Export Successful', `Data exported to ${fileUri}`);
    } catch (error) {
      console.error(error);
      Alert.alert('Export Failed', 'An error occurred while exporting data.');
    }
  };

  const handleImportData = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({ type: '*/*', copyToCacheDirectory: true });
      if (!result.canceled && result.assets?.length > 0) {
        const fileUri = result.assets[0].uri;
        const fileContent = await FileSystem.readAsStringAsync(fileUri, { encoding: FileSystem.EncodingType.UTF8 });
        console.log("Imported File Content:", fileContent);

        const lines = fileContent.trim().split('\n');
        const headers = lines[0].split(',');
        const data = lines.slice(1).map(line => {
          const values = line.split(',');
          return headers.reduce((obj: any, header, index) => {
            obj[header.trim()] = values[index]?.trim();
            return obj;
          }, {});
        });

        console.log("Parsed Data:", data);
        Alert.alert('Import Successful', 'Data imported (parsing complete). Storage implementation pending.');

      } else {
        Alert.alert('Import Failed', 'No file selected');
      }
    } catch (error: any) {
      console.error("Import Error:", error);
      Alert.alert('Import Failed', error.message || 'An unknown error occurred.');
    }
  };

  const handleClearData = async () => setIsConfirmationVisible(true);

  const confirmClearData = async () => {
    if (confirmationText === 'CLEAR DATA') {
      try {
        await clearAllData();
        Alert.alert('Data Cleared', 'All data has been cleared.');
        setConfirmationText('');
        setIsConfirmationVisible(false);
        await loadInitialSettings();
      } catch (error) {
        Alert.alert('Error', 'Failed to clear data.');
      }
    } else {
      Alert.alert('Error', 'Incorrect confirmation text.');
    }
  };

  const getStatisticsData = (dailyEntries: DailyEntry[], macro: MacroType) => {
    return dailyEntries.map(entry => ({
      x: new Date(entry.date),
      y: entry.items.reduce((total, item) => total + ((item.food[macro] / 100) * item.grams), 0)
    })).sort((a, b) => a.x.getTime() - b.x.getTime());
  };

  useEffect(() => {
    const loadStatistics = async () => {
      const loadedEntries = await loadDailyEntries();
      setStatistics({
        calories: getStatisticsData(loadedEntries, 'calories'),
        protein: getStatisticsData(loadedEntries, 'protein'),
        carbs: getStatisticsData(loadedEntries, 'carbs'),
        fat: getStatisticsData(loadedEntries, 'fat')
      });
    };
    loadStatistics();
  }, []);

  return (
    <ScrollView style={styles.container}>
      <Text h3 style={styles.sectionTitle}>General</Text>
      <ListItem bottomDivider>
        <ListItem.Content>
          <ListItem.Title>Dark Mode</ListItem.Title>
        </ListItem.Content>
        <Switch
          value={settings.theme === 'dark'}
          onValueChange={() => handleThemeChange(settings.theme === 'dark' ? 'light' : 'dark')}
        />
      </ListItem>

      <Text h3 style={styles.sectionTitle}>Daily Goals</Text>
      {macros.map(macro => (
        <Input
          key={macro}
          label={`${macro.charAt(0).toUpperCase() + macro.slice(1)} Goal`}
          keyboardType="numeric"
          value={settings.dailyGoals?.[macro]?.toString() || ''}
          onChangeText={(value) => handleGoalChange(macro, value)}
        />
      ))}

      <Text h3 style={styles.sectionTitle}>Statistics</Text>
      {macros.map(macro => (
        <View key={macro}>
          <Text h4 style={{ textAlign: 'center' }}>{macro.charAt(0).toUpperCase() + macro.slice(1)}</Text>
          {/* Use the 'any' typed V variable to bypass type checking */}
          <V.VictoryChart height={200}>
            <V.VictoryAxis 
              tickFormat={(date: any) => formatDate(date)} 
              tickLabelComponent={<V.VictoryLabel angle={-45} textAnchor="end" />} 
            />
            <V.VictoryAxis dependentAxis />
            <V.VictoryLine 
              style={{ data: { stroke: theme.colors.primary } }} 
              data={statistics[macro]} 
            />
          </V.VictoryChart>
        </View>
      ))}

      <Text h3 style={styles.sectionTitle}>Data Management</Text>
      <Button title="Export Data" onPress={handleExportData} buttonStyle={{ marginBottom: 10 }} />
      <Button title="Import Data" onPress={handleImportData} buttonStyle={{ marginBottom: 10 }} />
      <Button title="Clear All Data" onPress={handleClearData} color="error" />

      <ConfirmationModal 
        isVisible={isConfirmationVisible} 
        onCancel={() => setIsConfirmationVisible(false)} 
        onConfirm={confirmClearData} 
        confirmationText={confirmationText} 
        setConfirmationText={setConfirmationText} 
      />
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
    marginBottom: 10 
  } 
}));

export default SettingsScreen;
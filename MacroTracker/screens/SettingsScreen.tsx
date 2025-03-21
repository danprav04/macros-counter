// screens/SettingsScreen.tsx
import React, { useState, useEffect, useCallback } from 'react';
import { View, Alert, ScrollView } from 'react-native';
import {
  saveSettings,
  loadSettings,
  Settings,
  clearAllData,
  loadDailyEntries,
  saveDailyEntries,
} from '../services/storageService';
import { Button, ListItem, Text, Switch, Input, makeStyles, useTheme } from '@rneui/themed';
import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from 'expo-file-system';
import { formatDate } from '../utils/dateUtils';
import ConfirmationModal from '../components/ConfirmationModal';
import { DailyEntry } from '../types/dailyEntry';
import { LineChart, Grid, YAxis, XAxis } from 'react-native-svg-charts';
import { scaleTime } from 'd3-scale';
import { parseISO } from 'date-fns';

const macros = ['calories', 'protein', 'carbs', 'fat'] as const;
type MacroType = (typeof macros)[number];

interface MacroData {
  x: number; // Timestamp
  y: number; // Macro value
}

interface Statistics {
  calories: MacroData[];
  protein: MacroData[];
  carbs: MacroData[];
  fat: MacroData[];
}

interface SettingsScreenProps {
  onThemeChange: (theme: 'light' | 'dark' | 'system') => void;
}

const SettingsScreen: React.FC<SettingsScreenProps> = ({ onThemeChange }) => {
  const [settings, setSettings] = useState<Settings>({
    theme: 'system',
    dailyGoals: {
      calories: 2000,
      protein: 50,
      carbs: 200,
      fat: 70,
    },
  });
  const [isConfirmationVisible, setIsConfirmationVisible] = useState(false);
  const [confirmationText, setConfirmationText] = useState('');
  const [statistics, setStatistics] = useState<Statistics>({
    calories: [],
    protein: [],
    carbs: [],
    fat: [],
  });

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

  const handleGoalChange = (goalType: MacroType, value: string) => {
    const numericValue = parseFloat(value) || 0;
    const updatedGoals = { ...settings.dailyGoals, [goalType]: numericValue };

    setSettings((prevSettings) => {
      const updatedSettings: Settings = { ...prevSettings, dailyGoals: updatedGoals };
      saveSettings(updatedSettings);
      return updatedSettings;
    });
  };

  const handleExportData = async () => {
    try {
      const dailyEntries = await loadDailyEntries();
      const csvData = [
        ['Date', 'Food Name', 'Grams', 'Calories', 'Protein', 'Carbs', 'Fat'],
        ...dailyEntries.flatMap((entry) =>
          entry.items.map((item) => [
            entry.date,
            item.food.name,
            item.grams,
            item.food.calories,
            item.food.protein,
            item.food.carbs,
            item.food.fat,
          ]),
        ),
      ];
      const csvString = csvData.map((row) => row.join(',')).join('\n');
      const fileName = `macro_data_${formatDate(new Date())}.csv`;
      const fileUri = FileSystem.documentDirectory + fileName;

      await FileSystem.writeAsStringAsync(fileUri, csvString, {
        encoding: FileSystem.EncodingType.UTF8,
      });

      const result = await DocumentPicker.getDocumentAsync({
        copyToCacheDirectory: false,
        type: '*/*',
      });

      // Corrected handling:  Check for assets directly
      if (result.assets && result.assets.length > 0) {
        await FileSystem.copyAsync({ from: fileUri, to: result.assets[0].uri });
        Alert.alert('Export Successful', `Data exported to ${result.assets[0].name}`);
      } else {
        // User cancelled or an error occurred
        await FileSystem.deleteAsync(fileUri); // Clean up the temporary file
        if (result.canceled) { //User cancelled explicitly
             //Do nothing, user cancelled
        } else { //Other error
            Alert.alert("Export Failed", "No file was selected.");
        }
      }
    } catch (error: any) {
      console.error(error);
      Alert.alert('Export Failed', error.message || 'An error occurred while exporting data.');
    }
  };


  const handleImportData = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: 'text/csv',
      });

       // Corrected handling: Check for assets directly
      if (result.assets && result.assets.length > 0) {
        const fileContent = await FileSystem.readAsStringAsync(result.assets[0].uri, {
          encoding: FileSystem.EncodingType.UTF8,
        });

        const lines = fileContent.trim().split('\n');
        const headers = lines[0].split(',').map((h) => h.trim());
        const data = lines.slice(1).map((line) => {
          const values = line.split(',').map((v) => v.trim());
          return headers.reduce((obj: any, header, index) => {
            obj[header] = values[index];
            return obj;
          }, {});
        });

        const expectedHeaders = [
          'Date',
          'Food Name',
          'Grams',
          'Calories',
          'Protein',
          'Carbs',
          'Fat',
        ];
        const missingHeaders = expectedHeaders.filter((h) => !headers.includes(h));
        if (missingHeaders.length > 0) {
          Alert.alert('Import Failed', `Missing columns: ${missingHeaders.join(', ')}`);
          return;
        }

        const importedDailyEntries: DailyEntry[] = [];
        data.forEach((row) => {
          let dailyEntry = importedDailyEntries.find((entry) => entry.date === row['Date']);
          if (!dailyEntry) {
            dailyEntry = { date: row['Date'], items: [] };
            importedDailyEntries.push(dailyEntry);
          }

          dailyEntry.items.push({
            food: {
              id: '',
              name: row['Food Name'],
              calories: parseFloat(row['Calories']) || 0,
              protein: parseFloat(row['Protein']) || 0,
              carbs: parseFloat(row['Carbs']) || 0,
              fat: parseFloat(row['Fat']) || 0,
            },
            grams: parseFloat(row['Grams']) || 0,
          });
        });

        await saveDailyEntries(importedDailyEntries);
        Alert.alert('Import Successful', 'Data imported and saved.');
      }  else { //Explicitly check for cancelled
          if (result.canceled) { //User cancelled
              //do nothing
          } else {
              Alert.alert('Import Failed', 'Invalid file selected.');
          }
      }
    } catch (error: any) {
      console.error('Import Error:', error);
      Alert.alert('Import Failed', error.message || 'An unknown error occurred.');
    }
  };

  const handleClearData = () => setIsConfirmationVisible(true);

  const confirmClearData = async () => {
    if (confirmationText === 'CLEAR DATA') {
      try {
        await clearAllData();
        Alert.alert('Data Cleared', 'All data has been cleared.');
        setConfirmationText('');
        setIsConfirmationVisible(false);
        await loadInitialSettings();
        setStatistics({
          calories: [],
          protein: [],
          carbs: [],
          fat: [],
        });
      } catch (error) {
        Alert.alert('Error', 'Failed to clear data.');
      }
    } else {
      Alert.alert('Error', 'Incorrect confirmation text.');
    }
  };

  const getStatisticsData = (dailyEntries: DailyEntry[], macro: MacroType) => {
    return dailyEntries
      .map((entry) => ({
        x: parseISO(entry.date).getTime(),
        y: entry.items.reduce(
          (total, item) => total + (item.food[macro] / 100) * item.grams,
          0,
        ),
      }))
      .sort((a, b) => a.x - b.x);
  };

  useEffect(() => {
    const loadStatistics = async () => {
      const loadedEntries = await loadDailyEntries();
      setStatistics({
        calories: getStatisticsData(loadedEntries, 'calories'),
        protein: getStatisticsData(loadedEntries, 'protein'),
        carbs: getStatisticsData(loadedEntries, 'carbs'),
        fat: getStatisticsData(loadedEntries, 'fat'),
      });
    };
    loadStatistics();
  }, []);

  return (
    <ScrollView style={styles.container}>
      <Text h3 style={[styles.sectionTitle, { color: theme.colors.text }]}>General</Text>
      <ListItem bottomDivider containerStyle={{ backgroundColor: theme.colors.background }}>
        <ListItem.Content>
          <ListItem.Title style={{ color: theme.colors.text }}>Dark Mode</ListItem.Title>
        </ListItem.Content>
        <Switch
          value={settings.theme === 'dark'}
          onValueChange={() => onThemeChange(settings.theme === 'dark' ? 'light' : 'dark')}
        />
      </ListItem>

      <Text h3 style={[styles.sectionTitle, { color: theme.colors.text }]}>Daily Goals</Text>
      {macros.map((macro) => (
        <Input
          key={macro}
          label={`${macro.charAt(0).toUpperCase() + macro.slice(1)} Goal`}
          keyboardType="numeric"
          value={settings.dailyGoals?.[macro]?.toString() || ''}
          onChangeText={(value) => handleGoalChange(macro, value)}
          style={{ color: theme.colors.text }}
          inputContainerStyle={{ borderBottomColor: theme.colors.text }}
          labelStyle={{ color: theme.colors.text }}
        />
      ))}

      <Text h3 style={[styles.sectionTitle, { color: theme.colors.text }]}>Statistics</Text>
      {macros.map((macro) => {
        const data = statistics[macro];
        const dates = data.map((item) => item.x);
        const values = data.map((item) => item.y);

        const xDomain = [Number(Math.min(...dates)), Number(Math.max(...dates))];

        return (
          <View key={macro} style={styles.chartContainer}>
            <Text h4 style={[styles.chartTitle, { color: theme.colors.text }]}>
              {macro.charAt(0).toUpperCase() + macro.slice(1)}
            </Text>
            <View style={styles.chart}>
              <YAxis
                data={values}
                contentInset={styles.chartInset}
                svg={{
                  fill: theme.colors.text,
                  fontSize: 10,
                }}
                numberOfTicks={10}
                formatLabel={(value: number) => `${value}`}
              />
              <View style={styles.lineChartContainer}>
                <LineChart
                  style={styles.lineChart}
                  data={values}
                  gridMin={Math.min(...values)}
                  gridMax={Math.max(...values)}
                  contentInset={styles.chartInset}
                  svg={{ stroke: theme.colors.primary }}
                >
                  <Grid />
                </LineChart>
                <XAxis
                  style={styles.xAxis}
                  data={data}
                  scale={scaleTime}
                  formatLabel={(value: number) => formatDate(new Date(value))}
                  contentInset={{ left: 10, right: 10 }}
                  svg={{
                    fontSize: 10,
                    fill: theme.colors.text,
                    rotation: -45,
                    originY: 30,
                    y: 5,
                  }}
                />
              </View>
            </View>
          </View>
        );
      })}

      <Text h3 style={[styles.sectionTitle, { color: theme.colors.text }]}>Data Management</Text>
      <Button
        title="Export Data"
        onPress={handleExportData}
        buttonStyle={[styles.button, { backgroundColor: theme.colors.primary }]}
      />
      <Button
        title="Import Data"
        onPress={handleImportData}
        buttonStyle={[styles.button, { backgroundColor: theme.colors.primary }]}
      />
      <Button title="Clear All Data" onPress={handleClearData} color="error" buttonStyle={styles.button} />

      <ConfirmationModal
        isVisible={isConfirmationVisible}
        onCancel={() => setIsConfirmationVisible(false)}
        onConfirm={confirmClearData}
        confirmationText={confirmationText}
        setConfirmationText={setConfirmationText}
        title="Clear All Data?"
        message="This action cannot be undone. Are you absolutely sure?"
      />
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
  chartContainer: {
    marginBottom: 20,
  },
  chartTitle: {
    textAlign: 'center',
    marginBottom: 10,
  },
  chart: {
    height: 200,
    flexDirection: 'row',
  },
  chartInset: {
    top: 20,
    bottom: 20,
  },
  lineChartContainer: {
    flex: 1,
    marginLeft: 10,
  },
  lineChart: {
    flex: 1,
  },
  xAxis: {
    marginHorizontal: -10,
    height: 30,
  },
  button: {
    marginBottom: 10,
  },
}));

export default SettingsScreen;
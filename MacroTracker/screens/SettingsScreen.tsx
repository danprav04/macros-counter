// screens/SettingsScreen.tsx
import React, { useState, useEffect, useCallback } from 'react';
import { View, Alert, ScrollView, StyleSheet } from 'react-native';
import { saveSettings, loadSettings, Settings, clearAllData } from '../services/storageService';
import { Button, ListItem, Text, Switch, Input, makeStyles, useTheme, Overlay } from '@rneui/themed';
import { loadDailyEntries } from '../services/storageService';
import { DailyEntry } from '../types/dailyEntry';
import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from 'expo-file-system';
import { formatDate } from '../utils/dateUtils';
import { VictoryChart, VictoryLine, VictoryTheme, VictoryAxis, VictoryLabel } from "victory-native";
import ConfirmationModal from '../components/ConfirmationModal';

const SettingsScreen: React.FC = () => {
  const [settings, setSettings] = useState<Settings>({ theme: 'system' });
    const [isConfirmationVisible, setIsConfirmationVisible] = useState(false);
    const [confirmationText, setConfirmationText] = useState('');

    const { theme } = useTheme();
    const styles = useStyles();


    const loadInitialSettings = useCallback(async () => {
        const loadedSettings = await loadSettings();
        setSettings(loadedSettings);
    }, []);

  useEffect(() => {
    loadInitialSettings();
  }, [loadInitialSettings]);

  const handleThemeChange = async (newTheme: 'light' | 'dark' | 'system') => {
    const updatedSettings = { ...settings, theme: newTheme };
    setSettings(updatedSettings);
    await saveSettings(updatedSettings);
  };

    const handleGoalChange = async (goalType: keyof Settings['dailyGoals'], value: string) => {
        const numericValue = parseFloat(value) || 0;
        const updatedGoals = { ...settings.dailyGoals, [goalType]: numericValue };
        const updatedSettings = { ...settings, dailyGoals: updatedGoals };
        setSettings(updatedSettings);
        await saveSettings(updatedSettings);
    };

  const handleExportData = async () => {
    try {
      const dailyEntries = await loadDailyEntries();
      // Format data for CSV (example format)
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
          ])
        ),
      ];

      const csvString = csvData.map((row) => row.join(',')).join('\n');

      const fileName = `macro_data_${formatDate(new Date())}.csv`;
      const fileUri = FileSystem.documentDirectory + fileName;

      await FileSystem.writeAsStringAsync(fileUri, csvString, {
        encoding: FileSystem.EncodingType.UTF8,
      });

      Alert.alert('Export Successful', `Data exported to ${fileUri}`);
    } catch (error) {
      console.error(error);
      Alert.alert('Export Failed', 'An error occurred while exporting data.');
    }
  };

  const handleImportData = async () => {
    try {
        const result = await DocumentPicker.getDocumentAsync({
            type: '*/*', // Allow all file types for now; refine as needed
            copyToCacheDirectory: true,
        });

        if (result.type === 'success' && result.uri) {
            const fileContent = await FileSystem.readAsStringAsync(result.uri, {
                encoding: FileSystem.EncodingType.UTF8
            });

            // Assuming CSV format (adjust parsing as needed)
            const rows = fileContent.trim().split('\n');
            const header = rows[0].split(','); // Simple header check
            if (header.length < 7) { // Very basic validation
                Alert.alert('Import Failed', 'Invalid file format.');
                return;
            }

            const importedData: DailyEntry[] = [];
            // Very basic parsing.  Needs robust error handling in a real app.
            for (let i = 1; i < rows.length; i++) {
                const rowData = rows[i].split(',');
                const date = rowData[0];
                const foodName = rowData[1];
                const grams = parseFloat(rowData[2]);
                const calories = parseFloat(rowData[3]);
                const protein = parseFloat(rowData[4]);
                const carbs = parseFloat(rowData[5]);
                const fat = parseFloat(rowData[6]);

                // Find existing entry for the date
                let entry = importedData.find(e => e.date === date);
                if (!entry) {
                    entry = { date, items: [] };
                    importedData.push(entry);
                }

                entry.items.push({
                    food: { id: `imported-${i}`, name: foodName, calories, protein, carbs, fat },
                    grams
                });
            }


            // Now, save the imported data.  This overwrites existing data!
            await saveDailyEntries(importedData);
            Alert.alert('Import Successful', 'Data imported successfully.');
        } else if (result.type === 'cancel') {
            // User cancelled, do nothing
        } else {
            Alert.alert('Import Failed', 'Could not read the selected file.');
        }
    } catch (error: any) {
        console.error("Import Error:", error);
        Alert.alert('Import Failed', error.message || 'An unknown error occurred.');
    }
};

    const handleClearData = async () => {
        setIsConfirmationVisible(true);
    };

    const confirmClearData = async () => {
        if (confirmationText === 'CLEAR DATA') {
            try {
                await clearAllData();
                Alert.alert('Data Cleared', 'All data has been cleared.');
                setConfirmationText('');
                setIsConfirmationVisible(false)
                await loadInitialSettings();

            } catch (error) {
                Alert.alert('Error', 'Failed to clear data.');
            }
        } else {
            Alert.alert('Error', 'Incorrect confirmation text.');
        }
    };

    const getStatisticsData = (dailyEntries: DailyEntry[], macro: 'calories' | 'protein' | 'carbs' | 'fat') => {
      return dailyEntries.map(entry => {
          let totalMacro = 0;
          entry.items.forEach(item => {
              totalMacro += (item.food[macro] / 100) * item.grams;
          });
          return {
              x: new Date(entry.date), // Convert date string to Date object
              y: totalMacro
          };
      }).sort((a, b) => a.x.getTime() - b.x.getTime()); // Sort by date
    };

    const [statistics, setStatistics] = useState<{calories: any[], protein: any[], carbs: any[], fat: any[]}>({calories: [], protein: [], carbs: [], fat: []});

    useEffect(() => {
        const loadStatistics = async () => {
            const loadedEntries = await loadDailyEntries();
            setStatistics({
                calories: getStatisticsData(loadedEntries, 'calories'),
                protein: getStatisticsData(loadedEntries, 'protein'),
                carbs: getStatisticsData(loadedEntries, 'carbs'),
                fat: getStatisticsData(loadedEntries, 'fat')
            });
        }
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
        <Input
            label="Calories Goal"
            keyboardType="numeric"
            value={settings.dailyGoals?.calories?.toString() || ''}
            onChangeText={(value) => handleGoalChange('calories', value)}
        />
        <Input
            label="Protein Goal (g)"
            keyboardType="numeric"
            value={settings.dailyGoals?.protein?.toString() || ''}
            onChangeText={(value) => handleGoalChange('protein', value)}
        />
        <Input
            label="Carbs Goal (g)"
            keyboardType="numeric"
            value={settings.dailyGoals?.carbs?.toString() || ''}
            onChangeText={(value) => handleGoalChange('carbs', value)}
        />
        <Input
            label="Fat Goal (g)"
            keyboardType="numeric"
            value={settings.dailyGoals?.fat?.toString() || ''}
            onChangeText={(value) => handleGoalChange('fat', value)}
        />
        <Text h3 style={styles.sectionTitle}>Statistics</Text>
        {['calories', 'protein', 'carbs', 'fat'].map((macro) => (
            <View key={macro}>
                <Text h4 style={{textAlign: 'center'}}>{macro.charAt(0).toUpperCase() + macro.slice(1)}</Text>
                <VictoryChart
                    theme={VictoryTheme.material}
                    height={200}
                >
                    <VictoryAxis
                        tickFormat={(date) => {
                            if (date instanceof Date) {
                                return formatDate(date)
                            }
                            return date;

                        }
                    }
                        tickLabelComponent={<VictoryLabel angle={-45} textAnchor="end" />}
                    />
                    <VictoryAxis dependentAxis />

                    <VictoryLine
                        style={{
                            data: { stroke: theme.colors.primary },

                        }}
                        data={statistics[macro as keyof typeof statistics]}
                    />
                </VictoryChart>
            </View>
        ))}

      <Text h3 style={styles.sectionTitle}>Data Management</Text>
      <Button title="Export Data" onPress={handleExportData} buttonStyle={{marginBottom: 10}}/>
      <Button title="Import Data" onPress={handleImportData} buttonStyle={{marginBottom: 10}}/>
      <Button title="Clear All Data" onPress={handleClearData} color="error" />

        <ConfirmationModal
            isVisible={isConfirmationVisible}
            onCancel={() => {setIsConfirmationVisible(false); setConfirmationText('')}}
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
        backgroundColor: theme.colors.background,

    },
    sectionTitle: {
        marginTop: 20,
        marginBottom: 10,
    },
}));

export default SettingsScreen;
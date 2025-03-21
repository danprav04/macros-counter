// screens/SettingsScreen.tsx
import React, { useState, useEffect, useCallback } from "react";
import { View, Alert, ScrollView } from "react-native";
import {
  saveSettings,
  loadSettings,
  Settings,
  clearAllData,
  loadDailyEntries,
  saveDailyEntries,
} from "../services/storageService";
import {
  Button,
  ListItem,
  Text,
  Switch,
  Input,
  makeStyles,
  useTheme,
} from "@rneui/themed";
import * as DocumentPicker from "expo-document-picker";
import * as FileSystem from "expo-file-system";
import { formatDate } from "../utils/dateUtils";
import ConfirmationModal from "../components/ConfirmationModal";
import { DailyEntry } from "../types/dailyEntry";
import { WebView } from "react-native-webview";
import { parseISO } from "date-fns";

const macros = ["calories", "protein", "carbs", "fat"] as const;
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
  onThemeChange: (theme: "light" | "dark" | "system") => void;
}

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
  const [isConfirmationVisible, setIsConfirmationVisible] = useState(false);
  const [confirmationText, setConfirmationText] = useState("");
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
      const updatedSettings: Settings = {
        ...prevSettings,
        dailyGoals: updatedGoals,
      };
      saveSettings(updatedSettings);
      return updatedSettings;
    });
  };

  const handleExportData = async () => {
    try {
      const dailyEntries = await loadDailyEntries();
      const csvData = [
        ["Date", "Food Name", "Grams", "Calories", "Protein", "Carbs", "Fat"],
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
      const csvString = csvData.map((row) => row.join(",")).join("\n");
      const fileName = `macro_data_${formatDate(new Date())}.csv`;
      const fileUri = FileSystem.documentDirectory + fileName;

      await FileSystem.writeAsStringAsync(fileUri, csvString, {
        encoding: FileSystem.EncodingType.UTF8,
      });

      const result = await DocumentPicker.getDocumentAsync({
        copyToCacheDirectory: false,
        type: "*/*",
      });

      // Corrected handling:  Check for assets directly
      if (result.assets && result.assets.length > 0) {
        await FileSystem.copyAsync({
          from: fileUri,
          to: result.assets[0].uri,
        });
        Alert.alert(
          "Export Successful",
          `Data exported to ${result.assets[0].name}`
        );
      } else {
        // User cancelled or an error occurred
        await FileSystem.deleteAsync(fileUri); // Clean up the temporary file
        if (result.canceled) {
          //User cancelled explicitly
          //Do nothing, user cancelled
        } else {
          //Other error
          Alert.alert("Export Failed", "No file was selected.");
        }
      }
    } catch (error: any) {
      console.error(error);
      Alert.alert(
        "Export Failed",
        error.message || "An error occurred while exporting data."
      );
    }
  };

  const handleImportData = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: "text/csv",
      });

      // Corrected handling: Check for assets directly
      if (result.assets && result.assets.length > 0) {
        const fileContent = await FileSystem.readAsStringAsync(
          result.assets[0].uri,
          {
            encoding: FileSystem.EncodingType.UTF8,
          }
        );

        const lines = fileContent.trim().split("\n");
        const headers = lines[0].split(",").map((h) => h.trim());
        const data = lines.slice(1).map((line) => {
          const values = line.split(",").map((v) => v.trim());
          return headers.reduce((obj: any, header, index) => {
            obj[header] = values[index];
            return obj;
          }, {});
        });

        const expectedHeaders = [
          "Date",
          "Food Name",
          "Grams",
          "Calories",
          "Protein",
          "Carbs",
          "Fat",
        ];
        const missingHeaders = expectedHeaders.filter(
          (h) => !headers.includes(h)
        );
        if (missingHeaders.length > 0) {
          Alert.alert(
            "Import Failed",
            `Missing columns: ${missingHeaders.join(", ")}`
          );
          return;
        }

        const importedDailyEntries: DailyEntry[] = [];
        data.forEach((row) => {
          let dailyEntry = importedDailyEntries.find(
            (entry) => entry.date === row["Date"]
          );
          if (!dailyEntry) {
            dailyEntry = { date: row["Date"], items: [] };
            importedDailyEntries.push(dailyEntry);
          }

          dailyEntry.items.push({
            food: {
              id: "",
              name: row["Food Name"],
              calories: parseFloat(row["Calories"]) || 0,
              protein: parseFloat(row["Protein"]) || 0,
              carbs: parseFloat(row["Carbs"]) || 0,
              fat: parseFloat(row["Fat"]) || 0,
            },
            grams: parseFloat(row["Grams"]) || 0,
          });
        });

        await saveDailyEntries(importedDailyEntries);
        Alert.alert("Import Successful", "Data imported and saved.");
      } else {
        //Explicitly check for cancelled
        if (result.canceled) {
          //User cancelled
          //do nothing
        } else {
          Alert.alert("Import Failed", "Invalid file selected.");
        }
      }
    } catch (error: any) {
      console.error("Import Error:", error);
      Alert.alert(
        "Import Failed",
        error.message || "An unknown error occurred."
      );
    }
  };

  const handleClearData = () => setIsConfirmationVisible(true);

  const confirmClearData = async () => {
    if (confirmationText === "CLEAR DATA") {
      try {
        await clearAllData();
        Alert.alert("Data Cleared", "All data has been cleared.");
        setConfirmationText("");
        setIsConfirmationVisible(false);
        await loadInitialSettings(); // Reload settings to clear input fields
        setStatistics({
          // Reset statistics
          calories: [],
          protein: [],
          carbs: [],
          fat: [],
        });
      } catch (error) {
        Alert.alert("Error", "Failed to clear data.");
      }
    } else {
      Alert.alert("Error", "Incorrect confirmation text.");
    }
  };
  const getStatisticsData = (dailyEntries: DailyEntry[], macro: MacroType) => {
    return dailyEntries
      .map((entry) => ({
        x: parseISO(entry.date).getTime(), // Convert date to timestamp
        y: entry.items.reduce(
          (total, item) => total + (item.food[macro] / 100) * item.grams,
          0
        ),
      }))
      .sort((a, b) => a.x - b.x);
  };

  useEffect(() => {
    const loadStatistics = async () => {
      const loadedEntries = await loadDailyEntries();
      setStatistics({
        calories: getStatisticsData(loadedEntries, "calories"),
        protein: getStatisticsData(loadedEntries, "protein"),
        carbs: getStatisticsData(loadedEntries, "carbs"),
        fat: getStatisticsData(loadedEntries, "fat"),
      });
    };
    loadStatistics();
  }, []);

  const generateChartHTML = () => {
    const chartData = macros.reduce((acc, macro) => {
      acc[macro] = statistics[macro].map((item) => [item.x / 1000, item.y]); // uPlot expects seconds
      return acc;
    }, {} as { [key in MacroType]: number[][] });

    const textColor = theme.colors.text;
    const gridColor = theme.colors.grey5; // Lighter grid
    const axisColor = theme.colors.grey3; // Slightly darker axis
    const fontFamily = "Helvetica, Arial, sans-serif";

    // Define color palette for the lines, using theme colors if possible
    const lineColors = {
      calories: theme.colors.primary,
      protein: theme.colors.success,
      carbs: theme.colors.warning,
      fat: theme.colors.error,
    };

    return `
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="utf-8">
        <title>Macro Charts</title>
        <style>
            body { font-family: ${fontFamily}; margin: 0; padding: 0; background-color: ${
      theme.colors.background
    }; }
            .chart-container { width: 95%; height: 250px; margin: 10px auto; }
        </style>
        <link rel="stylesheet" href="https://unpkg.com/uplot@1.6.27/dist/uPlot.min.css">
        <script src="https://unpkg.com/uplot@1.6.27/dist/uPlot.iife.min.js"></script>
    </head>
    <body>
        ${macros
          .map(
            (macro) => `
            <div id="${macro}-chart" class="chart-container"></div>
            <script>
                const data = ${JSON.stringify(chartData[macro])};
                const opts = {
                    title: "${
                      macro.charAt(0).toUpperCase() + macro.slice(1)
                    }",
                    width: window.innerWidth * 0.95,
                    height: 250,
                    scales: {
                        x: { time: true },
                        y: { },
                    },
                    axes: [
                        {
                            stroke: "${axisColor}",
                            font: "12px ${fontFamily}",
                            grid: {
                                stroke: "${gridColor}",
                                width: 1
                            },
                            ticks: {
                                stroke: "${gridColor}",
                                width: 1
                            }
                        },
                        {
                            stroke: "${axisColor}",
                            font: "12px ${fontFamily}",
                            grid: {
                                stroke: "${gridColor}",
                                width: 1
                            },
                            ticks: {
                                stroke: "${gridColor}",
                                width: 1
                            }
                        }
                    ],
                    series: [
                        {},
                        {
                            stroke: "${lineColors[macro] || theme.colors.primary}",
                            width: 2,
                            label: "${
                              macro.charAt(0).toUpperCase() + macro.slice(1)
                            }",
                             points: {
                                show: false, // Hide points by default
                            }
                        },
                    ],
                    cursor: {
                        drag: {
                            setScale: false,
                        },
                         points: {
                                size: 6,  // Normal point size
                                fill: (self, i) => self.series[i]._stroke,
                                stroke: (self, i) => self.series[i]._stroke,
                         },
                    }

                };
                new uPlot(opts, [data.map(d => d[0]), data.map(d => d[1])], document.getElementById('${macro}-chart'));
            </script>
        `
          )
          .join("")}
    </body>
    </html>
            `;
  };

  return (
    <ScrollView style={styles.container}>
      <Text h3 style={[styles.sectionTitle, { color: theme.colors.text }]}>
        General
      </Text>
      <ListItem
        bottomDivider
        containerStyle={{ backgroundColor: theme.colors.background }}
      >
        <ListItem.Content>
          <ListItem.Title style={{ color: theme.colors.text }}>
            Dark Mode
          </ListItem.Title>
        </ListItem.Content>
        <Switch
          value={settings.theme === "dark"}
          onValueChange={() =>
            onThemeChange(settings.theme === "dark" ? "light" : "dark")
          }
        />
      </ListItem>

      <Text h3 style={[styles.sectionTitle, { color: theme.colors.text }]}>
        Daily Goals
      </Text>
      {macros.map((macro) => (
        <Input
          key={macro}
          label={`${macro.charAt(0).toUpperCase() + macro.slice(1)} Goal`}
          keyboardType="numeric"
          value={settings.dailyGoals?.[macro]?.toString() || ""}
          onChangeText={(value) => handleGoalChange(macro, value)}
          style={{ color: theme.colors.text }}
          inputContainerStyle={{ borderBottomColor: theme.colors.text }}
          labelStyle={{ color: theme.colors.text }}
        />
      ))}

      <Text h3 style={[styles.sectionTitle, { color: theme.colors.text }]}>
        Statistics
      </Text>
      <View style={styles.webViewContainer}>
        <WebView
          originWhitelist={["*"]}
          source={{ html: generateChartHTML() }}
          style={styles.webView}
          scalesPageToFit={false}
          scrollEnabled={false}
        />
      </View>

      <Text h3 style={[styles.sectionTitle, { color: theme.colors.text }]}>
        Data Management
      </Text>
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
      <Button
        title="Clear All Data"
        onPress={handleClearData}
        color="error"
        buttonStyle={styles.button}
      />

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
  webViewContainer: {
    height: 250 * macros.length + 50, // Adjust height based on number of charts + some padding
    width: "100%",
    marginTop: 10,
  },
  webView: {
    flex: 1,
  },
  button: {
    marginBottom: 10,
  },
}));

export default SettingsScreen;
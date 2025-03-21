// components/DataManagementButtons.tsx
import React, { useState } from "react";
import { Alert, Platform } from "react-native"; // Import Platform
import { Button } from "@rneui/themed";
import * as DocumentPicker from "expo-document-picker";
import * as FileSystem from "expo-file-system";
import * as Sharing from 'expo-sharing'; // Import Sharing
import { formatDate } from "../utils/dateUtils";
import {
  clearAllData,
  loadDailyEntries,
  saveDailyEntries,
} from "../services/storageService";
import ConfirmationModal from "./ConfirmationModal";
import { DailyEntry } from "../types/dailyEntry";
import { useTheme } from "@rneui/themed";

interface DataManagementButtonsProps {
  onDataCleared: () => Promise<void>;
}

const DataManagementButtons: React.FC<DataManagementButtonsProps> = ({
  onDataCleared,
}) => {
  const [isConfirmationVisible, setIsConfirmationVisible] = useState(false);
  const [confirmationText, setConfirmationText] = useState("");
  const { theme } = useTheme();

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
      const formattedDate = formatDate(new Date()).replace(/\//g, '-'); // Replace slashes
      const fileName = `macro_data_${formattedDate}.csv`;
      const fileUri = FileSystem.documentDirectory + fileName;

      await FileSystem.writeAsStringAsync(fileUri, csvString, {
        encoding: FileSystem.EncodingType.UTF8,
      });

      // Use expo-sharing to share the file
      if (!(await Sharing.isAvailableAsync())) {
        Alert.alert('Sharing is not available on your platform');
        return;
      }

      await Sharing.shareAsync(fileUri);

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
        type: [
          "text/csv",
          "application/csv",
          "text/comma-separated-values",
          "application/vnd.ms-excel",
        ],
      });

      // Corrected handling: Check for assets directly
      if (result.assets && result.assets.length > 0) {
        const file = result.assets[0];

        // Check file extension
        if (!file.name?.toLowerCase().endsWith(".csv")) {
          Alert.alert("Invalid File", "Please select a CSV file.");
          return;
        }

        const fileContent = await FileSystem.readAsStringAsync(file.uri, {
          encoding: FileSystem.EncodingType.UTF8,
        });

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
        // Explicitly check for cancelled
        if (result.canceled) {
          // User cancelled, do nothing
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
        await onDataCleared(); // Call the callback
      } catch (error) {
        Alert.alert("Error", "Failed to clear data.");
      } finally {
        setConfirmationText("");
        setIsConfirmationVisible(false);
      }
    } else {
      Alert.alert("Error", "Incorrect confirmation text.");
    }
  };

  return (
    <>
      <Button
        title="Export Data"
        onPress={handleExportData}
        buttonStyle={{ marginBottom: 10, backgroundColor: theme.colors.primary }}
      />
      <Button
        title="Import Data"
        onPress={handleImportData}
        buttonStyle={{ marginBottom: 10, backgroundColor: theme.colors.primary }}
      />
      <Button
        title="Clear All Data"
        onPress={handleClearData}
        color="error"
        buttonStyle={{ marginBottom: 10 }}
      />

      <ConfirmationModal
        isVisible={isConfirmationVisible}
        onCancel={() => setIsConfirmationVisible(false)}
        onConfirm={confirmClearData}
        confirmationText={confirmationText}
        setConfirmationText={setConfirmationText}
        title="Clear All Data?"
        message="This action cannot be undone. Confirmation Text: CLEAR DATA"
      />
    </>
  );
};

export default DataManagementButtons;
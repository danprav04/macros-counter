// components/DataManagementButtons.tsx (Modified callback)

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
  loadFoods,
  saveFoods,
  loadSettings,
  saveSettings
} from "../services/storageService";
import ConfirmationModal from "./ConfirmationModal";
import { DailyEntry } from "../types/dailyEntry";
import { Food } from "../types/food";
import { Settings } from "../types/settings";
import { useTheme } from "@rneui/themed";


interface DataManagementButtonsProps {
  onDataOperation: () => void; // Changed prop name
}

const DataManagementButtons: React.FC<DataManagementButtonsProps> = ({
    onDataOperation
}) => {
  const [isConfirmationVisible, setIsConfirmationVisible] = useState(false);
  const [confirmationText, setConfirmationText] = useState("");
  const { theme } = useTheme();

  const handleExportData = async () => {
    try {
      const dailyEntries = await loadDailyEntries();
      const foods = await loadFoods();
      const settings = await loadSettings();

      const exportData = {
        dailyEntries,
        foods,
        settings
      };

      const exportDataString = JSON.stringify(exportData);
      const formattedDate = formatDate(new Date()).replace(/\//g, '-'); // Replace slashes
      const fileName = `macro_data_${formattedDate}.json`;
      const fileUri = FileSystem.documentDirectory + fileName;

      await FileSystem.writeAsStringAsync(fileUri, exportDataString, {
        encoding: FileSystem.EncodingType.UTF8,
      });

      // Use expo-sharing to share the file
      if (!(await Sharing.isAvailableAsync())) {
        Alert.alert('Sharing is not available on your platform');
        return;
      }

      await Sharing.shareAsync(fileUri);
      onDataOperation(); // Trigger reload after export

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
        type: ["application/json"], // Only accept JSON files
      });

      if (result.assets && result.assets.length > 0) {
        const file = result.assets[0];

        // Check file extension
        if (!file.name?.toLowerCase().endsWith(".json")) {
          Alert.alert("Invalid File", "Please select a JSON file.");
          return;
        }

        const fileContent = await FileSystem.readAsStringAsync(file.uri, {
          encoding: FileSystem.EncodingType.UTF8,
        });


        try {
          const importedData = JSON.parse(fileContent);

          // Basic structure validation:
          if (
            !importedData.hasOwnProperty("dailyEntries") ||
            !importedData.hasOwnProperty("foods") ||
            !importedData.hasOwnProperty("settings")
          ) {
            Alert.alert(
              "Import Failed",
              "The imported file is missing required data (dailyEntries, foods, or settings)."
            );
            return;
          }


          await saveDailyEntries(importedData.dailyEntries);
          await saveFoods(importedData.foods);
          await saveSettings(importedData.settings)
          Alert.alert("Import Successful", "Data imported and saved.");
          onDataOperation(); //trigger reload

        } catch (parseError) {
          Alert.alert(
            "Import Failed",
            "The imported file is not valid JSON."
          );
          return;
        }


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
        onDataOperation(); // Trigger reload after clearing
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
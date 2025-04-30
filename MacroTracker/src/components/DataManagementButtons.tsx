// src/components/DataManagementButtons.tsx
import React, { useState } from "react";
import { Alert, Platform } from "react-native"; // Import Platform
import { Button, Icon } from "@rneui/themed";
import * as DocumentPicker from "expo-document-picker";
import * as FileSystem from "expo-file-system";
import * as Sharing from 'expo-sharing'; // Import Sharing
import { formatDateISO } from "../utils/dateUtils"; // CORRECTED IMPORT
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
  onDataOperation: () => void; // Callback to signal data changes
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

      const exportDataString = JSON.stringify(exportData, null, 2); // Pretty print JSON
      // Use the correct formatting function and remove unnecessary replace
      const formattedDate = formatDateISO(new Date());
      const fileName = `macro_data_${formattedDate}.json`;
      const fileUri = FileSystem.documentDirectory + fileName;

      await FileSystem.writeAsStringAsync(fileUri, exportDataString, {
        encoding: FileSystem.EncodingType.UTF8,
      });

      // Use expo-sharing to share the file
      if (!(await Sharing.isAvailableAsync())) {
        Alert.alert('Sharing Error', 'Sharing is not available on your platform.');
        return;
      }

      await Sharing.shareAsync(fileUri, {
          mimeType: 'application/json',
          dialogTitle: 'Export Macro Data',
          UTI: 'public.json' // For iOS
      });
      // No need to call onDataOperation on export, as data didn't change locally

    } catch (error: any) {
      console.error("Export Error:", error);
      Alert.alert(
        "Export Failed",
        error.message || "An error occurred while exporting data."
      );
    }
  };

  const handleImportData = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: ["application/json", "public.json"], // Accept JSON files, public.json for iOS compatibility
        copyToCacheDirectory: true // Recommended for reliability
      });

      if (result.canceled) {
          console.log("Import cancelled by user.");
          return; // User cancelled, do nothing
      }

      if (result.assets && result.assets.length > 0) {
        const file = result.assets[0];

        // Check file extension more robustly
        if (!file.name?.toLowerCase().endsWith(".json")) {
          Alert.alert("Invalid File Type", "Please select a valid '.json' file.");
          return;
        }

        // Check file size (optional, but good practice)
        if (file.size && file.size > 10 * 1024 * 1024) { // Example: 10MB limit
            Alert.alert("File Too Large", "The selected file is too large (max 10MB).");
            return;
        }

        const fileContent = await FileSystem.readAsStringAsync(file.uri, {
          encoding: FileSystem.EncodingType.UTF8,
        });

        try {
          const importedData = JSON.parse(fileContent);

          // Basic structure validation:
          if (
            typeof importedData !== 'object' || importedData === null ||
            !importedData.hasOwnProperty("dailyEntries") || !Array.isArray(importedData.dailyEntries) ||
            !importedData.hasOwnProperty("foods") || !Array.isArray(importedData.foods) ||
            !importedData.hasOwnProperty("settings") || typeof importedData.settings !== 'object'
          ) {
            Alert.alert(
              "Import Failed",
              "The imported file has an invalid structure or is missing required data (dailyEntries, foods, settings)."
            );
            return;
          }

          // Add more specific validation if needed (e.g., check types within arrays)

          // Perform saves
          await saveDailyEntries(importedData.dailyEntries as DailyEntry[]);
          await saveFoods(importedData.foods as Food[]);
          await saveSettings(importedData.settings as Settings);

          Alert.alert("Import Successful", "Data imported and saved successfully.");
          onDataOperation(); // Trigger reload in parent screen

        } catch (parseError) {
          console.error("JSON Parse Error during import:", parseError);
          Alert.alert(
            "Import Failed",
            "The imported file is not valid JSON or has corrupted content."
          );
          return;
        }
      } else {
        // Should not happen if !result.canceled, but handle defensively
        console.warn("Document picker returned no assets without cancellation.");
        Alert.alert("Import Failed", "Could not access the selected file.");
      }
    } catch (error: any) {
      console.error("Import Error:", error);
      // Handle specific DocumentPicker errors if necessary
      if (error.code === 'NO_PERMISSIONS') {
           Alert.alert("Permission Error", "Storage permissions are required to import files.");
      } else {
           Alert.alert(
             "Import Failed",
             error.message || "An unknown error occurred during import."
           );
      }
    }
  };

  const handleClearData = () => {
      // Check if there's actually data to clear (optional)
      // const entries = await loadDailyEntries(); // Example check
      // if (entries.length === 0 && ...) { Alert.alert("No Data", "There is no data to clear."); return; }

      setIsConfirmationVisible(true);
  };

  const confirmClearData = async () => {
    // Case-insensitive and trim check for robustness
    if (confirmationText.trim().toUpperCase() === "CLEAR DATA") {
      try {
        await clearAllData();
        Alert.alert("Data Cleared", "All application data has been successfully cleared.");
        onDataOperation(); // Trigger reload in parent screen
      } catch (error: any) {
        console.error("Clear Data Error:", error);
        Alert.alert("Clear Data Failed", error.message || "Failed to clear data.");
      } finally {
        setConfirmationText(""); // Clear input regardless of outcome
        setIsConfirmationVisible(false);
      }
    } else {
      Alert.alert("Confirmation Failed", "Incorrect confirmation text entered. Data was not cleared.");
      // Keep modal open and text field populated for user correction
    }
  };

  return (
    <>
      <Button
        title="Export Data"
        onPress={handleExportData}
        buttonStyle={{ marginBottom: 10, backgroundColor: theme.colors.primary }}
        icon={<Icon name="export" type="material-community" color="white" size={20} style={{ marginRight: 8 }} />}
      />
      <Button
        title="Import Data"
        onPress={handleImportData}
        buttonStyle={{ marginBottom: 10, backgroundColor: theme.colors.primary }}
        icon={<Icon name="import" type="material-community" color="white" size={20} style={{ marginRight: 8 }} />}
      />
      <Button
        title="Clear All Data"
        onPress={handleClearData}
        color="error" // Use theme's error color directly
        buttonStyle={{ marginBottom: 10 }}
        icon={<Icon name="trash-can-outline" type="material-community" color="white" size={20} style={{ marginRight: 8 }} />}
      />

      <ConfirmationModal
        isVisible={isConfirmationVisible}
        onCancel={() => {
            setIsConfirmationVisible(false);
            setConfirmationText(""); // Clear text on cancel
        }}
        onConfirm={confirmClearData}
        confirmationText={confirmationText}
        setConfirmationText={setConfirmationText}
        title="Confirm Clear All Data"
        message={'This action is irreversible and will delete all entries, foods, and settings.\n\nEnter "CLEAR DATA" to proceed.'}
      />
    </>
  );
};

export default DataManagementButtons;
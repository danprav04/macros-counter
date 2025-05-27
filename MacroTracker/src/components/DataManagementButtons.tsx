// src/components/DataManagementButtons.tsx
// src/components/DataManagementButtons.tsx
import React, { useState } from "react";
import { Alert, Platform } from "react-native";
import { Button, Icon } from "@rneui/themed";
import * as DocumentPicker from "expo-document-picker";
import * as FileSystem from "expo-file-system";
import * as Sharing from 'expo-sharing';
import { formatDateISO } from "../utils/dateUtils";
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
import { t } from '../localization/i18n';

interface DataManagementButtonsProps {
  onDataOperation: () => void;
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
      const { items: foodItems } = await loadFoods(); // Correctly destructure to get the array of food items
      const settings = await loadSettings();
      
      const exportData = { dailyEntries, foods: foodItems, settings }; // Use the foodItems array
      
      const exportDataString = JSON.stringify(exportData, null, 2);
      const formattedDate = formatDateISO(new Date());
      const fileName = `macro_data_${formattedDate}.json`;
      const fileUri = FileSystem.documentDirectory + fileName;
      await FileSystem.writeAsStringAsync(fileUri, exportDataString, { encoding: FileSystem.EncodingType.UTF8, });
      if (!(await Sharing.isAvailableAsync())) {
        Alert.alert(t('dataManagement.exportError'), t('dataManagement.exportErrorNoSharing'));
        return;
      }
      await Sharing.shareAsync(fileUri, { mimeType: 'application/json', dialogTitle: t('dataManagement.exportData'), UTI: 'public.json' });
    } catch (error: any) {
      console.error("Export Error:", error);
      Alert.alert(t('dataManagement.exportFailed'), error.message || t('dataManagement.exportFailedMessage'));
    }
  };

  const handleImportData = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({ type: ["application/json", "public.json"], copyToCacheDirectory: true });
      if (result.canceled) { console.log(t('dataManagement.importCancelled')); return; }
      if (result.assets && result.assets.length > 0) {
        const file = result.assets[0];
        if (!file.name?.toLowerCase().endsWith(".json")) { Alert.alert(t('dataManagement.importInvalidFileType'), t('dataManagement.importInvalidFileTypeMessage')); return; }
        if (file.size && file.size > 10 * 1024 * 1024) { Alert.alert(t('dataManagement.importFileTooLarge'), t('dataManagement.importFileTooLargeMessage')); return; }
        const fileContent = await FileSystem.readAsStringAsync(file.uri, { encoding: FileSystem.EncodingType.UTF8, });
        try {
          const importedData = JSON.parse(fileContent);
          if ( typeof importedData !== 'object' || importedData === null || !importedData.hasOwnProperty("dailyEntries") || !Array.isArray(importedData.dailyEntries) || !importedData.hasOwnProperty("foods") || !Array.isArray(importedData.foods) || !importedData.hasOwnProperty("settings") || typeof importedData.settings !== 'object' ) {
            Alert.alert(t('dataManagement.importFailed'), t('dataManagement.importFailedInvalidStructure')); return;
          }
          await saveDailyEntries(importedData.dailyEntries as DailyEntry[]);
          await saveFoods(importedData.foods as Food[]);
          await saveSettings(importedData.settings as Settings);
          Alert.alert(t('dataManagement.importSuccessful'), t('dataManagement.importSuccessfulMessage'));
          onDataOperation();
        } catch (parseError) {
          console.error("JSON Parse Error during import:", parseError);
          Alert.alert(t('dataManagement.importFailed'), t('dataManagement.importFailedParseError')); return;
        }
      } else {
        Alert.alert(t('dataManagement.importFailed'), t('dataManagement.importFailedAccessError'));
      }
    } catch (error: any) {
      console.error("Import Error:", error);
      if (error.code === 'NO_PERMISSIONS') { Alert.alert(t('dataManagement.importFailed'), t('dataManagement.importFailedPermissionError')); }
      else { Alert.alert(t('dataManagement.importFailed'), error.message || t('dataManagement.importFailedUnknownError')); }
    }
  };

  const handleClearData = () => { setIsConfirmationVisible(true); };

  const confirmClearData = async () => {
    if (confirmationText.trim().toUpperCase() === "CLEAR DATA") {
      try {
        await clearAllData();
        Alert.alert(t('dataManagement.clearDataSuccess'), t('dataManagement.clearDataSuccessMessage'));
        onDataOperation();
      } catch (error: any) {
        console.error("Clear Data Error:", error);
        Alert.alert(t('dataManagement.clearDataFailed'), error.message || t('dataManagement.clearDataFailedMessage'));
      } finally {
        setConfirmationText(""); setIsConfirmationVisible(false);
      }
    } else {
      Alert.alert(t('dataManagement.clearConfirmationFailed'), t('dataManagement.clearConfirmationFailedMessage'));
    }
  };

  return (
    <>
      <Button
        title={t('dataManagement.exportData')}
        onPress={handleExportData}
        buttonStyle={{ marginBottom: 10, backgroundColor: theme.colors.primary }}
        icon={<Icon name="export" type="material-community" color="white" size={20} style={{ marginRight: 8 }} />}
      />
      <Button
        title={t('dataManagement.importData')}
        onPress={handleImportData}
        buttonStyle={{ marginBottom: 10, backgroundColor: theme.colors.primary }}
        icon={<Icon name="import" type="material-community" color="white" size={20} style={{ marginRight: 8 }} />}
      />
      <Button
        title={t('dataManagement.clearAllData')}
        onPress={handleClearData}
        color="error"
        buttonStyle={{ marginBottom: 10 }}
        icon={<Icon name="trash-can-outline" type="material-community" color="white" size={20} style={{ marginRight: 8 }} />}
      />
      <ConfirmationModal
        isVisible={isConfirmationVisible}
        onCancel={() => { setIsConfirmationVisible(false); setConfirmationText(""); }}
        onConfirm={confirmClearData}
        confirmationText={confirmationText}
        setConfirmationText={setConfirmationText}
        title={t('dataManagement.confirmClearTitle')}
        message={t('dataManagement.confirmClearMessage')}
        inputPlaceholder={t('dataManagement.confirmClearInputPlaceholder')}
      />
    </>
  );
};

export default DataManagementButtons;

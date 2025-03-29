// components/AddFoodModal.tsx
import React, { useState, useEffect } from "react";
import {
  View,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Alert,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  Dimensions, // Import Dimensions
  StatusBar as RNStatusBar, // Import StatusBar from react-native for scanner view
} from "react-native";
import {
  Button,
  Input,
  Text,
  Overlay,
  makeStyles,
  useTheme,
  Icon,
} from "@rneui/themed";
import { Food } from "../types/food";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import Toast from "react-native-toast-message";
import { getMacrosForRecipe, getMacrosForImageFile } from "../utils/macros";
import * as ImagePicker from "expo-image-picker";
import { ImagePickerAsset, ImagePickerResult } from 'expo-image-picker';
import { isValidNumberInput, isNotEmpty } from "../utils/validationUtils";
import { BarCodeScanner, BarCodeScannerResult } from 'expo-barcode-scanner'; // Import Barcode Scanner
import { getFoodByBarcode, BarcodeScanResult } from '../services/barcodeService'; // Import barcode service

interface AddFoodModalProps {
  isVisible: boolean;
  toggleOverlay: () => void;
  newFood: Omit<Food, "id">;
  editFood: Food | null;
  errors: { [key: string]: string };
  handleInputChange: (
    key: keyof Omit<Food, "id">,
    value: string | number, // Allow number for direct setting from barcode/AI
    isEdit: boolean
  ) => void;
  handleCreateFood: () => void;
  handleUpdateFood: () => void;
  validateFood: (food: Omit<Food, "id">) => { [key: string]: string } | null;
  setErrors: React.Dispatch<React.SetStateAction<{ [key: string]: string }>>;
}

const KEYBOARD_VERTICAL_OFFSET = Platform.OS === "ios" ? 60 : 0;

const AddFoodModal: React.FC<AddFoodModalProps> = ({
  isVisible,
  toggleOverlay,
  newFood,
  editFood,
  errors,
  handleInputChange,
  handleCreateFood,
  handleUpdateFood,
  validateFood,
  setErrors,
}) => {
  const { theme } = useTheme();
  const styles = useStyles();
  const [loading, setLoading] = useState(false); // For save/update
  const [apiLoading, setApiLoading] = useState(false); // General API loading overlay (optional)
  const [mode, setMode] = useState<"normal" | "ingredients">("normal");
  const [ingredients, setIngredients] = useState("");
  const [aiButtonLoading, setAiButtonLoading] = useState(false); // For ingredient AI
  const [imageLoading, setImageLoading] = useState(false); // For image analysis (camera/gallery)

  // --- Barcode Scanner State ---
  const [isScannerVisible, setIsScannerVisible] = useState(false);
  const [hasPermission, setHasPermission] = useState<boolean | null>(null);
  const [barcodeLoading, setBarcodeLoading] = useState(false);
  const [isScanning, setIsScanning] = useState(true); // To prevent rapid scans

  // Request camera permission for barcode scanner
  useEffect(() => {
      // Only request permissions if the main modal is visible AND scanner is intended to be shown
      // This avoids unnecessary permission prompts when just opening the add food modal
      if (isVisible && isScannerVisible && hasPermission === null) {
        (async () => {
            console.log("Requesting camera permission for barcode scanner...");
            const { status } = await BarCodeScanner.requestPermissionsAsync();
            console.log("Permission status:", status);
            setHasPermission(status === 'granted');
            if (status !== 'granted') {
                 Alert.alert("Permission Required", "Camera access is needed to scan barcodes.");
                 setIsScannerVisible(false); // Close scanner if permission denied
            }
        })();
      }
      // Reset permission state if modal closes or scanner closes
      if (!isVisible || !isScannerVisible) {
           // setHasPermission(null); // Reset permission check state only when needed
      }
  }, [isVisible, isScannerVisible, hasPermission]); // Add isScannerVisible dependency

  // Reset state when modal opens/closes
  useEffect(() => {
    if (isVisible) {
      setErrors({});
      setMode("normal");
      setIngredients("");
      setAiButtonLoading(false);
      setImageLoading(false);
      setLoading(false);
      // --- Reset Scanner State ---
      setIsScannerVisible(false); // Ensure scanner is closed initially
      setBarcodeLoading(false);
      setIsScanning(true); // Allow scanning when scanner opens
       // Don't reset hasPermission here, let the scanner activation logic handle it
    } else {
      // Optional: Clean up scanner state thoroughly when modal is fully closed
      setHasPermission(null);
    }
  }, [isVisible, setErrors]);

  const getValue = (key: keyof Omit<Food, "id">) => {
    const value = (editFood && editFood[key]) ?? newFood[key] ?? "";
    if (!editFood && typeof value === 'number' && value === 0 && key !== 'name') {
        return "";
    }
    if (editFood && typeof value === 'number' && value === 0 && key !== 'name') {
        return "0";
    }
    // Format numbers to avoid excessive decimals in input fields, but keep precision in state
    if (typeof value === 'number' && key !== 'name') {
       // Show up to 1 decimal place for display, or integer if whole number
       return value % 1 === 0 ? String(value) : value.toFixed(1);
    }
    return String(value);
  };


  const handleCreateOrUpdate = async (isUpdate: boolean) => {
    setLoading(true);
    const foodData = isUpdate ? editFood : newFood;
    if (!foodData) {
        setLoading(false);
        return;
    }

     const dataToValidate: Omit<Food, "id"> = {
        ...foodData,
        name: String(foodData.name).trim(),
         // Directly use the state values which should be numbers
         // Ensure they are numbers before validation
        calories: Number(foodData.calories) || 0,
        protein: Number(foodData.protein) || 0,
        carbs: Number(foodData.carbs) || 0,
        fat: Number(foodData.fat) || 0,
    };


    const validationErrors = validateFood(dataToValidate);

    if (validationErrors) {
      setErrors(validationErrors);
      setLoading(false);
      Toast.show({
        type: "error",
        text1: "Please fix the errors",
        position: 'bottom',
      });
      return;
    }
    setErrors({});

    try {
      // handleUpdateFood/handleCreateFood should use the updated state values directly
      if (isUpdate) {
          await handleUpdateFood();
      } else {
          await handleCreateFood();
      }

      Toast.show({
        type: "success",
        text1: `Food ${isUpdate ? "Updated" : "Created"} Successfully!`,
        position: 'bottom',
      });
      toggleOverlay(); // Close modal on success
    } catch (error: any) {
      Alert.alert(
        "Error",
        error.message || `Failed to ${isUpdate ? "update" : "create"} food.`
      );
    } finally {
      setLoading(false);
    }
  };

  const handleAiButtonClick = async () => {
    const foodName = getValue("name");
    if (!foodName && mode === 'ingredients') {
      Alert.alert("Missing Name", "Please enter a food name first.");
      return;
    }

    if (mode === "normal") {
      setMode("ingredients");
      handleInputChange("calories", "", !!editFood);
      handleInputChange("protein", "", !!editFood);
      handleInputChange("carbs", "", !!editFood);
      handleInputChange("fat", "", !!editFood);
    } else if (mode === "ingredients") {
      const currentFoodName = getValue("name");
      if (!currentFoodName) {
        Alert.alert("Missing Name", "Please enter a food name before calculating macros.");
        return;
      }

      setAiButtonLoading(true);
      try {
        const macros = await getMacrosForRecipe(currentFoodName, ingredients);
        // Use numbers directly when setting state from AI/Barcode
        handleInputChange("calories", Math.round(macros.calories), !!editFood);
        handleInputChange("protein", Math.round(macros.protein), !!editFood);
        handleInputChange("carbs", Math.round(macros.carbs), !!editFood);
        handleInputChange("fat", Math.round(macros.fat), !!editFood);

        setMode("normal");
        Toast.show({ type: 'info', text1: 'Macros estimated from ingredients.', position: 'bottom' });
      } catch (error) {
        console.error("AI Macro fetch error (recipe):", error);
        Alert.alert(
          "AI Error",
          `Could not calculate macros from text. ${error instanceof Error ? error.message : "Please try again or input manually."}`
        );
      } finally {
        setAiButtonLoading(false);
      }
    }
  };

  const handleGetImageAndAnalyze = async () => {
    const processImage = async (pickerResult: ImagePickerResult) => {
        if (pickerResult.canceled) {
            return;
        }
        if (pickerResult.assets && pickerResult.assets.length > 0) {
            const asset = pickerResult.assets[0];
            setImageLoading(true);
            const fileInfoForApi = {
                uri: asset.uri,
                fileName: asset.fileName ?? `photo_${Date.now()}.jpg`,
                type: asset.mimeType ?? 'image/jpeg'
            };
            try {
                const result = await getMacrosForImageFile(fileInfoForApi);
                handleInputChange("name", result.foodName, !!editFood);
                handleInputChange("calories", Math.round(result.calories), !!editFood);
                handleInputChange("protein", Math.round(result.protein), !!editFood);
                handleInputChange("carbs", Math.round(result.carbs), !!editFood);
                handleInputChange("fat", Math.round(result.fat), !!editFood);
                setMode("normal");
                setIngredients("");
                Toast.show({
                    type: 'success',
                    text1: 'Food Identified!',
                    text2: `Identified as ${result.foodName}. Macros estimated.`,
                    position: 'bottom',
                });
            } catch (analysisError) {
                console.error("Error during image analysis:", analysisError);
                Alert.alert(
                    "Analysis Failed",
                    `Could not get macros from the image. ${analysisError instanceof Error ? analysisError.message : "Please try again or enter manually."}`
                );
            } finally {
                 setTimeout(() => setImageLoading(false), 100);
            }
        } else {
            console.log("No assets selected or returned.");
        }
    };

    Alert.alert(
      "Get Image", "Choose a source for the food image:",
      [
        { text: "Cancel", style: "cancel" },
        { text: "Camera", onPress: async () => {
            setImageLoading(true);
            try {
                const permissionResult = await ImagePicker.requestCameraPermissionsAsync();
                if (!permissionResult.granted) {
                    Alert.alert("Permission Required", "Camera access needed.");
                    setImageLoading(false); return;
                }
                const cameraResult = await ImagePicker.launchCameraAsync({ quality: 0.6 });
                await processImage(cameraResult);
            } catch (error) {
                console.error("Error launching camera:", error);
                Alert.alert("Camera Error", "Could not open camera.");
                setImageLoading(false);
            }
          }},
        { text: "Gallery", onPress: async () => {
            setImageLoading(true);
            try {
                const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
                if (!permissionResult.granted) {
                    Alert.alert("Permission Required", "Gallery access needed.");
                    setImageLoading(false); return;
                }
                const libraryResult = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ImagePicker.MediaTypeOptions.Images, quality: 0.6 });
                await processImage(libraryResult);
            } catch (error) {
                console.error("Error launching image library:", error);
                Alert.alert("Gallery Error", "Could not open gallery.");
                setImageLoading(false);
            }
          }},
      ], { cancelable: true }
    );
  };

  // --- Barcode Scanner Functions ---
  const handleOpenScanner = async () => {
      setBarcodeLoading(true); // Show loading while checking permission
      console.log("Attempting to open scanner...");
      const { status } = await BarCodeScanner.getPermissionsAsync();
      setHasPermission(status === 'granted');

      if (status === 'granted') {
          console.log("Permission granted. Opening scanner.");
          setIsScannerVisible(true);
          setIsScanning(true); // Ensure scanning is enabled when opened
      } else {
          console.log("Permission not yet granted. Requesting...");
          const { status: newStatus } = await BarCodeScanner.requestPermissionsAsync();
          setHasPermission(newStatus === 'granted');
          if (newStatus === 'granted') {
              console.log("Permission granted after request. Opening scanner.");
              setIsScannerVisible(true);
              setIsScanning(true);
          } else {
              Alert.alert("Permission Required", "Camera access is needed to scan barcodes. Please enable it in your device settings.");
              console.log("Permission denied.");
          }
      }
      setBarcodeLoading(false); // Hide loading indicator
  };

  const handleBarCodeScanned = async ({ type, data }: BarCodeScannerResult) => {
      if (!isScanning) return; // Prevent processing if already handling a scan

      setIsScanning(false); // Stop further scans temporarily
      setBarcodeLoading(true); // Show loading indicator on the scanner screen
      console.log(`Barcode scanned! Type: ${type} Data: ${data}`);

      try {
          const foodData = await getFoodByBarcode(data);

          if (foodData) {
              // Update form fields - use numbers directly
              handleInputChange("name", foodData.name, !!editFood);
              handleInputChange("calories", foodData.calories ?? 0, !!editFood);
              handleInputChange("protein", foodData.protein ?? 0, !!editFood);
              handleInputChange("carbs", foodData.carbs ?? 0, !!editFood);
              handleInputChange("fat", foodData.fat ?? 0, !!editFood);

              setMode('normal'); // Ensure normal mode is active
              setIngredients(''); // Clear ingredients if populated from barcode

              Toast.show({
                  type: 'success',
                  text1: 'Food Found!',
                  text2: `${foodData.name} data loaded.`,
                  position: 'bottom',
              });
              setIsScannerVisible(false); // Close scanner on success
              setBarcodeLoading(false);

          } else {
              // Food not found in Open Food Facts
              Toast.show({
                  type: 'error',
                  text1: 'Food Not Found',
                  text2: `Barcode ${data} not in database. Try AI or manual entry.`,
                  position: 'bottom',
                  visibilityTime: 4000,
              });
              setBarcodeLoading(false);
              // Keep scanner open? Or close? Let's keep it open for another try.
              // Re-enable scanning after a short delay
              setTimeout(() => setIsScanning(true), 1500);
          }
      } catch (error) {
          console.error("Error fetching food by barcode:", error);
          Alert.alert("Scan Error", `Could not fetch data for barcode ${data}. Please try again.`);
          setBarcodeLoading(false);
          // Re-enable scanning after error
          setTimeout(() => setIsScanning(true), 1500);
      }
      // Note: isScanning might be re-enabled by the setTimeout above on failure/not found
  };

  // --- Render Barcode Scanner View ---
  if (isScannerVisible) {
      if (hasPermission === null) {
          // Still checking permissions
          return (
               <View style={styles.scannerContainer}>
                   <ActivityIndicator size="large" color={theme.colors.primary} />
                   <Text style={{ color: theme.colors.text, marginTop: 10 }}>Requesting Camera Permission...</Text>
               </View>
           );
      }
      if (hasPermission === false) {
          // Should have been handled by alert, but as a fallback UI
           return (
               <View style={styles.scannerContainer}>
                    <Text style={{ color: theme.colors.text, textAlign: 'center', marginBottom: 20 }}>
                       Camera permission is required to scan barcodes.
                    </Text>
                   <Button title="Close Scanner" onPress={() => setIsScannerVisible(false)} />
                   {/* Optionally add a button to open app settings */}
               </View>
           );
      }
      // --- Render Actual Scanner ---
      return (
           <View style={styles.scannerContainer}>
               <BarCodeScanner
                    onBarCodeScanned={isScanning ? handleBarCodeScanned : undefined}
                    style={StyleSheet.absoluteFillObject} // Make scanner fill the container
               />
                {/* Optional: Add viewfinder overlay */}
               <View style={styles.viewfinder} />

               {barcodeLoading && (
                   <View style={styles.scannerLoadingOverlay}>
                       <ActivityIndicator size="large" color={theme.colors.white} />
                       <Text style={styles.scannerLoadingText}>Looking up barcode...</Text>
                   </View>
                )}

                <TouchableOpacity
                    style={styles.closeScannerButton}
                    onPress={() => {
                         setIsScannerVisible(false);
                         setIsScanning(true); // Reset scanning state when closing manually
                         setBarcodeLoading(false);
                    }}
                >
                   <Icon name="close" type="material" size={30} color={theme.colors.white} />
               </TouchableOpacity>
           </View>
       );
  }

  // --- Render Main Modal ---
  const combinedOverlayStyle = StyleSheet.flatten([
        styles.overlayStyle,
        { backgroundColor: theme.colors.background }
    ]);
  const isAnyLoading = loading || aiButtonLoading || imageLoading || barcodeLoading; // Combined loading state

  return (
    <Overlay
      isVisible={isVisible && !isScannerVisible} // Only show modal if scanner isn't active
      onBackdropPress={!isAnyLoading ? toggleOverlay : undefined}
      animationType="fade"
      overlayStyle={styles.overlayContainer}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={styles.keyboardAvoidingView}
        keyboardVerticalOffset={KEYBOARD_VERTICAL_OFFSET}
      >
        <View style={combinedOverlayStyle}>
          <View style={styles.header}>
            <Text h4 style={styles.overlayTitle}>
              {editFood ? "Edit Food" : "Add New Food"}
            </Text>
            <Button
              title={editFood ? "Update" : "Add"}
              onPress={() => handleCreateOrUpdate(!!editFood)}
              buttonStyle={[ styles.button, { backgroundColor: editFood ? theme.colors.warning : theme.colors.primary }]}
              titleStyle={{ color: theme.colors.white, fontWeight: "600" }}
              loading={loading}
              disabled={isAnyLoading}
              containerStyle={styles.buttonContainer}
            />
            <Icon
              name="close" type="material" size={28} color={theme.colors.text}
              onPress={!isAnyLoading ? toggleOverlay : undefined}
              containerStyle={styles.closeIcon}
              disabled={isAnyLoading}
              disabledStyle={{ backgroundColor: 'transparent' }}
            />
          </View>

          <ScrollView keyboardShouldPersistTaps="handled">
            {/* --- Food Name Input & Image/Barcode Icons --- */}
            <View style={styles.inputRow}>
                <Input
                    label="Food Name"
                    labelStyle={{ color: theme.colors.text }}
                    value={getValue("name")}
                    onChangeText={(text) => handleInputChange("name", text, !!editFood)}
                    errorMessage={errors.name}
                    inputContainerStyle={[styles.inputContainerStyle, styles.inputContainerFlex]}
                    inputStyle={styles.inputStyle}
                    containerStyle={{ flex: 1 }}
                    leftIcon={ <MaterialCommunityIcons name="food-apple" size={24} color={errors.name ? theme.colors.error : theme.colors.grey1} />}
                />
                 {/* --- Image Picker/Camera Icon Button --- */}
                 <TouchableOpacity
                    onPress={handleGetImageAndAnalyze}
                    disabled={isAnyLoading}
                    style={styles.iconButtonContainer}
                 >
                    {imageLoading ? (
                        <ActivityIndicator size="small" color={theme.colors.primary} />
                    ) : (
                        <Icon name="camera-enhance-outline" type="material-community" size={28} color={theme.colors.primary} />
                    )}
                </TouchableOpacity>
                 {/* --- Barcode Scanner Icon Button --- */}
                 <TouchableOpacity
                    onPress={handleOpenScanner}
                    disabled={isAnyLoading}
                    style={styles.iconButtonContainer}
                 >
                    {barcodeLoading && !isScannerVisible ? ( // Show loading only if scanner isn't already visible
                        <ActivityIndicator size="small" color={theme.colors.primary} />
                    ) : (
                        <Icon name="barcode-scan" type="material-community" size={26} color={theme.colors.primary} />
                    )}
                </TouchableOpacity>
            </View>
            {/* --- End Food Name Input Row --- */}

            {mode === "normal" && (
              <>
                {/* Calories Input */}
                <Input
                  label="Calories (per 100g)"
                  labelStyle={{ color: theme.colors.text }}
                  keyboardType="numeric"
                  value={getValue("calories")}
                  onChangeText={(text) => handleInputChange("calories", text.replace(/[^0-9.]/g, "").replace(/(\..*)\./g, "$1"), !!editFood)}
                  errorMessage={errors.calories}
                  inputContainerStyle={styles.inputContainerStyle}
                  inputStyle={styles.inputStyle}
                  leftIcon={<MaterialCommunityIcons name="fire" size={24} color={errors.calories ? theme.colors.error : theme.colors.grey1}/>}
                />
                {/* Protein Input */}
                <Input
                  label="Protein (per 100g)"
                  labelStyle={{ color: theme.colors.text }}
                  keyboardType="numeric"
                  value={getValue("protein")}
                  onChangeText={(text) => handleInputChange("protein", text.replace(/[^0-9.]/g, "").replace(/(\..*)\./g, "$1"), !!editFood)}
                  errorMessage={errors.protein}
                  inputContainerStyle={styles.inputContainerStyle}
                  inputStyle={styles.inputStyle}
                  leftIcon={<MaterialCommunityIcons name="food-drumstick" size={24} color={errors.protein ? theme.colors.error : theme.colors.grey1}/>}
                />
                {/* Carbs Input */}
                <Input
                  label="Carbs (per 100g)"
                  labelStyle={{ color: theme.colors.text }}
                  keyboardType="numeric"
                  value={getValue("carbs")}
                  onChangeText={(text) => handleInputChange("carbs", text.replace(/[^0-9.]/g, "").replace(/(\..*)\./g, "$1"), !!editFood)}
                  errorMessage={errors.carbs}
                  inputContainerStyle={styles.inputContainerStyle}
                  inputStyle={styles.inputStyle}
                  leftIcon={<MaterialCommunityIcons name="bread-slice" size={24} color={errors.carbs ? theme.colors.error : theme.colors.grey1}/>}
                />
                {/* Fat Input */}
                <Input
                  label="Fat (per 100g)"
                  labelStyle={{ color: theme.colors.text }}
                  keyboardType="numeric"
                  value={getValue("fat")}
                  onChangeText={(text) => handleInputChange("fat", text.replace(/[^0-9.]/g, "").replace(/(\..*)\./g, "$1"), !!editFood)}
                  errorMessage={errors.fat}
                  inputContainerStyle={styles.inputContainerStyle}
                  inputStyle={styles.inputStyle}
                  leftIcon={<MaterialCommunityIcons name="oil" size={24} color={errors.fat ? theme.colors.error : theme.colors.grey1}/>}
                />
              </>
            )}

            {mode === "ingredients" && (
              <>
                {/* Back Button */}
                <View style={styles.backButtonContainer}>
                  <Icon name="arrow-left" type="material-community" size={24} color={theme.colors.primary} onPress={() => !aiButtonLoading && setMode("normal")} disabled={aiButtonLoading} containerStyle={styles.backIcon} />
                  <Text style={[styles.backButtonText, aiButtonLoading && styles.disabledText]} onPress={() => !aiButtonLoading && setMode("normal")}> Back to Manual Input </Text>
                </View>
                {/* Ingredients Input */}
                <Input
                  label="Ingredients (Optional - Add if known)"
                  labelStyle={{ color: theme.colors.text }}
                  value={ingredients}
                  onChangeText={setIngredients}
                  multiline numberOfLines={4}
                  inputContainerStyle={[styles.inputContainerStyle, styles.multilineInputContainer]}
                  inputStyle={[styles.inputStyle, styles.multilineInput]}
                  placeholder="e.g.\n100g Chicken Breast\n50g Rice\n1 tbsp Olive Oil"
                  placeholderTextColor={theme.colors.grey3}
                  leftIcon={<MaterialCommunityIcons name="format-list-bulleted" size={24} color={theme.colors.grey1} style={styles.multilineIcon}/>}
                />
              </>
            )}

            {/* --- AI (Text) Button --- */}
            <Button
              title={ mode === "normal" ? "Calculate with AI (Recipe/Text)" : ingredients ? "Get Macros from Ingredients" : "Get Macros from Name Only" }
              onPress={handleAiButtonClick}
              buttonStyle={[ styles.button, styles.aiButton, { backgroundColor: theme.colors.secondary }]}
              titleStyle={[styles.aiButtonTitle, { color: theme.colors.white }]}
              loading={aiButtonLoading}
              disabled={isAnyLoading}
              icon={ mode === "normal" ? <MaterialCommunityIcons name="text-box-search-outline" size={18} color={theme.colors.white} style={{ marginRight: 8 }}/> : undefined }
              containerStyle={[styles.buttonContainer, { marginTop: 15, marginBottom: 20 }]} // Add bottom margin
            />

             {/* Removed "Barcode Coming Soon" Placeholder */}

          </ScrollView>
        </View>
      </KeyboardAvoidingView>
      {/* Optional: Central loading overlay */}
      {apiLoading && (
        <View style={styles.loadingOverlay}>
          <ActivityIndicator size="large" color={theme.colors.primary} />
        </View>
      )}
    </Overlay>
  );
};


// --- Styles ---
const useStyles = makeStyles((theme) => ({
  overlayContainer: {
    backgroundColor: 'transparent', width: '90%', maxWidth: 500, padding: 0, borderRadius: 15,
    shadowColor: "#000", shadowOffset: { width: 0, height: 2, }, shadowOpacity: 0.25, shadowRadius: 3.84, elevation: 5,
    overflow: 'hidden',
  },
  overlayStyle: {
    width: '100%', borderRadius: 15, padding: 20, paddingBottom: 30, maxHeight: '90%',
  },
  keyboardAvoidingView: { width: "100%", },
  header: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 20, paddingBottom: 10, borderBottomWidth: 1, borderBottomColor: theme.colors.divider, },
  overlayTitle: { color: theme.colors.text, fontWeight: "bold", fontSize: 20, flexShrink: 1, marginRight: 10, },
  closeIcon: { padding: 5, marginLeft: 10, },
  inputRow: { flexDirection: 'row', alignItems: 'flex-end', marginBottom: 5, },
  inputContainerFlex: { flex: 1, marginRight: 10, marginBottom: 0, },
  iconButtonContainer: { height: 40, width: 40, justifyContent: 'center', alignItems: 'center', marginBottom: 10, marginRight: 5, }, // Added marginRight
  inputContainerStyle: { borderBottomWidth: 1, borderBottomColor: theme.colors.grey4, marginBottom: 5, paddingBottom: 2, },
  inputStyle: { color: theme.colors.text, marginLeft: 10, fontSize: 16, },
  multilineInputContainer: { borderWidth: 1, borderColor: theme.colors.grey4, borderRadius: 8, paddingVertical: 8, paddingHorizontal: 5, marginBottom: 10, borderBottomWidth: 1, borderBottomColor: theme.colors.grey4, },
  multilineInput: { marginLeft: 5, textAlignVertical: 'top', minHeight: 80, fontSize: 16, color: theme.colors.text, },
  multilineIcon: { marginTop: 8, marginRight: 5, },
  // Removed futureInputContainer styles
  buttonContainer: {},
  button: { borderRadius: 8, paddingHorizontal: 15, paddingVertical: 10, },
  aiButton: { paddingVertical: 12, },
  aiButtonTitle: { fontWeight: "600", fontSize: 15, textAlign: 'center', },
  loadingOverlay: { position: "absolute", top: 0, left: 0, right: 0, bottom: 0, backgroundColor: "rgba(0, 0, 0, 0.5)", justifyContent: "center", alignItems: "center", zIndex: 10, borderRadius: 15, },
  backButtonContainer: { flexDirection: "row", alignItems: "center", marginBottom: 15, marginTop: 5, },
  backIcon: { marginRight: 5, padding: 5, },
  backButtonText: { color: theme.colors.primary, fontSize: 16, fontWeight: '500', },
  disabledText: { color: theme.colors.grey3, },

  // --- Scanner Styles ---
  scannerContainer: {
    flex: 1,
    backgroundColor: 'black', // Dark background for scanner view
    justifyContent: 'center',
    alignItems: 'center',
    // Ensure it covers the status bar area if needed
    paddingTop: Platform.OS === 'android' ? RNStatusBar.currentHeight : 0,
  },
  closeScannerButton: {
    position: 'absolute',
    top: (Platform.OS === 'android' ? RNStatusBar.currentHeight || 0 : 40) + 15, // Adjust top padding based on platform/status bar
    right: 20,
    padding: 10,
    backgroundColor: 'rgba(0,0,0,0.4)',
    borderRadius: 25,
  },
   viewfinder: { // Optional visual aid
        width: Dimensions.get('window').width * 0.7,
        height: Dimensions.get('window').width * 0.4,
        borderColor: 'rgba(255, 255, 255, 0.6)',
        borderWidth: 2,
        borderRadius: 10,
        // position: 'absolute', // Positioned by parent flexbox center
   },
   scannerLoadingOverlay: {
       position: 'absolute',
       top: 0, left: 0, right: 0, bottom: 0,
       backgroundColor: 'rgba(0, 0, 0, 0.6)',
       justifyContent: 'center',
       alignItems: 'center',
   },
   scannerLoadingText: {
       color: theme.colors.white,
       marginTop: 15,
       fontSize: 16,
   },
}));


export default AddFoodModal;
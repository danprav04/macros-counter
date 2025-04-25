// src/components/AddFoodModal.tsx
// components/AddFoodModal.tsx (With Image Compression)
import React, { useState, useEffect, useCallback } from "react";
import {
  View,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Alert,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
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
import {
    getMacrosFromText, // Utility using backend
    getMacrosForImageFile, // Utility using backend
    BackendError, // Import error type
} from "../utils/macros";
import * as ImagePicker from "expo-image-picker";
import * as ImageManipulator from 'expo-image-manipulator'; // Import manipulator
import { ImagePickerAsset, ImagePickerResult } from 'expo-image-picker';
import { isValidNumberInput } from "../utils/validationUtils"; // Keep isNotEmpty validation

interface AddFoodModalProps {
  isVisible: boolean;
  toggleOverlay: () => void;
  newFood: Omit<Food, "id">;
  editFood: Food | null;
  errors: { [key: string]: string };
  handleInputChange: (
    key: keyof Omit<Food, "id">,
    value: string,
    isEdit: boolean
  ) => void;
  handleCreateFood: () => void; // Still used to update local list state
  handleUpdateFood: () => void; // Still used to update local list state
  validateFood: (food: Omit<Food, "id">) => { [key: string]: string } | null;
  setErrors: React.Dispatch<React.SetStateAction<{ [key: string]: string }>>;
}

const KEYBOARD_VERTICAL_OFFSET = Platform.OS === "ios" ? 60 : 0;
const MAX_IMAGE_DIMENSION = 1024; // Max width/height for compressed image
const IMAGE_COMPRESSION_QUALITY = 0.7; // Compression quality (0.0 - 1.0)

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
  const [loading, setLoading] = useState(false); // For save/update button
  // const [apiLoading, setApiLoading] = useState(false); // Not currently used, imageLoading is specific
  const [mode, setMode] = useState<"normal" | "ingredients">("normal");
  const [ingredients, setIngredients] = useState("");
  const [aiButtonLoading, setAiButtonLoading] = useState(false); // For ingredient text AI
  const [imageLoading, setImageLoading] = useState(false); // For image analysis AI

  useEffect(() => {
    if (isVisible) {
      setErrors({});
      setMode("normal");
      setIngredients("");
      setAiButtonLoading(false);
      setImageLoading(false);
      setLoading(false);
    }
  }, [isVisible, setErrors]);

  // Helper to get value from correct state (edit or new)
  const getValue = (key: keyof Omit<Food, "id">) => {
    const source = editFood ?? newFood;
    const value = source[key];

    // Handle display formatting for numeric fields
    if (typeof value === 'number' && key !== 'name') {
        // Return "0" if value is 0, otherwise string representation
        // Return empty string if it's the initial 0 in the newFood state
        if (value === 0 && source === newFood) return "";
        return String(value);
    }
    return String(value ?? ""); // Ensure name is treated as string
  };


  // Handles local state update and triggers parent save/update (Unchanged)
  const handleCreateOrUpdate = async (isUpdate: boolean) => {
    setLoading(true);
    const foodData = isUpdate ? editFood : newFood;
    if (!foodData) {
        setLoading(false);
        return;
    }

     const dataToValidate: Omit<Food, "id"> = {
        name: getValue("name").trim(), // Trim name for validation
        // Ensure numeric values are parsed correctly, defaulting to 0 if invalid/empty
        calories: parseFloat(getValue("calories")) || 0,
        protein: parseFloat(getValue("protein")) || 0,
        carbs: parseFloat(getValue("carbs")) || 0,
        fat: parseFloat(getValue("fat")) || 0,
    };

    const validationErrors = validateFood(dataToValidate);

    if (validationErrors) {
      setErrors(validationErrors);
      setLoading(false);
      Toast.show({
        type: "error", text1: "Please fix the errors", position: 'bottom',
      });
      return;
    }
    setErrors({});

    try {
      // Call the parent function which handles storage/state update
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
      console.error(`Error during ${isUpdate ? 'update' : 'create'} food handler:`, error);
      Alert.alert(
        "Error",
        error.message || `Failed to ${isUpdate ? "update" : "create"} food.`
      );
    } finally {
      setLoading(false);
    }
  };

  // Uses backend service for recipe text analysis (Unchanged)
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
        const macros = await getMacrosFromText(currentFoodName, ingredients);
        handleInputChange("calories", String(Math.round(macros.calories)), !!editFood);
        handleInputChange("protein", String(Math.round(macros.protein)), !!editFood);
        handleInputChange("carbs", String(Math.round(macros.carbs)), !!editFood);
        handleInputChange("fat", String(Math.round(macros.fat)), !!editFood);
        setMode("normal");
        Toast.show({ type: 'info', text1: 'Macros estimated from text.', position: 'bottom' });
      } catch (error) {
         // Alert is handled within getMacrosFromText utility now
         console.error("AI Macro fetch error (recipe - modal):", error);
      } finally {
        setAiButtonLoading(false);
      }
    }
  };

  // Function to compress image before processing
  const compressImage = async (asset: ImagePicker.ImagePickerAsset): Promise<ImageManipulator.ImageResult | null> => {
     console.log(`Original image dimensions: ${asset.width}x${asset.height}`);
     try {
         const actions: ImageManipulator.Action[] = [];
         // Resize if dimensions exceed max
         if (asset.width > MAX_IMAGE_DIMENSION || asset.height > MAX_IMAGE_DIMENSION) {
              const options: ImageManipulator.ActionResize = {
                resize: {
                  width: undefined,
                  height: undefined
                }
              };
              if (asset.width > asset.height) {
                 options.resize.width = MAX_IMAGE_DIMENSION;
             } else {
                 options.resize.height = MAX_IMAGE_DIMENSION;
             }
             actions.push({ resize: options.resize });
             console.log(`Resizing image to max dimension ${MAX_IMAGE_DIMENSION}`);
         }

         const saveOptions: ImageManipulator.SaveOptions = {
             compress: IMAGE_COMPRESSION_QUALITY,
             format: ImageManipulator.SaveFormat.JPEG, // Compress to JPEG for smaller size
             base64: false, // We don't need base64 from manipulator
         };

         const result = await ImageManipulator.manipulateAsync(asset.uri, actions, saveOptions);
         console.log(`Compressed image dimensions: ${result.width}x${result.height}`);
         console.log(`Compressed image URI: ${result.uri}`);
         return result;
     } catch (error) {
          console.error("Failed to compress image:", error);
          Alert.alert("Compression Error", "Could not process the image for compression.");
          return null;
     }
  };

  // Uses backend service for image analysis
  const handleGetImageAndAnalyze = async () => {

    const processImage = async (pickerResult: ImagePickerResult) => {
        if (pickerResult.canceled) {
            console.log("Image selection/capture cancelled");
            setImageLoading(false); return;
        }

        if (pickerResult.assets && pickerResult.assets.length > 0) {
            const originalAsset = pickerResult.assets[0];
            console.log("Image acquired:", originalAsset.uri);
            setImageLoading(true); // Loading starts

            // *** Compress the image ***
            const compressedAsset = await compressImage(originalAsset);
            if (!compressedAsset) {
                 setImageLoading(false); // Stop loading if compression failed
                 return;
            }

            // *** Use compressed asset for analysis ***
            const assetForAnalysis: ImagePicker.ImagePickerAsset = {
               ...originalAsset,
               uri: compressedAsset.uri,
               width: compressedAsset.width,
               height: compressedAsset.height,
               mimeType: 'image/jpeg', // Compressed to JPEG
            };

            try {
                 // Call utility function (uses backend) with compressed asset
                 const result = await getMacrosForImageFile(assetForAnalysis);

                // Update form fields with results
                handleInputChange("name", result.foodName, !!editFood);
                handleInputChange("calories", String(Math.round(result.calories)), !!editFood);
                handleInputChange("protein", String(Math.round(result.protein)), !!editFood);
                handleInputChange("carbs", String(Math.round(result.carbs)), !!editFood);
                handleInputChange("fat", String(Math.round(result.fat)), !!editFood);

                setMode("normal");
                setIngredients("");

                Toast.show({
                    type: 'success',
                    text1: 'Food Identified!',
                    text2: `Identified as ${result.foodName}. Macros estimated.`,
                    position: 'bottom',
                });

            } catch (analysisError) {
                // Alert is handled within getMacrosForImageFile utility now
                console.error("Error during image analysis (modal):", analysisError);
            } finally {
                 setTimeout(() => setImageLoading(false), 100); // Stop loading
            }
        } else {
            console.log("No assets selected or returned.");
            setImageLoading(false);
        }
    };

    // --- Image Picker Logic ---
    Alert.alert(
      "Get Image",
      "Choose a source for the food image:",
      [
        { text: "Cancel", style: "cancel", onPress: () => setImageLoading(false) },
        {
          text: "Camera",
          onPress: async () => {
            setImageLoading(true); // Indicate loading immediately
            try {
                const permissionResult = await ImagePicker.requestCameraPermissionsAsync();
                if (!permissionResult.granted) {
                    Alert.alert("Permission Required", "Camera access is needed.");
                    setImageLoading(false); return;
                }
                const cameraResult = await ImagePicker.launchCameraAsync({
                    quality: 1, // Capture high quality
                    exif: false,
                });
                await processImage(cameraResult);
            } catch (error) {
                console.error("Error launching camera:", error);
                Alert.alert("Camera Error", "Could not open the camera.");
                setImageLoading(false);
            }
          },
        },
        {
          text: "Gallery",
          onPress: async () => {
            setImageLoading(true); // Indicate loading immediately
            try {
                const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
                if (!permissionResult.granted) {
                    Alert.alert("Permission Required", "Gallery access needed.");
                    setImageLoading(false); return;
                }
                const libraryResult = await ImagePicker.launchImageLibraryAsync({
                    mediaTypes: ImagePicker.MediaTypeOptions.Images,
                    quality: 1, // Select high quality
                });
                await processImage(libraryResult);
            } catch (error) {
                console.error("Error launching image library:", error);
                Alert.alert("Gallery Error", "Could not open the image library.");
                 setImageLoading(false);
            }
          },
        },
      ],
      { cancelable: true, onDismiss: () => setImageLoading(false) }
    );
  };

    const combinedOverlayStyle = StyleSheet.flatten([
        styles.overlayStyle,
        { backgroundColor: theme.colors.background }
    ]);

    const isAnyLoading = loading || aiButtonLoading || imageLoading; // Combined loading state

  return (
    <Overlay
      isVisible={isVisible}
      onBackdropPress={!isAnyLoading ? toggleOverlay : undefined} // Prevent closing while loading
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
              buttonStyle={[
                styles.button,
                { backgroundColor: editFood ? theme.colors.warning : theme.colors.primary },
              ]}
              titleStyle={{ color: theme.colors.white, fontWeight: "600" }}
              loading={loading} // Only show loading for the save/update action itself
              disabled={isAnyLoading} // Disable if any operation is running
              containerStyle={styles.buttonContainer}
            />
            <Icon
              name="close"
              type="material"
              size={28}
              color={theme.colors.text}
              onPress={!isAnyLoading ? toggleOverlay : undefined} // Disable close when loading
              containerStyle={styles.closeIcon}
              disabled={isAnyLoading}
              disabledStyle={{ backgroundColor: 'transparent' }}
            />
          </View>

          <ScrollView keyboardShouldPersistTaps="handled">
             {/* Food Name Input with Image Icon */}
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
                    leftIcon={
                        <MaterialCommunityIcons
                        name="food-apple" size={24}
                        color={errors.name ? theme.colors.error : theme.colors.grey1}
                        />
                    }
                    disabled={isAnyLoading} // Disable input while loading
                />
                {/* Image Picker/Camera Icon Button */}
                <TouchableOpacity
                    onPress={handleGetImageAndAnalyze}
                    disabled={isAnyLoading} // Disable while loading
                    style={styles.iconButtonContainer}
                 >
                    {imageLoading ? ( // Use specific loading state for this button
                        <ActivityIndicator size="small" color={theme.colors.primary} />
                    ) : (
                        <Icon
                            name="camera-enhance-outline"
                            type="material-community" size={28}
                            color={isAnyLoading ? theme.colors.grey3 : theme.colors.primary} // Dim icon when disabled
                        />
                    )}
                </TouchableOpacity>
            </View>

            {/* Macro Inputs or Ingredient Input */}
            {mode === "normal" && (
              <>
                <Input
                  label="Calories (per 100g)" labelStyle={{ color: theme.colors.text }}
                  keyboardType="numeric" value={getValue("calories")}
                  onChangeText={(text) => handleInputChange("calories", text, !!editFood)}
                  errorMessage={errors.calories} inputContainerStyle={styles.inputContainerStyle}
                  inputStyle={styles.inputStyle}
                  leftIcon={<MaterialCommunityIcons name="fire" size={24} color={errors.calories ? theme.colors.error : theme.colors.grey1}/>}
                  disabled={isAnyLoading}
                />
                <Input
                  label="Protein (per 100g)" labelStyle={{ color: theme.colors.text }}
                  keyboardType="numeric" value={getValue("protein")}
                  onChangeText={(text) => handleInputChange("protein", text, !!editFood)}
                  errorMessage={errors.protein} inputContainerStyle={styles.inputContainerStyle}
                  inputStyle={styles.inputStyle}
                  leftIcon={<MaterialCommunityIcons name="food-drumstick" size={24} color={errors.protein ? theme.colors.error : theme.colors.grey1}/>}
                   disabled={isAnyLoading}
               />
                <Input
                  label="Carbs (per 100g)" labelStyle={{ color: theme.colors.text }}
                  keyboardType="numeric" value={getValue("carbs")}
                  onChangeText={(text) => handleInputChange("carbs", text, !!editFood)}
                  errorMessage={errors.carbs} inputContainerStyle={styles.inputContainerStyle}
                  inputStyle={styles.inputStyle}
                  leftIcon={<MaterialCommunityIcons name="bread-slice" size={24} color={errors.carbs ? theme.colors.error : theme.colors.grey1}/>}
                   disabled={isAnyLoading}
               />
                <Input
                  label="Fat (per 100g)" labelStyle={{ color: theme.colors.text }}
                  keyboardType="numeric" value={getValue("fat")}
                  onChangeText={(text) => handleInputChange("fat", text, !!editFood)}
                  errorMessage={errors.fat} inputContainerStyle={styles.inputContainerStyle}
                  inputStyle={styles.inputStyle}
                  leftIcon={<MaterialCommunityIcons name="oil" size={24} color={errors.fat ? theme.colors.error : theme.colors.grey1}/>}
                   disabled={isAnyLoading}
               />
              </>
            )}

            {mode === "ingredients" && (
              <>
                <View style={styles.backButtonContainer}>
                  <Icon name="arrow-left" type="material-community" size={24} color={theme.colors.primary}
                    onPress={() => !isAnyLoading && setMode("normal")} // Prevent switching during AI call
                    disabled={isAnyLoading} containerStyle={styles.backIcon}
                  />
                  <Text style={[styles.backButtonText, isAnyLoading && styles.disabledText]} onPress={() => !isAnyLoading && setMode("normal")}>
                      Back to Manual Input
                  </Text>
                </View>
                <Input
                  label="Ingredients (Optional)" labelStyle={{ color: theme.colors.text }}
                  value={ingredients} onChangeText={setIngredients} multiline={true}
                  numberOfLines={4} inputContainerStyle={[styles.inputContainerStyle, styles.multilineInputContainer]}
                  inputStyle={[styles.inputStyle, styles.multilineInput]}
                  placeholder="e.g.\n100g Chicken Breast\n50g Rice\n1 tbsp Olive Oil"
                  placeholderTextColor={theme.colors.grey3}
                  leftIcon={<MaterialCommunityIcons name="format-list-bulleted" size={24} color={theme.colors.grey1} style={styles.multilineIcon}/>}
                  disabled={isAnyLoading}
                />
              </>
            )}

            {/* AI (Text) Button */}
            <Button
              title={mode === "normal" ? "Calculate with AI (Recipe/Text)" : ingredients ? "Get Macros from Ingredients" : "Get Macros from Name Only"}
              onPress={handleAiButtonClick}
              buttonStyle={[styles.button, styles.aiButton, { backgroundColor: theme.colors.secondary }]}
              titleStyle={[styles.aiButtonTitle, { color: theme.colors.white }]}
              loading={aiButtonLoading} // Use specific loading state
              disabled={isAnyLoading} // Disable while any op runs
              icon={mode === "normal" ? <MaterialCommunityIcons name="text-box-search-outline" size={18} color={theme.colors.white} style={{ marginRight: 8 }}/> : undefined}
              containerStyle={[styles.buttonContainer, { marginTop: 15 }]}
            />

            {/* Barcode Placeholder (Unchanged) */}
            <View style={styles.futureInputContainer}>
              <Text style={styles.futureInputLabel}>
                Barcode Input (Coming Soon)
              </Text>
            </View>
          </ScrollView>
        </View>
      </KeyboardAvoidingView>
    </Overlay>
  );
};

// --- Styles (Keep existing styles) ---
const useStyles = makeStyles((theme) => ({
    overlayContainer: {
        backgroundColor: 'transparent', width: '90%', maxWidth: 500, padding: 0, borderRadius: 15,
        shadowColor: "#000", shadowOffset: { width: 0, height: 2, }, shadowOpacity: 0.25,
        shadowRadius: 3.84, elevation: 5, overflow: 'hidden',
    },
    overlayStyle: {
        width: '100%', borderRadius: 15, padding: 20, paddingBottom: 30, maxHeight: '90%',
    },
    keyboardAvoidingView: { width: "100%", },
    header: {
        flexDirection: "row", justifyContent: "space-between", alignItems: "center",
        marginBottom: 20, paddingBottom: 10, borderBottomWidth: 1, borderBottomColor: theme.colors.divider,
    },
    overlayTitle: { color: theme.colors.text, fontWeight: "bold", fontSize: 20, flexShrink: 1, marginRight: 10, },
    closeIcon: { padding: 5, marginLeft: 10, },
    inputRow: { flexDirection: 'row', alignItems: 'flex-end', marginBottom: 5, },
    inputContainerFlex: { flex: 1, marginRight: 10, marginBottom: 0, },
    iconButtonContainer: {
        height: 40, width: 40, justifyContent: 'center', alignItems: 'center', marginBottom: 10, // Align with input bottom
    },
    inputContainerStyle: { borderBottomWidth: 1, borderBottomColor: theme.colors.grey4, marginBottom: 5, paddingBottom: 2, },
    inputStyle: { color: theme.colors.text, marginLeft: 10, fontSize: 16, },
    multilineInputContainer: {
        borderWidth: 1, borderColor: theme.colors.grey4, borderRadius: 8, paddingVertical: 8,
        paddingHorizontal: 5, marginBottom: 10, borderBottomWidth: 1, borderBottomColor: theme.colors.grey4,
    },
    multilineInput: { marginLeft: 5, textAlignVertical: 'top', minHeight: 80, fontSize: 16, color: theme.colors.text, },
    multilineIcon: { marginTop: 8, marginRight: 5, },
    futureInputContainer: {
        backgroundColor: theme.colors.grey5, padding: 15, borderRadius: 10,
        marginTop: 20, marginBottom: 10, alignItems: "center",
    },
    futureInputLabel: { color: theme.colors.grey2, fontStyle: "italic", },
    buttonContainer: { },
    button: { borderRadius: 8, paddingHorizontal: 15, paddingVertical: 10, },
    aiButton: { paddingVertical: 12, },
    aiButtonTitle: { fontWeight: "600", fontSize: 15, textAlign: 'center', },
    loadingOverlay: { // Keep if generic overlay is needed
        position: "absolute", top: 0, left: 0, right: 0, bottom: 0, backgroundColor: "rgba(0, 0, 0, 0.5)",
        justifyContent: "center", alignItems: "center", zIndex: 10, borderRadius: 15,
    },
    backButtonContainer: { flexDirection: "row", alignItems: "center", marginBottom: 15, marginTop: 5, },
    backIcon: { marginRight: 5, padding: 5, },
    backButtonText: { color: theme.colors.primary, fontSize: 16, fontWeight: '500', },
    disabledText: { color: theme.colors.grey3, }
}));


export default AddFoodModal;
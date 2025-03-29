// components/AddFoodModal.tsx
import React, { useState, useEffect } from "react";
import {
  View,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Alert,
  ScrollView,
  StyleSheet, // Import StyleSheet
  TouchableOpacity, // Import TouchableOpacity for icon button
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
// Import the necessary functions
import { getMacrosForRecipe, getMacrosForImageFile } from "../utils/macros";
import * as ImagePicker from "expo-image-picker";
// Import the type explicitly if needed for clarity, although often inferred
import { ImagePickerAsset, ImagePickerResult } from 'expo-image-picker';
import { isValidNumberInput, isNotEmpty } from "../utils/validationUtils"; // Added validation imports

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
  handleCreateFood: () => void;
  handleUpdateFood: () => void;
  validateFood: (food: Omit<Food, "id">) => { [key: string]: string } | null;
  setErrors: React.Dispatch<React.SetStateAction<{ [key: string]: string }>>;
}

// Define a keyboard offset (adjust value based on testing, e.g., header height)
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
  const [apiLoading, setApiLoading] = useState(false); // Keep or remove based on need for global overlay
  const [mode, setMode] = useState<"normal" | "ingredients">("normal");
  const [ingredients, setIngredients] = useState("");
  const [aiButtonLoading, setAiButtonLoading] = useState(false); // For ingredient AI
  const [imageLoading, setImageLoading] = useState(false); // For image analysis (camera/gallery)

  useEffect(() => {
    if (isVisible) {
      setErrors({});
      setMode("normal");
      setIngredients("");
      // Reset loading states when modal opens
      setAiButtonLoading(false);
      setImageLoading(false);
      setLoading(false);
    }
  }, [isVisible, setErrors]);

  const getValue = (key: keyof Omit<Food, "id">) => {
    // Ensure numeric fields default to empty string for input if 0
    const value = (editFood && editFood[key]) ?? newFood[key] ?? "";
    // Keep 0 as "0" if it's the initial state for a new food
    if (!editFood && typeof value === 'number' && value === 0 && key !== 'name') {
        return ""; // Show empty input for new food numeric fields initially
    }
    if (editFood && typeof value === 'number' && value === 0 && key !== 'name') {
        return "0"; // Show "0" if editing and value is actually 0
    }
    return String(value); // Always return string for Input component
  };


  const handleCreateOrUpdate = async (isUpdate: boolean) => {
    setLoading(true);
    const foodData = isUpdate ? editFood : newFood;
    if (!foodData) {
        setLoading(false);
        return; // Should not happen in practice
    }

     // Ensure numeric fields are numbers before validation/saving
     // Use parseFloat which handles empty strings as NaN, then default to 0
     const dataToValidate: Omit<Food, "id"> = {
        ...foodData,
        name: String(foodData.name).trim(), // Trim name
        // Use getValue to ensure consistency with displayed value before parsing
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
        type: "error",
        text1: "Please fix the errors",
        position: 'bottom',
      });
      return;
    }
    // Clear errors if validation passes
    setErrors({});

    try {
      // Assumes handleUpdateFood/handleCreateFood use the respective state (editFood/newFood)
      // which was updated via handleInputChange. They need to handle parsing strings back to numbers if needed.
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
      toggleOverlay();
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
     // Require name only when switching to ingredients mode or submitting from it
    if (!foodName && mode === 'ingredients') {
      Alert.alert("Missing Name", "Please enter a food name first.");
      return;
    }

    if (mode === "normal") {
      setMode("ingredients");
      // Clear macro fields when switching to ingredients mode
      handleInputChange("calories", "", !!editFood);
      handleInputChange("protein", "", !!editFood);
      handleInputChange("carbs", "", !!editFood);
      handleInputChange("fat", "", !!editFood);
    } else if (mode === "ingredients") {
       // Ensure name exists before proceeding (should be caught above, but good failsafe)
      const currentFoodName = getValue("name");
      if (!currentFoodName) {
        Alert.alert("Missing Name", "Please enter a food name before calculating macros.");
        return;
      }

      setAiButtonLoading(true);
      try {
        const macros = await getMacrosForRecipe(currentFoodName, ingredients);

        // Update fields with AI results (rounded)
        handleInputChange("calories", String(Math.round(macros.calories)), !!editFood);
        handleInputChange("protein", String(Math.round(macros.protein)), !!editFood);
        handleInputChange("carbs", String(Math.round(macros.carbs)), !!editFood);
        handleInputChange("fat", String(Math.round(macros.fat)), !!editFood);

        setMode("normal"); // Switch back to normal mode to show results
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

  // --- Function to handle image acquisition (Camera or Gallery) and analysis ---
  const handleGetImageAndAnalyze = async () => {

    const processImage = async (pickerResult: ImagePickerResult) => {
        if (pickerResult.canceled) {
            console.log("Image selection/capture cancelled");
            return; // Exit if cancelled
        }

        if (pickerResult.assets && pickerResult.assets.length > 0) {
            const asset = pickerResult.assets[0]; // asset is of type ImagePickerAsset
            console.log("Image acquired:", asset.uri);
            setImageLoading(true); // Start loading indicator *before* analysis

            const fileInfoForApi = {
                uri: asset.uri,
                fileName: asset.fileName ?? `photo_${Date.now()}.jpg`, // Provide a default filename if null
                type: asset.mimeType ?? 'image/jpeg' // Provide a default mimetype if null
            };

            try {
                const result = await getMacrosForImageFile(fileInfoForApi);

                // Update form fields with results
                handleInputChange("name", result.foodName, !!editFood); // Update name too
                handleInputChange("calories", String(Math.round(result.calories)), !!editFood);
                handleInputChange("protein", String(Math.round(result.protein)), !!editFood);
                handleInputChange("carbs", String(Math.round(result.carbs)), !!editFood);
                handleInputChange("fat", String(Math.round(result.fat)), !!editFood);

                // Switch back to normal mode if in ingredients mode
                setMode("normal");
                setIngredients(""); // Clear ingredients if image analysis was successful

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
                 // Stop loading indicator regardless of success/failure
                 // Delay slightly to allow UI update before loading stops visually
                 setTimeout(() => setImageLoading(false), 100);
            }
        } else {
            console.log("No assets selected or returned.");
            // Optional: show a message if no asset was returned unexpectedly
        }
    }; // end processImage

    // --- Present choice to user ---
    Alert.alert(
      "Get Image",
      "Choose a source for the food image:",
      [
        {
          text: "Cancel",
          style: "cancel",
        },
        {
          text: "Camera",
          onPress: async () => {
            setImageLoading(true); // Indicate loading for permission/camera launch
            try {
                // Request Camera Permissions
                const permissionResult = await ImagePicker.requestCameraPermissionsAsync();
                if (permissionResult.granted === false) {
                    Alert.alert("Permission Required", "Camera access is needed to take a photo.");
                    setImageLoading(false);
                    return;
                }
                // Launch Camera
                const cameraResult = await ImagePicker.launchCameraAsync({
                    quality: 0.6, // Keep quality reasonable
                    allowsEditing: false, // Optional: allow editing after capture
                });
                await processImage(cameraResult); // Process the result from camera
            } catch (error) {
                console.error("Error launching camera:", error);
                Alert.alert("Camera Error", "Could not open the camera.");
                setImageLoading(false); // Ensure loading is stopped on error
            }
            // Note: setImageLoading(false) is handled within processImage's finally block on success/analysis error
          },
        },
        {
          text: "Gallery",
          onPress: async () => {
            setImageLoading(true); // Indicate loading for permission/gallery launch
            try {
                // Request Media Library Permissions
                const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
                if (permissionResult.granted === false) {
                    Alert.alert("Permission Required", "Gallery access is needed to choose an image.");
                    setImageLoading(false);
                    return;
                }
                // Launch Image Library
                const libraryResult = await ImagePicker.launchImageLibraryAsync({
                    mediaTypes: ImagePicker.MediaTypeOptions.Images,
                    quality: 0.6,
                });
                await processImage(libraryResult); // Process the result from gallery
            } catch (error) {
                console.error("Error launching image library:", error);
                Alert.alert("Gallery Error", "Could not open the image library.");
                 setImageLoading(false); // Ensure loading is stopped on error
            }
             // Note: setImageLoading(false) is handled within processImage's finally block on success/analysis error
          },
        },
      ],
      { cancelable: true } // Allow dismissing the alert by tapping outside
    );
  };


    // Combine theme-dependent and static styles
    const combinedOverlayStyle = StyleSheet.flatten([
        styles.overlayStyle, // Get base styles from useStyles
        { backgroundColor: theme.colors.background } // Apply theme background color here
    ]);

  return (
    <Overlay
      isVisible={isVisible}
      onBackdropPress={!imageLoading && !aiButtonLoading && !loading ? toggleOverlay : undefined} // Prevent closing while loading
      animationType="fade"
      overlayStyle={styles.overlayContainer} // Use container style
    >
      {/* KeyboardAvoidingView now directly inside Overlay */}
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={styles.keyboardAvoidingView}
        keyboardVerticalOffset={KEYBOARD_VERTICAL_OFFSET} // Added offset
      >
        {/* This View now acts as the visible modal background and content container */}
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
                {
                  backgroundColor: editFood
                    ? theme.colors.warning
                    : theme.colors.primary,
                },
              ]}
              titleStyle={{ color: theme.colors.white, fontWeight: "600" }}
              loading={loading} // Use the specific loading state
              disabled={loading || aiButtonLoading || imageLoading} // Disable while any operation is running
              containerStyle={styles.buttonContainer}
            />
             {/* Disable close button when loading */}
            <Icon
              name="close"
              type="material"
              size={28}
              color={theme.colors.text}
              onPress={!imageLoading && !aiButtonLoading && !loading ? toggleOverlay : undefined}
              containerStyle={styles.closeIcon}
              disabled={imageLoading || aiButtonLoading || loading}
              disabledStyle={{ backgroundColor: 'transparent' }} // Prevent visual change on disable
            />
          </View>

          {/* Use ScrollView to ensure content is scrollable, especially with keyboard */}
          <ScrollView keyboardShouldPersistTaps="handled">
             {/* --- Food Name Input with Image Icon --- */}
            <View style={styles.inputRow}>
                <Input
                    label="Food Name"
                    labelStyle={{ color: theme.colors.text }}
                    value={getValue("name")}
                    onChangeText={(text) =>
                        handleInputChange("name", text, !!editFood)
                    }
                    errorMessage={errors.name}
                    inputContainerStyle={[styles.inputContainerStyle, styles.inputContainerFlex]} // Adjust style
                    inputStyle={styles.inputStyle}
                    containerStyle={{ flex: 1 }} // Make input take available space
                    leftIcon={
                        <MaterialCommunityIcons
                        name="food-apple"
                        size={24}
                        color={errors.name ? theme.colors.error : theme.colors.grey1} // Use less prominent color when no error
                        />
                    }
                />
                {/* --- Image Picker/Camera Icon Button --- */}
                <TouchableOpacity
                    onPress={handleGetImageAndAnalyze} // Updated function call
                    disabled={imageLoading || aiButtonLoading || loading} // Disable while loading
                    style={styles.iconButtonContainer}
                 >
                    {imageLoading ? (
                        <ActivityIndicator size="small" color={theme.colors.primary} />
                    ) : (
                        <Icon
                            name="camera-enhance-outline" // Icon represents getting an image (camera or gallery)
                            type="material-community"
                            size={28}
                            color={theme.colors.primary}
                        />
                    )}
                </TouchableOpacity>
            </View>
            {/* --- End Food Name Input with Image Icon --- */}

            {mode === "normal" && (
              <>
                <Input
                  label="Calories (per 100g)"
                  labelStyle={{ color: theme.colors.text }}
                  keyboardType="numeric"
                  value={getValue("calories")}
                  onChangeText={(text) =>
                    handleInputChange(
                      "calories",
                      // Allow only numbers and one decimal point
                      text.replace(/[^0-9.]/g, "").replace(/(\..*)\./g, "$1"),
                      !!editFood
                    )
                  }
                  errorMessage={errors.calories}
                  inputContainerStyle={styles.inputContainerStyle}
                  inputStyle={styles.inputStyle}
                  leftIcon={
                    <MaterialCommunityIcons
                      name="fire"
                      size={24}
                      color={
                        errors.calories
                          ? theme.colors.error
                          : theme.colors.grey1
                      }
                    />
                  }
                />

                <Input
                  label="Protein (per 100g)"
                  labelStyle={{ color: theme.colors.text }}
                  keyboardType="numeric"
                  value={getValue("protein")}
                  onChangeText={(text) =>
                    handleInputChange(
                      "protein",
                      // Allow only numbers and one decimal point
                      text.replace(/[^0-9.]/g, "").replace(/(\..*)\./g, "$1"),
                      !!editFood
                    )
                  }
                  errorMessage={errors.protein}
                  inputContainerStyle={styles.inputContainerStyle}
                  inputStyle={styles.inputStyle}
                  leftIcon={
                    <MaterialCommunityIcons
                      name="food-drumstick"
                      size={24}
                      color={
                        errors.protein
                          ? theme.colors.error
                          : theme.colors.grey1
                      }
                    />
                  }
                />

                <Input
                  label="Carbs (per 100g)"
                  labelStyle={{ color: theme.colors.text }}
                  keyboardType="numeric"
                  value={getValue("carbs")}
                  onChangeText={(text) =>
                    handleInputChange(
                      "carbs",
                      // Allow only numbers and one decimal point
                      text.replace(/[^0-9.]/g, "").replace(/(\..*)\./g, "$1"),
                      !!editFood
                    )
                  }
                  errorMessage={errors.carbs}
                  inputContainerStyle={styles.inputContainerStyle}
                  inputStyle={styles.inputStyle}
                  leftIcon={
                    <MaterialCommunityIcons
                      name="bread-slice"
                      size={24}
                      color={
                        errors.carbs ? theme.colors.error : theme.colors.grey1
                      }
                    />
                  }
                />
                <Input
                  label="Fat (per 100g)"
                  labelStyle={{ color: theme.colors.text }}
                  keyboardType="numeric"
                  value={getValue("fat")}
                  onChangeText={(text) =>
                    handleInputChange(
                      "fat",
                      // Allow only numbers and one decimal point
                      text.replace(/[^0-9.]/g, "").replace(/(\..*)\./g, "$1"),
                      !!editFood
                    )
                  }
                  errorMessage={errors.fat}
                  inputContainerStyle={styles.inputContainerStyle}
                  inputStyle={styles.inputStyle}
                  leftIcon={
                    <MaterialCommunityIcons
                      name="oil" // Changed icon to 'oil'
                      size={24}
                      color={
                        errors.fat ? theme.colors.error : theme.colors.grey1
                      }
                    />
                  }
                />
              </>
            )}

            {mode === "ingredients" && (
              <>
                <View style={styles.backButtonContainer}>
                  <Icon
                    name="arrow-left"
                    type="material-community"
                    size={24}
                    color={theme.colors.primary}
                    onPress={() => !aiButtonLoading && setMode("normal")} // Prevent switching during AI call
                    disabled={aiButtonLoading}
                    containerStyle={styles.backIcon}
                  />
                  <Text style={[styles.backButtonText, aiButtonLoading && styles.disabledText]} onPress={() => !aiButtonLoading && setMode("normal")}>
                      Back to Manual Input
                  </Text>
                </View>

                <Input
                  label="Ingredients (Optional - Add if known)" // Updated label
                  labelStyle={{ color: theme.colors.text }}
                  value={ingredients}
                  onChangeText={setIngredients}
                  multiline={true}
                  numberOfLines={4} // Suggests height but allows expansion
                  inputContainerStyle={[
                    styles.inputContainerStyle,
                    styles.multilineInputContainer,
                  ]}
                  inputStyle={[styles.inputStyle, styles.multilineInput]}
                  placeholder="e.g.\n100g Chicken Breast\n50g Rice\n1 tbsp Olive Oil"
                  placeholderTextColor={theme.colors.grey3}
                  leftIcon={
                    <MaterialCommunityIcons
                      name="format-list-bulleted" // Better icon for list
                      size={24}
                      color={theme.colors.grey1}
                      style={styles.multilineIcon} // Adjust icon position if needed
                    />
                  }
                />
              </>
            )}
            {/* --- AI (Text) Button --- */}
            <Button
              title={
                mode === "normal"
                  ? "Calculate with AI (Recipe/Text)" // Clarify it's for text
                  : ingredients // Check if ingredients have been entered
                  ? "Get Macros from Ingredients"
                  : "Get Macros from Name Only" // New title
              }
              onPress={handleAiButtonClick}
              buttonStyle={[
                styles.button,
                styles.aiButton, // Specific style for AI button
                { backgroundColor: theme.colors.secondary },
              ]}
              titleStyle={[styles.aiButtonTitle, { color: theme.colors.white }]}
              loading={aiButtonLoading} // Use specific loading state
              disabled={aiButtonLoading || imageLoading || loading} // Disable while other ops run
              icon={
                mode === "normal" ? (
                  <MaterialCommunityIcons
                    name="text-box-search-outline" // Changed icon
                    size={18}
                    color={theme.colors.white}
                    style={{ marginRight: 8 }}
                  />
                ) : undefined
              }
              containerStyle={[styles.buttonContainer, { marginTop: 15 }]}
            />

            <View style={styles.futureInputContainer}>
              <Text style={styles.futureInputLabel}>
                Barcode Input (Coming Soon)
              </Text>
            </View>
          </ScrollView>
        </View>
      </KeyboardAvoidingView>
      {/* Optional: Central loading overlay (can be removed if specific indicators are sufficient) */}
      {apiLoading && ( // You might not need this if button indicators are enough
        <View style={styles.loadingOverlay}>
          <ActivityIndicator size="large" color={theme.colors.primary} />
        </View>
      )}
    </Overlay>
  );
};


// --- Styles (Includes previous fixes and new styles for image icon) ---
const useStyles = makeStyles((theme) => ({
  // Style for the Overlay container itself (positioning, width)
  overlayContainer: {
    backgroundColor: 'transparent', // Make the overlay container transparent
    width: '90%',
    maxWidth: 500, // Max width for larger screens
    padding: 0, // Remove padding from overlay itself
    borderRadius: 15,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2, },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
    overflow: 'hidden', // Prevent content spilling before borderRadius
  },
  // Style for the main content View inside KeyboardAvoidingView (visuals, padding)
  overlayStyle: {
    width: '100%', // Takes width from overlayContainer
    borderRadius: 15,
    padding: 20,
    paddingBottom: 30, // Add extra padding at the bottom
    maxHeight: '90%', // Limit max height
    // backgroundColor is applied dynamically based on theme
  },
  keyboardAvoidingView: {
    width: "100%",
    // Let KAV manage its size based on content and keyboard
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 20,
    paddingBottom: 10, // Add padding below header
    borderBottomWidth: 1, // Add a separator
    borderBottomColor: theme.colors.divider,
  },
  overlayTitle: {
    color: theme.colors.text,
    fontWeight: "bold",
    fontSize: 20, // Slightly smaller
    flexShrink: 1,
    marginRight: 10,
  },
  closeIcon: {
    padding: 5,
    marginLeft: 10,
  },
  // *** Styles for Input Row with Icon Button ***
  inputRow: {
    flexDirection: 'row',
    alignItems: 'flex-end', // Align items to bottom (aligns icon with input line)
    marginBottom: 5, // Consistent margin like other inputs
  },
  inputContainerFlex: {
    flex: 1, // Allow input container to grow
    marginRight: 10, // Space between input and icon button
    marginBottom: 0, // Remove margin bottom from container inside row
  },
  iconButtonContainer: {
    height: 40, // Match input height approximately
    width: 40,  // Make it square
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 10, // Align button bottom with input field bottom roughly (adjust if needed)
    // backgroundColor: theme.colors.grey5, // Optional: Subtle background
    // borderRadius: 20, // Optional: Make it circular
  },
  // *** End Styles for Input Row ***
  inputContainerStyle: {
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.grey4,
    marginBottom: 5, // Reduced margin
    paddingBottom: 2, // Add slight padding for input line
  },
  inputStyle: {
    color: theme.colors.text,
    marginLeft: 10,
    fontSize: 16,
  },
  multilineInputContainer: {
    borderWidth: 1, // Add border for multiline
    borderColor: theme.colors.grey4,
    borderRadius: 8,
    paddingVertical: 8,
    paddingHorizontal: 5, // Add horizontal padding
    marginBottom: 10,
    borderBottomWidth: 1, // Keep consistent border style
    borderBottomColor: theme.colors.grey4, // Keep consistent border style
  },
  multilineInput: {
    marginLeft: 5,
    textAlignVertical: 'top', // Align text top in multiline
    minHeight: 80, // Ensure a minimum height
    fontSize: 16, // Consistent font size
    color: theme.colors.text, // Ensure text color
  },
  multilineIcon: {
      marginTop: 8, // Adjust vertical position to align better with text
      marginRight: 5,
  },
  futureInputContainer: {
    backgroundColor: theme.colors.grey5,
    padding: 15,
    borderRadius: 10,
    marginTop: 20, // Increased margin
    marginBottom: 10, // Add bottom margin
    alignItems: "center",
  },
  futureInputLabel: {
    color: theme.colors.grey2,
    fontStyle: "italic",
  },
  buttonContainer: {
    // No specific style needed now
  },
  button: {
    borderRadius: 8,
    paddingHorizontal: 15,
    paddingVertical: 10,
  },
  aiButton: {
     paddingVertical: 12,
  },
  aiButtonTitle: {
      fontWeight: "600",
      fontSize: 15,
      textAlign: 'center', // Center button text
  },
  loadingOverlay: { // For general overlay if needed
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "center",
    alignItems: "center",
    zIndex: 10,
    borderRadius: 15, // Match overlay border radius
  },
  backButtonContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 15, // Add space below
    marginTop: 5,
  },
  backIcon: {
    marginRight: 5,
    padding: 5, // Make icon easier to tap
  },
  backButtonText: {
    color: theme.colors.primary, // Make text match icon color
    fontSize: 16,
    fontWeight: '500',
  },
  disabledText: {
      color: theme.colors.grey3, // Style for disabled text
  }
}));


export default AddFoodModal;
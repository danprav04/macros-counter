// components/AddFoodModal.tsx
import React, { useState, useEffect, useRef } from "react"; // Import useRef
import {
  View,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Alert,
  ScrollView,
  StyleSheet // Import StyleSheet
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
import { getMacrosForRecipe, getMacrosForImageFile } from "../utils/macros"; // Import both functions
import { isValidNumberInput, isNotEmpty } from "../utils/validationUtils";
import * as ImagePicker from 'expo-image-picker'; // Import image picker

// Define MacrosWithFoodName type (if not imported from elsewhere)
// Adjust based on your actual type definition if needed
interface MacrosWithFoodName {
    foodName: string;
    calories: number;
    protein: number;
    carbs: number;
    fat: number;
}


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
  handleCreateFood: () => Promise<void>; // Ensure these return promises if they are async
  handleUpdateFood: () => Promise<void>; // Ensure these return promises if they are async
  validateFood: (food: Omit<Food, "id">) => { [key: string]: string } | null;
  setErrors: React.Dispatch<React.SetStateAction<{ [key: string]: string }>>;
}

const KEYBOARD_VERTICAL_OFFSET = Platform.OS === 'ios' ? 60 : 0;

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
  const [loading, setLoading] = useState(false); // Loading for Add/Update button
  const [mode, setMode] = useState<"normal" | "ingredients">("normal");
  const [ingredients, setIngredients] = useState("");
  const [aiButtonLoading, setAiButtonLoading] = useState(false); // Loading for text/ingredient AI
  const [imageLoading, setImageLoading] = useState(false); // Loading for image AI
  const [ignoreBackdropPress, setIgnoreBackdropPress] = useState(false); // <-- State to ignore backdrop press
  const ignoreBackdropTimer = useRef<NodeJS.Timeout | null>(null); // <-- Ref for the timer

  // Effect to clear timer on unmount
  useEffect(() => {
    return () => {
      if (ignoreBackdropTimer.current) {
        clearTimeout(ignoreBackdropTimer.current);
      }
    };
  }, []);

  // Effect to reset state when modal becomes visible/hidden
  useEffect(() => {
    if (isVisible) {
      setErrors({});
      setMode("normal");
      setIngredients("");
      setIgnoreBackdropPress(false); // Reset flag when modal becomes visible
       if (ignoreBackdropTimer.current) { // Clear any lingering timer from previous interactions
          clearTimeout(ignoreBackdropTimer.current);
          ignoreBackdropTimer.current = null;
       }
      // Reset loading states? Optional, depends on desired UX
      // setAiButtonLoading(false);
      // setImageLoading(false);
    } else {
        // Also clear timer if modal is hidden externally
        if (ignoreBackdropTimer.current) {
          clearTimeout(ignoreBackdropTimer.current);
          ignoreBackdropTimer.current = null;
       }
    }
  }, [isVisible, setErrors]);

  const getValue = (key: keyof Omit<Food, "id">) => {
     const value = (editFood && editFood[key]) ?? newFood[key] ?? "";
     // Handle showing empty string for 0 values in new food mode (except name)
     if (!editFood && typeof value === 'number' && value === 0 && key !== 'name') {
         return "";
     }
     // Handle showing "0" for 0 values in edit mode (except name)
     if (editFood && typeof value === 'number' && value === 0 && key !== 'name') {
         return "0";
     }
     // Ensure non-name fields always return string for input value
     return String(value);
  };


  const handleCreateOrUpdate = async (isUpdate: boolean) => {
    setLoading(true);
    const foodData = isUpdate ? editFood : newFood;
    if (!foodData) {
        console.error("Error: foodData is null in handleCreateOrUpdate");
        setLoading(false);
        Alert.alert("Internal Error", "Could not process food data.");
        return;
    }

     // Parse and validate data *just before* submitting
     const dataToValidate: Omit<Food, "id"> = {
        name: String(getValue("name")).trim(), // Use getValue to get current input value
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
    setErrors({});

    try {
      if (isUpdate) {
          await handleUpdateFood(); // Assumes handleUpdateFood uses the updated `editFood` state from parent
      } else {
          await handleCreateFood(); // Assumes handleCreateFood uses the updated `newFood` state from parent
      }

      Toast.show({
        type: "success",
        text1: `Food ${isUpdate ? "Updated" : "Created"} Successfully!`,
        position: 'bottom',
      });
      toggleOverlay(); // Close modal on success
    } catch (error: any) {
       console.error(`Error ${isUpdate ? "updating" : "creating"} food:`, error);
       Alert.alert(
         "Error",
         error.message || `Failed to ${isUpdate ? "update" : "create"} food.`
       );
    } finally {
      setLoading(false);
    }
  };

  // Handles AI request based on Name (and optionally ingredients)
  const handleAiTextButtonClick = async () => {
    const foodName = getValue("name");
    if (!foodName && mode === "ingredients") {
      Alert.alert("Missing Name", "Please enter a food name before getting macros from ingredients.");
      return;
    }

    if (mode === "normal") {
       if (!foodName) {
         Alert.alert("Missing Name", "Please enter a food name before using AI calculation, or switch to ingredients mode.");
         return;
       }
      setMode("ingredients");
      // Clear macro fields when switching TO ingredients mode
      handleInputChange("calories", "", !!editFood);
      handleInputChange("protein", "", !!editFood);
      handleInputChange("carbs", "", !!editFood);
      handleInputChange("fat", "", !!editFood);
    } else if (mode === "ingredients") {
      // Proceed even if ingredients are empty (uses name only)
      setAiButtonLoading(true);
      try {
        const macros = await getMacrosForRecipe(foodName, ingredients); // Use the correct function

        // Update fields with AI results (rounded)
        handleInputChange("calories", String(Math.round(macros.calories)), !!editFood);
        handleInputChange("protein", String(Math.round(macros.protein)), !!editFood);
        handleInputChange("carbs", String(Math.round(macros.carbs)), !!editFood);
        handleInputChange("fat", String(Math.round(macros.fat)), !!editFood);

        setMode("normal"); // Switch back to normal mode to show results
        Toast.show({ type: 'info', text1: 'Macro fields populated by AI.', position: 'bottom' });

      } catch (error: any) {
        console.error("AI Macro fetch error (text):", error);
        Alert.alert(
          "AI Error",
          error.message || "Could not calculate macros. Please check the name/ingredients or input manually."
        );
      } finally {
        setAiButtonLoading(false);
      }
    }
  };

    // ---- UPDATED: Image Picker Logic ----
    const pickImage = async () => {
        // Request permission
        const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (permissionResult.granted === false) {
            Alert.alert("Permission Required", "You need to allow access to your photos to use this feature.");
            return;
        }

        setIgnoreBackdropPress(true); // <--- Set flag BEFORE launching picker
        console.log("Set ignoreBackdropPress = true");

        // Launch image library
        let pickerResult;
        try {
             pickerResult = await ImagePicker.launchImageLibraryAsync({
                mediaTypes: ImagePicker.MediaTypeOptions.Images,
                allowsEditing: true,
                quality: 0.6,
            });
        } catch (pickerError) {
             console.error("Image Picker Error:", pickerError);
             Alert.alert("Image Picker Error", "Could not open the image library.");
             setIgnoreBackdropPress(false); // Reset flag on picker error
             return;
        } finally {
            // Clear any existing timer before setting a new one
            if (ignoreBackdropTimer.current) {
                clearTimeout(ignoreBackdropTimer.current);
                console.log("Cleared existing backdrop ignore timer");
            }
            // Set a timer to reset the flag shortly after the picker potentially closes
            ignoreBackdropTimer.current = setTimeout(() => {
                setIgnoreBackdropPress(false);
                ignoreBackdropTimer.current = null; // Clear the ref after timeout runs
                console.log("Reset ignoreBackdropPress = false after timeout");
            }, 300); // 300ms delay
            console.log("Set backdrop ignore timer (300ms)");
        }


        if (pickerResult.canceled) {
            console.log("Image picker cancelled by user.");
            // Flag reset is handled by the timer set in 'finally' block above
            return;
        }

        if (pickerResult.assets && pickerResult.assets.length > 0) {
            const asset: ImagePicker.ImagePickerAsset = pickerResult.assets[0];
            setImageLoading(true);
            setErrors({}); // Clear previous errors
            setMode('normal'); // Switch to normal mode to show results

            try {
                const assetForApi = {
                    uri: asset.uri,
                    fileName: asset.fileName ?? undefined, // Converts null to undefined
                    type: asset.mimeType ?? undefined,    // Use mimeType, pass undefined if null/undefined
                };
                console.log("Asset for API:", assetForApi); // Log the asset being sent

                const macrosWithFoodName: MacrosWithFoodName = await getMacrosForImageFile(assetForApi);
                console.log("Received Macros:", macrosWithFoodName); // Log the response

                // Update input fields
                handleInputChange("name", macrosWithFoodName.foodName, !!editFood);
                handleInputChange("calories", String(Math.round(macrosWithFoodName.calories)), !!editFood);
                handleInputChange("protein", String(Math.round(macrosWithFoodName.protein)), !!editFood);
                handleInputChange("carbs", String(Math.round(macrosWithFoodName.carbs)), !!editFood);
                handleInputChange("fat", String(Math.round(macrosWithFoodName.fat)), !!editFood);

                Toast.show({ type: 'success', text1: 'Food info populated from image!', position: 'bottom' });

            } catch (error: any) {
                console.error("AI Image Analysis Error:", error);
                // Attempt to provide a more specific error message
                const errorMessage = error?.response?.data?.error || // Example for Axios
                                     error?.message ||
                                     "Could not get nutritional info from the image. Please try again or enter manually.";
                Alert.alert(
                    "Image Analysis Error",
                     errorMessage
                );
            } finally {
                setImageLoading(false);
                // Flag reset is handled by the timer set earlier
            }
        } else {
             console.log("Image picker finished without assets (not cancelled).");
             // Flag reset is handled by the timer set earlier
        }
    };
    // ---- End UPDATED Image Picker Logic ----

    // Wrapper function for backdrop press logic
    const handleBackdropPress = () => {
        if (!ignoreBackdropPress) {
            console.log("Backdrop press occurred, closing modal.");
            toggleOverlay(); // Only toggle if the flag is false
        } else {
            console.log("Backdrop press ignored due to recent image picker activity.");
            // Optional: You might want to reset the flag here immediately
            // if a backdrop press happens *while* ignored, depending on exact desired behavior.
            // setIgnoreBackdropPress(false);
            // if (ignoreBackdropTimer.current) clearTimeout(ignoreBackdropTimer.current);
        }
    };


    // Combine theme-dependent and static styles
    const combinedOverlayStyle = StyleSheet.flatten([
        styles.overlayStyle,
        { backgroundColor: theme.colors.background }
    ]);

  return (
    <Overlay
      isVisible={isVisible}
      onBackdropPress={handleBackdropPress} // <-- Use the wrapper function here
      animationType="fade"
      overlayStyle={styles.overlayContainer}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={styles.keyboardAvoidingView}
        keyboardVerticalOffset={KEYBOARD_VERTICAL_OFFSET}
      >
        <View style={combinedOverlayStyle}>
          {/* Header */}
          <View style={styles.header}>
            <Text h4 style={styles.overlayTitle}>
              {editFood ? "Edit Food" : "Add New Food"}
            </Text>
            <Button // Add/Update Button moved to header right
                title={editFood ? "Update" : "Add"}
                onPress={() => handleCreateOrUpdate(!!editFood)}
                buttonStyle={[
                    styles.button,
                    styles.saveButton, // Specific style for save
                    {
                    backgroundColor: editFood
                        ? theme.colors.warning
                        : theme.colors.primary,
                    },
                ]}
                titleStyle={styles.saveButtonTitle}
                loading={loading} // Loading state for this button
                disabled={loading || aiButtonLoading || imageLoading} // Disable while any operation is loading
                containerStyle={styles.buttonContainer}
                />
             <Icon // Close Icon
              name="close"
              type="material"
              size={28}
              color={theme.colors.text}
              onPress={toggleOverlay} // Standard close press doesn't need the flag logic
              containerStyle={styles.closeIcon}
            />
          </View>

          {/* Scrollable Content Area */}
          <ScrollView keyboardShouldPersistTaps="handled" style={styles.scrollView}>
            {/* --- Food Name Input --- */}
            <Input
              label="Food Name"
              labelStyle={{ color: theme.colors.text }}
              value={getValue("name")}
              onChangeText={(text) =>
                handleInputChange("name", text, !!editFood)
              }
              errorMessage={errors.name}
              inputContainerStyle={styles.inputContainerStyle}
              inputStyle={styles.inputStyle}
              leftIcon={
                <MaterialCommunityIcons
                  name="food-apple"
                  size={24}
                  color={errors.name ? theme.colors.error : theme.colors.grey1}
                />
              }
            />

            {/* --- Mode Toggle Area --- */}
            {mode === "normal" && (
                // Use a View for better layout control if needed
                <View>
                    <Button
                    title="Enter Ingredients Manually"
                    type="outline"
                    icon={<MaterialCommunityIcons name="pencil-outline" size={18} color={theme.colors.primary} style={{ marginRight: 8 }} />}
                    onPress={() => setMode('ingredients')}
                    buttonStyle={[styles.button, styles.modeToggleButton]}
                    titleStyle={[styles.modeToggleButtonTitle, { color: theme.colors.primary}]}
                    containerStyle={[styles.buttonContainer, styles.modeToggleContainer]}
                    disabled={loading || aiButtonLoading || imageLoading} // Disable if loading
                    />
                </View>
            )}

            {/* --- Manual Macro Inputs (Normal Mode) --- */}
            {mode === "normal" && (
              <>
                {/* Calories, Protein, Carbs, Fat Inputs */}
                 <Input
                  label="Calories (per 100g)"
                  labelStyle={{ color: theme.colors.text }}
                  keyboardType="numeric"
                  value={getValue("calories")}
                  onChangeText={(text) =>
                    handleInputChange(
                      "calories",
                      text.replace(/[^0-9.]/g, '').replace(/(\..*)\./g, '$1'),
                      !!editFood
                    )
                  }
                  errorMessage={errors.calories}
                  inputContainerStyle={styles.inputContainerStyle}
                  inputStyle={styles.inputStyle}
                  leftIcon={
                    <MaterialCommunityIcons
                      name="fire" size={24}
                      color={ errors.calories ? theme.colors.error : theme.colors.grey1 }
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
                      text.replace(/[^0-9.]/g, '').replace(/(\..*)\./g, '$1'),
                      !!editFood
                    )
                  }
                  errorMessage={errors.protein}
                  inputContainerStyle={styles.inputContainerStyle}
                  inputStyle={styles.inputStyle}
                  leftIcon={
                    <MaterialCommunityIcons
                      name="food-drumstick" size={24}
                      color={ errors.protein ? theme.colors.error : theme.colors.grey1 }
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
                      text.replace(/[^0-9.]/g, '').replace(/(\..*)\./g, '$1'),
                      !!editFood
                    )
                  }
                  errorMessage={errors.carbs}
                  inputContainerStyle={styles.inputContainerStyle}
                  inputStyle={styles.inputStyle}
                  leftIcon={
                    <MaterialCommunityIcons
                      name="bread-slice" size={24}
                      color={ errors.carbs ? theme.colors.error : theme.colors.grey1 }
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
                      text.replace(/[^0-9.]/g, '').replace(/(\..*)\./g, '$1'),
                      !!editFood
                    )
                  }
                  errorMessage={errors.fat}
                  inputContainerStyle={styles.inputContainerStyle}
                  inputStyle={styles.inputStyle}
                  leftIcon={
                    <MaterialCommunityIcons
                      name="oil" size={24}
                      color={ errors.fat ? theme.colors.error : theme.colors.grey1 }
                    />
                  }
                />
              </>
            )}

            {/* --- Ingredients Input (Ingredients Mode) --- */}
            {mode === "ingredients" && (
              <>
                <View style={styles.backButtonContainer}>
                  <Icon
                    name="arrow-left"
                    type="material-community"
                    size={24}
                    color={theme.colors.primary}
                    onPress={() => !loading && !aiButtonLoading && !imageLoading && setMode("normal")} // Prevent changing mode while loading
                    containerStyle={styles.backIcon}
                  />
                  <Text style={styles.backButtonText} onPress={() => !loading && !aiButtonLoading && !imageLoading && setMode("normal")}>Back to Manual Macro Input</Text>
                </View>

                <Input
                  label="Ingredients (Optional)"
                  labelStyle={{ color: theme.colors.text }}
                  value={ingredients}
                  onChangeText={setIngredients}
                  multiline={true}
                  numberOfLines={4}
                  inputContainerStyle={[styles.inputContainerStyle, styles.multilineInputContainer]}
                  inputStyle={[styles.inputStyle, styles.multilineInput]}
                  placeholder="e.g.\n100g Chicken Breast\n50g Rice\n1 tbsp Olive Oil\n(AI will calculate macros per 100g of the total)"
                  placeholderTextColor={theme.colors.grey3}
                  leftIcon={
                    <MaterialCommunityIcons
                      name="format-list-bulleted"
                      size={24}
                      color={theme.colors.grey1}
                      style={styles.multilineIcon}
                    />
                  }
                />
                 {/* AI Button specific to ingredients mode */}
                 <Button
                    title={ingredients ? "Get Macros from Ingredients" : "Get Macros from Name Only"}
                    onPress={handleAiTextButtonClick}
                    buttonStyle={[ styles.button, styles.aiButton, { backgroundColor: theme.colors.secondary } ]}
                    titleStyle={[styles.aiButtonTitle, { color: theme.colors.white }]}
                    loading={aiButtonLoading} // Use aiButtonLoading here
                    disabled={loading || aiButtonLoading || imageLoading} // Disable if other actions loading
                    icon={<MaterialCommunityIcons name="brain" size={18} color={theme.colors.white} style={{ marginRight: 8 }} />}
                    containerStyle={[styles.buttonContainer, { marginTop: 10, marginBottom: 15 }]} // Add bottom margin
                 />
              </>
            )}

            {/* --- AI Options Separator (Optional) --- */}
            {mode === 'normal' && ( // Only show separator/image option in normal mode
                <>
                    <View style={styles.separatorContainer}>
                        <View style={styles.separatorLine} />
                        <Text style={styles.separatorText}>OR</Text>
                        <View style={styles.separatorLine} />
                    </View>


                    {/* --- AI Image Button --- */}
                    <Button
                    title="Get Info from Image"
                    onPress={pickImage} // Function now passes asset correctly
                    buttonStyle={[
                        styles.button,
                        styles.aiButton, // Reuse AI button style
                        { backgroundColor: theme.colors.success }, // Use a different color (e.g., green)
                    ]}
                    titleStyle={[styles.aiButtonTitle, { color: theme.colors.white }]}
                    loading={imageLoading} // Use imageLoading state
                    disabled={loading || aiButtonLoading || imageLoading} // Disable if other actions loading
                    icon={
                        <MaterialCommunityIcons
                            name="camera-image" // Camera icon
                            size={18}
                            color={theme.colors.white}
                            style={{ marginRight: 8 }}
                        />
                    }
                    containerStyle={[styles.buttonContainer, { marginTop: 5 }]} // Adjust margin
                    />
                </>
            )}


            {/* Future Barcode Input Placeholder */}
            {mode === 'normal' && ( // Only show placeholder in normal mode
                <View style={styles.futureInputContainer}>
                <Text style={styles.futureInputLabel}>
                    Barcode Input (Coming Soon)
                </Text>
                </View>
            )}

             {/* Add some bottom padding inside scrollview */}
             <View style={{ height: 40 }} />

          </ScrollView>
        </View>
      </KeyboardAvoidingView>
      {/* General API Loading Overlay - can be removed if only button loading is used */}
      {/* {apiLoading && ( // Example for a potential future general loading overlay
        <View style={styles.loadingOverlay}>
          <ActivityIndicator size="large" color={theme.colors.primary} />
        </View>
      )} */}
    </Overlay>
  );
};


// --- Styles (Keep existing styles, no changes needed here for the fix) ---
const useStyles = makeStyles((theme) => ({
  overlayContainer: {
    backgroundColor: 'transparent', // Let inner view handle background
    width: '90%',
    maxWidth: 500,
    padding: 0, // Remove padding here
    borderRadius: 15,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2, },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
    overflow: 'hidden', // Clip inner content to rounded corners
    maxHeight: '90%', // Constraint height
  },
  overlayStyle: { // This is the inner View style
    width: '100%',
    // backgroundColor set dynamically based on theme
    borderRadius: 15, // Match container
    paddingHorizontal: 20,
    paddingTop: 15,
    paddingBottom: 0, // Padding at bottom handled by scrollview/spacer
    maxHeight: '100%', // Take full height of container
    display: 'flex', // Use flexbox for layout
    flexDirection: 'column',
  },
  keyboardAvoidingView: {
    width: "100%",
    // KAV should not restrict height itself, let Overlay/inner View do that
    // maxHeight: '100%', // Remove this or set to 100%
  },
  scrollView: {
    flexShrink: 1, // Allow scroll view to shrink if content is short
    flexGrow: 1, // Allow scroll view to grow if content is long
    // Removed fixed marginBottom, add padding/spacer inside if needed
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingBottom: 15,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.divider,
    // paddingHorizontal: 5, // Adjust if needed
    flexShrink: 0, // Prevent header from shrinking
    marginBottom: 15, // Space below header
  },
  overlayTitle: {
    color: theme.colors.text,
    fontWeight: "bold",
    fontSize: 20,
    flex: 1, // Allow title to expand
    marginRight: 10, // Space before save button
  },
  closeIcon: {
     padding: 5,
     marginLeft: 5, // Space after save button
  },
  inputContainerStyle: {
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.grey4,
    marginBottom: 10,
  },
  inputStyle: {
    color: theme.colors.text,
    marginLeft: 10,
    fontSize: 16,
    paddingVertical: 8,
  },
  multilineInputContainer: {
    borderWidth: 1,
    borderColor: theme.colors.grey4,
    borderRadius: 8,
    paddingVertical: 8,
    paddingHorizontal: 5,
    marginBottom: 10,
    borderBottomWidth: 1, // Keep this if you want underline inside border
    borderBottomColor: theme.colors.grey4,
  },
  multilineInput: {
    marginLeft: 5,
    textAlignVertical: 'top',
    minHeight: 90,
    fontSize: 16,
    color: theme.colors.text,
  },
  multilineIcon: {
      marginTop: 8, // Align icon better with multiline
      marginRight: 5,
  },
  futureInputContainer: {
    backgroundColor: theme.colors.grey5,
    padding: 15,
    borderRadius: 10,
    marginTop: 25,
    marginBottom: 10,
    alignItems: "center",
  },
  futureInputLabel: {
    color: theme.colors.grey2,
    fontStyle: "italic",
  },
  buttonContainer: {
     // Keep it simple, apply margins where needed specifically
  },
  button: {
    borderRadius: 8,
    paddingHorizontal: 15,
    paddingVertical: 10,
  },
   saveButton: {
      paddingHorizontal: 18,
      paddingVertical: 10,
      minWidth: 80,
      marginLeft: 5,
  },
  saveButtonTitle: {
    color: theme.colors.white,
    fontWeight: "600",
    fontSize: 15,
  },
  aiButton: {
     paddingVertical: 12,
     marginTop: 10,
  },
  aiButtonTitle: {
      fontWeight: "600",
      fontSize: 15,
      textAlign: 'center',
  },
  loadingOverlay: {
    position: "absolute", top: 0, left: 0, right: 0, bottom: 0,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "center", alignItems: "center",
    zIndex: 10, borderRadius: 15, // Match overlay border radius
  },
  backButtonContainer: {
    flexDirection: "row", alignItems: "center",
    marginBottom: 15, marginTop: 5,
    alignSelf: 'flex-start',
  },
  backIcon: {
    marginRight: 5, padding: 5,
  },
  backButtonText: {
    color: theme.colors.primary, fontSize: 16, fontWeight: '500',
  },
  modeToggleButton: {
      borderColor: theme.colors.primary,
      borderWidth: 1.5,
      paddingVertical: 8,
  },
  modeToggleButtonTitle: {
      fontSize: 14,
      fontWeight: '600',
  },
   modeToggleContainer: {
      marginTop: 5,
      marginBottom: 20,
      alignSelf: 'center',
  },
   separatorContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      marginVertical: 20,
    },
    separatorLine: {
      flex: 1,
      height: 1,
      backgroundColor: theme.colors.divider,
    },
    separatorText: {
      marginHorizontal: 10,
      color: theme.colors.grey2,
      fontWeight: '500',
      fontSize: 14,
    },
}));


export default AddFoodModal;
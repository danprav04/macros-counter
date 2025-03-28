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
// import { isValidNumberInput, isNotEmpty } from "../utils/validationUtils"; // Assuming these are correct
import * as ImagePicker from 'expo-image-picker'; // Import image picker

// Define MacrosWithFoodName type (if not imported from elsewhere)
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
  handleCreateFood: () => Promise<void>;
  handleUpdateFood: () => Promise<void>;
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
  const [loading, setLoading] = useState(false);
  const [mode, setMode] = useState<"normal" | "ingredients">("normal");
  const [ingredients, setIngredients] = useState("");
  const [aiButtonLoading, setAiButtonLoading] = useState(false);
  const [imageLoading, setImageLoading] = useState(false);
  // ---- NEW STATE AND REF ----
  const [ignoreBackdropPress, setIgnoreBackdropPress] = useState(false);
  const ignoreBackdropTimer = useRef<NodeJS.Timeout | null>(null);
  // ---- END NEW STATE AND REF ----

  // ---- NEW EFFECT FOR TIMER CLEANUP ----
  useEffect(() => {
    // Cleanup timer if component unmounts
    return () => {
      if (ignoreBackdropTimer.current) {
        clearTimeout(ignoreBackdropTimer.current);
        console.log("Cleared backdrop ignore timer on unmount.");
      }
    };
  }, []);
  // ---- END NEW EFFECT ----

  // Effect to reset state when modal becomes visible/hidden
  useEffect(() => {
    if (isVisible) {
      console.log("Modal becoming visible, resetting state.");
      setErrors({});
      setMode("normal");
      setIngredients("");
      setIgnoreBackdropPress(false); // <-- Reset flag when modal becomes visible
       if (ignoreBackdropTimer.current) { // <-- Clear any lingering timer
          clearTimeout(ignoreBackdropTimer.current);
          ignoreBackdropTimer.current = null;
          console.log("Cleared backdrop ignore timer on modal visible.");
       }
      // Reset loading states - good practice
      setLoading(false);
      setAiButtonLoading(false);
      setImageLoading(false);
    } else {
        // Also clear timer if modal is hidden externally (e.g., by successful save)
        if (ignoreBackdropTimer.current) {
          clearTimeout(ignoreBackdropTimer.current);
          ignoreBackdropTimer.current = null;
          console.log("Cleared backdrop ignore timer on modal hidden.");
       }
    }
  }, [isVisible, setErrors]); // Dependencies: isVisible, setErrors

  // --- getValue remains the same ---
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

  // --- handleCreateOrUpdate remains the same ---
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
            bottomOffset: 90,
        });
        return;
        }
        setErrors({});

        try {
        // Temporarily update the state being passed to the handlers
        // This assumes handleInputChange correctly updated parent's newFood/editFood state
        if (isUpdate && editFood) {
             // Ensure editFood actually contains the latest validated values before calling handler
             const finalEditData = { ...editFood, ...dataToValidate };
             // It's better if handleUpdateFood can directly receive the data or relies on the up-to-date state
             // Assuming handleUpdateFood uses the 'editFood' state from parent which *should* be updated by handleInputChange
             await handleUpdateFood();
         } else if (!isUpdate) {
             // Ensure newFood state contains the latest validated values
              // Assuming handleCreateFood uses the 'newFood' state from parent which *should* be updated by handleInputChange
             await handleCreateFood();
         } else {
             throw new Error("Invalid state for update/create.");
         }

        Toast.show({
            type: "success",
            text1: `Food ${isUpdate ? "Updated" : "Created"} Successfully!`,
            position: 'bottom',
            bottomOffset: 90,
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


  // --- handleAiTextButtonClick remains the same ---
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
      setIngredients(""); // Clear ingredients field too
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
        Toast.show({ type: 'info', text1: 'Macro fields populated by AI.', position: 'bottom', bottomOffset: 90 });

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

  // ---- UPDATED: Image Picker Logic with Backdrop Flag ----
  const pickImage = async () => {
      // Request permission
      const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (permissionResult.granted === false) {
          Alert.alert("Permission Required", "You need to allow access to your photos to use this feature.");
          return;
      }

      // ---- SET FLAG BEFORE LAUNCHING ----
      setIgnoreBackdropPress(true);
      console.log("[pickImage] Set ignoreBackdropPress = true");
      // ---- END SET FLAG ----

      let pickerResult;
      try {
           pickerResult = await ImagePicker.launchImageLibraryAsync({
              mediaTypes: ImagePicker.MediaTypeOptions.Images,
              allowsEditing: true, // Let user crop/edit if desired
              quality: 0.7, // Slightly higher quality might help AI
          });
      } catch (pickerError) {
           console.error("Image Picker Error:", pickerError);
           Alert.alert("Image Picker Error", "Could not open the image library.");
           // Reset flag immediately on picker error
           setIgnoreBackdropPress(false);
           console.log("[pickImage] Reset ignoreBackdropPress = false (Picker Error)");
           return;
      } finally {
          // ---- SET TIMER TO RESET FLAG ----
          // Clear any existing timer first
          if (ignoreBackdropTimer.current) {
              clearTimeout(ignoreBackdropTimer.current);
              console.log("[pickImage] Cleared existing backdrop ignore timer in finally.");
          }
          // Set a timer to reset the flag shortly after the picker closes
          ignoreBackdropTimer.current = setTimeout(() => {
              setIgnoreBackdropPress(false);
              ignoreBackdropTimer.current = null; // Clear the ref after timeout runs
              console.log("[pickImage] Reset ignoreBackdropPress = false (Timer fired)");
          }, 500); // Increased delay slightly (500ms) to be safer
          console.log("[pickImage] Set backdrop ignore timer (500ms)");
          // ---- END SET TIMER ----
      }


      if (pickerResult.canceled) {
          console.log("Image picker cancelled by user.");
          // Flag reset is handled by the timer set in 'finally' block above
          return;
      }

      if (pickerResult.assets && pickerResult.assets.length > 0) {
        const asset: ImagePicker.ImagePickerAsset = pickerResult.assets[0];
        console.log("[pickImage] Image selected:", asset.uri);
        setImageLoading(true);
        setErrors({}); // Clear previous errors
        setMode('normal'); // Ensure we are in normal mode to show results

        try {
            // --- MODIFIED LINES ---
            // Prepare asset info for the API function, converting null -> undefined
            const assetForApi = {
                uri: asset.uri,
                fileName: asset.fileName ?? undefined, // Use ?? to convert null/undefined to undefined
                type: asset.mimeType ?? undefined,    // Also handle mimeType consistency
            };
            // --- END MODIFIED LINES ---
            console.log("[pickImage] Asset for API:", assetForApi);

            // Call the updated API function
            const macrosWithFoodName: MacrosWithFoodName = await getMacrosForImageFile(assetForApi);
            // ... rest of the try block
        } catch (error: any) {
            // ... catch block
        } finally {
            // ... finally block
        }
    } else {
         console.log("Image picker finished without assets (not cancelled).");
         // Flag reset is handled by the timer set earlier
    }
  };
  // ---- End UPDATED Image Picker Logic ----

  // ---- NEW: Wrapper function for backdrop press logic ----
  const handleBackdropPress = () => {
      if (!ignoreBackdropPress) {
          console.log("Backdrop press detected, closing modal.");
          toggleOverlay(); // Only toggle if the flag is false
      } else {
          console.log("Backdrop press ignored due to recent image picker activity.");
          // Optional: Reset the flag immediately if a press occurs while ignored?
          // This might be too aggressive, the timer approach is usually better.
          // setIgnoreBackdropPress(false);
          // if (ignoreBackdropTimer.current) clearTimeout(ignoreBackdropTimer.current);
      }
  };
  // ---- END NEW WRAPPER ----

  const combinedOverlayStyle = StyleSheet.flatten([
        styles.overlayStyle,
        { backgroundColor: theme.colors.background }
    ]);

  return (
    <Overlay
      isVisible={isVisible}
      // ---- USE WRAPPER FUNCTION ----
      onBackdropPress={handleBackdropPress}
      // ---- END USE WRAPPER ----
      animationType="fade"
      overlayStyle={styles.overlayContainer} // Use container style here
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={styles.keyboardAvoidingView}
        keyboardVerticalOffset={KEYBOARD_VERTICAL_OFFSET}
      >
        {/* Inner View handles background and padding */}
        <View style={combinedOverlayStyle}>
          {/* Header */}
           <View style={styles.header}>
            <Text h4 style={styles.overlayTitle}>
              {editFood ? "Edit Food" : "Add New Food"}
            </Text>
            {/* Save/Update Button */}
            <Button
                title={editFood ? "Update" : "Add"}
                onPress={() => handleCreateOrUpdate(!!editFood)}
                buttonStyle={[
                    styles.button,
                    styles.saveButton, // Specific style for save
                    {
                    backgroundColor: editFood
                        ? theme.colors.warning // Orange for update
                        : theme.colors.primary, // Primary for add
                    },
                ]}
                titleStyle={styles.saveButtonTitle}
                loading={loading} // Loading state for this button
                disabled={loading || aiButtonLoading || imageLoading} // Disable while any operation is loading
                containerStyle={styles.buttonContainer} // Keep container simple
                />
             {/* Close Icon */}
             <Icon
              name="close"
              type="material"
              size={28}
              color={theme.colors.grey1} // Slightly muted close icon
              onPress={toggleOverlay} // Standard close press doesn't need the flag logic
              containerStyle={styles.closeIcon}
              disabled={loading || aiButtonLoading || imageLoading} // Disable close if loading
            />
          </View>

          {/* Scrollable Content Area */}
          <ScrollView
             keyboardShouldPersistTaps="handled"
             style={styles.scrollView}
             contentContainerStyle={styles.scrollViewContent} // Add for padding
          >
            {/* --- Food Name Input --- */}
            <Input
              label="Food Name"
              labelStyle={[styles.labelStyle, { color: theme.colors.text }]}
              value={getValue("name")}
              onChangeText={(text) =>
                handleInputChange("name", text, !!editFood)
              }
              errorMessage={errors.name}
              inputContainerStyle={styles.inputContainerStyle}
              inputStyle={[styles.inputStyle, { color: theme.colors.text }]}
              errorStyle={styles.errorStyle}
              leftIcon={
                <MaterialCommunityIcons
                  name="food-apple"
                  size={24}
                  color={errors.name ? theme.colors.error : theme.colors.grey1}
                  style={styles.iconStyle}
                />
              }
              disabled={loading || aiButtonLoading || imageLoading} // Disable input when loading
            />

            {/* --- Mode Toggle Area --- */}
            {mode === "normal" && (
                <View style={styles.modeToggleOuterContainer}>
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
                {/* Calories Input */}
                 <Input
                  label="Calories (per 100g)"
                  labelStyle={[styles.labelStyle, { color: theme.colors.text }]}
                  keyboardType="numeric"
                  value={getValue("calories")}
                  onChangeText={(text) => handleInputChange("calories", text, !!editFood) } // Let handleInputChange handle filtering
                  errorMessage={errors.calories}
                  inputContainerStyle={styles.inputContainerStyle}
                  inputStyle={[styles.inputStyle, { color: theme.colors.text }]}
                  errorStyle={styles.errorStyle}
                  leftIcon={ <MaterialCommunityIcons name="fire" size={24} color={ errors.calories ? theme.colors.error : theme.colors.grey1 } style={styles.iconStyle}/> }
                  disabled={loading || aiButtonLoading || imageLoading}
                />
                {/* Protein Input */}
                <Input
                  label="Protein (per 100g)"
                  labelStyle={[styles.labelStyle, { color: theme.colors.text }]}
                  keyboardType="numeric"
                  value={getValue("protein")}
                  onChangeText={(text) => handleInputChange("protein", text, !!editFood) }
                  errorMessage={errors.protein}
                  inputContainerStyle={styles.inputContainerStyle}
                  inputStyle={[styles.inputStyle, { color: theme.colors.text }]}
                  errorStyle={styles.errorStyle}
                  leftIcon={ <MaterialCommunityIcons name="food-drumstick" size={24} color={ errors.protein ? theme.colors.error : theme.colors.grey1 } style={styles.iconStyle}/> }
                   disabled={loading || aiButtonLoading || imageLoading}
                />
                {/* Carbs Input */}
                 <Input
                  label="Carbs (per 100g)"
                  labelStyle={[styles.labelStyle, { color: theme.colors.text }]}
                  keyboardType="numeric"
                  value={getValue("carbs")}
                  onChangeText={(text) => handleInputChange("carbs", text, !!editFood) }
                  errorMessage={errors.carbs}
                  inputContainerStyle={styles.inputContainerStyle}
                  inputStyle={[styles.inputStyle, { color: theme.colors.text }]}
                  errorStyle={styles.errorStyle}
                  leftIcon={ <MaterialCommunityIcons name="bread-slice" size={24} color={ errors.carbs ? theme.colors.error : theme.colors.grey1 } style={styles.iconStyle}/> }
                  disabled={loading || aiButtonLoading || imageLoading}
                />
                {/* Fat Input */}
                <Input
                  label="Fat (per 100g)"
                  labelStyle={[styles.labelStyle, { color: theme.colors.text }]}
                  keyboardType="numeric"
                  value={getValue("fat")}
                  onChangeText={(text) => handleInputChange("fat", text, !!editFood) }
                  errorMessage={errors.fat}
                  inputContainerStyle={styles.inputContainerStyle}
                  inputStyle={[styles.inputStyle, { color: theme.colors.text }]}
                  errorStyle={styles.errorStyle}
                  leftIcon={ <MaterialCommunityIcons name="oil" size={24} color={ errors.fat ? theme.colors.error : theme.colors.grey1 } style={styles.iconStyle}/> }
                  disabled={loading || aiButtonLoading || imageLoading}
                />
              </>
            )}

            {/* --- Ingredients Input (Ingredients Mode) --- */}
            {mode === "ingredients" && (
              <>
                {/* Back Button */}
                <View style={styles.backButtonContainer}>
                  <Icon
                    name="arrow-left"
                    type="material-community"
                    size={24}
                    color={theme.colors.primary}
                    onPress={() => !loading && !aiButtonLoading && !imageLoading && setMode("normal")} // Prevent changing mode while loading
                    containerStyle={styles.backIcon}
                    disabled={loading || aiButtonLoading || imageLoading}
                  />
                  <Text style={styles.backButtonText} onPress={() => !loading && !aiButtonLoading && !imageLoading && setMode("normal")}>Back to Manual Macro Input</Text>
                </View>

                {/* Ingredients Text Area */}
                <Input
                  label="Ingredients (Optional)"
                  labelStyle={[styles.labelStyle, { color: theme.colors.text }]}
                  value={ingredients}
                  onChangeText={setIngredients}
                  multiline={true}
                  numberOfLines={4}
                  inputContainerStyle={[styles.inputContainerStyle, styles.multilineInputContainer]}
                  inputStyle={[styles.inputStyle, styles.multilineInput, { color: theme.colors.text }]}
                  placeholder="e.g.\n100g Chicken Breast\n50g Rice\n1 tbsp Olive Oil\n(AI will estimate macros per 100g of the combined food)"
                  placeholderTextColor={theme.colors.grey3}
                  leftIcon={
                    <MaterialCommunityIcons
                      name="format-list-bulleted"
                      size={24}
                      color={theme.colors.grey1}
                      style={[styles.iconStyle, styles.multilineIcon]}
                    />
                  }
                   disabled={loading || aiButtonLoading || imageLoading}
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

             {/* --- AI Options Separator (Only in Normal Mode) --- */}
            {mode === 'normal' && (
                <>
                    <View style={styles.separatorContainer}>
                        <View style={[styles.separatorLine, { backgroundColor: theme.colors.divider }]} />
                        <Text style={[styles.separatorText, { color: theme.colors.grey2 }]}>OR</Text>
                        <View style={[styles.separatorLine, { backgroundColor: theme.colors.divider }]} />
                    </View>

                    {/* --- AI Image Button --- */}
                    <Button
                    title="Get Info from Image"
                    onPress={pickImage}
                    buttonStyle={[
                        styles.button,
                        styles.aiButton, // Reuse AI button style
                        { backgroundColor: theme.colors.success }, // Use a different color (e.g., green)
                    ]}
                    titleStyle={[styles.aiButtonTitle, { color: theme.colors.white }]}
                    loading={imageLoading} // Use imageLoading state
                    disabled={loading || aiButtonLoading || imageLoading} // Disable if other actions loading
                    icon={ <MaterialCommunityIcons name="camera-image" size={18} color={theme.colors.white} style={{ marginRight: 8 }} /> }
                    containerStyle={[styles.buttonContainer, { marginTop: 5 }]} // Adjust margin
                    />
                </>
            )}


            {/* Future Barcode Input Placeholder */}
            {mode === 'normal' && ( // Only show placeholder in normal mode
                <View style={[styles.futureInputContainer, { backgroundColor: theme.colors.grey5 }]}>
                <Text style={[styles.futureInputLabel, { color: theme.colors.grey2 }]}>
                    Barcode Input (Coming Soon)
                </Text>
                </View>
            )}

             {/* Add explicit bottom padding inside scrollview */}
             <View style={{ height: 40 }} />

          </ScrollView>
        </View>
      </KeyboardAvoidingView>
      {/* Optional: Global Loading indicator if needed, but button indicators are often better */}
      {(loading || aiButtonLoading || imageLoading) && (
         <View style={styles.loadingOverlay}>
            <ActivityIndicator size="large" color={theme.colors.primary} />
            <Text style={{ color: theme.colors.white, marginTop: 10 }}>Processing...</Text>
         </View>
      )}
    </Overlay>
  );
};


// --- Styles ---
const useStyles = makeStyles((theme) => ({
  // Overlay container - handles size, shape, shadow
  overlayContainer: {
    backgroundColor: 'transparent', // Let inner view handle background
    width: '90%',
    maxWidth: 500, // Max width for larger screens
    maxHeight: '90%', // Constraint height
    padding: 0, // Remove padding here
    borderRadius: 15,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.27,
    shadowRadius: 4.65,
    elevation: 6, // Elevation for Android shadow
    overflow: 'hidden', // Clip inner content to rounded corners
  },
  // Inner View - handles background, padding, layout
  overlayStyle: {
    width: '100%',
    height: '100%', // Take full height of container
    // backgroundColor set dynamically based on theme
    borderRadius: 15, // Match container
    paddingHorizontal: 20,
    paddingTop: 15,
    paddingBottom: 0, // Padding at bottom handled by scrollview/spacer
    display: 'flex', // Use flexbox for layout
    flexDirection: 'column',
  },
  keyboardAvoidingView: {
    width: "100%",
    height: "100%", // KAV should fill the overlay container
  },
  scrollView: {
    flex: 1, // Allow scroll view to take available space
    width: '100%',
  },
  scrollViewContent: {
     paddingBottom: 20, // Add padding at the bottom inside the scroll view
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingBottom: 15,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.divider,
    flexShrink: 0, // Prevent header from shrinking
    marginBottom: 15, // Space below header
  },
  overlayTitle: {
    // color: theme.colors.text, // Set dynamically
    fontWeight: "bold",
    fontSize: 20,
    flex: 1, // Allow title to take space
    marginRight: 10, // Space before save button
  },
  closeIcon: {
     // padding: 5, // Removed padding, handled by Icon component touch area
     marginLeft: 10, // Space after save button
  },
  labelStyle: {
     // color: theme.colors.text, // Set dynamically
     fontSize: 14,
     fontWeight: '600',
     marginBottom: 2,
     marginLeft: 4, // Align with input text roughly
  },
  inputContainerStyle: {
    borderBottomWidth: 1,
    // borderBottomColor: theme.colors.grey4, // Set dynamically
    marginBottom: 5, // Reduced margin below input line
    paddingHorizontal: 0, // Remove internal padding if any
  },
  inputStyle: {
    // color: theme.colors.text, // Set dynamically
    fontSize: 16,
    paddingVertical: Platform.OS === 'ios' ? 10 : 8, // Adjust padding for different platforms
    marginLeft: 10, // Space after icon
  },
   errorStyle: {
      marginLeft: 4, // Align error with label
      marginTop: 1,
      marginBottom: 8, // Add margin below error
  },
   iconStyle: {
       marginRight: 0, // Icon directly beside input line start
   },
  multilineInputContainer: {
    borderWidth: 1,
    borderColor: theme.colors.grey4,
    borderRadius: 8,
    paddingVertical: 8,
    paddingHorizontal: 10, // Add horizontal padding inside border
    marginTop: 5, // Space above multiline
    marginBottom: 10,
    borderBottomWidth: 1, // Keep this if you want underline inside border
    borderBottomColor: 'transparent', // Hide the default bottom border of Input
  },
  multilineInput: {
    marginLeft: 5, // Minimal space after icon
    textAlignVertical: 'top',
    minHeight: 90,
    fontSize: 16,
    // color: theme.colors.text, // Set dynamically
    paddingVertical: 0, // Remove default padding
  },
  multilineIcon: {
      marginTop: 0, // Align icon better with multiline top
      marginRight: 5,
  },
  futureInputContainer: {
    // backgroundColor: theme.colors.grey5, // Set dynamically
    padding: 15,
    borderRadius: 10,
    marginTop: 25,
    marginBottom: 10,
    alignItems: "center",
    borderWidth: 1,
    borderColor: theme.colors.divider,
    borderStyle: 'dashed',
  },
  futureInputLabel: {
    // color: theme.colors.grey2, // Set dynamically
    fontStyle: "italic",
  },
  buttonContainer: {
     // Keep it simple, apply margins where needed specifically
     // Removed marginRight/Left as they are applied specifically now
  },
  button: {
    borderRadius: 25, // More rounded buttons
    paddingVertical: 12,
    paddingHorizontal: 15,
  },
   saveButton: {
      paddingHorizontal: 18,
      minWidth: 75, // Slightly smaller min width
      marginLeft: 5, // Space between title and button
      borderRadius: 20, // Match rounding
   },
  saveButtonTitle: {
    color: theme.colors.white,
    fontWeight: "bold", // Bolder save text
    fontSize: 15,
  },
  aiButton: {
     // paddingVertical: 12, // Already set in button
     marginTop: 10,
     borderRadius: 25, // Match rounding
  },
  aiButtonTitle: {
      fontWeight: "600",
      fontSize: 15,
      textAlign: 'center',
  },
  loadingOverlay: {
    position: "absolute", top: 0, left: 0, right: 0, bottom: 0,
    backgroundColor: "rgba(0, 0, 0, 0.6)", // Darker overlay
    justifyContent: "center", alignItems: "center",
    zIndex: 10, borderRadius: 15, // Match overlay border radius
  },
  backButtonContainer: {
    flexDirection: "row", alignItems: "center",
    marginBottom: 15, marginTop: 5,
    alignSelf: 'flex-start', // Align left
    paddingVertical: 5, // Make it easier to tap
  },
  backIcon: {
    marginRight: 5,
    // padding: 5, // Removed padding
  },
  backButtonText: {
    color: theme.colors.primary, fontSize: 16, fontWeight: '500',
  },
  modeToggleOuterContainer: { // Added container for centering
       alignItems: 'center',
       width: '100%',
       marginBottom: 20, // Space below toggle button
  },
  modeToggleButton: {
      borderColor: theme.colors.primary,
      borderWidth: 1,
      paddingVertical: 8,
      paddingHorizontal: 20,
      borderRadius: 20, // Match rounding
  },
  modeToggleButtonTitle: {
      fontSize: 14,
      fontWeight: '600',
  },
   modeToggleContainer: {
      // marginTop: 5, // Removed margin top
      // alignSelf: 'center', // Handled by outer container
   },
   separatorContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      marginVertical: 25, // Increased vertical margin
    },
    separatorLine: {
      flex: 1,
      height: 1,
      // backgroundColor: theme.colors.divider, // Set dynamically
    },
    separatorText: {
      marginHorizontal: 12, // More space around OR
      // color: theme.colors.grey2, // Set dynamically
      fontWeight: '600', // Bolder OR
      fontSize: 14,
    },
}));

export default AddFoodModal;
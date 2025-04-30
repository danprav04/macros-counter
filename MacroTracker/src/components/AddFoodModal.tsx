// src/components/AddFoodModal.tsx
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
    getMacrosFromText,
    getMacrosForImageFile, // Use utility that handles base64/mime
    BackendError,
    determineMimeType // Import mime type util
} from "../utils/macros";
import * as ImagePicker from "expo-image-picker";
import { ImagePickerAsset, ImagePickerResult } from 'expo-image-picker';
import { isNotEmpty } from "../utils/validationUtils"; // Correct validation import
import { compressImageIfNeeded, getBase64FromUri } from '../utils/imageUtils'; // Import shared utilities

interface AddFoodModalProps {
    isVisible: boolean;
    toggleOverlay: () => void;
    newFood: Omit<Food, "id">; // For adding
    editFood: Food | null; // For editing
    errors: { [key: string]: string };
    handleInputChange: (
        key: keyof Omit<Food, "id">,
        value: string,
        isEdit: boolean // Indicate if change applies to editFood or newFood
    ) => void;
    handleCreateFood: () => Promise<void>; // Expects promise for loading state
    handleUpdateFood: () => Promise<void>; // Expects promise for loading state
    validateFood: (food: Omit<Food, "id"> | Food) => { [key: string]: string } | null;
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
    const [loading, setLoading] = useState(false); // For the main Add/Update button
    const [mode, setMode] = useState<"normal" | "ingredients">("normal");
    const [ingredients, setIngredients] = useState("");
    const [aiTextLoading, setAiTextLoading] = useState(false); // Specific loading for recipe/text AI
    const [aiImageLoading, setAiImageLoading] = useState(false); // Specific loading for image AI

    // Reset state when modal visibility changes
    useEffect(() => {
        if (isVisible) {
            setErrors({});
            setMode("normal");
            setIngredients("");
            setAiTextLoading(false);
            setAiImageLoading(false);
            setLoading(false); // Ensure main button loading is reset
        }
    }, [isVisible, setErrors]);

    // Helper to get the current value (from editFood or newFood state)
    const getValue = (key: keyof Omit<Food, "id">): string => {
        const source = editFood ?? newFood;
        const value = source[key];
        // Format numeric fields for display, handle initial 0 for newFood
        if (typeof value === 'number' && key !== 'name') {
            if (value === 0 && source === newFood) return ""; // Show empty for initial 0
            return String(value);
        }
        return String(value ?? ""); // Default to empty string for name if null/undefined
    };

    // Handle Add/Update button press
    const handleCreateOrUpdate = async () => {
        const isUpdate = !!editFood;
        const foodData = isUpdate ? editFood : newFood;
        if (!foodData) return; // Should not happen, but safeguard

        // Prepare data with trimmed name and parsed numbers for validation
        const dataToValidate: Omit<Food, "id"> = {
            name: getValue("name").trim(),
            calories: parseFloat(getValue("calories")) || 0,
            protein: parseFloat(getValue("protein")) || 0,
            carbs: parseFloat(getValue("carbs")) || 0,
            fat: parseFloat(getValue("fat")) || 0,
        };

        const validationErrors = validateFood(dataToValidate);
        if (validationErrors) {
            setErrors(validationErrors);
            Toast.show({ type: "error", text1: "Please fix the errors", position: 'bottom' });
            return;
        }
        setErrors({});
        setLoading(true); // Start loading for the main action button

        try {
            if (isUpdate) {
                await handleUpdateFood(); // Call parent update handler
                Toast.show({ type: "success", text1: `"${dataToValidate.name}" Updated!`, position: 'bottom' });
            } else {
                await handleCreateFood(); // Call parent create handler
                Toast.show({ type: "success", text1: `"${dataToValidate.name}" Added!`, position: 'bottom' });
            }
            toggleOverlay(); // Close modal on success
        } catch (error: any) {
            console.error(`AddFoodModal: Error during ${isUpdate ? 'update' : 'create'} food handler:`, error);
            Alert.alert(
                "Error",
                error.message || `Failed to ${isUpdate ? "update" : "add"} food.`
            );
        } finally {
            setLoading(false); // Stop loading for the main action button
        }
    };

    // Handle AI Text/Recipe button click
    const handleAiTextButtonClick = async () => {
        const currentFoodName = getValue("name").trim(); // Use trimmed name
        const isUpdate = !!editFood;

        if (mode === "normal") {
            // Switch to ingredients mode, clear macro fields
            setMode("ingredients");
            handleInputChange("calories", "", isUpdate);
            handleInputChange("protein", "", isUpdate);
            handleInputChange("carbs", "", isUpdate);
            handleInputChange("fat", "", isUpdate);
        } else { // mode === "ingredients"
            if (!currentFoodName && !ingredients.trim()) {
                Alert.alert("Input Needed", "Please enter a food name or ingredients to analyze.");
                return;
            }
            setAiTextLoading(true);
            try {
                // Call utility which uses backend service
                const macros = await getMacrosFromText(currentFoodName, ingredients);
                // Update form fields with results (rounded)
                handleInputChange("calories", String(Math.round(macros.calories)), isUpdate);
                handleInputChange("protein", String(Math.round(macros.protein)), isUpdate);
                handleInputChange("carbs", String(Math.round(macros.carbs)), isUpdate);
                handleInputChange("fat", String(Math.round(macros.fat)), isUpdate);
                setMode("normal"); // Switch back to normal mode
                Toast.show({ type: 'info', text1: 'Macros estimated from text.', position: 'bottom' });
            } catch (error) {
                console.error("AI Macro fetch error (recipe - modal):", error);
                // Alert is handled within getMacrosFromText utility
            } finally {
                setAiTextLoading(false);
            }
        }
    };

    // Handle Get Macros from Image button click
    const handleGetImageAndAnalyze = async () => {
        if (aiImageLoading || aiTextLoading || loading) return; // Prevent if any action is running

        const processImage = async (pickerResult: ImagePickerResult) => {
            if (pickerResult.canceled) {
                console.log("Image selection/capture cancelled");
                return; // Don't set loading false here, handled in outer block
            }

            if (pickerResult.assets && pickerResult.assets.length > 0) {
                const originalAsset = pickerResult.assets[0];
                console.log("Image acquired:", originalAsset.uri);
                setAiImageLoading(true); // Start image-specific loading

                try {
                     // Compress the image using the shared utility
                     const compressedResult = await compressImageIfNeeded(originalAsset);
                     const assetForAnalysis = compressedResult
                         ? { ...originalAsset, uri: compressedResult.uri, width: compressedResult.width, height: compressedResult.height, mimeType: 'image/jpeg' }
                         : originalAsset;

                    // Call utility function which uses backend service
                    // This function now internally handles base64 conversion and MIME type
                    const result = await getMacrosForImageFile(assetForAnalysis);

                    // Update form fields with results
                    const isUpdate = !!editFood;
                    handleInputChange("name", result.foodName, isUpdate);
                    handleInputChange("calories", String(Math.round(result.calories)), isUpdate);
                    handleInputChange("protein", String(Math.round(result.protein)), isUpdate);
                    handleInputChange("carbs", String(Math.round(result.carbs)), isUpdate);
                    handleInputChange("fat", String(Math.round(result.fat)), isUpdate);

                    setMode("normal"); // Ensure normal mode
                    setIngredients(""); // Clear ingredients

                    Toast.show({
                        type: 'success',
                        text1: 'Food Identified!',
                        text2: `Identified as ${result.foodName}. Macros estimated.`,
                        position: 'bottom',
                    });

                } catch (analysisError) {
                    console.error("Error during image analysis (modal):", analysisError);
                    // Alert is handled within getMacrosForImageFile utility
                } finally {
                     setAiImageLoading(false); // Stop image-specific loading
                }
            } else {
                console.log("No assets selected or returned.");
                Alert.alert("Error", "Could not get image asset.");
                // Ensure loading is stopped if picker fails unexpectedly
                setAiImageLoading(false);
            }
        };

        // --- Image Picker Logic ---
        Alert.alert(
            "Get Image",
            "Choose a source for the food image:",
            [
                { text: "Cancel", style: "cancel" },
                {
                    text: "Camera",
                    onPress: async () => {
                        try {
                            const permissionResult = await ImagePicker.requestCameraPermissionsAsync();
                            if (!permissionResult.granted) {
                                Alert.alert("Permission Required", "Camera access is needed."); return;
                            }
                            const cameraResult = await ImagePicker.launchCameraAsync({ quality: 1, exif: false });
                            await processImage(cameraResult); // Process the result
                        } catch (error) {
                            console.error("Error launching camera:", error);
                            Alert.alert("Camera Error", "Could not open the camera.");
                        }
                    },
                },
                {
                    text: "Gallery",
                    onPress: async () => {
                        try {
                            const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
                            if (!permissionResult.granted) {
                                Alert.alert("Permission Required", "Gallery access needed."); return;
                            }
                            const libraryResult = await ImagePicker.launchImageLibraryAsync({
                                mediaTypes: ImagePicker.MediaTypeOptions.Images, quality: 1,
                            });
                            await processImage(libraryResult); // Process the result
                        } catch (error) {
                            console.error("Error launching image library:", error);
                            Alert.alert("Gallery Error", "Could not open the image library.");
                        }
                    },
                },
            ],
            { cancelable: true }
        );
    };

    // --- Computed State ---
    const isAnyLoading = loading || aiTextLoading || aiImageLoading; // Combined loading state

    // --- Render ---
    const combinedOverlayStyle = StyleSheet.flatten([
        styles.overlayStyle,
        { backgroundColor: theme.colors.background }
    ]);

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
                    {/* Header */}
                    <View style={styles.header}>
                        <Text h4 style={styles.overlayTitle}>
                            {editFood ? "Edit Food" : "Add New Food"}
                        </Text>
                        <Button
                            title={editFood ? "Update" : "Add"}
                            onPress={handleCreateOrUpdate}
                            buttonStyle={[ styles.button, { backgroundColor: editFood ? theme.colors.warning : theme.colors.primary } ]}
                            titleStyle={styles.buttonTitle}
                            loading={loading} // Only show loading for the main Add/Update action
                            disabled={isAnyLoading} // Disable if any operation is running
                            containerStyle={styles.buttonContainer}
                        />
                        <Icon
                            name="close" type="material" size={28} color={theme.colors.text}
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
                                label="Food Name" labelStyle={styles.inputLabel}
                                value={getValue("name")}
                                onChangeText={(text) => handleInputChange("name", text, !!editFood)}
                                errorMessage={errors.name}
                                inputContainerStyle={[styles.inputContainerStyle, styles.inputContainerFlex]}
                                inputStyle={styles.inputStyle}
                                containerStyle={{ flex: 1 }}
                                leftIcon={<MaterialCommunityIcons name="food-apple" size={24} color={errors.name ? theme.colors.error : theme.colors.grey1} />}
                                disabled={isAnyLoading} // Disable input while loading
                            />
                            {/* Image Picker/Camera Icon Button */}
                            <TouchableOpacity
                                onPress={handleGetImageAndAnalyze}
                                disabled={isAnyLoading} // Disable while loading
                                style={styles.iconButtonContainer}
                            >
                                {aiImageLoading ? ( // Use specific loading state for this button
                                    <ActivityIndicator size="small" color={theme.colors.primary} />
                                ) : (
                                    <Icon name="camera-enhance-outline" type="material-community" size={28} color={isAnyLoading ? theme.colors.grey3 : theme.colors.primary} />
                                )}
                            </TouchableOpacity>
                        </View>

                        {/* Macro Inputs or Ingredient Input */}
                        {mode === "normal" ? (
                            <>
                                <Input
                                    label="Calories (per 100g)" labelStyle={styles.inputLabel}
                                    keyboardType="numeric" value={getValue("calories")}
                                    onChangeText={(text) => handleInputChange("calories", text, !!editFood)}
                                    errorMessage={errors.calories} inputContainerStyle={styles.inputContainerStyle}
                                    inputStyle={styles.inputStyle}
                                    leftIcon={<MaterialCommunityIcons name="fire" size={24} color={errors.calories ? theme.colors.error : theme.colors.grey1} />}
                                    disabled={isAnyLoading}
                                />
                                <Input
                                    label="Protein (per 100g)" labelStyle={styles.inputLabel}
                                    keyboardType="numeric" value={getValue("protein")}
                                    onChangeText={(text) => handleInputChange("protein", text, !!editFood)}
                                    errorMessage={errors.protein} inputContainerStyle={styles.inputContainerStyle}
                                    inputStyle={styles.inputStyle}
                                    leftIcon={<MaterialCommunityIcons name="food-drumstick" size={24} color={errors.protein ? theme.colors.error : theme.colors.grey1} />}
                                    disabled={isAnyLoading}
                                />
                                <Input
                                    label="Carbs (per 100g)" labelStyle={styles.inputLabel}
                                    keyboardType="numeric" value={getValue("carbs")}
                                    onChangeText={(text) => handleInputChange("carbs", text, !!editFood)}
                                    errorMessage={errors.carbs} inputContainerStyle={styles.inputContainerStyle}
                                    inputStyle={styles.inputStyle}
                                    leftIcon={<MaterialCommunityIcons name="bread-slice" size={24} color={errors.carbs ? theme.colors.error : theme.colors.grey1} />}
                                    disabled={isAnyLoading}
                                />
                                <Input
                                    label="Fat (per 100g)" labelStyle={styles.inputLabel}
                                    keyboardType="numeric" value={getValue("fat")}
                                    onChangeText={(text) => handleInputChange("fat", text, !!editFood)}
                                    errorMessage={errors.fat} inputContainerStyle={styles.inputContainerStyle}
                                    inputStyle={styles.inputStyle}
                                    leftIcon={<MaterialCommunityIcons name="oil" size={24} color={errors.fat ? theme.colors.error : theme.colors.grey1} />}
                                    disabled={isAnyLoading}
                                />
                            </>
                        ) : ( // mode === "ingredients"
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
                                    label="Ingredients (Optional)" labelStyle={styles.inputLabel}
                                    value={ingredients} onChangeText={setIngredients} multiline={true}
                                    numberOfLines={4} inputContainerStyle={[styles.inputContainerStyle, styles.multilineInputContainer]}
                                    inputStyle={[styles.inputStyle, styles.multilineInput]}
                                    placeholder="e.g.\n100g Chicken Breast\n50g Rice\n1 tbsp Olive Oil"
                                    placeholderTextColor={theme.colors.grey3}
                                    leftIcon={<MaterialCommunityIcons name="format-list-bulleted" size={24} color={theme.colors.grey1} style={styles.multilineIcon} />}
                                    disabled={isAnyLoading} // Disable input during any loading
                                />
                            </>
                        )}

                        {/* AI (Text) Button */}
                        <Button
                            title={mode === "normal" ? "Calculate with AI (Recipe/Text)" : ingredients ? "Get Macros from Ingredients" : "Get Macros from Name Only"}
                            onPress={handleAiTextButtonClick}
                            buttonStyle={[styles.button, styles.aiButton, { backgroundColor: theme.colors.secondary }]}
                            titleStyle={styles.aiButtonTitle}
                            loading={aiTextLoading} // Use specific loading state
                            disabled={isAnyLoading} // Disable while any operation runs
                            icon={mode === "normal" ? <MaterialCommunityIcons name="text-box-search-outline" size={18} color={theme.colors.white} style={{ marginRight: 8 }} /> : undefined}
                            containerStyle={[styles.buttonContainer, { marginTop: 15 }]}
                        />

                        {/* Barcode Placeholder */}
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

// --- Styles ---
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
    inputLabel: { color: theme.colors.text, fontWeight: '500', marginBottom: 2, fontSize: 14 },
    inputContainerStyle: { borderBottomWidth: 1, borderBottomColor: theme.colors.grey4, marginBottom: 5, paddingBottom: 2, },
    inputStyle: { color: theme.colors.text, marginLeft: 10, fontSize: 16, },
    multilineInputContainer: {
        borderWidth: 1, borderColor: theme.colors.grey4, borderRadius: 8, paddingVertical: 8,
        paddingHorizontal: 5, marginBottom: 10, borderBottomWidth: 1, borderBottomColor: theme.colors.grey4,
        minHeight: 100, // Ensure decent height for multiline
    },
    multilineInput: { marginLeft: 5, textAlignVertical: 'top', fontSize: 16, color: theme.colors.text, },
    multilineIcon: { marginTop: 8, marginRight: 5, },
    futureInputContainer: {
        backgroundColor: theme.colors.grey5, padding: 15, borderRadius: 10,
        marginTop: 20, marginBottom: 10, alignItems: "center",
    },
    futureInputLabel: { color: theme.colors.grey2, fontStyle: "italic", },
    buttonContainer: { },
    button: { borderRadius: 8, paddingHorizontal: 15, paddingVertical: 10, },
    buttonTitle: { color: theme.colors.white, fontWeight: "600", fontSize: 15 },
    aiButton: { paddingVertical: 12, },
    aiButtonTitle: { fontWeight: "600", fontSize: 15, textAlign: 'center', },
    backButtonContainer: { flexDirection: "row", alignItems: "center", marginBottom: 15, marginTop: 5, },
    backIcon: { marginRight: 5, padding: 5, },
    backButtonText: { color: theme.colors.primary, fontSize: 16, fontWeight: '500', },
    disabledText: { color: theme.colors.grey3, }
}));

export default AddFoodModal;
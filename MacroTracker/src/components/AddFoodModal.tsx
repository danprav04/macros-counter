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
    getMacrosForImageFile,
    BackendError,
    determineMimeType
} from "../utils/macros";
import * as ImagePicker from "expo-image-picker";
import { ImagePickerAsset, ImagePickerResult } from 'expo-image-picker';
import { isNotEmpty } from "../utils/validationUtils";
import { compressImageIfNeeded, getBase64FromUri } from '../utils/imageUtils';
import FoodFormFields from "./FoodFormFields"; // Import the extracted component

interface AddFoodModalProps {
    isVisible: boolean;
    toggleOverlay: () => void;
    newFood: Omit<Food, "id">; // For adding
    editFood: Food | null; // For editing
    errors: { [key: string]: string };
    handleInputChange: (
        key: keyof Omit<Food, "id">,
        value: string,
        isEdit: boolean
    ) => void;
    handleCreateFood: () => Promise<void>;
    handleUpdateFood: () => Promise<void>;
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
    const [loading, setLoading] = useState(false);
    const [mode, setMode] = useState<"normal" | "ingredients">("normal");
    const [ingredients, setIngredients] = useState("");
    const [aiTextLoading, setAiTextLoading] = useState(false);
    const [aiImageLoading, setAiImageLoading] = useState(false);

    useEffect(() => {
        if (isVisible) {
            setErrors({});
            setMode("normal");
            setIngredients("");
            setAiTextLoading(false);
            setAiImageLoading(false);
            setLoading(false);
        }
    }, [isVisible, setErrors]);

    // Helper to get the current food object (editFood or newFood)
    const getCurrentFoodData = (): Partial<Omit<Food, 'id'>> => {
        return editFood ? editFood : newFood;
    };

    // Handle Add/Update button press
    const handleCreateOrUpdate = async () => {
        const isUpdate = !!editFood;
        const currentData = getCurrentFoodData();

        // Ensure name is present and trimmed for validation
        const dataToValidate = {
            name: (currentData.name ?? "").trim(),
            calories: currentData.calories ?? 0,
            protein: currentData.protein ?? 0,
            carbs: currentData.carbs ?? 0,
            fat: currentData.fat ?? 0,
        };

        const validationErrors = validateFood(dataToValidate);
        if (validationErrors) {
            setErrors(validationErrors);
            Toast.show({ type: "error", text1: "Please fix the errors", position: 'bottom' });
            return;
        }
        setErrors({});
        setLoading(true);

        try {
            if (isUpdate) {
                await handleUpdateFood();
                Toast.show({ type: "success", text1: `"${dataToValidate.name}" Updated!`, position: 'bottom' });
            } else {
                await handleCreateFood();
                Toast.show({ type: "success", text1: `"${dataToValidate.name}" Added!`, position: 'bottom' });
            }
            toggleOverlay();
        } catch (error: any) {
            console.error(`AddFoodModal: Error during ${isUpdate ? 'update' : 'create'} food handler:`, error);
            Alert.alert("Error", error.message || `Failed to ${isUpdate ? "update" : "add"} food.`);
        } finally {
            setLoading(false);
        }
    };

    // Handle AI Text/Recipe button click (unchanged)
    const handleAiTextButtonClick = async () => {
        const currentFoodName = (getCurrentFoodData().name ?? "").trim();
        const isUpdate = !!editFood;
        if (mode === "normal") {
            setMode("ingredients");
            handleInputChange("calories", "", isUpdate); handleInputChange("protein", "", isUpdate);
            handleInputChange("carbs", "", isUpdate); handleInputChange("fat", "", isUpdate);
        } else {
            if (!currentFoodName && !ingredients.trim()) { Alert.alert("Input Needed", "Please enter a food name or ingredients to analyze."); return; }
            setAiTextLoading(true);
            try {
                const macros = await getMacrosFromText(currentFoodName, ingredients);
                handleInputChange("calories", String(Math.round(macros.calories)), isUpdate); handleInputChange("protein", String(Math.round(macros.protein)), isUpdate);
                handleInputChange("carbs", String(Math.round(macros.carbs)), isUpdate); handleInputChange("fat", String(Math.round(macros.fat)), isUpdate);
                setMode("normal");
                Toast.show({ type: 'info', text1: 'Macros estimated from text.', position: 'bottom' });
            } catch (error) { console.error("AI Macro fetch error (recipe - modal):", error); }
            finally { setAiTextLoading(false); }
        }
    };

    // Handle Get Macros from Image button click (unchanged)
    const handleGetImageAndAnalyze = async () => {
        if (aiImageLoading || aiTextLoading || loading) return;
        const processImage = async (pickerResult: ImagePickerResult) => {
            if (pickerResult.canceled) return;
            if (pickerResult.assets && pickerResult.assets.length > 0) {
                const originalAsset = pickerResult.assets[0]; setAiImageLoading(true);
                try {
                     const compressedResult = await compressImageIfNeeded(originalAsset);
                     const assetForAnalysis = compressedResult ? { ...originalAsset, uri: compressedResult.uri, width: compressedResult.width, height: compressedResult.height, mimeType: 'image/jpeg' } : originalAsset;
                     const result = await getMacrosForImageFile(assetForAnalysis);
                     const isUpdate = !!editFood;
                     handleInputChange("name", result.foodName, isUpdate); handleInputChange("calories", String(Math.round(result.calories)), isUpdate);
                     handleInputChange("protein", String(Math.round(result.protein)), isUpdate); handleInputChange("carbs", String(Math.round(result.carbs)), isUpdate);
                     handleInputChange("fat", String(Math.round(result.fat)), isUpdate);
                     setMode("normal"); setIngredients("");
                     Toast.show({ type: 'success', text1: 'Food Identified!', text2: `Identified as ${result.foodName}. Macros estimated.`, position: 'bottom', });
                } catch (analysisError) { console.error("Error during image analysis (modal):", analysisError); }
                finally { setAiImageLoading(false); }
            } else { Alert.alert("Error", "Could not get image asset."); setAiImageLoading(false); }
        };
        Alert.alert("Get Image", "Choose a source for the food image:",
            [ { text: "Cancel", style: "cancel" },
              { text: "Camera", onPress: async () => { try { const perm = await ImagePicker.requestCameraPermissionsAsync(); if (!perm.granted) { Alert.alert("Permission Required", "Camera access needed."); return; } const res = await ImagePicker.launchCameraAsync({ quality: 1, exif: false }); await processImage(res); } catch (e) { console.error(e); Alert.alert("Camera Error"); } } },
              { text: "Gallery", onPress: async () => { try { const perm = await ImagePicker.requestMediaLibraryPermissionsAsync(); if (!perm.granted) { Alert.alert("Permission Required", "Gallery access needed."); return; } const res = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ImagePicker.MediaTypeOptions.Images, quality: 1 }); await processImage(res); } catch (e) { console.error(e); Alert.alert("Gallery Error"); } } }, ],
            { cancelable: true }
        );
    };

    // --- Computed State ---
    const isAnyLoading = loading || aiTextLoading || aiImageLoading;

    // --- Render ---
    const combinedOverlayStyle = StyleSheet.flatten([
        styles.overlayStyle,
        { backgroundColor: theme.colors.background }
    ]);

    return (
        <Overlay isVisible={isVisible} onBackdropPress={!isAnyLoading ? toggleOverlay : undefined} animationType="fade" overlayStyle={styles.overlayContainer} >
            <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} style={styles.keyboardAvoidingView} keyboardVerticalOffset={KEYBOARD_VERTICAL_OFFSET} >
                <View style={combinedOverlayStyle}>
                    {/* Header (unchanged) */}
                    <View style={styles.header}>
                        <Text h4 style={styles.overlayTitle}> {editFood ? "Edit Food" : "Add New Food"} </Text>
                        <Button title={editFood ? "Update" : "Add"} onPress={handleCreateOrUpdate}
                                buttonStyle={[ styles.button, { backgroundColor: editFood ? theme.colors.warning : theme.colors.primary } ]}
                                titleStyle={styles.buttonTitle} loading={loading} disabled={isAnyLoading} containerStyle={styles.buttonContainer} />
                        <Icon name="close" type="material" size={28} color={theme.colors.text} onPress={!isAnyLoading ? toggleOverlay : undefined}
                              containerStyle={styles.closeIcon} disabled={isAnyLoading} disabledStyle={{ backgroundColor: 'transparent' }} />
                    </View>

                    <ScrollView keyboardShouldPersistTaps="handled">
                        {/* Image Picker/Camera Icon Button */}
                        <View style={styles.imageButtonContainer}>
                            <TouchableOpacity onPress={handleGetImageAndAnalyze} disabled={isAnyLoading} style={styles.iconButton}>
                                {aiImageLoading ? ( <ActivityIndicator size="small" color={theme.colors.primary} /> ) : (
                                    <Icon name="camera-enhance-outline" type="material-community" size={28} color={isAnyLoading ? theme.colors.grey3 : theme.colors.primary} />
                                )}
                            </TouchableOpacity>
                             <Text style={styles.imageButtonLabel}>Get from Image</Text>
                        </View>

                        {/* Macro Inputs or Ingredient Input */}
                        {mode === "normal" ? (
                             // Use the extracted FoodFormFields component
                            <FoodFormFields
                                values={getCurrentFoodData()} // Pass the current data object
                                errors={errors}
                                onInputChange={handleInputChange}
                                isEditing={!!editFood}
                                disabled={isAnyLoading}
                            />
                        ) : ( // mode === "ingredients"
                            <>
                                <View style={styles.backButtonContainer}>
                                    <Icon name="arrow-left" type="material-community" size={24} color={theme.colors.primary} onPress={() => !isAnyLoading && setMode("normal")} disabled={isAnyLoading} containerStyle={styles.backIcon} />
                                    <Text style={[styles.backButtonText, isAnyLoading && styles.disabledText]} onPress={() => !isAnyLoading && setMode("normal")}> Back to Manual Input </Text>
                                </View>
                                {/* Keep ingredient input here as it's specific to this mode */}
                                 <Input
                                    label="Ingredients (Optional)" labelStyle={styles.inputLabel} value={ingredients} onChangeText={setIngredients} multiline={true}
                                    numberOfLines={4} inputContainerStyle={[styles.inputContainerStyle, styles.multilineInputContainer]} inputStyle={[styles.inputStyle, styles.multilineInput]}
                                    placeholder="e.g.\n100g Chicken Breast\n50g Rice\n1 tbsp Olive Oil" placeholderTextColor={theme.colors.grey3}
                                    leftIcon={<MaterialCommunityIcons name="format-list-bulleted" size={24} color={theme.colors.grey1} style={styles.multilineIcon} />}
                                    disabled={isAnyLoading}
                                />
                            </>
                        )}

                        {/* AI (Text) Button (unchanged) */}
                        <Button
                            title={mode === "normal" ? "Calculate with AI (Recipe/Text)" : ingredients ? "Get Macros from Ingredients" : "Get Macros from Name Only"}
                            onPress={handleAiTextButtonClick} buttonStyle={[styles.button, styles.aiButton, { backgroundColor: theme.colors.secondary }]}
                            titleStyle={styles.aiButtonTitle} loading={aiTextLoading} disabled={isAnyLoading}
                            icon={mode === "normal" ? <MaterialCommunityIcons name="text-box-search-outline" size={18} color={theme.colors.white} style={{ marginRight: 8 }} /> : undefined}
                            containerStyle={[styles.buttonContainer, { marginTop: 15 }]} />

                        {/* Barcode Placeholder (unchanged) */}
                        <View style={styles.futureInputContainer}>
                            <Text style={styles.futureInputLabel}> Barcode Input (Coming Soon) </Text>
                        </View>
                    </ScrollView>
                </View>
            </KeyboardAvoidingView>
        </Overlay>
    );
};

// --- Styles --- (Removed redundant input styles now in FoodFormFields)
const useStyles = makeStyles((theme) => ({
    overlayContainer: {
        backgroundColor: 'transparent', width: '90%', maxWidth: 500, padding: 0, borderRadius: 15,
        shadowColor: "#000", shadowOffset: { width: 0, height: 2, }, shadowOpacity: 0.25,
        shadowRadius: 3.84, elevation: 5, overflow: 'hidden',
    },
    overlayStyle: { width: '100%', borderRadius: 15, padding: 20, paddingBottom: 30, maxHeight: '90%', backgroundColor: theme.colors.background },
    keyboardAvoidingView: { width: "100%", },
    header: {
        flexDirection: "row", justifyContent: "space-between", alignItems: "center",
        marginBottom: 20, paddingBottom: 10, borderBottomWidth: 1, borderBottomColor: theme.colors.divider,
    },
    overlayTitle: { color: theme.colors.text, fontWeight: "bold", fontSize: 20, flexShrink: 1, marginRight: 10, },
    closeIcon: { padding: 5, marginLeft: 10, },
    // Image Button Styles
     imageButtonContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'flex-start', // Align to left
        marginBottom: 15, // Space before next inputs
        paddingHorizontal: 10, // Match input padding
    },
    iconButton: {
        padding: 8,
        marginRight: 8,
        // Optional: add border or background for visual cue
        // borderWidth: 1,
        // borderColor: theme.colors.grey3,
        // borderRadius: 20,
    },
    imageButtonLabel: {
        color: theme.colors.primary,
        fontSize: 14,
        fontWeight: '500',
    },
    // Styles still needed in the modal
    inputLabel: { color: theme.colors.text, fontWeight: '500', marginBottom: 2, fontSize: 14 },
    inputContainerStyle: { borderBottomWidth: 1, borderBottomColor: theme.colors.grey4, marginBottom: 5, paddingBottom: 2, },
    inputStyle: { color: theme.colors.text, marginLeft: 10, fontSize: 16, },
    multilineInputContainer: {
        borderWidth: 1, borderColor: theme.colors.grey4, borderRadius: 8, paddingVertical: 8,
        paddingHorizontal: 5, marginBottom: 10, borderBottomWidth: 1, borderBottomColor: theme.colors.grey4,
        minHeight: 100,
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
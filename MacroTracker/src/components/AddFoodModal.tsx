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
    getMacrosForImageFile,
    BackendError,
} from "../utils/macros";
import * as ImagePicker from "expo-image-picker";
import { ImagePickerResult } from 'expo-image-picker';
import { compressImageIfNeeded } from '../utils/imageUtils';
import FoodFormFields from "./FoodFormFields";
import { t } from '../localization/i18n';

// Use a specific type for the form data
type FoodFormData = Omit<Food, "id" | "createdAt">;

interface AddFoodModalProps {
    isVisible: boolean;
    toggleOverlay: () => void;
    newFood: FoodFormData;
    editFood: Food | null;
    errors: { [key: string]: string };
    handleInputChange: (
        key: keyof FoodFormData,
        value: string,
        isEdit: boolean
    ) => void;
    handleCreateFood: () => Promise<void>;
    handleUpdateFood: () => Promise<void>;
    validateFood: (food: FoodFormData | Food) => { [key: string]: string } | null;
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
            setErrors({}); setMode("normal"); setIngredients("");
            setAiTextLoading(false); setAiImageLoading(false); setLoading(false);
        }
    }, [isVisible, setErrors]);

    const getCurrentFoodData = (): Partial<FoodFormData> | Partial<Food> => {
        return editFood ? editFood : newFood;
    };

    const handleCreateOrUpdate = async () => {
        const isUpdate = !!editFood;
        const currentData = isUpdate ? editFood : newFood;
        
        const dataToValidate: Food | FoodFormData = {
            ...currentData,
            name: (currentData.name ?? "").trim(),
        };

        const validationErrors = validateFood(dataToValidate);
        if (validationErrors) {
            setErrors(validationErrors);
            Toast.show({ type: "error", text1: t('foodListScreen.fixErrors'), position: 'bottom' });
            return;
        }
        setErrors({}); setLoading(true);
        try {
            if (isUpdate) {
                await handleUpdateFood();
                Toast.show({ type: "success", text1: t('foodListScreen.foodUpdated', { foodName: dataToValidate.name }), position: 'bottom' });
            } else {
                await handleCreateFood();
                Toast.show({ type: "success", text1: t('foodListScreen.foodAdded', { foodName: dataToValidate.name }), position: 'bottom' });
            }
            toggleOverlay();
        } catch (error: any) {
            Alert.alert(t('foodListScreen.errorLoad'), error.message || t(isUpdate ? 'foodListScreen.errorUpdateMessage' : 'foodListScreen.errorCreateMessage'));
        } finally { setLoading(false); }
    };

    const handleAiTextButtonClick = async () => {
        const currentFoodName = (getCurrentFoodData().name ?? "").trim();
        const isUpdate = !!editFood;
        if (mode === "normal") {
            setMode("ingredients");
            handleInputChange("calories", "", isUpdate); handleInputChange("protein", "", isUpdate);
            handleInputChange("carbs", "", isUpdate); handleInputChange("fat", "", isUpdate);
        } else {
            if (!currentFoodName && !ingredients.trim()) { Alert.alert(t('addFoodModal.alertInputNeeded'), t('addFoodModal.alertInputNeededMessage')); return; }
            setAiTextLoading(true);
            try {
                const macros = await getMacrosFromText(currentFoodName, ingredients);
                // The 'macros' object now includes 'foodName'
                if (macros.foodName) {
                    handleInputChange("name", macros.foodName, isUpdate);
                }
                handleInputChange("calories", String(Math.round(macros.calories)), isUpdate);
                handleInputChange("protein", String(Math.round(macros.protein)), isUpdate);
                handleInputChange("carbs", String(Math.round(macros.carbs)), isUpdate);
                handleInputChange("fat", String(Math.round(macros.fat)), isUpdate);
                setMode("normal");
                Toast.show({
                    type: 'info',
                    text1: currentFoodName ? t('addFoodModal.macrosEstimatedText') : t('addFoodModal.foodIdentified'),
                    text2: currentFoodName ? undefined : t('addFoodModal.foodIdentifiedMessage', { foodName: macros.foodName }),
                    position: 'bottom'
                });
            } catch (error) {
                console.error("AI Macro fetch error (recipe - modal):", error);
            } finally {
                setAiTextLoading(false);
            }
        }
    };

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
                     handleInputChange("protein", String(Math.round(result.protein)), isUpdate);
                     handleInputChange("carbs", String(Math.round(result.carbs)), isUpdate);
                     handleInputChange("fat", String(Math.round(result.fat)), isUpdate);
                     setMode("normal"); setIngredients("");
                     Toast.show({ type: 'success', text1: t('addFoodModal.foodIdentified'), text2: t('addFoodModal.foodIdentifiedMessage', { foodName: result.foodName }), position: 'bottom', });
                } catch (analysisError) { console.error("Error during image analysis (modal):", analysisError); }
                finally { setAiImageLoading(false); }
            } else { Alert.alert(t('addFoodModal.errorGetImage'), t('addEntryModal.alertQuickAddCouldNotSelect')); setAiImageLoading(false); }
        };
        Alert.alert(t('addFoodModal.errorGetImage'), t('addFoodModal.errorGetImageMessage'),
            [ { text: t('addEntryModal.cancel'), style: "cancel" },
              { text: t('addEntryModal.camera'), onPress: async () => { try { const perm = await ImagePicker.requestCameraPermissionsAsync(); if (!perm.granted) { Alert.alert(t('addFoodModal.errorPermission'), t('addFoodModal.errorCameraPermission')); return; } const res = await ImagePicker.launchCameraAsync({ quality: 1, exif: false }); await processImage(res); } catch (e) { console.error(e); Alert.alert(t('addFoodModal.errorCamera')); } } },
              { text: t('addEntryModal.gallery'), onPress: async () => { try { const perm = await ImagePicker.requestMediaLibraryPermissionsAsync(); if (!perm.granted) { Alert.alert(t('addFoodModal.errorPermission'), t('addEntryModal.alertQuickAddGalleryPermission')); return; } const res = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ImagePicker.MediaTypeOptions.Images, quality: 1 }); await processImage(res); } catch (e) { console.error(e); Alert.alert(t('addFoodModal.errorGallery')); } } }, ],
            { cancelable: true }
        );
    };

    const isAnyLoading = loading || aiTextLoading || aiImageLoading;
    const combinedOverlayStyle = StyleSheet.flatten([ styles.overlayStyle, { backgroundColor: theme.colors.background } ]);

    return (
        <Overlay isVisible={isVisible} onBackdropPress={!isAnyLoading ? toggleOverlay : undefined} animationType="fade" overlayStyle={styles.overlayContainer} >
            <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} style={styles.keyboardAvoidingView} keyboardVerticalOffset={KEYBOARD_VERTICAL_OFFSET} >
                <View style={combinedOverlayStyle}>
                    <View style={styles.header}>
                        <Text h4 style={styles.overlayTitle}> {editFood ? t('addFoodModal.titleEdit') : t('addFoodModal.titleAdd')} </Text>
                        <Button title={editFood ? t('addFoodModal.buttonUpdate') : t('addFoodModal.buttonAdd')} onPress={handleCreateOrUpdate}
                                buttonStyle={[ styles.button, { backgroundColor: editFood ? theme.colors.warning : theme.colors.primary } ]}
                                titleStyle={styles.buttonTitle} loading={loading} disabled={isAnyLoading} containerStyle={styles.buttonContainer} />
                        <Icon name="close" type="material" size={28} color={theme.colors.text} onPress={!isAnyLoading ? toggleOverlay : undefined}
                              containerStyle={styles.closeIcon} disabled={isAnyLoading} disabledStyle={{ backgroundColor: 'transparent' }} />
                    </View>
                    <ScrollView keyboardShouldPersistTaps="handled">
                        <View style={styles.imageButtonContainer}>
                            <TouchableOpacity onPress={handleGetImageAndAnalyze} disabled={isAnyLoading} style={styles.iconButton}>
                                {aiImageLoading ? ( <ActivityIndicator size="small" color={theme.colors.primary} /> ) : (
                                    <Icon name="camera-enhance-outline" type="material-community" size={28} color={isAnyLoading ? theme.colors.grey3 : theme.colors.primary} />
                                )}
                            </TouchableOpacity>
                             <Text style={styles.imageButtonLabel}>{t('addFoodModal.getFromImage')}</Text>
                        </View>
                        {mode === "normal" ? (
                            <FoodFormFields values={getCurrentFoodData()} errors={errors} onInputChange={handleInputChange} isEditing={!!editFood} disabled={isAnyLoading} />
                        ) : (
                            <>
                                <View style={styles.backButtonContainer}>
                                    <Icon name="arrow-left" type="material-community" size={24} color={theme.colors.primary} onPress={() => !isAnyLoading && setMode("normal")} disabled={isAnyLoading} containerStyle={styles.backIcon} />
                                    <Text style={[styles.backButtonText, isAnyLoading && styles.disabledText]} onPress={() => !isAnyLoading && setMode("normal")}> {t('addFoodModal.backToManual')} </Text>
                                </View>
                                 <Input
                                    label={t('addFoodModal.ingredientsOptional')} labelStyle={styles.inputLabel} value={ingredients} onChangeText={setIngredients} multiline={true}
                                    numberOfLines={4} inputContainerStyle={[styles.inputContainerStyle, styles.multilineInputContainer]} inputStyle={[styles.inputStyle, styles.multilineInput]}
                                    placeholder={t('addFoodModal.ingredientsPlaceholder')} placeholderTextColor={theme.colors.grey3}
                                    leftIcon={<MaterialCommunityIcons name="format-list-bulleted" size={24} color={theme.colors.grey3} style={styles.multilineIcon} />}
                                    disabled={isAnyLoading}
                                />
                            </>
                        )}
                        <Button
                            title={mode === "normal" ? t('addFoodModal.aiCalculateRecipe') : ingredients ? t('addFoodModal.aiGetFromIngredients') : t('addFoodModal.aiGetFromNameOnly')}
                            onPress={handleAiTextButtonClick} buttonStyle={[styles.button, styles.aiButton, { backgroundColor: theme.colors.secondary }]}
                            titleStyle={styles.aiButtonTitle} loading={aiTextLoading} disabled={isAnyLoading}
                            icon={mode === "normal" ? <MaterialCommunityIcons name="text-box-search-outline" size={18} color={theme.colors.white} style={{ marginRight: 8 }} /> : undefined}
                            containerStyle={[styles.buttonContainer, { marginTop: 15 }]} />
                        <View style={styles.futureInputContainer}>
                            <Text style={styles.futureInputLabel}> {t('addFoodModal.barcodeComingSoon')} </Text>
                        </View>
                    </ScrollView>
                </View>
            </KeyboardAvoidingView>
        </Overlay>
    );
};

const useStyles = makeStyles((theme) => ({
    overlayContainer: { backgroundColor: 'transparent', width: '90%', maxWidth: 500, padding: 0, borderRadius: 15, shadowColor: "#000", shadowOffset: { width: 0, height: 2, }, shadowOpacity: 0.25, shadowRadius: 3.84, elevation: 5, overflow: 'hidden', },
    overlayStyle: { width: '100%', borderRadius: 15, padding: 20, paddingBottom: 30, maxHeight: '90%', backgroundColor: theme.colors.background },
    keyboardAvoidingView: { width: "100%", },
    header: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 20, paddingBottom: 10, borderBottomWidth: 1, borderBottomColor: theme.colors.divider, },
    overlayTitle: { color: theme.colors.text, fontWeight: "bold", fontSize: 20, flexShrink: 1, marginRight: 10, textAlign: 'left' },
    closeIcon: { padding: 5, marginLeft: 10, },
    imageButtonContainer: { flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-start', marginBottom: 15, paddingHorizontal: 10, },
    iconButton: { padding: 8, marginRight: 8, },
    imageButtonLabel: { color: theme.colors.primary, fontSize: 14, fontWeight: '500', textAlign: 'left' },
    inputLabel: { color: theme.colors.text, fontWeight: '500', marginBottom: 2, fontSize: 14, textAlign: 'left' },
    inputContainerStyle: { borderBottomWidth: 1, borderBottomColor: theme.colors.grey4, marginBottom: 5, paddingBottom: 2, },
    inputStyle: { color: theme.colors.text, marginLeft: 10, fontSize: 16, textAlign: 'left' },
    multilineInputContainer: { borderWidth: 1, borderColor: theme.colors.grey4, borderRadius: 8, paddingVertical: 8, paddingHorizontal: 5, marginBottom: 10, borderBottomWidth: 1, borderBottomColor: theme.colors.grey4, minHeight: 100, },
    multilineInput: { marginLeft: 5, textAlignVertical: 'top', fontSize: 16, color: theme.colors.text, textAlign: 'left' },
    multilineIcon: { marginTop: 8, marginRight: 5, },
    futureInputContainer: { backgroundColor: theme.colors.grey5, padding: 15, borderRadius: 10, marginTop: 20, marginBottom: 10, alignItems: "center", },
    futureInputLabel: { color: theme.colors.secondary, fontStyle: "italic", },
    buttonContainer: { },
    button: { borderRadius: 8, paddingHorizontal: 15, paddingVertical: 10, },
    buttonTitle: { color: theme.colors.white, fontWeight: "600", fontSize: 15 },
    aiButton: { paddingVertical: 12, },
    aiButtonTitle: { fontWeight: "600", fontSize: 15, textAlign: 'center', },
    backButtonContainer: { flexDirection: "row", alignItems: "center", marginBottom: 15, marginTop: 5, },
    backIcon: { marginRight: 5, padding: 5, },
    backButtonText: { color: theme.colors.primary, fontSize: 16, fontWeight: '500', textAlign: 'left' },
    disabledText: { color: theme.colors.grey3, }
}));

export default AddFoodModal;
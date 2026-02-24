// src/components/AddFoodModal.tsx
import React, { useState, useEffect, useMemo, useRef } from "react";
import { View, KeyboardAvoidingView, Platform, ScrollView, StyleSheet, TouchableOpacity } from 'react-native';
import { Alert } from './CustomAlert';
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
import Toast from "react-native-toast-message";
import {
    getMacrosFromText,
    getMacrosForImageFile,
} from "../utils/macros";
import * as ImagePicker from "expo-image-picker";
import { ImagePickerResult } from 'expo-image-picker';
import { compressImageIfNeeded } from '../utils/imageUtils';
import FoodFormFields from "./FoodFormFields";
import { t } from '../localization/i18n';
import { useAuth, AuthContextType } from '../context/AuthContext';
import { useCosts } from '../context/CostsContext';
import PriceTag from './PriceTag';
import useDelayedLoading from '../hooks/useDelayedLoading';
import { calculateBaseFoodGrade, FoodGradeResult } from "../utils/gradingUtils";
import GuestLimitModal from "./GuestLimitModal";
import { useBackgroundTask } from "../hooks/useBackgroundTask";

type FoodFormData = Omit<Food, "id" | "createdAt">;
type InputMode = 'manual' | 'ai';

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
    onRecipeChange?: (recipe: string | undefined) => void; // Optional: for saving recipe text from AI analysis
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
    onRecipeChange,
}) => {
    const { theme } = useTheme();
    const styles = useStyles();
    const { user, refreshUser, isGuest, markAiFeatureUsed } = useAuth() as AuthContextType;
    const { costs } = useCosts();
    const { runBackgroundTask, isBackgroundOptionAvailable, backgroundTask } = useBackgroundTask();

    const [loading, setLoading] = useState(false);
    const [inputMode, setInputMode] = useState<InputMode>('manual');
    const [ingredients, setIngredients] = useState("");
    const [aiTextLoading, setAiTextLoading] = useState(false);
    const [aiImageLoading, setAiImageLoading] = useState(false);

    const [isGuestModalVisible, setIsGuestModalVisible] = useState(false);

    const showLoading = useDelayedLoading(loading);
    const showAiTextLoading = useDelayedLoading(aiTextLoading);
    const showAiImageLoading = useDelayedLoading(aiImageLoading);

    // Auto-close modal after 3 seconds if AI query is still loading
    const autoCloseTimerRef = useRef<NodeJS.Timeout | null>(null);
    useEffect(() => {
        if (aiTextLoading || aiImageLoading) {
            autoCloseTimerRef.current = setTimeout(() => {
                backgroundTask();
                toggleOverlay();
                Alert.alert(
                    t('addFoodModal.taskMovedToBackground'),
                    t('addFoodModal.taskMovedToBackgroundMessage'),
                    [{ text: t('common.dismiss'), style: 'cancel' }]
                );
            }, 3000);
        } else {
            if (autoCloseTimerRef.current) {
                clearTimeout(autoCloseTimerRef.current);
                autoCloseTimerRef.current = null;
            }
        }
        return () => {
            if (autoCloseTimerRef.current) {
                clearTimeout(autoCloseTimerRef.current);
                autoCloseTimerRef.current = null;
            }
        };
    }, [aiTextLoading, aiImageLoading, backgroundTask, toggleOverlay, t]);

    useEffect(() => {
        if (isVisible) {
            setErrors({});
            setIngredients("");
            setAiTextLoading(false);
            setAiImageLoading(false);
            setLoading(false);
            // Reset to manual if editing, or if adding new
            setInputMode('manual');
        }
    }, [isVisible, editFood, setErrors]);

    const checkGuest = (): boolean => {
        if (isGuest) {
            setIsGuestModalVisible(true);
            return true;
        }
        return false;
    };

    const getCurrentFoodData = (): Partial<FoodFormData> | Partial<Food> => {
        return editFood ? editFood : newFood;
    };

    // Calculate live grade based on current input values
    const gradeResult: FoodGradeResult | null = useMemo(() => {
        const currentData = getCurrentFoodData();
        // Construct a temporary Food object with safe defaults for grading
        const tempFood: Food = {
            id: 'temp-grading',
            name: currentData.name || '',
            calories: Number(currentData.calories) || 0,
            protein: Number(currentData.protein) || 0,
            carbs: Number(currentData.carbs) || 0,
            fat: Number(currentData.fat) || 0,
            createdAt: new Date().toISOString(),
        };
        return calculateBaseFoodGrade(tempFood);
    }, [newFood, editFood]);

    // Determine if form is valid for enabling/disabling the submit button
    const isFormValid = useMemo(() => {
        const currentData = getCurrentFoodData();
        const dataToValidate: Food | FoodFormData = {
            ...currentData,
            name: (currentData.name ?? "").trim(),
            calories: Number(currentData.calories) || 0,
            protein: Number(currentData.protein) || 0,
            carbs: Number(currentData.carbs) || 0,
            fat: Number(currentData.fat) || 0,
        };
        // validateFood returns an object with errors if invalid, or null if valid
        const validationResult = validateFood(dataToValidate);
        return validationResult === null;
    }, [newFood, editFood, validateFood]);

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
            } else {
                await handleCreateFood();
            }
            toggleOverlay();
        } catch (error: any) {
            // Errors are handled by the calling screen's implementation
        } finally { setLoading(false); }
    };

    const handleAnalyzeText = async () => {
        if (checkGuest()) return;

        const foodName = (getCurrentFoodData().name ?? "").trim();
        const textToAnalyze = ingredients.trim();
        if (!foodName && !textToAnalyze) {
            Alert.alert(t('addFoodModal.alertInputNeeded'), t('addFoodModal.alertInputNeededMessage'));
            return;
        }

        setAiTextLoading(true);
        try {
            const { result } = await runBackgroundTask(
                t('addFoodModal.analyzeTextButton'),
                'ai_text',
                () => getMacrosFromText(foodName, textToAnalyze, user?.client_id, refreshUser),
                { targetScreen: 'FoodListRoute' }
            );
            const macros = result;
            const isUpdate = !!editFood;

            if (macros.foodName) {
                handleInputChange("name", macros.foodName, isUpdate);
            }
            handleInputChange("calories", String(Math.round(macros.calories)), isUpdate);
            handleInputChange("protein", String(Math.round(macros.protein)), isUpdate);
            handleInputChange("carbs", String(Math.round(macros.carbs)), isUpdate);
            handleInputChange("fat", String(Math.round(macros.fat)), isUpdate);

            // Save the recipe text (ingredients) for later viewing
            if (onRecipeChange && textToAnalyze) {
                onRecipeChange(textToAnalyze);
            }

            setInputMode("manual");
            if (markAiFeatureUsed) markAiFeatureUsed();

            Toast.show({
                type: 'info',
                text1: foodName ? t('addFoodModal.macrosEstimatedText') : t('addFoodModal.foodIdentified'),
                text2: foodName ? undefined : t('addFoodModal.foodIdentifiedMessage', { foodName: macros.foodName }),
                position: 'bottom'
            });
        } catch (error) {
            console.error("AI Macro fetch error (text - modal):", error);
        } finally {
            setAiTextLoading(false);
        }
    };

    const handleGetImageAndAnalyze = async () => {
        if (checkGuest()) return;
        if (aiImageLoading || aiTextLoading || loading) return;
        const processImage = async (pickerResult: ImagePickerResult) => {
            if (pickerResult.canceled) return;
            if (pickerResult.assets && pickerResult.assets.length > 0) {
                const originalAsset = pickerResult.assets[0]; setAiImageLoading(true);
                try {
                    const compressedResult = await compressImageIfNeeded(originalAsset);
                    const assetForAnalysis = compressedResult ? { ...originalAsset, uri: compressedResult.uri, width: compressedResult.width, height: compressedResult.height, mimeType: 'image/jpeg' } : originalAsset;
                    const { result } = await runBackgroundTask(
                        t('addFoodModal.analyzeImageButton'),
                        'ai_image',
                        () => getMacrosForImageFile(assetForAnalysis, user?.client_id, refreshUser),
                        { targetScreen: 'FoodListRoute' }
                    );
                    const isUpdate = !!editFood;
                    handleInputChange("name", result.foodName, isUpdate); handleInputChange("calories", String(Math.round(result.calories)), isUpdate);
                    handleInputChange("protein", String(Math.round(result.protein)), isUpdate);
                    handleInputChange("carbs", String(Math.round(result.carbs)), isUpdate);
                    handleInputChange("fat", String(Math.round(result.fat)), isUpdate);
                    setInputMode("manual");
                    setIngredients("");
                    // Clear recipe when using image analysis (no recipe text for images)
                    if (onRecipeChange) onRecipeChange(undefined);
                    if (markAiFeatureUsed) markAiFeatureUsed();
                    Toast.show({ type: 'success', text1: t('addFoodModal.foodIdentified'), text2: t('addFoodModal.foodIdentifiedMessage', { foodName: result.foodName }), position: 'bottom', });
                } catch (analysisError) { console.error("Error during image analysis (modal):", analysisError); }
                finally { setAiImageLoading(false); }
            } else { Alert.alert(t('addFoodModal.errorGetImage'), t('addEntryModal.alertQuickAddCouldNotSelect')); setAiImageLoading(false); }
        };
        Alert.alert(t('addFoodModal.errorGetImage'), t('addFoodModal.errorGetImageMessage'),
            [{ text: t('addEntryModal.cancel'), style: "cancel" },
            { text: t('addEntryModal.camera'), onPress: async () => { try { const perm = await ImagePicker.requestCameraPermissionsAsync(); if (!perm.granted) { Alert.alert(t('addFoodModal.errorPermission'), t('addFoodModal.errorCameraPermission')); return; } const res = await ImagePicker.launchCameraAsync({ quality: 1, exif: false }); await processImage(res); } catch (e) { console.error(e); Alert.alert(t('addFoodModal.errorCamera')); } } },
            { text: t('addEntryModal.gallery'), onPress: async () => { try { const perm = await ImagePicker.requestMediaLibraryPermissionsAsync(); if (!perm.granted) { Alert.alert(t('addFoodModal.errorPermission'), t('addEntryModal.alertQuickAddGalleryPermission')); return; } const res = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ImagePicker.MediaTypeOptions.Images, quality: 1 }); await processImage(res); } catch (e) { console.error(e); Alert.alert(t('addFoodModal.errorGallery')); } } },],
            { cancelable: true }
        );
    };

    const isAnyLoading = loading || aiTextLoading || aiImageLoading;
    const combinedOverlayStyle = StyleSheet.flatten([styles.overlayStyle, { backgroundColor: theme.colors.background }]);

    return (
        <>
            <Overlay isVisible={isVisible} onBackdropPress={!isAnyLoading ? toggleOverlay : undefined} animationType="fade" overlayStyle={styles.overlayContainer} >
                <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} style={styles.keyboardAvoidingView} keyboardVerticalOffset={KEYBOARD_VERTICAL_OFFSET} >
                    <View style={combinedOverlayStyle}>
                        {/* Header with title and close button */}
                        <View style={styles.header}>
                            <View style={styles.titleContainer}>
                                <Text h4 style={styles.overlayTitle}>
                                    {editFood ? t('addFoodModal.titleEdit') : t('addFoodModal.titleAdd')}
                                </Text>
                                {/* Live Grading Pill */}
                                {inputMode === 'manual' && gradeResult && (
                                    <View style={[styles.gradePill, { backgroundColor: gradeResult.color }]}>
                                        <Text style={styles.gradeText}>{gradeResult.letter}</Text>
                                    </View>
                                )}
                            </View>
                            {isBackgroundOptionAvailable && (
                                <TouchableOpacity onPress={backgroundTask} style={styles.backgroundButton} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
                                    <Icon name="content-save-move-outline" type="material-community" size={24} color={theme.colors.grey3} />
                                </TouchableOpacity>
                            )}
                            <Icon
                                name="close"
                                type="material"
                                size={28}
                                color={theme.colors.grey3}
                                onPress={!isAnyLoading ? toggleOverlay : undefined}
                                containerStyle={styles.closeIcon}
                                disabled={isAnyLoading}
                                disabledStyle={{ backgroundColor: 'transparent' }}
                            />
                        </View>

                        <ScrollView
                            keyboardShouldPersistTaps="handled"
                            contentContainerStyle={styles.scrollContentContainer}
                            showsVerticalScrollIndicator={false}
                        >
                            {/* Mode Selection - Only show when adding new food */}
                            {!editFood && (
                                <View style={styles.modeSelectionContainer}>
                                    <TouchableOpacity
                                        style={[
                                            styles.modeButton,
                                            inputMode === 'manual' && styles.modeButtonActive
                                        ]}
                                        onPress={() => !isAnyLoading && setInputMode('manual')}
                                        disabled={isAnyLoading}
                                        activeOpacity={0.7}
                                    >
                                        <Icon
                                            name="keyboard"
                                            type="material"
                                            size={22}
                                            color={inputMode === 'manual' ? theme.colors.primary : theme.colors.grey3}
                                            containerStyle={styles.modeIcon}
                                        />
                                        <Text style={[
                                            styles.modeButtonText,
                                            inputMode === 'manual' && styles.modeButtonTextActive
                                        ]}>
                                            {t('addFoodModal.manualInput')}
                                        </Text>
                                    </TouchableOpacity>

                                    <TouchableOpacity
                                        style={[
                                            styles.modeButton,
                                            inputMode === 'ai' && styles.modeButtonActive
                                        ]}
                                        onPress={() => !isAnyLoading && setInputMode('ai')}
                                        disabled={isAnyLoading}
                                        activeOpacity={0.7}
                                    >
                                        <Icon
                                            name="auto-awesome"
                                            type="material"
                                            size={22}
                                            color={inputMode === 'ai' ? theme.colors.primary : theme.colors.secondary}
                                            containerStyle={styles.modeIcon}
                                        />
                                        <Text style={[
                                            styles.modeButtonText,
                                            inputMode === 'ai' && styles.modeButtonTextActive
                                        ]}>
                                            {t('addFoodModal.aiAssist')}
                                        </Text>
                                    </TouchableOpacity>
                                </View>
                            )}

                            {/* Content Area */}
                            <View style={styles.contentContainer}>
                                {inputMode === 'manual' ? (
                                    <View style={styles.manualInputContainer}>
                                        <FoodFormFields
                                            values={getCurrentFoodData()}
                                            errors={errors}
                                            onInputChange={handleInputChange}
                                            isEditing={!!editFood}
                                            disabled={isAnyLoading}
                                        />
                                        {/* Medical Disclaimer for Manual Mode */}
                                        <View style={styles.disclaimerContainer}>
                                            <View style={styles.disclaimerRow}>
                                                <Icon name="alert-circle-outline" type="material-community" color={theme.colors.grey3} size={16} style={styles.disclaimerIcon} />
                                                <Text style={styles.disclaimerText}>{t('disclaimers.medicalDisclaimer')}</Text>
                                            </View>
                                        </View>
                                    </View>
                                ) : (
                                    <View style={styles.aiContainer}>
                                        {/* AI Disclaimers - Expanded */}
                                        <View style={styles.aiDisclaimerSection}>
                                            <View style={styles.disclaimerRow}>
                                                <Icon name="information-outline" type="material-community" color={theme.colors.grey3} size={16} style={styles.disclaimerIcon} />
                                                <Text style={styles.disclaimerText}>
                                                    {t('disclaimers.aiWarning')}
                                                </Text>
                                            </View>
                                            <View style={styles.disclaimerRow}>
                                                <Icon name="shield-account-outline" type="material-community" color={theme.colors.grey3} size={16} style={styles.disclaimerIcon} />
                                                <Text style={styles.disclaimerText}>
                                                    {t('disclaimers.sensitiveDataWarning')}
                                                </Text>
                                            </View>
                                            <View style={styles.disclaimerRow}>
                                                <Icon name="alert-circle-outline" type="material-community" color={theme.colors.grey3} size={16} style={styles.disclaimerIcon} />
                                                <Text style={styles.disclaimerText}>{t('disclaimers.medicalDisclaimer')}</Text>
                                            </View>
                                        </View>

                                        {/* Text Analysis Card */}
                                        <View style={styles.aiCard}>
                                            <View style={styles.aiCardHeader}>
                                                <Icon
                                                    name="text-box-search-outline"
                                                    type="material-community"
                                                    size={24}
                                                    color={theme.colors.primary}
                                                />
                                                <Text style={styles.aiCardTitle}>
                                                    {t('addFoodModal.analyzeTextButton')}
                                                </Text>
                                            </View>

                                            <Input
                                                label={t('addFoodModal.ingredientsLabel')}
                                                labelStyle={styles.aiInputLabel}
                                                value={ingredients}
                                                onChangeText={setIngredients}
                                                multiline={true}
                                                numberOfLines={4}
                                                inputContainerStyle={styles.aiInputContainer}
                                                inputStyle={styles.aiInput}
                                                placeholder={t('addFoodModal.ingredientsPlaceholder')}
                                                placeholderTextColor={theme.colors.grey3}
                                                disabled={isAnyLoading}
                                            />

                                            <Button
                                                onPress={handleAnalyzeText}
                                                buttonStyle={styles.aiActionButton}
                                                titleStyle={styles.aiActionButtonTitle}
                                                disabled={isAnyLoading}
                                                loading={showAiTextLoading}
                                                disabledStyle={styles.aiActionButtonDisabled}
                                            >
                                                {!showAiTextLoading && (
                                                    <View style={styles.aiActionButtonContent}>
                                                        <Text style={styles.aiActionButtonTitle}>
                                                            {t('addFoodModal.analyzeTextButton')}
                                                        </Text>
                                                        {costs?.cost_macros_recipe != null && (
                                                            <PriceTag
                                                                amount={costs.cost_macros_recipe}
                                                                type="cost"
                                                                style={styles.priceTagInButton}
                                                            />
                                                        )}
                                                    </View>
                                                )}
                                            </Button>
                                        </View>

                                        {/* Divider */}
                                        <View style={styles.dividerContainer}>
                                            <View style={styles.dividerLine} />
                                            <Text style={styles.dividerText}>{t('addFoodModal.orDivider')}</Text>
                                            <View style={styles.dividerLine} />
                                        </View>

                                        {/* Image Analysis Card */}
                                        <View style={styles.aiCard}>
                                            <View style={styles.aiCardHeader}>
                                                <Icon
                                                    name="camera-enhance-outline"
                                                    type="material-community"
                                                    size={24}
                                                    color={theme.colors.primary}
                                                />
                                                <Text style={styles.aiCardTitle}>
                                                    {t('addFoodModal.analyzeImageButton')}
                                                </Text>
                                            </View>

                                            <Text style={styles.aiCardDescription}>
                                                {t('addFoodModal.analyzeImageDescription')}
                                            </Text>

                                            <Button
                                                onPress={handleGetImageAndAnalyze}
                                                buttonStyle={styles.aiActionButton}
                                                titleStyle={styles.aiActionButtonTitle}
                                                disabled={isAnyLoading}
                                                loading={showAiImageLoading}
                                                disabledStyle={styles.aiActionButtonDisabled}
                                            >
                                                {!showAiImageLoading && (
                                                    <View style={styles.aiActionButtonContent}>
                                                        <Text style={styles.aiActionButtonTitle}>
                                                            {t('addFoodModal.analyzeImageButton')}
                                                        </Text>
                                                        {costs?.cost_macros_image_single != null && (
                                                            <PriceTag
                                                                amount={costs.cost_macros_image_single}
                                                                type="cost"
                                                                style={styles.priceTagInButton}
                                                            />
                                                        )}
                                                    </View>
                                                )}
                                            </Button>
                                        </View>
                                    </View>
                                )}
                            </View>
                        </ScrollView>

                        {/* Footer with action button - Hide if invalid/disabled unless loading */}
                        {(isFormValid || isAnyLoading) && (
                            <View style={styles.footer}>
                                <Button
                                    title={editFood ? t('addFoodModal.buttonUpdate') : t('addFoodModal.buttonAdd')}
                                    onPress={handleCreateOrUpdate}
                                    buttonStyle={[
                                        styles.primaryButton,
                                        { backgroundColor: editFood ? theme.colors.warning : theme.colors.primary }
                                    ]}
                                    titleStyle={styles.primaryButtonTitle}
                                    loading={showLoading}
                                    disabled={isAnyLoading || !isFormValid}
                                    containerStyle={styles.primaryButtonContainer}
                                    disabledStyle={styles.primaryButtonDisabled}
                                />
                            </View>
                        )}
                    </View>
                </KeyboardAvoidingView>
            </Overlay>
            <GuestLimitModal isVisible={isGuestModalVisible} onClose={() => setIsGuestModalVisible(false)} />
        </>
    );
};

const useStyles = makeStyles((theme) => ({
    overlayContainer: {
        backgroundColor: 'transparent',
        width: '92%',
        maxWidth: 520,
        padding: 0,
        borderRadius: 20,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
        elevation: 8,
        overflow: 'hidden',
        maxHeight: '95%',
    },
    overlayStyle: {
        width: '100%',
        borderRadius: 20,
        padding: 0,
        maxHeight: '100%',
        backgroundColor: theme.colors.background,
        display: 'flex',
        flexDirection: 'column',
    },
    keyboardAvoidingView: {
        width: "100%",
        maxHeight: '100%'
    },
    header: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        paddingHorizontal: 20,
        paddingTop: 20,
        paddingBottom: 15,
        borderBottomWidth: 1,
        borderBottomColor: theme.colors.divider,
    },
    titleContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        flex: 1,
    },
    overlayTitle: {
        color: theme.colors.text,
        fontWeight: "700",
        fontSize: 22,
        textAlign: 'left'
    },
    gradePill: {
        marginLeft: 10,
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: 15,
        justifyContent: 'center',
        alignItems: 'center',
    },
    gradeText: {
        color: theme.colors.white,
        fontWeight: 'bold',
        fontSize: 14,
    },
    closeIcon: {
        padding: 4,
    },
    backgroundButton: {
        marginRight: 8,
        padding: 4,
    },
    scrollContentContainer: {
        paddingHorizontal: 20,
        paddingBottom: 10,
    },
    modeSelectionContainer: {
        flexDirection: 'row',
        gap: 12,
        marginTop: 20,
        marginBottom: 20,
    },
    modeButton: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 14,
        paddingHorizontal: 16,
        borderRadius: 12,
        backgroundColor: theme.colors.grey5,
        borderWidth: 2,
        borderColor: 'transparent',
    },
    modeButtonActive: {
        backgroundColor: theme.colors.card,
        borderColor: theme.colors.primary,
    },
    modeIcon: {
        marginRight: 8,
    },
    modeButtonText: {
        fontSize: 15,
        fontWeight: '600',
        color: theme.colors.secondary,
    },
    modeButtonTextActive: {
        color: theme.colors.text,
    },
    contentContainer: {
        flex: 1,
    },
    manualInputContainer: {
        paddingTop: 5,
    },
    aiContainer: {
        paddingTop: 5,
    },
    disclaimerContainer: {
        marginTop: 20,
        paddingHorizontal: 10,
        opacity: 0.8,
    },
    aiDisclaimerSection: {
        marginBottom: 20,
        paddingHorizontal: 5,
        opacity: 0.8,
    },
    disclaimerRow: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        marginBottom: 6,
    },
    disclaimerIcon: {
        marginRight: 8,
        marginTop: 1,
    },
    disclaimerText: {
        fontSize: 12,
        color: theme.colors.grey3,
        fontStyle: 'italic',
        flex: 1,
        lineHeight: 16,
    },
    aiCard: {
        backgroundColor: theme.colors.card,
        borderRadius: 16,
        padding: 16,
        marginBottom: 16,
        borderWidth: 1,
        borderColor: theme.colors.divider,
    },
    aiCardHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 12,
    },
    aiCardTitle: {
        fontSize: 17,
        fontWeight: '600',
        color: theme.colors.text,
        marginLeft: 10,
    },
    aiCardDescription: {
        fontSize: 14,
        color: theme.colors.secondary,
        marginBottom: 12,
        lineHeight: 20,
    },
    aiInputLabel: {
        color: theme.colors.text,
        fontWeight: '500',
        marginBottom: 8,
        fontSize: 14,
    },
    aiInputContainer: {
        borderWidth: 1,
        borderColor: theme.colors.grey4,
        borderRadius: 10,
        paddingVertical: 10,
        paddingHorizontal: 12,
        marginBottom: 12,
        minHeight: 100,
        backgroundColor: theme.colors.background,
    },
    aiInput: {
        color: theme.colors.text,
        fontSize: 15,
        textAlignVertical: 'top',
        lineHeight: 20,
    },
    aiActionButton: {
        backgroundColor: theme.colors.primary,
        borderRadius: 10,
        paddingVertical: 14,
        paddingHorizontal: 20,
    },
    aiActionButtonDisabled: {
        backgroundColor: theme.colors.grey4,
    },
    aiActionButtonContent: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        width: '100%',
    },
    aiActionButtonTitle: {
        color: theme.colors.white,
        fontWeight: '600',
        fontSize: 16,
        marginRight: 8,
    },
    priceTagInButton: {
        backgroundColor: theme.colors.grey2,
    },
    dividerContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        marginVertical: 16,
    },
    dividerLine: {
        flex: 1,
        height: 1,
        backgroundColor: theme.colors.grey4,
    },
    dividerText: {
        marginHorizontal: 16,
        fontSize: 13,
        color: theme.colors.grey2,
        fontWeight: '600',
        textTransform: 'uppercase',
        letterSpacing: 0.5,
    },
    footer: {
        paddingHorizontal: 20,
        paddingTop: 15,
        paddingBottom: 20,
        borderTopWidth: 1,
        borderTopColor: theme.colors.divider,
    },
    primaryButtonContainer: {
        width: '100%',
    },
    primaryButton: {
        borderRadius: 12,
        paddingVertical: 14,
    },
    primaryButtonDisabled: {
        backgroundColor: theme.colors.grey4,
    },
    primaryButtonTitle: {
        color: theme.colors.white,
        fontWeight: '600',
        fontSize: 16,
    },
}));

export default AddFoodModal;
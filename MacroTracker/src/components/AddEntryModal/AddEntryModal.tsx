// src/components/AddEntryModal/AddEntryModal.tsx
import React, { useEffect, useState, useMemo, useCallback, useRef } from "react";
import { View, KeyboardAvoidingView, Platform, Dimensions, StyleSheet, Alert, Keyboard } from "react-native";
import { Overlay, makeStyles, useTheme, Button, Input } from "@rneui/themed";
import { Food } from "../../types/food";
import { isValidNumberInput } from "../../utils/validationUtils";
import { loadRecentFoods, saveRecentFoods, RecentServings, loadRecentServings, saveRecentServings } from "../../services/storageService";
import { getFoodIconUrl } from "../../utils/iconUtils";
import { getGramsFromNaturalLanguage } from "../../utils/units";
import Toast from "react-native-toast-message";
import * as ImagePicker from "expo-image-picker";
import { EstimatedFoodItem, getMultipleFoodsFromImage, getMultipleFoodsFromText, BackendError, determineMimeType } from "../../utils/macros";
import { compressImageIfNeeded, getBase64FromUri } from "../../utils/imageUtils";
import { v4 as uuidv4 } from "uuid";
import QuickAddList from "../QuickAddList";
import { t } from '../../localization/i18n';
import { calculateDailyEntryGrade, FoodGradeResult } from "../../utils/gradingUtils";
import { Settings } from '../../types/settings';
import ModalHeader from './ModalHeader';
import FoodSelectionList from './FoodSelectionList';
import AmountInputSection from './AmountInputSection';

interface AddEntryModalProps {
  isVisible: boolean;
  toggleOverlay: () => void;
  handleAddEntry: (food: Food, grams: number) => void;
  handleAddMultipleEntries: (entries: { food: Food; grams: number }[]) => void;
  foods: Food[];
  isEditMode: boolean;
  initialGrams?: string;
  initialSelectedFoodForEdit?: Food | null;
  onAddNewFoodRequest: () => void;
  onCommitFoodToLibrary: (foodData: Omit<Food, 'id' | 'createdAt'> | Food, isUpdate: boolean) => Promise<Food | null>;
  dailyGoals: Settings['dailyGoals'];
}

const KEYBOARD_VERTICAL_OFFSET = Platform.OS === "ios" ? 80 : 0;
const MAX_RECENT_FOODS = 15;
const MAX_SERVINGS_PER_FOOD = 4;

type UnitMode = "grams" | "auto";
type ModalMode = "normal" | "quickAddSelect" | "quickAddText";

const AddEntryModal: React.FC<AddEntryModalProps> = ({
  isVisible, toggleOverlay, handleAddEntry: parentHandleAddEntry, handleAddMultipleEntries: parentHandleAddMultipleEntries,
  foods, isEditMode, initialGrams, initialSelectedFoodForEdit, onAddNewFoodRequest, onCommitFoodToLibrary, dailyGoals,
}) => {
  const { theme } = useTheme();
  const styles = useStyles();

  const [internalSelectedFood, setInternalSelectedFood] = useState<Food | null>(null);
  const [internalGrams, setInternalGrams] = useState("");
  const [internalSearch, setInternalSearch] = useState("");
  const [recentFoods, setRecentFoods] = useState<Food[]>([]);
  const [recentServings, setRecentServings] = useState<RecentServings>({});
  const [foodIcons, setFoodIcons] = useState<{ [foodName: string]: string | null; }>({});
  const [unitMode, setUnitMode] = useState<UnitMode>("grams");
  const [autoInput, setAutoInput] = useState("");
  const [isAiLoading, setIsAiLoading] = useState(false);

  const [modalMode, setModalMode] = useState<ModalMode>("normal");
  const [quickAddLoading, setQuickAddLoading] = useState(false);
  const [quickAddItems, setQuickAddItems] = useState<EstimatedFoodItem[]>([]);
  const [selectedQuickAddIndices, setSelectedQuickAddIndices] = useState<Set<number>>(new Set());
  const [editingQuickAddItemIndex, setEditingQuickAddItemIndex] = useState<number | null>(null);
  const [editedFoodName, setEditedFoodName] = useState<string>("");
  const [editedGrams, setEditedGrams] = useState<string>("");
  const [selectedMultipleFoods, setSelectedMultipleFoods] = useState<Map<string, { food: Food; grams: number }>>(new Map());
  
  const [quickAddTextInput, setQuickAddTextInput] = useState("");
  const [isTextQuickAddLoading, setIsTextQuickAddLoading] = useState(false);

  const isActionDisabled = isAiLoading || quickAddLoading;

  const resolveAndSetIcon = useCallback((foodName: string) => {
    if (!foodName || foodIcons[foodName] !== undefined) return;
    const icon = getFoodIconUrl(foodName);
    setFoodIcons(prevIcons => ({ ...prevIcons, [foodName]: icon }));
  }, [foodIcons]);

  const foodGradeResult = useMemo((): FoodGradeResult | null => {
    const numericGramsValue = parseFloat(internalGrams);
    if (internalSelectedFood && isValidNumberInput(internalGrams) && numericGramsValue > 0 && dailyGoals) {
        return calculateDailyEntryGrade(internalSelectedFood, numericGramsValue, dailyGoals);
    }
    return null;
  }, [internalSelectedFood, internalGrams, dailyGoals]);

  useEffect(() => {
    const actuallyEditingDailyItem = isEditMode && initialSelectedFoodForEdit && initialGrams !== undefined;
    const isPreSelectedForAdd = !isEditMode && initialSelectedFoodForEdit;

    if (actuallyEditingDailyItem) {
        setModalMode("normal");
        setUnitMode("grams");
        setInternalSelectedFood(initialSelectedFoodForEdit);
        setInternalGrams(initialGrams);
        if (initialSelectedFoodForEdit?.name) resolveAndSetIcon(initialSelectedFoodForEdit.name);
    } else if (isPreSelectedForAdd) {
        setModalMode("normal");
        setUnitMode("grams");
        setInternalSelectedFood(initialSelectedFoodForEdit);
        setInternalGrams(initialGrams || "");
        if (initialSelectedFoodForEdit?.name) resolveAndSetIcon(initialSelectedFoodForEdit.name);
    } 
    
    // Always load recents for non-edit scenarios.
    if (!isEditMode) {
        loadRecentFoods().then(setRecentFoods);
        loadRecentServings().then(setRecentServings);
    }
  }, []); 


  useEffect(() => { recentFoods.forEach(food => resolveAndSetIcon(food.name)); }, [recentFoods, resolveAndSetIcon]);

  const addToRecentFoods = useCallback(async (food: Food) => {
    if (!food || !food.id) return;
    setRecentFoods(prev => {
      const updated = [food, ...prev.filter(f => f.id !== food.id)].slice(0, MAX_RECENT_FOODS);
      saveRecentFoods(updated).catch(() => {}); return updated;
    });
  }, []);

  const addMultipleToRecentServings = useCallback(async (entries: { foodId: string; grams: number }[]) => {
    if (!entries || entries.length === 0) return;
    
    setRecentServings(prevServings => {
        const newServings = { ...prevServings };
        entries.forEach(({ foodId, grams }) => {
            const roundedGrams = Math.round(grams);
            const currentServingsForFood = newServings[foodId] || [];
            const updatedServingsForFood = [roundedGrams, ...currentServingsForFood.filter(g => g !== roundedGrams)];
            newServings[foodId] = [...new Set(updatedServingsForFood)].slice(0, MAX_SERVINGS_PER_FOOD);
        });
        saveRecentServings(newServings).catch(() => {});
        return newServings;
    });
  }, []);

  const servingSizeSuggestions = useMemo(() => {
    if (!internalSelectedFood?.id) return [];
    
    const servingsForFood = recentServings[internalSelectedFood.id] || [];
    if (servingsForFood.length === 0) return [];

    return servingsForFood.map((val, index) => ({
        label: index === 0 ? t('addEntryModal.lastUsedServing', { grams: val }) : `${val}g`,
        value: String(val)
    }));
  }, [internalSelectedFood, recentServings, t]);

  const handleEstimateGrams = useCallback(async () => {
    Keyboard.dismiss(); if (!internalSelectedFood || !autoInput.trim() || isAiLoading) return;
    setIsAiLoading(true);
    try {
      const estimatedGrams = await getGramsFromNaturalLanguage(internalSelectedFood.name, autoInput);
      const roundedGrams = String(Math.round(estimatedGrams)); setInternalGrams(roundedGrams); setUnitMode("grams"); setAutoInput("");
      Toast.show({ type: "success", text1: t('addEntryModal.alertGramsEstimated'), text2: t('addEntryModal.alertGramsEstimatedMessage', {grams: roundedGrams, foodName: internalSelectedFood.name}), position: "bottom" });
    } catch (error) { /* Handled by getGramsFromNaturalLanguage */ } finally { setIsAiLoading(false); }
  }, [internalSelectedFood, autoInput, isAiLoading, t]);

  const handleAddOrUpdateSingleEntry = useCallback(async () => {
    Keyboard.dismiss(); if (!internalSelectedFood?.id) return Alert.alert(t('addEntryModal.alertFoodNotSelected'), t('addEntryModal.alertFoodNotSelectedMessage'));
    const numericGramsValue = parseFloat(internalGrams);
    if (!isValidNumberInput(internalGrams) || numericGramsValue <= 0) return Alert.alert(t('addEntryModal.alertInvalidAmount'), t('addEntryModal.alertInvalidAmountMessage'));
    if (isActionDisabled) return;
    parentHandleAddEntry(internalSelectedFood, numericGramsValue);
    if (!isEditMode) {
        addToRecentFoods(internalSelectedFood);
        addMultipleToRecentServings([{ foodId: internalSelectedFood.id, grams: numericGramsValue }]);
    }
  }, [internalSelectedFood, internalGrams, isActionDisabled, isEditMode, parentHandleAddEntry, addToRecentFoods, addMultipleToRecentServings, t]);

  const handleToggleMultipleFoodSelection = useCallback((food: Food, displayGrams: number) => {
    if (isEditMode || internalSelectedFood) return;
    setSelectedMultipleFoods(prev => { const newMap = new Map(prev); newMap.has(food.id) ? newMap.delete(food.id) : newMap.set(food.id, { food, grams: displayGrams }); return newMap; });
  }, [isEditMode, internalSelectedFood]);

  const handleConfirmAddMultipleSelected = useCallback(async () => {
    if (isEditMode || internalSelectedFood || selectedMultipleFoods.size === 0 || isActionDisabled) return;
    Keyboard.dismiss();
    const entriesToAdd = Array.from(selectedMultipleFoods.values()); if (entriesToAdd.length === 0) return;
    parentHandleAddMultipleEntries(entriesToAdd);
    entriesToAdd.forEach(entry => addToRecentFoods(entry.food));
    const servingsToAdd = entriesToAdd.map(e => ({ foodId: e.food.id, grams: e.grams }));
    addMultipleToRecentServings(servingsToAdd);
    setSelectedMultipleFoods(new Map());
  }, [isEditMode, internalSelectedFood, selectedMultipleFoods, isActionDisabled, parentHandleAddMultipleEntries, addToRecentFoods, addMultipleToRecentServings]);

  const pickImageAndAnalyze = useCallback(async (source: "camera" | "gallery") => {
    if (isEditMode) return;
    setQuickAddItems([]); setSelectedQuickAddIndices(new Set()); setEditingQuickAddItemIndex(null);
    setModalMode("quickAddSelect"); setQuickAddLoading(true); setIsTextQuickAddLoading(false);
    
    let permissionResult, pickerResult: ImagePicker.ImagePickerResult;
    try {
      permissionResult = source === "camera" ? await ImagePicker.requestCameraPermissionsAsync() : await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permissionResult.granted) throw new Error("Permission denied");
      pickerResult = source === "camera" ? await ImagePicker.launchCameraAsync({ quality: 1 }) : await ImagePicker.launchImageLibraryAsync({ mediaTypes: ImagePicker.MediaTypeOptions.Images, quality: 1 });
      if (pickerResult.canceled) throw new Error("User cancelled");

      const asset = pickerResult.assets?.[0]; if (!asset) throw new Error(t('addEntryModal.alertQuickAddCouldNotSelect'));
      const compressed = await compressImageIfNeeded(asset);
      const assetForAnalysis = compressed ? { ...asset, uri: compressed.uri, mimeType: 'image/jpeg' } : asset;
      const base64 = await getBase64FromUri(assetForAnalysis.uri);
      const mimeType = determineMimeType(assetForAnalysis);
      const results = await getMultipleFoodsFromImage(base64, mimeType);

      if (results.length === 0) {
        Toast.show({type: 'info', text1: t('addEntryModal.noQuickAddResults'), position: 'bottom'});
        setModalMode("normal");
      } else {
        setQuickAddItems(results); setSelectedQuickAddIndices(new Set(results.map((_, i) => i)));
        results.forEach(item => resolveAndSetIcon(item.foodName));
      }
    } catch (error: any) {
      if (error.message !== "User cancelled" && error.message !== "Permission denied" && !(error instanceof BackendError)) Alert.alert(t('addEntryModal.alertQuickAddError'), error.message || t('addEntryModal.alertQuickAddErrorMessage'));
      setModalMode("normal");
    } finally {
      setQuickAddLoading(false);
    }
  }, [isEditMode, resolveAndSetIcon, t]);

  const handleQuickAddImage = useCallback(() => {
    Keyboard.dismiss(); if (isEditMode || isActionDisabled) return;
    if (editingQuickAddItemIndex !== null) return Alert.alert(t('addEntryModal.alertQuickAddFinishEditing'), t('addEntryModal.alertQuickAddFinishEditingSaveOrCancel'));
    Alert.alert(t('addEntryModal.alertQuickAddFromImageTitle'), t('addEntryModal.alertQuickAddFromImageMessage'), [
        { text: t('addEntryModal.cancel'), style: "cancel" },
        { text: t('addEntryModal.camera'), onPress: () => pickImageAndAnalyze("camera") },
        { text: t('addEntryModal.gallery'), onPress: () => pickImageAndAnalyze("gallery") },
    ]);
  }, [isEditMode, editingQuickAddItemIndex, isActionDisabled, pickImageAndAnalyze, t]);

  const handleQuickAddText = useCallback(() => {
    Keyboard.dismiss(); if (isEditMode || isActionDisabled) return;
    setModalMode('quickAddText');
    setQuickAddItems([]); setSelectedQuickAddIndices(new Set()); setEditingQuickAddItemIndex(null);
  }, [isEditMode, isActionDisabled]);

  const handleAnalyzeText = async () => {
    const textToAnalyze = quickAddTextInput.trim();
    if (!textToAnalyze || quickAddLoading) return;
    Keyboard.dismiss();
    setQuickAddLoading(true); setIsTextQuickAddLoading(true);
    try {
        const results = await getMultipleFoodsFromText(textToAnalyze);
        if (results.length === 0) {
            Toast.show({ type: 'info', text1: t('addEntryModal.noQuickAddResults'), position: 'bottom' });
        } else {
            setQuickAddItems(results); setSelectedQuickAddIndices(new Set(results.map((_, i) => i)));
            results.forEach(item => { if (item.foodName) { resolveAndSetIcon(item.foodName); } });
            setModalMode("quickAddSelect");
        }
    } catch (error) { /* Handled in util */ }
    finally { setQuickAddLoading(false); setIsTextQuickAddLoading(false); }
  };

  const handleToggleQuickAddItem = useCallback((index: number) => {
    if (editingQuickAddItemIndex !== null || isActionDisabled) return;
    setSelectedQuickAddIndices(prev => { const newSet = new Set(prev); newSet.has(index) ? newSet.delete(index) : newSet.add(index); return newSet; });
  }, [editingQuickAddItemIndex, isActionDisabled]);

  const handleEditQuickAddItem = useCallback((index: number) => {
    if (editingQuickAddItemIndex !== null || isActionDisabled) return;
    const item = quickAddItems[index]; setEditingQuickAddItemIndex(index);
    setEditedFoodName(item.foodName); setEditedGrams(String(Math.round(item.estimatedWeightGrams)));
  }, [editingQuickAddItemIndex, quickAddItems, isActionDisabled]);

  const handleSaveQuickAddItemEdit = useCallback(() => {
    if (editingQuickAddItemIndex === null || isActionDisabled) return;
    const trimmedName = editedFoodName.trim(); if (!trimmedName) return Alert.alert(t('addEntryModal.alertQuickAddInvalidName'), t('addEntryModal.alertQuickAddInvalidNameMessage'));
    const numericGrams = parseFloat(editedGrams); if (!isValidNumberInput(editedGrams) || numericGrams <= 0) return Alert.alert(t('addEntryModal.alertQuickAddInvalidGrams'), t('addEntryModal.alertQuickAddInvalidGramsMessage'));
    setQuickAddItems(prev => prev.map((item, i) => i === editingQuickAddItemIndex ? { ...item, foodName: trimmedName, estimatedWeightGrams: Math.round(numericGrams) } : item));
    if (trimmedName) resolveAndSetIcon(trimmedName);
    setEditingQuickAddItemIndex(null); setEditedFoodName(""); setEditedGrams(""); Keyboard.dismiss();
  }, [editingQuickAddItemIndex, editedFoodName, editedGrams, isActionDisabled, resolveAndSetIcon, t]);

  const handleCancelQuickAddItemEdit = useCallback(() => {
    if (isActionDisabled) return; setEditingQuickAddItemIndex(null);
    setEditedFoodName(""); setEditedGrams(""); Keyboard.dismiss();
  }, [isActionDisabled]);

  const handleConfirmQuickAdd = useCallback(() => {
    Keyboard.dismiss(); if (isEditMode || isActionDisabled || editingQuickAddItemIndex !== null || selectedQuickAddIndices.size === 0) return;
    const entriesToAdd = Array.from(selectedQuickAddIndices).map(index => {
        const item = quickAddItems[index];
        const existingFood = foods.find(f => f.name.toLowerCase() === item.foodName.toLowerCase());
        const foodToAdd: Food = existingFood || { id: uuidv4(), name: item.foodName, calories: Math.round(item.calories_per_100g || 0), protein: Math.round(item.protein_per_100g || 0), carbs: Math.round(item.carbs_per_100g || 0), fat: Math.round(item.fat_per_100g || 0), createdAt: new Date().toISOString() };
        return { food: foodToAdd, grams: Math.max(1, Math.round(item.estimatedWeightGrams || 1)) };
    });
    if (entriesToAdd.length > 0) {
        parentHandleAddMultipleEntries(entriesToAdd);
        const servingsToAdd = entriesToAdd.map(e => ({ foodId: e.food.id, grams: e.grams }));
        addMultipleToRecentServings(servingsToAdd);
    }
  }, [foods, quickAddItems, selectedQuickAddIndices, editingQuickAddItemIndex, parentHandleAddMultipleEntries, isEditMode, isActionDisabled, addMultipleToRecentServings]);

  const handleQuickAddGramsChange = useCallback((text: string) => setEditedGrams(text.replace(/[^0-9]/g, "")), []);

  const handleSaveQuickAddItemToLibrary = useCallback(async (item: EstimatedFoodItem, setSavingState: (isSaving: boolean) => void) => {
    setSavingState(true);
    try {
        const foodData: Omit<Food, 'id' | 'createdAt'> = { name: item.foodName, calories: Math.round(item.calories_per_100g), protein: Math.round(item.protein_per_100g), carbs: Math.round(item.carbs_per_100g), fat: Math.round(item.fat_per_100g) };
        const existingFood = foods.find(f => f.name.toLowerCase() === item.foodName.toLowerCase());
        if (existingFood) {
            Alert.alert(t('addEntryModal.alertOverwriteFoodTitle'), t('addEntryModal.alertOverwriteFoodMessage', { foodName: item.foodName }), [
                { text: t('addEntryModal.cancel'), style: 'cancel', onPress: () => setSavingState(false) },
                { text: t('addEntryModal.overwrite'), onPress: async () => {
                    const updatedFood = await onCommitFoodToLibrary({ ...existingFood, ...foodData }, true);
                    if (updatedFood) { Toast.show({ type: 'success', text1: t('addEntryModal.toastFoodUpdatedInLibrary', { foodName: updatedFood.name }), position: 'bottom' }); resolveAndSetIcon(updatedFood.name); }
                    setSavingState(false);
                }},
            ]);
        } else {
            const newFood = await onCommitFoodToLibrary(foodData, false);
            if (newFood) { Toast.show({ type: 'success', text1: t('addEntryModal.toastFoodSavedToLibrary', { foodName: newFood.name }), position: 'bottom' }); resolveAndSetIcon(newFood.name); }
            setSavingState(false);
        }
    } catch (error) { Toast.show({ type: 'error', text1: t('addEntryModal.toastErrorSavingToLibrary'), position: 'bottom' }); setSavingState(false); }
  }, [foods, onCommitFoodToLibrary, resolveAndSetIcon, t]);

  const handleBackFromQuickAdd = useCallback(() => {
    setModalMode("normal");
    setQuickAddTextInput("");
  }, []);

  const modalTitle = modalMode === "quickAddSelect" ? (editingQuickAddItemIndex !== null ? t('addEntryModal.titleQuickAddEdit') : quickAddLoading ? t('addEntryModal.titleQuickAddAnalyzing') : t('addEntryModal.titleQuickAddSelect'))
                    : modalMode === "quickAddText" ? t('addEntryModal.titleQuickAddFromText')
                    : isEditMode ? t('addEntryModal.titleEdit') : t('addEntryModal.titleAdd');

  const isSingleAddButtonDisabled = modalMode !== "normal" || !internalSelectedFood || !isValidNumberInput(internalGrams) || parseFloat(internalGrams) <= 0 || isActionDisabled;
  const isMultiAddButtonDisabled = modalMode !== "normal" || selectedMultipleFoods.size === 0 || !!internalSelectedFood || isEditMode || isActionDisabled;
  const isAiButtonDisabled = modalMode !== "normal" || !internalSelectedFood || !autoInput.trim() || isActionDisabled || isAiLoading;
  const isQuickAddConfirmDisabled = isEditMode || modalMode !== "quickAddSelect" || selectedQuickAddIndices.size === 0 || editingQuickAddItemIndex !== null || isActionDisabled || quickAddLoading;
  const isQuickAddImageButtonDisabled = isEditMode || isActionDisabled || quickAddLoading;
  const isQuickAddTextButtonDisabled = isEditMode || isActionDisabled || quickAddLoading;

  return (
    <Overlay isVisible={isVisible} onBackdropPress={!isActionDisabled ? toggleOverlay : undefined} animationType="slide" overlayStyle={styles.overlayContainer}>
      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} style={styles.keyboardAvoidingView} keyboardVerticalOffset={KEYBOARD_VERTICAL_OFFSET}>
        <View style={[styles.overlayStyle, { backgroundColor: theme.colors.background }]}>
          <ModalHeader title={modalTitle} isEditMode={isEditMode} modalMode={modalMode} quickAddLoading={quickAddLoading} textQuickAddLoading={isTextQuickAddLoading}
            selectedFood={internalSelectedFood} selectedMultipleFoodsSize={selectedMultipleFoods.size} selectedQuickAddIndicesSize={selectedQuickAddIndices.size}
            editingQuickAddItemIndex={editingQuickAddItemIndex} isActionDisabled={isActionDisabled} isSingleAddButtonDisabled={isSingleAddButtonDisabled}
            isMultiAddButtonDisabled={isMultiAddButtonDisabled} isQuickAddConfirmDisabled={isQuickAddConfirmDisabled} isQuickAddImageButtonDisabled={isQuickAddImageButtonDisabled}
            isQuickAddTextButtonDisabled={isQuickAddTextButtonDisabled} isAiLoading={isAiLoading} toggleOverlay={toggleOverlay} onAddOrUpdateSingleEntry={handleAddOrUpdateSingleEntry}
            onConfirmAddMultipleSelected={handleConfirmAddMultipleSelected} onConfirmQuickAdd={handleConfirmQuickAdd} onQuickAddImage={handleQuickAddImage} onQuickAddText={handleQuickAddText}
            onBackFromQuickAdd={handleBackFromQuickAdd}
          />
          {modalMode === 'normal' && <View style={styles.normalModeContentContainer}><FoodSelectionList search={internalSearch} updateSearch={setInternalSearch} foods={foods} recentFoods={recentFoods} selectedFood={internalSelectedFood} handleSelectFood={setInternalSelectedFood} setGrams={setInternalGrams} setSelectedMultipleFoods={setSelectedMultipleFoods} selectedMultipleFoods={selectedMultipleFoods} handleToggleMultipleFoodSelection={handleToggleMultipleFoodSelection} foodIcons={foodIcons} onAddNewFoodRequest={onAddNewFoodRequest} isActionDisabled={isActionDisabled} isEditMode={isEditMode} recentServings={recentServings} modalMode={modalMode} />{internalSelectedFood && <AmountInputSection selectedFood={internalSelectedFood} grams={internalGrams} setGrams={setInternalGrams} unitMode={unitMode} setUnitMode={setUnitMode} autoInput={autoInput} setAutoInput={setAutoInput} handleEstimateGrams={handleEstimateGrams} isAiLoading={isAiLoading} isAiButtonDisabled={isAiButtonDisabled} isEditMode={isEditMode} servingSizeSuggestions={servingSizeSuggestions} isActionDisabled={isActionDisabled} foodGradeResult={foodGradeResult} />}</View>}
          {modalMode === 'quickAddText' && (
            <View style={styles.quickAddTextView}>
                <Input 
                    placeholder={t('addEntryModal.textQuickAdd.placeholder')} 
                    multiline 
                    numberOfLines={6} 
                    value={quickAddTextInput} 
                    onChangeText={setQuickAddTextInput} 
                    inputStyle={styles.quickAddTextArea} 
                    inputContainerStyle={styles.quickAddTextAreaContainer} 
                    containerStyle={{ paddingHorizontal: 0 }} 
                />
                <Button 
                    title={t('addEntryModal.textQuickAdd.analyzeButton')} 
                    onPress={handleAnalyzeText} 
                    loading={isTextQuickAddLoading} 
                    disabled={isTextQuickAddLoading || !quickAddTextInput.trim()} 
                    icon={{ name: 'brain', type: 'material-community', color: theme.colors.white }} 
                    buttonStyle={styles.analyzeButton} 
                />
            </View>
          )}
          {modalMode === 'quickAddSelect' && <QuickAddList items={quickAddItems} selectedIndices={selectedQuickAddIndices} editingIndex={editingQuickAddItemIndex} editedName={editedFoodName} editedGrams={editedGrams} onToggleItem={handleToggleQuickAddItem} onEditItem={handleEditQuickAddItem} onSaveEdit={handleSaveQuickAddItemEdit} onCancelEdit={handleCancelQuickAddItemEdit} onNameChange={setEditedFoodName} onGramsChange={handleQuickAddGramsChange} isLoading={quickAddLoading} foodIcons={foodIcons} style={styles.quickAddListStyle} onSaveItemToLibrary={handleSaveQuickAddItemToLibrary} foods={foods} />}
          <View style={{ height: Platform.OS === 'ios' ? 20 : 40 }} />
        </View>
      </KeyboardAvoidingView>
    </Overlay>
  );
};

const useStyles = makeStyles((theme) => ({
    overlayContainer: { backgroundColor: "transparent", width: "90%", maxWidth: 500, padding: 0, borderRadius: 15, shadowColor: "#000", shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.2, shadowRadius: 5, elevation: 6, overflow: "hidden", maxHeight: "90%", },
    overlayStyle: { width: "100%", height: "100%", borderRadius: 15, padding: 15, paddingBottom: 0, backgroundColor: theme.colors.background, flex: 1 },
    keyboardAvoidingView: { width: "100%", height: "100%" },
    normalModeContentContainer: { flex: 1, justifyContent: 'flex-start' },
    quickAddListStyle: { flex: 1 },
    quickAddTextView: { flex: 1, justifyContent: 'flex-start', paddingTop: 10 },
    quickAddTextAreaContainer: { height: 150, padding: 8, borderWidth: 1, borderColor: theme.colors.divider, borderRadius: 8, },
    quickAddTextArea: { textAlignVertical: 'top', color: theme.colors.text, fontSize: 16, height: '100%' },
    analyzeButton: { marginTop: 15, borderRadius: 8, backgroundColor: theme.colors.primary },
}));

export default AddEntryModal;
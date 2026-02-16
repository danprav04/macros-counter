// src/components/AddEntryModal/AddEntryModal.tsx
import React, { useEffect, useState, useMemo, useCallback } from "react";
import { View, KeyboardAvoidingView, Platform, Alert, Keyboard } from "react-native";
import { Overlay, makeStyles, useTheme, Button, Input, Text, Icon } from "@rneui/themed";
import { Food } from "../../types/food";
import { isValidNumberInput } from "../../utils/validationUtils";
import { loadRecentFoods, saveRecentFoods, RecentServings, loadRecentServings, saveRecentServings } from "../../services/storageService";
import { getFoodIconUrl } from "../../utils/iconUtils";
import { getGramsFromNaturalLanguage } from "../../utils/units";
import Toast from "react-native-toast-message";
import * as ImagePicker from "expo-image-picker";
import { EstimatedFoodItem, getMultipleFoodsFromMultipleImages, getMultipleFoodsFromText, BackendError, determineMimeType } from "../../utils/macros";
import { compressImageIfNeeded, getBase64FromUri } from "../../utils/imageUtils";
import { v4 as uuidv4 } from "uuid";
import QuickAddList from "../QuickAddList";
import { t } from '../../localization/i18n';
import { calculateDailyEntryGrade, FoodGradeResult } from "../../utils/gradingUtils";
import { Settings } from '../../types/settings';
import ModalHeader from './ModalHeader';
import FoodSelectionList from './FoodSelectionList';
import AmountInputSection from './AmountInputSection';
import { useAuth, AuthContextType } from '../../context/AuthContext';
import useDelayedLoading from '../../hooks/useDelayedLoading';
import GuestLimitModal from "../GuestLimitModal";
import { useBackgroundTask } from "../../hooks/useBackgroundTask";

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
  backgroundResults?: { type: string, items: any[] };
}

const KEYBOARD_VERTICAL_OFFSET = Platform.OS === "ios" ? 20 : 0;
const MAX_RECENT_FOODS = 15;
const MAX_SERVINGS_PER_FOOD = 4;
const MAX_QUICK_ADD_IMAGES = 10;

type UnitMode = "grams" | "auto";
type ModalMode = "normal" | "quickAddSelect" | "quickAddText";

const AddEntryModal: React.FC<AddEntryModalProps> = ({
  isVisible, toggleOverlay, handleAddEntry: parentHandleAddEntry, handleAddMultipleEntries: parentHandleAddMultipleEntries,
  foods, isEditMode, initialGrams, initialSelectedFoodForEdit, onAddNewFoodRequest, onCommitFoodToLibrary, dailyGoals, backgroundResults
}) => {
  const { theme } = useTheme();
  const styles = useStyles();
  const { user, refreshUser, isGuest, markAiFeatureUsed } = useAuth() as AuthContextType;

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

  // Quick Add Edit State
  const [editingQuickAddItemIndex, setEditingQuickAddItemIndex] = useState<number | null>(null);
  const [editedFoodName, setEditedFoodName] = useState<string>("");
  const [editedGrams, setEditedGrams] = useState<string>("");

  const [editedCalories, setEditedCalories] = useState<string>("");
  const [editedProtein, setEditedProtein] = useState<string>("");
  const [editedCarbs, setEditedCarbs] = useState<string>("");
  const [editedFat, setEditedFat] = useState<string>("");

  const [selectedMultipleFoods, setSelectedMultipleFoods] = useState<Map<string, { food: Food; grams: number }>>(new Map());

  const [quickAddTextInput, setQuickAddTextInput] = useState("");
  const [isTextQuickAddLoading, setIsTextQuickAddLoading] = useState(false);

  const [isGuestModalVisible, setIsGuestModalVisible] = useState(false);

  const { runBackgroundTask, isBackgroundOptionAvailable, backgroundTask, isBackgrounded } = useBackgroundTask();

  const isActionDisabled = isAiLoading || quickAddLoading;

  const showAILoading = useDelayedLoading(isAiLoading, 500);
  const showQuickAddLoading = useDelayedLoading(quickAddLoading, 500);
  const showTextQuickAddLoading = useDelayedLoading(isTextQuickAddLoading, 500);

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
    if (backgroundResults && backgroundResults.items && backgroundResults.items.length > 0) {
      const items = backgroundResults.items as EstimatedFoodItem[];
      setQuickAddItems(items);
      setSelectedQuickAddIndices(new Set(items.map((_, i) => i)));
      items.forEach(item => resolveAndSetIcon(item.foodName));
      setModalMode("quickAddSelect");
    }
  }, [backgroundResults, resolveAndSetIcon]);

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
      saveRecentFoods(updated).catch(() => { }); return updated;
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
      saveRecentServings(newServings).catch(() => { });
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

  const checkGuest = (): boolean => {
    if (isGuest) {
      setIsGuestModalVisible(true);
      return true;
    }
    return false;
  };

  const handleEstimateGrams = useCallback(async () => {
    Keyboard.dismiss();
    if (checkGuest()) return;
    if (!internalSelectedFood || !autoInput.trim() || isAiLoading) return;

    setIsAiLoading(true);
    try {
      const estimatedGrams = await getGramsFromNaturalLanguage(internalSelectedFood.name, autoInput, user?.client_id, refreshUser);
      const roundedGrams = String(Math.round(estimatedGrams)); setInternalGrams(roundedGrams); setUnitMode("grams"); setAutoInput("");
      if (markAiFeatureUsed) markAiFeatureUsed();
      Toast.show({ type: "success", text1: t('addEntryModal.alertGramsEstimated'), text2: t('addEntryModal.alertGramsEstimatedMessage', { grams: roundedGrams, foodName: internalSelectedFood.name }), position: "bottom" });
    } catch (error) { /* Handled by getGramsFromNaturalLanguage */ } finally { setIsAiLoading(false); }
  }, [internalSelectedFood, autoInput, isAiLoading, t, user, refreshUser, isGuest, markAiFeatureUsed]);

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
    if (checkGuest()) return;

    setQuickAddItems([]); setSelectedQuickAddIndices(new Set()); setEditingQuickAddItemIndex(null);
    setModalMode("quickAddSelect"); setQuickAddLoading(true); setIsTextQuickAddLoading(false);

    let permissionResult, pickerResult: ImagePicker.ImagePickerResult;
    try {
      permissionResult = source === "camera" ? await ImagePicker.requestCameraPermissionsAsync() : await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permissionResult.granted) throw new Error("Permission denied");

      if (source === 'camera') {
        pickerResult = await ImagePicker.launchCameraAsync({ quality: 1 });
      } else {
        pickerResult = await ImagePicker.launchImageLibraryAsync({
          mediaTypes: ImagePicker.MediaTypeOptions.Images,
          quality: 1,
          allowsMultipleSelection: true,
          selectionLimit: MAX_QUICK_ADD_IMAGES,
        });
      }

      if (pickerResult.canceled) throw new Error("User cancelled");

      const assets = pickerResult.assets;
      if (!assets || assets.length === 0) throw new Error(t('addEntryModal.alertQuickAddCouldNotSelect'));

      const imagePayloads = await Promise.all(assets.map(async (asset) => {
        const compressed = await compressImageIfNeeded(asset);
        const assetForAnalysis = compressed ? { ...asset, uri: compressed.uri, mimeType: 'image/jpeg' } : asset;
        const base64 = await getBase64FromUri(assetForAnalysis.uri);
        const mimeType = determineMimeType(assetForAnalysis);
        return { image_base64: base64, mime_type: mimeType };
      }));

      const { result } = await runBackgroundTask(
        t('addEntryModal.titleQuickAddSelect'),
        'ai_image',
        () => getMultipleFoodsFromMultipleImages(imagePayloads, user?.client_id, refreshUser),
        { targetScreen: 'DailyEntryRoute' }
      );

      const results = result;

      if (results.length === 0) {
        Toast.show({ type: 'info', text1: t('addEntryModal.noQuickAddResults'), position: 'bottom' });
        setModalMode("normal");
      } else {
        setQuickAddItems(results); setSelectedQuickAddIndices(new Set(results.map((_, i) => i)));
        results.forEach(item => resolveAndSetIcon(item.foodName));
        if (markAiFeatureUsed) markAiFeatureUsed();
      }
    } catch (error: any) {
      if (error.message !== "User cancelled" && error.message !== "Permission denied" && !(error instanceof BackendError)) {
        Alert.alert(t('addEntryModal.alertQuickAddError'), error.message || t('addEntryModal.alertQuickAddErrorMessage'));
      }
      setModalMode("normal");
    } finally {
      setQuickAddLoading(false);
    }
  }, [isEditMode, resolveAndSetIcon, t, user, refreshUser, isGuest, markAiFeatureUsed, runBackgroundTask]);

  const handleQuickAddImage = useCallback(() => {
    Keyboard.dismiss(); if (isEditMode || isActionDisabled) return;
    if (editingQuickAddItemIndex !== null) return Alert.alert(t('addEntryModal.alertQuickAddFinishEditing'), t('addEntryModal.alertQuickAddFinishEditingSaveOrCancel'));
    Alert.alert(t('addEntryModal.alertQuickAddFromImageTitle'), t('addEntryModal.alertQuickAddFromImageMessageBatch'), [
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
    if (checkGuest()) return;

    Keyboard.dismiss();
    setQuickAddLoading(true); setIsTextQuickAddLoading(true);
    try {
      const { result } = await runBackgroundTask(
        t('addEntryModal.titleQuickAddSelect'),
        'ai_text',
        () => getMultipleFoodsFromText(textToAnalyze, user?.client_id, refreshUser),
        { targetScreen: 'DailyEntryRoute' }
      );

      const results = result;

      if (results.length === 0) {
        Toast.show({ type: 'info', text1: t('addEntryModal.noQuickAddResults'), position: 'bottom' });
      } else {
        setQuickAddItems(results); setSelectedQuickAddIndices(new Set(results.map((_, i) => i)));
        results.forEach(item => { if (item.foodName) { resolveAndSetIcon(item.foodName); } });
        setModalMode("quickAddSelect");
        if (markAiFeatureUsed) markAiFeatureUsed();
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
    const item = quickAddItems[index];
    setEditingQuickAddItemIndex(index);
    setEditedFoodName(item.foodName);

    // Calculate total values for display (current weight)
    const factor = item.estimatedWeightGrams / 100;
    setEditedGrams(String(Math.round(item.estimatedWeightGrams)));
    setEditedCalories(String(Math.round(item.calories_per_100g * factor)));
    setEditedProtein(String(Math.round(item.protein_per_100g * factor)));
    setEditedCarbs(String(Math.round(item.carbs_per_100g * factor)));
    setEditedFat(String(Math.round(item.fat_per_100g * factor)));
  }, [editingQuickAddItemIndex, quickAddItems, isActionDisabled]);

  const handleSaveQuickAddItemEdit = useCallback(() => {
    if (editingQuickAddItemIndex === null || isActionDisabled) return;
    const trimmedName = editedFoodName.trim();
    if (!trimmedName) return Alert.alert(t('addEntryModal.alertQuickAddInvalidName'), t('addEntryModal.alertQuickAddInvalidNameMessage'));

    const numericGrams = parseFloat(editedGrams);
    const numericCals = parseFloat(editedCalories);
    const numericProt = parseFloat(editedProtein);
    const numericCarbs = parseFloat(editedCarbs);
    const numericFat = parseFloat(editedFat);

    if (!isValidNumberInput(editedGrams) || numericGrams <= 0) return Alert.alert(t('addEntryModal.alertQuickAddInvalidGrams'), t('addEntryModal.alertQuickAddInvalidGramsMessage'));

    // Reverse calculate per 100g values based on user edits
    const factor = numericGrams > 0 ? (100 / numericGrams) : 0;

    setQuickAddItems(prev => prev.map((item, i) => i === editingQuickAddItemIndex ? {
      ...item,
      foodName: trimmedName,
      estimatedWeightGrams: Math.round(numericGrams),
      calories_per_100g: isValidNumberInput(editedCalories) ? Math.max(0, numericCals * factor) : item.calories_per_100g,
      protein_per_100g: isValidNumberInput(editedProtein) ? Math.max(0, numericProt * factor) : item.protein_per_100g,
      carbs_per_100g: isValidNumberInput(editedCarbs) ? Math.max(0, numericCarbs * factor) : item.carbs_per_100g,
      fat_per_100g: isValidNumberInput(editedFat) ? Math.max(0, numericFat * factor) : item.fat_per_100g,
    } : item));

    if (trimmedName) resolveAndSetIcon(trimmedName);

    setEditingQuickAddItemIndex(null);
    setEditedFoodName("");
    setEditedGrams("");
    setEditedCalories("");
    setEditedProtein("");
    setEditedCarbs("");
    setEditedFat("");
    Keyboard.dismiss();
  }, [
    editingQuickAddItemIndex, editedFoodName, editedGrams,
    editedCalories, editedProtein, editedCarbs, editedFat,
    isActionDisabled, resolveAndSetIcon, t
  ]);

  const handleCancelQuickAddItemEdit = useCallback(() => {
    if (isActionDisabled) return;
    setEditingQuickAddItemIndex(null);
    setEditedFoodName("");
    setEditedGrams("");
    setEditedCalories("");
    setEditedProtein("");
    setEditedCarbs("");
    setEditedFat("");
    Keyboard.dismiss();
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

  const handleQuickAddGramsChange = useCallback((text: string) => {
    const cleanedText = text.replace(/[^0-9.]/g, "").replace(/(\..*?)\./g, "$1");
    setEditedGrams(cleanedText);

    if (editingQuickAddItemIndex !== null) {
      const item = quickAddItems[editingQuickAddItemIndex];
      const grams = parseFloat(cleanedText);

      // If valid positive number, recalculate macros proportionally
      if (!isNaN(grams) && grams >= 0) {
        const factor = grams / 100;
        // Use Math.round for display values
        setEditedCalories(String(Math.round(item.calories_per_100g * factor)));
        setEditedProtein(String(Math.round(item.protein_per_100g * factor)));
        setEditedCarbs(String(Math.round(item.carbs_per_100g * factor)));
        setEditedFat(String(Math.round(item.fat_per_100g * factor)));
      }
    }
  }, [editingQuickAddItemIndex, quickAddItems]);

  const handleSaveQuickAddItemToLibrary = useCallback(async (item: EstimatedFoodItem, setSavingState: (isSaving: boolean) => void) => {
    setSavingState(true);
    try {
      const foodData: Omit<Food, 'id' | 'createdAt'> = { name: item.foodName, calories: Math.round(item.calories_per_100g), protein: Math.round(item.protein_per_100g), carbs: Math.round(item.carbs_per_100g), fat: Math.round(item.fat_per_100g) };
      const existingFood = foods.find(f => f.name.toLowerCase() === item.foodName.toLowerCase());
      if (existingFood) {
        Alert.alert(t('addEntryModal.alertOverwriteFoodTitle'), t('addEntryModal.alertOverwriteFoodMessage', { foodName: item.foodName }), [
          { text: t('addEntryModal.cancel'), style: 'cancel', onPress: () => setSavingState(false) },
          {
            text: t('addEntryModal.overwrite'), onPress: async () => {
              const updatedFood = await onCommitFoodToLibrary({ ...existingFood, ...foodData }, true);
              if (updatedFood) { Toast.show({ type: 'success', text1: t('addEntryModal.toastFoodUpdatedInLibrary', { foodName: updatedFood.name }), position: 'bottom' }); resolveAndSetIcon(updatedFood.name); }
              setSavingState(false);
            }
          },
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

  const handleBackFromFoodSelection = useCallback(() => {
    setInternalSelectedFood(null);
    setInternalGrams("");
    // Reset unit mode to default just in case
    setUnitMode("grams");
    setAutoInput("");
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

  const renderFooter = () => {
    if (editingQuickAddItemIndex !== null) return null;
    if (modalMode === 'quickAddText') return null;

    let buttonTitle = "";
    let onPress = () => { };
    let disabled = false;
    let loading = false;
    let buttonColor = theme.colors.primary;

    if (modalMode === 'normal') {
      if (isEditMode) {
        buttonTitle = t('addEntryModal.buttonUpdate');
        onPress = handleAddOrUpdateSingleEntry;
        disabled = isSingleAddButtonDisabled;
        loading = showAILoading;
        buttonColor = theme.colors.warning;
      } else if (internalSelectedFood) {
        buttonTitle = t('addEntryModal.buttonAdd');
        onPress = handleAddOrUpdateSingleEntry;
        disabled = isSingleAddButtonDisabled;
        loading = showAILoading;
      } else {
        const count = selectedMultipleFoods.size;
        buttonTitle = count > 0 ? t('addEntryModal.buttonAddSelected', { count }) : t('addEntryModal.buttonAdd') + " 0";
        onPress = handleConfirmAddMultipleSelected;
        disabled = isMultiAddButtonDisabled;

        buttonColor = theme.colors.primary;
      }
    } else if (modalMode === 'quickAddSelect') {
      const count = selectedQuickAddIndices.size;
      buttonTitle = showQuickAddLoading ? t('addEntryModal.buttonLoading') : t('addEntryModal.buttonAddSelected', { count });
      onPress = handleConfirmQuickAdd;
      disabled = isQuickAddConfirmDisabled;
      loading = showQuickAddLoading;
      buttonColor = theme.colors.primary;
    }

    if (disabled && !loading) return null;

    return (
      <View style={styles.footerContainer}>
        <Button
          key={`footer-btn-${disabled}-${buttonColor}`}
          title={buttonTitle}
          onPress={onPress}
          disabled={disabled}
          loading={loading}
          buttonStyle={[styles.footerButton, { backgroundColor: buttonColor }]}
          titleStyle={styles.footerButtonTitle}
          disabledStyle={{ backgroundColor: theme.colors.grey4 }}
          disabledTitleStyle={{ color: theme.colors.grey2 }}
        />
      </View>
    );
  };

  const amountInputSection = useMemo(() => {
    if (internalSelectedFood) {
      return (
        <AmountInputSection
          selectedFood={internalSelectedFood}
          grams={internalGrams}
          setGrams={setInternalGrams}
          unitMode={unitMode}
          setUnitMode={setUnitMode}
          autoInput={autoInput}
          setAutoInput={setAutoInput}
          handleEstimateGrams={handleEstimateGrams}
          isAiLoading={showAILoading}
          isAiButtonDisabled={isAiButtonDisabled}
          isEditMode={isEditMode}
          servingSizeSuggestions={servingSizeSuggestions}
          isActionDisabled={isActionDisabled}
          foodGradeResult={foodGradeResult}
        />
      );
    }
    return null;
  }, [internalSelectedFood, internalGrams, unitMode, autoInput, showAILoading, isAiButtonDisabled, isEditMode, servingSizeSuggestions, isActionDisabled, foodGradeResult]);

  return (
    <>
      <Overlay isVisible={isVisible} onBackdropPress={!isActionDisabled ? toggleOverlay : undefined} animationType="slide" overlayStyle={styles.overlayContainer}>
        <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} style={styles.keyboardAvoidingView} keyboardVerticalOffset={KEYBOARD_VERTICAL_OFFSET}>
          <View style={[styles.overlayStyle, { backgroundColor: theme.colors.background }]}>
            <ModalHeader
              title={modalTitle}
              isEditMode={isEditMode}
              modalMode={modalMode}
              quickAddLoading={showQuickAddLoading}
              textQuickAddLoading={showTextQuickAddLoading}
              editingQuickAddItemIndex={editingQuickAddItemIndex}
              isActionDisabled={isActionDisabled}
              isQuickAddImageButtonDisabled={isQuickAddImageButtonDisabled}
              isQuickAddTextButtonDisabled={isQuickAddTextButtonDisabled}
              toggleOverlay={toggleOverlay}
              onQuickAddImage={handleQuickAddImage}
              onQuickAddText={handleQuickAddText}
              onBackFromQuickAdd={handleBackFromQuickAdd}
              selectedFoodId={internalSelectedFood?.id}
              onBackFromFoodSelection={handleBackFromFoodSelection}
            />

            <View style={styles.contentContainer}>
              {modalMode === 'normal' && (
                <View style={styles.normalModeContentContainer}>
                  <FoodSelectionList
                    search={internalSearch}
                    updateSearch={setInternalSearch}
                    foods={foods}
                    recentFoods={recentFoods}
                    selectedFood={internalSelectedFood}
                    handleSelectFood={setInternalSelectedFood}
                    setGrams={setInternalGrams}
                    setSelectedMultipleFoods={setSelectedMultipleFoods}
                    selectedMultipleFoods={selectedMultipleFoods}
                    handleToggleMultipleFoodSelection={handleToggleMultipleFoodSelection}
                    foodIcons={foodIcons}
                    onAddNewFoodRequest={onAddNewFoodRequest}
                    isActionDisabled={isActionDisabled}
                    isEditMode={isEditMode}
                    recentServings={recentServings}
                    modalMode={modalMode}
                    ListFooterComponent={amountInputSection}
                  />
                </View>
              )}

              {(modalMode === 'quickAddText' || modalMode === 'quickAddSelect') && (
                <View style={styles.disclaimerSection}>
                  <View style={styles.disclaimerRow}>
                    <Icon name="information-outline" type="material-community" color={theme.colors.grey3} size={16} />
                    <Text style={styles.disclaimerText}>{t('disclaimers.aiWarning')}</Text>
                  </View>
                  <View style={styles.disclaimerRow}>
                    <Icon name="shield-account-outline" type="material-community" color={theme.colors.grey3} size={16} />
                    <Text style={styles.disclaimerText}>{t('disclaimers.sensitiveDataWarning')}</Text>
                  </View>
                  <View style={styles.disclaimerRow}>
                    <Icon name="alert-circle-outline" type="material-community" color={theme.colors.grey3} size={16} />
                    <Text style={styles.disclaimerText}>{t('disclaimers.medicalDisclaimer')}</Text>
                  </View>
                </View>
              )}

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
                    loading={showTextQuickAddLoading}
                    disabled={isTextQuickAddLoading || !quickAddTextInput.trim()}
                    buttonStyle={[{ ...styles.analyzeButton }, { backgroundColor: theme.colors.primary, marginBottom: 10 }]}
                    disabledStyle={[{ ...styles.analyzeButton }, { backgroundColor: theme.colors.grey2 }]}
                    disabledTitleStyle={{ color: theme.colors.grey3 }}
                  />
                </View>
              )}
              {modalMode === 'quickAddSelect' && (
                <QuickAddList
                  items={quickAddItems}
                  selectedIndices={selectedQuickAddIndices}
                  editingIndex={editingQuickAddItemIndex}

                  editedName={editedFoodName}
                  editedGrams={editedGrams}
                  editedCalories={editedCalories}
                  editedProtein={editedProtein}
                  editedCarbs={editedCarbs}
                  editedFat={editedFat}

                  onToggleItem={handleToggleQuickAddItem}
                  onEditItem={handleEditQuickAddItem}
                  onSaveEdit={handleSaveQuickAddItemEdit}
                  onCancelEdit={handleCancelQuickAddItemEdit}

                  onNameChange={setEditedFoodName}
                  onGramsChange={handleQuickAddGramsChange}
                  onCaloriesChange={(val) => setEditedCalories(val.replace(/[^0-9.]/g, ""))}
                  onProteinChange={(val) => setEditedProtein(val.replace(/[^0-9.]/g, ""))}
                  onCarbsChange={(val) => setEditedCarbs(val.replace(/[^0-9.]/g, ""))}
                  onFatChange={(val) => setEditedFat(val.replace(/[^0-9.]/g, ""))}

                  isLoading={showQuickAddLoading}
                  foodIcons={foodIcons}
                  style={styles.quickAddListStyle}
                  onSaveItemToLibrary={handleSaveQuickAddItemToLibrary}
                  foods={foods}
                />
              )}
            </View>

            {renderFooter()}

          </View>
        </KeyboardAvoidingView>
      </Overlay>
      <GuestLimitModal isVisible={isGuestModalVisible} onClose={() => setIsGuestModalVisible(false)} />
    </>
  );
};

const useStyles = makeStyles((theme) => ({
  overlayContainer: {
    backgroundColor: "transparent",
    width: "90%",
    maxWidth: 500,
    padding: 0,
    borderRadius: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.35,
    shadowRadius: 8,
    elevation: 10,
    overflow: "hidden",
    maxHeight: "90%",
  },
  overlayStyle: {
    width: "100%",
    maxHeight: "100%",
    borderRadius: 20,
    paddingTop: 16,
    paddingHorizontal: 16,
    paddingBottom: 0,
    backgroundColor: theme.colors.background,
    display: 'flex',
    flexDirection: 'column',
  },
  keyboardAvoidingView: {
    width: "100%",
  },
  contentContainer: {
    flexShrink: 1,
    marginBottom: 10,
  },
  normalModeContentContainer: {
    flexShrink: 1,
    justifyContent: 'flex-start',
  },
  disclaimerSection: {
    paddingHorizontal: 5,
    paddingBottom: 10,
    opacity: 0.8,
  },
  disclaimerRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 4,
  },
  disclaimerText: {
    marginLeft: 5,
    fontSize: 12,
    color: theme.colors.grey3,
    fontStyle: 'italic',
    flexShrink: 1,
  },
  quickAddListStyle: {
    flexGrow: 0,
  },
  quickAddTextView: { width: '100%', justifyContent: 'flex-start' },
  quickAddTextAreaContainer: { height: 150, padding: 8, borderWidth: 1, borderColor: theme.colors.divider, borderRadius: 8, },
  quickAddTextArea: { textAlignVertical: 'top', color: theme.colors.text, fontSize: 16, height: '100%' },
  analyzeButton: { marginTop: 15, borderRadius: 8, backgroundColor: theme.colors.primary },
  footerContainer: {
    paddingTop: 12,
    paddingBottom: 24, // Explicit padding bottom for better spacing
    paddingHorizontal: 16,
    borderTopWidth: 1,
    borderTopColor: theme.colors.divider,
    backgroundColor: theme.colors.background,
  },
  footerButton: {
    borderRadius: 12,
    paddingVertical: 14,
    width: '100%',
  },
  footerButtonTitle: {
    fontSize: 16,
    fontWeight: 'bold',
  },
}));

export default AddEntryModal;
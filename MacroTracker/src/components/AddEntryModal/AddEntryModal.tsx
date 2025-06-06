// src/components/AddEntryModal/AddEntryModal.tsx
import React, {
  useEffect,
  useState,
  useMemo,
  useCallback,
  useRef,
} from "react";
import {
  View,
  KeyboardAvoidingView,
  Platform,
  Dimensions,
  StyleSheet,
  Alert,
  Keyboard,
} from "react-native";
import {
  Overlay,
  makeStyles,
  useTheme,
} from "@rneui/themed";
import { Food } from "../../types/food";
import { isValidNumberInput } from "../../utils/validationUtils";
import {
  loadRecentFoods,
  saveRecentFoods,
  loadLastUsedPortions,
  saveLastUsedPortions,
  LastUsedPortions,
} from "../../services/storageService";
import { getFoodIconUrl } from "../../utils/iconUtils";
import { getGramsFromNaturalLanguage } from "../../utils/units";
import Toast from "react-native-toast-message";
import * as ImagePicker from "expo-image-picker";
import {
  EstimatedFoodItem,
  getMultipleFoodsFromImage,
  BackendError,
  determineMimeType,
} from "../../utils/macros";
import { compressImageIfNeeded, getBase64FromUri } from "../../utils/imageUtils";
import { v4 as uuidv4 } from "uuid";
import QuickAddList from "../QuickAddList";
import i18n, { t } from '../../localization/i18n';
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
  isEditMode: boolean; // True if editing an existing DailyEntryItem
  initialGrams?: string; // Grams for the item being edited, or "" for new pre-selected food
  initialSelectedFoodForEdit?: Food | null; // Food for editing OR food to pre-select for a new entry
  onAddNewFoodRequest: () => void;
  onCommitFoodToLibrary: (foodData: Omit<Food, 'id'> | Food, isUpdate: boolean) => Promise<Food | null>;
  dailyGoals: Settings['dailyGoals'];
}

const KEYBOARD_VERTICAL_OFFSET = Platform.OS === "ios" ? 80 : 0;
const MAX_RECENT_FOODS = 5;

type UnitMode = "grams" | "auto";
type ModalMode = "normal" | "quickAddSelect";

const AddEntryModal: React.FC<AddEntryModalProps> = ({
  isVisible,
  toggleOverlay,
  handleAddEntry: parentHandleAddEntry,
  handleAddMultipleEntries: parentHandleAddMultipleEntries,
  foods,
  isEditMode,
  initialGrams,
  initialSelectedFoodForEdit,
  onAddNewFoodRequest,
  onCommitFoodToLibrary,
  dailyGoals,
}) => {
  const { theme } = useTheme();
  const styles = useStyles();

  const [internalSelectedFood, setInternalSelectedFood] = useState<Food | null>(null);
  const [internalGrams, setInternalGrams] = useState("");
  const [internalSearch, setInternalSearch] = useState("");

  const [recentFoods, setRecentFoods] = useState<Food[]>([]);
  const [foodIcons, setFoodIcons] = useState<{
    [foodName: string]: string | null; // No 'undefined' for loading if sync
  }>({});

  const [unitMode, setUnitMode] = useState<UnitMode>("grams");
  const [autoInput, setAutoInput] = useState("");
  const [isAiLoading, setIsAiLoading] = useState(false);

  const [modalMode, setModalMode] = useState<ModalMode>("normal");
  const [quickAddLoading, setQuickAddLoading] = useState(false);
  const [quickAddItems, setQuickAddItems] = useState<EstimatedFoodItem[]>([]);
  const [selectedQuickAddIndices, setSelectedQuickAddIndices] = useState<
    Set<number>
  >(new Set());
  const [editingQuickAddItemIndex, setEditingQuickAddItemIndex] = useState<
    number | null
  >(null);
  const [editedFoodName, setEditedFoodName] = useState<string>("");
  const [editedGrams, setEditedGrams] = useState<string>("");

  const [lastUsedPortions, setLastUsedPortions] = useState<LastUsedPortions>({});
  const [selectedMultipleFoods, setSelectedMultipleFoods] = useState<Map<string, { food: Food; grams: number }>>(new Map());

  const isActionDisabled = isAiLoading || quickAddLoading;

  const resolveAndSetIcon = useCallback((foodName: string) => {
    if (!foodName || foodIcons[foodName] !== undefined) return; // Already resolved or invalid
    const icon = getFoodIconUrl(foodName, i18n.locale);
    setFoodIcons(prevIcons => ({ ...prevIcons, [foodName]: icon }));
  }, [foodIcons, i18n.locale]);


  const foodGradeResult = useMemo((): FoodGradeResult | null => {
    const numericGramsValue = parseFloat(internalGrams);
    if (internalSelectedFood && isValidNumberInput(internalGrams) && numericGramsValue > 0 && dailyGoals) {
        return calculateDailyEntryGrade(internalSelectedFood, numericGramsValue, dailyGoals);
    }
    return null;
  }, [internalSelectedFood, internalGrams, dailyGoals]);

  useEffect(() => {
    if (isVisible) {
        loadLastUsedPortions().then(setLastUsedPortions).catch(err => {
            // console.warn("Failed to load last used portions:", err)
        });
    }
  }, [isVisible]);

  useEffect(() => {
    if (isVisible) {
      const actuallyEditingDailyItem = isEditMode && initialSelectedFoodForEdit && initialGrams !== undefined;

      if (actuallyEditingDailyItem) {
        setInternalSelectedFood(initialSelectedFoodForEdit);
        setInternalGrams(initialGrams);
        setUnitMode("grams"); setAutoInput(""); setInternalSearch("");
        setSelectedMultipleFoods(new Map()); setModalMode("normal");
        if (initialSelectedFoodForEdit?.name) resolveAndSetIcon(initialSelectedFoodForEdit.name);
      } else if (initialSelectedFoodForEdit) {
        setInternalSelectedFood(initialSelectedFoodForEdit);
        setInternalGrams(initialGrams || "");
        setUnitMode("grams"); setAutoInput(""); setInternalSearch("");
        setSelectedMultipleFoods(new Map()); setModalMode("normal");
        if (initialSelectedFoodForEdit?.name) resolveAndSetIcon(initialSelectedFoodForEdit.name);
      } else {
        if (modalMode !== "quickAddSelect") {
          setInternalSelectedFood(null); setInternalGrams(""); setInternalSearch("");
          setUnitMode("grams"); setAutoInput(""); setSelectedMultipleFoods(new Map());
          setModalMode("normal");
        }
      }
    } else {
      const timer = setTimeout(() => {
        setInternalSelectedFood(null); setInternalSearch(""); setInternalGrams("");
        setUnitMode("grams"); setAutoInput(""); setSelectedMultipleFoods(new Map());
        setModalMode("normal"); setQuickAddItems([]); setSelectedQuickAddIndices(new Set());
        setEditingQuickAddItemIndex(null); setEditedFoodName(""); setEditedGrams("");
        setIsAiLoading(false); setQuickAddLoading(false);
        // setFoodIcons({}); // Optionally clear icons on close if memory is a concern
      }, 300);
      return () => clearTimeout(timer);
    }
  }, [isVisible, isEditMode, initialSelectedFoodForEdit, initialGrams, resolveAndSetIcon]); // modalMode removed

  useEffect(() => {
    if (isVisible && modalMode === "normal") {
       loadRecentFoods().then(loadedRecent => {
           setRecentFoods(loadedRecent);
           loadedRecent.forEach(food => resolveAndSetIcon(food.name));
       }).catch(err => {
            // console.warn("Failed to load recent foods:", err);
       });
    }
  }, [isVisible, modalMode, resolveAndSetIcon]);

  useEffect(() => {
    if (!isVisible) return;

    let itemsToCheckNames: string[] = [];
    if (modalMode === "normal") {
        const currentDisplayItems: Food[] = [];
        if (!internalSearch) {
            currentDisplayItems.push(...recentFoods);
            const recentIds = new Set(recentFoods.map(f => f.id));
            currentDisplayItems.push(...foods.filter(f => !recentIds.has(f.id)).slice(0,10));
        } else {
            currentDisplayItems.push(...foods.filter(f => f.name.toLowerCase().includes(internalSearch.toLowerCase())).slice(0,10));
        }
        itemsToCheckNames = currentDisplayItems.map(item => item.name).filter(Boolean);
    } else if (modalMode === "quickAddSelect" && quickAddItems.length > 0) {
        itemsToCheckNames = quickAddItems.map(item => item.foodName).filter(Boolean);
    }

    if (itemsToCheckNames.length > 0) {
        itemsToCheckNames.forEach(name => resolveAndSetIcon(name));
    }
  }, [isVisible, modalMode, internalSearch, recentFoods, foods, quickAddItems, resolveAndSetIcon]);


  const addToRecentFoods = useCallback(async (food: Food) => {
    if (!food || !food.id) return;
    setRecentFoods((prevRecent) => {
      if (prevRecent.length > 0 && prevRecent[0].id === food.id) return prevRecent;
      const updated = prevRecent.filter((rf) => rf.id !== food.id);
      updated.unshift(food);
      const trimmed = updated.slice(0, MAX_RECENT_FOODS);
      saveRecentFoods(trimmed).catch(() => {});
      return trimmed;
    });
  }, []);

  const servingSizeSuggestions = useMemo(() => {
    if (!internalSelectedFood || !internalSelectedFood.id) return [];
    const suggestions = [];
    const lastUsed = lastUsedPortions[internalSelectedFood.id];

    if (lastUsed) {
      suggestions.push({ label: t('addEntryModal.lastUsedServing', {grams: lastUsed}), value: String(lastUsed) });
    }
    const defaultSuggestions = [
        { label: "50g", value: "50" }, { label: "100g", value: "100" },
        { label: "150g", value: "150" }, { label: "200g", value: "200" }
    ];
    defaultSuggestions.forEach(sugg => {
        if (!lastUsed || String(lastUsed) !== sugg.value) {
            suggestions.push(sugg);
        }
    });
    return suggestions;
  }, [internalSelectedFood, lastUsedPortions, i18n.locale]);


  const handleEstimateGrams = useCallback(async () => {
    Keyboard.dismiss();
    if (!internalSelectedFood || !autoInput.trim()) {
      Alert.alert(t('addEntryModal.alertInputMissing'), t('addEntryModal.alertInputMissingMessage')); return;
    }
    if (isAiLoading) return; setIsAiLoading(true);
    try {
      const estimatedGrams = await getGramsFromNaturalLanguage(internalSelectedFood.name, autoInput);
      const roundedGrams = String(Math.round(estimatedGrams)); setInternalGrams(roundedGrams);
      setUnitMode("grams"); setAutoInput("");
      Toast.show({ type: "success", text1: t('addEntryModal.alertGramsEstimated'), text2: t('addEntryModal.alertGramsEstimatedMessage', {grams: roundedGrams, foodName: internalSelectedFood.name}), position: "bottom", });
    } catch (error: any) { /* Error already handled by getGramsFromNaturalLanguage with an Alert */ }
    finally { setIsAiLoading(false); }
  }, [internalSelectedFood, autoInput, isAiLoading]);

  const handleAddOrUpdateSingleEntry = useCallback(async () => {
    Keyboard.dismiss();
    if (!internalSelectedFood || !internalSelectedFood.id) {
        Alert.alert(t('addEntryModal.alertFoodNotSelected'), t('addEntryModal.alertFoodNotSelectedMessage'));
        return;
    }
    const numericGramsValue = parseFloat(internalGrams);
    if (!isValidNumberInput(internalGrams) || numericGramsValue <= 0) {
        Alert.alert(t('addEntryModal.alertInvalidAmount'), t('addEntryModal.alertInvalidAmountMessage'));
        return;
    }
    if (isActionDisabled) return;

    parentHandleAddEntry(internalSelectedFood, numericGramsValue);

    if (!isEditMode) {
        addToRecentFoods(internalSelectedFood);
        const updatedPortions = { ...lastUsedPortions, [internalSelectedFood.id]: numericGramsValue };
        setLastUsedPortions(updatedPortions);
        saveLastUsedPortions(updatedPortions).catch(() => {});
    } else if (isEditMode && internalSelectedFood.id) {
        const updatedPortions = { ...lastUsedPortions, [internalSelectedFood.id]: numericGramsValue };
        setLastUsedPortions(updatedPortions);
        saveLastUsedPortions(updatedPortions).catch(() => {});
    }
  }, [ internalSelectedFood, internalGrams, isActionDisabled, isEditMode, parentHandleAddEntry, addToRecentFoods, lastUsedPortions ]);

  const handleToggleMultipleFoodSelection = useCallback((food: Food, displayGrams: number) => {
    if (isEditMode || internalSelectedFood) return;
    setSelectedMultipleFoods(prev => {
        const newSelection = new Map(prev);
        if (newSelection.has(food.id)) {
            newSelection.delete(food.id);
        } else {
            newSelection.set(food.id, { food, grams: displayGrams });
        }
        return newSelection;
    });
  }, [isEditMode, internalSelectedFood]);

  const handleConfirmAddMultipleSelected = useCallback(async () => {
    if (isEditMode || internalSelectedFood || selectedMultipleFoods.size === 0 || isActionDisabled) return;
    Keyboard.dismiss();
    const entriesToAdd: { food: Food; grams: number }[] = Array.from(selectedMultipleFoods.values());
    if (entriesToAdd.length === 0) return;

    parentHandleAddMultipleEntries(entriesToAdd);

    const newPortionsToSave: LastUsedPortions = { ...lastUsedPortions };
    entriesToAdd.forEach(entry => {
        if (entry.food.id) { newPortionsToSave[entry.food.id] = entry.grams; }
        addToRecentFoods(entry.food);
    });
    setLastUsedPortions(newPortionsToSave);
    saveLastUsedPortions(newPortionsToSave).catch(() => {});
    setSelectedMultipleFoods(new Map());
  }, [ isEditMode, internalSelectedFood, selectedMultipleFoods, isActionDisabled, parentHandleAddMultipleEntries, lastUsedPortions, addToRecentFoods ]);


  const pickImageAndAnalyze = useCallback( async (source: "camera" | "gallery") => {
      if (isEditMode) return;

      setQuickAddItems([]); setSelectedQuickAddIndices(new Set()); setEditingQuickAddItemIndex(null);
      setModalMode("quickAddSelect");
      setQuickAddLoading(true);
      setSelectedMultipleFoods(new Map());
      setInternalSelectedFood(null); setInternalSearch(""); setInternalGrams("");

      let permissionResult; let pickerResult: ImagePicker.ImagePickerResult;
      try {
        if (source === "camera") {
          permissionResult = await ImagePicker.requestCameraPermissionsAsync();
          if (!permissionResult.granted) { Alert.alert(t('addEntryModal.alertQuickAddPermission'), t('addEntryModal.alertQuickAddCameraPermission')); throw new Error("Permission denied"); }
          pickerResult = await ImagePicker.launchCameraAsync({ quality: 1, exif: false });
        } else {
          permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
          if (!permissionResult.granted) { Alert.alert(t('addEntryModal.alertQuickAddPermission'), t('addEntryModal.alertQuickAddGalleryPermission')); throw new Error("Permission denied"); }
          pickerResult = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ImagePicker.MediaTypeOptions.Images, quality: 1 });
        }

        if (pickerResult.canceled) throw new Error(t('addEntryModal.alertQuickAddUserCancelled'));

        if (pickerResult.assets && pickerResult.assets.length > 0) {
          const originalAsset = pickerResult.assets[0];
          const compressedResult = await compressImageIfNeeded(originalAsset);
          const assetForAnalysis = compressedResult ? { ...originalAsset, uri: compressedResult.uri, width: compressedResult.width, height: compressedResult.height, mimeType: 'image/jpeg' } : originalAsset;
          const base64Image = await getBase64FromUri(assetForAnalysis.uri);
          const mimeType = determineMimeType(assetForAnalysis);

          const results = await getMultipleFoodsFromImage(base64Image, mimeType);

          if (results.length === 0) {
            Toast.show({type: 'info', text1: t('addEntryModal.noQuickAddResults'), position: 'bottom'});
            setQuickAddItems([]);
            setQuickAddLoading(false);
            setModalMode("normal");
          } else {
            setQuickAddItems(results);
            setSelectedQuickAddIndices(new Set(results.map((_, i) => i)));
            results.forEach(qaItem => { if (qaItem.foodName) { resolveAndSetIcon(qaItem.foodName); } });
            setQuickAddLoading(false);
          }
        } else {
          throw new Error(t('addEntryModal.alertQuickAddCouldNotSelect'));
        }
      } catch (error: any) {
        if ( error.message !== t('addEntryModal.alertQuickAddUserCancelled') && error.message !== "Permission denied" && !(error instanceof BackendError) ) {
          Alert.alert(t('addEntryModal.alertQuickAddError'), error.message || t('addEntryModal.alertQuickAddErrorMessage'));
        }
        setModalMode("normal");
        setQuickAddItems([]);
        setSelectedQuickAddIndices(new Set());
        setQuickAddLoading(false);
      }
    }, [isEditMode, resolveAndSetIcon]
  );

  const handleQuickAddImage = useCallback(async () => {
    Keyboard.dismiss(); if (isEditMode || isActionDisabled) return;
    if (editingQuickAddItemIndex !== null) { Alert.alert(t('addEntryModal.alertQuickAddFinishEditing'), t('addEntryModal.alertQuickAddFinishEditingSaveOrCancel')); return; }
    Alert.alert( t('addEntryModal.alertQuickAddFromImageTitle'), t('addEntryModal.alertQuickAddFromImageMessage'),
      [ { text: t('addEntryModal.cancel'), style: "cancel" },
        { text: t('addEntryModal.camera'), onPress: () => pickImageAndAnalyze("camera") },
        { text: t('addEntryModal.gallery'), onPress: () => pickImageAndAnalyze("gallery") }, ]
    );
  }, [ isEditMode, editingQuickAddItemIndex, isActionDisabled, pickImageAndAnalyze ]);


  const handleToggleQuickAddItem = useCallback( (index: number) => {
      if (editingQuickAddItemIndex !== null || isActionDisabled) return;
      setSelectedQuickAddIndices((prev) => { const newSet = new Set(prev); if (newSet.has(index)) newSet.delete(index); else newSet.add(index); return newSet; });
    }, [editingQuickAddItemIndex, isActionDisabled]
  );

  const handleEditQuickAddItem = useCallback( (index: number) => {
      if (editingQuickAddItemIndex !== null || isActionDisabled) {
        if (editingQuickAddItemIndex !== null) Alert.alert(t('addEntryModal.alertQuickAddFinishEditing'), t('addEntryModal.alertQuickAddFinishEditingSaveOrCancel'));
        return;
      }
      const item = quickAddItems[index]; setEditingQuickAddItemIndex(index);
      setEditedFoodName(item.foodName); setEditedGrams(String(Math.round(item.estimatedWeightGrams)));
    }, [editingQuickAddItemIndex, quickAddItems, isActionDisabled]
  );

  const handleSaveQuickAddItemEdit = useCallback(() => {
    if (editingQuickAddItemIndex === null || isActionDisabled) return;
    const trimmedName = editedFoodName.trim(); if (!trimmedName) { Alert.alert(t('addEntryModal.alertQuickAddInvalidName'), t('addEntryModal.alertQuickAddInvalidNameMessage')); return; }
    const numericEditedGramsValue = parseFloat(editedGrams); if (!isValidNumberInput(editedGrams) || numericEditedGramsValue <= 0) { Alert.alert(t('addEntryModal.alertQuickAddInvalidGrams'), t('addEntryModal.alertQuickAddInvalidGramsMessage')); return; }
    const roundedGrams = Math.round(numericEditedGramsValue);
    setQuickAddItems((prevItems) => prevItems.map((item, index) => index === editingQuickAddItemIndex ? { ...item, foodName: trimmedName, estimatedWeightGrams: roundedGrams, } : item ));
    if (trimmedName) { resolveAndSetIcon(trimmedName); }
    setEditingQuickAddItemIndex(null); setEditedFoodName(""); setEditedGrams(""); Keyboard.dismiss();
  }, [editingQuickAddItemIndex, editedFoodName, editedGrams, isActionDisabled, resolveAndSetIcon]);

  const handleCancelQuickAddItemEdit = useCallback(() => {
    if (isActionDisabled) return; setEditingQuickAddItemIndex(null);
    setEditedFoodName(""); setEditedGrams(""); Keyboard.dismiss();
  }, [isActionDisabled]);

  const handleConfirmQuickAdd = useCallback(() => {
    Keyboard.dismiss(); if (isEditMode || isActionDisabled) return;
    if (editingQuickAddItemIndex !== null) { Alert.alert(t('addEntryModal.alertQuickAddFinishEditing'), t('addEntryModal.alertQuickAddFinishEditingSaveOrCancel')); return; }
    if (selectedQuickAddIndices.size === 0) { Alert.alert(t('addEntryModal.alertQuickAddNoItemsSelected'), t('addEntryModal.alertQuickAddNoItemsSelectedMessage')); return; }
    try {
      const entriesToAdd: { food: Food; grams: number }[] = [];
      const newPortionsToSave: LastUsedPortions = { ...lastUsedPortions };

      Array.from(selectedQuickAddIndices).forEach((index) => {
        if (index >= 0 && index < quickAddItems.length) {
          const item = quickAddItems[index];
          const existingFood = foods.find(f => f.name.toLowerCase() === item.foodName.toLowerCase());
          let foodToAdd: Food = existingFood ? existingFood : { id: uuidv4(), name: item.foodName, calories: Math.round(Number(item.calories_per_100g) || 0), protein: Math.round(Number(item.protein_per_100g) || 0), carbs: Math.round(Number(item.carbs_per_100g) || 0), fat: Math.round(Number(item.fat_per_100g) || 0), };
          const entryGrams = Math.max(1, Math.round(Number(item.estimatedWeightGrams) || 1));
          entriesToAdd.push({ food: foodToAdd, grams: entryGrams });

          if (foodToAdd.id) { newPortionsToSave[foodToAdd.id] = entryGrams; }
        }
      });

      if (entriesToAdd.length > 0) {
        parentHandleAddMultipleEntries(entriesToAdd);
        setLastUsedPortions(newPortionsToSave);
        saveLastUsedPortions(newPortionsToSave).catch(() => {});
      } else { Alert.alert(t('addEntryModal.alertQuickAddNothingToAdd'), t('addEntryModal.alertQuickAddNothingToAddMessage')); }
    } catch (error) { Alert.alert(t('addEntryModal.alertQuickAddErrorPreparing'), t('addEntryModal.alertQuickAddErrorPreparingMessage')); }
  }, [ foods, quickAddItems, selectedQuickAddIndices, editingQuickAddItemIndex, parentHandleAddMultipleEntries, isEditMode, isActionDisabled, lastUsedPortions ]);


  const handleQuickAddGramsChange = useCallback((text: string) => {
    const cleanedText = text.replace(/[^0-9]/g, "");
    setEditedGrams(cleanedText);
  }, []);

  const handleSaveQuickAddItemToLibrary = useCallback(async (
    item: EstimatedFoodItem,
    setSavingState: (isSaving: boolean) => void
  ) => {
    setSavingState(true);
    try {
        const foodData: Omit<Food, 'id'> = {
            name: item.foodName, calories: Math.round(item.calories_per_100g),
            protein: Math.round(item.protein_per_100g), carbs: Math.round(item.carbs_per_100g),
            fat: Math.round(item.fat_per_100g),
        };
        const existingFood = foods.find(f => f.name.toLowerCase() === item.foodName.toLowerCase());

        if (existingFood) {
            Alert.alert( t('addEntryModal.alertOverwriteFoodTitle'), t('addEntryModal.alertOverwriteFoodMessage', { foodName: item.foodName }),
                [ { text: t('addEntryModal.cancel'), style: 'cancel', onPress: () => setSavingState(false) },
                  { text: t('addEntryModal.overwrite'), onPress: async () => {
                          const foodToUpdate: Food = { ...existingFood, ...foodData };
                          const updatedFood = await onCommitFoodToLibrary(foodToUpdate, true);
                          if (updatedFood) { Toast.show({ type: 'success', text1: t('addEntryModal.toastFoodUpdatedInLibrary', { foodName: updatedFood.name }), position: 'bottom' }); resolveAndSetIcon(updatedFood.name); }
                          setSavingState(false);
                      },
                  }, ]
            );
        } else {
            const newFood = await onCommitFoodToLibrary(foodData, false);
            if (newFood) { Toast.show({ type: 'success', text1: t('addEntryModal.toastFoodSavedToLibrary', { foodName: newFood.name }), position: 'bottom' }); resolveAndSetIcon(newFood.name); }
            setSavingState(false);
        }
    } catch (error) {
        Toast.show({ type: 'error', text1: t('addEntryModal.toastErrorSavingToLibrary'), position: 'bottom' });
        setSavingState(false);
    }
  }, [foods, onCommitFoodToLibrary, resolveAndSetIcon]);


  const modalTitle = modalMode === "quickAddSelect"
    ? editingQuickAddItemIndex !== null ? t('addEntryModal.titleQuickAddEdit')
    : quickAddLoading ? t('addEntryModal.titleQuickAddAnalyzing')
    : t('addEntryModal.titleQuickAddSelect')
    : isEditMode ? t('addEntryModal.titleEdit')
    : t('addEntryModal.titleAdd');

  const numericGramsValueForValidation = parseFloat(internalGrams);
  const isSingleAddButtonDisabled = modalMode !== "normal" || !internalSelectedFood || !isValidNumberInput(internalGrams) || numericGramsValueForValidation <= 0 || isActionDisabled;
  const isMultiAddButtonDisabled = modalMode !== "normal" || selectedMultipleFoods.size === 0 || !!internalSelectedFood || isEditMode || isActionDisabled;
  const isAiButtonDisabled = modalMode !== "normal" || !internalSelectedFood || !autoInput.trim() || isActionDisabled || isAiLoading;
  const isQuickAddConfirmDisabled = isEditMode || modalMode !== "quickAddSelect" || selectedQuickAddIndices.size === 0 || editingQuickAddItemIndex !== null || isActionDisabled || quickAddLoading;
  const isQuickAddImageButtonDisabled = isEditMode || isActionDisabled || quickAddLoading;

  const combinedOverlayStyle = StyleSheet.flatten([ styles.overlayStyle, { backgroundColor: theme.colors.background }, ]);

  return (
    <Overlay isVisible={isVisible} onBackdropPress={!isActionDisabled ? toggleOverlay : undefined} animationType="slide" overlayStyle={styles.overlayContainer} >
      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} style={styles.keyboardAvoidingView} keyboardVerticalOffset={KEYBOARD_VERTICAL_OFFSET} >
        <View style={combinedOverlayStyle}>
          <ModalHeader
            title={modalTitle}
            isEditMode={isEditMode}
            modalMode={modalMode}
            quickAddLoading={quickAddLoading}
            selectedFood={internalSelectedFood}
            selectedMultipleFoodsSize={selectedMultipleFoods.size}
            selectedQuickAddIndicesSize={selectedQuickAddIndices.size}
            editingQuickAddItemIndex={editingQuickAddItemIndex}
            isActionDisabled={isActionDisabled}
            isSingleAddButtonDisabled={isSingleAddButtonDisabled}
            isMultiAddButtonDisabled={isMultiAddButtonDisabled}
            isQuickAddConfirmDisabled={isQuickAddConfirmDisabled}
            isQuickAddImageButtonDisabled={isQuickAddImageButtonDisabled}
            isAiLoading={isAiLoading}
            toggleOverlay={toggleOverlay}
            onAddOrUpdateSingleEntry={handleAddOrUpdateSingleEntry}
            onConfirmAddMultipleSelected={handleConfirmAddMultipleSelected}
            onConfirmQuickAdd={handleConfirmQuickAdd}
            onQuickAddImage={handleQuickAddImage}
            onBackFromQuickAdd={() => {
                setModalMode("normal");
                setQuickAddItems([]);
                setSelectedQuickAddIndices(new Set());
                setEditingQuickAddItemIndex(null);
            }}
          />

          {modalMode === "normal" && (
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
                lastUsedPortions={lastUsedPortions}
                modalMode={modalMode}
              />
              {internalSelectedFood && (
                <AmountInputSection
                  selectedFood={internalSelectedFood}
                  grams={internalGrams}
                  setGrams={setInternalGrams}
                  unitMode={unitMode}
                  setUnitMode={setUnitMode}
                  autoInput={autoInput}
                  setAutoInput={setAutoInput}
                  handleEstimateGrams={handleEstimateGrams}
                  isAiLoading={isAiLoading}
                  isAiButtonDisabled={isAiButtonDisabled}
                  isEditMode={isEditMode}
                  servingSizeSuggestions={servingSizeSuggestions}
                  isActionDisabled={isActionDisabled}
                  foodGradeResult={foodGradeResult}
                />
              )}
            </View>
          )}

          {modalMode === "quickAddSelect" && (
             <QuickAddList
                items={quickAddItems}
                selectedIndices={selectedQuickAddIndices}
                editingIndex={editingQuickAddItemIndex}
                editedName={editedFoodName}
                editedGrams={editedGrams}
                onToggleItem={handleToggleQuickAddItem}
                onEditItem={handleEditQuickAddItem}
                onSaveEdit={handleSaveQuickAddItemEdit}
                onCancelEdit={handleCancelQuickAddItemEdit}
                onNameChange={setEditedFoodName}
                onGramsChange={handleQuickAddGramsChange}
                isLoading={quickAddLoading}
                foodIcons={foodIcons}
                style={styles.quickAddListStyle}
                onSaveItemToLibrary={handleSaveQuickAddItemToLibrary}
                foods={foods}
            />
          )}
           <View style={{ height: Platform.OS === 'ios' ? 20 : 40 }} />
        </View>
      </KeyboardAvoidingView>
    </Overlay>
  );
};

const useStyles = makeStyles((theme) => ({
    overlayContainer: { backgroundColor: "transparent", width: "90%", maxWidth: 500, padding: 0, borderRadius: 15, shadowColor: "#000", shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.2, shadowRadius: 5, elevation: 6, overflow: "hidden", maxHeight: Dimensions.get("window").height * 0.85, },
    overlayStyle: { width: "100%", height: "100%", borderRadius: 15, padding: 15, paddingBottom: 0, backgroundColor: theme.colors.background, flex: 1, },
    keyboardAvoidingView: { width: "100%", height: "100%" },
    normalModeContentContainer: {
        flex: 1,
        justifyContent: 'flex-start',
    },
    quickAddListStyle: {
        flex: 1,
    },
}));

export default AddEntryModal;
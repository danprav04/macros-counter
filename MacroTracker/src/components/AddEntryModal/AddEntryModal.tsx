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
    [foodName: string]: string | null | undefined;
  }>({});
  const currentlyFetchingIcons = useRef<Set<string>>(new Set());

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

  const handleRequestIcon = useCallback((foodName: string) => {
    if (!foodName || foodIcons[foodName] !== undefined || currentlyFetchingIcons.current.has(foodName)) return;
    currentlyFetchingIcons.current.add(foodName);
    setFoodIcons(prev => ({ ...prev, [foodName]: undefined })); // Indicate loading
    getFoodIconUrl(foodName)
      .then(iconUrl => setFoodIcons(prevIcons => ({ ...prevIcons, [foodName]: iconUrl })))
      .catch(() => setFoodIcons(prevIcons => ({ ...prevIcons, [foodName]: null }))) // Mark as failed (null)
      .finally(() => currentlyFetchingIcons.current.delete(foodName));
  }, [foodIcons]); // Keep foodIcons dependency to re-trigger if it changes externally (less likely here)

  const foodGradeResult = useMemo((): FoodGradeResult | null => {
    const numericGramsValue = parseFloat(internalGrams);
    if (internalSelectedFood && isValidNumberInput(internalGrams) && numericGramsValue > 0 && dailyGoals) {
        return calculateDailyEntryGrade(internalSelectedFood, numericGramsValue, dailyGoals);
    }
    return null;
  }, [internalSelectedFood, internalGrams, dailyGoals]);

  // Load last used portions when modal becomes visible
  useEffect(() => {
    if (isVisible) {
        loadLastUsedPortions().then(setLastUsedPortions).catch(err => {
            // console.warn("Failed to load last used portions:", err)
        });
    }
  }, [isVisible]);

  // Main initialization and reset effect when modal visibility or primary mode (edit/new) changes
  useEffect(() => {
    if (isVisible) {
      const actuallyEditingDailyItem = isEditMode && initialSelectedFoodForEdit && initialGrams !== undefined;

      if (actuallyEditingDailyItem) {
        // Editing an existing daily item: Set form for edit, force normal mode.
        setInternalSelectedFood(initialSelectedFoodForEdit);
        setInternalGrams(initialGrams);
        setUnitMode("grams");
        setAutoInput("");
        setInternalSearch("");
        setSelectedMultipleFoods(new Map());
        setModalMode("normal"); // Ensure normal mode for direct edits
      } else if (initialSelectedFoodForEdit) {
        // Pre-selected food for a *new* entry (e.g., from FoodListScreen quick add):
        // Set form for this food, ensure normal mode.
        setInternalSelectedFood(initialSelectedFoodForEdit);
        setInternalGrams(initialGrams || ""); // Use initialGrams if provided (e.g., default)
        setUnitMode("grams");
        setAutoInput("");
        setInternalSearch(""); // Clear search as food is pre-selected
        setSelectedMultipleFoods(new Map());
        setModalMode("normal"); // Ensure normal mode
      } else {
        // Standard new blank entry or returning from a completed/cancelled quick add:
        // Only reset form fields if not in an active quick add selection phase.
        // `modalMode` will be "quickAddSelect" if user is in that flow.
        if (modalMode !== "quickAddSelect") {
          setInternalSelectedFood(null);
          setInternalGrams("");
          setInternalSearch("");
          setUnitMode("grams");
          setAutoInput("");
          setSelectedMultipleFoods(new Map());
          setModalMode("normal"); // Default to normal mode
        }
        // If modalMode IS "quickAddSelect", it means pickImageAndAnalyze has set it,
        // and the form fields were already prepared by it. So, no changes here.
      }
    } else { // Modal is closing
      const timer = setTimeout(() => {
        // Reset all relevant states for a clean slate next time
        setInternalSelectedFood(null);
        setInternalSearch("");
        setInternalGrams("");
        setUnitMode("grams");
        setAutoInput("");
        setSelectedMultipleFoods(new Map());

        setModalMode("normal"); // Always reset to normal on close
        setQuickAddItems([]);
        setSelectedQuickAddIndices(new Set());
        setEditingQuickAddItemIndex(null);
        setEditedFoodName("");
        setEditedGrams("");

        setIsAiLoading(false);
        setQuickAddLoading(false); // Ensure loading states are reset
      }, 300); // Delay to allow animation
      return () => clearTimeout(timer);
    }
  }, [isVisible, isEditMode, initialSelectedFoodForEdit, initialGrams]); // `modalMode` removed from deps here as it's now managed more directly or reset on close.

  // Effect for requesting icon for initially selected food (edit or new pre-selected)
  useEffect(() => {
      if (isVisible && initialSelectedFoodForEdit?.name) {
          handleRequestIcon(initialSelectedFoodForEdit.name);
      }
  }, [isVisible, initialSelectedFoodForEdit, handleRequestIcon]);

  // Effect for loading recent foods when in normal mode
  useEffect(() => {
    if (isVisible && modalMode === "normal") {
       loadRecentFoods().then(setRecentFoods).catch(err => {
            // console.warn("Failed to load recent foods:", err);
       });
    }
  }, [isVisible, modalMode]);

  // Effect for pre-fetching icons for visible items in the list (normal or quickAddSelect)
  useEffect(() => {
    if (!isVisible) return;

    let itemsToCheck: (Food | EstimatedFoodItem)[] = [];
    if (modalMode === "normal") {
        const currentDisplayItems: Food[] = [];
        if (!internalSearch) { // No search term, show recents then general
            currentDisplayItems.push(...recentFoods);
            const recentIds = new Set(recentFoods.map(f => f.id));
            currentDisplayItems.push(...foods.filter(f => !recentIds.has(f.id)).slice(0,10)); // Limit general foods for performance
        } else { // Search term active
            currentDisplayItems.push(...foods.filter(f => f.name.toLowerCase().includes(internalSearch.toLowerCase())).slice(0,10)); // Limit search results
        }
        itemsToCheck.push(...currentDisplayItems);
    } else if (modalMode === "quickAddSelect" && quickAddItems.length > 0) {
        itemsToCheck = quickAddItems;
    }

    const namesToFetch = new Set<string>();
    itemsToCheck.forEach(item => {
        // Safely access name property based on item type
        const name = (item as Food).name || (item as EstimatedFoodItem).foodName;
        if (name && foodIcons[name] === undefined && !currentlyFetchingIcons.current.has(name)) {
            namesToFetch.add(name);
        }
    });

    if (namesToFetch.size > 0) {
        namesToFetch.forEach(name => handleRequestIcon(name));
    }
  }, [isVisible, modalMode, internalSearch, recentFoods, foods, quickAddItems, handleRequestIcon, foodIcons]);


  const addToRecentFoods = useCallback(async (food: Food) => {
    if (!food || !food.id) return;
    setRecentFoods((prevRecent) => {
      if (prevRecent.length > 0 && prevRecent[0].id === food.id) return prevRecent; // Already most recent
      const updated = prevRecent.filter((rf) => rf.id !== food.id);
      updated.unshift(food);
      const trimmed = updated.slice(0, MAX_RECENT_FOODS);
      saveRecentFoods(trimmed).catch(() => {}); // fire and forget
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
    // Default suggestions, ensuring no duplicates with lastUsed
    const defaultSuggestions = [
        { label: "50g", value: "50" }, { label: "100g", value: "100" },
        { label: "150g", value: "150" }, { label: "200g", value: "200" }
    ];
    defaultSuggestions.forEach(sugg => {
        if (!lastUsed || String(lastUsed) !== sugg.value) { // Add if not same as last used
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
      setUnitMode("grams"); setAutoInput(""); // Switch back to grams input
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

    parentHandleAddEntry(internalSelectedFood, numericGramsValue); // Call parent's handler

    if (!isEditMode) { // Only add to recent/last used if it's a new entry
        addToRecentFoods(internalSelectedFood);
        const updatedPortions = { ...lastUsedPortions, [internalSelectedFood.id]: numericGramsValue };
        setLastUsedPortions(updatedPortions);
        saveLastUsedPortions(updatedPortions).catch(() => {});
    } else if (isEditMode && internalSelectedFood.id) { // If editing, still update last used portion for this food
        const updatedPortions = { ...lastUsedPortions, [internalSelectedFood.id]: numericGramsValue };
        setLastUsedPortions(updatedPortions);
        saveLastUsedPortions(updatedPortions).catch(() => {});
    }
    // toggleOverlay(); // Parent component (DailyEntryScreen) now handles closing the overlay
  }, [ internalSelectedFood, internalGrams, isActionDisabled, isEditMode, parentHandleAddEntry, addToRecentFoods, lastUsedPortions ]);

  const handleToggleMultipleFoodSelection = useCallback((food: Food, displayGrams: number) => {
    if (isEditMode || internalSelectedFood) return; // Disable multi-select if editing or a single food is already selected
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

    parentHandleAddMultipleEntries(entriesToAdd); // Call parent's handler

    // Update recent foods and last used portions for all added items
    const newPortionsToSave: LastUsedPortions = { ...lastUsedPortions };
    entriesToAdd.forEach(entry => {
        if (entry.food.id) { newPortionsToSave[entry.food.id] = entry.grams; }
        addToRecentFoods(entry.food);
    });
    setLastUsedPortions(newPortionsToSave);
    saveLastUsedPortions(newPortionsToSave).catch(() => {});
    setSelectedMultipleFoods(new Map()); // Clear selection
    // toggleOverlay(); // Parent component handles closing
  }, [ isEditMode, internalSelectedFood, selectedMultipleFoods, isActionDisabled, parentHandleAddMultipleEntries, lastUsedPortions, addToRecentFoods ]);


  const pickImageAndAnalyze = useCallback( async (source: "camera" | "gallery") => {
      if (isEditMode) return; // Prevent if modal is for editing an existing entry

      // Reset and prepare for quick add flow
      setQuickAddItems([]); setSelectedQuickAddIndices(new Set()); setEditingQuickAddItemIndex(null);
      setModalMode("quickAddSelect"); // Switch to quick add UI
      setQuickAddLoading(true);
      // Clear any single/multi food selection from normal mode
      setSelectedMultipleFoods(new Map());
      setInternalSelectedFood(null); setInternalSearch(""); setInternalGrams("");

      let permissionResult; let pickerResult: ImagePicker.ImagePickerResult;
      try {
        if (source === "camera") {
          permissionResult = await ImagePicker.requestCameraPermissionsAsync();
          if (!permissionResult.granted) { Alert.alert(t('addEntryModal.alertQuickAddPermission'), t('addEntryModal.alertQuickAddCameraPermission')); throw new Error("Permission denied"); }
          pickerResult = await ImagePicker.launchCameraAsync({ quality: 1, exif: false });
        } else { // gallery
          permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
          if (!permissionResult.granted) { Alert.alert(t('addEntryModal.alertQuickAddPermission'), t('addEntryModal.alertQuickAddGalleryPermission')); throw new Error("Permission denied"); }
          pickerResult = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ImagePicker.MediaTypeOptions.Images, quality: 1 });
        }

        if (pickerResult.canceled) throw new Error(t('addEntryModal.alertQuickAddUserCancelled'));

        if (pickerResult.assets && pickerResult.assets.length > 0) {
          const originalAsset = pickerResult.assets[0];
          // Compress and get Base64
          const compressedResult = await compressImageIfNeeded(originalAsset);
          const assetForAnalysis = compressedResult ? { ...originalAsset, uri: compressedResult.uri, width: compressedResult.width, height: compressedResult.height, mimeType: 'image/jpeg' } : originalAsset;
          const base64Image = await getBase64FromUri(assetForAnalysis.uri);
          const mimeType = determineMimeType(assetForAnalysis);

          const results = await getMultipleFoodsFromImage(base64Image, mimeType);

          if (results.length === 0) {
            Toast.show({type: 'info', text1: t('addEntryModal.noQuickAddResults'), position: 'bottom'});
            setQuickAddItems([]); // Ensure items are cleared
            setQuickAddLoading(false);
            setModalMode("normal"); // No items, go back to normal mode
          } else {
            setQuickAddItems(results);
            setSelectedQuickAddIndices(new Set(results.map((_, i) => i))); // Pre-select all
            results.forEach(qaItem => { if (qaItem.foodName) { handleRequestIcon(qaItem.foodName); } });
            setQuickAddLoading(false); // Loading finished, items are set
            // Modal mode is already "quickAddSelect", so QuickAddList will show
          }
        } else {
          throw new Error(t('addEntryModal.alertQuickAddCouldNotSelect'));
        }
      } catch (error: any) {
        // Only show generic alert if it's not a user cancellation or permission denial or a BackendError (already alerted)
        if ( error.message !== t('addEntryModal.alertQuickAddUserCancelled') && error.message !== "Permission denied" && !(error instanceof BackendError) ) {
          Alert.alert(t('addEntryModal.alertQuickAddError'), error.message || t('addEntryModal.alertQuickAddErrorMessage'));
        }
        // Reset to normal mode on any error in this flow
        setModalMode("normal");
        setQuickAddItems([]);
        setSelectedQuickAddIndices(new Set());
        setQuickAddLoading(false);
      }
    }, [isEditMode, handleRequestIcon] // Dependencies
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
      if (editingQuickAddItemIndex !== null || isActionDisabled) return; // Prevent toggle if editing
      setSelectedQuickAddIndices((prev) => { const newSet = new Set(prev); if (newSet.has(index)) newSet.delete(index); else newSet.add(index); return newSet; });
    }, [editingQuickAddItemIndex, isActionDisabled]
  );

  const handleEditQuickAddItem = useCallback( (index: number) => {
      if (editingQuickAddItemIndex !== null || isActionDisabled) { // If already editing another, or actions disabled
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
    if (trimmedName) { handleRequestIcon(trimmedName); } // Request icon for potentially new name
    setEditingQuickAddItemIndex(null); setEditedFoodName(""); setEditedGrams(""); Keyboard.dismiss();
  }, [editingQuickAddItemIndex, editedFoodName, editedGrams, isActionDisabled, handleRequestIcon]);

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
          // If food exists in library, use its full data. Otherwise, create a temporary Food object.
          let foodToAdd: Food = existingFood ? existingFood : { id: uuidv4(), name: item.foodName, calories: Math.round(Number(item.calories_per_100g) || 0), protein: Math.round(Number(item.protein_per_100g) || 0), carbs: Math.round(Number(item.carbs_per_100g) || 0), fat: Math.round(Number(item.fat_per_100g) || 0), };
          const entryGrams = Math.max(1, Math.round(Number(item.estimatedWeightGrams) || 1)); // Ensure grams is at least 1
          entriesToAdd.push({ food: foodToAdd, grams: entryGrams });

          // Update last used portions
          if (foodToAdd.id) { newPortionsToSave[foodToAdd.id] = entryGrams; }
        }
      });

      if (entriesToAdd.length > 0) {
        parentHandleAddMultipleEntries(entriesToAdd); // Call parent's handler
        setLastUsedPortions(newPortionsToSave);
        saveLastUsedPortions(newPortionsToSave).catch(() => {});
      } else { Alert.alert(t('addEntryModal.alertQuickAddNothingToAdd'), t('addEntryModal.alertQuickAddNothingToAddMessage')); }
      // toggleOverlay(); // Parent handles closing
    } catch (error) { Alert.alert(t('addEntryModal.alertQuickAddErrorPreparing'), t('addEntryModal.alertQuickAddErrorPreparingMessage')); }
  }, [ foods, quickAddItems, selectedQuickAddIndices, editingQuickAddItemIndex, parentHandleAddMultipleEntries, isEditMode, isActionDisabled, lastUsedPortions ]);


  const handleQuickAddGramsChange = useCallback((text: string) => {
    const cleanedText = text.replace(/[^0-9]/g, ""); // Allow only digits
    setEditedGrams(cleanedText);
  }, []);

  const handleSaveQuickAddItemToLibrary = useCallback(async (
    item: EstimatedFoodItem,
    setSavingState: (isSaving: boolean) => void // Callback to manage QuickAddItem's local saving state
  ) => {
    setSavingState(true);
    try {
        const foodData: Omit<Food, 'id'> = {
            name: item.foodName, calories: Math.round(item.calories_per_100g),
            protein: Math.round(item.protein_per_100g), carbs: Math.round(item.carbs_per_100g),
            fat: Math.round(item.fat_per_100g),
        };
        const existingFood = foods.find(f => f.name.toLowerCase() === item.foodName.toLowerCase());

        if (existingFood) { // Food already exists, confirm overwrite
            Alert.alert( t('addEntryModal.alertOverwriteFoodTitle'), t('addEntryModal.alertOverwriteFoodMessage', { foodName: item.foodName }),
                [ { text: t('addEntryModal.cancel'), style: 'cancel', onPress: () => setSavingState(false) },
                  { text: t('addEntryModal.overwrite'), onPress: async () => {
                          const foodToUpdate: Food = { ...existingFood, ...foodData }; // Spread existing then new to update
                          const updatedFood = await onCommitFoodToLibrary(foodToUpdate, true); // isUpdate = true
                          if (updatedFood) { Toast.show({ type: 'success', text1: t('addEntryModal.toastFoodUpdatedInLibrary', { foodName: updatedFood.name }), position: 'bottom' }); handleRequestIcon(updatedFood.name); }
                          setSavingState(false);
                      },
                  }, ]
            );
        } else { // New food, commit directly
            const newFood = await onCommitFoodToLibrary(foodData, false); // isUpdate = false
            if (newFood) { Toast.show({ type: 'success', text1: t('addEntryModal.toastFoodSavedToLibrary', { foodName: newFood.name }), position: 'bottom' }); handleRequestIcon(newFood.name); }
            setSavingState(false);
        }
    } catch (error) {
        // console.error("Error saving quick add item to library:", error);
        Toast.show({ type: 'error', text1: t('addEntryModal.toastErrorSavingToLibrary'), position: 'bottom' });
        setSavingState(false);
    }
  }, [foods, onCommitFoodToLibrary, handleRequestIcon]);


  // Determine modal title based on current mode and state
  const modalTitle = modalMode === "quickAddSelect"
    ? editingQuickAddItemIndex !== null ? t('addEntryModal.titleQuickAddEdit')
    : quickAddLoading ? t('addEntryModal.titleQuickAddAnalyzing')
    : t('addEntryModal.titleQuickAddSelect')
    : isEditMode ? t('addEntryModal.titleEdit') // Normal mode, editing existing entry
    : t('addEntryModal.titleAdd'); // Normal mode, adding new entry

  // Button disable logic
  const numericGramsValueForValidation = parseFloat(internalGrams);
  const isSingleAddButtonDisabled = modalMode !== "normal" || !internalSelectedFood || !isValidNumberInput(internalGrams) || numericGramsValueForValidation <= 0 || isActionDisabled;
  const isMultiAddButtonDisabled = modalMode !== "normal" || selectedMultipleFoods.size === 0 || !!internalSelectedFood || isEditMode || isActionDisabled;
  const isAiButtonDisabled = modalMode !== "normal" || !internalSelectedFood || !autoInput.trim() || isActionDisabled || isAiLoading;
  const isQuickAddConfirmDisabled = isEditMode || modalMode !== "quickAddSelect" || selectedQuickAddIndices.size === 0 || editingQuickAddItemIndex !== null || isActionDisabled || quickAddLoading;
  const isQuickAddImageButtonDisabled = isEditMode || isActionDisabled || quickAddLoading;

  // Overlay style
  const combinedOverlayStyle = StyleSheet.flatten([ styles.overlayStyle, { backgroundColor: theme.colors.background }, ]);

  return (
    <Overlay isVisible={isVisible} onBackdropPress={!isActionDisabled ? toggleOverlay : undefined} animationType="slide" overlayStyle={styles.overlayContainer} >
      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} style={styles.keyboardAvoidingView} keyboardVerticalOffset={KEYBOARD_VERTICAL_OFFSET} >
        <View style={combinedOverlayStyle}>
          <ModalHeader
            title={modalTitle}
            isEditMode={isEditMode} // For styling the title if it's an existing daily entry edit
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
            isAiLoading={isAiLoading} // For single add/update button loading state
            toggleOverlay={toggleOverlay}
            onAddOrUpdateSingleEntry={handleAddOrUpdateSingleEntry}
            onConfirmAddMultipleSelected={handleConfirmAddMultipleSelected}
            onConfirmQuickAdd={handleConfirmQuickAdd}
            onQuickAddImage={handleQuickAddImage}
            onBackFromQuickAdd={() => { // Action for back button in QuickAdd mode header
                setModalMode("normal");
                setQuickAddItems([]);
                setSelectedQuickAddIndices(new Set());
                setEditingQuickAddItemIndex(null);
                // Form fields (grams, search etc.) will be reset by the main useEffect if needed when isVisible changes or for new entries.
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
                handleSelectFood={setInternalSelectedFood} // Directly set the food
                setGrams={setInternalGrams} // Allow FoodSelectionList to set grams (e.g. from last used)
                setSelectedMultipleFoods={setSelectedMultipleFoods} // Manage multi-selection map
                selectedMultipleFoods={selectedMultipleFoods}
                handleToggleMultipleFoodSelection={handleToggleMultipleFoodSelection}
                foodIcons={foodIcons}
                onAddNewFoodRequest={onAddNewFoodRequest}
                isActionDisabled={isActionDisabled}
                isEditMode={isEditMode} // Editing an existing daily entry, not food library item
                lastUsedPortions={lastUsedPortions}
                modalMode={modalMode}
              />
              {internalSelectedFood && ( // Only show amount input if a food is selected
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
                  isEditMode={isEditMode} // Editing an existing daily entry
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
                isLoading={quickAddLoading} // Pass loading state to QuickAddList
                foodIcons={foodIcons}
                style={styles.quickAddListStyle}
                onSaveItemToLibrary={handleSaveQuickAddItemToLibrary}
                foods={foods} // Pass full food library for checking existence
            />
          )}
           {/* Spacer for keyboard avoidance, especially on iOS */}
           <View style={{ height: Platform.OS === 'ios' ? 20 : 40 }} />
        </View>
      </KeyboardAvoidingView>
    </Overlay>
  );
};

const useStyles = makeStyles((theme) => ({
    overlayContainer: { backgroundColor: "transparent", width: "90%", maxWidth: 500, padding: 0, borderRadius: 15, shadowColor: "#000", shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.2, shadowRadius: 5, elevation: 6, overflow: "hidden", maxHeight: Dimensions.get("window").height * 0.85, },
    overlayStyle: { width: "100%", height: "100%", borderRadius: 15, padding: 15, paddingBottom: 0, /* paddingBottom handled by spacer view */ backgroundColor: theme.colors.background, flex: 1, },
    keyboardAvoidingView: { width: "100%", height: "100%" }, // Ensure KAV takes full space of overlay
    normalModeContentContainer: {
        flex: 1, // Allow this section to grow and shrink
        justifyContent: 'flex-start', // Align content to the top
    },
    quickAddListStyle: {
        flex: 1, // Allow list to take available space
    },
}));

export default AddEntryModal;
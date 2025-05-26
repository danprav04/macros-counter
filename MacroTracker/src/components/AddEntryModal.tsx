// src/components/AddEntryModal.tsx
import React, {
  useEffect,
  useState,
  useMemo,
  useCallback,
  useRef,
} from "react";
import {
  View,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  TouchableOpacity,
  ScrollView,
  Dimensions,
  Image,
  StyleSheet,
  ActivityIndicator,
  Alert,
  Keyboard,
} from "react-native";
import {
  Button,
  Input,
  Text,
  ListItem,
  Overlay,
  SearchBar,
  makeStyles,
  useTheme,
  Icon,
  ButtonGroup,
  CheckBox, // Added CheckBox
} from "@rneui/themed";
import { Food } from "../types/food";
import { isValidNumberInput } from "../utils/validationUtils";
import {
  loadRecentFoods,
  saveRecentFoods,
  loadLastUsedPortions,
  saveLastUsedPortions,
  LastUsedPortions,
} from "../services/storageService";
import { getFoodIconUrl } from "../utils/iconUtils";
import { getGramsFromNaturalLanguage } from "../utils/units";
import Toast from "react-native-toast-message";
import * as ImagePicker from "expo-image-picker";
import {
  EstimatedFoodItem,
  getMultipleFoodsFromImage,
  BackendError,
  determineMimeType,
} from "../utils/macros";
import { compressImageIfNeeded, getBase64FromUri } from "../utils/imageUtils";
import { v4 as uuidv4 } from "uuid";
import QuickAddList from "./QuickAddList";
import i18n, { t } from '../localization/i18n';
import { calculateDailyEntryGrade, FoodGradeResult } from "../utils/gradingUtils";
import { Settings } from '../types/settings';

interface AddEntryModalProps {
  isVisible: boolean;
  toggleOverlay: () => void;
  selectedFood: Food | null;
  grams: string;
  setGrams: (grams: string) => void;
  handleAddEntry: () => void;
  handleAddMultipleEntries: (entries: { food: Food; grams: number }[]) => void;
  foods: Food[];
  handleSelectFood: (item: Food | null) => void;
  updateSearch: (search: string) => void;
  search: string;
  isEditMode: boolean;
  initialGrams?: string;
  onAddNewFoodRequest: () => void;
  onCommitFoodToLibrary: (foodData: Omit<Food, 'id'> | Food, isUpdate: boolean) => Promise<Food | null>;
  dailyGoals: Settings['dailyGoals'];
}

const KEYBOARD_VERTICAL_OFFSET = Platform.OS === "ios" ? 80 : 0;
const MAX_RECENT_FOODS = 5;
const MAX_RECENT_FOODS_TO_DISPLAY_WITH_ALL = 3;
const DEFAULT_GRAMS_FOR_MULTI_ADD = 100;

type UnitMode = "grams" | "auto";
type ModalMode = "normal" | "quickAddSelect";

type ListItemType =
  | { type: "searchBar"; key: string }
  | { type: "searchResults"; key: string; data: Food }
  | { type: "noResults"; key: string }
  | { type: "emptyLibraryPrompt"; key: string }
  | { type: "amountInput"; key: string }
  | { type: "quickAddHeader"; key: string }
  | { type: "quickAddList"; key: string }
  | { type: "spacer"; key: string; height: number };

const AddEntryModal: React.FC<AddEntryModalProps> = ({
  isVisible,
  toggleOverlay,
  selectedFood,
  grams,
  setGrams,
  handleAddEntry,
  handleAddMultipleEntries,
  foods,
  handleSelectFood,
  updateSearch,
  search,
  isEditMode,
  initialGrams,
  onAddNewFoodRequest,
  onCommitFoodToLibrary,
  dailyGoals,
}) => {
  const { theme } = useTheme();
  const styles = useStyles();
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

  const screenWidth = Dimensions.get("window").width;
  const isActionDisabled = isAiLoading || quickAddLoading;

  const filteredFoodsForSearch = useMemo(() => {
    if (!search) return [];
    const searchTerm = search.toLowerCase();
    return foods.filter((food) =>
      food.name.toLowerCase().includes(searchTerm)
    );
  }, [foods, search]);

  const listData = useMemo((): ListItemType[] => {
    const items: ListItemType[] = [];
    if (modalMode === "normal") {
      items.push({ type: "searchBar", key: "searchBar" });

      if (!search) {
        let combinedList: Food[] = [...recentFoods];
        const recentFoodIds = new Set(recentFoods.map(f => f.id));

        if (recentFoods.length < MAX_RECENT_FOODS_TO_DISPLAY_WITH_ALL && foods.length > 0) {
            const otherFoodsFromLibrary = foods
                .filter(food => !recentFoodIds.has(food.id))
                .sort((a, b) => a.name.localeCompare(b.name));
            combinedList = [...combinedList, ...otherFoodsFromLibrary];
        }
       
        if (combinedList.length > 0) {
             combinedList.forEach((food) => items.push({
                type: "searchResults",
                key: `food-${food.id}`, // Use stable food.id
                data: food,
            }));
        } else {
            items.push({ type: "emptyLibraryPrompt", key: "emptyLibraryPrompt" });
        }

      } else { // Search is active
        if (filteredFoodsForSearch.length > 0) {
            filteredFoodsForSearch.forEach((food) => items.push({
                type: "searchResults",
                key: `search-${food.id}`, // Use stable food.id
                data: food,
            }));
        } else {
            items.push({ type: "noResults", key: "noResults" });
        }
      }
      if (selectedFood) items.push({ type: "amountInput", key: "amountInput" });
    } else if (modalMode === "quickAddSelect") {
      items.push({ type: "quickAddHeader", key: "quickAddHeader" });
      items.push({ type: "quickAddList", key: "quickAddList" });
    }
    items.push({ type: "spacer", key: "bottom-spacer", height: 80 }); // Ensure enough space for floating buttons if any
    return items;
  }, [ modalMode, search, recentFoods, foods, filteredFoodsForSearch, selectedFood, quickAddItems, editingQuickAddItemIndex, selectedQuickAddIndices, quickAddLoading ]);


  const numericGrams = useMemo(() => parseFloat(grams), [grams]);

  const foodGradeResult = useMemo((): FoodGradeResult | null => {
      if (selectedFood && isValidNumberInput(grams) && numericGrams > 0 && dailyGoals) {
          return calculateDailyEntryGrade(selectedFood, numericGrams, dailyGoals);
      }
      return null;
  }, [selectedFood, grams, numericGrams, dailyGoals]);

  useEffect(() => {
    if (isVisible) {
        loadLastUsedPortions().then(setLastUsedPortions).catch(err => {});
    }
  }, [isVisible]);

  useEffect(() => {
    if (!isVisible) {
      const timer = setTimeout(() => {
        handleSelectFood(null);
        updateSearch("");
        setModalMode("normal");
        setQuickAddItems([]);
        setSelectedQuickAddIndices(new Set());
        setEditingQuickAddItemIndex(null);
        setGrams("");
        setUnitMode("grams");
        setAutoInput("");
        setIsAiLoading(false);
        setQuickAddLoading(false);
        setFoodIcons({});
        currentlyFetchingIcons.current.clear();
        setSelectedMultipleFoods(new Map()); // Clear multi-selection on close
      }, 300);
      return () => clearTimeout(timer);
    }
  }, [isVisible, handleSelectFood, updateSearch, setGrams]);

  useEffect(() => {
    if (isVisible) {
       if (modalMode === "normal") {
           loadRecentFoods().then(setRecentFoods).catch(err => {});
       }
      if (modalMode === "normal") {
        if (isEditMode && selectedFood && initialGrams !== undefined) {
          setGrams(initialGrams); setUnitMode("grams"); setAutoInput("");
          setSelectedMultipleFoods(new Map()); // No multi-select in edit mode
        } else if (!isEditMode && !selectedFood) {
          setGrams(""); setUnitMode("grams"); setAutoInput("");
          // Keep selectedMultipleFoods as is, or clear if search/filter changes
        }
      } else if (modalMode === "quickAddSelect") {
        handleSelectFood(null); updateSearch(""); setGrams("");
        setUnitMode("grams"); setAutoInput("");
        setSelectedMultipleFoods(new Map()); // No multi-select in quick add image mode
      }
    }
  }, [ isVisible, modalMode, isEditMode, selectedFood, initialGrams, handleSelectFood, updateSearch, setGrams ]);

  const handleRequestIcon = useCallback((foodName: string) => {
    if (!foodName || foodIcons[foodName] !== undefined || currentlyFetchingIcons.current.has(foodName)) return;
    currentlyFetchingIcons.current.add(foodName);
    setFoodIcons(prev => ({ ...prev, [foodName]: undefined }));
    getFoodIconUrl(foodName)
      .then(iconUrl => setFoodIcons(prevIcons => ({ ...prevIcons, [foodName]: iconUrl })))
      .catch(() => setFoodIcons(prevIcons => ({ ...prevIcons, [foodName]: null })))
      .finally(() => currentlyFetchingIcons.current.delete(foodName));
  }, [foodIcons]);

  useEffect(() => {
      if (!isVisible) return;
      let itemsToCheck: (Food | EstimatedFoodItem)[] = [];
      if (modalMode === "normal") {
          const currentListData = listData;
          currentListData.forEach(listItem => {
              if (listItem.type === "searchResults" && listItem.data) {
                  itemsToCheck.push(listItem.data);
              }
          });
      } else if (modalMode === "quickAddSelect" && quickAddItems.length > 0) {
          itemsToCheck = quickAddItems;
      }
 
      const namesToFetch = new Set<string>();
      itemsToCheck.forEach(item => {
          const name = (item as Food).name || (item as EstimatedFoodItem).foodName;
          if (name && foodIcons[name] === undefined && !currentlyFetchingIcons.current.has(name)) {
              namesToFetch.add(name);
          }
      });
      if (namesToFetch.size > 0) namesToFetch.forEach(name => handleRequestIcon(name));
  }, [isVisible, modalMode, listData, quickAddItems, handleRequestIcon, foodIcons]);


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
  }, []); // MAX_RECENT_FOODS is constant

  const servingSizeSuggestions = useMemo(() => {
    if (!selectedFood || !selectedFood.id) return [];
    const suggestions = [];
    const lastUsed = lastUsedPortions[selectedFood.id];

    if (lastUsed) {
      suggestions.push({ label: t('addEntryModal.lastUsedServing', {grams: lastUsed}), value: String(lastUsed) });
    }
   
    const defaultSuggestions = [
        { label: "50g", value: "50" },
        { label: "100g", value: "100" },
        { label: "150g", value: "150" },
        { label: "200g", value: "200" }
    ];

    defaultSuggestions.forEach(sugg => {
        if (!lastUsed || String(lastUsed) !== sugg.value) {
            suggestions.push(sugg);
        }
    });

    return suggestions;
  }, [selectedFood, lastUsedPortions, i18n.locale]);

  const handleEstimateGrams = useCallback(async () => {
    Keyboard.dismiss();
    if (!selectedFood || !autoInput.trim()) {
      Alert.alert(t('addEntryModal.alertInputMissing'), t('addEntryModal.alertInputMissingMessage')); return;
    }
    if (isAiLoading) return; setIsAiLoading(true);
    try {
      const estimatedGrams = await getGramsFromNaturalLanguage(selectedFood.name, autoInput);
      const roundedGrams = String(Math.round(estimatedGrams)); setGrams(roundedGrams);
      setUnitMode("grams"); setAutoInput("");
      Toast.show({ type: "success", text1: t('addEntryModal.alertGramsEstimated'), text2: t('addEntryModal.alertGramsEstimatedMessage', {grams: roundedGrams, foodName: selectedFood.name}), position: "bottom", });
    } catch (error: any) { /* Error handled by getGramsFromNaturalLanguage */ }
    finally { setIsAiLoading(false); }
  }, [selectedFood, autoInput, isAiLoading, setGrams]);

  const handleAddOrUpdateSingleEntry = useCallback(async () => {
    Keyboard.dismiss();
    if (!selectedFood || !selectedFood.id) { Alert.alert(t('addEntryModal.alertFoodNotSelected'), t('addEntryModal.alertFoodNotSelectedMessage')); return; }
    if (!isValidNumberInput(grams) || numericGrams <= 0) { Alert.alert(t('addEntryModal.alertInvalidAmount'), t('addEntryModal.alertInvalidAmountMessage')); return; }
    if (isActionDisabled) return;
   
    handleAddEntry();

    if (!isEditMode) {
        addToRecentFoods(selectedFood);
        const updatedPortions = { ...lastUsedPortions, [selectedFood.id]: numericGrams };
        setLastUsedPortions(updatedPortions);
        saveLastUsedPortions(updatedPortions).catch(() => {});
    } else if (isEditMode && selectedFood.id) {
        const updatedPortions = { ...lastUsedPortions, [selectedFood.id]: numericGrams };
        setLastUsedPortions(updatedPortions);
        saveLastUsedPortions(updatedPortions).catch(() => {});
    }

  }, [ selectedFood, grams, numericGrams, isActionDisabled, isEditMode, handleAddEntry, addToRecentFoods, lastUsedPortions ]);

  const handleInternalSelectFood = useCallback( (item: Food | null) => {
      handleSelectFood(item);
      updateSearch(""); // Clear search when a food is selected for single entry
      Keyboard.dismiss();
      setSelectedMultipleFoods(new Map()); // Clear multi-selection when entering single food mode

      if (!isEditMode && item?.id !== selectedFood?.id) {
          setUnitMode("grams");
          setAutoInput("");
          const lastPortion = item?.id ? lastUsedPortions[item.id] : undefined;
          if (lastPortion) {
            setGrams(String(lastPortion));
          } else {
            setGrams(""); // Or set to default like "100" if preferred for new selections
          }
      }
    }, [handleSelectFood, updateSearch, isEditMode, selectedFood, setGrams, lastUsedPortions]
  );

  const handleToggleMultipleFoodSelection = useCallback((food: Food, displayGrams: number) => {
    if (isEditMode || selectedFood) return; // Don't allow multi-select if in edit mode or single food selected for gram input

    setSelectedMultipleFoods(prev => {
        const newSelection = new Map(prev);
        if (newSelection.has(food.id)) {
            newSelection.delete(food.id);
        } else {
            newSelection.set(food.id, { food, grams: displayGrams });
        }
        return newSelection;
    });
  }, [isEditMode, selectedFood]);

  const handleConfirmAddMultipleSelected = useCallback(async () => {
    if (isEditMode || selectedFood || selectedMultipleFoods.size === 0 || isActionDisabled) return;
    Keyboard.dismiss();

    const entriesToAdd: { food: Food; grams: number }[] = Array.from(selectedMultipleFoods.values());
    if (entriesToAdd.length === 0) return;

    handleAddMultipleEntries(entriesToAdd); // This is a prop call

    const newPortionsToSave: LastUsedPortions = { ...lastUsedPortions };
    entriesToAdd.forEach(entry => {
        if (entry.food.id) {
            newPortionsToSave[entry.food.id] = entry.grams;
        }
        addToRecentFoods(entry.food);
    });

    setLastUsedPortions(newPortionsToSave);
    saveLastUsedPortions(newPortionsToSave).catch(() => {});
    
    setSelectedMultipleFoods(new Map()); // Clear selection
    // toggleOverlay(); // Close modal after adding
  }, [
    isEditMode, selectedFood, selectedMultipleFoods, isActionDisabled,
    handleAddMultipleEntries, lastUsedPortions, addToRecentFoods, toggleOverlay
  ]);


  const pickImageAndAnalyze = useCallback( async (source: "camera" | "gallery") => {
      if (isEditMode) return;
      setQuickAddItems([]); setSelectedQuickAddIndices(new Set()); setEditingQuickAddItemIndex(null);
      setModalMode("quickAddSelect"); setQuickAddLoading(true);
      setSelectedMultipleFoods(new Map()); // Clear multi-select
      handleSelectFood(null); updateSearch(""); setGrams("");
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
          if (results.length === 0) { setTimeout(() => { setModalMode("normal"); setQuickAddLoading(false); }, 500); }
          else {
            setQuickAddItems(results); setSelectedQuickAddIndices(new Set(results.map((_, i) => i)));
            results.forEach(qaItem => { if (qaItem.foodName) { handleRequestIcon(qaItem.foodName); } });
            setTimeout(() => setQuickAddLoading(false), 150);
          }
        } else { throw new Error(t('addEntryModal.alertQuickAddCouldNotSelect')); }
      } catch (error: any) {
        if ( error.message !== t('addEntryModal.alertQuickAddUserCancelled') && error.message !== "Permission denied" && !(error instanceof BackendError) ) {
          Alert.alert(t('addEntryModal.alertQuickAddError'), error.message || t('addEntryModal.alertQuickAddErrorMessage'));
        }
        setModalMode("normal"); setQuickAddItems([]); setSelectedQuickAddIndices(new Set()); setQuickAddLoading(false);
      }
    }, [isEditMode, handleSelectFood, updateSearch, setGrams, handleRequestIcon]
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
      if (editingQuickAddItemIndex !== null || isActionDisabled) { if (editingQuickAddItemIndex !== null) Alert.alert(t('addEntryModal.alertQuickAddFinishEditing'), t('addEntryModal.alertQuickAddFinishEditingSaveOrCancel')); return; }
      const item = quickAddItems[index]; setEditingQuickAddItemIndex(index);
      setEditedFoodName(item.foodName); setEditedGrams(String(Math.round(item.estimatedWeightGrams)));
    }, [editingQuickAddItemIndex, quickAddItems, isActionDisabled]
  );

  const handleSaveQuickAddItemEdit = useCallback(() => {
    if (editingQuickAddItemIndex === null || isActionDisabled) return;
    const trimmedName = editedFoodName.trim(); if (!trimmedName) { Alert.alert(t('addEntryModal.alertQuickAddInvalidName'), t('addEntryModal.alertQuickAddInvalidNameMessage')); return; }
    const numericEditedGrams = parseFloat(editedGrams); if (!isValidNumberInput(editedGrams) || numericEditedGrams <= 0) { Alert.alert(t('addEntryModal.alertQuickAddInvalidGrams'), t('addEntryModal.alertQuickAddInvalidGramsMessage')); return; }
    const roundedGrams = Math.round(numericEditedGrams);
    setQuickAddItems((prevItems) => prevItems.map((item, index) => index === editingQuickAddItemIndex ? { ...item, foodName: trimmedName, estimatedWeightGrams: roundedGrams, } : item ));
    if (trimmedName) { handleRequestIcon(trimmedName); }
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
          let foodToAdd: Food = existingFood ? existingFood : { id: uuidv4(), name: item.foodName, calories: Math.round(Number(item.calories_per_100g) || 0), protein: Math.round(Number(item.protein_per_100g) || 0), carbs: Math.round(Number(item.carbs_per_100g) || 0), fat: Math.round(Number(item.fat_per_100g) || 0), };
          const entryGrams = Math.max(1, Math.round(Number(item.estimatedWeightGrams) || 1));
          entriesToAdd.push({ food: foodToAdd, grams: entryGrams });
          if (foodToAdd.id) {
            newPortionsToSave[foodToAdd.id] = entryGrams;
          }
        }
      });

      if (entriesToAdd.length > 0) {
        handleAddMultipleEntries(entriesToAdd);
        setLastUsedPortions(newPortionsToSave);
        saveLastUsedPortions(newPortionsToSave).catch(() => {});
      } else {
        Alert.alert(t('addEntryModal.alertQuickAddNothingToAdd'), t('addEntryModal.alertQuickAddNothingToAddMessage'));
      }
    } catch (error) { Alert.alert(t('addEntryModal.alertQuickAddErrorPreparing'), t('addEntryModal.alertQuickAddErrorPreparingMessage')); }
  }, [ foods, quickAddItems, selectedQuickAddIndices, editingQuickAddItemIndex, handleAddMultipleEntries, isEditMode, isActionDisabled, lastUsedPortions ]);

  const handleQuickAddGramsChange = useCallback((text: string) => {
    const cleanedText = text.replace(/[^0-9]/g, ""); setEditedGrams(cleanedText);
  }, []);

  const handleSaveQuickAddItemToLibrary = useCallback(async (
    item: EstimatedFoodItem,
    setSavingState: (isSaving: boolean) => void
  ) => {
    setSavingState(true);
    try {
        const foodData: Omit<Food, 'id'> = {
            name: item.foodName,
            calories: Math.round(item.calories_per_100g),
            protein: Math.round(item.protein_per_100g),
            carbs: Math.round(item.carbs_per_100g),
            fat: Math.round(item.fat_per_100g),
        };

        const existingFood = foods.find(f => f.name.toLowerCase() === item.foodName.toLowerCase());

        if (existingFood) {
            Alert.alert(
                t('addEntryModal.alertOverwriteFoodTitle'),
                t('addEntryModal.alertOverwriteFoodMessage', { foodName: item.foodName }),
                [
                    { text: t('addEntryModal.cancel'), style: 'cancel', onPress: () => setSavingState(false) },
                    {
                        text: t('addEntryModal.overwrite'),
                        onPress: async () => {
                            const foodToUpdate: Food = { ...existingFood, ...foodData };
                            const updatedFood = await onCommitFoodToLibrary(foodToUpdate, true);
                            if (updatedFood) {
                                Toast.show({ type: 'success', text1: t('addEntryModal.toastFoodUpdatedInLibrary', { foodName: updatedFood.name }), position: 'bottom' });
                                handleRequestIcon(updatedFood.name);
                            }
                            setSavingState(false);
                        },
                    },
                ]
            );
        } else {
            const newFood = await onCommitFoodToLibrary(foodData, false);
            if (newFood) {
                Toast.show({ type: 'success', text1: t('addEntryModal.toastFoodSavedToLibrary', { foodName: newFood.name }), position: 'bottom' });
                handleRequestIcon(newFood.name);
            }
            setSavingState(false);
        }
    } catch (error) {
        console.error("Error saving quick add item to library:", error);
        Toast.show({ type: 'error', text1: t('addEntryModal.toastErrorSavingToLibrary'), position: 'bottom' });
        setSavingState(false);
    }
  }, [foods, onCommitFoodToLibrary, handleRequestIcon]);


  const isSingleAddButtonDisabled = modalMode !== "normal" || !selectedFood || !isValidNumberInput(grams) || numericGrams <= 0 || isActionDisabled;
  const isMultiAddButtonDisabled = modalMode !== "normal" || selectedMultipleFoods.size === 0 || !!selectedFood || isEditMode || isActionDisabled;
  const isAiButtonDisabled = modalMode !== "normal" || !selectedFood || !autoInput.trim() || isActionDisabled;
  const isQuickAddConfirmDisabled = isEditMode || modalMode !== "quickAddSelect" || selectedQuickAddIndices.size === 0 || editingQuickAddItemIndex !== null || isActionDisabled || quickAddLoading;
  const isQuickAddImageButtonDisabled = isEditMode || isActionDisabled;


  const renderListItem = useCallback(
    ({ item }: { item: ListItemType }): React.ReactElement | null => {
      switch (item.type) {
        case "searchBar": return ( <SearchBar placeholder={t('addEntryModal.searchPlaceholder')} onChangeText={(text) => { updateSearch(text); if (selectedFood) { handleSelectFood(null); setGrams(""); setSelectedMultipleFoods(new Map());} }} value={search} platform={Platform.OS === "ios" ? "ios" : "android"} containerStyle={styles.searchBarContainer} inputContainerStyle={styles.searchBarInputContainer} inputStyle={styles.searchInputStyle} onCancel={() => {updateSearch(""); if (selectedFood) { handleSelectFood(null); setGrams(""); setSelectedMultipleFoods(new Map());}}} showCancel={Platform.OS === "ios"} onClear={() => {updateSearch(""); if (selectedFood) { handleSelectFood(null); setGrams(""); setSelectedMultipleFoods(new Map());}}} disabled={isActionDisabled || modalMode !== "normal"} /> );
        case "searchResults": {
            const foodItem = item.data;
            const isSingleSelected = selectedFood?.id === foodItem.id;
            const iconStatus = foodIcons[foodItem.name];
            const displayGramsForMulti = lastUsedPortions[foodItem.id] || DEFAULT_GRAMS_FOR_MULTI_ADD;
            const isMultiSelected = selectedMultipleFoods.has(foodItem.id);
            const canMultiSelect = modalMode === "normal" && !isEditMode && !selectedFood; // Multi-select only if not editing and no single food is focused

            return (
              <TouchableOpacity
                onPress={() => !isActionDisabled && handleInternalSelectFood(foodItem)}
                disabled={isActionDisabled}
                style={[isActionDisabled && styles.disabledOverlay]}
              >
                <ListItem
                  bottomDivider
                  containerStyle={[
                    styles.listItemContainer,
                    isSingleSelected && styles.selectedListItem,
                    isMultiSelected && canMultiSelect && styles.multiSelectedListItem, // Style for multi-selected items
                  ]}
                >
                  {!isEditMode && !selectedFood && ( // Show checkbox only in multi-select mode
                    <CheckBox
                      checked={isMultiSelected}
                      onPress={() => handleToggleMultipleFoodSelection(foodItem, displayGramsForMulti)}
                      containerStyle={styles.multiSelectCheckbox}
                      size={22}
                      disabled={!canMultiSelect || isActionDisabled}
                    />
                  )}
                  {iconStatus === undefined ? <ActivityIndicator size="small" color={theme.colors.grey3} style={styles.foodIcon} /> : iconStatus ? <Image source={{ uri: iconStatus }} style={styles.foodIcon} resizeMode="contain" /> : <View style={styles.defaultIconContainer}><Icon name="restaurant" type="material" size={18} color={theme.colors.grey3} /></View> }
                  <ListItem.Content>
                    <ListItem.Title style={styles.listItemTitle} numberOfLines={1} ellipsizeMode="tail">{foodItem.name}</ListItem.Title>
                    {!selectedFood && !isEditMode && ( // Show grams for multi-add only when not in single-select mode
                         <ListItem.Subtitle style={styles.listItemSubtitleSecondary}>
                            {t('addEntryModal.grams')}: {displayGramsForMulti}g
                         </ListItem.Subtitle>
                    )}
                  </ListItem.Content>
                  {isSingleSelected && (<Icon name="checkmark-circle" type="ionicon" color={theme.colors.primary} size={24} />)}
                </ListItem>
              </TouchableOpacity>
            );
          }
        case "noResults":
          return (
            <View style={styles.noResultsContainer}>
              <Text style={styles.noFoodsText}>
                {t('addEntryModal.noResults', { searchTerm: search })}
              </Text>
              {modalMode === "normal" && search && (
                <Button
                  title={t('addEntryModal.addNewFoodButton')}
                  onPress={onAddNewFoodRequest}
                  type="outline"
                  buttonStyle={styles.addNewFoodButton}
                  titleStyle={styles.addNewFoodButtonTitle}
                  icon={<Icon name="add-circle-outline" type="ionicon" size={20} color={theme.colors.primary} />}
                  disabled={isActionDisabled}
                />
              )}
            </View>
          );
        case "emptyLibraryPrompt":
             return (
               <View style={styles.noResultsContainer}>
                 <Text style={styles.noFoodsText}>
                   {t('addEntryModal.emptyLibraryMessage')}
                 </Text>
                 <Button
                   title={t('addEntryModal.addNewFoodButton')}
                   onPress={onAddNewFoodRequest}
                   type="outline"
                   buttonStyle={styles.addNewFoodButton}
                   titleStyle={styles.addNewFoodButtonTitle}
                   icon={<Icon name="add-circle-outline" type="ionicon" size={20} color={theme.colors.primary} />}
                   disabled={isActionDisabled}
                 />
               </View>
             );
        case "amountInput": if (!selectedFood) return null;
          return ( <View style={styles.amountSection}><View style={styles.unitSelectorContainer}>
                <View style={styles.amountLabelContainer}>
                    <Text style={styles.inputLabel}>{t('addEntryModal.amount')}</Text>
                    {foodGradeResult && (
                        <Text style={[styles.gradePill, { backgroundColor: foodGradeResult.color }]}>
                            {foodGradeResult.letter}
                        </Text>
                    )}
                </View>
                <ButtonGroup buttons={[t('addEntryModal.grams'), t('addEntryModal.autoAi')]} selectedIndex={unitMode === "grams" ? 0 : 1} onPress={(index) => !isActionDisabled && setUnitMode(index === 0 ? "grams" : "auto")} containerStyle={styles.buttonGroupContainer} selectedButtonStyle={{ backgroundColor: theme.colors.primary, }} textStyle={styles.buttonGroupText} selectedTextStyle={{ color: theme.colors.white }} disabled={isEditMode ? [1] : isActionDisabled ? [0, 1] : []} disabledStyle={styles.disabledButtonGroup} disabledTextStyle={{ color: theme.colors.grey3 }} />
              </View>
              {unitMode === "grams" && ( <>
                  {!isEditMode && servingSizeSuggestions.length > 0 && ( <View style={styles.servingSizeRow}><Text style={styles.servingSizeLabel}>{t('addEntryModal.quickAddServing')}</Text><ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.servingSizeContainer} keyboardShouldPersistTaps="handled">
                        {servingSizeSuggestions.map((suggestion) => ( <TouchableOpacity key={suggestion.label} style={[ styles.servingSizeButton, isActionDisabled && styles.disabledOverlay, ]} onPress={() => !isActionDisabled && setGrams(suggestion.value)} disabled={isActionDisabled}><Text style={styles.servingSizeButtonTitle}>{suggestion.label}</Text></TouchableOpacity> ))}
                      </ScrollView></View> )}
                  <Input placeholder={isEditMode ? t('addEntryModal.gramsPlaceholderEdit') : t('addEntryModal.gramsPlaceholder')} keyboardType="numeric" value={grams} onChangeText={(text) => { const cleanedText = text.replace(/[^0-9.]/g, "").replace(/(\..*?)\./g, "$1"); setGrams(cleanedText); }} inputStyle={styles.gramInputStyle} inputContainerStyle={styles.gramInputContainerStyle} errorMessage={ !isValidNumberInput(grams) && grams !== "" && grams !== "." ? t('addEntryModal.gramsError') : "" } errorStyle={{ color: theme.colors.error }} rightIcon={<Text style={styles.unitText}>g</Text>} containerStyle={{ paddingHorizontal: 0 }} key={`grams-input-${selectedFood.id}-${isEditMode}`} disabled={isActionDisabled} />
                </> )}
              {unitMode === "auto" && !isEditMode && ( <View style={styles.autoInputRow}>
                  <Input placeholder={t('addEntryModal.autoPlaceholder')} value={autoInput} onChangeText={setAutoInput} inputStyle={[styles.gramInputStyle, styles.autoInputField]} inputContainerStyle={styles.gramInputContainerStyle} containerStyle={styles.autoInputContainer} multiline={false} onSubmitEditing={handleEstimateGrams} key={`auto-input-${selectedFood.id}`} disabled={isActionDisabled} />
                  <Button onPress={handleEstimateGrams} disabled={isAiButtonDisabled || isActionDisabled} loading={isAiLoading} buttonStyle={styles.aiButton} icon={ isAiLoading ? undefined : ( <Icon name="calculator-variant" type="material-community" size={20} color={theme.colors.white} /> ) } title={isAiLoading ? "" : ""} />
                </View> )}
            </View> );
        case "quickAddHeader": return ( <View style={styles.quickAddHeader}><Text style={styles.sectionTitle}>{editingQuickAddItemIndex !== null ? t('addEntryModal.quickAddHeaderEdit') : t('addEntryModal.quickAddHeader')}</Text>
              {editingQuickAddItemIndex === null && ( <Button type="clear" title={t('addEntryModal.buttonBack')} onPress={() => { if (isActionDisabled) return; setModalMode("normal"); setQuickAddItems([]); setSelectedQuickAddIndices(new Set()); setEditingQuickAddItemIndex(null); }} titleStyle={{ color: theme.colors.primary, fontSize: 14 }} icon={<Icon name="arrow-back" type="ionicon" size={18} color={theme.colors.primary} />} disabled={isActionDisabled} /> )}
            </View> );
        case "quickAddList": return ( <QuickAddList items={quickAddItems} selectedIndices={selectedQuickAddIndices} editingIndex={editingQuickAddItemIndex} editedName={editedFoodName} editedGrams={editedGrams} onToggleItem={handleToggleQuickAddItem} onEditItem={handleEditQuickAddItem} onSaveEdit={handleSaveQuickAddItemEdit} onCancelEdit={handleCancelQuickAddItemEdit} onNameChange={setEditedFoodName} onGramsChange={handleQuickAddGramsChange} isLoading={quickAddLoading} foodIcons={foodIcons} style={styles.quickAddListStyle} onSaveItemToLibrary={handleSaveQuickAddItemToLibrary} foods={foods} /> );
        case "spacer": return <View style={{ height: item.height }} />;
        default: return null;
      }
    }, [ search, updateSearch, isActionDisabled, modalMode, screenWidth, selectedFood, foodIcons, handleInternalSelectFood, foodGradeResult, unitMode, setUnitMode, isEditMode, servingSizeSuggestions, setGrams, grams, autoInput, setAutoInput, handleEstimateGrams, isAiLoading, isAiButtonDisabled, theme, styles, quickAddLoading, quickAddItems, editingQuickAddItemIndex, selectedQuickAddIndices, editedFoodName, editedGrams, handleToggleQuickAddItem, handleEditQuickAddItem, handleSaveQuickAddItemEdit, handleCancelQuickAddItemEdit, handleQuickAddGramsChange, handleConfirmQuickAdd, handleQuickAddImage, onAddNewFoodRequest, handleSaveQuickAddItemToLibrary, foods, filteredFoodsForSearch, lastUsedPortions, selectedMultipleFoods, handleToggleMultipleFoodSelection, handleSelectFood ]
  );

  const combinedOverlayStyle = StyleSheet.flatten([ styles.overlayStyle, { backgroundColor: theme.colors.background }, ]);

  return (
    <Overlay isVisible={isVisible} onBackdropPress={!isActionDisabled ? toggleOverlay : undefined} animationType="slide" overlayStyle={styles.overlayContainer} >
      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} style={styles.keyboardAvoidingView} keyboardVerticalOffset={KEYBOARD_VERTICAL_OFFSET} >
        <View style={combinedOverlayStyle}>
          <View style={styles.header}>
            <TouchableOpacity onPress={!isActionDisabled ? toggleOverlay : undefined} style={styles.closeIconTouchable} disabled={isActionDisabled} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }} >
              <Icon name="close" type="material" size={28} color={isActionDisabled ? theme.colors.grey3 : theme.colors.text} />
            </TouchableOpacity>
            <Text h4 h4Style={[ styles.overlayTitle, isEditMode && modalMode === "normal" && styles.editModeTitle, ]} numberOfLines={1} ellipsizeMode="tail">
              {modalMode === "quickAddSelect" ? editingQuickAddItemIndex !== null ? t('addEntryModal.titleQuickAddEdit') : quickAddLoading ? t('addEntryModal.titleQuickAddAnalyzing') : t('addEntryModal.titleQuickAddSelect')
               : isEditMode ? t('addEntryModal.titleEdit')
               : selectedFood ? t('addEntryModal.titleAdd') // Single food selected for gram input
               : t('addEntryModal.titleAdd') // Default to "Add Entry" or "Select to Add" could be an option
              }
            </Text>
            {modalMode === "normal" && (
                <View style={styles.headerActionsNormal}>
                    {!isEditMode && !selectedFood && ( // Show quick add camera only when not editing and not in single food input mode
                        <TouchableOpacity onPress={handleQuickAddImage} disabled={isQuickAddImageButtonDisabled} style={styles.headerIcon} hitSlop={{ top: 10, bottom: 10, left: 5, right: 5 }} >
                            {quickAddLoading ? <ActivityIndicator size="small" color={theme.colors.primary} /> : <Icon name="camera-burst" type="material-community" size={26} color={ isQuickAddImageButtonDisabled ? theme.colors.grey3 : theme.colors.primary } />}
                        </TouchableOpacity>
                    )}
                    {isEditMode ? ( // Edit Mode: Only "Update" for single entry
                        <Button title={t('addEntryModal.buttonUpdate')} onPress={handleAddOrUpdateSingleEntry} disabled={isSingleAddButtonDisabled} buttonStyle={[styles.addButton, styles.updateButton]} titleStyle={styles.buttonTitle} loading={isAiLoading && selectedFood !== null} />
                    ) : selectedFood ? ( // Add Mode, single food selected for gram input
                        <Button title={t('addEntryModal.buttonAdd')} onPress={handleAddOrUpdateSingleEntry} disabled={isSingleAddButtonDisabled} buttonStyle={styles.addButton} titleStyle={styles.buttonTitle} loading={isAiLoading} />
                    ) : ( // Add Mode, no single food selected (multi-select mode active or possible)
                        <Button
                            title={t('addEntryModal.buttonAddSelected', { count: selectedMultipleFoods.size })}
                            onPress={handleConfirmAddMultipleSelected}
                            disabled={isMultiAddButtonDisabled}
                            buttonStyle={[styles.addButton, {backgroundColor: theme.colors.success}]} // Different color for multi-add
                            titleStyle={styles.buttonTitle}
                        />
                    )}
                </View>
            )}
             {modalMode === "quickAddSelect" && editingQuickAddItemIndex === null && ( <Button title={quickAddLoading ? t('addEntryModal.buttonLoading') : t('addEntryModal.buttonAddSelected', {count: selectedQuickAddIndices.size})} onPress={handleConfirmQuickAdd} disabled={isQuickAddConfirmDisabled} buttonStyle={[ styles.addButton, { backgroundColor: theme.colors.success } ]} titleStyle={styles.buttonTitle} loading={quickAddLoading} /> )}
             {modalMode === "quickAddSelect" && editingQuickAddItemIndex !== null && ( <View style={{ width: 70, marginLeft: 5 }} /> )}
          </View>
          <FlatList data={listData} renderItem={renderListItem} keyExtractor={(item) => item.key} extraData={{ listDataVersion: listData.length, selectedFoodId: selectedFood?.id, modalMode, foodIcons, foodGradeResult, quickAddLoading, selectedQuickAddIndicesSize: selectedQuickAddIndices.size, editingQuickAddItemIndex, search, foodsLength: foods.length, servingSizeSuggestions, selectedMultipleFoodsSize: selectedMultipleFoods.size, lastUsedPortionsVersion: Object.keys(lastUsedPortions).length }} style={styles.flatListContainer} contentContainerStyle={styles.flatListContentContainer} keyboardShouldPersistTaps="handled" initialNumToRender={10} maxToRenderPerBatch={10} windowSize={11} removeClippedSubviews={Platform.OS === 'android'} />
        </View>
      </KeyboardAvoidingView>
    </Overlay>
  );
};

const useStyles = makeStyles((theme) => ({
    overlayContainer: { backgroundColor: "transparent", width: "90%", maxWidth: 500, padding: 0, borderRadius: 15, shadowColor: "#000", shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.2, shadowRadius: 5, elevation: 6, overflow: "hidden", maxHeight: Dimensions.get("window").height * 0.85, },
    overlayStyle: { width: "100%", height: "100%", borderRadius: 15, padding: 15, paddingBottom: 0, backgroundColor: theme.colors.background, flex: 1, },
    keyboardAvoidingView: { width: "100%", height: "100%" },
    header: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 15, paddingHorizontal: 0, },
    closeIconTouchable: { padding: 5 },
    overlayTitle: { color: theme.colors.text, fontWeight: "bold", fontSize: 20, textAlign: "center", flex: 1, marginHorizontal: 5, },
    editModeTitle: { color: theme.colors.warning },
    headerActionsNormal: { flexDirection: "row", alignItems: "center", },
    headerIcon: { padding: 5, marginHorizontal: 0 }, // Reduced margin for camera icon
    addButton: { borderRadius: 20, paddingHorizontal: 12, paddingVertical: 8, minWidth: 70, marginLeft: 5, backgroundColor: theme.colors.primary, },
    updateButton: { backgroundColor: theme.colors.warning },
    buttonTitle: { color: theme.colors.white, fontWeight: "600", fontSize: 14 }, // Slightly smaller font for header buttons
    flatListContainer: { flex: 1, width: "100%" },
    flatListContentContainer: { paddingBottom: 30 },
    searchBarContainer: { backgroundColor: "transparent", borderBottomColor: "transparent", borderTopColor: "transparent", paddingHorizontal: 0, marginBottom: 10, },
    searchBarInputContainer: { borderRadius: 25, backgroundColor: theme.colors.searchBg || theme.colors.grey5, height: 40, },
    searchInputStyle: { color: theme.colors.text, fontSize: 15, textAlign: 'left' },
    sectionTitle: { fontWeight: "600", marginBottom: 8, color: theme.colors.text, fontSize: 14, marginLeft: 5, textTransform: "uppercase", textAlign: 'left' },
    foodIcon: { width: 35, height: 35, marginRight: 10, borderRadius: 17.5, backgroundColor: theme.colors.grey5, alignItems: "center", justifyContent: "center", }, // Reduced marginRight
    defaultIconContainer: { width: 35, height: 35, marginRight: 10, borderRadius: 17.5, backgroundColor: theme.colors.grey5, alignItems: "center", justifyContent: "center", },
    listItemContainer: { backgroundColor: "transparent", paddingVertical: 8, paddingHorizontal: 5, borderBottomColor: theme.colors.divider, },
    selectedListItem: { backgroundColor: theme.colors.grey5, borderRadius: 8 },
    multiSelectedListItem: { backgroundColor: theme.colors.successLight, borderRadius: 8, borderLeftWidth: 3, borderLeftColor: theme.colors.success },
    multiSelectCheckbox: { padding: 0, margin: 0, marginRight: 10, backgroundColor: 'transparent', borderWidth: 0, },
    listItemTitle: { color: theme.colors.text, fontSize: 16, fontWeight: "500", textAlign: 'left', flexShrink: 1 },
    listItemSubtitleSecondary: { color: theme.colors.secondary, fontSize: 12, textAlign: 'left', marginTop: 2, },
    noFoodsText: { color: theme.colors.grey2, fontStyle: "italic", textAlign: "center", marginTop: 20, marginBottom: 10, paddingHorizontal: 10, },
    amountSection: { marginTop: 10, borderTopWidth: 1, borderTopColor: theme.colors.divider, paddingTop: 15, paddingHorizontal: 0, },
    unitSelectorContainer: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 15, paddingHorizontal: 5, },
    amountLabelContainer: { flexDirection: 'row', alignItems: 'center', },
    gradePill: { fontSize: 11, fontWeight: 'bold', color: theme.colors.white, paddingHorizontal: 5, paddingVertical: 1.5, borderRadius: 7, marginLeft: 8, minWidth: 18, textAlign: 'center', overflow: 'hidden', },
    inputLabel: { fontWeight: "600", color: theme.colors.grey1, fontSize: 14, marginRight: 0, textTransform: "uppercase", textAlign: 'left' },
    buttonGroupContainer: { flex: 0.7, maxWidth: 220, height: 35, borderRadius: 8, borderColor: theme.colors.primary, borderWidth: 1, backgroundColor: theme.colors.background, },
    buttonGroupText: { fontSize: 14, color: theme.colors.text },
    disabledButtonGroup: { backgroundColor: theme.colors.grey5 },
    servingSizeRow: { flexDirection: "row", alignItems: "center", marginBottom: 12, paddingHorizontal: 5, },
    servingSizeLabel: { color: theme.colors.grey2, fontSize: 13, marginRight: 8, textAlign: 'left' },
    servingSizeContainer: { flexGrow: 0 },
    servingSizeButton: { backgroundColor: theme.colors.grey4, borderRadius: 15, marginRight: 8, paddingHorizontal: 12, paddingVertical: 5, justifyContent: "center", alignItems: "center", height: 30, },
    servingSizeButtonTitle: { color: theme.colors.text, fontSize: 13 },
    gramInputStyle: { color: theme.colors.text, fontSize: 16, paddingVertical: 8, height: 40, textAlign: 'left' },
    gramInputContainerStyle: { borderBottomColor: theme.colors.grey3, paddingHorizontal: 5, },
    unitText: { color: theme.colors.grey2, fontSize: 15, fontWeight: "500", paddingRight: 5, },
    autoInputRow: { flexDirection: "row", alignItems: "center", paddingHorizontal: 0, },
    autoInputContainer: { flex: 1, paddingHorizontal: 0, marginRight: 10 },
    autoInputField: { height: 40 },
    aiButton: { backgroundColor: theme.colors.secondary, borderRadius: 20, width: 40, height: 40, padding: 0, justifyContent: "center", alignItems: "center", minWidth: 40, },
    quickAddHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 10, paddingHorizontal: 5, borderBottomWidth: 1, borderBottomColor: theme.colors.divider, paddingBottom: 8, },
    quickAddListStyle: {},
    disabledOverlay: { opacity: 0.6, },
    noResultsContainer: { alignItems: 'center', paddingVertical: 10, },
    addNewFoodButton: { marginTop: 15, borderColor: theme.colors.primary, paddingHorizontal: 20, borderRadius: 20, },
    addNewFoodButtonTitle: { color: theme.colors.primary, fontWeight: '600', },
}));

export default AddEntryModal;
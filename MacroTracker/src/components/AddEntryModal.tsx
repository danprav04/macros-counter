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
} from "@rneui/themed";
import { Food } from "../types/food";
import { isValidNumberInput } from "../utils/validationUtils";
import { loadRecentFoods, saveRecentFoods } from "../services/storageService";
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
import QuickAddList from "./QuickAddList"; // Import the extracted component

interface AddEntryModalProps {
  isVisible: boolean;
  toggleOverlay: () => void;
  selectedFood: Food | null;
  grams: string;
  setGrams: (grams: string) => void;
  handleAddEntry: () => void; // Single entry add/update action from parent
  handleAddMultipleEntries: (entries: { food: Food; grams: number }[]) => void; // Multiple entries action
  foods: Food[]; // Full list of available foods
  handleSelectFood: (item: Food | null) => void; // Callback when food is selected in modal
  updateSearch: (search: string) => void; // Callback to update search term
  search: string; // Current search term
  isEditMode: boolean; // True if editing an existing DailyEntryItem
  initialGrams?: string; // The grams value passed IN for editing
}

const KEYBOARD_VERTICAL_OFFSET = Platform.OS === "ios" ? 80 : 0;

type UnitMode = "grams" | "auto";
type ModalMode = "normal" | "quickAddSelect";

// Define types for the items in our main FlatList data structure
type ListItemType =
  | { type: "searchBar"; key: string }
  | { type: "recentFoods"; key: string }
  | { type: "searchResults"; key: string; data: Food } // Individual search result
  | { type: "noResults"; key: string }
  | { type: "amountInput"; key: string }
  | { type: "quickAddHeader"; key: string }
  // REPLACED individual items with the list component
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
}) => {
  const { theme } = useTheme();
  const styles = useStyles();
  const [recentFoods, setRecentFoods] = useState<Food[]>([]);
  const MAX_RECENT_FOODS = 5;
  const [foodIcons, setFoodIcons] = useState<{
    [foodName: string]: string | null | undefined;
  }>({});

  const [unitMode, setUnitMode] = useState<UnitMode>("grams");
  const [autoInput, setAutoInput] = useState("");
  const [isAiLoading, setIsAiLoading] = useState(false); // Loading for natural language grams

  // --- Quick Add State ---
  const [modalMode, setModalMode] = useState<ModalMode>("normal");
  const [quickAddLoading, setQuickAddLoading] = useState(false); // Loading for image analysis AND list display
  const [quickAddItems, setQuickAddItems] = useState<EstimatedFoodItem[]>([]);
  const [selectedQuickAddIndices, setSelectedQuickAddIndices] = useState<
    Set<number>
  >(new Set());
  const [editingQuickAddItemIndex, setEditingQuickAddItemIndex] = useState<
    number | null
  >(null);
  const [editedFoodName, setEditedFoodName] = useState<string>("");
  const [editedGrams, setEditedGrams] = useState<string>("");
  // --- End Quick Add State ---

  const screenWidth = Dimensions.get("window").width;
  const isModalOpening = useRef(false);

  // --- Computed State ---
  const isActionDisabled = isAiLoading || quickAddLoading; // General loading state check

  const filteredFoods = useMemo(() => {
    if (!search) return [];
    return foods.filter((food) =>
      food.name.toLowerCase().includes(search.toLowerCase())
    );
  }, [foods, search]);

  // --- Effects ---

  // Reset state on modal close (unchanged)
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
        console.log("AddEntryModal state reset on close.");
      }, 150);
      return () => clearTimeout(timer);
    }
  }, [isVisible, handleSelectFood, updateSearch, setGrams]);

  // Handle state initialization/reset when modal opens or mode changes (unchanged)
  useEffect(() => {
    if (isVisible) {
      isModalOpening.current = true;
      const timer = setTimeout(() => {
        isModalOpening.current = false;
      }, 100);

      if (modalMode === "normal") {
        if (isEditMode && selectedFood && initialGrams !== undefined) {
          setGrams(initialGrams);
          setUnitMode("grams");
          setAutoInput("");
        } else if (!isEditMode && !selectedFood) {
          setGrams("");
          setUnitMode("grams");
          setAutoInput("");
        }
        loadRecentFoods().then(setRecentFoods);
      } else if (modalMode === "quickAddSelect") {
        handleSelectFood(null);
        updateSearch("");
        setGrams("");
        setUnitMode("grams");
        setAutoInput("");
      }
      return () => clearTimeout(timer);
    }
  }, [
    isVisible,
    modalMode,
    isEditMode,
    selectedFood,
    initialGrams,
    handleSelectFood,
    updateSearch,
    setGrams,
  ]);

  // Load icons for visible foods (unchanged)
  useEffect(() => {
    if (!isVisible || modalMode !== "normal") return;

    const loadIcons = async () => {
      const relevantFoods = search ? filteredFoods : recentFoods;
      const uniqueFoodsMap = new Map(
        relevantFoods.map((food) => [food.id ?? food.name, food])
      );

      for (const food of uniqueFoodsMap.values()) {
        const foodName = food.name;
        if (foodIcons[foodName] === undefined) {
          setFoodIcons((prevIcons) => ({
            ...prevIcons,
            [foodName]: undefined,
          }));
          getFoodIconUrl(foodName)
            .then((iconUrl) =>
              setFoodIcons((prevIcons) => ({
                ...prevIcons,
                [foodName]: iconUrl,
              }))
            )
            .catch((error) => {
              console.warn(`Icon fetch failed for ${foodName}:`, error);
              setFoodIcons((prevIcons) => ({ ...prevIcons, [foodName]: null }));
            });
        }
      }
    };
    loadIcons();
  }, [isVisible, modalMode, search, filteredFoods, recentFoods, foodIcons]);

  // --- Utility Functions ---
  const addToRecentFoods = useCallback(async (food: Food) => {
    if (!food || !food.id) return;
    setRecentFoods((prevRecent) => {
      if (prevRecent.length > 0 && prevRecent[0].id === food.id)
        return prevRecent;
      const updated = prevRecent.filter((rf) => rf.id !== food.id);
      updated.unshift(food);
      const trimmed = updated.slice(0, MAX_RECENT_FOODS);
      saveRecentFoods(trimmed).catch((err) =>
        console.error("Failed to save recent foods:", err)
      );
      return trimmed;
    });
  }, []);

  const servingSizeSuggestions = useMemo(() => {
    if (!selectedFood) return [];
    return [
      { label: "50g", value: "50" },
      { label: "100g", value: "100" },
      { label: "150g", value: "150" },
      { label: "200g", value: "200" },
    ];
  }, [selectedFood]);

  // --- Action Handlers ---
  const handleEstimateGrams = useCallback(async () => {
    // (unchanged)
    Keyboard.dismiss();
    if (!selectedFood || !autoInput.trim()) {
      Alert.alert(
        "Input Missing",
        "Please select a food and enter a quantity description."
      );
      return;
    }
    if (isAiLoading) return;
    setIsAiLoading(true);
    try {
      const estimatedGrams = await getGramsFromNaturalLanguage(
        selectedFood.name,
        autoInput
      );
      const roundedGrams = String(Math.round(estimatedGrams));
      setGrams(roundedGrams);
      setUnitMode("grams");
      setAutoInput("");
      Toast.show({
        type: "success",
        text1: "Grams Estimated",
        text2: `Estimated ${roundedGrams}g for ${selectedFood.name}`,
        position: "bottom",
      });
    } catch (error: any) {
      console.error("AI Gram Estimation Error (AddEntryModal):", error);
    } finally {
      setIsAiLoading(false);
    }
  }, [selectedFood, autoInput, isAiLoading, setGrams]);

  const handleAddOrUpdateSingleEntry = useCallback(async () => {
    // (unchanged)
    Keyboard.dismiss();
    if (!selectedFood) {
      Alert.alert("Food Not Selected", "Please select a food item.");
      return;
    }
    const numericGrams = parseFloat(grams);
    if (!isValidNumberInput(grams) || numericGrams <= 0) {
      Alert.alert(
        "Invalid Amount",
        "Please enter a valid positive number for grams."
      );
      return;
    }
    if (isActionDisabled) return;
    handleAddEntry();
    if (!isEditMode) addToRecentFoods(selectedFood);
  }, [
    selectedFood,
    grams,
    isActionDisabled,
    isEditMode,
    handleAddEntry,
    addToRecentFoods,
  ]);

  const handleInternalSelectFood = useCallback(
    (item: Food | null) => {
      // (unchanged)
      handleSelectFood(item);
      updateSearch("");
      Keyboard.dismiss();
      if (!isEditMode && item?.id !== selectedFood?.id) {
        setGrams("");
        setUnitMode("grams");
        setAutoInput("");
      }
    },
    [handleSelectFood, updateSearch, isEditMode, selectedFood, setGrams]
  );

  // --- Quick Add Functions ---
  const pickImageAndAnalyze = useCallback(
    async (source: "camera" | "gallery") => {
      // (unchanged)
      if (isEditMode) return;
      let permissionResult;
      let pickerResult: ImagePicker.ImagePickerResult;
      setQuickAddLoading(true);
      setQuickAddItems([]);
      setSelectedQuickAddIndices(new Set());
      setEditingQuickAddItemIndex(null);
      setModalMode("quickAddSelect");
      handleSelectFood(null);
      updateSearch("");
      setGrams("");
      try {
        if (source === "camera") {
          permissionResult = await ImagePicker.requestCameraPermissionsAsync();
          if (!permissionResult.granted) {
            Alert.alert("Permission Required", "Camera access needed.");
            throw new Error("Permission denied");
          }
          pickerResult = await ImagePicker.launchCameraAsync({
            quality: 1,
            exif: false,
          });
        } else {
          permissionResult =
            await ImagePicker.requestMediaLibraryPermissionsAsync();
          if (!permissionResult.granted) {
            Alert.alert("Permission Required", "Gallery access needed.");
            throw new Error("Permission denied");
          }
          pickerResult = await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ImagePicker.MediaTypeOptions.Images,
            quality: 1,
          });
        }
        if (pickerResult.canceled) throw new Error("User cancelled");
        if (pickerResult.assets && pickerResult.assets.length > 0) {
          const originalAsset = pickerResult.assets[0];
          const compressedResult = await compressImageIfNeeded(originalAsset);
          const assetForAnalysis = compressedResult
            ? {
                ...originalAsset,
                uri: compressedResult.uri,
                width: compressedResult.width,
                height: compressedResult.height,
                mimeType: "image/jpeg",
              }
            : originalAsset;
          const base64Image = await getBase64FromUri(assetForAnalysis.uri);
          const mimeType = determineMimeType(assetForAnalysis);
          const results = await getMultipleFoodsFromImage(
            base64Image,
            mimeType
          );
          if (results.length === 0) {
            Alert.alert(
              "No Foods Found",
              "Couldn't identify food items. Try again or add manually."
            );
            setModalMode("normal");
          } else {
            setQuickAddItems(results);
            setSelectedQuickAddIndices(new Set(results.map((_, i) => i)));
          }
        } else throw new Error("Could not select image.");
      } catch (error: any) {
        if (
          error.message !== "User cancelled" &&
          !(error instanceof BackendError)
        ) {
          Alert.alert(
            "Error",
            error.message || "An unexpected error occurred."
          );
        }
        setModalMode("normal");
        setQuickAddItems([]);
        setSelectedQuickAddIndices(new Set());
      } finally {
        setTimeout(() => setQuickAddLoading(false), 150);
      }
    },
    [isEditMode, handleSelectFood, updateSearch, setGrams]
  );

  const handleQuickAddImage = useCallback(async () => {
    // (unchanged)
    Keyboard.dismiss();
    if (isEditMode || isActionDisabled) return;
    if (editingQuickAddItemIndex !== null) {
      Alert.alert(
        "Finish Editing",
        "Please save or cancel the current edit first."
      );
      return;
    }
    Alert.alert(
      "Quick Add from Image",
      "Identify multiple foods from an image.",
      [
        { text: "Cancel", style: "cancel" },
        { text: "Camera", onPress: () => pickImageAndAnalyze("camera") },
        { text: "Gallery", onPress: () => pickImageAndAnalyze("gallery") },
      ]
    );
  }, [
    isEditMode,
    editingQuickAddItemIndex,
    isActionDisabled,
    pickImageAndAnalyze,
  ]);

  const handleToggleQuickAddItem = useCallback(
    (index: number) => {
      // (unchanged)
      if (editingQuickAddItemIndex !== null || isActionDisabled) return;
      setSelectedQuickAddIndices((prev) => {
        const newSet = new Set(prev);
        if (newSet.has(index)) newSet.delete(index);
        else newSet.add(index);
        return newSet;
      });
    },
    [editingQuickAddItemIndex, isActionDisabled]
  );

  const handleEditQuickAddItem = useCallback(
    (index: number) => {
      // (unchanged)
      if (editingQuickAddItemIndex !== null || isActionDisabled) {
        if (editingQuickAddItemIndex !== null)
          Alert.alert(
            "Finish Editing",
            "Please save or cancel the current edit first."
          );
        return;
      }
      const item = quickAddItems[index];
      setEditingQuickAddItemIndex(index);
      setEditedFoodName(item.foodName);
      setEditedGrams(String(Math.round(item.estimatedWeightGrams)));
    },
    [editingQuickAddItemIndex, quickAddItems, isActionDisabled]
  );

  const handleSaveQuickAddItemEdit = useCallback(() => {
    // (unchanged)
    if (editingQuickAddItemIndex === null || isActionDisabled) return;
    const trimmedName = editedFoodName.trim();
    if (!trimmedName) {
      Alert.alert("Invalid Name", "Food name cannot be empty.");
      return;
    }
    const numericGrams = parseFloat(editedGrams);
    if (!isValidNumberInput(editedGrams) || numericGrams <= 0) {
      Alert.alert("Invalid Grams", "Please enter a valid positive number.");
      return;
    }
    const roundedGrams = Math.round(numericGrams);
    setQuickAddItems((prevItems) =>
      prevItems.map((item, index) =>
        index === editingQuickAddItemIndex
          ? {
              ...item,
              foodName: trimmedName,
              estimatedWeightGrams: roundedGrams,
            }
          : item
      )
    );
    setEditingQuickAddItemIndex(null);
    setEditedFoodName("");
    setEditedGrams("");
    Keyboard.dismiss();
  }, [editingQuickAddItemIndex, editedFoodName, editedGrams, isActionDisabled]);

  const handleCancelQuickAddItemEdit = useCallback(() => {
    // (unchanged)
    if (isActionDisabled) return;
    setEditingQuickAddItemIndex(null);
    setEditedFoodName("");
    setEditedGrams("");
    Keyboard.dismiss();
  }, [isActionDisabled]);

  const handleConfirmQuickAdd = useCallback(() => {
    // (unchanged)
    Keyboard.dismiss();
    if (isEditMode || isActionDisabled) return;
    if (editingQuickAddItemIndex !== null) {
      Alert.alert("Finish Editing", "Save or cancel your edit before adding.");
      return;
    }
    if (selectedQuickAddIndices.size === 0) {
      Alert.alert("No Items Selected", "Select items to add.");
      return;
    }
    try {
      const entriesToAdd: { food: Food; grams: number }[] = [];
      Array.from(selectedQuickAddIndices).forEach((index) => {
        if (index >= 0 && index < quickAddItems.length) {
          const item = quickAddItems[index];
          const quickFood: Food = {
            id: uuidv4(),
            name: item.foodName,
            calories: Math.round(Number(item.calories_per_100g) || 0),
            protein: Math.round(Number(item.protein_per_100g) || 0),
            carbs: Math.round(Number(item.carbs_per_100g) || 0),
            fat: Math.round(Number(item.fat_per_100g) || 0),
          };
          const entryGrams = Math.max(
            1,
            Math.round(Number(item.estimatedWeightGrams) || 1)
          );
          entriesToAdd.push({ food: quickFood, grams: entryGrams });
        } else
          console.warn(
            `Skipping invalid index ${index} during quick add confirm.`
          );
      });
      if (entriesToAdd.length > 0) handleAddMultipleEntries(entriesToAdd);
      else
        Alert.alert(
          "Nothing to Add",
          "No valid items were selected or prepared."
        );
    } catch (error) {
      console.error("Error confirming Quick Add:", error);
      Alert.alert("Error", "Could not prepare items to add.");
    }
  }, [
    quickAddItems,
    selectedQuickAddIndices,
    editingQuickAddItemIndex,
    handleAddMultipleEntries,
    isEditMode,
    isActionDisabled,
  ]);

  const handleQuickAddGramsChange = useCallback((text: string) => {
    // (unchanged)
    const cleanedText = text.replace(/[^0-9]/g, "");
    setEditedGrams(cleanedText);
  }, []);

  // --- Computed States for Disabling UI Elements ---
  const isAddButtonDisabled =
    modalMode !== "normal" ||
    !selectedFood ||
    !isValidNumberInput(grams) ||
    parseFloat(grams) <= 0 ||
    isActionDisabled;
  const isAiButtonDisabled =
    modalMode !== "normal" ||
    !selectedFood ||
    !autoInput.trim() ||
    isActionDisabled;
  const isQuickAddConfirmDisabled =
    isEditMode ||
    modalMode !== "quickAddSelect" ||
    selectedQuickAddIndices.size === 0 ||
    editingQuickAddItemIndex !== null ||
    isActionDisabled;
  const isQuickAddImageButtonDisabled = isEditMode || isActionDisabled;

  // --- Build list data for the main FlatList ---
  const listData = useMemo((): ListItemType[] => {
    const items: ListItemType[] = [];
    if (modalMode === "normal") {
      items.push({ type: "searchBar", key: "searchBar" });
      if (!search && recentFoods.length > 0) {
        items.push({ type: "recentFoods", key: "recentFoods" });
      }
      if (search) {
        if (filteredFoods.length > 0) {
          filteredFoods.forEach((food) =>
            items.push({
              type: "searchResults",
              key: `search-${food.id}`,
              data: food,
            })
          );
        } else {
          items.push({ type: "noResults", key: "noResults" });
        }
      }
      if (selectedFood) {
        items.push({ type: "amountInput", key: "amountInput" });
      }
    } else if (modalMode === "quickAddSelect") {
      items.push({ type: "quickAddHeader", key: "quickAddHeader" });
      // Push the QuickAddList component instead of individual items
      items.push({ type: "quickAddList", key: "quickAddList" });
    }
    items.push({ type: "spacer", key: "bottom-spacer", height: 60 });
    return items;
  }, [
    modalMode,
    search,
    recentFoods,
    filteredFoods,
    selectedFood,
    // Quick add state needed for QuickAddList extraData or component update
    quickAddItems,
    editingQuickAddItemIndex,
    selectedQuickAddIndices,
    quickAddLoading,
  ]);

  // --- Render individual item types for the main FlatList ---
  const renderListItem = useCallback(
    ({ item }: { item: ListItemType }): React.ReactElement | null => {
      switch (item.type) {
        case "searchBar": // (unchanged)
          return (
            <SearchBar
              placeholder="Search Foods..."
              onChangeText={updateSearch}
              value={search}
              platform={Platform.OS === "ios" ? "ios" : "android"}
              containerStyle={styles.searchBarContainer}
              inputContainerStyle={styles.searchBarInputContainer}
              inputStyle={styles.searchInputStyle}
              onCancel={() => updateSearch("")}
              showCancel={Platform.OS === "ios"}
              onClear={() => updateSearch("")}
              disabled={isActionDisabled || modalMode !== "normal"}
            />
          );
        case "recentFoods":
          // If there are no recent foods, render nothing for this case.
          if (!recentFoods || recentFoods.length === 0) {
            return null;
          }

          return (
            <View style={styles.recentFoodsSection}>
              <Text style={styles.sectionTitle}>Recent</Text>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.recentFoodsContainer}
                keyboardShouldPersistTaps="handled" // Good practice for scrollviews with touchables
              >
                {recentFoods.map((food) => (
                  <TouchableOpacity
                    key={`recent-${food.id}`}
                    style={[
                      styles.recentFoodItem,
                      // Apply conditional styles
                      screenWidth < 350 && styles.smallRecentFoodItem,
                      selectedFood?.id === food.id &&
                        styles.selectedRecentFoodItem,
                      isActionDisabled && styles.disabledOverlay,
                    ]}
                    onPress={() =>
                      !isActionDisabled && handleInternalSelectFood(food)
                    }
                    disabled={isActionDisabled}
                  >
                    {/* --- Start: Icon/Image/Indicator Rendering --- */}
                    {/* This block conditionally renders ONE element: Image, View+Icon, or ActivityIndicator */}
                    {foodIcons[food.name] !== undefined ? (
                      foodIcons[food.name] ? (
                        // Render Image if URL exists and hasn't errored
                        <Image
                          source={{ uri: foodIcons[food.name] as string }}
                          style={styles.foodIconSmall}
                          // Update cache to null on error to show placeholder next time
                          onError={() =>
                            setFoodIcons((prev) => ({
                              ...prev,
                              [food.name]: null,
                            }))
                          }
                          resizeMode="contain" // Added resizeMode for consistency
                        />
                      ) : (
                        // Render Placeholder Icon if fetch failed or returned null
                        <View
                          style={[
                            styles.foodIconSmall,
                            styles.iconPlaceholderSmall,
                          ]}
                        >
                          <Icon
                            name="fastfood"
                            type="material"
                            size={12}
                            color={theme.colors.grey2}
                          />
                        </View>
                      )
                    ) : (
                      // Render Loading Indicator while fetching
                      <ActivityIndicator
                        size="small"
                        color={theme.colors.grey3}
                        style={styles.foodIconSmall}
                      />
                    )}
                    {/* --- End: Icon/Image/Indicator Rendering --- */}
                    {/* --- IMPORTANT: NO spaces, characters, or {' '} between the above block and the Text below --- */}
                    {/* --- Start: Food Name Rendering --- */}
                    <Text
                      style={[
                        styles.recentFoodText,
                        screenWidth < 350 && styles.smallRecentFoodText,
                      ]}
                      numberOfLines={1}
                      ellipsizeMode="tail"
                    >
                      {/* Render the food name safely inside the Text component */}
                      {/* Optional: Add spaces inside the braces if needed for visual padding: ` {food.name} ` */}
                      {food.name}
                    </Text>
                    {/* --- End: Food Name Rendering --- */}
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>
          );
        case "searchResults": {
          // Get the specific food item for this list row
          const food = item.data;
          // Determine if this search result item is the currently selected food
          const isSelected = selectedFood?.id === food.id;

          return (
            // Use TouchableOpacity for the entire row to make it selectable
            <TouchableOpacity
              onPress={() =>
                !isActionDisabled && handleInternalSelectFood(food)
              }
              disabled={isActionDisabled}
              // Apply subtle overlay style when disabled
              style={[isActionDisabled && styles.disabledOverlay]}
            >
              {/* Use ListItem for structured layout */}
              <ListItem
                bottomDivider
                containerStyle={[
                  styles.listItemContainer,
                  // Apply visual feedback style if this item is selected
                  isSelected && styles.selectedListItem,
                ]}
              >
                {/* --- Start: Icon/Image/Indicator Rendering --- */}
                {/* Conditionally render the icon based on fetch status */}
                {foodIcons[food.name] !== undefined ? (
                  foodIcons[food.name] ? (
                    // Render Image if URL exists and hasn't errored
                    <Image
                      source={{ uri: foodIcons[food.name] as string }}
                      style={styles.foodIcon}
                      // Update cache to null on error
                      onError={() =>
                        setFoodIcons((prev) => ({ ...prev, [food.name]: null }))
                      }
                      resizeMode="contain" // Consistent resize mode
                    />
                  ) : (
                    // Render Placeholder Icon container if fetch failed/returned null
                    <View style={styles.defaultIconContainer}>
                      <Icon
                        name="restaurant"
                        type="material"
                        size={18}
                        color={theme.colors.grey3}
                      />
                    </View>
                  )
                ) : (
                  // Render Loading Indicator while fetching
                  <ActivityIndicator
                    size="small"
                    color={theme.colors.grey3}
                    style={styles.foodIcon}
                  />
                )}
                {/* --- End: Icon/Image/Indicator Rendering --- */}
                {/* --- IMPORTANT: No spaces or characters between the icon block and ListItem.Content --- */}

                {/* --- Start: Food Name Rendering --- */}
                <ListItem.Content>
                  {/* ListItem.Title correctly handles rendering the text */}
                  <ListItem.Title style={styles.listItemTitle}>
                    {food.name}
                  </ListItem.Title>
                  {/* Optional: Could add subtitle here if needed */}
                  {/* <ListItem.Subtitle>...</ListItem.Subtitle> */}
                </ListItem.Content>
                {/* --- End: Food Name Rendering --- */}
                {/* --- IMPORTANT: No spaces or characters between ListItem.Content and the checkmark Icon --- */}

                {/* --- Start: Conditional Checkmark Rendering --- */}
                {/* Render checkmark icon only if this item is selected */}
                {isSelected && (
                  <Icon
                    name="checkmark-circle"
                    type="ionicon"
                    color={theme.colors.primary}
                    size={24}
                  />
                )}
                {/* --- End: Conditional Checkmark Rendering --- */}
              </ListItem>
            </TouchableOpacity>
          );
        } // End of case "searchResults"
        case "noResults": // (unchanged)
          return (
            <Text style={styles.noFoodsText}>
              {" "}
              {modalMode === "quickAddSelect"
                ? "No food items found in the image."
                : `No foods found matching "${search}".`}{" "}
            </Text>
          );
        case "amountInput":
          // Guard clause: If no food is selected, render nothing for this section.
          if (!selectedFood) {
            return null;
          }

          // --- Render the Amount Input Section ---
          return (
            <View style={styles.amountSection}>
              {/* --- Unit Selector (Grams / Auto) --- */}
              <View style={styles.unitSelectorContainer}>
                <Text style={styles.inputLabel}>Amount</Text>
                {/* ButtonGroup component handles its own text rendering */}
                <ButtonGroup
                  buttons={["Grams", "Auto (AI)"]}
                  selectedIndex={unitMode === "grams" ? 0 : 1}
                  onPress={(index) =>
                    !isActionDisabled &&
                    setUnitMode(index === 0 ? "grams" : "auto")
                  }
                  containerStyle={styles.buttonGroupContainer}
                  selectedButtonStyle={{
                    backgroundColor: theme.colors.primary,
                  }}
                  textStyle={styles.buttonGroupText}
                  selectedTextStyle={{ color: theme.colors.white }}
                  // Disable Auto(AI) button when editing, disable both if loading
                  disabled={isEditMode ? [1] : isActionDisabled ? [0, 1] : []}
                  disabledStyle={styles.disabledButtonGroup}
                  disabledTextStyle={{ color: theme.colors.grey3 }}
                />
              </View>

              {/* --- Grams Input Mode --- */}
              {/* Conditionally render this block only if unitMode is 'grams' */}
              {unitMode === "grams" && (
                // Use Fragment <>...</> to group multiple elements without adding an extra View
                <>
                  {/* --- Serving Size Suggestions (only shown when NOT editing) --- */}
                  {/* Conditionally render suggestions if not editing and suggestions exist */}
                  {!isEditMode && servingSizeSuggestions.length > 0 && (
                    <View style={styles.servingSizeRow}>
                      <Text style={styles.servingSizeLabel}>Quick Add:</Text>
                      {/* Horizontal scroll for suggestions */}
                      <ScrollView
                        horizontal
                        showsHorizontalScrollIndicator={false}
                        contentContainerStyle={styles.servingSizeContainer}
                        keyboardShouldPersistTaps="handled" // Good practice
                      >
                        {servingSizeSuggestions.map((suggestion) => (
                          <TouchableOpacity
                            key={suggestion.label}
                            style={[
                              styles.servingSizeButton,
                              isActionDisabled && styles.disabledOverlay,
                            ]}
                            onPress={() =>
                              !isActionDisabled && setGrams(suggestion.value)
                            }
                            disabled={isActionDisabled}
                          >
                            {/* Button text is correctly inside Text */}
                            <Text style={styles.servingSizeButtonTitle}>
                              {suggestion.label}
                            </Text>
                          </TouchableOpacity>
                        ))}
                      </ScrollView>
                    </View>
                  )}
                  {/* --- Grams Input Field --- */}
                  <Input
                    placeholder={
                      isEditMode ? "Update grams" : "Enter grams (e.g., 150)"
                    }
                    keyboardType="numeric"
                    value={grams}
                    // Input sanitization/validation
                    onChangeText={(text) => {
                      const cleanedText = text
                        .replace(/[^0-9.]/g, "")
                        .replace(/(\..*?)\./g, "$1");
                      setGrams(cleanedText);
                    }}
                    inputStyle={styles.gramInputStyle}
                    inputContainerStyle={styles.gramInputContainerStyle}
                    // Conditional error message display
                    errorMessage={
                      !isValidNumberInput(grams) &&
                      grams !== "" &&
                      grams !== "."
                        ? "Enter a valid number"
                        : ""
                    }
                    errorStyle={{ color: theme.colors.error }}
                    // Ensure rightIcon is correctly wrapped in Text
                    rightIcon={<Text style={styles.unitText}>g</Text>}
                    containerStyle={{ paddingHorizontal: 0 }}
                    // Re-render based on these changing props
                    key={`grams-input-${selectedFood.id}-${isEditMode}`}
                    disabled={isActionDisabled}
                  />
                </> // End of Grams Input Mode Fragment
              )}

              {/* --- Auto (AI) Input Mode (only shown when NOT editing) --- */}
              {/* Conditionally render this block only if unitMode is 'auto' and not editing */}
              {unitMode === "auto" && !isEditMode && (
                <View style={styles.autoInputRow}>
                  {/* AI Quantity Description Input */}
                  <Input
                    placeholder="Describe quantity (e.g., 1 cup cooked)"
                    value={autoInput}
                    onChangeText={setAutoInput}
                    inputStyle={[styles.gramInputStyle, styles.autoInputField]}
                    inputContainerStyle={styles.gramInputContainerStyle}
                    containerStyle={styles.autoInputContainer}
                    multiline={false}
                    onSubmitEditing={handleEstimateGrams} // Allow submission via keyboard
                    key={`auto-input-${selectedFood.id}`} // Re-render based on food id
                    disabled={isActionDisabled}
                  />
                  {/* AI Estimation Trigger Button */}
                  <Button
                    onPress={handleEstimateGrams}
                    // Disable based on AI button logic and general disabled state
                    disabled={isAiButtonDisabled || isActionDisabled}
                    loading={isAiLoading} // Show loading indicator
                    buttonStyle={styles.aiButton}
                    // Conditionally show icon or nothing (loading replaces title/icon)
                    icon={
                      isAiLoading ? undefined : (
                        <Icon
                          name="calculator-variant"
                          type="material-community"
                          size={20}
                          color={theme.colors.white}
                        />
                      )
                    }
                    // Title is empty as it's an icon-only button when not loading
                    title={isAiLoading ? "" : ""}
                  />
                </View>
              )}
            </View> // End of amountSection View
          );
        case "quickAddHeader": // (unchanged)
          return (
            <View style={styles.quickAddHeader}>
              {" "}
              <Text style={styles.sectionTitle}>
                {" "}
                {editingQuickAddItemIndex !== null
                  ? "Editing Item Details"
                  : "Select Items from Image"}{" "}
              </Text>
              {editingQuickAddItemIndex === null && (
                <Button
                  type="clear"
                  title="Back"
                  onPress={() => {
                    if (isActionDisabled) return;
                    setModalMode("normal");
                    setQuickAddItems([]);
                    setSelectedQuickAddIndices(new Set());
                    setEditingQuickAddItemIndex(null);
                  }}
                  titleStyle={{ color: theme.colors.primary, fontSize: 14 }}
                  icon={
                    <Icon
                      name="arrow-back"
                      type="ionicon"
                      size={18}
                      color={theme.colors.primary}
                    />
                  }
                  disabled={isActionDisabled}
                />
              )}{" "}
            </View>
          );

        // --- Render QuickAddList Component ---
        case "quickAddList":
          return (
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
              onNameChange={setEditedFoodName} // Pass setter directly
              onGramsChange={handleQuickAddGramsChange} // Pass specific handler
              isLoading={quickAddLoading} // Pass loading state
              style={styles.quickAddListStyle} // Add specific styles if needed
            />
          );

        case "spacer": // (unchanged)
          return <View style={{ height: item.height }} />;
        default:
          return null;
      }
    },
    [
      search,
      updateSearch,
      isActionDisabled,
      modalMode,
      recentFoods,
      screenWidth,
      selectedFood,
      foodIcons,
      setFoodIcons,
      handleInternalSelectFood,
      filteredFoods,
      unitMode,
      setUnitMode,
      isEditMode,
      servingSizeSuggestions,
      setGrams,
      grams,
      autoInput,
      setAutoInput,
      handleEstimateGrams,
      isAiLoading,
      isAiButtonDisabled,
      theme,
      styles,
      // Quick Add State needed for QuickAddList props:
      quickAddLoading,
      quickAddItems,
      editingQuickAddItemIndex,
      selectedQuickAddIndices,
      editedFoodName,
      editedGrams,
      // Quick Add Handlers needed for QuickAddList props:
      handleToggleQuickAddItem,
      handleEditQuickAddItem,
      handleSaveQuickAddItemEdit,
      handleCancelQuickAddItemEdit,
      handleQuickAddGramsChange,
      // Other handlers needed by other parts of the modal:
      handleAddOrUpdateSingleEntry,
      handleConfirmQuickAdd,
      handleQuickAddImage,
      handleAddMultipleEntries,
    ]
  );

  // --- Render ---
  const combinedOverlayStyle = StyleSheet.flatten([
    styles.overlayStyle,
    { backgroundColor: theme.colors.background },
  ]);

  return (
    <Overlay
      isVisible={isVisible}
      onBackdropPress={!isActionDisabled ? toggleOverlay : undefined}
      animationType="slide"
      overlayStyle={styles.overlayContainer}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={styles.keyboardAvoidingView}
        keyboardVerticalOffset={KEYBOARD_VERTICAL_OFFSET}
      >
        <View style={combinedOverlayStyle}>
          {/* Header (unchanged) */}
          <View style={styles.header}>
            <TouchableOpacity
              onPress={!isActionDisabled ? toggleOverlay : undefined}
              style={styles.closeIconTouchable}
              disabled={isActionDisabled}
            >
              <Icon
                name="close"
                type="material"
                size={28}
                color={
                  isActionDisabled ? theme.colors.grey3 : theme.colors.text
                }
              />
            </TouchableOpacity>
            <Text
              h4
              h4Style={[
                styles.overlayTitle,
                isEditMode && modalMode === "normal" && styles.editModeTitle,
              ]}
              numberOfLines={1}
              ellipsizeMode="tail"
            >
              {modalMode === "quickAddSelect"
                ? editingQuickAddItemIndex !== null
                  ? "Edit Item"
                  : "Select Items to Add"
                : isEditMode
                ? "Edit Entry"
                : "Add Entry"}
            </Text>
            {modalMode === "normal" ? (
              <View style={styles.headerActionsNormal}>
                {!isEditMode && (
                  <TouchableOpacity
                    onPress={handleQuickAddImage}
                    disabled={isQuickAddImageButtonDisabled}
                    style={styles.headerIcon}
                  >
                    {quickAddLoading && modalMode === "normal" ? (
                      <ActivityIndicator
                        size="small"
                        color={theme.colors.primary}
                      />
                    ) : (
                      <Icon
                        name="camera-burst"
                        type="material-community"
                        size={26}
                        color={
                          isQuickAddImageButtonDisabled
                            ? theme.colors.grey3
                            : theme.colors.primary
                        }
                      />
                    )}
                  </TouchableOpacity>
                )}
                <Button
                  title={isEditMode ? "Update" : "Add"}
                  onPress={handleAddOrUpdateSingleEntry}
                  disabled={isAddButtonDisabled}
                  buttonStyle={[
                    styles.addButton,
                    isEditMode && styles.updateButton,
                  ]}
                  titleStyle={styles.buttonTitle}
                  loading={isAiLoading && unitMode === "auto"}
                />
              </View>
            ) : editingQuickAddItemIndex === null ? (
              <Button
                title={`Add ${selectedQuickAddIndices.size}`}
                onPress={handleConfirmQuickAdd}
                disabled={isQuickAddConfirmDisabled}
                buttonStyle={[
                  styles.addButton,
                  { backgroundColor: theme.colors.success },
                ]}
                titleStyle={styles.buttonTitle}
                loading={quickAddLoading}
              />
            ) : (
              <View style={{ width: 70, marginLeft: 5 }} />
            )}
          </View>

          {/* Content Area - FlatList now renders QuickAddList when appropriate */}
          <FlatList
            data={listData}
            renderItem={renderListItem}
            keyExtractor={(item) => item.key}
            // Pass relevant state to extraData to ensure FlatList re-renders when they change
            extraData={{
              selectedFood,
              grams,
              unitMode,
              autoInput,
              isAiLoading,
              search,
              foodIcons,
              modalMode,
              quickAddItems,
              selectedQuickAddIndices,
              editingQuickAddItemIndex,
              editedFoodName,
              editedGrams,
              isActionDisabled,
              quickAddLoading,
            }}
            style={styles.flatListContainer}
            contentContainerStyle={styles.flatListContentContainer}
            keyboardShouldPersistTaps="handled"
            initialNumToRender={10}
            maxToRenderPerBatch={10}
            windowSize={5}
          />
        </View>
      </KeyboardAvoidingView>
      <Toast />
    </Overlay>
  );
};

// --- Styles --- (Removed QuickAdd specific item styles as they are now in QuickAddList. Added style for the list container itself)
const useStyles = makeStyles((theme) => ({
  overlayContainer: {
    backgroundColor: "transparent",
    width: "90%",
    maxWidth: 500,
    padding: 0,
    borderRadius: 15,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.2,
    shadowRadius: 5,
    elevation: 6,
    overflow: "hidden",
    maxHeight: Dimensions.get("window").height * 0.85,
  },
  overlayStyle: {
    width: "100%",
    height: "100%",
    borderRadius: 15,
    padding: 15,
    paddingBottom: 0,
    backgroundColor: theme.colors.background,
    flex: 1,
  },
  keyboardAvoidingView: { width: "100%", height: "100%" },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 15,
    paddingHorizontal: 0,
  },
  closeIconTouchable: { padding: 5, zIndex: 1 },
  overlayTitle: {
    color: theme.colors.text,
    fontWeight: "bold",
    fontSize: 20,
    textAlign: "center",
    flex: 1,
    marginHorizontal: 5,
  },
  editModeTitle: { color: theme.colors.warning },
  headerActionsNormal: { flexDirection: "row", alignItems: "center" },
  headerIcon: { padding: 5, marginHorizontal: 5, zIndex: 1 },
  addButton: {
    borderRadius: 20,
    paddingHorizontal: 15,
    paddingVertical: 8,
    minWidth: 70,
    marginLeft: 5,
    backgroundColor: theme.colors.primary,
    zIndex: 1,
  },
  updateButton: { backgroundColor: theme.colors.warning },
  buttonTitle: { color: theme.colors.white, fontWeight: "600", fontSize: 15 },
  flatListContainer: { flex: 1, width: "100%" },
  flatListContentContainer: { paddingBottom: 30 },
  searchBarContainer: {
    backgroundColor: "transparent",
    borderBottomColor: "transparent",
    borderTopColor: "transparent",
    paddingHorizontal: 0,
    marginBottom: 10,
  },
  searchBarInputContainer: {
    borderRadius: 25,
    backgroundColor: theme.colors.searchBg || theme.colors.grey5,
    height: 40,
  },
  searchInputStyle: { color: theme.colors.text, fontSize: 15 },
  recentFoodsSection: { marginBottom: 15 },
  sectionTitle: {
    fontWeight: "600",
    marginBottom: 8,
    color: theme.colors.text,
    fontSize: 14,
    marginLeft: 5,
    textTransform: "uppercase",
  },
  recentFoodsContainer: { paddingHorizontal: 5, paddingVertical: 2 },
  recentFoodItem: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: theme.colors.grey5,
    marginRight: 8,
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1.5,
    borderColor: "transparent",
  },
  selectedRecentFoodItem: { borderColor: theme.colors.primary },
  smallRecentFoodItem: { paddingHorizontal: 8, paddingVertical: 5 },
  foodIconSmall: {
    width: 20,
    height: 20,
    marginRight: 6,
    borderRadius: 10,
    resizeMode: "contain",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: theme.colors.grey4,
  },
  iconPlaceholderSmall: {
    backgroundColor: theme.colors.grey4,
    alignItems: "center",
    justifyContent: "center",
  },
  recentFoodText: { color: theme.colors.text, fontSize: 13, maxWidth: 80 },
  smallRecentFoodText: { fontSize: 12, maxWidth: 70 },
  listItemContainer: {
    backgroundColor: "transparent",
    paddingVertical: 8,
    paddingHorizontal: 5,
    borderBottomColor: theme.colors.divider,
  },
  selectedListItem: { backgroundColor: theme.colors.grey5, borderRadius: 8 },
  defaultIconContainer: {
    width: 35,
    height: 35,
    marginRight: 12,
    borderRadius: 17.5,
    backgroundColor: theme.colors.grey5,
    alignItems: "center",
    justifyContent: "center",
  },
  foodIcon: {
    width: 35,
    height: 35,
    marginRight: 12,
    borderRadius: 17.5,
    resizeMode: "contain",
    backgroundColor: theme.colors.grey5,
    alignItems: "center",
    justifyContent: "center",
  },
  listItemTitle: { color: theme.colors.text, fontSize: 16, fontWeight: "500" },
  noFoodsText: {
    color: theme.colors.grey2,
    fontStyle: "italic",
    textAlign: "center",
    marginTop: 20,
    marginBottom: 10,
    paddingHorizontal: 10,
  },
  amountSection: {
    marginTop: 10,
    borderTopWidth: 1,
    borderTopColor: theme.colors.divider,
    paddingTop: 15,
    paddingHorizontal: 0,
  },
  unitSelectorContainer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 15,
    paddingHorizontal: 5,
  },
  inputLabel: {
    fontWeight: "600",
    color: theme.colors.grey1,
    fontSize: 14,
    marginRight: 10,
    textTransform: "uppercase",
  },
  buttonGroupContainer: {
    flex: 0.7,
    maxWidth: 220,
    height: 35,
    borderRadius: 8,
    borderColor: theme.colors.primary,
    borderWidth: 1,
    backgroundColor: theme.colors.background,
  },
  buttonGroupText: { fontSize: 14, color: theme.colors.text },
  disabledButtonGroup: { backgroundColor: theme.colors.grey5 },
  servingSizeRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
    paddingHorizontal: 5,
  },
  servingSizeLabel: { color: theme.colors.grey2, fontSize: 13, marginRight: 8 },
  servingSizeContainer: { flexGrow: 0 },
  servingSizeButton: {
    backgroundColor: theme.colors.grey4,
    borderRadius: 15,
    marginRight: 8,
    paddingHorizontal: 12,
    paddingVertical: 5,
    justifyContent: "center",
    alignItems: "center",
    height: 30,
  },
  servingSizeButtonTitle: { color: theme.colors.text, fontSize: 13 },
  gramInputStyle: {
    color: theme.colors.text,
    fontSize: 16,
    paddingVertical: 8,
    height: 40,
  },
  gramInputContainerStyle: {
    borderBottomColor: theme.colors.grey3,
    paddingHorizontal: 5,
  },
  unitText: {
    color: theme.colors.grey2,
    fontSize: 15,
    fontWeight: "500",
    paddingRight: 5,
  },
  autoInputRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 0,
  },
  autoInputContainer: { flex: 1, paddingHorizontal: 0, marginRight: 10 },
  autoInputField: { height: 40 },
  aiButton: {
    backgroundColor: theme.colors.secondary,
    borderRadius: 20,
    width: 40,
    height: 40,
    padding: 0,
    justifyContent: "center",
    alignItems: "center",
    minWidth: 40,
  },
  quickAddHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 10,
    paddingHorizontal: 5,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.divider,
    paddingBottom: 8,
  },
  // Style for the QuickAddList component container within the modal's FlatList
  quickAddListStyle: {
    // Example: control max height if needed, although FlatList in Overlay handles scroll
    // maxHeight: Dimensions.get("window").height * 0.5,
    // Add padding or margins if QuickAddList itself doesn't have them
    // paddingHorizontal: 5,
  },
  disabledOverlay: {
    opacity: 0.6,
  },
}));

export default AddEntryModal;

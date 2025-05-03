// ---------- src/components/AddEntryModal.tsx ----------
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

  // Reset state on modal close
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

  // Handle state initialization/reset when modal opens or mode changes
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

  // Load icons for visible foods
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
      // Error alert is now handled within getGramsFromNaturalLanguage
    } finally {
      setIsAiLoading(false);
    }
  }, [selectedFood, autoInput, isAiLoading, setGrams]);

  const handleAddOrUpdateSingleEntry = useCallback(async () => {
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
            mediaTypes: ImagePicker.MediaTypeOptions.Images, // Corrected usage
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
                mimeType: "image/jpeg", // Compressor standardizes to JPEG
              }
            : originalAsset;
          const base64Image = await getBase64FromUri(assetForAnalysis.uri);
          const mimeType = determineMimeType(assetForAnalysis);
          const results = await getMultipleFoodsFromImage(
            base64Image,
            mimeType
          );
          if (results.length === 0) {
            // Alert is handled by getMultipleFoodsFromImage, just reset modal mode
            console.log("No foods identified by backend.");
            setModalMode("normal");
          } else {
            setQuickAddItems(results);
            setSelectedQuickAddIndices(new Set(results.map((_, i) => i)));
          }
        } else throw new Error("Could not select image.");
      } catch (error: any) {
        if (
          error.message !== "User cancelled" &&
          error.message !== "Permission denied" && // Avoid double alert
          !(error instanceof BackendError) // Backend errors show alerts via utils/macros
        ) {
          Alert.alert(
            "Error",
            error.message || "An unexpected error occurred."
          );
        }
        // Reset to normal mode if any error occurred during process
        setModalMode("normal");
        setQuickAddItems([]);
        setSelectedQuickAddIndices(new Set());
      } finally {
        // Add slight delay to allow UI to settle before removing loading indicator
        setTimeout(() => setQuickAddLoading(false), 150);
      }
    },
    [isEditMode, handleSelectFood, updateSearch, setGrams]
  );

  const handleQuickAddImage = useCallback(async () => {
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
    if (isActionDisabled) return;
    setEditingQuickAddItemIndex(null);
    setEditedFoodName("");
    setEditedGrams("");
    Keyboard.dismiss();
  }, [isActionDisabled]);

  const handleConfirmQuickAdd = useCallback(() => {
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
          // Create a Food object compliant with the app's Food type
          const quickFood: Food = {
            id: uuidv4(), // Generate a local UUID for this potentially new food
            name: item.foodName,
            calories: Math.round(Number(item.calories_per_100g) || 0),
            protein: Math.round(Number(item.protein_per_100g) || 0),
            carbs: Math.round(Number(item.carbs_per_100g) || 0),
            fat: Math.round(Number(item.fat_per_100g) || 0),
          };
          const entryGrams = Math.max(
            1, // Ensure grams is at least 1
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
    // Allow only numbers (and potentially a single decimal point if needed later)
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
    // Add a spacer at the bottom to prevent content being hidden by action buttons
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
        case "searchBar":
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
                    {/* --- Start: Icon/Image/Indicator Rendering (No spaces between elements) --- */
                    foodIcons[food.name] !== undefined ? (
                      foodIcons[food.name] ? (
                        <Image
                          source={{ uri: foodIcons[food.name] as string }}
                          style={styles.foodIconSmall}
                          onError={() =>
                            setFoodIcons((prev) => ({
                              ...prev,
                              [food.name]: null,
                            }))
                          }
                          resizeMode="contain"
                        />
                      ) : (
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
                      <ActivityIndicator
                        size="small"
                        color={theme.colors.grey3}
                        style={styles.foodIconSmall}
                      />
                    )}
                    {/* --- End: Icon Block --- */
                    /* --- Start: Text Block (Immediately follows Icon Block) --- */}
                    <Text
                      style={[
                        styles.recentFoodText,
                        screenWidth < 350 && styles.smallRecentFoodText,
                      ]}
                      numberOfLines={1}
                      ellipsizeMode="tail"
                    >
                      {food.name}
                    </Text>
                    {/* --- End: Text Block --- */}
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>
          );
        case "searchResults": {
          const food = item.data;
          const isSelected = selectedFood?.id === food.id;
          return (
            <TouchableOpacity
              onPress={() =>
                !isActionDisabled && handleInternalSelectFood(food)
              }
              disabled={isActionDisabled}
              style={[isActionDisabled && styles.disabledOverlay]}
            >
              <ListItem
                bottomDivider
                containerStyle={[
                  styles.listItemContainer,
                  isSelected && styles.selectedListItem,
                ]}
              >
                {/* --- Start: Icon Block (No spaces between elements) --- */
                foodIcons[food.name] !== undefined ? (
                  foodIcons[food.name] ? (
                    <Image
                      source={{ uri: foodIcons[food.name] as string }}
                      style={styles.foodIcon}
                      onError={() =>
                        setFoodIcons((prev) => ({ ...prev, [food.name]: null }))
                      }
                      resizeMode="contain"
                    />
                  ) : (
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
                  <ActivityIndicator
                    size="small"
                    color={theme.colors.grey3}
                    style={styles.foodIcon}
                  />
                )/* --- End: Icon Block --- */
                /* --- Start: Content Block (Immediately follows Icon Block) --- */}
                <ListItem.Content>
                  <ListItem.Title style={styles.listItemTitle}>
                    {food.name}
                  </ListItem.Title>
                </ListItem.Content>
                {/* --- End: Content Block --- */
                /* --- Start: Checkmark Block (Immediately follows Content Block) --- */
                isSelected && (
                  <Icon
                    name="checkmark-circle"
                    type="ionicon"
                    color={theme.colors.primary}
                    size={24}
                  />
                )/* --- End: Checkmark Block --- */}
              </ListItem>
            </TouchableOpacity>
          );
        }
        case "noResults":
          return (
            <Text style={styles.noFoodsText}>
              {modalMode === "quickAddSelect"
                ? "No food items found in the image."
                : `No foods found matching "${search}".`}
            </Text>
          );
        case "amountInput":
          if (!selectedFood) {
            return null;
          }
          return (
            <View style={styles.amountSection}>
              {/* --- Unit Selector --- */}
              <View style={styles.unitSelectorContainer}>
                <Text style={styles.inputLabel}>Amount</Text>
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
                  disabled={isEditMode ? [1] : isActionDisabled ? [0, 1] : []}
                  disabledStyle={styles.disabledButtonGroup}
                  disabledTextStyle={{ color: theme.colors.grey3 }}
                />
              </View>
              {/* --- Grams Input Mode --- */}
              {unitMode === "grams" && (
                <>
                  {/* --- Serving Size Suggestions --- */}
                  {!isEditMode && servingSizeSuggestions.length > 0 && (
                    <View style={styles.servingSizeRow}>
                      <Text style={styles.servingSizeLabel}>Quick Add:</Text>
                      <ScrollView
                        horizontal
                        showsHorizontalScrollIndicator={false}
                        contentContainerStyle={styles.servingSizeContainer}
                        keyboardShouldPersistTaps="handled"
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
                    onChangeText={(text) => {
                      const cleanedText = text
                        .replace(/[^0-9.]/g, "")
                        .replace(/(\..*?)\./g, "$1");
                      setGrams(cleanedText);
                    }}
                    inputStyle={styles.gramInputStyle}
                    inputContainerStyle={styles.gramInputContainerStyle}
                    errorMessage={
                      !isValidNumberInput(grams) &&
                      grams !== "" &&
                      grams !== "."
                        ? "Enter a valid number"
                        : ""
                    }
                    errorStyle={{ color: theme.colors.error }}
                    rightIcon={<Text style={styles.unitText}>g</Text>}
                    containerStyle={{ paddingHorizontal: 0 }}
                    key={`grams-input-${selectedFood.id}-${isEditMode}`}
                    disabled={isActionDisabled}
                  />
                </>
              )}
              {/* --- Auto (AI) Input Mode --- */}
              {unitMode === "auto" && !isEditMode && (
                <View style={styles.autoInputRow}>
                  <Input
                    placeholder="Describe quantity (e.g., 1 cup cooked)"
                    value={autoInput}
                    onChangeText={setAutoInput}
                    inputStyle={[styles.gramInputStyle, styles.autoInputField]}
                    inputContainerStyle={styles.gramInputContainerStyle}
                    containerStyle={styles.autoInputContainer}
                    multiline={false}
                    onSubmitEditing={handleEstimateGrams}
                    key={`auto-input-${selectedFood.id}`}
                    disabled={isActionDisabled}
                  />
                  <Button
                    onPress={handleEstimateGrams}
                    disabled={isAiButtonDisabled || isActionDisabled}
                    loading={isAiLoading}
                    buttonStyle={styles.aiButton}
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
                    title={isAiLoading ? "" : ""}
                  />
                </View>
              )}
            </View>
          );
        case "quickAddHeader":
          return (
            <View style={styles.quickAddHeader}>
              <Text style={styles.sectionTitle}>
                {/* Removed extra spaces inside {} */}
                {editingQuickAddItemIndex !== null
                  ? "Editing Item Details"
                  : "Select Items from Image"}
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
              )}
            </View>
          );
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
        case "spacer":
          return <View style={{ height: item.height }} />;
        default:
          return null;
      }
    },
    [
      // Include all dependencies used within the callback
      search, updateSearch, isActionDisabled, modalMode, recentFoods, screenWidth,
      selectedFood, foodIcons, setFoodIcons, handleInternalSelectFood, filteredFoods,
      unitMode, setUnitMode, isEditMode, servingSizeSuggestions, setGrams, grams,
      autoInput, setAutoInput, handleEstimateGrams, isAiLoading, isAiButtonDisabled,
      theme, styles, // Styles and theme are used
      // Quick Add State/Handlers for QuickAddList props and other parts
      quickAddLoading, quickAddItems, editingQuickAddItemIndex, selectedQuickAddIndices,
      editedFoodName, editedGrams, handleToggleQuickAddItem, handleEditQuickAddItem,
      handleSaveQuickAddItemEdit, handleCancelQuickAddItemEdit, handleQuickAddGramsChange,
      // Other general handlers
      handleAddOrUpdateSingleEntry, handleConfirmQuickAdd, handleQuickAddImage,
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
          {/* Header */}
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
            {/* Conditional Action Buttons */}
            {modalMode === "normal" ? (
              <View style={styles.headerActionsNormal}>
                {!isEditMode && (
                  <TouchableOpacity
                    onPress={handleQuickAddImage}
                    disabled={isQuickAddImageButtonDisabled}
                    style={styles.headerIcon}
                  >
                    {quickAddLoading && modalMode === "normal" ? ( // Show indicator if loading started from normal mode
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
                  // Show loading indicator on Add/Update if AI is processing (related action)
                  loading={isAiLoading && unitMode === "auto"}
                />
              </View>
            ) : editingQuickAddItemIndex === null ? ( // Quick Add Confirm Button
              <Button
                title={`Add ${selectedQuickAddIndices.size}`}
                onPress={handleConfirmQuickAdd}
                disabled={isQuickAddConfirmDisabled}
                buttonStyle={[
                  styles.addButton,
                  { backgroundColor: theme.colors.success },
                ]}
                titleStyle={styles.buttonTitle}
                // Show loading indicator if quick add backend call is active
                loading={quickAddLoading}
              />
            ) : (
              // Placeholder for alignment when editing a quick add item (Save/Cancel are inside list)
              <View style={{ width: 70, marginLeft: 5 }} />
            )}
          </View>

          {/* Content Area - FlatList */}
          <FlatList
            data={listData}
            renderItem={renderListItem}
            keyExtractor={(item) => item.key}
            extraData={{ // Ensure FlatList updates when these states change
              selectedFood, grams, unitMode, autoInput, isAiLoading, search,
              foodIcons, modalMode, quickAddItems, selectedQuickAddIndices,
              editingQuickAddItemIndex, editedFoodName, editedGrams,
              isActionDisabled, quickAddLoading
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
      {/* Toast needs to be outside Overlay for visibility */}
      {/* <Toast /> <-- Consider placing Toast outside or ensuring Overlay doesn't block it */}
    </Overlay>
  );
};

// --- Styles --- (Removed QuickAdd specific item styles as they are now in QuickAddList. Added style for the list container itself)
const useStyles = makeStyles((theme) => ({
    overlayContainer: {
        backgroundColor: "transparent", // Allows underlying content blur/dim
        width: "90%",
        maxWidth: 500, // Max width for larger screens/tablets
        padding: 0, // Handled by overlayStyle inside
        borderRadius: 15,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 3 },
        shadowOpacity: 0.2,
        shadowRadius: 5,
        elevation: 6,
        overflow: "hidden", // Clip content to rounded corners
        maxHeight: Dimensions.get("window").height * 0.85, // Limit height
    },
    overlayStyle: { // Inner container styling
        width: "100%",
        height: "100%",
        borderRadius: 15, // Match outer container
        padding: 15, // Standard padding
        paddingBottom: 0, // Allow FlatList to manage bottom space
        backgroundColor: theme.colors.background,
        flex: 1, // Ensure it takes full space of the overlay container
    },
    keyboardAvoidingView: { width: "100%", height: "100%" }, // Take full overlay space
    header: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        marginBottom: 15,
        paddingHorizontal: 0, // Padding managed by overlayStyle
    },
    closeIconTouchable: { padding: 5, zIndex: 1 }, // Ensure touchable, on top
    overlayTitle: {
        color: theme.colors.text,
        fontWeight: "bold",
        fontSize: 20,
        textAlign: "center",
        flex: 1, // Allow title to take available space
        marginHorizontal: 5, // Space around title
    },
    editModeTitle: { color: theme.colors.warning },
    headerActionsNormal: { flexDirection: "row", alignItems: "center" },
    headerIcon: { padding: 5, marginHorizontal: 5, zIndex: 1 },
    addButton: {
        borderRadius: 20, // Pill shape
        paddingHorizontal: 15,
        paddingVertical: 8,
        minWidth: 70, // Ensure minimum size
        marginLeft: 5, // Space from icon/edge
        backgroundColor: theme.colors.primary,
        zIndex: 1,
    },
    updateButton: { backgroundColor: theme.colors.warning }, // Specific color for update
    buttonTitle: { color: theme.colors.white, fontWeight: "600", fontSize: 15 },
    flatListContainer: { flex: 1, width: "100%" }, // Take remaining vertical space
    flatListContentContainer: { paddingBottom: 30 }, // Space at the bottom of list
    searchBarContainer: {
        backgroundColor: "transparent",
        borderBottomColor: "transparent",
        borderTopColor: "transparent",
        paddingHorizontal: 0, // Use container padding
        marginBottom: 10,
    },
    searchBarInputContainer: {
        borderRadius: 25,
        backgroundColor: theme.colors.searchBg || theme.colors.grey5,
        height: 40, // Standard height
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
        borderRadius: 16, // Pill shape
        backgroundColor: theme.colors.grey5,
        marginRight: 8,
        flexDirection: "row", // Align icon and text
        alignItems: "center",
        borderWidth: 1.5, // For selection highlight
        borderColor: "transparent", // Default border
    },
    selectedRecentFoodItem: { borderColor: theme.colors.primary }, // Highlight selected
    smallRecentFoodItem: { paddingHorizontal: 8, paddingVertical: 5 }, // Adjust for smaller screens
    foodIconSmall: {
        width: 20, height: 20, marginRight: 6, borderRadius: 10, // Circular small icon
        resizeMode: "contain", alignItems: "center", justifyContent: "center",
        backgroundColor: theme.colors.grey4, // BG for placeholder/loading
    },
    iconPlaceholderSmall: {
        backgroundColor: theme.colors.grey4,
        alignItems: "center", justifyContent: "center",
    },
    recentFoodText: { color: theme.colors.text, fontSize: 13, maxWidth: 80 }, // Limit text width
    smallRecentFoodText: { fontSize: 12, maxWidth: 70 },
    listItemContainer: {
        backgroundColor: "transparent", // Use parent background
        paddingVertical: 8,
        paddingHorizontal: 5,
        borderBottomColor: theme.colors.divider,
    },
    selectedListItem: { backgroundColor: theme.colors.grey5, borderRadius: 8 }, // Selection feedback
    defaultIconContainer: { // Placeholder icon wrapper
        width: 35, height: 35, marginRight: 12, borderRadius: 17.5, // Circular
        backgroundColor: theme.colors.grey5, alignItems: "center", justifyContent: "center",
    },
    foodIcon: { // Style for actual Image or loading indicator view
        width: 35, height: 35, marginRight: 12, borderRadius: 17.5, // Circular
        resizeMode: "contain", backgroundColor: theme.colors.grey5, // BG for loading/placeholder
        alignItems: "center", justifyContent: "center",
    },
    listItemTitle: { color: theme.colors.text, fontSize: 16, fontWeight: "500" },
    noFoodsText: {
        color: theme.colors.grey2, fontStyle: "italic", textAlign: "center",
        marginTop: 20, marginBottom: 10, paddingHorizontal: 10,
    },
    amountSection: {
        marginTop: 10, borderTopWidth: 1, borderTopColor: theme.colors.divider,
        paddingTop: 15, paddingHorizontal: 0, // Use container padding
    },
    unitSelectorContainer: {
        flexDirection: "row", alignItems: "center", justifyContent: "space-between",
        marginBottom: 15, paddingHorizontal: 5,
    },
    inputLabel: {
        fontWeight: "600", color: theme.colors.grey1, fontSize: 14,
        marginRight: 10, textTransform: "uppercase",
    },
    buttonGroupContainer: {
        flex: 0.7, maxWidth: 220, height: 35, borderRadius: 8,
        borderColor: theme.colors.primary, borderWidth: 1,
        backgroundColor: theme.colors.background,
    },
    buttonGroupText: { fontSize: 14, color: theme.colors.text },
    disabledButtonGroup: { backgroundColor: theme.colors.grey5 },
    servingSizeRow: {
        flexDirection: "row", alignItems: "center", marginBottom: 12, paddingHorizontal: 5,
    },
    servingSizeLabel: { color: theme.colors.grey2, fontSize: 13, marginRight: 8 },
    servingSizeContainer: { flexGrow: 0 }, // Don't let scrollview grow infinitely
    servingSizeButton: {
        backgroundColor: theme.colors.grey4, borderRadius: 15, // Rounded pill
        marginRight: 8, paddingHorizontal: 12, paddingVertical: 5,
        justifyContent: "center", alignItems: "center", height: 30,
    },
    servingSizeButtonTitle: { color: theme.colors.text, fontSize: 13 },
    gramInputStyle: {
        color: theme.colors.text, fontSize: 16, paddingVertical: 8, height: 40,
    },
    gramInputContainerStyle: {
        borderBottomColor: theme.colors.grey3, paddingHorizontal: 5,
    },
    unitText: { // For the 'g' unit
        color: theme.colors.grey2, fontSize: 15, fontWeight: "500", paddingRight: 5,
    },
    autoInputRow: {
        flexDirection: "row", alignItems: "center", paddingHorizontal: 0, // Use container padding
    },
    autoInputContainer: { flex: 1, paddingHorizontal: 0, marginRight: 10 },
    autoInputField: { height: 40 }, // Consistent height with grams input
    aiButton: {
        backgroundColor: theme.colors.secondary, borderRadius: 20, // Circular
        width: 40, height: 40, padding: 0, justifyContent: "center", alignItems: "center",
        minWidth: 40, // Ensure size doesn't shrink
    },
    quickAddHeader: {
        flexDirection: "row", justifyContent: "space-between", alignItems: "center",
        marginBottom: 10, paddingHorizontal: 5, borderBottomWidth: 1,
        borderBottomColor: theme.colors.divider, paddingBottom: 8,
    },
    // Style for the QuickAddList component container within the modal's FlatList
    quickAddListStyle: {
        // Allow QuickAddList to take available space within the modal's FlatList area
        // Max height can be implicitly controlled by the Overlay's maxHeight
        // Add padding/margins here ONLY if QuickAddList itself doesn't have them internally
        // e.g., paddingHorizontal: 5,
    },
    disabledOverlay: { // Simple opacity to indicate disabled state
        opacity: 0.6,
    },
}));

export default AddEntryModal;
// ---------- END src/components/AddEntryModal.tsx ----------
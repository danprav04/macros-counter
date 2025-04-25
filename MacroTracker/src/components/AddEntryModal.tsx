// src/components/AddEntryModal.tsx
// ---------- AddEntryModal.tsx (Integrate Backend, Handle Errors) ----------
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
  Pressable,
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
  CheckBox,
} from "@rneui/themed";
import { Food } from "../types/food";
import { isValidNumberInput } from "../utils/validationUtils";
import { loadRecentFoods, saveRecentFoods } from "../services/storageService";
import { getFoodIconUrl } from "../utils/iconUtils"; // Frontend icon cache remains
import { getGramsFromNaturalLanguage } from "../utils/units"; // Uses backend now
import Toast from "react-native-toast-message";
import * as ImagePicker from "expo-image-picker";
// Import types and backend function for multi-image add
import { EstimatedFoodItem, getMultipleFoodsFromImage, getBase64FromUri } from "../utils/macros";
import { v4 as uuidv4 } from "uuid";
import { BackendError } from "../services/backendService"; // Import custom error type


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
}

const KEYBOARD_VERTICAL_OFFSET = Platform.OS === "ios" ? 80 : 0;

type UnitMode = "grams" | "auto";
type ModalMode = "normal" | "quickAddSelect";

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
    [foodName: string]: string | null;
  }>({});

  const [unitMode, setUnitMode] = useState<UnitMode>("grams");
  const [autoInput, setAutoInput] = useState("");
  const [isAiLoading, setIsAiLoading] = useState(false); // For natural language grams

  // --- Quick Add State ---
  const [modalMode, setModalMode] = useState<ModalMode>("normal");
  const [quickAddLoading, setQuickAddLoading] = useState(false); // For image analysis
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
  const isInitiallyVisible = useRef(false);

  const filteredFoods = useMemo(() => {
    if (!search) return [];
    return foods.filter((food) =>
      food.name.toLowerCase().includes(search.toLowerCase())
    );
  }, [foods, search]);

  // Effect to handle state resets on visibility change and mode switches
  useEffect(() => {
    if (!isVisible) {
      handleSelectFood(null);
      setGrams("");
      updateSearch("");
      setUnitMode("grams");
      setAutoInput("");
      setIsAiLoading(false);
      setModalMode("normal");
      setQuickAddItems([]);
      setSelectedQuickAddIndices(new Set());
      setQuickAddLoading(false);
      setEditingQuickAddItemIndex(null);
      setEditedFoodName("");
      setEditedGrams("");
      isInitiallyVisible.current = false;
    } else {
      if (
        !isInitiallyVisible.current &&
        !quickAddLoading &&
        modalMode !== "quickAddSelect"
      ) {
        setModalMode("normal");
      }
      isInitiallyVisible.current = true;

      if (!isAiLoading && !quickAddLoading) {
        setAutoInput("");
      }

      let targetGrams = grams;
      let targetUnitMode = unitMode;

      if (
        isEditMode &&
        selectedFood &&
        initialGrams &&
        modalMode === "normal"
      ) {
        targetGrams = initialGrams;
        targetUnitMode = "grams";
        if (unitMode === "auto") {
            setAutoInput("");
        }
      } else if (!isEditMode && selectedFood && modalMode === "normal") {
        targetUnitMode = "grams";
      } else if (!selectedFood && modalMode === "normal") {
        targetGrams = "";
        targetUnitMode = "grams";
      }

      if (grams !== targetGrams) {
        setGrams(targetGrams);
      }
      if (unitMode !== targetUnitMode && !isAiLoading && !quickAddLoading) {
        setUnitMode(targetUnitMode);
      }

      if (isEditMode) {
          setModalMode("normal");
          setQuickAddItems([]);
          setSelectedQuickAddIndices(new Set());
          setEditingQuickAddItemIndex(null);
          setEditedFoodName("");
          setEditedGrams("");
      }
    }
  }, [
    isVisible, isEditMode, selectedFood, initialGrams, quickAddLoading, modalMode,
    handleSelectFood, updateSearch, setGrams, unitMode, grams,
  ]);

  // Load recent foods when modal becomes visible in normal mode
  useEffect(() => {
    const loadRecents = async () => {
      const loadedRecentFoods = await loadRecentFoods();
      setRecentFoods(loadedRecentFoods);
    };
    if (isVisible && modalMode === "normal") {
      loadRecents();
    }
  }, [isVisible, modalMode]);

  // Load icons for visible foods (using frontend cache/backend service)
  useEffect(() => {
    const loadIcons = async () => {
      const iconsToLoad: { [foodName: string]: Promise<string | null> } = {};
      const relevantFoods = search ? filteredFoods : recentFoods;
      const uniqueFoodsMap = new Map(
        relevantFoods.map((food) => [food.id ?? food.name, food]) // Use ID if available, fallback name
      );

      let shouldUpdateState = false;
      for (const food of uniqueFoodsMap.values()) {
        if (foodIcons[food.name] === undefined) { // Only initiate fetch if status is unknown
            // No need to await here, let it run in background
            getFoodIconUrl(food.name)
              .then(iconUrl => {
                   // Update state specifically for this food when promise resolves
                   setFoodIcons(prevIcons => ({ ...prevIcons, [food.name]: iconUrl }));
              })
              .catch(error => {
                   console.warn(`Icon fetch failed for ${food.name}:`, error);
                   // Still update state to mark as failed (null)
                   setFoodIcons(prevIcons => ({ ...prevIcons, [food.name]: null }));
              });
              // Mark that an update *will* happen, even if async
              shouldUpdateState = true;
        }
      }
       // No need to call setFoodIcons here, it's handled in the .then/.catch callbacks
       // if (shouldUpdateState) {
       //     // State updates happen asynchronously now
       // }
    };

    if (
      isVisible &&
      modalMode === "normal" &&
      (foods.length > 0 || recentFoods.length > 0)
    ) {
      loadIcons();
    }
  }, [isVisible, modalMode, search, filteredFoods, recentFoods, foods]); // Keep dependencies

  const addToRecentFoods = async (food: Food) => {
    if (!food || !food.id) {
      console.warn("Attempted to add invalid food to recents:", food);
      return;
    }
    if (recentFoods.length > 0 && recentFoods[0].id === food.id) return;
    const updatedRecentFoods = recentFoods.filter(
      (recentFood) => recentFood.id !== food.id
    );
    updatedRecentFoods.unshift(food);
    const trimmedRecentFoods = updatedRecentFoods.slice(0, MAX_RECENT_FOODS);
    setRecentFoods(trimmedRecentFoods);
    await saveRecentFoods(trimmedRecentFoods);
  };

  const servingSizeSuggestions = useMemo(() => {
    if (!selectedFood) return [];
    return [
      { label: "50g", value: "50" },
      { label: "100g", value: "100" },
      { label: "150g", value: "150" },
      { label: "200g", value: "200" },
    ];
  }, [selectedFood]);

  // Uses backend service
  const handleEstimateGrams = async () => {
    if (!selectedFood || !autoInput.trim()) {
      Alert.alert(
        "Input Missing",
        "Please select a food and enter a quantity description (e.g., '1 cup', '2 medium')."
      );
      return;
    }
    setIsAiLoading(true);
    try {
      // Call the refactored utility function (which calls backend service)
      const estimatedGrams = await getGramsFromNaturalLanguage(
        selectedFood.name,
        autoInput
      );
      const roundedGrams = String(Math.round(estimatedGrams));
      setGrams(roundedGrams);
      setUnitMode("grams"); // Switch back to grams mode
      Toast.show({
        type: "success",
        text1: "Grams Estimated",
        text2: `Estimated ${roundedGrams}g for ${selectedFood.name}`,
        position: "bottom",
        visibilityTime: 3000,
      });
    } catch (error: any) {
      // Error Alert is handled within getGramsFromNaturalLanguage using BackendError check
      console.error("AI Gram Estimation Error (Modal Level):", error);
      // No need for duplicate Alert here if backendService/utils handle it
      // Alert.alert(
      //   "AI Estimation Failed",
      //   error.message || "Could not estimate grams. Please enter manually."
      // );
    } finally {
      setIsAiLoading(false);
    }
  };

  const handleAddOrUpdateSingleEntry = async () => {
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
    if (isAiLoading || quickAddLoading) return;
    handleAddEntry(); // Call parent function to update DailyEntryScreen state
    await addToRecentFoods(selectedFood);
  };

  const handleInternalSelectFood = (item: Food | null) => {
    if (selectedFood?.id === item?.id) return;
    handleSelectFood(item);
    if (item && (!isEditMode || !initialGrams)) {
      setGrams("");
      setUnitMode("grams");
      setAutoInput("");
    } else if (!item) {
      setGrams("");
      setUnitMode("grams");
      setAutoInput("");
    }
  };

  // --- Quick Add Functions ---

  const handleQuickAddImage = async () => {
    if (isEditMode) {
        console.warn("Attempted to initiate Quick Add while in Edit Mode.");
        return;
    }
    if (editingQuickAddItemIndex !== null) {
      Alert.alert(
        "Finish Editing",
        "Please save or cancel the current edit before adding a new image."
      );
      return;
    }
    Alert.alert(
      "Quick Add from Image",
      "Identify multiple foods from a single image.",
      [
        { text: "Cancel", style: "cancel" },
        { text: "Camera", onPress: () => pickImageAndAnalyze("camera") },
        { text: "Gallery", onPress: () => pickImageAndAnalyze("gallery") },
      ]
    );
  };

  // Uses backend service
  const pickImageAndAnalyze = async (source: "camera" | "gallery") => {
    if (isEditMode) return;

    let permissionResult;
    let pickerResult: ImagePicker.ImagePickerResult;

    setQuickAddLoading(true);
    setQuickAddItems([]);
    setSelectedQuickAddIndices(new Set());
    setEditingQuickAddItemIndex(null);

    try {
      if (source === "camera") {
        permissionResult = await ImagePicker.requestCameraPermissionsAsync();
        if (!permissionResult.granted) {
          Alert.alert("Permission Required", "Camera access needed.");
          setQuickAddLoading(false);
          return;
        }
        pickerResult = await ImagePicker.launchCameraAsync({ quality: 0.6 });
      } else {
        permissionResult =
          await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (!permissionResult.granted) {
          Alert.alert("Permission Required", "Gallery access needed.");
          setQuickAddLoading(false);
          return;
        }
        pickerResult = await ImagePicker.launchImageLibraryAsync({
          mediaTypes: ImagePicker.MediaTypeOptions.Images, // Correct type
          quality: 0.6,
        });
      }

      if (pickerResult.canceled) {
        console.log("Image selection/capture cancelled for Quick Add.");
        setQuickAddLoading(false);
        return;
      }

      if (pickerResult.assets && pickerResult.assets.length > 0) {
        const asset = pickerResult.assets[0];
        // Call the refactored utility function (which calls backend service)
        const results = await getMultipleFoodsFromImage(asset); // Pass the asset directly

        if (results.length === 0) {
          Alert.alert(
            "No Foods Found",
            "The AI couldn't identify any food items in the image. Try again or add manually."
          );
          setQuickAddItems([]);
          setModalMode("normal");
        } else {
          setQuickAddItems(results);
          setSelectedQuickAddIndices(new Set(results.map((_, i) => i)));
          setModalMode("quickAddSelect");
          handleSelectFood(null);
          setGrams("");
          updateSearch("");
          setUnitMode("grams");
          setAutoInput("");
        }
      } else {
        console.log("No assets selected or returned for Quick Add.");
        Alert.alert("Error", "Could not select image.");
        setModalMode("normal");
      }
    } catch (error: any) {
       // Alert handling is now done within getMultipleFoodsFromImage
       console.error("Error during Quick Add image process (Modal Level):", error);
       setModalMode("normal"); // Go back to normal mode on error
       setQuickAddItems([]);
       setSelectedQuickAddIndices(new Set());
       setEditingQuickAddItemIndex(null);
       // No need for duplicate Alert here if backendService/utils handle it
       // Alert.alert(
       //   "Quick Add Failed",
       //   `Could not analyze the image. ${error.message || "Please try again."}`
       // );
    } finally {
      // Use timeout to ensure loading state hides after modal transition completes
      setTimeout(() => setQuickAddLoading(false), 100);
    }
  };

  const handleToggleQuickAddItem = (index: number) => {
    if (editingQuickAddItemIndex !== null) return;

    setSelectedQuickAddIndices((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(index)) {
        newSet.delete(index);
      } else {
        newSet.add(index);
      }
      return newSet;
    });
  };

  const handleEditQuickAddItem = (index: number) => {
    if (editingQuickAddItemIndex !== null) {
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
    setSelectedQuickAddIndices((prev) => {
      const newSet = new Set(prev);
      newSet.delete(index);
      return newSet;
    });
  };

  const handleSaveQuickAddItemEdit = () => {
    if (editingQuickAddItemIndex === null) return;

    const trimmedName = editedFoodName.trim();
    if (!trimmedName) {
      Alert.alert("Invalid Name", "Food name cannot be empty.");
      return;
    }

    const numericGrams = parseFloat(editedGrams);
    if (!isValidNumberInput(editedGrams) || numericGrams <= 0) {
      Alert.alert(
        "Invalid Grams",
        "Please enter a valid positive number for grams."
      );
      return;
    }
    const roundedGrams = Math.round(numericGrams);

    const updatedItems = quickAddItems.map((item, index) => {
      if (index === editingQuickAddItemIndex) {
        return {
          ...item,
          foodName: trimmedName,
          estimatedWeightGrams: roundedGrams,
        };
      }
      return item;
    });

    setQuickAddItems(updatedItems);
    setEditingQuickAddItemIndex(null);
    setEditedFoodName("");
    setEditedGrams("");
    setSelectedQuickAddIndices((prev) => {
        const newSet = new Set(prev);
        // Use the original index that was stored in editingQuickAddItemIndex
        if (editingQuickAddItemIndex !== null) {
            newSet.add(editingQuickAddItemIndex);
        }
        return newSet;
      });
  };

  const handleCancelQuickAddItemEdit = () => {
    setEditingQuickAddItemIndex(null);
    setEditedFoodName("");
    setEditedGrams("");
     // Optionally re-select if needed, based on desired UX
  };

  const handleConfirmQuickAdd = () => {
    if (isEditMode) {
        console.warn("Attempted Quick Add confirmation while in Edit Mode.");
        return;
    }
    try {
      console.log("AddEntryModal: handleConfirmQuickAdd triggered.");

      if (editingQuickAddItemIndex !== null) {
        Alert.alert(
          "Finish Editing",
          "Please save or cancel your edit before adding items."
        );
        return;
      }

      if (selectedQuickAddIndices.size === 0) {
        Alert.alert(
          "No Items Selected",
          "Please select or edit at least one item to add."
        );
        return;
      }

      const entriesToAdd = Array.from(selectedQuickAddIndices).map((index) => {
        const item = quickAddItems[index];
        // Create a temporary Food object consistent with Food type
        const quickFood: Food = {
          id: uuidv4(), // Generate unique ID for this specific entry instance
          name: item.foodName,
          calories: Math.round(item.calories_per_100g),
          protein: Math.round(item.protein_per_100g),
          carbs: Math.round(item.carbs_per_100g),
          fat: Math.round(item.fat_per_100g),
        };
        const entryGrams = Math.max(1, Math.round(item.estimatedWeightGrams));
        return { food: quickFood, grams: entryGrams };
      });

      console.log(
        "AddEntryModal: Prepared entriesToAdd:",
        JSON.stringify(entriesToAdd, null, 2)
      );

      handleAddMultipleEntries(entriesToAdd); // Pass to parent
      // toggleOverlay(); // Let parent handle closing after state update
    } catch (error) {
      console.error(
        "AddEntryModal: Error in handleConfirmQuickAdd:",
        error
      );
      Alert.alert(
        "Error",
        "A problem occurred while preparing items to add."
      );
    }
  };

  // --- End Quick Add Functions ---

  const isActionDisabled =
    isAiLoading || quickAddLoading || editingQuickAddItemIndex !== null;

  const isAddButtonDisabled =
    modalMode !== "normal" ||
    !selectedFood ||
    !isValidNumberInput(grams) ||
    parseFloat(grams) <= 0 ||
    isActionDisabled;
  const isAiButtonDisabled = // For natural language grams
    modalMode !== "normal" ||
    !selectedFood ||
    !autoInput.trim() ||
    isActionDisabled;
  const isQuickAddConfirmDisabled = // For multi-image add
    isEditMode ||
    modalMode !== "quickAddSelect" ||
    selectedQuickAddIndices.size === 0 ||
    isActionDisabled;
  const isQuickAddImageButtonDisabled = isEditMode || isActionDisabled;

  const combinedOverlayStyle = StyleSheet.flatten([
    styles.overlayStyle,
    { backgroundColor: theme.colors.background },
  ]);

  useEffect(() => {
    // Removed console logs for brevity
  }, [
    isVisible, modalMode, quickAddItems, selectedQuickAddIndices,
    isActionDisabled, isQuickAddConfirmDisabled, editingQuickAddItemIndex,
    isEditMode, selectedFood, grams, unitMode, search, isAddButtonDisabled,
  ]);

  const handleQuickAddGramsChange = (text: string) => {
    const cleanedText = text.replace(/[^0-9.]/g, "").replace(/(\..*)\./g, "$1");
    setEditedGrams(cleanedText);
  };

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

            {/* Conditional Header Actions */}
            {modalMode === "normal" && (
              <>
                {!isEditMode && (
                  <TouchableOpacity
                    onPress={handleQuickAddImage}
                    disabled={isQuickAddImageButtonDisabled}
                    style={styles.headerIcon}
                  >
                    {quickAddLoading ? ( // Use quickAddLoading for image analysis
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
                />
              </>
            )}
            {modalMode === "quickAddSelect" && !isEditMode && (
              editingQuickAddItemIndex === null && (
                <Button
                  title={`Add ${selectedQuickAddIndices.size}`}
                  onPress={handleConfirmQuickAdd}
                  disabled={isQuickAddConfirmDisabled}
                  buttonStyle={[
                    styles.addButton,
                    { backgroundColor: theme.colors.success },
                  ]}
                  titleStyle={styles.buttonTitle}
                />
              )
            )}
          </View>

          {/* Unified Loading Indicator */}
          {(isAiLoading || quickAddLoading) && (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color={theme.colors.primary} />
              <Text style={styles.loadingText}>
                {quickAddLoading ? "Analyzing Image..." : "Estimating Grams..."}
              </Text>
            </View>
          )}

          {/* --- Conditional Content (Normal Mode) --- */}
          {!isActionDisabled && modalMode === "normal" && (
            <>
              {/* Search Bar */}
              <SearchBar
                placeholder="Search Foods..."
                onChangeText={updateSearch}
                value={search}
                platform={Platform.OS === "ios" ? "ios" : "android"}
                containerStyle={styles.searchBarContainer}
                inputContainerStyle={styles.searchBarInputContainer}
                inputStyle={styles.searchInputStyle}
                onCancel={() => updateSearch("")}
              />

              {/* Recent Foods */}
              {!search && recentFoods.length > 0 && (
                <View style={styles.recentFoodsSection}>
                  <Text style={styles.sectionTitle}>Recent</Text>
                  <FlatList
                    data={recentFoods}
                    keyExtractor={(item) => `recent-${item.id}`}
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    contentContainerStyle={styles.recentFoodsContainer}
                    renderItem={({ item }) => (
                      <TouchableOpacity
                        style={[
                          styles.recentFoodItem,
                          screenWidth < 350 && styles.smallRecentFoodItem,
                          selectedFood?.id === item.id &&
                            styles.selectedRecentFoodItem,
                        ]}
                        onPress={() => handleInternalSelectFood(item)}
                      >
                        {/* Icon Logic (remains using local cache state) */}
                         {foodIcons[item.name] !== undefined ? (
                              foodIcons[item.name] ? (
                              <Image
                                  source={{ uri: foodIcons[item.name] as string }}
                                  style={styles.foodIconSmall}
                                  onError={() =>
                                  setFoodIcons((prev) => ({
                                      ...prev,
                                      [item.name]: null, // Mark as failed if Image component fails
                                  }))
                                  }
                              />
                              ) : (
                              // Icon fetch failed or returned null
                              <View
                                  style={[
                                  styles.foodIconSmall,
                                  styles.iconPlaceholderSmall,
                                  ]}
                              >
                                  <Icon
                                  name="fastfood" type="material" size={12}
                                  color={theme.colors.grey2}
                                  />
                              </View>
                              )
                          ) : (
                              // Icon fetch is in progress
                              <ActivityIndicator
                              size="small" color={theme.colors.grey3}
                              style={styles.foodIconSmall}
                              />
                          )}
                        <Text
                          style={[
                            styles.recentFoodText,
                            screenWidth < 350 && styles.smallRecentFoodText,
                          ]}
                          numberOfLines={1}
                          ellipsizeMode="tail"
                        >
                          {item.name}
                        </Text>
                      </TouchableOpacity>
                    )}
                  />
                </View>
              )}

              {/* Food Search Results List */}
              {search && (
                <FlatList
                  data={filteredFoods}
                  keyExtractor={(item) => `search-${item.id}`}
                  renderItem={({ item }) => (
                    <TouchableOpacity
                      onPress={() => handleInternalSelectFood(item)}
                    >
                      <ListItem
                        bottomDivider
                        containerStyle={[
                          styles.listItemContainer,
                          selectedFood?.id === item.id &&
                            styles.selectedListItem,
                        ]}
                      >
                         {/* Icon Logic (remains using local cache state) */}
                         {foodIcons[item.name] !== undefined ? (
                              foodIcons[item.name] ? (
                              <Image
                                  source={{ uri: foodIcons[item.name] as string }}
                                  style={styles.foodIcon} // Use regular size icon style
                                  onError={() =>
                                  setFoodIcons((prev) => ({
                                      ...prev,
                                      [item.name]: null,
                                  }))
                                  }
                              />
                              ) : (
                              <View style={styles.defaultIconContainer}>
                                  <Icon
                                  name="restaurant" type="material" size={18}
                                  color={theme.colors.grey3}
                                  />
                              </View>
                              )
                          ) : (
                              <ActivityIndicator
                              size="small" color={theme.colors.grey3}
                              style={styles.foodIcon} // Use regular size icon style
                              />
                          )}
                        <ListItem.Content>
                          <ListItem.Title style={styles.listItemTitle}>
                            {item.name}
                          </ListItem.Title>
                        </ListItem.Content>
                        {selectedFood?.id === item.id && (
                          <Icon
                            name="checkmark-circle"
                            type="ionicon"
                            color={theme.colors.primary}
                            size={24}
                          />
                        )}
                      </ListItem>
                    </TouchableOpacity>
                  )}
                  style={styles.foodList}
                  ListEmptyComponent={
                    <Text style={styles.noFoodsText}>
                      No foods found matching "{search}".
                    </Text>
                  }
                  initialNumToRender={10}
                  maxToRenderPerBatch={10}
                  windowSize={5}
                  keyboardShouldPersistTaps="handled"
                />
              )}

              {/* Amount Input Section */}
              {selectedFood && (
                <View style={styles.amountSection}>
                  <View style={styles.unitSelectorContainer}>
                    <Text style={styles.inputLabel}>Amount</Text>
                    <ButtonGroup
                      buttons={["Grams", "Auto (AI)"]}
                      selectedIndex={unitMode === "grams" ? 0 : 1}
                      onPress={(index) =>
                        setUnitMode(index === 0 ? "grams" : "auto")
                      }
                      containerStyle={styles.buttonGroupContainer}
                      selectedButtonStyle={{
                        backgroundColor: theme.colors.primary,
                      }}
                      textStyle={styles.buttonGroupText}
                      selectedTextStyle={{ color: theme.colors.white }}
                      disabled={isEditMode && [1]}
                      disabledStyle={{ backgroundColor: theme.colors.grey5 }}
                      disabledTextStyle={{ color: theme.colors.grey3 }}
                    />
                  </View>

                  {unitMode === "grams" && (
                    <>
                      {!isEditMode && servingSizeSuggestions.length > 0 && (
                        <View style={styles.servingSizeRow}>
                          <Text style={styles.servingSizeLabel}>
                            Quick Add:
                          </Text>
                          <ScrollView
                            horizontal
                            showsHorizontalScrollIndicator={false}
                            contentContainerStyle={styles.servingSizeContainer}
                          >
                            {servingSizeSuggestions.map((suggestion) => (
                              <TouchableOpacity
                                key={suggestion.label}
                                style={styles.servingSizeButton}
                                onPress={() => setGrams(suggestion.value)}
                              >
                                <Text style={styles.servingSizeButtonTitle}>
                                  {suggestion.label}
                                </Text>
                              </TouchableOpacity>
                            ))}
                          </ScrollView>
                        </View>
                      )}
                      <Input
                        placeholder={isEditMode ? "Update grams" : "Enter exact grams (e.g., 150)"}
                        keyboardType="numeric"
                        value={grams}
                        onChangeText={(text) => {
                          const cleanedText = text
                            .replace(/[^0-9.]/g, "")
                            .replace(/(\..*)\./g, "$1");
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
                        rightIcon={<Text style={styles.unitText}> g</Text>}
                        containerStyle={{ paddingHorizontal: 0 }}
                        key={`grams-input-${selectedFood?.id}`}
                        autoFocus={!search && !isEditMode}
                      />
                    </>
                  )}

                  {/* AI Grams Estimation Input */}
                  {unitMode === "auto" && !isEditMode && (
                    <View style={styles.autoInputRow}>
                      <Input
                        placeholder="Describe quantity (e.g., 1 cup cooked)"
                        value={autoInput}
                        onChangeText={setAutoInput}
                        inputStyle={[
                          styles.gramInputStyle,
                          styles.autoInputField,
                        ]}
                        inputContainerStyle={styles.gramInputContainerStyle}
                        containerStyle={styles.autoInputContainer}
                        multiline={false}
                        onSubmitEditing={handleEstimateGrams}
                        key={`auto-input-${selectedFood?.id}`}
                        autoFocus={true}
                      />
                      <Button
                        onPress={handleEstimateGrams}
                        disabled={isAiButtonDisabled} // Use specific disable state
                        loading={isAiLoading} // Use specific loading state
                        buttonStyle={styles.aiButton}
                        icon={
                          isAiLoading ? ( // Use specific loading state
                            <ActivityIndicator
                              size="small"
                              color={theme.colors.white}
                            />
                          ) : (
                            <Icon
                              name="calculator-variant"
                              type="material-community"
                              size={20}
                              color={theme.colors.white}
                            />
                          )
                        }
                      />
                    </View>
                  )}
                </View>
              )}
            </>
          )}

          {/* --- Conditional Content (Quick Add Selection Mode) --- */}
          {!isEditMode && modalMode === "quickAddSelect" && (
            <>
              <View style={styles.quickAddHeader}>
                <Text style={styles.sectionTitle}>
                  {editingQuickAddItemIndex !== null
                    ? "Editing Item Details"
                    : "Select Items from Image"}
                </Text>
                {editingQuickAddItemIndex === null && (
                  <Button
                    type="clear"
                    title="Back"
                    onPress={() => {
                      setModalMode("normal");
                      setQuickAddItems([]);
                      setSelectedQuickAddIndices(new Set());
                      setEditingQuickAddItemIndex(null);
                    }}
                    titleStyle={{
                      color: theme.colors.primary,
                      fontSize: 14,
                    }}
                    icon={
                      <Icon
                        name="arrow-back"
                        type="ionicon"
                        size={18}
                        color={theme.colors.primary}
                      />
                    }
                    disabled={quickAddLoading}
                  />
                )}
              </View>
              <FlatList
                data={quickAddItems}
                keyExtractor={(item, index) =>
                  `quickadd-${index}-${item.foodName}-${item.estimatedWeightGrams}`
                }
                renderItem={({ item, index }) => {
                  const isSelected = selectedQuickAddIndices.has(index);
                  const isEditingThisItem =
                    editingQuickAddItemIndex === index;
                  const isAnyItemEditing = editingQuickAddItemIndex !== null;
                  const estimatedCalories = Math.round(
                    (item.calories_per_100g / 100) * item.estimatedWeightGrams
                  );

                  return (
                    <Pressable
                      onPress={() =>
                        !isEditingThisItem && handleToggleQuickAddItem(index)
                      }
                      disabled={isAnyItemEditing && !isEditingThisItem}
                    >
                      <ListItem
                        bottomDivider
                        containerStyle={[
                          styles.quickAddItemContainer,
                          isEditingThisItem && styles.quickAddItemEditing,
                          isSelected && styles.quickAddItemSelected,
                          isAnyItemEditing &&
                            !isEditingThisItem && { opacity: 0.6 },
                        ]}
                      >
                        {isEditingThisItem ? (
                          <View style={styles.quickAddEditView}>
                            <Input
                              value={editedFoodName}
                              onChangeText={setEditedFoodName}
                              placeholder="Food Name"
                              inputContainerStyle={
                                styles.quickEditInputContainer
                              }
                              inputStyle={styles.quickEditInput}
                              containerStyle={styles.quickEditNameContainer}
                              autoFocus
                            />
                            <View style={styles.quickEditGramsRow}>
                              <Input
                                value={editedGrams}
                                onChangeText={handleQuickAddGramsChange}
                                placeholder="Grams"
                                keyboardType="numeric"
                                inputContainerStyle={
                                  styles.quickEditInputContainer
                                }
                                inputStyle={styles.quickEditInput}
                                containerStyle={
                                  styles.quickEditGramsContainer
                                }
                                rightIcon={
                                  <Text style={styles.quickEditUnitText}>
                                    g
                                  </Text>
                                }
                              />
                              <TouchableOpacity
                                onPress={handleSaveQuickAddItemEdit}
                                style={styles.quickEditButton}
                              >
                                <Icon
                                  name="checkmark"
                                  type="ionicon"
                                  color={theme.colors.success}
                                  size={26}
                                />
                              </TouchableOpacity>
                              <TouchableOpacity
                                onPress={handleCancelQuickAddItemEdit}
                                style={styles.quickEditButton}
                              >
                                <Icon
                                  name="close-circle-outline"
                                  type="ionicon"
                                  color={theme.colors.error}
                                  size={26}
                                />
                              </TouchableOpacity>
                            </View>
                          </View>
                        ) : (
                          <>
                            <CheckBox
                              checked={isSelected}
                              onPress={() => handleToggleQuickAddItem(index)}
                              containerStyle={styles.quickAddCheckbox}
                              checkedColor={theme.colors.primary}
                              disabled={isAnyItemEditing}
                            />
                            <ListItem.Content>
                              <ListItem.Title style={styles.quickAddItemTitle}>
                                {item.foodName}
                              </ListItem.Title>
                              <ListItem.Subtitle
                                style={styles.quickAddItemSubtitle}
                              >
                                {`Est: ${Math.round(
                                  item.estimatedWeightGrams
                                )}g • ~${estimatedCalories} kcal`}
                              </ListItem.Subtitle>
                            </ListItem.Content>
                            {!isAnyItemEditing && (
                              <TouchableOpacity
                                onPress={() => handleEditQuickAddItem(index)}
                                style={styles.quickEditIconButton}
                              >
                                <Icon
                                  name="pencil"
                                  type="material-community"
                                  size={20}
                                  color={theme.colors.grey1}
                                />
                              </TouchableOpacity>
                            )}
                          </>
                        )}
                      </ListItem>
                    </Pressable>
                  );
                }}
                ListEmptyComponent={
                  <View style={styles.emptyListContainer}>
                    <Text style={styles.emptyListText}>
                      {quickAddLoading ? "Analyzing..." : "No identifiable foods found."}
                    </Text>
                  </View>
                }
                style={styles.quickAddList}
                extraData={{ selectedQuickAddIndices, editingQuickAddItemIndex }}
                keyboardShouldPersistTaps="handled"
              />
            </>
          )}

          <View style={{ height: 20 }} />
        </View>
      </KeyboardAvoidingView>
      <Toast />
    </Overlay>
  );
};

// --- Styles (Keep existing styles, ensure they are up-to-date) ---
const useStyles = makeStyles((theme) => ({
  overlayContainer: {
    backgroundColor: "transparent", width: "90%", maxWidth: 500, padding: 0,
    borderRadius: 15, shadowColor: "#000", shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.2, shadowRadius: 5, elevation: 6, overflow: "hidden",
  },
  overlayStyle: {
    width: "100%", borderRadius: 15, padding: 15, paddingBottom: 0,
    maxHeight: Dimensions.get("window").height * 0.85,
  },
  keyboardAvoidingView: { width: "100%" },
  header: {
    flexDirection: "row", justifyContent: "space-between", alignItems: "center",
    marginBottom: 15, paddingHorizontal: 5,
  },
  closeIconTouchable: { padding: 5, zIndex: 1 },
  overlayTitle: {
    color: theme.colors.text, fontWeight: "bold", fontSize: 20, textAlign: "center",
    flex: 1, marginHorizontal: 5,
  },
  editModeTitle: { color: theme.colors.warning },
  headerIcon: { padding: 5, marginHorizontal: 5, zIndex: 1 },
  addButton: {
    borderRadius: 20, paddingHorizontal: 15, paddingVertical: 8, minWidth: 70,
    marginLeft: 5, backgroundColor: theme.colors.primary, zIndex: 1,
  },
  updateButton: { backgroundColor: theme.colors.warning },
  buttonTitle: { color: theme.colors.white, fontWeight: "600", fontSize: 15 },
  searchBarContainer: {
    backgroundColor: "transparent", borderBottomColor: "transparent", borderTopColor: "transparent",
    paddingHorizontal: 0, marginBottom: 10,
  },
  searchBarInputContainer: {
    borderRadius: 25, backgroundColor: theme.colors.searchBg || theme.colors.grey5, height: 40,
  },
  searchInputStyle: { color: theme.colors.text, fontSize: 15 },
  recentFoodsSection: { marginBottom: 15 },
  sectionTitle: {
    fontWeight: "600", marginBottom: 8, color: theme.colors.text, fontSize: 14,
    marginLeft: 5, textTransform: "uppercase",
  },
  recentFoodsContainer: { paddingHorizontal: 5, paddingVertical: 2 },
  recentFoodItem: {
    paddingHorizontal: 10, paddingVertical: 6, borderRadius: 16,
    backgroundColor: theme.colors.grey5, marginRight: 8, flexDirection: "row",
    alignItems: "center", borderWidth: 1.5, borderColor: "transparent",
  },
  selectedRecentFoodItem: { borderColor: theme.colors.primary },
  smallRecentFoodItem: { paddingHorizontal: 8, paddingVertical: 5 },
  foodIconSmall: {
    width: 20, height: 20, marginRight: 6, borderRadius: 10, resizeMode: "contain",
    alignItems: "center", justifyContent: "center", backgroundColor: theme.colors.grey4,
  },
  iconPlaceholderSmall: {
    backgroundColor: theme.colors.grey4, alignItems: "center", justifyContent: "center",
  },
  recentFoodText: { color: theme.colors.text, fontSize: 13, maxWidth: 80 },
  smallRecentFoodText: { fontSize: 12, maxWidth: 70 },
  foodList: {
    maxHeight: Dimensions.get("window").height * 0.3, minHeight: 60, flexGrow: 0, marginBottom: 15,
  },
  listItemContainer: {
    backgroundColor: "transparent", paddingVertical: 8, paddingHorizontal: 5,
    borderBottomColor: theme.colors.divider,
  },
  selectedListItem: { backgroundColor: theme.colors.grey5, borderRadius: 8 },
  defaultIconContainer: { // Style for placeholder when icon fetch fails
      width: 35, height: 35, marginRight: 12, borderRadius: 17.5,
      backgroundColor: theme.colors.grey5, alignItems: "center", justifyContent: "center",
  },
  foodIcon: { // Style for successfully loaded icons in the list
      width: 35, height: 35, marginRight: 12, borderRadius: 17.5, resizeMode: "contain",
      backgroundColor: theme.colors.grey5, // Background for loading/activity indicator
      alignItems: "center", justifyContent: "center",
  },
  listItemTitle: { color: theme.colors.text, fontSize: 16, fontWeight: "500" },
  noFoodsText: {
    color: theme.colors.grey2, fontStyle: "italic", textAlign: "center",
    marginTop: 20, marginBottom: 10, paddingHorizontal: 10,
  },
  amountSection: {
    marginTop: 10, borderTopWidth: 1, borderTopColor: theme.colors.divider, paddingTop: 15,
  },
  unitSelectorContainer: {
    flexDirection: "row", alignItems: "center", justifyContent: "space-between",
    marginBottom: 15, paddingHorizontal: 5,
  },
  inputLabel: {
    fontWeight: "600", color: theme.colors.grey1, fontSize: 14, marginRight: 10,
    textTransform: "uppercase",
  },
  buttonGroupContainer: {
    flex: 0.7, maxWidth: 220, height: 35, borderRadius: 8,
    backgroundColor: theme.colors.background,
  },
  buttonGroupText: { fontSize: 14, color: theme.colors.text },
  servingSizeRow: {
    flexDirection: "row", alignItems: "center", marginBottom: 12, paddingHorizontal: 5,
  },
  servingSizeLabel: { color: theme.colors.grey2, fontSize: 13, marginRight: 8 },
  servingSizeContainer: { flexGrow: 0 },
  servingSizeButton: {
    backgroundColor: theme.colors.grey4, borderRadius: 15, marginRight: 8,
    paddingHorizontal: 12, paddingVertical: 5, justifyContent: "center",
    alignItems: "center", height: 30,
  },
  servingSizeButtonTitle: { color: theme.colors.text, fontSize: 13 },
  gramInputStyle: { color: theme.colors.text, fontSize: 16, paddingVertical: 8, height: 40, },
  gramInputContainerStyle: { borderBottomColor: theme.colors.grey3, paddingHorizontal: 5, },
  unitText: { color: theme.colors.grey2, fontSize: 15, fontWeight: "500", paddingRight: 5, },
  autoInputRow: { flexDirection: "row", alignItems: "center" },
  autoInputContainer: { flex: 1, paddingHorizontal: 0, marginRight: 10 },
  autoInputField: { height: 40 },
  aiButton: {
    backgroundColor: theme.colors.secondary, borderRadius: 20, width: 40, height: 40,
    padding: 0, justifyContent: "center", alignItems: "center",
  },
  loadingContainer: { // Unified loading overlay
    position: "absolute", top: 0, left: 0, right: 0, bottom: 0,
    backgroundColor: "rgba(0, 0, 0, 0.1)", alignItems: "center", justifyContent: "center",
    zIndex: 10, borderRadius: 15,
  },
  loadingText: { marginTop: 10, color: theme.colors.text, fontSize: 16, fontWeight: "500", },
  quickAddHeader: {
    flexDirection: "row", justifyContent: "space-between", alignItems: "center",
    marginBottom: 10, paddingHorizontal: 5, borderBottomWidth: 1,
    borderBottomColor: theme.colors.divider, paddingBottom: 8,
  },
  quickAddList: { maxHeight: Dimensions.get("window").height * 0.5, flexGrow: 0, marginBottom: 10, },
  quickAddItemContainer: {
    paddingVertical: 6, paddingHorizontal: 5, backgroundColor: theme.colors.background,
    borderBottomColor: theme.colors.divider, flexDirection: "row", alignItems: "center",
  },
  quickAddItemSelected: { backgroundColor: theme.colors.successLight || '#d4edda' },
  quickAddItemEditing: { backgroundColor: theme.colors.grey5, paddingVertical: 8, },
  quickAddCheckbox: { padding: 0, margin: 0, marginRight: 10, backgroundColor: "transparent", borderWidth: 0, },
  quickAddItemTitle: { fontWeight: "bold", color: theme.colors.text, fontSize: 16, },
  quickAddItemSubtitle: { color: theme.colors.grey1, fontSize: 13, marginTop: 2, },
  quickEditIconButton: { padding: 8, marginLeft: 8, },
  quickAddEditView: { flex: 1, paddingLeft: 10, },
  quickEditInputContainer: { borderBottomWidth: 1, borderBottomColor: theme.colors.primary, height: 35, paddingHorizontal: 0, },
  quickEditInput: { fontSize: 15, color: theme.colors.text, paddingVertical: 0, },
  quickEditNameContainer: { paddingHorizontal: 0, marginBottom: 5, },
  quickEditGramsRow: { flexDirection: "row", alignItems: "center", },
  quickEditGramsContainer: { flex: 1, paddingHorizontal: 0, },
  quickEditUnitText: { color: theme.colors.grey2, fontSize: 14, fontWeight: "500", },
  quickEditButton: { paddingLeft: 10, paddingVertical: 5, },
  emptyListContainer: { alignItems: "center", paddingVertical: 30, paddingHorizontal: 15, },
  emptyListText: { color: theme.colors.grey2, fontSize: 16, textAlign: "center", },
  emptyListSubText: { fontSize: 14, color: theme.colors.grey3, textAlign: "center", marginTop: 5, },
}));


export default AddEntryModal;
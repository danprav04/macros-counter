
// src/components/AddEntryModal.tsx
// ---------- AddEntryModal.tsx (Fix AI Mode Reset & Refine Effects) ----------
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
  Keyboard, // Import Keyboard
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
import { getFoodIconUrl } from "../utils/iconUtils";
import { getGramsFromNaturalLanguage } from "../utils/units";
import Toast from "react-native-toast-message";
import * as ImagePicker from "expo-image-picker";
import { EstimatedFoodItem, getMultipleFoodsFromImage } from "../utils/macros";
import { v4 as uuidv4 } from "uuid";
import { BackendError } from "../services/backendService";

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
  initialGrams?: string; // This is the grams value passed IN for editing
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
    [foodName: string]: string | null | undefined; // Allow undefined for loading state
  }>({});

  const [unitMode, setUnitMode] = useState<UnitMode>("grams"); // State for grams/auto toggle
  const [autoInput, setAutoInput] = useState(""); // State for the "auto" description input
  const [isAiLoading, setIsAiLoading] = useState(false); // For natural language grams AI call

  // --- Quick Add State ---
  const [modalMode, setModalMode] = useState<ModalMode>("normal"); // State for normal vs quick add view
  const [quickAddLoading, setQuickAddLoading] = useState(false); // For image analysis AI call
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
  const isModalOpening = useRef(false); // Track initial opening transition

  const filteredFoods = useMemo(() => {
    if (!search) return [];
    return foods.filter((food) =>
      food.name.toLowerCase().includes(search.toLowerCase())
    );
  }, [foods, search]);

  // Effect 1: Reset state when modal closes or switches away from Quick Add
  useEffect(() => {
    if (!isVisible || (isVisible && modalMode !== 'normal' && !quickAddLoading)) {
        // Reset general states only when closing OR switching out of normal mode
        if (!isVisible) {
            handleSelectFood(null); // Clear selected food when modal actually closes
            updateSearch("");       // Clear search when modal closes
            setModalMode("normal"); // Reset to normal mode for next open
            setQuickAddItems([]);   // Clear quick add items
            setSelectedQuickAddIndices(new Set());
            setEditingQuickAddItemIndex(null);
        }
        // Reset states relevant to the input area when closing or switching mode
        setGrams("");
        setUnitMode("grams"); // Default to grams
        setAutoInput("");
        setIsAiLoading(false); // Ensure AI loading stops
        // Don't reset quickAddLoading here, it's handled in its own flow
    }
  }, [isVisible, modalMode, handleSelectFood, updateSearch, setGrams, quickAddLoading]); // Added quickAddLoading dependency


  // Effect 2: Handle initial setup when modal becomes visible in 'normal' mode
  useEffect(() => {
    if (isVisible && modalMode === 'normal') {
      isModalOpening.current = true; // Mark as opening

      // Determine initial state based on edit mode
      if (isEditMode && selectedFood && initialGrams !== undefined) {
        // Edit Mode: Use initialGrams, force 'grams' mode
        setGrams(initialGrams);
        setUnitMode('grams');
        setAutoInput(''); // Ensure auto input is clear
      } else {
        // Add Mode (or Edit mode without initialGrams): Default to empty grams, 'grams' mode
        setGrams('');
        setUnitMode('grams');
        setAutoInput('');
      }

      // Load recent foods when entering normal mode
      const loadRecents = async () => {
        const loadedRecentFoods = await loadRecentFoods();
        setRecentFoods(loadedRecentFoods);
      };
      loadRecents();

      // Short delay to prevent focus race conditions on modal open
      const timer = setTimeout(() => {
        isModalOpening.current = false;
      }, 100);

      return () => clearTimeout(timer);

    }
  }, [isVisible, modalMode, isEditMode, selectedFood, initialGrams, setGrams]); // Dependencies for initial setup


   // Effect 3: Reset grams/mode ONLY if selectedFood changes *while* modal is open in Add mode
   useEffect(() => {
     // Don't run this during the initial modal opening transition or if in edit mode
     if (isVisible && modalMode === 'normal' && !isEditMode && !isModalOpening.current) {
        // When a new food is selected for *adding*, reset grams and ensure 'grams' mode
        setGrams("");
        setUnitMode("grams");
        setAutoInput("");
     }
   }, [selectedFood, isVisible, modalMode, isEditMode]); // Run when selectedFood changes

  // Load icons for visible foods (search results or recent)
  useEffect(() => {
    if (!isVisible || modalMode !== 'normal') return;

    const loadIcons = async () => {
      const relevantFoods = search ? filteredFoods : recentFoods;
      const uniqueFoodsMap = new Map(relevantFoods.map(food => [food.id ?? food.name, food]));
      let iconsUpdated = false;

      for (const food of uniqueFoodsMap.values()) {
        const foodName = food.name;
        if (foodIcons[foodName] === undefined) { // Only fetch if status is unknown
          iconsUpdated = true; // Mark that an update attempt is happening
          // Intentionally not awaiting here - let fetches run concurrently
          getFoodIconUrl(foodName)
            .then(iconUrl => {
              setFoodIcons(prevIcons => ({ ...prevIcons, [foodName]: iconUrl }));
            })
            .catch(error => {
              console.warn(`Icon fetch failed for ${foodName}:`, error);
              setFoodIcons(prevIcons => ({ ...prevIcons, [foodName]: null })); // Mark as failed
            });
        }
      }
      // No final setFoodIcons call needed here, updates happen in .then/.catch
    };

    // Debounce or delay icon loading slightly if needed, otherwise load directly
    loadIcons();

  }, [isVisible, modalMode, search, filteredFoods, recentFoods]); // foodIcons removed from deps to avoid loops

  // --- Utility Functions ---
  const addToRecentFoods = useCallback(async (food: Food) => {
    if (!food || !food.id) return;
    // Check if it's already the most recent item
    if (recentFoods.length > 0 && recentFoods[0].id === food.id) return;

    setRecentFoods((prevRecent) => {
      const updated = prevRecent.filter((rf) => rf.id !== food.id);
      updated.unshift(food);
      const trimmed = updated.slice(0, MAX_RECENT_FOODS);
      saveRecentFoods(trimmed).catch(err => console.error("Failed to save recent foods:", err)); // Save async
      return trimmed;
    });
  }, [recentFoods]);

  const servingSizeSuggestions = useMemo(() => {
    if (!selectedFood) return [];
    // Basic suggestions, could be dynamic based on food type later
    return [
      { label: "50g", value: "50" },
      { label: "100g", value: "100" },
      { label: "150g", value: "150" },
      { label: "200g", value: "200" },
    ];
  }, [selectedFood]);

  // --- Action Handlers ---

  // Estimate grams using AI (backend)
  const handleEstimateGrams = useCallback(async () => {
    Keyboard.dismiss(); // Dismiss keyboard first
    if (!selectedFood || !autoInput.trim()) {
      Alert.alert(
        "Input Missing",
        "Please select a food and enter a quantity description (e.g., '1 cup', '2 medium')."
      );
      return;
    }
    if (isAiLoading) return; // Prevent multiple calls

    setIsAiLoading(true);
    try {
      console.log("here", selectedFood.name, autoInput);
      
      const estimatedGrams = await getGramsFromNaturalLanguage(
        selectedFood.name,
        autoInput
      );
      const roundedGrams = String(Math.round(estimatedGrams));
      setGrams(roundedGrams);
      setUnitMode("grams"); // Switch back to grams mode after estimation
      setAutoInput("");     // Clear the auto input field
      Toast.show({
        type: "success",
        text1: "Grams Estimated",
        text2: `Estimated ${roundedGrams}g for ${selectedFood.name}`,
        position: "bottom",
        visibilityTime: 3000,
      });
    } catch (error: any) {
      // Error Alert is handled within getGramsFromNaturalLanguage utility
      console.error("AI Gram Estimation Error (Modal Level):", error);
    } finally {
      setIsAiLoading(false);
    }
  }, [selectedFood, autoInput, isAiLoading, setGrams]); // Added dependencies


  // Handle Add/Update button press for single entry
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
    if (isAiLoading || quickAddLoading) return; // Prevent action if AI is running

    // Call parent function (DailyEntryScreen) to handle state update and saving
    handleAddEntry();

    // Add to recents (no need to await this for UI feedback)
    addToRecentFoods(selectedFood);

    // Let parent handle closing the modal after state update is confirmed
    // toggleOverlay(); // Removed - Parent handles close

  }, [selectedFood, grams, isAiLoading, quickAddLoading, handleAddEntry, addToRecentFoods]);


  // Handle selecting a food from search/recent list
  const handleInternalSelectFood = useCallback((item: Food | null) => {
    // Prevent re-selecting the same food unnecessarily
    if (selectedFood?.id === item?.id) return;

    handleSelectFood(item); // Call parent's handler

    // State resets (like clearing grams) are now handled by Effect 3
    // based on whether it's edit mode or not.

  }, [handleSelectFood, selectedFood?.id]);

  // --- Quick Add Functions ---

  const handleQuickAddImage = async () => {
    Keyboard.dismiss();
    if (isEditMode) {
        console.warn("Quick Add disabled in Edit Mode.");
        return;
    }
    if (editingQuickAddItemIndex !== null) {
      Alert.alert(
        "Finish Editing",
        "Please save or cancel the current edit before adding a new image."
      );
      return;
    }
    // Offer Camera or Gallery
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

  const pickImageAndAnalyze = useCallback(async (source: "camera" | "gallery") => {
    if (isEditMode) return; // Double check

    let permissionResult;
    let pickerResult: ImagePicker.ImagePickerResult;

    // Set up for quick add mode
    setQuickAddLoading(true);
    setQuickAddItems([]);
    setSelectedQuickAddIndices(new Set());
    setEditingQuickAddItemIndex(null);
    setModalMode("quickAddSelect"); // Switch view immediately
    handleSelectFood(null); // Clear any selected food from normal mode
    updateSearch(""); // Clear search

    try {
      // Request permissions and launch picker
      if (source === "camera") {
        permissionResult = await ImagePicker.requestCameraPermissionsAsync();
        if (!permissionResult.granted) {
          Alert.alert("Permission Required", "Camera access needed.");
          setModalMode("normal"); // Revert to normal mode on permission denial
          setQuickAddLoading(false);
          return;
        }
        pickerResult = await ImagePicker.launchCameraAsync({ quality: 0.6 });
      } else {
        permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (!permissionResult.granted) {
          Alert.alert("Permission Required", "Gallery access needed.");
          setModalMode("normal"); // Revert on permission denial
          setQuickAddLoading(false);
          return;
        }
        pickerResult = await ImagePicker.launchImageLibraryAsync({
          mediaTypes: ImagePicker.MediaTypeOptions.Images,
          quality: 0.6,
        });
      }

      // Handle cancellation
      if (pickerResult.canceled) {
        console.log("Image selection/capture cancelled for Quick Add.");
        setModalMode("normal"); // Revert if user cancels picker
        setQuickAddLoading(false);
        return;
      }

      // Process the selected image asset
      if (pickerResult.assets && pickerResult.assets.length > 0) {
        const asset = pickerResult.assets[0];
        // Call backend via utility function
        const results = await getMultipleFoodsFromImage(asset);

        if (results.length === 0) {
          Alert.alert(
            "No Foods Found",
            "The AI couldn't identify food items. Try again or add manually."
          );
           setModalMode("normal"); // Revert if no results
        } else {
          // Populate state with results and select all by default
          setQuickAddItems(results);
          setSelectedQuickAddIndices(new Set(results.map((_, i) => i)));
          // Keep modalMode as 'quickAddSelect'
        }
      } else {
        console.log("No assets selected or returned for Quick Add.");
        Alert.alert("Error", "Could not select image.");
        setModalMode("normal"); // Revert on picker error
      }
    } catch (error: any) {
       // Alert handling is done within getMultipleFoodsFromImage utility
       console.error("Error during Quick Add image process (Modal Level):", error);
       setModalMode("normal"); // Revert to normal mode on any analysis error
       setQuickAddItems([]);
       setSelectedQuickAddIndices(new Set());
    } finally {
      // Ensure loading indicator stops, possibly after a short delay for transition
      setTimeout(() => setQuickAddLoading(false), 150);
    }
  }, [isEditMode, handleSelectFood]); // Added dependencies

  const handleToggleQuickAddItem = (index: number) => {
    if (editingQuickAddItemIndex !== null) return; // Disable toggle while editing another item

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
      Alert.alert("Finish Editing", "Please save or cancel the current edit first.");
      return;
    }
    const item = quickAddItems[index];
    setEditingQuickAddItemIndex(index);
    setEditedFoodName(item.foodName);
    setEditedGrams(String(Math.round(item.estimatedWeightGrams)));
    // Deselect the item visually while it's being edited
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
      Alert.alert("Invalid Grams", "Please enter a valid positive number for grams.");
      return;
    }
    const roundedGrams = Math.round(numericGrams);

    // Update the item in the quickAddItems state
    setQuickAddItems((prevItems) =>
      prevItems.map((item, index) => {
        if (index === editingQuickAddItemIndex) {
          // Return updated item, keeping original macro per 100g data
          return {
            ...item,
            foodName: trimmedName,
            estimatedWeightGrams: roundedGrams,
          };
        }
        return item;
      })
    );

     // Re-select the item after saving edit
    const indexToReselect = editingQuickAddItemIndex;
    setSelectedQuickAddIndices((prev) => {
         const newSet = new Set(prev);
         newSet.add(indexToReselect);
         return newSet;
    });


    // Reset editing state
    setEditingQuickAddItemIndex(null);
    setEditedFoodName("");
    setEditedGrams("");

  };

  const handleCancelQuickAddItemEdit = () => {
     // Reset editing state without saving changes
     const indexToReselect = editingQuickAddItemIndex; // Get index before resetting
     setEditingQuickAddItemIndex(null);
     setEditedFoodName("");
     setEditedGrams("");
     // Re-select the item that was being edited
     if (indexToReselect !== null) {
        setSelectedQuickAddIndices((prev) => {
             const newSet = new Set(prev);
             newSet.add(indexToReselect);
             return newSet;
        });
     }
  };

  const handleConfirmQuickAdd = useCallback(() => {
    Keyboard.dismiss();
    if (isEditMode) return; // Should not happen, but check anyway

    if (editingQuickAddItemIndex !== null) {
      Alert.alert("Finish Editing", "Please save or cancel your edit before adding items.");
      return;
    }
    if (selectedQuickAddIndices.size === 0) {
      Alert.alert("No Items Selected", "Please select or edit at least one item to add.");
      return;
    }

    try {
      // Map selected items to the format expected by the parent (DailyEntryScreen)
      const entriesToAdd: { food: Food; grams: number }[] = Array.from(selectedQuickAddIndices).map((index) => {
        const item = quickAddItems[index];
        // Create a temporary Food object consistent with the Food type
        const quickFood: Food = {
          id: uuidv4(), // Generate a unique ID for this entry instance
          name: item.foodName,
          // Ensure macros are rounded and handle potential non-numeric values defensively
          calories: Math.round(Number(item.calories_per_100g) || 0),
          protein: Math.round(Number(item.protein_per_100g) || 0),
          carbs: Math.round(Number(item.carbs_per_100g) || 0),
          fat: Math.round(Number(item.fat_per_100g) || 0),
        };
        // Ensure grams are positive integers
        const entryGrams = Math.max(1, Math.round(Number(item.estimatedWeightGrams) || 1));
        return { food: quickFood, grams: entryGrams };
      });

      console.log("AddEntryModal: Preparing to add multiple entries:", entriesToAdd.length);

      // Call parent function (DailyEntryScreen) to handle adding these entries
      handleAddMultipleEntries(entriesToAdd);

      // Parent handles closing the modal after state update
      // toggleOverlay(); // Removed

    } catch (error) {
      console.error("AddEntryModal: Error in handleConfirmQuickAdd:", error);
      Alert.alert("Error", "A problem occurred while preparing items to add.");
    }
  }, [quickAddItems, selectedQuickAddIndices, editingQuickAddItemIndex, handleAddMultipleEntries, isEditMode]);

  // --- End Quick Add Functions ---

  const handleQuickAddGramsChange = (text: string) => {
    const cleanedText = text.replace(/[^0-9.]/g, "").replace(/(\..*)\./g, "$1");
    setEditedGrams(cleanedText);
  };

  // --- Computed States for Disabling UI Elements ---
  const isActionDisabled = isAiLoading || quickAddLoading || editingQuickAddItemIndex !== null;
  const isAddButtonDisabled =
    modalMode !== "normal" ||
    !selectedFood ||
    !isValidNumberInput(grams) ||
    parseFloat(grams) <= 0 ||
    isActionDisabled;
  const isAiButtonDisabled = // Disable AI estimate button if conditions not met
    modalMode !== "normal" ||
    !selectedFood ||
    !autoInput.trim() ||
    isActionDisabled;
  const isQuickAddConfirmDisabled = // Disable confirm quick add button
    isEditMode ||
    modalMode !== "quickAddSelect" ||
    selectedQuickAddIndices.size === 0 ||
    isActionDisabled;
  const isQuickAddImageButtonDisabled = isEditMode || isActionDisabled; // Disable camera/gallery button

  // --- Render ---
  const combinedOverlayStyle = StyleSheet.flatten([
    styles.overlayStyle,
    { backgroundColor: theme.colors.background },
  ]);

  return (
    <Overlay
      isVisible={isVisible}
      onBackdropPress={!isActionDisabled ? toggleOverlay : undefined} // Prevent closing if action in progress
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
                name="close" type="material" size={28}
                color={ isActionDisabled ? theme.colors.grey3 : theme.colors.text }
              />
            </TouchableOpacity>

            <Text h4 h4Style={[ styles.overlayTitle, isEditMode && modalMode === "normal" && styles.editModeTitle, ]}
              numberOfLines={1} ellipsizeMode="tail" >
              {modalMode === "quickAddSelect"
                ? editingQuickAddItemIndex !== null ? "Edit Item" : "Select Items to Add"
                : isEditMode ? "Edit Entry" : "Add Entry"
              }
            </Text>

            {/* Conditional Header Actions */}
            {modalMode === "normal" && (
              <>
                {!isEditMode && ( // Show Quick Add Camera only if not editing
                  <TouchableOpacity
                    onPress={handleQuickAddImage}
                    disabled={isQuickAddImageButtonDisabled}
                    style={styles.headerIcon}
                  >
                    {quickAddLoading ? (
                      <ActivityIndicator size="small" color={theme.colors.primary} />
                    ) : (
                      <Icon name="camera-burst" type="material-community" size={26}
                        color={ isQuickAddImageButtonDisabled ? theme.colors.grey3 : theme.colors.primary }
                      />
                    )}
                  </TouchableOpacity>
                )}
                {/* Add/Update Button */}
                <Button
                  title={isEditMode ? "Update" : "Add"}
                  onPress={handleAddOrUpdateSingleEntry}
                  disabled={isAddButtonDisabled}
                  buttonStyle={[ styles.addButton, isEditMode && styles.updateButton, ]}
                  titleStyle={styles.buttonTitle}
                  loading={isAiLoading} // Show loading if AI is processing related task (optional)
                />
              </>
            )}
            {/* Confirm Quick Add Button */}
            {modalMode === "quickAddSelect" && !isEditMode && (
              editingQuickAddItemIndex === null && (
                <Button
                  title={`Add ${selectedQuickAddIndices.size}`}
                  onPress={handleConfirmQuickAdd}
                  disabled={isQuickAddConfirmDisabled}
                  buttonStyle={[ styles.addButton, { backgroundColor: theme.colors.success }, ]}
                  titleStyle={styles.buttonTitle}
                />
              )
            )}
          </View>

          {/* Unified Loading Indicator */}
          {(isAiLoading || quickAddLoading) && modalMode === 'normal' && ( // Show only in normal mode if needed
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color={theme.colors.primary} />
              <Text style={styles.loadingText}>
                {quickAddLoading ? "Analyzing Image..." : "Estimating Grams..."}
              </Text>
            </View>
          )}

          {/* --- Content Area --- */}
          <ScrollView keyboardShouldPersistTaps="handled">

            {/* --- NORMAL MODE CONTENT --- */}
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
                  showCancel={Platform.OS === 'ios'}
                  onClear={() => updateSearch("")}
                />

                {/* Recent Foods */}
                {!search && recentFoods.length > 0 && (
                  <View style={styles.recentFoodsSection}>
                    <Text style={styles.sectionTitle}>Recent</Text>
                    <FlatList
                      data={recentFoods}
                      keyExtractor={(item) => `recent-${item.id}`}
                      horizontal showsHorizontalScrollIndicator={false}
                      contentContainerStyle={styles.recentFoodsContainer}
                      renderItem={({ item }) => (
                        <TouchableOpacity
                          style={[ styles.recentFoodItem, screenWidth < 350 && styles.smallRecentFoodItem, selectedFood?.id === item.id && styles.selectedRecentFoodItem, ]}
                          onPress={() => handleInternalSelectFood(item)} >
                          {/* Icon Rendering */}
                           {foodIcons[item.name] !== undefined ? (
                                foodIcons[item.name] ? (
                                <Image source={{ uri: foodIcons[item.name] as string }} style={styles.foodIconSmall}
                                    onError={() => setFoodIcons((prev) => ({ ...prev, [item.name]: null })) } />
                                ) : ( // Icon fetch failed or returned null
                                <View style={[styles.foodIconSmall, styles.iconPlaceholderSmall]}>
                                    <Icon name="fastfood" type="material" size={12} color={theme.colors.grey2} />
                                </View>
                                )
                            ) : ( // Icon fetch is in progress (undefined)
                                <ActivityIndicator size="small" color={theme.colors.grey3} style={styles.foodIconSmall} />
                            )}
                          <Text style={[ styles.recentFoodText, screenWidth < 350 && styles.smallRecentFoodText, ]}
                            numberOfLines={1} ellipsizeMode="tail" >
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
                      <TouchableOpacity onPress={() => handleInternalSelectFood(item)}>
                        <ListItem bottomDivider containerStyle={[ styles.listItemContainer, selectedFood?.id === item.id && styles.selectedListItem, ]} >
                           {/* Icon Rendering */}
                           {foodIcons[item.name] !== undefined ? (
                                foodIcons[item.name] ? (
                                    <Image source={{ uri: foodIcons[item.name] as string }} style={styles.foodIcon}
                                        onError={() => setFoodIcons((prev) => ({ ...prev, [item.name]: null })) } />
                                ) : ( // Failed or null
                                    <View style={styles.defaultIconContainer}>
                                    <Icon name="restaurant" type="material" size={18} color={theme.colors.grey3} />
                                    </View>
                                )
                            ) : ( // Loading
                                <ActivityIndicator size="small" color={theme.colors.grey3} style={styles.foodIcon} />
                            )}
                          <ListItem.Content>
                            <ListItem.Title style={styles.listItemTitle}> {item.name} </ListItem.Title>
                          </ListItem.Content>
                          {selectedFood?.id === item.id && (
                            <Icon name="checkmark-circle" type="ionicon" color={theme.colors.primary} size={24} />
                          )}
                        </ListItem>
                      </TouchableOpacity>
                    )}
                    style={styles.foodList}
                    ListEmptyComponent={ <Text style={styles.noFoodsText}> No foods found matching "{search}". </Text> }
                    initialNumToRender={10} maxToRenderPerBatch={10} windowSize={5}
                    keyboardShouldPersistTaps="handled"
                  />
                )}

                {/* Amount Input Section - Only show if a food is selected */}
                {selectedFood && (
                  <View style={styles.amountSection}>
                    <View style={styles.unitSelectorContainer}>
                      <Text style={styles.inputLabel}>Amount</Text>
                      {/* Unit Mode Toggle (Grams / Auto) */}
                      <ButtonGroup
                        buttons={["Grams", "Auto (AI)"]}
                        selectedIndex={unitMode === "grams" ? 0 : 1}
                        onPress={(index) => setUnitMode(index === 0 ? "grams" : "auto") }
                        containerStyle={styles.buttonGroupContainer}
                        selectedButtonStyle={{ backgroundColor: theme.colors.primary, }}
                        textStyle={styles.buttonGroupText}
                        selectedTextStyle={{ color: theme.colors.white }}
                        disabled={isEditMode ? [1] : []} // Disable "Auto" in edit mode
                        disabledStyle={{ backgroundColor: theme.colors.grey5 }}
                        disabledTextStyle={{ color: theme.colors.grey3 }}
                      />
                    </View>

                    {/* Grams Input */}
                    {unitMode === "grams" && (
                      <>
                        {/* Quick Add Gram Buttons */}
                        {!isEditMode && servingSizeSuggestions.length > 0 && (
                          <View style={styles.servingSizeRow}>
                            <Text style={styles.servingSizeLabel}> Quick Add: </Text>
                            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.servingSizeContainer} >
                              {servingSizeSuggestions.map((suggestion) => (
                                <TouchableOpacity key={suggestion.label} style={styles.servingSizeButton}
                                  onPress={() => setGrams(suggestion.value)} >
                                  <Text style={styles.servingSizeButtonTitle}> {suggestion.label} </Text>
                                </TouchableOpacity>
                              ))}
                            </ScrollView>
                          </View>
                        )}
                        {/* Grams Input Field */}
                        <Input
                          placeholder={isEditMode ? "Update grams" : "Enter grams (e.g., 150)"}
                          keyboardType="numeric" value={grams}
                          onChangeText={(text) => {
                            const cleanedText = text.replace(/[^0-9.]/g, "").replace(/(\..*)\./g, "$1");
                            setGrams(cleanedText);
                          }}
                          inputStyle={styles.gramInputStyle}
                          inputContainerStyle={styles.gramInputContainerStyle}
                          errorMessage={ !isValidNumberInput(grams) && grams !== "" && grams !== "." ? "Enter a valid number" : "" }
                          errorStyle={{ color: theme.colors.error }}
                          rightIcon={<Text style={styles.unitText}> g</Text>}
                          containerStyle={{ paddingHorizontal: 0 }}
                          // AutoFocus only if adding and no search term exists
                          autoFocus={!search && !isEditMode && Platform.OS !== 'web'} // Avoid autofocus issues on web sometimes
                          key={`grams-input-${selectedFood?.id}`} // Re-mount on food change if needed
                        />
                      </>
                    )}

                    {/* AI Grams Estimation Input */}
                    {unitMode === "auto" && !isEditMode && ( // Show only if adding
                      <View style={styles.autoInputRow}>
                        <Input
                          placeholder="Describe quantity (e.g., 1 cup cooked)"
                          value={autoInput} onChangeText={setAutoInput}
                          inputStyle={[styles.gramInputStyle, styles.autoInputField]}
                          inputContainerStyle={styles.gramInputContainerStyle}
                          containerStyle={styles.autoInputContainer}
                          multiline={false}
                          onSubmitEditing={handleEstimateGrams} // Estimate on submit
                          key={`auto-input-${selectedFood?.id}`}
                          autoFocus={Platform.OS !== 'web'} // Autofocus when switching to auto mode
                        />
                        {/* AI Estimate Button */}
                        <Button
                          onPress={handleEstimateGrams}
                          disabled={isAiButtonDisabled}
                          loading={isAiLoading} // Show loading indicator on button
                          buttonStyle={styles.aiButton}
                          icon={ isAiLoading ? undefined // Hide icon when loading text shows
                              : (<Icon name="calculator-variant" type="material-community" size={20} color={theme.colors.white} />)
                          }
                          title={isAiLoading ? 'Estimating...' : ''} // Show text when loading
                          titleStyle={styles.aiButtonLoadingTitle}
                        />
                      </View>
                    )}
                  </View>
                )}
              </>
            )}

            {/* --- QUICK ADD SELECTION MODE CONTENT --- */}
            {!isEditMode && modalMode === "quickAddSelect" && (
               <>
                 {/* Quick Add Header */}
                 <View style={styles.quickAddHeader}>
                   <Text style={styles.sectionTitle}>
                     {editingQuickAddItemIndex !== null ? "Editing Item Details" : "Select Items from Image"}
                   </Text>
                   {/* Back Button */}
                   {editingQuickAddItemIndex === null && ( // Show back only when not editing an item
                     <Button type="clear" title="Back"
                       onPress={() => { // Action to return to normal mode
                         setModalMode("normal");
                         setQuickAddItems([]);
                         setSelectedQuickAddIndices(new Set());
                         setEditingQuickAddItemIndex(null); // Ensure edit state is clear
                       }}
                       titleStyle={{ color: theme.colors.primary, fontSize: 14, }}
                       icon={ <Icon name="arrow-back" type="ionicon" size={18} color={theme.colors.primary} /> }
                       disabled={quickAddLoading} // Disable if analysis is still somehow running
                     />
                   )}
                 </View>

                {/* Loading indicator specifically for quick add list */}
                {quickAddLoading && (
                    <View style={styles.centeredContent}>
                        <ActivityIndicator size="large" color={theme.colors.primary} />
                        <Text style={styles.loadingText}>Analyzing Image...</Text>
                    </View>
                 )}

                 {/* Quick Add Item List */}
                 {!quickAddLoading && (
                    <FlatList
                        data={quickAddItems}
                        keyExtractor={(item, index) => `quickadd-${index}-${item.foodName}`}
                        renderItem={({ item, index }) => {
                        const isSelected = selectedQuickAddIndices.has(index);
                        const isEditingThisItem = editingQuickAddItemIndex === index;
                        const isAnyItemEditing = editingQuickAddItemIndex !== null;
                        const estimatedCalories = Math.round( (item.calories_per_100g / 100) * item.estimatedWeightGrams );

                        return (
                            <Pressable onPress={() => !isEditingThisItem && handleToggleQuickAddItem(index)}
                            disabled={isAnyItemEditing && !isEditingThisItem} >
                            <ListItem bottomDivider containerStyle={[ styles.quickAddItemContainer, isEditingThisItem && styles.quickAddItemEditing, isSelected && styles.quickAddItemSelected, isAnyItemEditing && !isEditingThisItem && { opacity: 0.6 }, ]} >
                                {isEditingThisItem ? (
                                // --- EDIT VIEW for Quick Add Item ---
                                <View style={styles.quickAddEditView}>
                                    <Input value={editedFoodName} onChangeText={setEditedFoodName}
                                    placeholder="Food Name" inputContainerStyle={ styles.quickEditInputContainer }
                                    inputStyle={styles.quickEditInput} containerStyle={styles.quickEditNameContainer}
                                    autoFocus selectTextOnFocus />
                                    <View style={styles.quickEditGramsRow}>
                                    <Input value={editedGrams} onChangeText={handleQuickAddGramsChange}
                                        placeholder="Grams" keyboardType="numeric"
                                        inputContainerStyle={ styles.quickEditInputContainer } inputStyle={styles.quickEditInput}
                                        containerStyle={ styles.quickEditGramsContainer }
                                        rightIcon={ <Text style={styles.quickEditUnitText}> g </Text> } />
                                    {/* Save/Cancel Edit Buttons */}
                                    <TouchableOpacity onPress={handleSaveQuickAddItemEdit} style={styles.quickEditButton}>
                                        <Icon name="checkmark" type="ionicon" color={theme.colors.success} size={26} />
                                    </TouchableOpacity>
                                    <TouchableOpacity onPress={handleCancelQuickAddItemEdit} style={styles.quickEditButton}>
                                        <Icon name="close-circle-outline" type="ionicon" color={theme.colors.error} size={26} />
                                    </TouchableOpacity>
                                    </View>
                                </View>
                                ) : (
                                // --- DISPLAY VIEW for Quick Add Item ---
                                <>
                                    <CheckBox checked={isSelected} onPress={() => handleToggleQuickAddItem(index)}
                                    containerStyle={styles.quickAddCheckbox} checkedColor={theme.colors.primary}
                                    disabled={isAnyItemEditing} />
                                    <ListItem.Content>
                                    <ListItem.Title style={styles.quickAddItemTitle}> {item.foodName} </ListItem.Title>
                                    <ListItem.Subtitle style={styles.quickAddItemSubtitle}>
                                        {`Est: ${Math.round( item.estimatedWeightGrams )}g • ~${estimatedCalories} kcal`}
                                    </ListItem.Subtitle>
                                    </ListItem.Content>
                                    {/* Edit Icon */}
                                    {!isAnyItemEditing && (
                                    <TouchableOpacity onPress={() => handleEditQuickAddItem(index)} style={styles.quickEditIconButton} >
                                        <Icon name="pencil" type="material-community" size={20} color={theme.colors.grey1} />
                                    </TouchableOpacity>
                                    )}
                                </>
                                )}
                            </ListItem>
                            </Pressable>
                        );
                        }}
                        ListEmptyComponent={ // Show if API returned no items initially
                        <View style={styles.emptyListContainer}>
                            <Text style={styles.emptyListText}> No identifiable foods found in the image. </Text>
                        </View>
                        }
                        style={styles.quickAddList}
                        extraData={{ selectedQuickAddIndices, editingQuickAddItemIndex }} // Ensure re-render on state change
                        keyboardShouldPersistTaps="handled"
                    />
                 )}
               </>
            )}
            {/* Spacer at the bottom of scroll view */}
            <View style={{ height: 40 }} />

          </ScrollView>
        </View>
      </KeyboardAvoidingView>
      <Toast />
    </Overlay>
  );
};

// --- Styles ---
const useStyles = makeStyles((theme) => ({
  overlayContainer: {
    backgroundColor: "transparent", width: "90%", maxWidth: 500, padding: 0,
    borderRadius: 15, shadowColor: "#000", shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.2, shadowRadius: 5, elevation: 6, overflow: "hidden",
  },
  overlayStyle: {
    width: "100%", borderRadius: 15, padding: 15, paddingBottom: 0,
    maxHeight: Dimensions.get("window").height * 0.85, // Limit height
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
  foodList: { // Limit height of search results list
    maxHeight: Dimensions.get("window").height * 0.25, // Adjusted height
    minHeight: 60, flexGrow: 0, marginBottom: 15,
  },
  listItemContainer: {
    backgroundColor: "transparent", paddingVertical: 8, paddingHorizontal: 5,
    borderBottomColor: theme.colors.divider,
  },
  selectedListItem: { backgroundColor: theme.colors.grey5, borderRadius: 8 },
  defaultIconContainer: {
      width: 35, height: 35, marginRight: 12, borderRadius: 17.5,
      backgroundColor: theme.colors.grey5, alignItems: "center", justifyContent: "center",
  },
  foodIcon: {
      width: 35, height: 35, marginRight: 12, borderRadius: 17.5, resizeMode: "contain",
      backgroundColor: theme.colors.grey5, // BG for loading state
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
    borderColor: theme.colors.primary, // Add border to button group
    borderWidth: 1,
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
    minWidth: 40, // Ensure it doesn't shrink too much when title is shown
  },
  aiButtonLoadingTitle: { // Style for the 'Estimating...' text
    color: theme.colors.white,
    fontSize: 10,
    textAlign: 'center',
  },
  loadingContainer: { // Unified loading overlay for normal mode AI actions
    position: "absolute", top: 60, left: 0, right: 0, // Position below header
    alignItems: "center", justifyContent: "center",
    zIndex: 10, // Above content but below header actions
    padding: 10,
    // backgroundColor: 'rgba(0,0,0,0.1)' // Optional subtle background
  },
   centeredContent: { // Centered loading/empty states within main area
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      padding: 20,
      minHeight: 150, // Ensure it takes some space
   },
  loadingText: { marginTop: 10, color: theme.colors.text, fontSize: 16, fontWeight: "500", },
  quickAddHeader: {
    flexDirection: "row", justifyContent: "space-between", alignItems: "center",
    marginBottom: 10, paddingHorizontal: 5, borderBottomWidth: 1,
    borderBottomColor: theme.colors.divider, paddingBottom: 8,
  },
  quickAddList: { maxHeight: Dimensions.get("window").height * 0.55, flexGrow: 0, marginBottom: 10, }, // Increased height
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

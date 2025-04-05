// ---------- AddEntryModal.tsx (With Quick Add Editing & Edit Mode Fix) ----------
// src/components/AddEntryModal.tsx
import React, {
    useEffect,
    useState,
    useMemo,
    useCallback,
    useRef,
  } from "react"; // Added useRef
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
    Pressable, // Use Pressable for better checkbox-like interaction
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
    CheckBox, // Import CheckBox
  } from "@rneui/themed";
  import { Food } from "../types/food";
  import { isValidNumberInput } from "../utils/validationUtils";
  import { loadRecentFoods, saveRecentFoods } from "../services/storageService";
  import { getFoodIconUrl } from "../utils/iconUtils";
  import { getGramsFromNaturalLanguage } from "../utils/units";
  import Toast from "react-native-toast-message";
  import * as ImagePicker from "expo-image-picker";
  import { EstimatedFoodItem, getMultipleFoodsFromImage } from "../utils/macros"; // Import new types/functions
  import { v4 as uuidv4 } from "uuid"; // Import uuid
  
  // Interface remains the same
  interface AddEntryModalProps {
    isVisible: boolean;
    toggleOverlay: () => void;
    selectedFood: Food | null;
    grams: string;
    setGrams: (grams: string) => void;
    handleAddEntry: () => void; // For single entry add/update
    handleAddMultipleEntries: (entries: { food: Food; grams: number }[]) => void; // NEW: For quick add
    foods: Food[];
    handleSelectFood: (item: Food | null) => void;
    updateSearch: (search: string) => void;
    search: string;
    isEditMode: boolean;
    initialGrams?: string; // Optional: Retained if needed for specific edit flows
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
    const [isAiLoading, setIsAiLoading] = useState(false);
  
    // --- Quick Add State ---
    const [modalMode, setModalMode] = useState<ModalMode>("normal");
    const [quickAddLoading, setQuickAddLoading] = useState(false);
    const [quickAddItems, setQuickAddItems] = useState<EstimatedFoodItem[]>([]);
    const [selectedQuickAddIndices, setSelectedQuickAddIndices] = useState<
      Set<number>
    >(new Set());
    // *** NEW: State for editing Quick Add items ***
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
        // Reset everything when modal closes
        handleSelectFood(null);
        setGrams("");
        updateSearch("");
        setUnitMode("grams");
        setAutoInput("");
        setIsAiLoading(false);
        // Reset Quick Add State on close
        setModalMode("normal");
        setQuickAddItems([]);
        setSelectedQuickAddIndices(new Set());
        setQuickAddLoading(false);
        setEditingQuickAddItemIndex(null); // Reset editing index
        setEditedFoodName(""); // Reset temp edit state
        setEditedGrams(""); // Reset temp edit state
        isInitiallyVisible.current = false;
      } else {
        // Ensure modal starts in 'normal' mode unless already loading Quick Add
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
  
        // Apply initial grams only in edit mode AND normal mode
        if (
          isEditMode &&
          selectedFood &&
          initialGrams &&
          modalMode === "normal"
        ) {
          targetGrams = initialGrams;
          targetUnitMode = "grams"; // Force grams mode when editing
          // Make sure auto input is cleared if switching to grams for edit
          if (unitMode === "auto") {
              setAutoInput("");
          }
        } else if (!isEditMode && selectedFood && modalMode === "normal") {
          targetUnitMode = "grams"; // Default to grams for new selections in normal mode
        } else if (!selectedFood && modalMode === "normal") {
          targetGrams = ""; // Clear grams if no food selected in normal mode
          targetUnitMode = "grams";
        }
  
        // Only update state if it has actually changed
        if (grams !== targetGrams) {
          setGrams(targetGrams);
        }
        if (unitMode !== targetUnitMode && !isAiLoading && !quickAddLoading) {
          setUnitMode(targetUnitMode);
        }
  
        // If opening in edit mode, ensure quick add state is reset
        // This prevents leftover quick add state if closed during QA and reopened in edit
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
      isVisible,
      isEditMode,
      selectedFood,
      initialGrams,
      quickAddLoading,
      modalMode,
      handleSelectFood,
      updateSearch,
      setGrams,
      unitMode,
      grams,
    ]);
  
    // Load recent foods when modal becomes visible in normal mode
    useEffect(() => {
      const loadRecents = async () => {
        const loadedRecentFoods = await loadRecentFoods();
        setRecentFoods(loadedRecentFoods);
      };
      // Only load if visible and in normal mode
      if (isVisible && modalMode === "normal") {
        loadRecents();
      }
    }, [isVisible, modalMode]);
  
    // Load icons for visible foods
    useEffect(() => {
      const loadIcons = async () => {
        const iconsToLoad: { [foodName: string]: string | null } = {};
        const relevantFoods = search ? filteredFoods : recentFoods;
        const uniqueFoodsMap = new Map(
          relevantFoods.map((food) => [food.id, food])
        );
  
        let shouldUpdateState = false;
        for (const food of uniqueFoodsMap.values()) {
          if (foodIcons[food.name] === undefined) {
            try {
              const iconUrl = await getFoodIconUrl(food.name);
              iconsToLoad[food.name] = iconUrl;
              shouldUpdateState = true;
            } catch (error) {
              console.warn(`Failed to load icon for ${food.name}:`, error);
              iconsToLoad[food.name] = null;
              shouldUpdateState = true;
            }
          }
        }
  
        if (shouldUpdateState) {
          setFoodIcons((prevIcons) => ({ ...prevIcons, ...iconsToLoad }));
        }
      };
  
      if (
        isVisible &&
        modalMode === "normal" && // Only load icons in normal mode
        (foods.length > 0 || recentFoods.length > 0)
      ) {
        loadIcons();
      }
    }, [isVisible, modalMode, search, filteredFoods, recentFoods, foods]); // Added modalMode dependency
  
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
        const estimatedGrams = await getGramsFromNaturalLanguage(
          selectedFood.name,
          autoInput
        );
        const roundedGrams = String(Math.round(estimatedGrams));
        setGrams(roundedGrams);
        setUnitMode("grams");
        Toast.show({
          type: "success",
          text1: "Grams Estimated",
          text2: `Estimated ${roundedGrams}g for ${selectedFood.name}`,
          position: "bottom",
          visibilityTime: 3000,
        });
      } catch (error: any) {
        console.error("AI Estimation Error:", error);
        Alert.alert(
          "AI Estimation Failed",
          error.message || "Could not estimate grams. Please enter manually."
        );
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
      if (isAiLoading || quickAddLoading) return; // Prevent action during loading
      handleAddEntry();
      await addToRecentFoods(selectedFood);
    };
  
    const handleInternalSelectFood = (item: Food | null) => {
      if (selectedFood?.id === item?.id) return; // No change if same food selected
      handleSelectFood(item);
      // If selecting a new item (and not in edit mode or initialGrams not set), reset grams/unit
      if (item && (!isEditMode || !initialGrams)) {
        setGrams(""); // Clear grams when selecting a new item in add mode
        setUnitMode("grams");
        setAutoInput("");
      } else if (!item) {
        // If deselecting food, clear grams/unit
        setGrams("");
        setUnitMode("grams");
        setAutoInput("");
      }
      // No need to set grams here for edit mode, handled by useEffect
    };
  
    // --- Quick Add Functions ---
  
    const handleQuickAddImage = async () => {
      // Double check: This function should not be callable in edit mode due to UI hiding
      if (isEditMode) {
          console.warn("Attempted to initiate Quick Add while in Edit Mode.");
          return;
      }
  
      // Ensure no other edit is in progress
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
  
    const pickImageAndAnalyze = async (source: "camera" | "gallery") => {
      // Again, double check against edit mode
      if (isEditMode) return;
  
      let permissionResult;
      let pickerResult: ImagePicker.ImagePickerResult;
  
      setQuickAddLoading(true);
      // Reset previous quick add state
      setQuickAddItems([]);
      setSelectedQuickAddIndices(new Set());
      setEditingQuickAddItemIndex(null); // Ensure edit state is reset
  
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
            mediaTypes: ["images"],
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
          const fileInfoForApi = {
            uri: asset.uri,
            fileName: asset.fileName ?? `quickadd_${Date.now()}.jpg`,
            type: asset.mimeType ?? "image/jpeg",
          };
  
          const results = await getMultipleFoodsFromImage(fileInfoForApi);
  
          if (results.length === 0) {
            Alert.alert(
              "No Foods Found",
              "The AI couldn't identify any food items in the image. Try again or add manually."
            );
            setQuickAddItems([]);
            setModalMode("normal"); // Go back to normal if nothing found
          } else {
            setQuickAddItems(results);
            setSelectedQuickAddIndices(new Set(results.map((_, i) => i))); // Select all by default
            setModalMode("quickAddSelect");
            // Clear single food selection state when entering quick add
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
        console.error("Error during Quick Add image process:", error);
        Alert.alert(
          "Quick Add Failed",
          `Could not analyze the image. ${error.message || "Please try again."}`
        );
        setModalMode("normal");
        setQuickAddItems([]);
        setSelectedQuickAddIndices(new Set());
        setEditingQuickAddItemIndex(null);
      } finally {
        // Use timeout to ensure loading state hides after modal transition completes
        setTimeout(() => setQuickAddLoading(false), 100);
      }
    };
  
    const handleToggleQuickAddItem = (index: number) => {
      // Prevent toggling selection while an item is being edited
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
  
    // *** NEW: Start editing a quick add item ***
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
      // Optionally, deselect the item being edited if it was selected
      setSelectedQuickAddIndices((prev) => {
        const newSet = new Set(prev);
        newSet.delete(index);
        return newSet;
      });
    };
  
    // *** NEW: Save the edits for a quick add item ***
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
  
      // Create a new array with the updated item
      const updatedItems = quickAddItems.map((item, index) => {
        if (index === editingQuickAddItemIndex) {
          // Keep original per_100g values, update name and grams
          return {
            ...item,
            foodName: trimmedName,
            estimatedWeightGrams: roundedGrams,
          };
        }
        return item;
      });
  
      setQuickAddItems(updatedItems);
      setEditingQuickAddItemIndex(null); // Exit editing mode
      setEditedFoodName("");
      setEditedGrams("");
      // Re-select the item after editing is saved
      setSelectedQuickAddIndices((prev) => {
          const newSet = new Set(prev);
          newSet.add(editingQuickAddItemIndex); // Add the index back
          return newSet;
        });
    };
  
    // *** NEW: Cancel editing a quick add item ***
    const handleCancelQuickAddItemEdit = () => {
      // Re-select the item if it was selected before editing started (optional, based on desired UX)
      // If you decided to deselect on edit start, you might want to reselect on cancel
      // For simplicity, we just exit edit mode here. Re-selection logic could be added if needed.
      setEditingQuickAddItemIndex(null);
      setEditedFoodName("");
      setEditedGrams("");
    };
  
    // *** MODIFIED: Convert and add selected quick add items ***
    const handleConfirmQuickAdd = () => {
      // Final check: Should not be possible in edit mode
      if (isEditMode) {
          console.warn("Attempted Quick Add confirmation while in Edit Mode.");
          return;
      }
      try {
        console.log("AddEntryModal: handleConfirmQuickAdd triggered.");
  
        // Prevent adding if an edit is still in progress
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
          // Use the potentially edited name and grams
          const quickFood: Food = {
            // Generate a unique ID for each entry being added
            id: uuidv4(),
            name: item.foodName, // Use potentially edited name
            calories: Math.round(item.calories_per_100g), // Keep original base rate
            protein: Math.round(item.protein_per_100g),
            carbs: Math.round(item.carbs_per_100g),
            fat: Math.round(item.fat_per_100g),
          };
          const entryGrams = Math.max(1, Math.round(item.estimatedWeightGrams)); // Use potentially edited grams
          return { food: quickFood, grams: entryGrams };
        });
  
        console.log(
          "AddEntryModal: Prepared entriesToAdd:",
          JSON.stringify(entriesToAdd, null, 2)
        );
  
        handleAddMultipleEntries(entriesToAdd);
        toggleOverlay(); // Close the modal
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
      isAiLoading || quickAddLoading || editingQuickAddItemIndex !== null; // Disable actions while editing a QA item
  
    const isAddButtonDisabled =
      modalMode !== "normal" || // Can only add/update in normal mode
      !selectedFood ||
      !isValidNumberInput(grams) ||
      parseFloat(grams) <= 0 ||
      isActionDisabled;
    const isAiButtonDisabled =
      modalMode !== "normal" || // AI only in normal mode
      !selectedFood ||
      !autoInput.trim() ||
      isActionDisabled;
    const isQuickAddConfirmDisabled =
      isEditMode || // Should never be enabled in edit mode
      modalMode !== "quickAddSelect" ||
      selectedQuickAddIndices.size === 0 ||
      isActionDisabled; // Disable confirm if editing
    const isQuickAddImageButtonDisabled = isEditMode || isActionDisabled; // Disable taking new pic while editing or if in edit mode
  
    const combinedOverlayStyle = StyleSheet.flatten([
      styles.overlayStyle,
      { backgroundColor: theme.colors.background },
    ]);
  
    useEffect(() => {
      if (isVisible && modalMode === "quickAddSelect" && !isEditMode) {
        console.log(
          `AddEntryModal State Check (QuickAdd) - isVisible: ${isVisible}, modalMode: ${modalMode}, editingIndex: ${editingQuickAddItemIndex}, quickAddItemsCount: ${quickAddItems.length}, selectedCount: ${selectedQuickAddIndices.size}, isActionDisabled: ${isActionDisabled}, isConfirmDisabled: ${isQuickAddConfirmDisabled}`
        );
      } else if (isVisible && modalMode === "normal") {
           console.log(
          `AddEntryModal State Check (Normal) - isVisible: ${isVisible}, modalMode: ${modalMode}, isEditMode: ${isEditMode}, selectedFood: ${selectedFood?.name}, grams: ${grams}, unitMode: ${unitMode}, search: ${search}, isActionDisabled: ${isActionDisabled}, isAddButtonDisabled: ${isAddButtonDisabled}`
        );
      }
    }, [
      isVisible,
      modalMode,
      quickAddItems,
      selectedQuickAddIndices,
      isActionDisabled,
      isQuickAddConfirmDisabled,
      editingQuickAddItemIndex,
      isEditMode, // Added dependency
      selectedFood,
      grams,
      unitMode,
      search,
      isAddButtonDisabled,
    ]);
  
    // Helper to clean grams input for the quick add edit
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
                  // Only show edit mode title style when actually in edit mode AND normal mode
                  isEditMode && modalMode === "normal" && styles.editModeTitle,
                ]}
                numberOfLines={1}
                ellipsizeMode="tail"
              >
                {/* Adjust Title based on mode AND edit state */}
                {modalMode === "quickAddSelect"
                  ? editingQuickAddItemIndex !== null
                    ? "Edit Item" // Change title when editing QA item
                    : "Select Items to Add" // Title for QA selection
                  : isEditMode // Now check edit mode when in 'normal' modalMode
                  ? "Edit Entry"
                  : "Add Entry"}
              </Text>
  
              {/* Conditional Header Actions */}
              {modalMode === "normal" && (
                <>
                  {/* ----> FIX: Conditionally render Quick Add Icon <---- */}
                  {!isEditMode && ( // Only show if NOT in edit mode
                    <TouchableOpacity
                      onPress={handleQuickAddImage}
                      disabled={isQuickAddImageButtonDisabled}
                      style={styles.headerIcon}
                    >
                      {quickAddLoading ? (
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
  
                  {/* Add/Update Button */}
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
              {/* ----> FIX: Ensure Quick Add confirm button never shows in edit mode <---- */}
              {modalMode === "quickAddSelect" && !isEditMode && (
                // Only show confirm button if *not* editing an item AND not in edit mode
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
  
            {/* Loading Indicators */}
            {(isAiLoading || quickAddLoading) && (
              <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color={theme.colors.primary} />
                <Text style={styles.loadingText}>
                  {quickAddLoading ? "Analyzing Image..." : "Estimating Grams..."}
                </Text>
              </View>
            )}
  
            {/* --- Conditional Content (Normal Mode) --- */}
            {/* Only show search, recents, list, and amount input when NOT loading AND in normal mode */}
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
                          {/* Icon Logic */}
                          {foodIcons[item.name] !== undefined ? (
                            foodIcons[item.name] ? (
                              <Image
                                source={{ uri: foodIcons[item.name] as string }}
                                style={styles.foodIconSmall}
                                onError={() =>
                                  setFoodIcons((prev) => ({
                                    ...prev,
                                    [item.name]: null,
                                  }))
                                }
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
                          {/* Icon Logic */}
                          {foodIcons[item.name] !== undefined ? (
                            foodIcons[item.name] ? (
                              <Image
                                source={{ uri: foodIcons[item.name] as string }}
                                style={styles.foodIcon}
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
  
                {/* Amount Input Section - Shows only if a food is selected */}
                {selectedFood && (
                  <View style={styles.amountSection}>
                    {/* Unit Mode Selector */}
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
                        // Disable AI mode when editing
                        disabled={isEditMode && [1]} // Disable the second button (index 1) if isEditMode
                        disabledStyle={{ backgroundColor: theme.colors.grey5 }}
                        disabledTextStyle={{ color: theme.colors.grey3 }}
                      />
                    </View>
  
                    {/* Conditional Input Field */}
                    {unitMode === "grams" && (
                      <>
                        {/* Serving Size Suggestions (Only show if NOT editing) */}
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
                        {/* Grams Input */}
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
                          key={`grams-input-${selectedFood?.id}`} // Re-key to ensure value updates correctly
                          autoFocus={!search && !isEditMode} // Auto-focus only when adding a recent/selected item, not during edit or search
                        />
                      </>
                    )}
  
                    {/* Auto Input (Only show if NOT editing) */}
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
                          autoFocus={true} // Auto-focus when switching to AI mode
                        />
                        <Button
                          onPress={handleEstimateGrams}
                          disabled={isAiButtonDisabled}
                          loading={isAiLoading}
                          buttonStyle={styles.aiButton}
                          icon={
                            isAiLoading ? (
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
            {/* Only show this section if NOT in edit mode AND in quickAddSelect mode */}
            {!isEditMode && modalMode === "quickAddSelect" && (
              <>
                <View style={styles.quickAddHeader}>
                  <Text style={styles.sectionTitle}>
                    {editingQuickAddItemIndex !== null
                      ? "Editing Item Details"
                      : "Select Items from Image"}
                  </Text>
                  {/* Only show Back button if not editing */}
                  {editingQuickAddItemIndex === null && (
                    <Button
                      type="clear"
                      title="Back"
                      onPress={() => {
                        setModalMode("normal");
                        setQuickAddItems([]);
                        setSelectedQuickAddIndices(new Set());
                        setEditingQuickAddItemIndex(null); // Reset edit state
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
                      disabled={quickAddLoading} // Disable back while initial loading
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
                        } // Allow selection only if not editing this item
                        // Disable press if any item is being edited
                        disabled={isAnyItemEditing && !isEditingThisItem}
                      >
                        <ListItem
                          bottomDivider
                          containerStyle={[
                            styles.quickAddItemContainer,
                            isEditingThisItem && styles.quickAddItemEditing, // Style for editing item
                            isSelected && styles.quickAddItemSelected,
                            // Dim unselected items slightly if another item is being edited
                            isAnyItemEditing &&
                              !isEditingThisItem && { opacity: 0.6 },
                          ]}
                        >
                          {/* --- Edit View --- */}
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
                                autoFocus // Focus name field on edit start
                              />
                              <View style={styles.quickEditGramsRow}>
                                <Input
                                  value={editedGrams}
                                  onChangeText={handleQuickAddGramsChange} // Use cleaner
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
                                {/* Save and Cancel Buttons */}
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
                            /* --- Display View --- */
                            <>
                              <CheckBox
                                checked={isSelected}
                                onPress={() => handleToggleQuickAddItem(index)}
                                containerStyle={styles.quickAddCheckbox}
                                checkedColor={theme.colors.primary}
                                // Disable checkbox if any item is editing
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
                              {/* Edit Button (only show if no item is being edited) */}
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
                  // Re-render when selection or editing state changes
                  extraData={{ selectedQuickAddIndices, editingQuickAddItemIndex }}
                  keyboardShouldPersistTaps="handled" // Important for inputs in list
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
  
  // --- Styles ---
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
    },
    overlayStyle: {
      width: "100%",
      borderRadius: 15,
      padding: 15,
      paddingBottom: 0, // Adjust padding if needed
      maxHeight: Dimensions.get("window").height * 0.85, // Ensure max height
    },
    keyboardAvoidingView: { width: "100%" },
    header: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      marginBottom: 15,
      paddingHorizontal: 5,
    },
    closeIconTouchable: { padding: 5, zIndex: 1 },
    overlayTitle: {
      color: theme.colors.text,
      fontWeight: "bold",
      fontSize: 20,
      textAlign: "center",
      flex: 1, // Allow title to take space
      marginHorizontal: 5, // Add margin around title
    },
    editModeTitle: { color: theme.colors.warning },
    headerIcon: { padding: 5, marginHorizontal: 5, zIndex: 1 },
    addButton: {
      borderRadius: 20,
      paddingHorizontal: 15,
      paddingVertical: 8,
      minWidth: 70, // Ensure minimum width
      marginLeft: 5, // Add margin to left
      backgroundColor: theme.colors.primary,
      zIndex: 1, // Keep button on top if needed
    },
    updateButton: { backgroundColor: theme.colors.warning },
    buttonTitle: { color: theme.colors.white, fontWeight: "600", fontSize: 15 },
  
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
      backgroundColor: theme.colors.grey4, // Placeholder background
    },
    iconPlaceholderSmall: {
      backgroundColor: theme.colors.grey4,
      alignItems: "center",
      justifyContent: "center",
    },
    recentFoodText: { color: theme.colors.text, fontSize: 13, maxWidth: 80 },
    smallRecentFoodText: { fontSize: 12, maxWidth: 70 },
  
    foodList: {
      maxHeight: Dimensions.get("window").height * 0.3, // Limit height
      minHeight: 60, // Ensure minimum height
      flexGrow: 0, // Prevent taking full space if content is small
      marginBottom: 15,
    },
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
      backgroundColor: theme.colors.background, // Match background
    },
    buttonGroupText: { fontSize: 14, color: theme.colors.text },
    servingSizeRow: {
      flexDirection: "row",
      alignItems: "center",
      marginBottom: 12,
      paddingHorizontal: 5,
    },
    servingSizeLabel: { color: theme.colors.grey2, fontSize: 13, marginRight: 8 },
    servingSizeContainer: { flexGrow: 0 }, // Prevent stretching
    servingSizeButton: {
      backgroundColor: theme.colors.grey4,
      borderRadius: 15,
      marginRight: 8,
      paddingHorizontal: 12,
      paddingVertical: 5,
      justifyContent: "center",
      alignItems: "center",
      height: 30, // Fixed height
    },
    servingSizeButtonTitle: { color: theme.colors.text, fontSize: 13 },
    gramInputStyle: {
      color: theme.colors.text,
      fontSize: 16,
      paddingVertical: 8, // Adjust padding
      height: 40, // Ensure consistent height
    },
    gramInputContainerStyle: {
      borderBottomColor: theme.colors.grey3,
      paddingHorizontal: 5, // Add padding inside container
    },
    unitText: {
      color: theme.colors.grey2,
      fontSize: 15,
      fontWeight: "500",
      paddingRight: 5, // Add padding for unit
    },
    autoInputRow: { flexDirection: "row", alignItems: "center" },
    autoInputContainer: { flex: 1, paddingHorizontal: 0, marginRight: 10 },
    autoInputField: { height: 40 }, // Consistent height
    aiButton: {
      backgroundColor: theme.colors.secondary,
      borderRadius: 20, // Circular button
      width: 40,
      height: 40,
      padding: 0,
      justifyContent: "center",
      alignItems: "center",
    },
  
    loadingContainer: {
      position: "absolute",
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: "rgba(0, 0, 0, 0.1)",
      alignItems: "center",
      justifyContent: "center",
      zIndex: 10,
      borderRadius: 15, // Match overlay border radius
    },
    loadingText: {
      marginTop: 10,
      color: theme.colors.text,
      fontSize: 16,
      fontWeight: "500",
    },
  
    // Quick Add Specific Styles
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
    quickAddList: {
      maxHeight: Dimensions.get("window").height * 0.5, // Adjust max height as needed
      flexGrow: 0, // Important for scroll behavior inside overlay
      marginBottom: 10,
    },
    quickAddItemContainer: {
      paddingVertical: 6, // Reduced padding for edit view space
      paddingHorizontal: 5,
      backgroundColor: theme.colors.background, // Ensure background color
      borderBottomColor: theme.colors.divider,
      // minHeight: 60, // Ensure minimum height for consistency
      flexDirection: "row", // Ensure row layout for checkbox/content/icon
      alignItems: "center", // Align items vertically
    },
    quickAddItemSelected: { backgroundColor: theme.colors.successLight || '#d4edda' }, // Added fallback color
    quickAddItemEditing: {
      backgroundColor: theme.colors.grey5, // Highlight item being edited
      paddingVertical: 8, // Slightly more padding when editing
    },
    quickAddCheckbox: {
      padding: 0,
      margin: 0,
      marginRight: 10,
      backgroundColor: "transparent",
      borderWidth: 0,
    },
    quickAddItemTitle: {
      fontWeight: "bold",
      color: theme.colors.text,
      fontSize: 16,
    },
    quickAddItemSubtitle: {
      color: theme.colors.grey1,
      fontSize: 13,
      marginTop: 2,
    },
    quickEditIconButton: {
      padding: 8, // Make icon easier to tap
      marginLeft: 8,
    },
    // Styles for the Edit View within the list item
    quickAddEditView: {
      flex: 1, // Take available space
      paddingLeft: 10, // Add some padding from where checkbox was
    },
    quickEditInputContainer: {
      borderBottomWidth: 1,
      borderBottomColor: theme.colors.primary,
      height: 35, // Reduced height for compact list
      paddingHorizontal: 0,
    },
    quickEditInput: {
      fontSize: 15,
      color: theme.colors.text,
      paddingVertical: 0, // Minimal vertical padding
    },
    quickEditNameContainer: {
      paddingHorizontal: 0,
      marginBottom: 5, // Space between name and grams row
    },
    quickEditGramsRow: {
      flexDirection: "row",
      alignItems: "center",
    },
    quickEditGramsContainer: {
      flex: 1, // Allow grams input to take space
      paddingHorizontal: 0,
    },
    quickEditUnitText: {
      color: theme.colors.grey2,
      fontSize: 14,
      fontWeight: "500",
    },
    quickEditButton: {
      paddingLeft: 10, // Space before buttons
      paddingVertical: 5, // Vertical padding for tap area
    },
  
    emptyListContainer: {
      alignItems: "center",
      paddingVertical: 30,
      paddingHorizontal: 15,
    },
    emptyListText: {
      color: theme.colors.grey2,
      fontSize: 16,
      textAlign: "center",
    },
    emptyListSubText: {
      fontSize: 14,
      color: theme.colors.grey3,
      textAlign: "center",
      marginTop: 5,
    },
  }));
  
  export default AddEntryModal;
  // ---------- END AddEntryModal.tsx ----------
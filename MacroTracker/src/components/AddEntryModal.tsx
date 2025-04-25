// src/components/AddEntryModal.tsx
// ---------- AddEntryModal.tsx (Refactored to use single FlatList, Final Version) ----------
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
import { EstimatedFoodItem, getMultipleFoodsFromImage } from "../utils/macros";
import { v4 as uuidv4 } from "uuid";

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

// Define types for the items in our main FlatList data structure
type ListItemType =
  | { type: "searchBar"; key: string }
  | { type: "recentFoods"; key: string }
  | { type: "searchResults"; key: string; data: Food } // Individual search result
  | { type: "noResults"; key: string }
  | { type: "amountInput"; key: string }
  | { type: "quickAddHeader"; key: string }
  | { type: "quickAddItem"; key: string; data: EstimatedFoodItem; index: number } // Individual quick add item
  | { type: "quickAddLoading"; key: string }
  | { type: "quickAddEditForm"; key: string; index: number} // Edit form for quick add
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
  const [isAiLoading, setIsAiLoading] = useState(false);

  // --- Quick Add State ---
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
  // --- End Quick Add State ---

  const screenWidth = Dimensions.get("window").width;
  const isModalOpening = useRef(false);

  const filteredFoods = useMemo(() => {
      if (!search) return [];
      return foods.filter((food) =>
          food.name.toLowerCase().includes(search.toLowerCase())
      );
  }, [foods, search]);

  // --- Effects ---
  useEffect(() => {
      if (!isVisible) {
          // Reset general states when modal actually closes
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
           setQuickAddLoading(false); // Ensure loading state is reset
      }
  }, [isVisible, handleSelectFood, updateSearch, setGrams]);


  useEffect(() => {
      if (isVisible && modalMode === 'normal') {
          isModalOpening.current = true;

          if (isEditMode && selectedFood && initialGrams !== undefined) {
              setGrams(initialGrams);
              setUnitMode('grams');
              setAutoInput('');
          } else if (!isEditMode) { // Only reset if not in edit mode opening
              setGrams('');
              setUnitMode('grams');
              setAutoInput('');
          }

          const loadRecents = async () => {
              const loadedRecentFoods = await loadRecentFoods();
              setRecentFoods(loadedRecentFoods);
          };
          loadRecents();

          const timer = setTimeout(() => {
              isModalOpening.current = false;
          }, 100); // Short delay to prevent effect races

          return () => clearTimeout(timer);
      } else if (isVisible && modalMode === 'quickAddSelect') {
           // Reset normal mode stuff if switching to quick add
          handleSelectFood(null);
          updateSearch('');
          setGrams('');
          setUnitMode("grams");
          setAutoInput("");
      }
  }, [isVisible, modalMode, isEditMode, selectedFood, initialGrams, setGrams]); // Dependencies remain


  // Effect 3: Reset grams/mode if selectedFood changes while modal is open in ADD mode
  useEffect(() => {
      if (isVisible && modalMode === 'normal' && !isEditMode && !isModalOpening.current) {
          setGrams("");
          setUnitMode("grams");
          setAutoInput("");
      }
  }, [selectedFood, isVisible, modalMode, isEditMode]);

  // Load icons
  useEffect(() => {
      if (!isVisible || modalMode !== 'normal') return;

      const loadIcons = async () => {
          const relevantFoods = search ? filteredFoods : recentFoods;
          const uniqueFoodsMap = new Map(relevantFoods.map(food => [food.id ?? food.name, food]));

          for (const food of uniqueFoodsMap.values()) {
              const foodName = food.name;
              if (foodIcons[foodName] === undefined) {
                  getFoodIconUrl(foodName)
                      .then(iconUrl => {
                          setFoodIcons(prevIcons => ({ ...prevIcons, [foodName]: iconUrl }));
                      })
                      .catch(error => {
                          console.warn(`Icon fetch failed for ${foodName}:`, error);
                          setFoodIcons(prevIcons => ({ ...prevIcons, [foodName]: null }));
                      });
              }
          }
      };
      loadIcons();
  }, [isVisible, modalMode, search, filteredFoods, recentFoods, foodIcons]);


  // --- Utility Functions ---
  const addToRecentFoods = useCallback(async (food: Food) => {
      if (!food || !food.id) return;
      if (recentFoods.length > 0 && recentFoods[0].id === food.id) return;

      setRecentFoods((prevRecent) => {
          const updated = prevRecent.filter((rf) => rf.id !== food.id);
          updated.unshift(food);
          const trimmed = updated.slice(0, MAX_RECENT_FOODS);
          saveRecentFoods(trimmed).catch(err => console.error("Failed to save recent foods:", err));
          return trimmed;
      });
  }, [recentFoods]);

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
          Alert.alert("Input Missing", "Please select a food and enter a quantity description.");
          return;
      }
      if (isAiLoading) return;
      setIsAiLoading(true);
      try {
          const estimatedGrams = await getGramsFromNaturalLanguage(selectedFood.name, autoInput);
          const roundedGrams = String(Math.round(estimatedGrams));
          setGrams(roundedGrams);
          setUnitMode("grams"); // Switch back to grams view
          setAutoInput("");
          Toast.show({ type: "success", text1: "Grams Estimated", text2: `Estimated ${roundedGrams}g for ${selectedFood.name}`, position: "bottom" });
      } catch (error: any) {
          console.error("AI Gram Estimation Error:", error);
          Toast.show({ type: "error", text1: "Estimation Failed", text2: error.message || "Could not estimate grams.", position: "bottom" });
      } finally {
          setIsAiLoading(false);
      }
  }, [selectedFood, autoInput, isAiLoading, setGrams]);

  const handleAddOrUpdateSingleEntry = useCallback(async () => {
      Keyboard.dismiss();
      if (!selectedFood) {
          Alert.alert("Food Not Selected", "Please select a food item."); return;
      }
      const numericGrams = parseFloat(grams);
      if (!isValidNumberInput(grams) || numericGrams <= 0) {
          Alert.alert("Invalid Amount", "Please enter a valid positive number for grams."); return;
      }
      if (isAiLoading || quickAddLoading) return;

      handleAddEntry();
      if (!isEditMode) { // Only add to recents on ADD, not UPDATE
           addToRecentFoods(selectedFood);
      }

  }, [selectedFood, grams, isAiLoading, quickAddLoading, handleAddEntry, addToRecentFoods, isEditMode]);

  const handleInternalSelectFood = useCallback((item: Food | null) => {
      handleSelectFood(item);
      updateSearch(""); // Clear search when a food is selected from results/recent
      Keyboard.dismiss();
  }, [handleSelectFood, updateSearch]);


  // --- Quick Add Functions (Declare dependent functions first) ---

  const pickImageAndAnalyze = useCallback(async (source: "camera" | "gallery") => {
      if (isEditMode) return;

      let permissionResult;
      let pickerResult: ImagePicker.ImagePickerResult;

      setQuickAddLoading(true);
      setQuickAddItems([]);
      setSelectedQuickAddIndices(new Set());
      setEditingQuickAddItemIndex(null);
      setModalMode("quickAddSelect"); // Switch view mode
      // Clear normal mode state when entering quick add
      handleSelectFood(null);
      updateSearch("");
      setGrams("");

      try {
          if (source === "camera") {
              permissionResult = await ImagePicker.requestCameraPermissionsAsync();
              if (!permissionResult.granted) { Alert.alert("Permission Required", "Camera access needed."); setModalMode("normal"); setQuickAddLoading(false); return; }
              pickerResult = await ImagePicker.launchCameraAsync({ quality: 0.6 });
          } else {
              permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
              if (!permissionResult.granted) { Alert.alert("Permission Required", "Gallery access needed."); setModalMode("normal"); setQuickAddLoading(false); return; }
              pickerResult = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ImagePicker.MediaTypeOptions.Images, quality: 0.6 });
          }

          if (pickerResult.canceled) { setModalMode("normal"); setQuickAddLoading(false); return; }

          if (pickerResult.assets && pickerResult.assets.length > 0) {
              const asset = pickerResult.assets[0];
              const results = await getMultipleFoodsFromImage(asset);
              if (results.length === 0) {
                  Alert.alert("No Foods Found", "Couldn't identify food items. Try again or add manually.");
                  setModalMode("normal"); // Go back if nothing found
              } else {
                  setQuickAddItems(results);
                  setSelectedQuickAddIndices(new Set(results.map((_, i) => i))); // Select all initially
              }
          } else {
              Alert.alert("Error", "Could not select image."); setModalMode("normal");
          }
      } catch (error: any) {
          console.error("Error during Quick Add image process:", error);
          Alert.alert("Analysis Failed", error.message || "An error occurred during image analysis.");
          setModalMode("normal"); setQuickAddItems([]); setSelectedQuickAddIndices(new Set());
      } finally {
          setTimeout(() => setQuickAddLoading(false), 150);
      }
  }, [isEditMode, handleSelectFood, updateSearch, setGrams]); // Dependencies for pickImageAndAnalyze

  const handleQuickAddImage = useCallback(async () => {
      Keyboard.dismiss();
      if (isEditMode) return;
      if (editingQuickAddItemIndex !== null) {
          Alert.alert("Finish Editing", "Please save or cancel the current edit first."); return;
      }
      Alert.alert("Quick Add from Image", "Identify multiple foods from an image.",
          [ { text: "Cancel", style: "cancel" },
            { text: "Camera", onPress: () => pickImageAndAnalyze("camera") },
            { text: "Gallery", onPress: () => pickImageAndAnalyze("gallery") }, ]
      );
  }, [isEditMode, editingQuickAddItemIndex, pickImageAndAnalyze]); // Now pickImageAndAnalyze is declared above

  const handleToggleQuickAddItem = useCallback((index: number) => {
      if (editingQuickAddItemIndex !== null) return;
      setSelectedQuickAddIndices((prev) => {
          const newSet = new Set(prev);
          if (newSet.has(index)) newSet.delete(index);
          else newSet.add(index);
          return newSet;
      });
  }, [editingQuickAddItemIndex]);

  const handleEditQuickAddItem = useCallback((index: number) => {
      if (editingQuickAddItemIndex !== null) {
          Alert.alert("Finish Editing", "Please save or cancel the current edit first."); return;
      }
      const item = quickAddItems[index];
      setEditingQuickAddItemIndex(index);
      setEditedFoodName(item.foodName);
      setEditedGrams(String(Math.round(item.estimatedWeightGrams)));
  }, [editingQuickAddItemIndex, quickAddItems]);

  const handleSaveQuickAddItemEdit = useCallback(() => {
      if (editingQuickAddItemIndex === null) return;

      const trimmedName = editedFoodName.trim();
      if (!trimmedName) { Alert.alert("Invalid Name", "Food name cannot be empty."); return; }
      const numericGrams = parseFloat(editedGrams);
      if (!isValidNumberInput(editedGrams) || numericGrams <= 0) { Alert.alert("Invalid Grams", "Please enter a valid positive number."); return; }
      const roundedGrams = Math.round(numericGrams);

      setQuickAddItems((prevItems) =>
          prevItems.map((item, index) =>
              index === editingQuickAddItemIndex
                  ? { ...item, foodName: trimmedName, estimatedWeightGrams: roundedGrams }
                  : item
          )
      );

      setEditingQuickAddItemIndex(null);
      setEditedFoodName("");
      setEditedGrams("");
      Keyboard.dismiss();
  }, [editingQuickAddItemIndex, editedFoodName, editedGrams]);

  const handleCancelQuickAddItemEdit = useCallback(() => {
      setEditingQuickAddItemIndex(null);
      setEditedFoodName("");
      setEditedGrams("");
      Keyboard.dismiss();
  }, []);

  const handleConfirmQuickAdd = useCallback(() => {
      Keyboard.dismiss();
      if (isEditMode || editingQuickAddItemIndex !== null || selectedQuickAddIndices.size === 0) {
         if(editingQuickAddItemIndex !== null) Alert.alert("Finish Editing", "Save or cancel your edit before adding.");
         else if(selectedQuickAddIndices.size === 0) Alert.alert("No Items Selected", "Select items to add.");
        return;
      }

      try {
          const entriesToAdd: { food: Food; grams: number }[] = [];
          Array.from(selectedQuickAddIndices).forEach((index) => {
               if (index >= 0 && index < quickAddItems.length) { // Bounds check
                  const item = quickAddItems[index];
                  const quickFood: Food = {
                      id: uuidv4(), name: item.foodName,
                      calories: Math.round(Number(item.calories_per_100g) || 0),
                      protein: Math.round(Number(item.protein_per_100g) || 0),
                      carbs: Math.round(Number(item.carbs_per_100g) || 0),
                      fat: Math.round(Number(item.fat_per_100g) || 0),
                  };
                  const entryGrams = Math.max(1, Math.round(Number(item.estimatedWeightGrams) || 1));
                  entriesToAdd.push({ food: quickFood, grams: entryGrams });
               } else {
                   console.warn(`Skipping invalid index ${index} during quick add confirm.`);
               }
          });

          if (entriesToAdd.length > 0) {
               handleAddMultipleEntries(entriesToAdd);
               // toggleOverlay(); // Decide if you want to close the modal automatically
          } else {
               Alert.alert("Nothing to Add", "No valid items were selected.");
          }

      } catch (error) {
          console.error("Error confirming Quick Add:", error);
          Alert.alert("Error", "Could not prepare items to add.");
      }
  }, [quickAddItems, selectedQuickAddIndices, editingQuickAddItemIndex, handleAddMultipleEntries, isEditMode]);


  const handleQuickAddGramsChange = useCallback((text: string) => {
      const cleanedText = text.replace(/[^0-9.]/g, "").replace(/(\..*)\./g, "$1");
      setEditedGrams(cleanedText);
  }, []);

  // --- Computed States ---
  const isActionDisabled = isAiLoading || (quickAddLoading && modalMode === 'quickAddSelect');
  const isAddButtonDisabled = modalMode !== "normal" || !selectedFood || !isValidNumberInput(grams) || parseFloat(grams) <= 0 || isAiLoading;
  const isAiButtonDisabled = modalMode !== "normal" || !selectedFood || !autoInput.trim() || isAiLoading;
  const isQuickAddConfirmDisabled = isEditMode || modalMode !== "quickAddSelect" || selectedQuickAddIndices.size === 0 || editingQuickAddItemIndex !== null || quickAddLoading;
  const isQuickAddImageButtonDisabled = isEditMode || isAiLoading || quickAddLoading;

  // --- Build list data for the main FlatList ---
  const listData = useMemo((): ListItemType[] => {
      const items: ListItemType[] = [];

      // --- NORMAL MODE ---
      if (modalMode === "normal") {
          items.push({ type: "searchBar", key: "searchBar" });

          if (!search && recentFoods.length > 0) {
              items.push({ type: "recentFoods", key: "recentFoods" });
          }

          if (search) {
              if (filteredFoods.length > 0) {
                  filteredFoods.forEach((food) =>
                      items.push({ type: "searchResults", key: `search-${food.id}`, data: food })
                  );
              } else {
                  items.push({ type: "noResults", key: "noResults" });
              }
          }

          if (selectedFood) {
              items.push({ type: "amountInput", key: "amountInput" });
          }
      }
      // --- QUICK ADD MODE ---
      else if (modalMode === "quickAddSelect") {
           items.push({ type: "quickAddHeader", key: "quickAddHeader" });

           if (quickAddLoading) {
               items.push({ type: "quickAddLoading", key: "quickAddLoading"});
           } else if (quickAddItems.length > 0) {
               quickAddItems.forEach((item, index) => {
                   if (editingQuickAddItemIndex === index) {
                       items.push({ type: "quickAddEditForm", key: `qa-edit-${index}`, index });
                   } else {
                       items.push({ type: "quickAddItem", key: `qa-${index}`, data: item, index });
                   }
               });
           } else {
               // Optionally show a "No items found" message here if needed after loading
           }
      }

      items.push({ type: "spacer", key: "bottom-spacer", height: 60 });

      return items;
  }, [
      modalMode, search, recentFoods, filteredFoods, selectedFood,
      quickAddLoading, quickAddItems, editingQuickAddItemIndex,
  ]);

  // --- Render individual item types for the main FlatList ---
  const renderListItem = useCallback(({ item }: { item: ListItemType }): React.ReactElement | null => {
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
                      showCancel={Platform.OS === 'ios'}
                      onClear={() => updateSearch("")}
                      disabled={isActionDisabled || modalMode !== 'normal'}
                  />
              );

          case "recentFoods":
              if (!recentFoods || recentFoods.length === 0) {
                   return null;
               }
              return (
                   <View style={styles.recentFoodsSection}>
                       <Text style={styles.sectionTitle}>Recent</Text>
                       <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.recentFoodsContainer}>
                           {recentFoods.map((food) => (
                               <TouchableOpacity
                                   key={`recent-${food.id}`}
                                   style={[styles.recentFoodItem, screenWidth < 350 && styles.smallRecentFoodItem, selectedFood?.id === food.id && styles.selectedRecentFoodItem]}
                                   onPress={() => handleInternalSelectFood(food)}
                                   disabled={isActionDisabled}
                                   >
                                   {foodIcons[food.name] !== undefined ? (
                                       foodIcons[food.name] ? (
                                           <Image source={{ uri: foodIcons[food.name] as string }} style={styles.foodIconSmall} onError={() => setFoodIcons((prev) => ({ ...prev, [food.name]: null }))}/>
                                       ) : (
                                           <View style={[styles.foodIconSmall, styles.iconPlaceholderSmall]}><Icon name="fastfood" type="material" size={12} color={theme.colors.grey2} /></View>
                                       )
                                   ) : (
                                       <ActivityIndicator size="small" color={theme.colors.grey3} style={styles.foodIconSmall} />
                                   )}
                                   <Text style={[styles.recentFoodText, screenWidth < 350 && styles.smallRecentFoodText]} numberOfLines={1} ellipsizeMode="tail">
                                       {food.name}
                                   </Text>
                               </TouchableOpacity>
                           ))}
                       </ScrollView>
                   </View>
               );

          case "searchResults": {
              const food = item.data;
              return (
                  <TouchableOpacity onPress={() => handleInternalSelectFood(food)} disabled={isActionDisabled}>
                      <ListItem bottomDivider containerStyle={[styles.listItemContainer, selectedFood?.id === food.id && styles.selectedListItem]}>
                           {foodIcons[food.name] !== undefined ? (
                              foodIcons[food.name] ? (
                                  <Image source={{ uri: foodIcons[food.name] as string }} style={styles.foodIcon} onError={() => setFoodIcons((prev) => ({ ...prev, [food.name]: null }))} />
                              ) : (
                                  <View style={styles.defaultIconContainer}><Icon name="restaurant" type="material" size={18} color={theme.colors.grey3} /></View>
                              )
                          ) : (
                              <ActivityIndicator size="small" color={theme.colors.grey3} style={styles.foodIcon} />
                          )}
                          <ListItem.Content>
                              <ListItem.Title style={styles.listItemTitle}>{food.name}</ListItem.Title>
                          </ListItem.Content>
                          {selectedFood?.id === food.id && (
                              <Icon name="checkmark-circle" type="ionicon" color={theme.colors.primary} size={24} />
                          )}
                      </ListItem>
                  </TouchableOpacity>
              );
          }

          case "noResults":
               return <Text style={styles.noFoodsText}> No foods found matching "{search}". </Text>;

          case "amountInput":
              if (!selectedFood) {
                  return null;
              }
              return (
                  <View style={styles.amountSection}>
                      <View style={styles.unitSelectorContainer}>
                          <Text style={styles.inputLabel}>Amount</Text>
                          <ButtonGroup
                              buttons={["Grams", "Auto (AI)"]}
                              selectedIndex={unitMode === "grams" ? 0 : 1}
                              onPress={(index) => !isActionDisabled && setUnitMode(index === 0 ? "grams" : "auto")}
                              containerStyle={styles.buttonGroupContainer}
                              selectedButtonStyle={{ backgroundColor: theme.colors.primary }}
                              textStyle={styles.buttonGroupText}
                              selectedTextStyle={{ color: theme.colors.white }}
                              disabled={isEditMode ? [1] : (isActionDisabled ? [0, 1] : [])}
                              disabledStyle={{ backgroundColor: theme.colors.grey5 }}
                              disabledTextStyle={{ color: theme.colors.grey3 }}
                          />
                      </View>

                      {unitMode === "grams" && (
                          <>
                              {!isEditMode && servingSizeSuggestions.length > 0 && (
                                  <View style={styles.servingSizeRow}>
                                      <Text style={styles.servingSizeLabel}>Quick Add:</Text>
                                      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.servingSizeContainer}>
                                          {servingSizeSuggestions.map((suggestion) => (
                                              <TouchableOpacity key={suggestion.label} style={styles.servingSizeButton} onPress={() => !isActionDisabled && setGrams(suggestion.value)} disabled={isActionDisabled}>
                                                  <Text style={styles.servingSizeButtonTitle}>{suggestion.label}</Text>
                                              </TouchableOpacity>
                                          ))}
                                      </ScrollView>
                                  </View>
                              )}
                              <Input
                                  placeholder={isEditMode ? "Update grams" : "Enter grams (e.g., 150)"}
                                  keyboardType="numeric" value={grams}
                                  onChangeText={(text) => {
                                      const cleanedText = text.replace(/[^0-9.]/g, "").replace(/(\..*)\./g, "$1");
                                      setGrams(cleanedText);
                                  }}
                                  inputStyle={styles.gramInputStyle}
                                  inputContainerStyle={styles.gramInputContainerStyle}
                                  errorMessage={!isValidNumberInput(grams) && grams !== "" && grams !== "." ? "Enter a valid number" : ""}
                                  errorStyle={{ color: theme.colors.error }}
                                  rightIcon={<Text style={styles.unitText}>g</Text>}
                                  containerStyle={{ paddingHorizontal: 0 }}
                                  key={`grams-input-${selectedFood.id}`}
                                  disabled={isActionDisabled}
                              />
                          </>
                      )}

                      {unitMode === "auto" && !isEditMode && (
                          <View style={styles.autoInputRow}>
                              <Input
                                  placeholder="Describe quantity (e.g., 1 cup cooked)"
                                  value={autoInput} onChangeText={setAutoInput}
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
                                  icon={isAiLoading ? undefined : (<Icon name="calculator-variant" type="material-community" size={20} color={theme.colors.white} />)}
                                  title={isAiLoading ? '' : ''}
                              />
                          </View>
                      )}
                  </View>
              );

          case "quickAddHeader":
              return (
                   <View style={styles.quickAddHeader}>
                      <Text style={styles.sectionTitle}>
                          {editingQuickAddItemIndex !== null ? "Editing Item Details" : "Select Items from Image"}
                      </Text>
                      {editingQuickAddItemIndex === null && (
                          <Button type="clear" title="Back"
                              onPress={() => {
                                  setModalMode("normal");
                                  setQuickAddItems([]);
                                  setSelectedQuickAddIndices(new Set());
                                  setEditingQuickAddItemIndex(null);
                              }}
                              titleStyle={{ color: theme.colors.primary, fontSize: 14 }}
                              icon={<Icon name="arrow-back" type="ionicon" size={18} color={theme.colors.primary} />}
                              disabled={quickAddLoading}
                          />
                      )}
                  </View>
              );

          case "quickAddLoading":
              return (
                   <View style={styles.centeredContent}>
                      <ActivityIndicator size="large" color={theme.colors.primary} />
                      <Text style={styles.loadingText}>Analyzing Image...</Text>
                  </View>
              );

          case "quickAddItem": {
              const { data: itemData, index } = item;
              const isSelected = selectedQuickAddIndices.has(index);
              return (
                  <ListItem
                       bottomDivider
                       containerStyle={[
                          styles.quickAddItemContainer,
                          isSelected && styles.quickAddItemSelected,
                       ]}
                       onPress={() => handleToggleQuickAddItem(index)}
                       disabled={editingQuickAddItemIndex !== null || isActionDisabled}
                       >
                       <ListItem.Content style={styles.quickAddItemContent}>
                          <ListItem.Title style={styles.quickAddItemTitle} numberOfLines={1}>
                              {itemData.foodName}
                          </ListItem.Title>
                          <ListItem.Subtitle style={styles.quickAddItemSubtitle}>
                              {`~${Math.round(itemData.estimatedWeightGrams)}g`}
                              {itemData.calories_per_100g ? ` (${Math.round(itemData.calories_per_100g * itemData.estimatedWeightGrams / 100)} kcal)` : ''}
                          </ListItem.Subtitle>
                      </ListItem.Content>
                      <View style={styles.quickAddItemActions}>
                         <TouchableOpacity onPress={() => handleEditQuickAddItem(index)} disabled={editingQuickAddItemIndex !== null || isActionDisabled} style={styles.quickAddActionButton}>
                              <Icon name="pencil" type="material-community" size={20} color={theme.colors.primary} />
                         </TouchableOpacity>
                          <Icon
                              name={isSelected ? "checkbox-marked" : "checkbox-blank-outline"}
                              type="material-community"
                              color={isSelected ? theme.colors.success : theme.colors.grey3}
                              size={24}
                              containerStyle={styles.quickAddCheckbox}
                              />
                      </View>
                  </ListItem>
              );
          }

          case "quickAddEditForm": {
               const { index } = item;
               return (
                  <View style={styles.quickAddEditContainer}>
                      <Input
                          label="Food Name"
                          placeholder="Enter food name"
                          value={editedFoodName}
                          onChangeText={setEditedFoodName}
                          inputContainerStyle={styles.quickAddEditInput}
                          inputStyle={{fontSize: 15}}
                          labelStyle={{fontSize: 13, fontWeight:'normal', color: theme.colors.grey2}}
                          disabled={isActionDisabled}
                      />
                      <Input
                          label="Estimated Grams"
                          placeholder="Enter grams"
                          value={editedGrams}
                          onChangeText={handleQuickAddGramsChange}
                          keyboardType="numeric"
                          inputContainerStyle={styles.quickAddEditInput}
                           inputStyle={{fontSize: 15}}
                          labelStyle={{fontSize: 13, fontWeight:'normal', color: theme.colors.grey2}}
                          rightIcon={<Text style={styles.unitText}>g</Text>}
                          disabled={isActionDisabled}
                      />
                      <View style={styles.quickAddEditButtons}>
                          <Button title="Cancel" type="outline" onPress={handleCancelQuickAddItemEdit} buttonStyle={styles.quickAddEditButton} titleStyle={styles.quickAddEditButtonTitle} disabled={isActionDisabled} />
                          <Button title="Save" onPress={handleSaveQuickAddItemEdit} buttonStyle={[styles.quickAddEditButton, {backgroundColor: theme.colors.primary}]} titleStyle={[styles.quickAddEditButtonTitle, {color: theme.colors.white}]} disabled={isActionDisabled}/>
                      </View>
                  </View>
               );
          }

          case "spacer":
              return <View style={{ height: item.height }} />;

          default:
              return null;
      }
  }, [
      // IMPORTANT: Keep ALL dependencies used inside the switch cases here
      search, updateSearch, isActionDisabled, modalMode, recentFoods, screenWidth, selectedFood, foodIcons, setFoodIcons,
      handleInternalSelectFood, filteredFoods, unitMode, setUnitMode, isEditMode, servingSizeSuggestions, setGrams, grams,
      autoInput, setAutoInput, handleEstimateGrams, isAiLoading, isAiButtonDisabled, theme, styles,
      quickAddLoading, quickAddItems, editingQuickAddItemIndex, selectedQuickAddIndices, handleToggleQuickAddItem, handleEditQuickAddItem,
      editedFoodName, setEditedFoodName, editedGrams, handleQuickAddGramsChange, handleCancelQuickAddItemEdit, handleSaveQuickAddItemEdit,
      handleAddMultipleEntries, pickImageAndAnalyze, addToRecentFoods, handleAddEntry, // Added missing function dependencies
  ]);

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
                  {/* Header (Stays Fixed) */}
                  <View style={styles.header}>
                      <TouchableOpacity onPress={!isActionDisabled ? toggleOverlay : undefined} style={styles.closeIconTouchable} disabled={isActionDisabled}>
                          <Icon name="close" type="material" size={28} color={isActionDisabled ? theme.colors.grey3 : theme.colors.text} />
                      </TouchableOpacity>

                      <Text h4 h4Style={[styles.overlayTitle, isEditMode && modalMode === "normal" && styles.editModeTitle]} numberOfLines={1} ellipsizeMode="tail">
                          {modalMode === "quickAddSelect"
                              ? editingQuickAddItemIndex !== null ? "Edit Item" : "Select Items to Add"
                              : isEditMode ? "Edit Entry" : "Add Entry"
                          }
                      </Text>

                      {modalMode === "normal" && (
                          <>
                              {!isEditMode && (
                                  <TouchableOpacity onPress={handleQuickAddImage} disabled={isQuickAddImageButtonDisabled} style={styles.headerIcon}>
                                      {(quickAddLoading && modalMode === 'normal') ? (
                                          <ActivityIndicator size="small" color={theme.colors.primary} />
                                      ) : (
                                          <Icon name="camera-burst" type="material-community" size={26} color={isQuickAddImageButtonDisabled ? theme.colors.grey3 : theme.colors.primary} />
                                      )}
                                  </TouchableOpacity>
                              )}
                              <Button
                                  title={isEditMode ? "Update" : "Add"}
                                  onPress={handleAddOrUpdateSingleEntry}
                                  disabled={isAddButtonDisabled}
                                  buttonStyle={[styles.addButton, isEditMode && styles.updateButton]}
                                  titleStyle={styles.buttonTitle}
                                  loading={isAiLoading && unitMode === 'auto'}
                              />
                          </>
                      )}
                      {modalMode === "quickAddSelect" && !isEditMode && (
                          editingQuickAddItemIndex === null ? (
                              <Button
                                  title={`Add ${selectedQuickAddIndices.size}`}
                                  onPress={handleConfirmQuickAdd}
                                  disabled={isQuickAddConfirmDisabled}
                                  buttonStyle={[styles.addButton, { backgroundColor: theme.colors.success }]}
                                  titleStyle={styles.buttonTitle}
                                  loading={quickAddLoading}
                              />
                          ) : (
                              <View style={{ width: 70, marginLeft: 5}} /> // Placeholder to balance header
                          )
                      )}
                  </View>

                  {/* --- Content Area (Now a FlatList) --- */}
                  <FlatList
                      data={listData}
                      renderItem={renderListItem}
                      keyExtractor={(item) => item.key}
                      extraData={{ // All state that renderListItem depends on indirectly
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

// --- Styles ---
const useStyles = makeStyles((theme) => ({
  overlayContainer: {
      backgroundColor: "transparent", width: "90%", maxWidth: 500, padding: 0,
      borderRadius: 15, shadowColor: "#000", shadowOffset: { width: 0, height: 3 },
      shadowOpacity: 0.2, shadowRadius: 5, elevation: 6, overflow: "hidden",
      maxHeight: Dimensions.get("window").height * 0.85,
  },
  overlayStyle: {
      width: "100%", height: "100%", borderRadius: 15, padding: 15, paddingBottom: 0,
      backgroundColor: theme.colors.background, flex: 1,
  },
  keyboardAvoidingView: { width: "100%", height: "100%" },
  header: {
      flexDirection: "row", justifyContent: "space-between", alignItems: "center",
      marginBottom: 15, paddingHorizontal: 0,
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
  flatListContainer: { flex: 1, width: '100%' },
  flatListContentContainer: { paddingBottom: 30 },
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
      backgroundColor: theme.colors.grey5, alignItems: "center", justifyContent: "center",
  },
  listItemTitle: { color: theme.colors.text, fontSize: 16, fontWeight: "500" },
  noFoodsText: {
      color: theme.colors.grey2, fontStyle: "italic", textAlign: "center",
      marginTop: 20, marginBottom: 10, paddingHorizontal: 10,
  },
  amountSection: {
      marginTop: 10, borderTopWidth: 1, borderTopColor: theme.colors.divider,
      paddingTop: 15, paddingHorizontal: 0,
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
      borderColor: theme.colors.primary, borderWidth: 1,
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
  autoInputRow: { flexDirection: "row", alignItems: "center", paddingHorizontal: 0 },
  autoInputContainer: { flex: 1, paddingHorizontal: 0, marginRight: 10 },
  autoInputField: { height: 40 },
  aiButton: {
      backgroundColor: theme.colors.secondary, borderRadius: 20, width: 40, height: 40,
      padding: 0, justifyContent: "center", alignItems: "center", minWidth: 40,
  },
  quickAddHeader: {
      flexDirection: "row", justifyContent: "space-between", alignItems: "center",
      marginBottom: 10, paddingHorizontal: 5, borderBottomWidth: 1,
      borderBottomColor: theme.colors.divider, paddingBottom: 8,
  },
  centeredContent: {
      alignItems: 'center', justifyContent: 'center', padding: 20, minHeight: 150,
  },
  loadingText: { marginTop: 10, color: theme.colors.text, fontSize: 16, fontWeight: "500" },
  quickAddItemContainer: {
      paddingVertical: 10, paddingHorizontal: 5,
      backgroundColor: theme.colors.background,
  },
   quickAddItemSelected: {
      backgroundColor: theme.colors.grey5, borderRadius: 8,
  },
  quickAddItemContent: { flex: 1, marginRight: 10 },
   quickAddItemTitle: { color: theme.colors.text, fontWeight: '500', fontSize: 15 },
  quickAddItemSubtitle: { color: theme.colors.grey1, fontSize: 13, marginTop: 2 },
  quickAddItemActions: { flexDirection: 'row', alignItems: 'center' },
  quickAddActionButton: { padding: 5, marginRight: 10 },
  quickAddCheckbox: {},
   quickAddEditContainer: {
      padding: 10, marginVertical: 5, backgroundColor: theme.colors.grey5,
      borderRadius: 8, borderWidth: 1, borderColor: theme.colors.primary,
  },
  quickAddEditInput: {
      borderBottomWidth: 1, borderColor: theme.colors.grey3,
      paddingHorizontal: 0, marginBottom: 5,
  },
   quickAddEditButtons: {
      flexDirection: 'row', justifyContent: 'flex-end', marginTop: 10,
  },
  quickAddEditButton: {
      marginLeft: 10, paddingHorizontal: 15, minWidth: 80, borderRadius: 15,
  },
  quickAddEditButtonTitle: { fontSize: 14, fontWeight: '600' }
}));

export default AddEntryModal;
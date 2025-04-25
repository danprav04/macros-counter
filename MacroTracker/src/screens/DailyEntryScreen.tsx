// src/screens/DailyEntryScreen.tsx
// src/screens/DailyEntryScreen.tsx (Update icon fetching)
import React, { useState, useEffect, useCallback, useMemo } from "react";
import {
  View,
  FlatList,
  Alert,
  Platform,
  Image,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
} from "react-native";
import { DailyEntry, DailyEntryItem } from "../types/dailyEntry";
import { Food } from "../types/food";
import { getFoods } from "../services/foodService";
import {
  saveDailyEntries,
  loadDailyEntries,
  loadSettings,
} from "../services/storageService";
import { formatDateReadable, getTodayDateString } from "../utils/dateUtils";
import { isValidNumberInput } from "../utils/validationUtils";
import DailyProgress from "../components/DailyProgress";
import {
  Button,
  Text,
  ListItem,
  FAB,
  makeStyles,
  useTheme,
  Divider,
  Input,
} from "@rneui/themed";
import DateTimePicker from "@react-native-community/datetimepicker";
import { addDays, subDays, parseISO, formatISO } from "date-fns";
import { Icon } from "@rneui/base";
import { SafeAreaView } from "react-native-safe-area-context";
import AddEntryModal from "../components/AddEntryModal";
import "react-native-get-random-values";
import Toast from "react-native-toast-message";
import { useFocusEffect } from "@react-navigation/native";
import { getFoodIconUrl } from "../utils/iconUtils"; // Uses backend service now, but keeps local cache

// Interface for daily goals structure
interface DailyGoals {
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
}

const DailyEntryScreen: React.FC = () => {
  // State variables (most remain the same)
  const [dailyEntries, setDailyEntries] = useState<DailyEntry[]>([]);
  const [selectedDate, setSelectedDate] = useState<string>(
    getTodayDateString()
  );
  const [foods, setFoods] = useState<Food[]>([]);
  const [selectedFood, setSelectedFood] = useState<Food | null>(null);
  const [grams, setGrams] = useState("");
  const [isOverlayVisible, setIsOverlayVisible] = useState(false);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [dailyGoals, setDailyGoals] = useState<DailyGoals>({
    calories: 2000,
    protein: 50,
    carbs: 200,
    fat: 70,
  });
  const [editingIndex, setEditingIndex] = useState<number | null>(null); // Inline edit original index
  const [tempGrams, setTempGrams] = useState(""); // Inline edit temp grams
  const [search, setSearch] = useState("");
  const [editIndex, setEditIndex] = useState<number | null>(null); // Modal edit reversed index
  const [foodIcons, setFoodIcons] = useState<{
    [foodName: string]: string | null | undefined;
  }>({}); // Cache state: undefined=not_checked, null=failed/no_icon, string=url

  const { theme } = useTheme();
  const styles = useStyles();

  // --- Data Loading and Icon Fetching ---

  const loadData = useCallback(async () => {
    try {
      const [loadedFoods, loadedEntries, loadedSettings] = await Promise.all([
        getFoods(),
        loadDailyEntries(),
        loadSettings(),
      ]);

      if (loadedSettings.dailyGoals) {
        setDailyGoals(loadedSettings.dailyGoals);
      }

      setFoods(loadedFoods);
      setDailyEntries(loadedEntries);

      // Trigger Icon Fetching for relevant foods (current day + all known)
      triggerIconFetches(loadedFoods, loadedEntries, selectedDate);
    } catch (error) {
      console.error("Error loading data:", error);
      Alert.alert("Error", "Failed to load necessary data.");
      setFoods([]);
      setDailyEntries([]);
    }
  }, [selectedDate]); // Re-run if selectedDate changes

  // Function to trigger icon fetches without blocking
  const triggerIconFetches = useCallback(
    (allFoods: Food[], allEntries: DailyEntry[], currentDate: string) => {
      const relevantFoodNames = new Set<string>();
      allFoods.forEach((f) => relevantFoodNames.add(f.name));
      const currentOriginalEntry = allEntries.find(
        (entry) => entry.date === currentDate
      );
      if (currentOriginalEntry) {
        currentOriginalEntry.items.forEach((item) =>
          relevantFoodNames.add(item.food.name)
        );
      }

      console.log(
        `Triggering icon fetches for ${relevantFoodNames.size} unique food names.`
      );

      relevantFoodNames.forEach((foodName) => {
        // Check if icon status is unknown (undefined) before fetching
        if (foodIcons[foodName] === undefined) {
          // Mark as loading immediately (optional visual cue could use this)
          // setFoodIcons(prev => ({ ...prev, [foodName]: undefined })); // Keep as undefined while loading

          // Fetch async, update state individually on resolve/reject
          getFoodIconUrl(foodName)
            .then((iconUrl) => {
              setFoodIcons((prevIcons) => ({
                ...prevIcons,
                [foodName]: iconUrl,
              })); // Store URL or null
            })
            .catch((error) => {
              console.warn(
                `Icon fetch failed for ${foodName} in background:`,
                error
              );
              // Ensure state reflects failure
              setFoodIcons((prevIcons) => ({ ...prevIcons, [foodName]: null }));
            });
        }
      });
    },
    [foodIcons]
  ); // Depend on foodIcons state to avoid re-fetching known icons

  // Load data when the screen comes into focus or selectedDate changes
  useFocusEffect(
    useCallback(() => {
      loadData(); // Will also trigger icon fetches
      return () => {
        // Cleanup
        setSearch("");
        setIsOverlayVisible(false);
        setEditingIndex(null);
        setTempGrams("");
      };
    }, [loadData]) // loadData dependency includes selectedDate
  );

  // --- List and Index Management ---
  const currentEntryItems = useMemo(() => {
    const entry = dailyEntries.find((e) => e.date === selectedDate);
    return entry ? [...entry.items].reverse() : [];
  }, [dailyEntries, selectedDate]);

  const getOriginalIndex = useCallback(
    (reversedIndex: number): number => {
      const entry = dailyEntries.find((e) => e.date === selectedDate);
      if (!entry || reversedIndex < 0 || reversedIndex >= entry.items.length) {
        return -1;
      }
      return entry.items.length - 1 - reversedIndex;
    },
    [dailyEntries, selectedDate]
  );

  // --- State Update Helper ---
  const updateAndSaveEntries = useCallback(
    async (updatedEntries: DailyEntry[]) => {
      const entryForSelectedDate = updatedEntries.find(
        (e) => e.date === selectedDate
      );
      console.log(
        `DailyEntryScreen: updateAndSaveEntries. Saving ${
          updatedEntries.length
        } total entries. Entry for ${selectedDate} contains ${
          entryForSelectedDate?.items?.length ?? 0
        } items.`
      );
      setDailyEntries(updatedEntries);
      try {
        await saveDailyEntries(updatedEntries);
      } catch (error) {
        console.error(
          "DailyEntryScreen: Failed to save updated entries:",
          error
        );
        Alert.alert("Save Error", "Could not save changes.");
        // Optionally revert state or reload data
      }
    },
    [selectedDate]
  ); // Depend on selectedDate? Maybe not needed here if only structure matters.

  // --- Inline Editing Handlers ---
  const handleStartEditing = (reversedIndex: number) => {
    const originalIndex = getOriginalIndex(reversedIndex);
    if (originalIndex === -1) return;
    const currentEntry = dailyEntries.find((e) => e.date === selectedDate);
    if (!currentEntry) return;
    setEditingIndex(originalIndex);
    setTempGrams(String(currentEntry.items[originalIndex].grams));
  };

  const handleSaveInlineEdit = useCallback(async () => {
    if (editingIndex === null) return;

    const trimmedGrams = tempGrams.trim();
    if (!isValidNumberInput(trimmedGrams) || parseFloat(trimmedGrams) <= 0) {
      Alert.alert(
        "Invalid Input",
        "Please enter a valid, positive number for grams."
      );
      return;
    }
    const newGramsValue = parseFloat(trimmedGrams);

    const updatedEntries = dailyEntries.map((entry) => {
      if (entry.date === selectedDate) {
        const updatedItems = entry.items.map((item, index) => {
          if (index === editingIndex) {
            return { ...item, grams: newGramsValue };
          }
          return item;
        });
        return { ...entry, items: updatedItems };
      }
      return entry;
    });

    await updateAndSaveEntries(updatedEntries);
    setEditingIndex(null);
    setTempGrams("");
  }, [
    editingIndex,
    tempGrams,
    dailyEntries,
    selectedDate,
    updateAndSaveEntries,
  ]);

  const handleCancelInlineEdit = () => {
    setEditingIndex(null);
    setTempGrams("");
  };
  // --- End Inline Editing ---

  // --- Add/Update/Remove Entry Handlers ---
  const handleSingleEntryAction = useCallback(async () => {
    if (!selectedFood || !selectedFood.id) {
      Alert.alert("Food Not Selected", "Please select a valid food item.");
      return;
    }
    const trimmedGrams = grams.trim();
    if (!isValidNumberInput(trimmedGrams) || parseFloat(trimmedGrams) <= 0) {
      Alert.alert(
        "Invalid Amount",
        "Please enter a valid positive number for grams."
      );
      return;
    }
    const numericGrams = parseFloat(trimmedGrams);
    const entryItem: DailyEntryItem = {
      food: selectedFood,
      grams: numericGrams,
    };

    const existingEntryIndex = dailyEntries.findIndex(
      (entry) => entry.date === selectedDate
    );
    let updatedEntries: DailyEntry[];

    if (existingEntryIndex > -1) {
      const existingEntry = dailyEntries[existingEntryIndex];
      let updatedItems;
      if (editIndex !== null) {
        // Modal Edit Mode
        const originalEditIndex = getOriginalIndex(editIndex);
        if (originalEditIndex === -1) {
          console.error("Error updating entry: Could not find original index.");
          setIsOverlayVisible(false);
          return;
        }
        updatedItems = existingEntry.items.map((item, index) =>
          index === originalEditIndex ? entryItem : item
        );
      } else {
        // Adding new single item
        updatedItems = [...existingEntry.items, entryItem];
      }
      const updatedEntry = { ...existingEntry, items: updatedItems };
      updatedEntries = dailyEntries.map((entry) =>
        entry.date === selectedDate ? updatedEntry : entry
      );
    } else {
      // New entry for the date
      const newDailyEntry: DailyEntry = {
        date: selectedDate,
        items: [entryItem],
      };
      updatedEntries = [...dailyEntries, newDailyEntry];
      updatedEntries.sort((a, b) => a.date.localeCompare(b.date));
    }

    await updateAndSaveEntries(updatedEntries);

    // Trigger icon fetch for the added/edited food if needed
    if (foodIcons[selectedFood.name] === undefined) {
      triggerIconFetches([selectedFood], [], selectedDate); // Pass only the relevant food
    }

    setSelectedFood(null);
    setGrams("");
    setEditIndex(null);
    setIsOverlayVisible(false);
    setSearch("");
  }, [
    selectedFood,
    grams,
    editIndex,
    dailyEntries,
    selectedDate,
    getOriginalIndex,
    updateAndSaveEntries,
    foodIcons,
    triggerIconFetches,
  ]);

  // --- NEW: Handle Adding Multiple Entries ---
  const handleAddMultipleEntries = useCallback(
    async (entriesToAdd: { food: Food; grams: number }[]) => {
      console.log(
        "DailyEntryScreen: handleAddMultipleEntries START - Received:",
        entriesToAdd.length,
        "items"
      );
      try {
        if (!entriesToAdd || entriesToAdd.length === 0) return;

        const newItems: DailyEntryItem[] = entriesToAdd.map((entry) => ({
          food: entry.food, // Contains unique ID generated in modal
          grams: entry.grams,
        }));
        console.log(
          `DailyEntryScreen: Mapped to ${newItems.length} DailyEntryItems for ${selectedDate}`
        );

        const existingEntryIndex = dailyEntries.findIndex(
          (entry) => entry.date === selectedDate
        );
        let updatedEntries: DailyEntry[];

        if (existingEntryIndex > -1) {
          console.log(
            `DailyEntryScreen: Appending to existing entry for ${selectedDate}.`
          );
          const existingEntry = dailyEntries[existingEntryIndex];
          const updatedItems = [...existingEntry.items, ...newItems];
          const updatedEntry = { ...existingEntry, items: updatedItems };
          updatedEntries = dailyEntries.map((entry, index) =>
            index === existingEntryIndex ? updatedEntry : entry
          );
        } else {
          console.log(
            `DailyEntryScreen: Creating new entry for ${selectedDate}.`
          );
          const newDailyEntry: DailyEntry = {
            date: selectedDate,
            items: newItems,
          };
          updatedEntries = [...dailyEntries, newDailyEntry];
          updatedEntries.sort((a, b) => a.date.localeCompare(b.date));
        }

        await updateAndSaveEntries(updatedEntries);
        console.log("DailyEntryScreen: updateAndSaveEntries completed.");

        // Trigger icon fetches for the newly added foods
        const foodsToFetchIconsFor = newItems.map((item) => item.food);
        triggerIconFetches(foodsToFetchIconsFor, [], selectedDate);

        Toast.show({
          type: "success",
          text1: `${entriesToAdd.length} item(s) added to ${formatDateReadable(
            selectedDate
          )}`,
          position: "bottom",
          visibilityTime: 3000,
        });

        // Close the modal AFTER state update and save
        setIsOverlayVisible(false);
        setSelectedFood(null);
        setGrams("");
        setEditIndex(null);
        setSearch("");
      } catch (error) {
        console.error(
          "!!!!! CRITICAL ERROR inside handleAddMultipleEntries !!!!!",
          error
        );
        Alert.alert(
          "Quick Add Error",
          `Failed to process items. Error: ${
            error instanceof Error ? error.message : String(error)
          }`
        );
        // Close modal even on error? Or leave it open? Let's close it.
        setIsOverlayVisible(false);
      }
    },
    [dailyEntries, selectedDate, updateAndSaveEntries, triggerIconFetches]
  );
  // --- End NEW FUNCTION ---

  const handleSelectFood = (item: Food | null) => {
    setSelectedFood(item);
  };

  const handleRemoveEntry = useCallback(
    async (reversedIndex: number) => {
      const originalIndex = getOriginalIndex(reversedIndex);
      if (originalIndex === -1) return;

      const currentEntry = dailyEntries.find((e) => e.date === selectedDate);
      if (!currentEntry || originalIndex >= currentEntry.items.length) return;

      const itemToRemove = currentEntry.items[originalIndex];
      const updatedItems = currentEntry.items.filter(
        (_, i) => i !== originalIndex
      );
      let finalEntries: DailyEntry[];

      if (updatedItems.length === 0) {
        finalEntries = dailyEntries.filter(
          (entry) => entry.date !== selectedDate
        );
      } else {
        const updatedEntry = { ...currentEntry, items: updatedItems };
        finalEntries = dailyEntries.map((entry) =>
          entry.date === selectedDate ? updatedEntry : entry
        );
      }

      await updateAndSaveEntries(finalEntries);

      Toast.show({
        type: "info",
        text1: `${itemToRemove.food.name} deleted`,
        text2: "Tap here to undo",
        position: "bottom",
        bottomOffset: 80,
        visibilityTime: 4000,
        onPress: () =>
          handleUndoRemoveEntry(itemToRemove, selectedDate, originalIndex),
      });
    },
    [dailyEntries, selectedDate, getOriginalIndex, updateAndSaveEntries]
  ); // Added handleUndoRemoveEntry dependency

  const handleUndoRemoveEntry = useCallback(
    async (
      itemToRestore: DailyEntryItem,
      entryDate: string,
      originalIndex: number
    ) => {
      console.log(
        `Undoing removal of ${itemToRestore.food.name} at index ${originalIndex} on ${entryDate}`
      );
      const existingEntryIndex = dailyEntries.findIndex(
        (e) => e.date === entryDate
      );
      let updatedEntries;

      if (existingEntryIndex > -1) {
        const entryToUpdate = dailyEntries[existingEntryIndex];
        const updatedItems = [...entryToUpdate.items];
        updatedItems.splice(originalIndex, 0, itemToRestore);
        const restoredEntry = { ...entryToUpdate, items: updatedItems };
        updatedEntries = dailyEntries.map((entry, index) =>
          index === existingEntryIndex ? restoredEntry : entry
        );
      } else {
        const newEntry: DailyEntry = {
          date: entryDate,
          items: [itemToRestore],
        };
        updatedEntries = [...dailyEntries, newEntry];
        updatedEntries.sort((a, b) => a.date.localeCompare(b.date));
      }

      await updateAndSaveEntries(updatedEntries);
      Toast.hide();
      Toast.show({
        type: "success",
        text1: "Entry restored!",
        visibilityTime: 1500,
        position: "bottom",
      });
    },
    [dailyEntries, updateAndSaveEntries]
  ); // Ensure dependencies are correct

  const updateSearch = (search: string) => setSearch(search);

  // --- Modal Toggle Logic ---
  const toggleOverlay = useCallback(
    (
      itemToEdit: DailyEntryItem | null = null,
      reversedIndex: number | null = null
    ) => {
      if (itemToEdit && reversedIndex !== null) {
        // Setup for MODAL EDIT
        console.log(
          `Opening modal to edit item at reversed index ${reversedIndex}`
        );
        setSelectedFood(itemToEdit.food);
        setGrams(String(itemToEdit.grams));
        setEditIndex(reversedIndex);
        setIsOverlayVisible(true);
      } else {
        // Setup for ADD or Closing
        console.log("Toggling modal for Add or Closing.");
        setSelectedFood(null);
        setGrams("");
        setEditIndex(null);
        setSearch(""); // Clear search on close/add open
        setIsOverlayVisible((current) => !current); // Toggle visibility
      }
    },
    []
  ); // No dependencies needed if it only manipulates state

  const handleEditEntryViaModal = (
    item: DailyEntryItem,
    reversedIndex: number
  ) => {
    toggleOverlay(item, reversedIndex);
  };
  // --- End Modal Toggle ---

  // --- Date Navigation Handlers ---
  const handleDateChange = useCallback(
    (event: any, selectedDateValue?: Date) => {
      const isAndroidDismiss =
        Platform.OS === "android" && event.type === "dismissed";
      setShowDatePicker(Platform.OS === "ios");

      if (!isAndroidDismiss && event.type === "set" && selectedDateValue) {
        const formattedDate = formatISO(selectedDateValue, {
          representation: "date",
        });
        if (formattedDate !== selectedDate) {
          console.log(`Date changed to: ${formattedDate}`);
          setSelectedDate(formattedDate); // This will trigger useFocusEffect -> loadData -> triggerIconFetches
          setEditingIndex(null); // Cancel inline edit when changing date
          setTempGrams("");
        }
      } else if (Platform.OS === "android") {
        setShowDatePicker(false);
      }
    },
    [selectedDate]
  ); // Depend on selectedDate to compare

  const handlePreviousDay = useCallback(() => {
    try {
      const currentDate = parseISO(selectedDate);
      const newDate = subDays(currentDate, 1);
      setSelectedDate(formatISO(newDate, { representation: "date" }));
      setEditingIndex(null);
      setTempGrams(""); // Cancel inline edit
    } catch (e) {
      console.error("Error parsing date:", selectedDate, e);
    }
  }, [selectedDate]);

  const handleNextDay = useCallback(() => {
    try {
      const currentDate = parseISO(selectedDate);
      const newDate = addDays(currentDate, 1);
      setSelectedDate(formatISO(newDate, { representation: "date" }));
      setEditingIndex(null);
      setTempGrams(""); // Cancel inline edit
    } catch (e) {
      console.error("Error parsing date:", selectedDate, e);
    }
  }, [selectedDate]);
  // --- End Date Navigation ---

  // --- Totals Calculation ---
  const calculateTotals = useMemo(() => {
    const currentOriginalEntry = dailyEntries.find(
      (entry) => entry.date === selectedDate
    );
    let totals = {
      totalCalories: 0,
      totalProtein: 0,
      totalCarbs: 0,
      totalFat: 0,
    };

    if (currentOriginalEntry) {
      currentOriginalEntry.items.forEach((item) => {
        if (item.food) {
          // Ensure food object exists
          totals.totalCalories += (item.food.calories / 100) * item.grams || 0;
          totals.totalProtein += (item.food.protein / 100) * item.grams || 0;
          totals.totalCarbs += (item.food.carbs / 100) * item.grams || 0;
          totals.totalFat += (item.food.fat / 100) * item.grams || 0;
        }
      });
    }

    // Round totals at the end
    return {
      totalCalories: Math.round(totals.totalCalories),
      totalProtein: Math.round(totals.totalProtein),
      totalCarbs: Math.round(totals.totalCarbs),
      totalFat: Math.round(totals.totalFat),
    };
  }, [dailyEntries, selectedDate]);

  // --- Render ---
  return (
    <SafeAreaView style={styles.container} edges={["top", "left", "right"]}>
      {/* Date Navigation Header */}
      <View style={styles.dateNavigation}>
        <Button
          type="clear"
          onPress={handlePreviousDay}
          icon={
            <Icon
              name="chevron-back-outline"
              type="ionicon"
              color={theme.colors.text}
              size={28}
            />
          }
          buttonStyle={styles.navButton}
        />
        <TouchableOpacity onPress={() => setShowDatePicker(true)}>
          <Text h4 style={styles.dateText}>
            {" "}
            {formatDateReadable(selectedDate)}{" "}
          </Text>
        </TouchableOpacity>
        <Button
          type="clear"
          onPress={handleNextDay}
          icon={
            <Icon
              name="chevron-forward-outline"
              type="ionicon"
              color={theme.colors.text}
              size={28}
            />
          }
          buttonStyle={styles.navButton}
        />
      </View>

      {/* Date Picker */}
      {showDatePicker && (
        <DateTimePicker
          value={parseISO(selectedDate)}
          mode="date"
          display={Platform.OS === "ios" ? "spinner" : "default"}
          onChange={handleDateChange}
          // maximumDate={new Date()} // Optional constraint
        />
      )}

      {/* Progress Bars */}
      <DailyProgress
        calories={calculateTotals.totalCalories}
        protein={calculateTotals.totalProtein}
        carbs={calculateTotals.totalCarbs}
        fat={calculateTotals.totalFat}
        goals={dailyGoals}
      />
      <Divider style={styles.divider} />

      <Text h4 style={[styles.sectionTitle, { color: theme.colors.text }]}>
        {" "}
        Today's Entries{" "}
      </Text>

      {/* Entries List */}
      <FlatList
        data={currentEntryItems}
        keyExtractor={(item, index) =>
          `entry-${item.food.id}-${index}-${item.grams}`
        } // Use food.id
        renderItem={({ item, index: reversedIndex }) => {
          const originalIndex = getOriginalIndex(reversedIndex);
          const isInlineEditing = editingIndex === originalIndex;
          const iconStatus = foodIcons[item.food.name]; // undefined, null, or string URL
          const isLoadingIcon = iconStatus === undefined;

          return (
            <ListItem.Swipeable
              bottomDivider
              leftContent={(reset) => (
                <Button
                  title="Edit"
                  onPress={() => {
                    handleEditEntryViaModal(item, reversedIndex);
                    reset();
                  }}
                  icon={{ name: "edit", color: "white" }}
                  buttonStyle={{
                    minHeight: "100%",
                    backgroundColor: theme.colors.warning,
                  }}
                />
              )}
              rightContent={(reset) => (
                <Button
                  title="Delete"
                  onPress={() => {
                    handleRemoveEntry(reversedIndex);
                    reset();
                  }}
                  icon={{ name: "delete", color: "white" }}
                  buttonStyle={{
                    minHeight: "100%",
                    backgroundColor: theme.colors.error,
                  }}
                />
              )}
              containerStyle={{ backgroundColor: theme.colors.background }}
            >
              {/* Icon Rendering Logic */}
              {isLoadingIcon ? (
                <ActivityIndicator
                  size="small"
                  color={theme.colors.grey3}
                  style={styles.foodIcon}
                />
              ) : iconStatus ? ( // Check if iconStatus is a non-empty string (URL)
                <Image
                  source={{ uri: iconStatus }}
                  style={styles.foodIcon}
                  onError={() => {
                    // Handle Image component specific load error
                    console.warn(
                      `Image component failed to load: ${iconStatus}`
                    );
                    setFoodIcons((prev) => ({
                      ...prev,
                      [item.food.name]: null,
                    })); // Mark as null on error
                  }}
                />
              ) : (
                // Icon fetch failed or no icon found (iconStatus is null)
                <Icon
                  name="restaurant-outline"
                  type="ionicon"
                  color={theme.colors.grey3}
                  containerStyle={styles.defaultIconContainer}
                />
              )}

              {/* Content: Title and Subtitle/Inline Edit */}
              <ListItem.Content>
                <ListItem.Title style={styles.listItemTitle}>
                  {" "}
                  {item.food.name}{" "}
                </ListItem.Title>
                {isInlineEditing ? (
                  <View style={styles.inlineEditContainer}>
                    <Input
                      value={tempGrams}
                      onChangeText={setTempGrams}
                      keyboardType="numeric"
                      containerStyle={styles.inlineInputContainer}
                      inputContainerStyle={styles.inlineInputInnerContainer}
                      inputStyle={styles.inlineInput}
                      autoFocus
                      selectTextOnFocus
                      maxLength={6}
                      onSubmitEditing={handleSaveInlineEdit} // Use callback directly
                      // onBlur={handleSaveInlineEdit} // Consider if needed
                    />
                    <Text style={styles.inlineInputSuffix}>g</Text>
                    <Button
                      type="clear"
                      onPress={handleSaveInlineEdit}
                      icon={
                        <Icon
                          name="checkmark-circle"
                          type="ionicon"
                          color={theme.colors.success}
                          size={24}
                        />
                      }
                      containerStyle={styles.inlineButtonContainer}
                    />
                    <Button
                      type="clear"
                      onPress={handleCancelInlineEdit}
                      icon={
                        <Icon
                          name="close-circle"
                          type="ionicon"
                          color={theme.colors.error}
                          size={24}
                        />
                      }
                      containerStyle={styles.inlineButtonContainer}
                    />
                  </View>
                ) : (
                  <ListItem.Subtitle
                    style={styles.listItemSubtitle}
                    onPress={() => handleStartEditing(reversedIndex)}
                  >
                    {`${item.grams}g • ${Math.round(
                      (item.food.calories / 100) * item.grams
                    )} kcal`}
                  </ListItem.Subtitle>
                )}
              </ListItem.Content>
              {!isInlineEditing && (
                <ListItem.Chevron color={theme.colors.grey3} />
              )}
            </ListItem.Swipeable>
          );
        }}
        ListEmptyComponent={
          <View style={styles.emptyListContainer}>
            <Icon
              name="leaf-outline"
              type="ionicon"
              size={40}
              color={theme.colors.grey3}
            />
            <Text style={styles.emptyListText}>
              No entries for this day yet.
            </Text>
            <Text style={styles.emptyListSubText}>
              Tap the '+' button to add food.
            </Text>
          </View>
        }
        initialNumToRender={10}
        maxToRenderPerBatch={5}
        windowSize={11}
      />

      {/* FAB */}
      <FAB
        icon={<Icon name="add" color="white" />}
        color={theme.colors.primary}
        onPress={() => toggleOverlay()} // Pass no args for 'add' mode
        placement="right"
        size="large"
        style={styles.fab}
      />

      {/* Add/Edit Modal */}
      <AddEntryModal
        isVisible={isOverlayVisible}
        toggleOverlay={toggleOverlay}
        selectedFood={selectedFood}
        grams={grams}
        setGrams={setGrams}
        foods={foods} // Pass local food list for search
        handleAddEntry={handleSingleEntryAction} // Use callback
        handleAddMultipleEntries={handleAddMultipleEntries} // Use callback
        handleSelectFood={handleSelectFood}
        search={search}
        updateSearch={updateSearch}
        isEditMode={editIndex !== null} // Pass boolean for modal edit mode
        // initialGrams removed
      />
    </SafeAreaView>
  );
};

// Styles definition using makeStyles (Keep existing styles)
const useStyles = makeStyles((theme) => ({
  container: { flex: 1, backgroundColor: theme.colors.background },
  dateNavigation: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 8,
    paddingHorizontal: 5,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.divider,
  },
  navButton: { paddingHorizontal: 8 },
  dateText: {
    fontSize: 18,
    fontWeight: "bold",
    color: theme.colors.text,
    textAlign: "center",
    paddingVertical: 5,
  },
  foodIcon: {
    // Covers loading indicator, image, and container size
    width: 40,
    height: 40,
    marginRight: 15,
    borderRadius: 20,
    resizeMode: "contain",
    backgroundColor: theme.colors.grey5,
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
  defaultIconContainer: {
    // Used when iconStatus is null
    width: 40,
    height: 40,
    marginRight: 15,
    borderRadius: 20,
    backgroundColor: theme.colors.grey5,
    alignItems: "center",
    justifyContent: "center",
  },
  listItemTitle: { color: theme.colors.text, fontWeight: "bold", fontSize: 16 },
  listItemSubtitle: { color: theme.colors.grey1, fontSize: 14, marginTop: 3 },
  divider: { marginVertical: 10 },
  sectionTitle: {
    marginTop: 15,
    marginBottom: 8,
    paddingHorizontal: 15,
    fontWeight: "600",
    fontSize: 18,
    color: theme.colors.grey1,
  },
  fab: { position: "absolute", margin: 16, right: 10, bottom: 10 },
  emptyListContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 50,
    paddingHorizontal: 30,
  },
  emptyListText: {
    fontSize: 17,
    color: theme.colors.grey2,
    textAlign: "center",
    marginTop: 10,
  },
  emptyListSubText: {
    fontSize: 14,
    color: theme.colors.grey3,
    textAlign: "center",
    marginTop: 8,
  },
  inlineEditContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 5,
    width: "100%",
  },
  inlineInputContainer: { width: 80, height: 38, paddingHorizontal: 0 },
  inlineInputInnerContainer: {
    borderBottomWidth: 1,
    borderColor: theme.colors.primary,
    paddingHorizontal: 6,
    height: "100%",
    paddingVertical: 0,
    justifyContent: "center",
  },
  inlineInput: {
    fontSize: 14,
    color: theme.colors.text,
    textAlign: "right",
    paddingVertical: 0,
  },
  inlineInputSuffix: {
    fontSize: 14,
    color: theme.colors.grey1,
    marginLeft: 4,
    marginRight: 10,
  },
  inlineButtonContainer: {
    padding: 0,
    marginLeft: 0,
    minWidth: 30,
    justifyContent: "center",
    alignItems: "center",
  },
}));

export default DailyEntryScreen;

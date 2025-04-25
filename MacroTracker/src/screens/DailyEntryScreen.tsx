// src/screens/DailyEntryScreen.tsx
// This version aims to restore the visual appearance and interaction patterns
// of the provided "before" code, while retaining the underlying functional
// improvements (like improved state management, backend integration hooks,
// multi-add support) from the "current" code.

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
  Keyboard, // Import Keyboard
} from "react-native";
import { DailyEntry, DailyEntryItem } from "../types/dailyEntry";
import { Food } from "../types/food";
import { getFoods } from "../services/foodService"; // Still use foodService
import {
  saveDailyEntries,
  loadDailyEntries,
  loadSettings,
} from "../services/storageService";
import {
  formatDateReadable,
  getTodayDateString,
  formatDateISO, // Use ISO format internally
} from "../utils/dateUtils";
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
import DateTimePicker, { DateTimePickerEvent } from "@react-native-community/datetimepicker"; // Import event type
import { addDays, subDays, parseISO, formatISO, isValid } from "date-fns"; // Import isValid
import { Icon } from "@rneui/base";
import { SafeAreaView } from "react-native-safe-area-context";
import AddEntryModal from "../components/AddEntryModal";
import "react-native-get-random-values"; // Ensure this is imported before uuid
import Toast from "react-native-toast-message";
import { useFocusEffect } from "@react-navigation/native";
import { getFoodIconUrl } from "../utils/iconUtils"; // Use the refactored icon util

// Interface for daily goals structure (remains the same)
interface DailyGoals {
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
}

const DailyEntryScreen: React.FC = () => {
  // State variables - Combining states from both versions where necessary
  const [dailyEntries, setDailyEntries] = useState<DailyEntry[]>([]);
  const [selectedDate, setSelectedDate] = useState<string>(getTodayDateString()); // YYYY-MM-DD format
  const [foods, setFoods] = useState<Food[]>([]); // All available foods
  const [selectedFood, setSelectedFood] = useState<Food | null>(null); // For modal
  const [grams, setGrams] = useState(""); // For modal input
  const [isOverlayVisible, setIsOverlayVisible] = useState(false);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [dailyGoals, setDailyGoals] = useState<DailyGoals>({
    calories: 2000, protein: 150, carbs: 200, fat: 70, // Example goals
  });
  const [editingIndex, setEditingIndex] = useState<number | null>(null); // *Inline* edit ORIGINAL index
  const [tempGrams, setTempGrams] = useState(""); // *Inline* edit temporary grams
  const [search, setSearch] = useState(""); // Modal search term
  // *** Reverted State Variable: Use 'editIndex' for MODAL edit index as per "before" code ***
  const [editIndex, setEditIndex] = useState<number | null>(null); // *Modal* edit REVERSED index
  const [foodIcons, setFoodIcons] = useState<{ [foodName: string]: string | null | undefined }>({}); // Cache: name -> url | null | undefined
  const [isLoadingData, setIsLoadingData] = useState(true); // Initial data load state
  const [isSaving, setIsSaving] = useState(false); // Saving state

  const { theme } = useTheme();
  const styles = useStyles(); // Use the styles from the "before" code (pasted below)

  // --- Data Loading and Icon Fetching (Uses improved logic) ---
  const loadData = useCallback(async () => {
    console.log(`DailyEntryScreen: Loading data for date: ${selectedDate}`);
    setIsLoadingData(true);
    try {
      const [loadedFoods, loadedEntries, loadedSettings] = await Promise.all([
        getFoods(),
        loadDailyEntries(),
        loadSettings(),
      ]);

      const currentGoals = loadedSettings?.dailyGoals ?? { calories: 2000, protein: 150, carbs: 200, fat: 70 };
      setDailyGoals(currentGoals);

      loadedFoods.sort((a, b) => a.name.localeCompare(b.name));
      setFoods(loadedFoods);

      setDailyEntries(loadedEntries);
      console.log(`DailyEntryScreen: Loaded ${loadedFoods.length} foods, ${loadedEntries.length} entry days.`);

      triggerIconFetches(loadedFoods, loadedEntries, selectedDate);
    } catch (error) {
      console.error("DailyEntryScreen: Error loading data:", error);
      Alert.alert("Load Error", "Failed to load necessary data.");
      setFoods([]);
      setDailyEntries([]);
      setDailyGoals({ calories: 0, protein: 0, carbs: 0, fat: 0 });
    } finally {
      setIsLoadingData(false);
    }
  }, [selectedDate]);

  const triggerIconFetches = useCallback((allFoods: Food[], allEntries: DailyEntry[], currentDate: string) => {
    const relevantFoodNames = new Set<string>();
    allFoods.forEach((f) => relevantFoodNames.add(f.name));
    const currentOriginalEntry = allEntries.find((entry) => entry.date === currentDate);
    if (currentOriginalEntry) {
      currentOriginalEntry.items.forEach((item) => {
        if (item.food?.name) {
          relevantFoodNames.add(item.food.name);
        }
      });
    }
    console.log(`DailyEntryScreen: Triggering icon fetches for ${relevantFoodNames.size} unique food names.`);
    relevantFoodNames.forEach((foodName) => {
      if (foodIcons[foodName] === undefined) {
        getFoodIconUrl(foodName)
          .then((iconUrl) => {
            setFoodIcons((prevIcons) => ({ ...prevIcons, [foodName]: iconUrl }));
          })
          .catch((error) => {
            console.warn(`Icon fetch failed for ${foodName} in background:`, error);
            setFoodIcons((prevIcons) => ({ ...prevIcons, [foodName]: null }));
          });
      }
    });
  }, [foodIcons]);

  useFocusEffect(
    useCallback(() => {
      loadData();
      return () => {
        console.log("DailyEntryScreen: Unfocused.");
        setSearch("");
        setIsOverlayVisible(false);
        setEditingIndex(null); // Clear inline edit
        setTempGrams("");
        setEditIndex(null); // Clear modal edit
      };
    }, [loadData])
  );

  // --- List and Index Management (Uses improved logic) ---
  const currentEntryItems = useMemo(() => {
    const entry = dailyEntries.find((e) => e.date === selectedDate);
    return entry ? [...entry.items].reverse() : [];
  }, [dailyEntries, selectedDate]);

  const getOriginalIndex = useCallback((reversedIndex: number): number => {
    const entry = dailyEntries.find((e) => e.date === selectedDate);
    if (!entry || reversedIndex < 0 || reversedIndex >= entry.items.length) {
      console.error(`getOriginalIndex: Invalid reversedIndex ${reversedIndex} for entry length ${entry?.items?.length}`);
      return -1;
    }
    return entry.items.length - 1 - reversedIndex;
  }, [dailyEntries, selectedDate]);

  // --- State Update Helper (Uses improved logic) ---
  const updateAndSaveEntries = useCallback(async (updatedEntries: DailyEntry[]) => {
    setIsSaving(true);
    const entryForSelectedDate = updatedEntries.find((e) => e.date === selectedDate);
    console.log(`DailyEntryScreen: updateAndSaveEntries called. Saving ${updatedEntries.length} total entries.`);
    console.log(`Entry for ${selectedDate} contains ${entryForSelectedDate?.items?.length ?? 0} items.`);
    setDailyEntries(updatedEntries);
    try {
      await saveDailyEntries(updatedEntries);
      console.log("DailyEntryScreen: Successfully saved updated entries to storage.");
    } catch (error) {
      console.error("DailyEntryScreen: Failed to save updated entries to storage:", error);
      Alert.alert("Save Error", "Could not save changes. Please try again.");
    } finally {
      setIsSaving(false);
    }
  }, [selectedDate]);

  // --- Inline Editing Handlers (Logic from 'before', adapted for state) ---
  const handleStartEditing = (reversedIndex: number) => {
     if (isSaving) return;
    const originalIndex = getOriginalIndex(reversedIndex);
    if (originalIndex === -1) return;

    const currentEntry = dailyEntries.find((e) => e.date === selectedDate);
    if (!currentEntry || !currentEntry.items[originalIndex]) return;

    console.log(`Starting inline edit for item at original index: ${originalIndex}`);
    setEditingIndex(originalIndex); // Store ORIGINAL index for inline
    setTempGrams(String(currentEntry.items[originalIndex].grams));
    setEditIndex(null); // Ensure modal edit state is cleared
    Keyboard.dismiss(); // Dismiss if opening edit overlay
  };

  const handleSaveInlineEdit = useCallback(async () => {
    if (editingIndex === null || isSaving) return;
    Keyboard.dismiss();

    const trimmedGrams = tempGrams.trim();
    if (!isValidNumberInput(trimmedGrams) || parseFloat(trimmedGrams) <= 0) {
      Alert.alert("Invalid Input", "Please enter a valid, positive number for grams.");
      return;
    }
    const newGramsValue = parseFloat(trimmedGrams);
    console.log(`Saving inline edit for index ${editingIndex} with grams: ${newGramsValue}`);

    const updatedEntries = dailyEntries.map((entry) => {
      if (entry.date === selectedDate) {
        const items = entry.items ?? [];
        const updatedItems = items.map((item, index) => {
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

  }, [editingIndex, tempGrams, dailyEntries, selectedDate, updateAndSaveEntries, isSaving]);

  const handleCancelInlineEdit = () => {
    console.log(`Canceling inline edit for index ${editingIndex}`);
    setEditingIndex(null);
    setTempGrams("");
    Keyboard.dismiss();
  };

  // --- Add/Update/Remove Entry Handlers (Using combined logic) ---
  // Handles single add/update from MODAL
  const handleSingleEntryAction = useCallback(async () => {
    if (isSaving) return;
    if (!selectedFood || !selectedFood.id) {
      Alert.alert("Food Not Selected", "Please select a valid food item.");
      return;
    }
    const trimmedGrams = grams.trim();
    if (!isValidNumberInput(trimmedGrams) || parseFloat(trimmedGrams) <= 0) {
      Alert.alert("Invalid Amount", "Please enter a valid positive number for grams.");
      return;
    }

    const numericGrams = parseFloat(trimmedGrams);
    const entryItem: DailyEntryItem = {
      food: selectedFood,
      grams: numericGrams,
    };

    // *** Use 'editIndex' for modal edit mode check (reverted variable name) ***
    const isEditMode = editIndex !== null;
    console.log(`handleSingleEntryAction: Mode=${isEditMode ? 'Edit' : 'Add'}, Food=${selectedFood.name}, Grams=${numericGrams}, ReversedIndex=${editIndex}`);

    const existingEntryIndex = dailyEntries.findIndex((entry) => entry.date === selectedDate);
    let updatedEntries: DailyEntry[];

    if (existingEntryIndex > -1) {
      const existingEntry = dailyEntries[existingEntryIndex];
      let updatedItems;
      if (isEditMode) {
        // --- Modal Edit Mode ---
        // *** Use 'editIndex' (reverted variable name) ***
        const originalEditIndex = getOriginalIndex(editIndex!);
        if (originalEditIndex === -1) {
          console.error("DailyEntryScreen: Error updating entry via modal - Could not find original index.");
          Alert.alert("Update Error", "An internal error occurred while trying to update the entry.");
          setIsOverlayVisible(false);
          setIsSaving(false);
          return;
        }
        console.log(`Updating item at original index ${originalEditIndex}`);
        updatedItems = existingEntry.items.map((item, index) =>
          index === originalEditIndex ? entryItem : item
        );
      } else {
        console.log("Adding new single item to existing date entry.");
        updatedItems = [...existingEntry.items, entryItem];
      }
      const updatedEntry = { ...existingEntry, items: updatedItems };
      updatedEntries = dailyEntries.map((entry, index) =>
        index === existingEntryIndex ? updatedEntry : entry
      );
    } else {
      if (isEditMode) {
        console.error("DailyEntryScreen: Error - Trying to edit an entry for a date that doesn't exist.");
        Alert.alert("Update Error", "Cannot edit an entry for a day with no previous entries.");
         setIsOverlayVisible(false);
         setIsSaving(false);
         return;
      }
      console.log("Creating new date entry with the first item.");
      const newDailyEntry: DailyEntry = { date: selectedDate, items: [entryItem] };
      updatedEntries = [...dailyEntries, newDailyEntry];
      updatedEntries.sort((a, b) => a.date.localeCompare(b.date));
    }

    await updateAndSaveEntries(updatedEntries);

    if (foodIcons[selectedFood.name] === undefined) {
      triggerIconFetches([selectedFood], [], selectedDate);
    }

    setSelectedFood(null);
    setGrams("");
    // *** Use 'editIndex' (reverted variable name) ***
    setEditIndex(null); // Reset modal edit index
    setIsOverlayVisible(false);
    setSearch("");

  }, [
    selectedFood, grams, editIndex, dailyEntries, selectedDate, isSaving,
    getOriginalIndex, updateAndSaveEntries, foodIcons, triggerIconFetches
  ]);

  // Handles multi-add from MODAL (using improved logic)
  const handleAddMultipleEntries = useCallback(
    async (entriesToAdd: { food: Food; grams: number }[]) => {
      if (isSaving) return;
      console.log(`DailyEntryScreen: handleAddMultipleEntries START - Received ${entriesToAdd.length} items for ${selectedDate}`);
      try {
        if (!entriesToAdd || entriesToAdd.length === 0) {
             console.warn("handleAddMultipleEntries called with no items.");
             return;
        }
        const newItems: DailyEntryItem[] = entriesToAdd.map((entry) => ({
          food: entry.food,
          grams: entry.grams,
        }));
        console.log(`DailyEntryScreen: Mapped to ${newItems.length} DailyEntryItems.`);

        const existingEntryIndex = dailyEntries.findIndex((entry) => entry.date === selectedDate);
        let updatedEntries: DailyEntry[];

        if (existingEntryIndex > -1) {
          console.log(`DailyEntryScreen: Appending ${newItems.length} items to existing entry for ${selectedDate}.`);
          const existingEntry = dailyEntries[existingEntryIndex];
          const updatedItems = [...(existingEntry.items ?? []), ...newItems];
          const updatedEntry = { ...existingEntry, items: updatedItems };
          updatedEntries = dailyEntries.map((entry, index) =>
            index === existingEntryIndex ? updatedEntry : entry
          );
        } else {
          console.log(`DailyEntryScreen: Creating new entry for ${selectedDate} with ${newItems.length} items.`);
          const newDailyEntry: DailyEntry = { date: selectedDate, items: newItems };
          updatedEntries = [...dailyEntries, newDailyEntry];
          updatedEntries.sort((a, b) => a.date.localeCompare(b.date));
        }

        await updateAndSaveEntries(updatedEntries);
        console.log("DailyEntryScreen: updateAndSaveEntries completed for multiple items.");

        const foodsToFetchIconsFor = newItems.map((item) => item.food);
        triggerIconFetches(foodsToFetchIconsFor, [], selectedDate);

        Toast.show({
          type: "success",
          text1: `${entriesToAdd.length} item(s) added`,
          // *** Use readable date format from 'before' logic ***
          text2: `to ${formatDateReadable(parseISO(selectedDate))}`,
          position: "bottom",
          visibilityTime: 3000,
        });

        setIsOverlayVisible(false);
        setSelectedFood(null);
        setGrams("");
        // *** Use 'editIndex' (reverted variable name) ***
        setEditIndex(null);
        setSearch("");

      } catch (error) {
        console.error("DailyEntryScreen: Error in handleAddMultipleEntries:", error);
        Alert.alert(
          "Quick Add Error",
          `Failed to add items. ${error instanceof Error ? error.message : "Please try again."}`
        );
        setIsOverlayVisible(false);
      }
    },
    [dailyEntries, selectedDate, isSaving, updateAndSaveEntries, triggerIconFetches]
  );

  const handleSelectFood = (item: Food | null) => {
     console.log("Modal selecting food:", item?.name ?? 'null');
    setSelectedFood(item);
     // If selecting a food for *adding* (not editing), maybe clear grams?
     // *** Use 'editIndex' (reverted variable name) ***
     if (item && editIndex === null) {
          setGrams(''); // Clear grams when selecting a new food for adding
     }
  };

  // Handles remove from swipe (using combined logic)
  const handleRemoveEntry = useCallback(async (reversedIndex: number) => {
    if (isSaving) return;
    const originalIndex = getOriginalIndex(reversedIndex);
    if (originalIndex === -1) {
         console.error(`handleRemoveEntry: Invalid reversedIndex ${reversedIndex}`);
         return;
    }

    const currentEntry = dailyEntries.find((e) => e.date === selectedDate);
    if (!currentEntry || originalIndex >= currentEntry.items.length) {
        console.error(`handleRemoveEntry: Cannot find entry or item at original index ${originalIndex}`);
        return;
    }

    const itemToRemove = currentEntry.items[originalIndex];
    console.log(`Attempting to remove item at original index ${originalIndex}: ${itemToRemove.food.name}`);

    const updatedItems = currentEntry.items.filter((_, i) => i !== originalIndex);
    let finalEntries: DailyEntry[];
    if (updatedItems.length === 0) {
         console.log(`Removing last item for date ${selectedDate}, entry will be removed.`);
         finalEntries = dailyEntries.filter((entry) => entry.date !== selectedDate);
    } else {
         const updatedEntry = { ...currentEntry, items: updatedItems };
         finalEntries = dailyEntries.map((entry) =>
            entry.date === selectedDate ? updatedEntry : entry
         );
    }

    await updateAndSaveEntries(finalEntries);

    Toast.show({
      type: "info",
      text1: `${itemToRemove.food.name} removed`,
      text2: "Tap here to undo",
      position: "bottom",
      bottomOffset: 80,
      visibilityTime: 4000,
      onPress: () => handleUndoRemoveEntry(itemToRemove, selectedDate, originalIndex),
    });

  }, [dailyEntries, selectedDate, isSaving, getOriginalIndex, updateAndSaveEntries]);

  // Handles undo remove from toast (using combined logic)
  const handleUndoRemoveEntry = useCallback(async (
    itemToRestore: DailyEntryItem,
    entryDate: string,
    originalIndex: number
  ) => {
    if (isSaving) return;
    console.log(`Undoing removal of ${itemToRestore.food.name} at original index ${originalIndex} on ${entryDate}`);

    const existingEntryIndex = dailyEntries.findIndex((e) => e.date === entryDate);
    let updatedEntries;

    if (existingEntryIndex > -1) {
        const entryToUpdate = dailyEntries[existingEntryIndex];
        const updatedItems = [...entryToUpdate.items];
        updatedItems.splice(originalIndex, 0, itemToRestore);
        const restoredEntry = { ...entryToUpdate, items: updatedItems };
        updatedEntries = dailyEntries.map((entry, index) =>
            index === existingEntryIndex ? restoredEntry : entry
        );
        console.log(`Item inserted back into existing entry at index ${originalIndex}.`);
    } else {
        console.log(`Creating new entry for date ${entryDate} as it was removed.`);
        const newEntry: DailyEntry = { date: entryDate, items: [itemToRestore] };
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
  }, [dailyEntries, isSaving, updateAndSaveEntries]);

  const updateSearch = (search: string) => setSearch(search);

  // --- Modal Toggle Logic (Adapted from 'before' to use 'editIndex') ---
  const toggleOverlay = useCallback((
    itemToEdit: DailyEntryItem | null = null,
    reversedIndex: number | null = null
  ) => {
    if (isSaving) {
        console.warn("Attempted to toggle modal while saving.");
        return;
    }

    // *** Reset state based on 'before' logic ***
    setSelectedFood(null);
    setGrams("");
    setEditIndex(null); // Clear modal edit index by default
    setSearch("");
    setEditingIndex(null); // Clear inline edit state
    setTempGrams("");

    if (itemToEdit && reversedIndex !== null) {
      // --- Setup for MODAL EDIT ---
      console.log(`Opening modal to edit item '${itemToEdit.food.name}' at reversed index ${reversedIndex}`);
      setSelectedFood(itemToEdit.food);
      setGrams(String(itemToEdit.grams)); // Set initial grams for edit
      // *** Use 'editIndex' (reverted variable name) ***
      setEditIndex(reversedIndex); // Store REVERSED index for modal context
      setIsOverlayVisible(true); // Show modal
    } else {
      // --- Setup for ADD or Closing ---
      if (isOverlayVisible) {
         console.log("Closing modal.");
      } else {
           console.log("Opening modal for Add.");
      }
      setIsOverlayVisible((current) => !current); // Toggle visibility
    }
  }, [isSaving, isOverlayVisible]); // Added isOverlayVisible dependency

  const handleEditEntryViaModal = (item: DailyEntryItem, reversedIndex: number) => {
    toggleOverlay(item, reversedIndex); // Call toggleOverlay with edit context
  };

  // --- Date Navigation Handlers (Using combined logic) ---
  const handleDateChange = useCallback((event: DateTimePickerEvent, selectedDateValue?: Date) => {
    const isAndroidDismiss = Platform.OS === "android" && event.type === "dismissed";
    setShowDatePicker(Platform.OS === "ios");

    if (!isAndroidDismiss && event.type === "set" && selectedDateValue) {
        if (isValid(selectedDateValue)) {
             const formattedDate = formatISO(selectedDateValue, { representation: "date" });
            if (formattedDate !== selectedDate) {
                 console.log(`Date changed via picker to: ${formattedDate}`);
                 setSelectedDate(formattedDate);
                 setEditingIndex(null); // Cancel inline edit
                 setTempGrams("");
                 setEditIndex(null); // Cancel modal edit
            }
        } else {
            console.warn("Date picker returned invalid date:", selectedDateValue);
            Alert.alert("Invalid Date", "The selected date is not valid.");
        }
    } else if (Platform.OS === "android") {
         setShowDatePicker(false);
    }
  }, [selectedDate]);

  const handlePreviousDay = useCallback(() => {
    try {
        const currentDateObj = parseISO(selectedDate);
        if (!isValid(currentDateObj)) {
             console.error("Error parsing current selected date:", selectedDate);
             return;
        }
        const newDate = subDays(currentDateObj, 1);
        const newDateString = formatISO(newDate, { representation: "date" });
        console.log(`Navigating to previous day: ${newDateString}`);
        setSelectedDate(newDateString);
        setEditingIndex(null); // Cancel inline edit
        setTempGrams("");
        setEditIndex(null); // Cancel modal edit
    } catch (e) {
      console.error("Error calculating previous day:", selectedDate, e);
    }
  }, [selectedDate]);

  const handleNextDay = useCallback(() => {
    try {
       const currentDateObj = parseISO(selectedDate);
        if (!isValid(currentDateObj)) {
             console.error("Error parsing current selected date:", selectedDate);
             return;
        }
        const newDate = addDays(currentDateObj, 1);
         const newDateString = formatISO(newDate, { representation: "date" });
        console.log(`Navigating to next day: ${newDateString}`);
        setSelectedDate(newDateString);
        setEditingIndex(null); // Cancel inline edit
        setTempGrams("");
        setEditIndex(null); // Cancel modal edit
    } catch (e) {
      console.error("Error calculating next day:", selectedDate, e);
    }
  }, [selectedDate]);

  // --- Totals Calculation (Using improved logic) ---
  const calculateTotals = useMemo(() => {
    const currentOriginalEntry = dailyEntries.find((entry) => entry.date === selectedDate);
    let totals = { totalCalories: 0, totalProtein: 0, totalCarbs: 0, totalFat: 0 };

    if (currentOriginalEntry) {
      currentOriginalEntry.items.forEach((item) => {
        if (item.food && typeof item.food.calories === 'number' &&
            typeof item.food.protein === 'number' &&
            typeof item.food.carbs === 'number' &&
            typeof item.food.fat === 'number' &&
            typeof item.grams === 'number' && item.grams > 0) {
                const factor = item.grams / 100;
                totals.totalCalories += item.food.calories * factor;
                totals.totalProtein += item.food.protein * factor;
                totals.totalCarbs += item.food.carbs * factor;
                totals.totalFat += item.food.fat * factor;
        } else {
            console.warn("Skipping item in total calculation due to missing/invalid data:", item);
        }
      });
    }
    return {
      totalCalories: Math.round(totals.totalCalories),
      totalProtein: Math.round(totals.totalProtein),
      totalCarbs: Math.round(totals.totalCarbs),
      totalFat: Math.round(totals.totalFat),
    };
  }, [dailyEntries, selectedDate]);

   // --- Render Item Component (Memoized, adapted to 'before' look) ---
   const RenderItem = React.memo(({ item, reversedIndex }: { item: DailyEntryItem, reversedIndex: number }) => {
        const [iconLoadError, setIconLoadError] = useState(false); // Local state for image errors
        const originalIndex = getOriginalIndex(reversedIndex);
        const isInlineEditing = editingIndex === originalIndex;
        const iconStatus = foodIcons[item.food.name];
        const isLoadingIcon = iconStatus === undefined;

        const handleImageError = useCallback(() => {
            console.warn(`Image component failed to load icon for ${item.food.name}: ${iconStatus}`);
            setIconLoadError(true);
            // *** Explicitly update state in cache to null if Image fails ***
            if (foodIcons[item.food.name] !== null) {
                setFoodIcons(prev => ({ ...prev, [item.food.name]: null }));
            }
        }, [item.food.name, iconStatus]);

        useEffect(() => {
            setIconLoadError(false); // Reset error if icon URL changes
        }, [iconStatus]);

        const renderListItemIcon = () => {
             // Uses styles from 'before' code
             if (isLoadingIcon) {
                return <ActivityIndicator size="small" color={theme.colors.grey3} style={styles.foodIcon} />;
             } else if (iconStatus && !iconLoadError) {
                 return <Image source={{ uri: iconStatus }} style={styles.foodIcon} onError={handleImageError} />;
             } else {
                 // Use placeholder from 'before' code
                 return (
                     <Icon
                         name="restaurant-outline"
                         type="ionicon"
                         color={theme.colors.grey3}
                         containerStyle={styles.defaultIconContainer} // Use container style
                     />
                 );
             }
        };

        return (
            <ListItem.Swipeable
                bottomDivider
                leftContent={(reset) => (
                    // Style from 'before' code
                    <Button
                        title="Edit"
                        onPress={() => {
                            if (!isSaving) {
                                handleEditEntryViaModal(item, reversedIndex);
                                reset();
                            }
                        }}
                        icon={{ name: "edit", color: "white" }}
                        buttonStyle={{ minHeight: "100%", backgroundColor: theme.colors.warning }}
                        disabled={isSaving}
                    />
                )}
                rightContent={(reset) => (
                     // Style from 'before' code
                    <Button
                        title="Delete"
                        onPress={() => {
                            if (!isSaving) {
                                handleRemoveEntry(reversedIndex);
                                reset();
                            }
                        }}
                        icon={{ name: "delete", color: "white" }}
                        buttonStyle={{ minHeight: "100%", backgroundColor: theme.colors.error }}
                        disabled={isSaving}
                    />
                )}
                containerStyle={{ backgroundColor: theme.colors.background }}
            >
                {/* Icon Rendering Logic */}
                {renderListItemIcon()}

                {/* Content: Title and Subtitle/Inline Edit (structure from 'before') */}
                <ListItem.Content>
                    <ListItem.Title style={styles.listItemTitle}>
                        {item.food.name}
                    </ListItem.Title>
                    {isInlineEditing ? (
                        // --- Inline Edit View (structure/styles from 'before') ---
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
                                onSubmitEditing={handleSaveInlineEdit} // Save on submit
                                onBlur={handleSaveInlineEdit} // Also save on blur
                                disabled={isSaving}
                            />
                            <Text style={styles.inlineInputSuffix}>g</Text>
                            <Button
                                type="clear"
                                onPress={handleSaveInlineEdit}
                                icon={<Icon name="checkmark-circle" type="ionicon" color={theme.colors.success} size={24} />}
                                containerStyle={styles.inlineButtonContainer}
                                disabled={isSaving}
                            />
                            <Button
                                type="clear"
                                onPress={handleCancelInlineEdit}
                                icon={<Icon name="close-circle" type="ionicon" color={theme.colors.error} size={24} />}
                                containerStyle={styles.inlineButtonContainer}
                                disabled={isSaving}
                            />
                        </View>
                    ) : (
                         // --- Display View (structure from 'before') ---
                        <ListItem.Subtitle
                            style={styles.listItemSubtitle}
                            onPress={() => !isSaving && handleStartEditing(reversedIndex)} // Subtitle press triggers inline edit
                            disabled={isSaving}
                        >
                            {`${item.grams}g • ${Math.round((item.food.calories / 100) * item.grams)} kcal`}
                        </ListItem.Subtitle>
                    )}
                </ListItem.Content>
                 {/* Show Chevron only when NOT editing (as per 'before' code) */}
                 {!isInlineEditing && <ListItem.Chevron color={theme.colors.grey3} />}
            </ListItem.Swipeable>
        );
   });

  // --- Main Render (Structure from 'before') ---
  return (
    <SafeAreaView style={styles.container} edges={["top", "left", "right"]}>
      {/* Date Navigation Header (styles/icons from 'before') */}
      <View style={styles.dateNavigation}>
        <Button
          type="clear"
          onPress={handlePreviousDay}
           // *** Use theme.colors.text for icon color as per 'before' ***
          icon={<Icon name="chevron-back-outline" type="ionicon" color={theme.colors.text} size={28} />}
          buttonStyle={styles.navButton}
          disabled={isSaving || isLoadingData}
        />
        {/* TouchableOpacity around Text for date */}
        <TouchableOpacity onPress={() => !isSaving && !isLoadingData && setShowDatePicker(true)} disabled={isSaving || isLoadingData}>
          <Text h4 style={styles.dateText}>
             {formatDateReadable(parseISO(selectedDate))}
          </Text>
        </TouchableOpacity>
        <Button
          type="clear"
          onPress={handleNextDay}
          // *** Use theme.colors.text for icon color as per 'before' ***
          icon={<Icon name="chevron-forward-outline" type="ionicon" color={theme.colors.text} size={28} />}
          buttonStyle={styles.navButton}
          disabled={isSaving || isLoadingData}
        />
      </View>

      {/* Date Picker */}
      {showDatePicker && (
        <DateTimePicker
          value={parseISO(selectedDate)}
          mode="date"
          display={Platform.OS === "ios" ? "spinner" : "default"}
          onChange={handleDateChange}
          // maximumDate={new Date()}
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

       {/* Saving Indicator (subtle) */}
      {isSaving && (
          <View style={styles.savingIndicator}>
              <ActivityIndicator size="small" color={theme.colors.primary} />
              <Text style={styles.savingText}>Saving...</Text>
          </View>
      )}

      {/* Section Title (style from 'before') */}
      <Text h4 style={[styles.sectionTitle, { color: theme.colors.text }]}>
        Today's Entries
      </Text>

      {/* Entries List */}
      {isLoadingData ? (
         <View style={styles.centeredLoader}>
            <ActivityIndicator size="large" color={theme.colors.primary} />
            <Text style={styles.loadingText}>Loading Entries...</Text>
          </View>
      ) : (
        <FlatList
            data={currentEntryItems}
            // Key needs stability - use food ID, index, and grams
             keyExtractor={(item, index) => `entry-${item?.food?.id ?? 'unknown'}-${getOriginalIndex(index)}-${item?.grams ?? index}`}
            renderItem={({ item, index }) => <RenderItem item={item} reversedIndex={index} />}
             // Empty Component (structure/icon/styles from 'before')
            ListEmptyComponent={
            <View style={styles.emptyListContainer}>
                <Icon name="leaf-outline" type="ionicon" size={40} color={theme.colors.grey3} />
                <Text style={styles.emptyListText}>No entries for this day yet.</Text>
                <Text style={styles.emptyListSubText}>Tap the '+' button to add food.</Text>
            </View>
            }
            // Optimization props from 'before'
            initialNumToRender={10}
            maxToRenderPerBatch={5}
            windowSize={11}
            contentContainerStyle={styles.listContentContainer}
            keyboardShouldPersistTaps="handled"
        />
      )}

      {/* FAB (style from 'before') */}
      <FAB
        icon={<Icon name="add" color="white" />}
        color={theme.colors.primary}
        onPress={() => !isSaving && toggleOverlay()}
        placement="right"
        size="large"
        style={styles.fab} // Use style from 'before' for positioning
        disabled={isSaving || isLoadingData}
      />

      {/* Add/Edit Modal */}
      <AddEntryModal
        isVisible={isOverlayVisible}
        toggleOverlay={toggleOverlay}
        selectedFood={selectedFood}
        grams={grams}
        setGrams={setGrams}
        foods={foods}
        handleAddEntry={handleSingleEntryAction} // For single add/update
        handleAddMultipleEntries={handleAddMultipleEntries} // For multi-add
        handleSelectFood={handleSelectFood}
        search={search}
        updateSearch={updateSearch}
        // *** Pass isEditMode based on 'editIndex' (reverted variable name) ***
        isEditMode={editIndex !== null}
        // *** Pass initialGrams based on 'editIndex' for modal edit ***
        initialGrams={editIndex !== null ? grams : undefined}
      />
    </SafeAreaView>
  );
};

// Styles definition using makeStyles - **PASTED FROM 'BEFORE' CODE**
const useStyles = makeStyles((theme) => ({
    container: {
        flex: 1,
        backgroundColor: theme.colors.background,
    },
    dateNavigation: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        paddingVertical: 8,
        paddingHorizontal: 5, // Reduced horizontal padding for buttons
        borderBottomWidth: 1,
        borderBottomColor: theme.colors.divider,
    },
    navButton: { // Style for the arrow buttons
        paddingHorizontal: 8, // Give arrows some horizontal tap space
    },
    dateText: {
        fontSize: 18,
        fontWeight: "bold",
        color: theme.colors.text,
        textAlign: 'center', // Center the date text
        paddingVertical: 5, // Add vertical padding for touchability
    },
    foodIcon: { // Consistent style for list item icons
        width: 40,
        height: 40,
        marginRight: 15,
        borderRadius: 20, // Circular
        resizeMode: "contain", // Ensure icon fits well
        backgroundColor: theme.colors.grey5, // Background shown while loading/if error
        alignItems: 'center', // Center activity indicator if shown
        justifyContent: 'center', // Center activity indicator if shown
        overflow: 'hidden', // Hide overflow for clean look
    },
    defaultIconContainer: { // Container used when icon fetch fails or returns null
        width: 40,
        height: 40,
        marginRight: 15,
        borderRadius: 20,
        backgroundColor: theme.colors.grey5,
        alignItems: 'center',
        justifyContent: 'center',
    },
    listItemTitle: {
        color: theme.colors.text,
        fontWeight: 'bold',
        fontSize: 16, // Slightly larger title
    },
    listItemSubtitle: {
        color: theme.colors.grey1, // Subtitle color
        fontSize: 14,
        marginTop: 3, // Space below title
        // *** Added padding for better touch target for inline edit ***
        paddingVertical: 2,
        paddingHorizontal: 5, // Some horizontal padding too
    },
    divider: {
        marginVertical: 10,
    },
    sectionTitle: {
        marginTop: 15, // Increased top margin
        marginBottom: 8,
        paddingHorizontal: 15,
        fontWeight: '600', // Slightly less bold than h3 default
        fontSize: 18, // Adjust font size
        // *** Color changed back to grey1 as per 'before' ***
        color: theme.colors.grey1,
    },
    fab: { // Style for the FAB component itself
        position: 'absolute', // Keep absolute positioning
        margin: 16, // Standard margin
        right: 10, // Adjust position slightly
        bottom: 10, // Adjust position slightly
    },
     emptyListContainer: { // Styling for the empty list message
        flex: 1, // Allow it to take space if needed
        alignItems: 'center',
        justifyContent: 'center',
        marginTop: 50,
        paddingHorizontal: 30, // More padding
    },
    emptyListText: {
        fontSize: 17, // Slightly larger text
        color: theme.colors.grey2,
        textAlign: 'center',
        marginTop: 10, // Space below icon
    },
     emptyListSubText: {
        fontSize: 14,
        color: theme.colors.grey3,
        textAlign: 'center',
        marginTop: 8,
    },
    // --- Inline Editing Styles (from 'before' code) ---
    inlineEditContainer: { // Container for the input and buttons during inline edit
        flexDirection: "row",
        alignItems: "center",
        marginTop: 5, // Space below the title
        width: '100%', // Take full width of content area
    },
    inlineInputContainer: { // RNE Input component's outer container
        width: 80, // Fixed width for the input area
        height: 38, // Match button height approximately
        paddingHorizontal: 0, // Remove default padding
        // *** Added marginRight to space from suffix ***
        marginRight: 4,
    },
    inlineInputInnerContainer: { // RNE Input component's inner container (handles underline)
        borderBottomWidth: 1,
        borderColor: theme.colors.primary,
        paddingHorizontal: 6,
        height: '100%',
        paddingVertical: 0, // Remove vertical padding if any
        justifyContent: 'center', // Center text vertically
        // *** Added background to match theme, prevents potential transparency issues ***
        backgroundColor: theme.colors.background,
    },
    inlineInput: { // Style for the text *inside* the inline input
        fontSize: 14, // Match subtitle size
        color: theme.colors.text, // Use theme text color
        textAlign: 'right', // Align number to the right
        paddingVertical: 0, // No extra vertical padding
    },
    inlineInputSuffix: { // Style for the "g" text next to the input
         fontSize: 14,
         color: theme.colors.grey1,
         // *** Adjusted margins as per 'before' ***
         marginLeft: 0,
         marginRight: 8, // Space before buttons
    },
     inlineButtonContainer: { // Container for the checkmark/cross buttons
        padding: 0, // Remove padding
        // *** Adjusted margins as per 'before' ***
        marginHorizontal: 0, // No horizontal margin between buttons
        minWidth: 30, // Ensure decent tap area
        justifyContent: 'center',
        alignItems: 'center',
    },
    // --- Loader and Saving Styles ---
    centeredLoader: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
    },
    loadingText: {
        marginTop: 10,
        color: theme.colors.grey2,
        fontSize: 16,
    },
    savingIndicator: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      paddingVertical: 4,
      // backgroundColor: theme.colors.grey5, // Optional subtle background
    },
    savingText: {
        marginLeft: 8,
        color: theme.colors.primary,
        fontSize: 14,
        fontStyle: 'italic',
    },
    // --- List Content Container Style ---
    listContentContainer: {
        paddingBottom: 80, // Ensure space for FAB
    }
}));

export default DailyEntryScreen;
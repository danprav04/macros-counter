// src/screens/DailyEntryScreen.tsx (Refined Icon Handling, Loading States)
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
  Keyboard,
} from "react-native";
import { DailyEntry, DailyEntryItem } from "../types/dailyEntry";
import { Food } from "../types/food";
import { getFoods } from "../services/foodService"; // Assuming foodService is primary now
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
import DateTimePicker, { DateTimePickerEvent } from "@react-native-community/datetimepicker"; // Import event type
import { addDays, subDays, parseISO, formatISO, isValid } from "date-fns"; // Import isValid
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
  // State variables
  const [dailyEntries, setDailyEntries] = useState<DailyEntry[]>([]);
  const [selectedDate, setSelectedDate] = useState<string>(getTodayDateString());
  const [foods, setFoods] = useState<Food[]>([]); // All available foods
  const [selectedFood, setSelectedFood] = useState<Food | null>(null); // For modal
  const [grams, setGrams] = useState(""); // For modal input
  const [isOverlayVisible, setIsOverlayVisible] = useState(false);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [dailyGoals, setDailyGoals] = useState<DailyGoals>({
    calories: 2000, protein: 150, carbs: 200, fat: 70, // Example goals
  });
  const [editingIndex, setEditingIndex] = useState<number | null>(null); // Inline edit ORIGINAL index
  const [tempGrams, setTempGrams] = useState(""); // Inline edit temporary grams
  const [search, setSearch] = useState(""); // Modal search term
  const [editIndexModal, setEditIndexModal] = useState<number | null>(null); // Modal edit REVERSED index
  // Icon Cache State: key=foodName, value=undefined(loading), null(failed/no_icon), string(url)
  const [foodIcons, setFoodIcons] = useState<{ [foodName: string]: string | null | undefined }>({});
  const [isLoadingData, setIsLoadingData] = useState(true); // Initial data load state
  const [isSaving, setIsSaving] = useState(false); // Saving state to prevent clashes

  const { theme } = useTheme();
  const styles = useStyles();

  // --- Data Loading and Icon Fetching ---

  const loadData = useCallback(async () => {
    console.log(`DailyEntryScreen: Loading data for date: ${selectedDate}`);
    setIsLoadingData(true);
    try {
      // Fetch all data concurrently
      const [loadedFoods, loadedEntries, loadedSettings] = await Promise.all([
        getFoods(), // Use foodService to get all foods
        loadDailyEntries(),
        loadSettings(),
      ]);

      // Use defaults if goals are missing
      const currentGoals = loadedSettings?.dailyGoals ?? { calories: 2000, protein: 150, carbs: 200, fat: 70 };
      setDailyGoals(currentGoals);

      // Sort loaded foods alphabetically (optional, but nice for consistency)
      loadedFoods.sort((a, b) => a.name.localeCompare(b.name));
      setFoods(loadedFoods);

      setDailyEntries(loadedEntries);
      console.log(`DailyEntryScreen: Loaded ${loadedFoods.length} foods, ${loadedEntries.length} entry days.`);

      // Trigger Icon Fetching for relevant foods
      triggerIconFetches(loadedFoods, loadedEntries, selectedDate);
    } catch (error) {
      console.error("DailyEntryScreen: Error loading data:", error);
      Alert.alert("Load Error", "Failed to load necessary data. Please check connection or try again.");
      // Reset state on error
      setFoods([]);
      setDailyEntries([]);
      setDailyGoals({ calories: 0, protein: 0, carbs: 0, fat: 0 }); // Reset goals?
    } finally {
      setIsLoadingData(false);
    }
  }, [selectedDate]); // Re-run if selectedDate changes

  // Function to trigger icon fetches without blocking
  const triggerIconFetches = useCallback((allFoods: Food[], allEntries: DailyEntry[], currentDate: string) => {
    const relevantFoodNames = new Set<string>();

    // Add names from the global food list
    allFoods.forEach((f) => relevantFoodNames.add(f.name));

    // Add names from the current day's entries
    const currentOriginalEntry = allEntries.find((entry) => entry.date === currentDate);
    if (currentOriginalEntry) {
        currentOriginalEntry.items.forEach((item) => {
            if (item.food?.name) { // Check if food and name exist
                relevantFoodNames.add(item.food.name);
            }
        });
    }

    console.log(`DailyEntryScreen: Triggering icon fetches for ${relevantFoodNames.size} unique food names.`);

    relevantFoodNames.forEach((foodName) => {
        // Check if icon status is unknown (undefined) before fetching
        if (foodIcons[foodName] === undefined) {
            // Fetch async, update state individually on resolve/reject
            getFoodIconUrl(foodName)
                .then((iconUrl) => {
                    // Use functional update to avoid stale closures if many fetches run
                    setFoodIcons((prevIcons) => ({ ...prevIcons, [foodName]: iconUrl }));
                })
                .catch((error) => {
                    // Error is logged within getFoodIconUrl or backend service
                    console.warn(`Icon fetch failed for ${foodName} in background:`, error);
                    setFoodIcons((prevIcons) => ({ ...prevIcons, [foodName]: null })); // Ensure state reflects failure
                });
        }
    });
  }, [foodIcons]); // Depend on foodIcons state to avoid re-fetching known icons

  // Load data when the screen comes into focus or selectedDate changes
  useFocusEffect(
    useCallback(() => {
      loadData();
      return () => {
        // Cleanup on unfocus
        console.log("DailyEntryScreen: Unfocused.");
        // Reset potentially sensitive states if needed
        setSearch("");
        setIsOverlayVisible(false);
        setEditingIndex(null);
        setTempGrams("");
        setEditIndexModal(null);
      };
    }, [loadData]) // loadData dependency includes selectedDate
  );

  // --- List and Index Management ---
  const currentEntryItems = useMemo(() => {
    const entry = dailyEntries.find((e) => e.date === selectedDate);
    // Create a stable reversed list for the FlatList
    return entry ? [...entry.items].reverse() : [];
  }, [dailyEntries, selectedDate]);

  const getOriginalIndex = useCallback((reversedIndex: number): number => {
    const entry = dailyEntries.find((e) => e.date === selectedDate);
    if (!entry || reversedIndex < 0 || reversedIndex >= entry.items.length) {
      console.error(`getOriginalIndex: Invalid reversedIndex ${reversedIndex} for entry length ${entry?.items?.length}`);
      return -1; // Return -1 for invalid index
    }
    // Calculate original index from reversed index
    return entry.items.length - 1 - reversedIndex;
  }, [dailyEntries, selectedDate]);

  // --- State Update Helper ---
  const updateAndSaveEntries = useCallback(async (updatedEntries: DailyEntry[]) => {
    setIsSaving(true); // Indicate saving start
    // Find the entry for the currently selected date to log its item count
    const entryForSelectedDate = updatedEntries.find((e) => e.date === selectedDate);
    console.log(`DailyEntryScreen: updateAndSaveEntries called. Saving ${updatedEntries.length} total entries.`);
    console.log(`Entry for ${selectedDate} contains ${entryForSelectedDate?.items?.length ?? 0} items.`);

    // Optimistically update local state immediately for responsiveness
    setDailyEntries(updatedEntries);

    try {
      await saveDailyEntries(updatedEntries);
      console.log("DailyEntryScreen: Successfully saved updated entries to storage.");
    } catch (error) {
      console.error("DailyEntryScreen: Failed to save updated entries to storage:", error);
      Alert.alert("Save Error", "Could not save changes. Please try again.");
      // Optionally revert state or reload data here if save fails critically
      // await loadData(); // Example: Reload data on save failure
    } finally {
        setIsSaving(false); // Indicate saving end
    }
  }, [selectedDate]); // Dependency ensures selectedDate is current if needed, though primarily operates on structure

  // --- Inline Editing Handlers ---
  const handleStartEditing = (reversedIndex: number) => {
     if (isSaving) return; // Prevent starting edit while saving
    const originalIndex = getOriginalIndex(reversedIndex);
    if (originalIndex === -1) return;

    const currentEntry = dailyEntries.find((e) => e.date === selectedDate);
    if (!currentEntry || !currentEntry.items[originalIndex]) {
        console.error(`handleStartEditing: Could not find item at original index ${originalIndex}`);
        return;
    }
    console.log(`Starting inline edit for item at original index: ${originalIndex}`);
    setEditingIndex(originalIndex); // Store ORIGINAL index
    setTempGrams(String(currentEntry.items[originalIndex].grams));
    setEditIndexModal(null); // Ensure modal edit state is cleared
  };

  const handleSaveInlineEdit = useCallback(async () => {
    if (editingIndex === null || isSaving) return; // Prevent saving if not editing or already saving
    Keyboard.dismiss(); // Dismiss keyboard on save attempt

    const trimmedGrams = tempGrams.trim();
    if (!isValidNumberInput(trimmedGrams) || parseFloat(trimmedGrams) <= 0) {
      Alert.alert("Invalid Input", "Please enter a valid, positive number for grams.");
      return; // Keep editing state active
    }
    const newGramsValue = parseFloat(trimmedGrams);
    console.log(`Saving inline edit for index ${editingIndex} with grams: ${newGramsValue}`);

    const updatedEntries = dailyEntries.map((entry) => {
      if (entry.date === selectedDate) {
        // Ensure items exist before mapping
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

    // Update state and persist changes
    await updateAndSaveEntries(updatedEntries);

    // Reset editing state
    setEditingIndex(null);
    setTempGrams("");

  }, [editingIndex, tempGrams, dailyEntries, selectedDate, updateAndSaveEntries, isSaving]);

  const handleCancelInlineEdit = () => {
    console.log(`Canceling inline edit for index ${editingIndex}`);
    setEditingIndex(null);
    setTempGrams("");
    Keyboard.dismiss();
  };
  // --- End Inline Editing ---

  // --- Add/Update/Remove Entry Handlers (triggered by Modal) ---
  const handleSingleEntryAction = useCallback(async () => {
    if (isSaving) return; // Prevent action if already saving
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
      food: selectedFood, // Use the selected food object
      grams: numericGrams,
    };

    const isEditMode = editIndexModal !== null;
    console.log(`handleSingleEntryAction: Mode=${isEditMode ? 'Edit' : 'Add'}, Food=${selectedFood.name}, Grams=${numericGrams}, ReversedIndex=${editIndexModal}`);

    const existingEntryIndex = dailyEntries.findIndex((entry) => entry.date === selectedDate);
    let updatedEntries: DailyEntry[];

    if (existingEntryIndex > -1) {
      // Entry for the date exists
      const existingEntry = dailyEntries[existingEntryIndex];
      let updatedItems;
      if (isEditMode) {
        // --- Modal Edit Mode ---
        const originalEditIndex = getOriginalIndex(editIndexModal!); // Get original index from reversed
        if (originalEditIndex === -1) {
          console.error("DailyEntryScreen: Error updating entry via modal - Could not find original index.");
          Alert.alert("Update Error", "An internal error occurred while trying to update the entry.");
          setIsOverlayVisible(false); // Close modal on error
          setIsSaving(false); // Ensure saving state is reset
          return;
        }
        console.log(`Updating item at original index ${originalEditIndex}`);
        updatedItems = existingEntry.items.map((item, index) =>
          index === originalEditIndex ? entryItem : item
        );
      } else {
        // --- Adding new single item ---
        console.log("Adding new single item to existing date entry.");
        updatedItems = [...existingEntry.items, entryItem];
      }
      const updatedEntry = { ...existingEntry, items: updatedItems };
      updatedEntries = dailyEntries.map((entry, index) =>
        index === existingEntryIndex ? updatedEntry : entry
      );
    } else {
      // --- New entry for the date ---
      if (isEditMode) {
        // This case should ideally not happen if editIndexModal is only set when an entry exists
        console.error("DailyEntryScreen: Error - Trying to edit an entry for a date that doesn't exist.");
        Alert.alert("Update Error", "Cannot edit an entry for a day with no previous entries.");
         setIsOverlayVisible(false);
         setIsSaving(false);
         return;
      }
      console.log("Creating new date entry with the first item.");
      const newDailyEntry: DailyEntry = { date: selectedDate, items: [entryItem] };
      updatedEntries = [...dailyEntries, newDailyEntry];
      updatedEntries.sort((a, b) => a.date.localeCompare(b.date)); // Keep entries sorted by date
    }

    // Update state and persist
    await updateAndSaveEntries(updatedEntries);

    // Trigger icon fetch for the added/edited food if its status is unknown
    if (foodIcons[selectedFood.name] === undefined) {
        triggerIconFetches([selectedFood], [], selectedDate);
    }

    // Reset modal state and close
    setSelectedFood(null);
    setGrams("");
    setEditIndexModal(null); // Reset modal edit index
    setIsOverlayVisible(false);
    setSearch(""); // Clear search on successful action

  }, [
    selectedFood, grams, editIndexModal, dailyEntries, selectedDate, isSaving,
    getOriginalIndex, updateAndSaveEntries, foodIcons, triggerIconFetches
  ]);

  // --- NEW: Handle Adding Multiple Entries ---
  const handleAddMultipleEntries = useCallback(
    async (entriesToAdd: { food: Food; grams: number }[]) => {
      if (isSaving) return;
      console.log(`DailyEntryScreen: handleAddMultipleEntries START - Received ${entriesToAdd.length} items for ${selectedDate}`);
      try {
        if (!entriesToAdd || entriesToAdd.length === 0) {
             console.warn("handleAddMultipleEntries called with no items.");
             return;
        }

        // Map to DailyEntryItem format
        const newItems: DailyEntryItem[] = entriesToAdd.map((entry) => ({
          food: entry.food, // Contains unique ID generated in modal
          grams: entry.grams,
        }));
        console.log(`DailyEntryScreen: Mapped to ${newItems.length} DailyEntryItems.`);

        const existingEntryIndex = dailyEntries.findIndex((entry) => entry.date === selectedDate);
        let updatedEntries: DailyEntry[];

        if (existingEntryIndex > -1) {
          console.log(`DailyEntryScreen: Appending ${newItems.length} items to existing entry for ${selectedDate}.`);
          const existingEntry = dailyEntries[existingEntryIndex];
          const updatedItems = [...(existingEntry.items ?? []), ...newItems]; // Append new items
          const updatedEntry = { ...existingEntry, items: updatedItems };
          updatedEntries = dailyEntries.map((entry, index) =>
            index === existingEntryIndex ? updatedEntry : entry
          );
        } else {
          console.log(`DailyEntryScreen: Creating new entry for ${selectedDate} with ${newItems.length} items.`);
          const newDailyEntry: DailyEntry = { date: selectedDate, items: newItems };
          updatedEntries = [...dailyEntries, newDailyEntry];
          updatedEntries.sort((a, b) => a.date.localeCompare(b.date)); // Keep sorted
        }

        // Update state and save
        await updateAndSaveEntries(updatedEntries);
        console.log("DailyEntryScreen: updateAndSaveEntries completed for multiple items.");

        // Trigger icon fetches for the newly added foods
        const foodsToFetchIconsFor = newItems.map((item) => item.food);
        triggerIconFetches(foodsToFetchIconsFor, [], selectedDate);

        Toast.show({
          type: "success",
          text1: `${entriesToAdd.length} item(s) added`,
          text2: `to ${formatDateReadable(parseISO(selectedDate))}`, // Ensure readable date format
          position: "bottom",
          visibilityTime: 3000,
        });

        // Close the modal and reset related state AFTER state update and save
        setIsOverlayVisible(false);
        setSelectedFood(null);
        setGrams("");
        setEditIndexModal(null);
        setSearch("");

      } catch (error) {
        console.error("DailyEntryScreen: Error in handleAddMultipleEntries:", error);
        Alert.alert(
          "Quick Add Error",
          `Failed to add items. ${error instanceof Error ? error.message : "Please try again."}`
        );
        // Close modal even on error? Or leave it open? Let's close it.
        setIsOverlayVisible(false);
      }
    },
    [dailyEntries, selectedDate, isSaving, updateAndSaveEntries, triggerIconFetches]
  );
  // --- End NEW FUNCTION ---

  const handleSelectFood = (item: Food | null) => {
     console.log("Modal selecting food:", item?.name ?? 'null');
    setSelectedFood(item);
  };

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

    // Optimistically update UI state
    const updatedItems = currentEntry.items.filter((_, i) => i !== originalIndex);
    let finalEntries: DailyEntry[];
    if (updatedItems.length === 0) {
         // If last item removed, remove the entire entry for that date
         console.log(`Removing last item for date ${selectedDate}, entry will be removed.`);
         finalEntries = dailyEntries.filter((entry) => entry.date !== selectedDate);
    } else {
         // Otherwise, just update the items for the date
         const updatedEntry = { ...currentEntry, items: updatedItems };
         finalEntries = dailyEntries.map((entry) =>
            entry.date === selectedDate ? updatedEntry : entry
         );
    }

    // Update state and save
    await updateAndSaveEntries(finalEntries);

    // Show Undo Toast
    Toast.show({
      type: "info",
      text1: `${itemToRemove.food.name} removed`,
      text2: "Tap here to undo",
      position: "bottom",
      bottomOffset: 80, // Adjust if needed
      visibilityTime: 4000, // Give enough time to tap
      onPress: () => handleUndoRemoveEntry(itemToRemove, selectedDate, originalIndex),
    });

  }, [dailyEntries, selectedDate, isSaving, getOriginalIndex, updateAndSaveEntries]); // Added handleUndoRemoveEntry dependency

  const handleUndoRemoveEntry = useCallback(async (
    itemToRestore: DailyEntryItem,
    entryDate: string, // The date the item belonged to
    originalIndex: number // The original position in that date's items array
  ) => {
    if (isSaving) return; // Prevent undo while saving something else
    console.log(`Undoing removal of ${itemToRestore.food.name} at original index ${originalIndex} on ${entryDate}`);

    // Find the entry for the date, or prepare to create it if it was deleted
    const existingEntryIndex = dailyEntries.findIndex((e) => e.date === entryDate);
    let updatedEntries;

    if (existingEntryIndex > -1) {
        // Entry exists, insert the item back at its original position
        const entryToUpdate = dailyEntries[existingEntryIndex];
        const updatedItems = [...entryToUpdate.items]; // Create a new array
        updatedItems.splice(originalIndex, 0, itemToRestore); // Insert item at original index
        const restoredEntry = { ...entryToUpdate, items: updatedItems };
        updatedEntries = dailyEntries.map((entry, index) =>
            index === existingEntryIndex ? restoredEntry : entry
        );
        console.log(`Item inserted back into existing entry at index ${originalIndex}.`);
    } else {
        // Entry was removed (last item deleted), create a new entry with the restored item
        console.log(`Creating new entry for date ${entryDate} as it was removed.`);
        const newEntry: DailyEntry = { date: entryDate, items: [itemToRestore] };
        updatedEntries = [...dailyEntries, newEntry];
        updatedEntries.sort((a, b) => a.date.localeCompare(b.date)); // Re-sort after adding
    }

    // Update state and save
    await updateAndSaveEntries(updatedEntries);

    // Hide the "Undo" toast and show confirmation
    Toast.hide();
    Toast.show({
      type: "success",
      text1: "Entry restored!",
      visibilityTime: 1500,
      position: "bottom",
    });
  }, [dailyEntries, isSaving, updateAndSaveEntries]); // Ensure dependencies are correct

  const updateSearch = (search: string) => setSearch(search);

  // --- Modal Toggle Logic ---
  const toggleOverlay = useCallback((
    itemToEdit: DailyEntryItem | null = null,
    reversedIndex: number | null = null
  ) => {
    if (isSaving) {
        console.warn("Attempted to toggle modal while saving.");
        return; // Don't open modal while saving
    }
    if (itemToEdit && reversedIndex !== null) {
      // --- Setup for MODAL EDIT ---
      console.log(`Opening modal to edit item '${itemToEdit.food.name}' at reversed index ${reversedIndex}`);
      setSelectedFood(itemToEdit.food);
      setGrams(String(itemToEdit.grams)); // Set initial grams for edit
      setEditIndexModal(reversedIndex); // Store REVERSED index for modal context
      setEditingIndex(null); // Clear inline edit state
      setTempGrams("");
      setSearch(""); // Clear search when opening for edit
      setIsOverlayVisible(true);
    } else {
      // --- Setup for ADD or Closing ---
      if (isOverlayVisible) {
         console.log("Closing modal.");
      } else {
           console.log("Opening modal for Add.");
      }
      setSelectedFood(null);
      setGrams("");
      setEditIndexModal(null); // Ensure edit mode is off for add
      setSearch(""); // Clear search on close/add open
      setEditingIndex(null); // Clear inline edit state
      setTempGrams("");
      setIsOverlayVisible((current) => !current); // Toggle visibility
    }
  }, [isSaving, isOverlayVisible]); // Added isOverlayVisible to dependencies

  const handleEditEntryViaModal = (item: DailyEntryItem, reversedIndex: number) => {
    toggleOverlay(item, reversedIndex); // Call toggleOverlay with edit context
  };
  // --- End Modal Toggle ---

  // --- Date Navigation Handlers ---
  const handleDateChange = useCallback((event: DateTimePickerEvent, selectedDateValue?: Date) => {
    const isAndroidDismiss = Platform.OS === "android" && event.type === "dismissed";
    setShowDatePicker(Platform.OS === "ios"); // Keep visible on iOS until done/cancel

    if (!isAndroidDismiss && event.type === "set" && selectedDateValue) {
        // Check if the date is valid before formatting
        if (isValid(selectedDateValue)) {
             const formattedDate = formatISO(selectedDateValue, { representation: "date" });
            if (formattedDate !== selectedDate) {
                 console.log(`Date changed via picker to: ${formattedDate}`);
                 setSelectedDate(formattedDate); // This will trigger useFocusEffect -> loadData
                 setEditingIndex(null); // Cancel inline edit when changing date
                 setTempGrams("");
            }
        } else {
            console.warn("Date picker returned invalid date:", selectedDateValue);
            Alert.alert("Invalid Date", "The selected date is not valid.");
        }
    } else if (Platform.OS === "android") {
         setShowDatePicker(false); // Hide on dismiss/cancel on Android
    }
    // On iOS, the user needs to tap "Done" or "Cancel" which dismisses the picker,
    // so we don't explicitly hide it here based on the event.
  }, [selectedDate]); // Depend on selectedDate to compare

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
    } catch (e) {
      console.error("Error calculating next day:", selectedDate, e);
    }
  }, [selectedDate]);
  // --- End Date Navigation ---

  // --- Totals Calculation ---
  const calculateTotals = useMemo(() => {
    const currentOriginalEntry = dailyEntries.find((entry) => entry.date === selectedDate);
    let totals = { totalCalories: 0, totalProtein: 0, totalCarbs: 0, totalFat: 0 };

    if (currentOriginalEntry) {
      currentOriginalEntry.items.forEach((item) => {
        // Check if food object and its properties exist and are numbers
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

    // Round totals at the end for display
    return {
      totalCalories: Math.round(totals.totalCalories),
      totalProtein: Math.round(totals.totalProtein),
      totalCarbs: Math.round(totals.totalCarbs),
      totalFat: Math.round(totals.totalFat),
    };
  }, [dailyEntries, selectedDate]);

  // --- Render Item Component (Memoized) ---
   const RenderItem = React.memo(({ item, reversedIndex }: { item: DailyEntryItem, reversedIndex: number }) => {
        const [iconLoadError, setIconLoadError] = useState(false); // Local state for image errors
        const originalIndex = getOriginalIndex(reversedIndex);
        const isInlineEditing = editingIndex === originalIndex;
        const iconStatus = foodIcons[item.food.name]; // Check cache by name
        const isLoadingIcon = iconStatus === undefined;

        const handleImageError = useCallback(() => {
            console.warn(`Image component failed to load icon for ${item.food.name}: ${iconStatus}`);
            setIconLoadError(true);
        }, [item.food.name, iconStatus]);

        // Reset error if icon URL changes
        useEffect(() => {
            setIconLoadError(false);
        }, [iconStatus]);

        const renderListItemIcon = () => {
            if (isLoadingIcon) {
                return <ActivityIndicator size="small" color={theme.colors.grey3} style={styles.foodIconContainer} />;
            } else if (iconStatus && !iconLoadError) {
                return <Image source={{ uri: iconStatus }} style={styles.foodIconImage} onError={handleImageError} resizeMode="contain"/>;
            } else {
                return (
                    <View style={styles.foodIconContainer}>
                         <Icon name="restaurant-outline" type="ionicon" color={theme.colors.grey3} size={20} />
                    </View>
                );
            }
        };

        return (
            <ListItem.Swipeable
                bottomDivider
                leftContent={(reset) => (
                    <Button
                        title="Edit"
                        onPress={() => {
                            if (!isSaving) { // Prevent action while saving
                                handleEditEntryViaModal(item, reversedIndex);
                                reset();
                            }
                        }}
                        icon={{ name: "edit", color: "white" }}
                        buttonStyle={styles.swipeButtonEdit}
                        disabled={isSaving}
                    />
                )}
                rightContent={(reset) => (
                    <Button
                        title="Delete"
                        onPress={() => {
                            if (!isSaving) { // Prevent action while saving
                                handleRemoveEntry(reversedIndex);
                                reset();
                            }
                        }}
                        icon={{ name: "delete", color: "white" }}
                        buttonStyle={styles.swipeButtonDelete}
                        disabled={isSaving}
                    />
                )}
                containerStyle={{ backgroundColor: theme.colors.background }}
            >
                {/* Icon Rendering Logic */}
                {renderListItemIcon()}

                {/* Content: Title and Subtitle/Inline Edit */}
                <ListItem.Content>
                    <ListItem.Title style={styles.listItemTitle} numberOfLines={1} ellipsizeMode="tail">
                        {item.food.name}
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
                                onSubmitEditing={handleSaveInlineEdit} // Save on submit
                                onBlur={handleSaveInlineEdit} // Also save on blur
                                disabled={isSaving} // Disable input while saving
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
                         // Make subtitle touchable to initiate edit
                        <TouchableOpacity onPress={() => handleStartEditing(reversedIndex)} disabled={isSaving}>
                            <ListItem.Subtitle style={styles.listItemSubtitle}>
                                {`${item.grams}g • ${Math.round((item.food.calories / 100) * item.grams)} kcal`}
                            </ListItem.Subtitle>
                        </TouchableOpacity>
                    )}
                </ListItem.Content>
                {!isInlineEditing && (
                    <TouchableOpacity onPress={() => handleStartEditing(reversedIndex)} disabled={isSaving}>
                         <Icon name="pencil-outline" type="ionicon" color={theme.colors.grey3} size={20} />
                    </TouchableOpacity>
                )}
            </ListItem.Swipeable>
        );
   });


  // --- Main Render ---
  return (
    <SafeAreaView style={styles.container} edges={["top", "left", "right"]}>
      {/* Date Navigation Header */}
      <View style={styles.dateNavigation}>
        <Button
          type="clear"
          onPress={handlePreviousDay}
          icon={<Icon name="chevron-back-outline" type="ionicon" color={theme.colors.primary} size={28} />}
          buttonStyle={styles.navButton}
          disabled={isSaving || isLoadingData} // Disable nav while loading/saving
        />
        <TouchableOpacity onPress={() => !isSaving && !isLoadingData && setShowDatePicker(true)} disabled={isSaving || isLoadingData}>
          <Text h4 style={styles.dateText}>
             {formatDateReadable(parseISO(selectedDate))} {/* Parse ISO string for formatting */}
          </Text>
        </TouchableOpacity>
        <Button
          type="clear"
          onPress={handleNextDay}
          icon={<Icon name="chevron-forward-outline" type="ionicon" color={theme.colors.primary} size={28} />}
          buttonStyle={styles.navButton}
          disabled={isSaving || isLoadingData} // Disable nav while loading/saving
        />
      </View>

      {/* Date Picker */}
      {showDatePicker && (
        <DateTimePicker
          value={parseISO(selectedDate)} // Ensure value is a Date object
          mode="date"
          display={Platform.OS === "ios" ? "spinner" : "default"}
          onChange={handleDateChange}
          // maximumDate={new Date()} // Optional: Prevent future dates
        />
      )}

      {/* Progress Bars */}
       <View style={styles.progressContainer}>
            <DailyProgress
                calories={calculateTotals.totalCalories}
                protein={calculateTotals.totalProtein}
                carbs={calculateTotals.totalCarbs}
                fat={calculateTotals.totalFat}
                goals={dailyGoals}
            />
       </View>
      <Divider style={styles.divider} />

      {/* Saving Indicator */}
      {isSaving && (
          <View style={styles.savingIndicator}>
              <ActivityIndicator size="small" color={theme.colors.primary} />
              <Text style={styles.savingText}>Saving...</Text>
          </View>
      )}


      {/* Entries List */}
      {isLoadingData ? (
         <View style={styles.centeredLoader}>
            <ActivityIndicator size="large" color={theme.colors.primary} />
            <Text style={styles.loadingText}>Loading Entries...</Text>
          </View>
      ) : (
        <FlatList
            data={currentEntryItems}
            // Use food.id and original index if available, fallback to reversedIndex
            keyExtractor={(item, index) => `entry-${item?.food?.id ?? 'unknown'}-${getOriginalIndex(index)}-${item?.grams ?? index}`}
            renderItem={({ item, index }) => <RenderItem item={item} reversedIndex={index} />}
            ListHeaderComponent={
                 <Text h4 style={styles.sectionTitle}>
                    Today's Entries
                 </Text>
            }
            ListEmptyComponent={
            <View style={styles.emptyListContainer}>
                <Icon name="leaf-outline" type="ionicon" size={40} color={theme.colors.grey3} />
                <Text style={styles.emptyListText}>No entries for this day yet.</Text>
                <Text style={styles.emptyListSubText}>Tap the '+' button to add food.</Text>
            </View>
            }
            initialNumToRender={15} // Render more initially if performance allows
            maxToRenderPerBatch={10}
            windowSize={21} // Larger window size
            contentContainerStyle={styles.listContentContainer}
            keyboardShouldPersistTaps="handled" // Allow taps inside list while keyboard is up
        />
      )}


      {/* FAB */}
      <FAB
        icon={<Icon name="add" color="white" />}
        color={theme.colors.primary}
        onPress={() => !isSaving && toggleOverlay()} // Prevent opening while saving
        placement="right"
        size="large"
        style={styles.fab}
        disabled={isSaving || isLoadingData} // Disable FAB while loading/saving
      />

      {/* Add/Edit Modal */}
      <AddEntryModal
        isVisible={isOverlayVisible}
        toggleOverlay={toggleOverlay}
        selectedFood={selectedFood}
        grams={grams}
        setGrams={setGrams}
        foods={foods} // Pass full food list for searching in modal
        handleAddEntry={handleSingleEntryAction} // Callback for single add/update
        handleAddMultipleEntries={handleAddMultipleEntries} // Callback for multi-add
        handleSelectFood={handleSelectFood}
        search={search}
        updateSearch={updateSearch}
        isEditMode={editIndexModal !== null} // True if modal is in edit mode
        initialGrams={editIndexModal !== null ? grams : undefined} // Pass initial grams only in edit mode
        // Pass isSaving status to potentially disable modal actions
      />
    </SafeAreaView>
  );
};

// Styles definition using makeStyles
const useStyles = makeStyles((theme) => ({
  container: { flex: 1, backgroundColor: theme.colors.background },
  dateNavigation: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 6, // Reduced padding
    paddingHorizontal: 5,
    backgroundColor: theme.colors.background, // Ensure background match
    // borderBottomWidth: StyleSheet.hairlineWidth,
    // borderBottomColor: theme.colors.divider,
  },
  navButton: { paddingHorizontal: 10, paddingVertical: 5 },
  dateText: {
    fontSize: 18,
    fontWeight: "bold",
    color: theme.colors.text,
    textAlign: "center",
    paddingVertical: 5,
    paddingHorizontal: 10, // Add padding for touch area
  },
  progressContainer: {
      paddingHorizontal: 10,
      paddingTop: 5, // Add some space above progress bars
  },
   divider: {
        marginTop: 5, // Reduced margin
        marginBottom: 8,
        backgroundColor: theme.colors.divider,
    },
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
  sectionTitle: {
    marginTop: 0, // Remove top margin, rely on divider
    marginBottom: 10,
    paddingHorizontal: 15,
    fontWeight: "600",
    fontSize: 18,
    color: theme.colors.text, // Use main text color
  },
  listContentContainer: {
      paddingBottom: 80, // Ensure space for FAB
  },
  // Styles for list items within RenderItem memo component
   foodIconContainer: { // Container for icon/activity indicator
       width: 40,
       height: 40,
       marginRight: 15,
       borderRadius: 20, // Circular
       backgroundColor: theme.colors.grey5,
       alignItems: "center",
       justifyContent: "center",
       overflow: "hidden", // Clip image if needed
   },
   foodIconImage: {
       width: '100%',
       height: '100%',
   },
  listItemTitle: {
        color: theme.colors.text,
        fontWeight: "bold",
        fontSize: 16,
    },
  listItemSubtitle: {
      color: theme.colors.grey1,
      fontSize: 14,
      marginTop: 3,
      paddingVertical: 2, // Make touch area slightly larger
  },
  inlineEditContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 3, // Reduced margin
    width: "100%", // Take available width
  },
  inlineInputContainer: {
      flex: 1, // Allow input to grow
      maxWidth: 80, // Max width
      height: 35, // Reduced height
      paddingHorizontal: 0,
      marginRight: 4,
   },
  inlineInputInnerContainer: {
    borderBottomWidth: 1,
    borderColor: theme.colors.primary,
    paddingHorizontal: 6,
    height: "100%",
    paddingVertical: 0,
    justifyContent: "center",
    backgroundColor: theme.colors.background, // Match background
  },
  inlineInput: {
    fontSize: 14,
    color: theme.colors.text,
    textAlign: "right",
    paddingVertical: 0, // Remove extra padding
  },
  inlineInputSuffix: {
    fontSize: 14,
    color: theme.colors.grey1,
    marginLeft: 0,
    marginRight: 8, // Space before buttons
  },
  inlineButtonContainer: {
    padding: 0,
    marginHorizontal: 0, // Reduced margin
    minWidth: 30, // Ensure button touch area
    justifyContent: "center",
    alignItems: "center",
  },
   swipeButtonEdit: {
       minHeight: '100%',
       backgroundColor: theme.colors.warning,
       justifyContent: 'center',
       alignItems: 'center', // Center content
   },
   swipeButtonDelete: {
       minHeight: '100%',
       backgroundColor: theme.colors.error,
       justifyContent: 'center',
       alignItems: 'center', // Center content
   },
  // Empty List Styles
  emptyListContainer: {
    flex: 1, // Allow centering
    alignItems: "center",
    justifyContent: "center",
    padding: 30,
    marginTop: 30, // Add some space from header
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
  fab: { position: "absolute", margin: 16, right: 5, bottom: 5 }, // Adjusted position slightly
}));

export default DailyEntryScreen;
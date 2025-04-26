// src/screens/DailyEntryScreen.tsx
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
import {
  formatDateReadable,
  getTodayDateString,
  formatDateISO,
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
  Icon as RNEIcon, // Renamed import
} from "@rneui/themed";
import DateTimePicker, { DateTimePickerEvent } from "@react-native-community/datetimepicker";
import { addDays, subDays, parseISO, formatISO, isValid } from "date-fns";
import { SafeAreaView } from "react-native-safe-area-context";
import AddEntryModal from "../components/AddEntryModal";
import "react-native-get-random-values";
import Toast from "react-native-toast-message";
import { useFocusEffect } from "@react-navigation/native";
import { getFoodIconUrl } from "../utils/iconUtils";

interface DailyGoals {
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
}

const DailyEntryScreen: React.FC = () => {
  const [dailyEntries, setDailyEntries] = useState<DailyEntry[]>([]);
  const [selectedDate, setSelectedDate] = useState<string>(getTodayDateString());
  const [foods, setFoods] = useState<Food[]>([]);
  const [selectedFood, setSelectedFood] = useState<Food | null>(null);
  const [grams, setGrams] = useState("");
  const [isOverlayVisible, setIsOverlayVisible] = useState(false);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [dailyGoals, setDailyGoals] = useState<DailyGoals>({
    calories: 2000, protein: 150, carbs: 200, fat: 70,
  });
  const [search, setSearch] = useState("");
  const [editIndex, setEditIndex] = useState<number | null>(null); // Modal edit index (reversed)
  const [foodIcons, setFoodIcons] = useState<{ [foodName: string]: string | null | undefined }>({});
  const [isLoadingData, setIsLoadingData] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  const { theme } = useTheme();
  const styles = useStyles();

  // --- Data Loading and Icon Fetching ---
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
  }, [selectedDate]); // Dependency only on selectedDate

   // Fetch icons based on currently visible items and all available foods
   const triggerIconFetches = useCallback((allFoods: Food[], allEntries: DailyEntry[], currentDate: string) => {
    const relevantFoodNames = new Set<string>();

    // Add names from the current day's entries
    const currentOriginalEntry = allEntries.find((entry) => entry.date === currentDate);
    if (currentOriginalEntry) {
        currentOriginalEntry.items.forEach((item) => {
            if (item.food?.name) {
                relevantFoodNames.add(item.food.name);
            }
        });
    }

    // Add names from all available foods (for the modal) - optional optimization: only fetch if modal opens?
    // allFoods.forEach((f) => relevantFoodNames.add(f.name));

    console.log(`DailyEntryScreen: Triggering icon fetches for ${relevantFoodNames.size} unique food names.`);
    relevantFoodNames.forEach((foodName) => {
      if (foodIcons[foodName] === undefined) { // Only fetch if status is unknown
        setFoodIcons(prevIcons => ({ ...prevIcons, [foodName]: undefined })); // Mark as loading
        getFoodIconUrl(foodName)
          .then((iconUrl) => {
            setFoodIcons((prevIcons) => ({ ...prevIcons, [foodName]: iconUrl }));
          })
          .catch((error) => {
            console.warn(`Icon fetch failed for ${foodName} in background:`, error);
            setFoodIcons((prevIcons) => ({ ...prevIcons, [foodName]: null })); // Mark as failed/no icon
          });
      }
    });
  }, [foodIcons]); // Depend on foodIcons to know which ones are already fetched/fetching

  useFocusEffect(
    useCallback(() => {
      loadData();
      return () => {
        console.log("DailyEntryScreen: Unfocused.");
        setSearch("");
        setIsOverlayVisible(false);
        setEditIndex(null);
      };
    }, [loadData]) // Depend on loadData callback
  );

  // --- List and Index Management ---
  const currentEntryItems = useMemo(() => {
    const entry = dailyEntries.find((e) => e.date === selectedDate);
    // Display most recent first
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

  // --- State Update Helper ---
  const updateAndSaveEntries = useCallback(async (updatedEntries: DailyEntry[]) => {
    setIsSaving(true);
    const entryForSelectedDate = updatedEntries.find((e) => e.date === selectedDate);
    console.log(`DailyEntryScreen: updateAndSaveEntries called. Saving ${updatedEntries.length} total entries.`);
    console.log(`Entry for ${selectedDate} contains ${entryForSelectedDate?.items?.length ?? 0} items.`);
    setDailyEntries(updatedEntries); // Update UI state immediately
    try {
      await saveDailyEntries(updatedEntries);
      console.log("DailyEntryScreen: Successfully saved updated entries to storage.");
    } catch (error) {
      console.error("DailyEntryScreen: Failed to save updated entries to storage:", error);
      Alert.alert("Save Error", "Could not save changes. Please try again.");
      // Consider reverting state here if save fails critically
      // loadData(); // Or reload data to ensure consistency
    } finally {
      setIsSaving(false);
    }
  }, [selectedDate]); // Added selectedDate dependency

  // --- Add/Update/Remove Entry Handlers ---
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

    const isEditMode = editIndex !== null;
    console.log(`handleSingleEntryAction: Mode=${isEditMode ? 'Edit' : 'Add'}, Food=${selectedFood.name}, Grams=${numericGrams}, ReversedIndex=${editIndex}`);

    const existingEntryIndex = dailyEntries.findIndex((entry) => entry.date === selectedDate);
    let updatedEntries: DailyEntry[];

    if (existingEntryIndex > -1) {
      const existingEntry = dailyEntries[existingEntryIndex];
      let updatedItems;
      if (isEditMode) {
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
        // Add to the beginning of the original array before reversing
        updatedItems = [entryItem, ...(existingEntry.items ?? [])];
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
      updatedEntries.sort((a, b) => a.date.localeCompare(b.date)); // Keep entries sorted by date
    }

    await updateAndSaveEntries(updatedEntries);

    // Trigger icon fetch if needed for the added/edited food
    if (foodIcons[selectedFood.name] === undefined) {
      triggerIconFetches([selectedFood], [], selectedDate);
    }

    setSelectedFood(null);
    setGrams("");
    setEditIndex(null);
    setIsOverlayVisible(false);
    setSearch("");
    Toast.show({
        type: "success",
        text1: `Entry ${isEditMode ? 'updated' : 'added'}`,
        position: "bottom",
        visibilityTime: 2000,
      });

  }, [
    selectedFood, grams, editIndex, dailyEntries, selectedDate, isSaving,
    getOriginalIndex, updateAndSaveEntries, foodIcons, triggerIconFetches
  ]);

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
          // Add new items to the beginning of the original array
          const updatedItems = [...newItems, ...(existingEntry.items ?? [])];
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
          text2: `to ${formatDateReadable(parseISO(selectedDate))}`,
          position: "bottom",
          visibilityTime: 3000,
        });

        setIsOverlayVisible(false);
        setSelectedFood(null);
        setGrams("");
        setEditIndex(null);
        setSearch("");

      } catch (error) {
        console.error("DailyEntryScreen: Error in handleAddMultipleEntries:", error);
        Alert.alert(
          "Quick Add Error",
          `Failed to add items. ${error instanceof Error ? error.message : "Please try again."}`
        );
        setIsOverlayVisible(false); // Ensure modal closes on error
      }
    },
    [dailyEntries, selectedDate, isSaving, updateAndSaveEntries, triggerIconFetches] // Added triggerIconFetches
  );

  const handleSelectFood = (item: Food | null) => {
     console.log("Modal selecting food:", item?.name ?? 'null');
    setSelectedFood(item);
     if (item && editIndex === null) { // Clear grams only when selecting for ADD
          setGrams('');
     }
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
      bottomOffset: 80, // Adjust if needed based on FAB/navbar
      visibilityTime: 4000,
      onPress: () => handleUndoRemoveEntry(itemToRemove, selectedDate, originalIndex),
    });

  }, [dailyEntries, selectedDate, isSaving, getOriginalIndex, updateAndSaveEntries]);

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
        // Insert back at the original position
        updatedItems.splice(originalIndex, 0, itemToRestore);
        const restoredEntry = { ...entryToUpdate, items: updatedItems };
        updatedEntries = dailyEntries.map((entry, index) =>
            index === existingEntryIndex ? restoredEntry : entry
        );
        console.log(`Item inserted back into existing entry at index ${originalIndex}.`);
    } else {
        // If the whole entry was removed, re-create it
        console.log(`Creating new entry for date ${entryDate} as it was removed.`);
        const newEntry: DailyEntry = { date: entryDate, items: [itemToRestore] };
        updatedEntries = [...dailyEntries, newEntry];
        updatedEntries.sort((a, b) => a.date.localeCompare(b.date)); // Keep sorted
    }

    await updateAndSaveEntries(updatedEntries);
    Toast.hide(); // Hide the undo toast
    Toast.show({
      type: "success",
      text1: "Entry restored!",
      visibilityTime: 1500,
      position: "bottom",
    });
  }, [dailyEntries, isSaving, updateAndSaveEntries]);

  const updateSearch = (search: string) => setSearch(search);

  // --- Modal Toggle Logic ---
  const toggleOverlay = useCallback((
    itemToEdit: DailyEntryItem | null = null,
    reversedIndex: number | null = null
  ) => {
    if (isSaving) {
        console.warn("Attempted to toggle modal while saving.");
        return;
    }

    // Clear general modal state first
    setSelectedFood(null);
    setGrams("");
    setEditIndex(null);
    setSearch("");

    if (itemToEdit && reversedIndex !== null) {
      // --- Setup for MODAL EDIT ---
      console.log(`Opening modal to edit item '${itemToEdit.food.name}' at reversed index ${reversedIndex}`);
      setSelectedFood(itemToEdit.food);
      setGrams(String(itemToEdit.grams));
      setEditIndex(reversedIndex); // Store REVERSED index for modal context
      setIsOverlayVisible(true);
    } else {
      // --- Setup for ADD or Closing ---
      setIsOverlayVisible((current) => !current);
    }
  }, [isSaving]); // Added isSaving dependency

  // Explicit handler for swipe-edit action
  const handleEditEntryViaModal = (item: DailyEntryItem, reversedIndex: number) => {
    toggleOverlay(item, reversedIndex);
  };

  // --- Date Navigation Handlers ---
  const handleDateChange = useCallback((event: DateTimePickerEvent, selectedDateValue?: Date) => {
    const isAndroidDismiss = Platform.OS === "android" && event.type === "dismissed";
    setShowDatePicker(Platform.OS === "ios"); // Keep iOS picker open until done

    if (!isAndroidDismiss && event.type === "set" && selectedDateValue) {
        if (isValid(selectedDateValue)) {
             const formattedDate = formatISO(selectedDateValue, { representation: "date" });
            if (formattedDate !== selectedDate) {
                 console.log(`Date changed via picker to: ${formattedDate}`);
                 setSelectedDate(formattedDate);
                 setEditIndex(null); // Cancel modal edit if date changes
            }
        } else {
            console.warn("Date picker returned invalid date:", selectedDateValue);
            Alert.alert("Invalid Date", "The selected date is not valid.");
        }
    }
     if (Platform.OS === "android") { // Always close Android picker after action/dismiss
         setShowDatePicker(false);
     }
  }, [selectedDate]); // Depend only on selectedDate

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
        setEditIndex(null);
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
        setEditIndex(null);
    } catch (e) {
      console.error("Error calculating next day:", selectedDate, e);
    }
  }, [selectedDate]);

  // --- Totals Calculation ---
  const calculateTotals = useMemo(() => {
    const currentOriginalEntry = dailyEntries.find((entry) => entry.date === selectedDate);
    let totals = { totalCalories: 0, totalProtein: 0, totalCarbs: 0, totalFat: 0 };

    if (currentOriginalEntry) {
      currentOriginalEntry.items.forEach((item) => {
        // Check for valid food object and numeric macros/grams
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
    // Round totals for display
    return {
      totalCalories: Math.round(totals.totalCalories),
      totalProtein: Math.round(totals.totalProtein),
      totalCarbs: Math.round(totals.totalCarbs),
      totalFat: Math.round(totals.totalFat),
    };
  }, [dailyEntries, selectedDate]);

   // --- Render Item Component (Memoized, Styled for consistency) ---
   const RenderItem = React.memo(({ item, reversedIndex }: { item: DailyEntryItem, reversedIndex: number }) => {
        const [iconLoadError, setIconLoadError] = useState(false);
        const iconStatus = foodIcons[item.food.name]; // Check status using name
        const isLoadingIcon = iconStatus === undefined;

        const handleImageError = useCallback(() => {
            console.warn(`Image component failed to load icon for ${item.food.name}: ${iconStatus}`);
            setIconLoadError(true);
            // Explicitly update state in cache to null if Image fails
            if (foodIcons[item.food.name] !== null) {
                setFoodIcons(prev => ({ ...prev, [item.food.name]: null }));
            }
        }, [item.food.name, iconStatus]); // Depend on iconStatus

        // Reset error state if the URL changes (e.g., during refresh)
        useEffect(() => {
            setIconLoadError(false);
        }, [iconStatus]);

        const renderListItemIcon = () => {
             if (isLoadingIcon) {
                 // Consistent Loading Placeholder
                 return (
                    <View style={[styles.foodIcon, styles.iconPlaceholder]}>
                        <ActivityIndicator size="small" color={theme.colors.grey3} />
                    </View>
                 );
             } else if (iconStatus && !iconLoadError) {
                 // Display Image
                 return <Image source={{ uri: iconStatus }} style={styles.foodIconImage} onError={handleImageError} resizeMode="contain" />;
             } else {
                 // Consistent Default/Error Placeholder
                 return (
                     <View style={[styles.foodIcon, styles.iconPlaceholder]}>
                         <RNEIcon
                             name="fast-food-outline" // Default icon consistent with FoodListScreen
                             type="ionicon"
                             size={20}
                             color={theme.colors.grey3}
                         />
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
                            if (!isSaving) {
                                handleEditEntryViaModal(item, reversedIndex); // Use modal edit
                                reset();
                            }
                        }}
                        icon={{ name: "edit", color: theme.colors.white }}
                        buttonStyle={styles.swipeButtonEdit} // Consistent style
                        titleStyle={styles.swipeButtonTitle}
                        disabled={isSaving}
                    />
                )}
                rightContent={(reset) => (
                    <Button
                        title="Delete"
                        onPress={() => {
                            if (!isSaving) {
                                handleRemoveEntry(reversedIndex);
                                reset();
                            }
                        }}
                        icon={{ name: "delete", color: theme.colors.white }}
                        buttonStyle={styles.swipeButtonDelete} // Consistent style
                        titleStyle={styles.swipeButtonTitle}
                        disabled={isSaving}
                    />
                )}
                containerStyle={styles.listItemContainer} // Use consistent list item style
            >
                {renderListItemIcon()}

                <ListItem.Content>
                    <ListItem.Title style={styles.listItemTitle}>
                        {item.food.name}
                    </ListItem.Title>
                     {/* Display Grams and Calculated Calories */}
                    <ListItem.Subtitle style={styles.listItemSubtitle}>
                        {`${item.grams}g • ${Math.round((item.food.calories / 100) * item.grams)} kcal`}
                    </ListItem.Subtitle>
                </ListItem.Content>
                {/* Chevron indicates interactibility (swipe) */}
                <ListItem.Chevron color={theme.colors.grey3} />
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
          icon={<RNEIcon name="chevron-back-outline" type="ionicon" color={theme.colors.primary} size={28} />} // Use Primary color
          buttonStyle={styles.navButton}
          disabled={isSaving || isLoadingData}
        />
        <TouchableOpacity onPress={() => !isSaving && !isLoadingData && setShowDatePicker(true)} disabled={isSaving || isLoadingData}>
          <Text h4 h4Style={styles.dateText}>
             {formatDateReadable(parseISO(selectedDate))}
          </Text>
        </TouchableOpacity>
        <Button
          type="clear"
          onPress={handleNextDay}
          icon={<RNEIcon name="chevron-forward-outline" type="ionicon" color={theme.colors.primary} size={28} />} // Use Primary color
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
          // maximumDate={new Date()} // Consider if future dates should be disallowed
        />
      )}

       {/* Progress Section - Added padding */}
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

      {/* Section Title */}
      <Text style={styles.sectionTitle}>
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
            keyExtractor={(item, index) => `entry-${item?.food?.id ?? 'unknown'}-${getOriginalIndex(index)}-${item?.grams ?? index}`}
            renderItem={({ item, index }) => <RenderItem item={item} reversedIndex={index} />}
            ListEmptyComponent={
                <View style={styles.emptyListContainer}>
                    <RNEIcon name="reader-outline" type="ionicon" size={50} color={theme.colors.grey3} />
                    <Text style={styles.emptyListText}>No entries recorded for this day.</Text>
                    <Text style={styles.emptyListSubText}>Tap the '+' button to add your first meal.</Text>
                </View>
            }
            initialNumToRender={10}
            maxToRenderPerBatch={5}
            windowSize={11}
            contentContainerStyle={styles.listContentContainer} // Handles paddingBottom for FAB
            keyboardShouldPersistTaps="handled" // Good for modals
        />
      )}

      {/* FAB */}
      <FAB
        icon={<RNEIcon name="add" color="white" />}
        color={theme.colors.primary}
        onPress={() => !isSaving && toggleOverlay()} // Open Add modal
        placement="right"
        size="large"
        style={styles.fab}
        disabled={isSaving || isLoadingData} // Disable while saving/loading
      />

      {/* Add/Edit Modal */}
      <AddEntryModal
        isVisible={isOverlayVisible}
        toggleOverlay={toggleOverlay}
        selectedFood={selectedFood}
        grams={grams}
        setGrams={setGrams}
        foods={foods} // Pass available foods
        handleAddEntry={handleSingleEntryAction}
        handleAddMultipleEntries={handleAddMultipleEntries}
        handleSelectFood={handleSelectFood}
        search={search}
        updateSearch={updateSearch}
        isEditMode={editIndex !== null} // Correctly pass edit mode status
        initialGrams={editIndex !== null ? grams : undefined} // Pass grams only if editing
      />
    </SafeAreaView>
  );
};

// --- Styles ---
const useStyles = makeStyles((theme) => ({
    container: {
        flex: 1,
        backgroundColor: theme.colors.background,
    },
    dateNavigation: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        paddingVertical: 10, // Increased padding
        paddingHorizontal: 10, // Balanced padding
        backgroundColor: theme.colors.background, // Ensure background consistency
        // Optional: add subtle shadow or border if needed
        // borderBottomWidth: StyleSheet.hairlineWidth,
        // borderBottomColor: theme.colors.divider,
    },
    navButton: {
        paddingHorizontal: 8,
    },
    dateText: {
        fontSize: 18,
        fontWeight: "bold",
        color: theme.colors.text,
        textAlign: 'center',
        paddingVertical: 5, // Maintain touchability
    },
    progressContainer: { // Added container for padding
        paddingHorizontal: 15,
        paddingTop: 10, // Add space above progress bars
    },
    // Consistent Icon Styles (Adopted from FoodItem/FoodListScreen)
     foodIcon: { // Container style for placeholder/loading icon
       width: 40,
       height: 40,
       marginRight: 15, // Consistent spacing
       borderRadius: 8, // Consistent shape
       alignItems: 'center',
       justifyContent: 'center',
   },
   foodIconImage: { // Specific style for the Image component itself
       width: 40,
       height: 40,
       marginRight: 15,
       borderRadius: 8, // Consistent shape
   },
   iconPlaceholder: {
      backgroundColor: theme.colors.grey5, // Consistent placeholder background
   },
    // Consistent List Item Styles
    listItemContainer: {
        backgroundColor: theme.colors.background,
        paddingVertical: 12,
        paddingHorizontal: 15,
        borderBottomColor: theme.colors.divider,
    },
    listItemTitle: {
        color: theme.colors.text,
        fontWeight: "600", // Slightly bolder than default
        fontSize: 16,
        marginBottom: 3, // Space between title and subtitle
    },
    listItemSubtitle: {
        color: theme.colors.grey1,
        fontSize: 14,
    },
    divider: {
        marginVertical: 0, // Remove vertical margin, use padding on sections
        height: StyleSheet.hairlineWidth, // Thinner divider
        backgroundColor: theme.colors.divider,
    },
    sectionTitle: { // Consistent Section Title Style
        marginTop: 15,
        marginBottom: 10,
        paddingHorizontal: 15,
        fontWeight: 'bold', // Bold title
        fontSize: 18,
        color: theme.colors.text, // Use main text color
    },
    fab: {
        position: 'absolute',
        margin: 16,
        right: 10,
        bottom: 10,
    },
    emptyListContainer: { // Consistent Empty State Style
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        padding: 30,
        marginTop: 50, // Add some space from top elements
    },
    emptyListText: {
        fontSize: 17,
        color: theme.colors.grey2,
        textAlign: 'center',
        marginTop: 15,
    },
    emptyListSubText: {
        fontSize: 14,
        color: theme.colors.grey3,
        textAlign: 'center',
        marginTop: 8,
    },
    // Consistent Swipe Button Styles
    swipeButtonEdit: {
        minHeight: "100%",
        backgroundColor: theme.colors.warning, // Use theme color
        justifyContent: 'center',
        alignItems: 'flex-start',
        paddingLeft: 20,
    },
    swipeButtonDelete: {
        minHeight: "100%",
        backgroundColor: theme.colors.error, // Use theme color
        justifyContent: 'center',
        alignItems: 'flex-end',
        paddingRight: 20,
    },
    swipeButtonTitle: {
        color: theme.colors.white,
        fontWeight: 'bold',
        fontSize: 15,
    },
    // --- Loader and Saving Styles ---
    centeredLoader: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      paddingBottom: 50, // Avoid overlap with potential header/FAB
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
      paddingVertical: 5, // Increased padding
      backgroundColor: theme.colors.grey5, // Subtle background indication
    },
    savingText: {
        marginLeft: 8,
        color: theme.colors.primary,
        fontSize: 14,
        fontStyle: 'italic',
    },
    // --- List Content Container Style ---
    listContentContainer: {
        paddingBottom: 80, // Ensure space below list for FAB
    }
}));

export default DailyEntryScreen;
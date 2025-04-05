// src/screens/DailyEntryScreen.tsx
import React, { useState, useEffect, useCallback, useMemo } from "react";
import { View, FlatList, Alert, Platform, Image, StyleSheet, TouchableOpacity, ActivityIndicator } from "react-native";
import { DailyEntry, DailyEntryItem } from "../types/dailyEntry";
import { Food } from "../types/food";
import { getFoods } from "../services/foodService";
import {
    saveDailyEntries,
    loadDailyEntries,
    loadSettings,
} from "../services/storageService";
import {
    formatDate, // Keep this if used elsewhere, but formatISO is used for storage/keys
    formatDateReadable,
    getTodayDateString,
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
import DateTimePicker from "@react-native-community/datetimepicker";
import { addDays, subDays, parseISO, formatISO } from "date-fns";
import { Icon } from "@rneui/base";
import { SafeAreaView } from "react-native-safe-area-context";
import AddEntryModal from "../components/AddEntryModal";
import "react-native-get-random-values"; // Ensure this is imported before uuid
import Toast from "react-native-toast-message";
import { useFocusEffect } from '@react-navigation/native';
import { getFoodIconUrl } from "./../utils/iconUtils"; // Import the icon helper function

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
    const [selectedDate, setSelectedDate] = useState<string>(getTodayDateString()); // YYYY-MM-DD format
    const [foods, setFoods] = useState<Food[]>([]); // Holds the permanent food list from storage
    const [selectedFood, setSelectedFood] = useState<Food | null>(null); // Food selected in the modal for single add/edit
    const [grams, setGrams] = useState(""); // Grams input value in the modal
    const [isOverlayVisible, setIsOverlayVisible] = useState(false); // Modal visibility
    const [showDatePicker, setShowDatePicker] = useState(false); // Date picker visibility
    const [dailyGoals, setDailyGoals] = useState<DailyGoals>({
        calories: 2000, protein: 50, carbs: 200, fat: 70, // Default goals
    });
    const [editingIndex, setEditingIndex] = useState<number | null>(null); // Index for *inline* editing (original index)
    const [tempGrams, setTempGrams] = useState(""); // Temporary grams for inline editing
    const [search, setSearch] = useState(""); // Search query in the modal
    const [editIndex, setEditIndex] = useState<number | null>(null); // Index for *modal* editing (reversed index)
    const [foodIcons, setFoodIcons] = useState<{ [foodName: string]: string | null }>({}); // Cache for food icons { foodName: url | null }

    const { theme } = useTheme();
    const styles = useStyles();

    // --- Data Loading and Icon Fetching ---

    // Function to load main data (entries, foods, settings) and pre-fetch icons
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

            // --- Icon Pre-fetching ---
            const iconsToFetch: { [foodName: string]: Promise<string | null> } = {};
            const allRelevantFoods: Food[] = [...loadedFoods]; // Start with all permanent foods

            // Add foods from the currently selected day's entries
            const currentOriginalEntry = loadedEntries.find((entry) => entry.date === selectedDate);
            if (currentOriginalEntry) {
                currentOriginalEntry.items.forEach(item => {
                    // Add food to the list if not already present based on name (more robust would be ID if available)
                    if (!allRelevantFoods.some(f => f.name === item.food.name)) {
                        allRelevantFoods.push(item.food);
                    }
                });
            }

            // Identify icons needing fetch (not already in state or null)
            for (const food of allRelevantFoods) {
                if (foodIcons[food.name] === undefined) { // Only fetch if status is unknown
                    iconsToFetch[food.name] = getFoodIconUrl(food.name).catch(err => {
                        console.warn(`Icon fetch failed for ${food.name}:`, err);
                        return null; // Return null on error
                    });
                }
            }

            // Execute fetches and update state
            if (Object.keys(iconsToFetch).length > 0) {
                const results = await Promise.all(Object.values(iconsToFetch));
                const newIcons: { [foodName: string]: string | null } = {};
                Object.keys(iconsToFetch).forEach((name, index) => {
                    newIcons[name] = results[index];
                });
                setFoodIcons(prevIcons => ({ ...prevIcons, ...newIcons }));
            }
            // --- End Icon Pre-fetching ---

        } catch (error) {
            console.error("Error loading data:", error);
            Alert.alert("Error", "Failed to load necessary data.");
            // Handle error state appropriately, maybe set empty arrays?
            setFoods([]);
            setDailyEntries([]);
        }
    }, [selectedDate]); // Depend on selectedDate to reload icons for that day

    // Load data when the screen comes into focus
    useFocusEffect(
        useCallback(() => {
            loadData();
            // Cleanup function when screen loses focus
            return () => {
                setSearch(''); // Clear search in modal
                setIsOverlayVisible(false); // Ensure modal is closed
                setEditingIndex(null); // Cancel any inline edit
                setTempGrams('');
            };
        }, [loadData]) // loadData callback already includes selectedDate dependency
    );

    // --- List and Index Management ---

    // Memoized reversed list for display purposes
    const currentEntryItems = useMemo(() => {
        const entry = dailyEntries.find((e) => e.date === selectedDate);
        // Create a shallow copy and reverse it for display
        return entry ? [...entry.items].reverse() : [];
    }, [dailyEntries, selectedDate]);

    // Helper to get the *original* index from the *reversed* display index
    const getOriginalIndex = (reversedIndex: number): number => {
         const entry = dailyEntries.find((e) => e.date === selectedDate);
         if (!entry || reversedIndex < 0 || reversedIndex >= entry.items.length) {
             console.error(`Could not find original index for reversedIndex: ${reversedIndex} on date: ${selectedDate}`);
             return -1; // Invalid index or entry not found
         }
         // Calculate original index: (total items - 1) - reversed index
         return entry.items.length - 1 - reversedIndex;
    }

    // --- State Update Helper ---

    // Central function to update dailyEntries state and save to AsyncStorage
    const updateAndSaveEntries = async (updatedEntries: DailyEntry[]) => {
        setDailyEntries(updatedEntries); // Update state immediately for UI responsiveness
        try {
            await saveDailyEntries(updatedEntries); // Persist changes
        } catch (error) {
            console.error("Failed to save updated entries:", error);
            Alert.alert("Save Error", "Could not save changes. Please try again.");
            // Optionally revert state here if save fails critically
            // loadData(); // Or reload data to ensure consistency
        }
    };

    // --- Inline Editing Handlers ---
    const handleStartEditing = (reversedIndex: number) => {
        const originalIndex = getOriginalIndex(reversedIndex);
        if (originalIndex === -1) return; // Safety check

        const currentEntry = dailyEntries.find((e) => e.date === selectedDate);
        if (!currentEntry) return;

        setEditingIndex(originalIndex); // Store the original index
        setTempGrams(String(currentEntry.items[originalIndex].grams));
    };

    const handleSaveInlineEdit = async () => {
        if (editingIndex === null) return; // No item being edited

        const trimmedGrams = tempGrams.trim();
        if (!isValidNumberInput(trimmedGrams) || parseFloat(trimmedGrams) <= 0) {
            Alert.alert(
                "Invalid Input",
                "Please enter a valid, positive number for grams."
            );
            return;
        }
        const newGramsValue = parseFloat(trimmedGrams);

        const currentEntry = dailyEntries.find((e) => e.date === selectedDate);
        // Double check entry and index validity before modifying
        if (!currentEntry || editingIndex < 0 || editingIndex >= currentEntry.items.length) {
            console.error("Error saving inline edit: Invalid entry or index.");
            setEditingIndex(null); // Reset editing state
            setTempGrams("");
            return;
        }

        // Create updated items array
        const updatedItems = currentEntry.items.map((item, index) => {
            if (index === editingIndex) {
                return { ...item, grams: newGramsValue };
            }
            return item;
        });

        // Create updated entries array
        const updatedEntries = dailyEntries.map((entry) =>
            entry.date === selectedDate ? { ...entry, items: updatedItems } : entry
        );

        await updateAndSaveEntries(updatedEntries);

        // Reset editing state
        setEditingIndex(null);
        setTempGrams("");
    };

    const handleCancelInlineEdit = () => {
        setEditingIndex(null);
        setTempGrams("");
    };
    // --- End Inline Editing ---

    // --- Add/Update/Remove Entry Handlers ---

    // Handles adding a single new entry OR updating an existing one (triggered from modal)
    const handleSingleEntryAction = async () => {
        // Validate selected food and grams input
        if (!selectedFood || !selectedFood.id) { // Check for food and id
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

        // Prepare the new/updated entry item
        const entryItem: DailyEntryItem = {
            food: selectedFood, // Use the selected food object
            grams: numericGrams,
        };

        // Find if an entry already exists for the selected date
        const existingEntryIndex = dailyEntries.findIndex((entry) => entry.date === selectedDate);
        let updatedEntries: DailyEntry[];

        if (existingEntryIndex > -1) {
            // Entry for the date exists
            const existingEntry = dailyEntries[existingEntryIndex];
            let updatedItems;

            if (editIndex !== null) {
                // --- Editing an existing item via MODAL ---
                const originalEditIndex = getOriginalIndex(editIndex); // Convert reversed modal index to original
                if (originalEditIndex === -1) {
                    console.error("Error updating entry: Could not find original index for editing.");
                    setIsOverlayVisible(false); // Close modal on error
                    return; // Exit if index mapping failed
                }
                // Replace the item at the original index
                updatedItems = existingEntry.items.map((item, index) =>
                    index === originalEditIndex ? entryItem : item
                );
                console.log(`Updated item at original index ${originalEditIndex} on ${selectedDate}`);

            } else {
                // --- Adding a new single item ---
                updatedItems = [...existingEntry.items, entryItem]; // Add to the end of the original array
                console.log(`Added new item to ${selectedDate}`);
            }
            // Create the updated entry object
            const updatedEntry = { ...existingEntry, items: updatedItems };
            // Map over entries to replace the modified one
            updatedEntries = dailyEntries.map((entry) =>
                entry.date === selectedDate ? updatedEntry : entry
            );
        } else {
            // --- No entry for this date yet, create a new one ---
            console.log(`Creating new entry for ${selectedDate}`);
            const newDailyEntry: DailyEntry = {
                date: selectedDate,
                items: [entryItem], // Start with the new item
            };
            updatedEntries = [...dailyEntries, newDailyEntry];
             // Optional: Sort if date order matters after adding
             updatedEntries.sort((a, b) => a.date.localeCompare(b.date));
        }

        // Save the updated entries list
        await updateAndSaveEntries(updatedEntries);

        // --- Post-Action: Fetch Icon & Reset Modal State ---
        // Attempt to load icon for the newly added/edited food if not already loaded/failed
        if (foodIcons[selectedFood.name] === undefined) {
             try {
                 const iconUrl = await getFoodIconUrl(selectedFood.name);
                 setFoodIcons(prev => ({...prev, [selectedFood.name]: iconUrl})); // Store URL or null
             } catch {
                 setFoodIcons(prev => ({...prev, [selectedFood.name]: null})); // Mark as failed on error
             }
         }

        // Reset modal state and close it
        setSelectedFood(null);
        setGrams("");
        setEditIndex(null); // Clear modal edit index
        setIsOverlayVisible(false);
        setSearch(""); // Clear search
    };


    // --- NEW FUNCTION: Handle Adding Multiple Entries (from Quick Add) ---
    const handleAddMultipleEntries = async (entriesToAdd: { food: Food, grams: number }[]) => {
        if (!entriesToAdd || entriesToAdd.length === 0) {
            console.log("handleAddMultipleEntries called with no entries to add.");
            return; // Nothing to add
        }

        // Map the input to the DailyEntryItem format
        const newItems: DailyEntryItem[] = entriesToAdd.map(entry => ({
            food: entry.food, // Uses the temporary Food object created in the modal
            grams: entry.grams,
        }));

        console.log(`Attempting to add ${newItems.length} items from Quick Add to ${selectedDate}`);

        // Find if an entry already exists for the selected date
        const existingEntryIndex = dailyEntries.findIndex((entry) => entry.date === selectedDate);
        let updatedEntries: DailyEntry[];

        if (existingEntryIndex > -1) {
            // --- Add to existing entry ---
            const existingEntry = dailyEntries[existingEntryIndex];
            // Append the new items to the existing items array
            const updatedItems = [...existingEntry.items, ...newItems];
            const updatedEntry = { ...existingEntry, items: updatedItems };
            // Map over entries to replace the modified one
            updatedEntries = dailyEntries.map((entry, index) =>
                index === existingEntryIndex ? updatedEntry : entry
            );
            console.log(`Appended ${newItems.length} items to existing entry on ${selectedDate}`);
        } else {
            // --- Create new entry for this date ---
            console.log(`Creating new entry with ${newItems.length} items for ${selectedDate}`);
            const newDailyEntry: DailyEntry = {
                date: selectedDate,
                items: newItems, // Start with the array of new items
            };
            updatedEntries = [...dailyEntries, newDailyEntry];
             // Optional: Sort if date order matters after adding
             updatedEntries.sort((a, b) => a.date.localeCompare(b.date));
        }

        // Save the updated entries list
        await updateAndSaveEntries(updatedEntries);

        // --- Post-Action: Fetch Icons & Show Toast ---
        // Attempt to load icons for the newly added foods if not already known
        const iconsToLoad: { [foodName: string]: Promise<string | null> } = {};
        for (const item of newItems) {
            if (foodIcons[item.food.name] === undefined) { // Check if status is unknown
                 iconsToLoad[item.food.name] = getFoodIconUrl(item.food.name).catch(() => null);
            }
        }
         // Fetch and update icon state if needed
        if (Object.keys(iconsToLoad).length > 0) {
            const results = await Promise.all(Object.values(iconsToLoad));
            const newIcons: { [foodName: string]: string | null } = {};
            Object.keys(iconsToLoad).forEach((name, index) => {
                newIcons[name] = results[index];
            });
            setFoodIcons(prevIcons => ({ ...prevIcons, ...newIcons }));
        }

        // Show a success message
        Toast.show({
            type: 'success',
            text1: `${entriesToAdd.length} item(s) added`,
            position: 'bottom',
            visibilityTime: 2500,
        });

        // Modal closing is handled by the modal itself after calling this function
    };
    // --- End NEW FUNCTION ---

    // Selects a food in the modal (for single add/edit)
    const handleSelectFood = (item: Food | null) => {
        setSelectedFood(item);
        // If selecting a food for *adding* (not editing), maybe clear grams?
        // if (item && editIndex === null) {
        //      setGrams('');
        // }
    };

    // Removes an entry from the list (triggered by swipe)
    const handleRemoveEntry = async (reversedIndex: number) => {
        const originalIndex = getOriginalIndex(reversedIndex);
         if (originalIndex === -1) {
            console.error("Cannot remove entry: Invalid index.");
            return; // Safety check
         }

        const currentEntry = dailyEntries.find((e) => e.date === selectedDate);
        if (!currentEntry || originalIndex >= currentEntry.items.length) {
            console.error("Cannot remove entry: Entry not found or index out of bounds.");
            return; // Should not happen if index mapping is correct
        }

        // Get item details *before* filtering for the undo message
        const itemToRemove = currentEntry.items[originalIndex];

        // Filter out the item using the original index
        const updatedItems = currentEntry.items.filter((_, i) => i !== originalIndex);

        let finalEntries: DailyEntry[];

        // Check if removing the item leaves the entry for the day empty
        if (updatedItems.length === 0) {
            // If empty, remove the entire DailyEntry object for that date
            console.log(`Removing empty entry for ${selectedDate}`);
            finalEntries = dailyEntries.filter((entry) => entry.date !== selectedDate);
        } else {
            // Otherwise, just update the items array for the current date's entry
            console.log(`Removing item at original index ${originalIndex} from ${selectedDate}`);
            const updatedEntry = { ...currentEntry, items: updatedItems };
            finalEntries = dailyEntries.map((entry) =>
                entry.date === selectedDate ? updatedEntry : entry
            );
        }

        // Update state and save *before* showing the undo toast
        await updateAndSaveEntries(finalEntries);

        // Show toast with Undo option
        Toast.show({
            type: 'info', // Using info style for delete/undo action
            text1: `${itemToRemove.food.name} entry deleted`,
            text2: 'Tap here to undo',
            position: 'bottom',
            bottomOffset: 80, // Adjust offset if needed
            visibilityTime: 4000, // Give user time to react
            onPress: () => handleUndoRemoveEntry(itemToRemove, selectedDate, originalIndex), // Pass necessary info for undo
        });
    };


    // Restores a previously deleted entry (triggered by toast press)
    const handleUndoRemoveEntry = async (
        itemToRestore: DailyEntryItem,
        entryDate: string, // The date the item was removed from
        originalIndex: number // The original position it occupied
    ) => {
        console.log(`Undoing removal of ${itemToRestore.food.name} at index ${originalIndex} on ${entryDate}`);
        // Find the index of the DailyEntry object for the given date (it might have been removed)
        const existingEntryIndex = dailyEntries.findIndex(e => e.date === entryDate);

        let updatedEntries;

        if (existingEntryIndex > -1) {
            // --- Entry for the date still exists ---
            const entryToUpdate = dailyEntries[existingEntryIndex];
            const updatedItems = [...entryToUpdate.items];
            // Insert the item back at its original position
            updatedItems.splice(originalIndex, 0, itemToRestore);
            // Create the updated entry object
            const restoredEntry = { ...entryToUpdate, items: updatedItems };
            // Map over entries and replace the updated one
            updatedEntries = dailyEntries.map((entry, index) =>
                index === existingEntryIndex ? restoredEntry : entry
            );
        } else {
            // --- Entry was removed because it became empty, need to re-create it ---
            console.log(`Re-creating entry for ${entryDate} to restore item.`);
            const newEntry: DailyEntry = { date: entryDate, items: [itemToRestore] };
            // Add the newly created entry back to the list
            updatedEntries = [...dailyEntries, newEntry];
            // Optional: Sort entries by date if adding back causes order issues
            updatedEntries.sort((a, b) => a.date.localeCompare(b.date));
        }

        // Save the restored state
        await updateAndSaveEntries(updatedEntries);

        // Hide the "undo" toast and show a confirmation
        Toast.hide();
        Toast.show({ type: 'success', text1: 'Entry restored!', visibilityTime: 1500, position: 'bottom' });
    };
    // --- End Remove/Undo Logic ---

    // Updates the search query state in the modal
    const updateSearch = (search: string) => setSearch(search);

    // --- Modal Toggle Logic ---
    // Toggles the visibility of the Add/Edit modal
    const toggleOverlay = (
        itemToEdit: DailyEntryItem | null = null, // Item to populate modal for editing
        reversedIndex: number | null = null // The index *from the reversed list* if editing
    ) => {
        // Always reset modal state when opening/closing for ADD or explicitly closing
        setSelectedFood(null);
        setGrams("");
        setEditIndex(null);
        setSearch("");
        // Keep quick add state reset in modal's useEffect on !isVisible

        if (itemToEdit && reversedIndex !== null) {
            // --- Setup for MODAL EDIT ---
            console.log(`Opening modal to edit item at reversed index ${reversedIndex}`);
            setSelectedFood(itemToEdit.food);
            setGrams(String(itemToEdit.grams));
            setEditIndex(reversedIndex); // Store the reversed index for context within the modal
            setIsOverlayVisible(true); // Show modal after setting state
        } else {
            // --- Setup for ADD or Closing ---
            console.log("Toggling modal for Add or Closing.");
            setIsOverlayVisible(!isOverlayVisible); // Toggle visibility
        }
    };


    // Handles the "Edit" action from the swipe menu, triggering modal opening
    const handleEditEntryViaModal = (item: DailyEntryItem, reversedIndex: number) => {
        toggleOverlay(item, reversedIndex); // Open modal populated for editing
    };
    // --- End Modal Toggle ---

    // --- Date Navigation Handlers ---
    const handleDateChange = (event: any, selectedDateValue?: Date) => {
        const isAndroidDismiss = Platform.OS === 'android' && event.type === 'dismissed';
        setShowDatePicker(Platform.OS === 'ios'); // Keep iOS picker open until done/cancel

        if (!isAndroidDismiss && event.type === "set" && selectedDateValue) {
            // Format the selected date to YYYY-MM-DD string for consistency
            const formattedDate = formatISO(selectedDateValue, { representation: 'date' });
            // Only update state if the date actually changed
            if (formattedDate !== selectedDate) {
                console.log(`Date changed to: ${formattedDate}`);
                setSelectedDate(formattedDate);
                // Data reloading (including icons) is handled by useFocusEffect/loadData dependency
            }
        } else if (Platform.OS === 'android') {
             setShowDatePicker(false); // Close Android picker on dismiss/cancel
        }
    };


    const handlePreviousDay = () => {
        try {
            const currentDate = parseISO(selectedDate); // Parse the YYYY-MM-DD string
            const newDate = subDays(currentDate, 1);
            setSelectedDate(formatISO(newDate, { representation: 'date' }));
        } catch (e) {
             console.error("Error parsing date for previous day:", selectedDate, e);
        }
    }

    const handleNextDay = () => {
        try {
            const currentDate = parseISO(selectedDate);
            const newDate = addDays(currentDate, 1);
            setSelectedDate(formatISO(newDate, { representation: 'date' }));
        } catch (e) {
            console.error("Error parsing date for next day:", selectedDate, e);
        }
    }
    // --- End Date Navigation ---

    // --- Totals Calculation ---
     const calculateTotals = useMemo(() => {
        const currentOriginalEntry = dailyEntries.find((entry) => entry.date === selectedDate);
        let [totalCalories, totalProtein, totalCarbs, totalFat] = [0, 0, 0, 0];

        if (currentOriginalEntry) {
            currentOriginalEntry.items.forEach((item) => {
                // Ensure food object and properties exist before calculation
                if (item.food && typeof item.food.calories === 'number') {
                    totalCalories += (item.food.calories / 100) * item.grams;
                }
                if (item.food && typeof item.food.protein === 'number') {
                    totalProtein += (item.food.protein / 100) * item.grams;
                }
                if (item.food && typeof item.food.carbs === 'number') {
                    totalCarbs += (item.food.carbs / 100) * item.grams;
                }
                if (item.food && typeof item.food.fat === 'number') {
                    totalFat += (item.food.fat / 100) * item.grams;
                }
            });
        }

        // Return rounded totals
        return {
            totalCalories: Math.round(totalCalories),
            totalProtein: Math.round(totalProtein),
            totalCarbs: Math.round(totalCarbs),
            totalFat: Math.round(totalFat),
        };
    }, [dailyEntries, selectedDate]); // Recalculate only when entries or date change

    // --- Render ---
    return (
        <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
            {/* Date Navigation Header */}
            <View style={styles.dateNavigation}>
                <Button
                    type="clear"
                    onPress={handlePreviousDay}
                    icon={
                        <Icon name="chevron-back-outline" type="ionicon" color={theme.colors.text} size={28}/>
                    }
                    buttonStyle={styles.navButton}
                />
                {/* Make the date text pressable to show the picker */}
                <TouchableOpacity onPress={() => setShowDatePicker(true)}>
                    <Text h4 style={styles.dateText}>
                        {formatDateReadable(selectedDate)}
                    </Text>
                </TouchableOpacity>
                <Button
                    type="clear"
                    onPress={handleNextDay}
                    icon={
                        <Icon name="chevron-forward-outline" type="ionicon" color={theme.colors.text} size={28}/>
                    }
                     buttonStyle={styles.navButton}
                />
            </View>

            {/* Date Picker Component */}
            {showDatePicker && (
                <DateTimePicker
                    value={parseISO(selectedDate)} // Current value needs to be a Date object
                    mode="date"
                    display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                    onChange={handleDateChange}
                    // Optional: Set max date, etc.
                    // maximumDate={new Date()}
                />
            )}

            {/* Daily Progress Bars */}
            <DailyProgress
                calories={calculateTotals.totalCalories}
                protein={calculateTotals.totalProtein}
                carbs={calculateTotals.totalCarbs}
                fat={calculateTotals.totalFat}
                goals={dailyGoals} // Pass the loaded daily goals
            />
            <Divider style={styles.divider} />

            <Text h4 style={[styles.sectionTitle, { color: theme.colors.text }]}>
                Today's Entries
            </Text>

            {/* Entries List - Renders the reversed list */}
            <FlatList
                // Use the memoized reversed list for display
                data={currentEntryItems}
                // Key needs to be unique and stable across renders/edits
                keyExtractor={(item, index) => `entry-${item.food.id}-${index}-${item.grams}`}
                renderItem={({ item, index: reversedIndex }) => {
                    // Determine if the current item is being inline-edited
                    const originalIndex = getOriginalIndex(reversedIndex);
                    const isInlineEditing = editingIndex === originalIndex;

                     // Get icon status and URL
                     const iconUrl = foodIcons[item.food.name]; // Could be string, null, or undefined
                     const isLoadingIcon = iconUrl === undefined; // True if fetch hasn't completed

                    return (
                        <ListItem.Swipeable
                            bottomDivider
                            leftContent={(reset) => (
                                <Button
                                    title="Edit"
                                    // Pass reversed index to modal edit handler
                                    onPress={() => {
                                        handleEditEntryViaModal(item, reversedIndex);
                                        reset(); // Close swipe menu
                                    }}
                                    icon={{ name: "edit", color: "white" }}
                                    buttonStyle={{ minHeight: "100%", backgroundColor: theme.colors.warning }}
                                />
                            )}
                            rightContent={(reset) => (
                                <Button
                                    title="Delete"
                                    // Pass reversed index to remove handler
                                    onPress={() => {
                                        handleRemoveEntry(reversedIndex);
                                        reset(); // Close swipe menu
                                    }}
                                    icon={{ name: "delete", color: "white" }}
                                    buttonStyle={{ minHeight: "100%", backgroundColor: theme.colors.error }}
                                />
                            )}
                            containerStyle={{ backgroundColor: theme.colors.background }}
                        >
                            {/* Food Icon - Conditional rendering based on loading/success/failure */}
                            {isLoadingIcon ? (
                                <ActivityIndicator size="small" color={theme.colors.grey3} style={styles.foodIcon} />
                            ) : iconUrl ? (
                                <Image
                                    source={{ uri: iconUrl }}
                                    style={styles.foodIcon}
                                    // Add onError to mark as failed if image load fails *after* successful fetch
                                    onError={() => {
                                         console.warn(`Image component failed to load: ${iconUrl}`);
                                         // Update state to null only if it wasn't already null
                                         if (foodIcons[item.food.name] !== null) {
                                             setFoodIcons(prev => ({ ...prev, [item.food.name]: null }));
                                         }
                                    }}
                                />
                            ) : (
                                // Icon fetch completed but resulted in null (no icon found or fetch error)
                                <Icon
                                    name="restaurant-outline" // Default placeholder icon
                                    type="ionicon"
                                    color={theme.colors.grey3}
                                    containerStyle={styles.defaultIconContainer} // Use container for consistent sizing
                                />
                            )}
                             {/* List Item Content (Title and Subtitle/Inline Edit) */}
                            <ListItem.Content>
                                <ListItem.Title style={styles.listItemTitle}>
                                    {item.food.name}
                                </ListItem.Title>
                                {isInlineEditing ? (
                                    // --- Inline Edit View ---
                                    <View style={styles.inlineEditContainer}>
                                        <Input
                                            value={tempGrams}
                                            onChangeText={setTempGrams}
                                            keyboardType="numeric"
                                            containerStyle={styles.inlineInputContainer}
                                            inputContainerStyle={styles.inlineInputInnerContainer}
                                            inputStyle={styles.inlineInput}
                                            autoFocus // Focus when editing starts
                                            selectTextOnFocus // Select text for easy replacement
                                            maxLength={6} // Limit input length
                                            onSubmitEditing={handleSaveInlineEdit} // Save on keyboard submit
                                            onBlur={handleSaveInlineEdit} // Also save on blur (losing focus) - check if needed
                                        />
                                        <Text style={styles.inlineInputSuffix}>g</Text>
                                        {/* Save Button */}
                                        <Button
                                            type="clear"
                                            onPress={handleSaveInlineEdit}
                                            icon={<Icon name="checkmark-circle" type="ionicon" color={theme.colors.success} size={24} />}
                                            containerStyle={styles.inlineButtonContainer}
                                        />
                                        {/* Cancel Button */}
                                        <Button
                                            type="clear"
                                            onPress={handleCancelInlineEdit}
                                            icon={<Icon name="close-circle" type="ionicon" color={theme.colors.error} size={24} />}
                                            containerStyle={styles.inlineButtonContainer}
                                        />
                                    </View>
                                ) : (
                                    // --- Display View ---
                                    <ListItem.Subtitle
                                        style={styles.listItemSubtitle}
                                        // Trigger inline editing on press
                                        onPress={() => handleStartEditing(reversedIndex)}
                                    >
                                        {/* Show grams and calculated calories */}
                                        {`${item.grams}g • ${Math.round((item.food.calories / 100) * item.grams)} kcal`}
                                    </ListItem.Subtitle>
                                )}
                            </ListItem.Content>
                            {/* Optional: Chevron shown only in display mode */}
                           {!isInlineEditing && <ListItem.Chevron color={theme.colors.grey3} />}
                        </ListItem.Swipeable>
                    )
                }}
                // Message shown when the list is empty
                ListEmptyComponent={
                    <View style={styles.emptyListContainer}>
                        <Icon name="leaf-outline" type="ionicon" size={40} color={theme.colors.grey3} />
                        <Text style={styles.emptyListText}>No entries for this day yet.</Text>
                        <Text style={styles.emptyListSubText}>Tap the '+' button to add food.</Text>
                    </View>
                }
                // Optimization props for FlatList
                initialNumToRender={10}
                maxToRenderPerBatch={5}
                windowSize={11}
            />

            {/* FAB (Floating Action Button) to add new entry */}
            <FAB
                icon={<Icon name="add" color="white" />}
                color={theme.colors.primary}
                onPress={() => toggleOverlay()} // Opens modal in 'add' mode
                placement="right"
                size="large"
                style={styles.fab} // Use style for positioning
            />

            {/* Add/Edit Entry Modal Component */}
            <AddEntryModal
                isVisible={isOverlayVisible}
                toggleOverlay={toggleOverlay}
                selectedFood={selectedFood}
                grams={grams}
                setGrams={setGrams}
                foods={foods} // Pass the permanent food list for searching
                handleAddEntry={handleSingleEntryAction} // Handler for single add/update
                handleAddMultipleEntries={handleAddMultipleEntries} // Handler for quick add confirm
                handleSelectFood={handleSelectFood} // Handler for selecting food in modal search
                search={search}
                updateSearch={updateSearch}
                isEditMode={editIndex !== null} // Pass whether modal is in edit mode
                // initialGrams prop removed as it was redundant
            />
        </SafeAreaView>
    );
};

// Styles definition using makeStyles
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
        color: theme.colors.grey1, // Subtler title color
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
    // --- Inline Editing Styles ---
    inlineEditContainer: { // Container for the input and buttons during inline edit
        flexDirection: "row",
        alignItems: "center",
        marginTop: 5, // Space below the title
        width: '100%', // Take full width of content area
    },
    inlineInputContainer: { // RNE Input component's outer container
        // Removed flex: 1 to use fixed width
        width: 80, // Fixed width for the input area
        height: 38, // Match button height approximately
        paddingHorizontal: 0, // Remove default padding
    },
    inlineInputInnerContainer: { // RNE Input component's inner container (handles underline)
        borderBottomWidth: 1,
        borderColor: theme.colors.primary,
        paddingHorizontal: 6,
        height: '100%',
        paddingVertical: 0, // Remove vertical padding if any
        justifyContent: 'center', // Center text vertically
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
         marginLeft: 4,
         marginRight: 10, // Space before buttons
    },
     inlineButtonContainer: { // Container for the checkmark/cross buttons
        padding: 0, // Remove padding
        marginLeft: 0, // Remove default margins if any
        minWidth: 30, // Ensure decent tap area
        justifyContent: 'center',
        alignItems: 'center',
    },
}));

export default DailyEntryScreen;
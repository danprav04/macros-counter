// DailyEntryScreen.tsx (Corrected and Fully Functional with Reversed List)
import React, { useState, useEffect, useCallback, useMemo } from "react";
import { View, FlatList, Alert, Platform, Image, StyleSheet } from "react-native"; // Import Image and StyleSheet
import { DailyEntry, DailyEntryItem } from "../types/dailyEntry";
import { Food } from "../types/food";
import { getFoods } from "../services/foodService";
import {
    saveDailyEntries,
    loadDailyEntries,
    loadSettings,
} from "../services/storageService";
import {
    formatDate,
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
import "react-native-get-random-values";
import Toast from "react-native-toast-message";
import { useFocusEffect } from '@react-navigation/native';
import { getFoodIconUrl } from "./../utils/iconUtils"; // Import the icon helper function

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
        calories: 2000,
        protein: 50,
        carbs: 200,
        fat: 70,
    });
    const [editingIndex, setEditingIndex] = useState<number | null>(null); // Index for inline editing
    const [tempGrams, setTempGrams] = useState(""); // Temporary grams for inline editing
    const [search, setSearch] = useState("");
    const [editIndex, setEditIndex] = useState<number | null>(null); // Index for modal editing
    const [foodIcons, setFoodIcons] = useState<{ [foodName: string]: string | null }>({});

    const { theme } = useTheme();
    const styles = useStyles();

    const loadData = useCallback(async () => {
        const loadedFoods = await getFoods();
        const loadedEntries = await loadDailyEntries();
        const loadedSettings = await loadSettings();

        if (loadedSettings.dailyGoals) {
            setDailyGoals(loadedSettings.dailyGoals);
        }

        setFoods(loadedFoods);
        setDailyEntries(loadedEntries);
    }, []);

    useFocusEffect(
        useCallback(() => {
            loadData();
            return () => {
                // Optional cleanup when screen loses focus
                setSearch('');
                setIsOverlayVisible(false); // Close modal if navigating away
                setEditingIndex(null); // Cancel inline edit if navigating away
            };
        }, [loadData])
    );

    // Load food icons when component mounts or foods change
    useEffect(() => {
        const loadIcons = async () => {
            const icons: { [foodName: string]: string | null } = {};
            for (const food of foods) {
                const iconUrl = await getFoodIconUrl(food.name);
                icons[food.name] = iconUrl;
            }
            setFoodIcons(icons);
        };

        if (foods.length > 0) {
           loadIcons();
        }
    }, [foods]);

    // Memoize the current entry items to avoid unnecessary recalculations
    const currentEntryItems = useMemo(() => {
        const entry = dailyEntries.find((e) => e.date === selectedDate);
        // --- REVERSE THE LIST HERE ---
        // Create a shallow copy and reverse it for display
        return entry ? [...entry.items].reverse() : [];
    }, [dailyEntries, selectedDate]);

    // Helper to get the *original* index based on the reversed list index
    const getOriginalIndex = (reversedIndex: number): number => {
         const entry = dailyEntries.find((e) => e.date === selectedDate);
         if (!entry) return -1; // Should not happen if reversedIndex is valid
         return entry.items.length - 1 - reversedIndex;
    }

    const updateAndSaveEntries = async (updatedEntries: DailyEntry[]) => {
        await saveDailyEntries(updatedEntries);
        setDailyEntries(updatedEntries);
    };

    // --- INLINE EDITING LOGIC (Uses Original Index) ---
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

        if (!isValidNumberInput(tempGrams) || parseFloat(tempGrams) <= 0) {
            Alert.alert(
                "Invalid Input",
                "Please enter a valid, positive number for grams."
            );
            return;
        }

        const currentEntry = dailyEntries.find((e) => e.date === selectedDate);
        if (!currentEntry) return;

        const updatedItems = [...currentEntry.items];
        // Use the stored original index to update the correct item
        updatedItems[editingIndex] = { ...updatedItems[editingIndex], grams: parseFloat(tempGrams) };

        const updatedEntries = dailyEntries.map((entry) =>
            entry.date === selectedDate ? { ...entry, items: updatedItems } : entry
        );

        await updateAndSaveEntries(updatedEntries);
        setEditingIndex(null); // Clear editing state
        setTempGrams("");
    };

    const handleCancelInlineEdit = () => {
        setEditingIndex(null);
        setTempGrams("");
    };
    // --- END INLINE EDITING LOGIC ---


    const handleAddEntry = async () => {
        if (!selectedFood || !isValidNumberInput(grams) || parseFloat(grams) <= 0) {
            Alert.alert(
                "Invalid Input",
                "Please select a food and enter a valid, positive number for grams."
            );
            return;
        }

        const newEntryItem: DailyEntryItem = {
            food: selectedFood,
            grams: parseFloat(grams),
        };

        let existingEntry = dailyEntries.find((entry) => entry.date === selectedDate);
        let updatedEntries: DailyEntry[];

        if (existingEntry) {
            // Entry for the date exists
             let updatedItems;
            if (editIndex !== null) {
                // Editing an existing item within this entry
                 const originalEditIndex = getOriginalIndex(editIndex); // Get original index if needed
                 if (originalEditIndex === -1) {
                      console.error("Could not find original index for editing");
                      return; // Should not happen
                 }
                updatedItems = existingEntry.items.map((item, index) =>
                    index === originalEditIndex ? newEntryItem : item // Use original index
                );
            } else {
                // Adding a new item to this entry
                updatedItems = [...existingEntry.items, newEntryItem]; // Add to the end (will be reversed for display)
            }
             const updatedEntry = { ...existingEntry, items: updatedItems };
            updatedEntries = dailyEntries.map((entry) =>
                entry.date === selectedDate ? updatedEntry : entry
            );
        } else {
            // No entry for this date yet, create a new one
            const newDailyEntry: DailyEntry = {
                date: selectedDate,
                items: [newEntryItem], // Start with the new item
            };
            updatedEntries = [...dailyEntries, newDailyEntry];
        }


        await updateAndSaveEntries(updatedEntries);
        setSelectedFood(null);
        setGrams("");
        setEditIndex(null); // Clear modal edit index
        setIsOverlayVisible(false);
        setSearch(""); // Clear search on successful add/edit
    };

    const handleSelectFood = (item: Food | null) => {
        setSelectedFood(item);
    };

    // --- REMOVE ENTRY LOGIC (Uses Original Index) ---
    const handleRemoveEntry = async (reversedIndex: number) => {
        const originalIndex = getOriginalIndex(reversedIndex);
         if (originalIndex === -1) return; // Safety check

        const currentEntry = dailyEntries.find((e) => e.date === selectedDate);
        if (!currentEntry) return; // Should not happen

        const itemToRemove = currentEntry.items[originalIndex]; // Get item using original index
        const updatedItems = currentEntry.items.filter((_, i) => i !== originalIndex); // Filter using original index

        let finalEntries: DailyEntry[];

        if (updatedItems.length === 0) {
            // If the entry becomes empty, remove it completely
            finalEntries = dailyEntries.filter((entry) => entry.date !== selectedDate);
        } else {
            // Otherwise, just update the items for the current date
             const updatedEntry = { ...currentEntry, items: updatedItems };
            finalEntries = dailyEntries.map((entry) =>
                entry.date === selectedDate ? updatedEntry : entry
            );
        }

        await updateAndSaveEntries(finalEntries);

        Toast.show({
            type: 'success',
            text1: `${itemToRemove.food.name} entry deleted`,
            text2: 'Tap to undo',
            position: 'bottom',
            bottomOffset: 80,
            onPress: () => handleUndoRemoveEntry(itemToRemove, selectedDate, originalIndex), // Pass original index
            visibilityTime: 3000,
        });
    };

    const handleUndoRemoveEntry = (
        itemToRestore: DailyEntryItem,
        entryDate: string,
        originalIndex: number // Use the original index where it was removed
    ) => {
        // Find the index of the *DailyEntry* for the given date
        const existingEntryIndex = dailyEntries.findIndex(e => e.date === entryDate); // Correctly find the ENTRY index

        let updatedEntries;

        // Check if the DailyEntry for that date exists in the current state
        if (existingEntryIndex > -1) { // *** CORRECTED: Use existingEntryIndex here ***
            // Entry exists, insert the item back at its original position
            const entryToUpdate = dailyEntries[existingEntryIndex];
            const updatedItems = [...entryToUpdate.items];
            // Insert the item back at the specific index it was removed from
            updatedItems.splice(originalIndex, 0, itemToRestore);

            // Map over entries and replace the updated one
            updatedEntries = dailyEntries.map((entry, index) =>
                index === existingEntryIndex ? { ...entry, items: updatedItems } : entry
            );
        } else {
            // Entry was removed because it became empty, need to re-create it
            const newEntry: DailyEntry = { date: entryDate, items: [itemToRestore] };
            // Add the newly created entry back to the list
            updatedEntries = [...dailyEntries, newEntry];
            // Optional: Sort entries by date if needed, though usually handled by display logic
            // updatedEntries.sort((a, b) => a.date.localeCompare(b.date));
        }

        updateAndSaveEntries(updatedEntries);
        Toast.hide();
    };
    // --- END REMOVE ENTRY LOGIC ---

    const updateSearch = (search: string) => setSearch(search);

    // --- TOGGLE OVERLAY / MODAL EDIT LOGIC (Uses Reversed Index) ---
    const toggleOverlay = (
        item: DailyEntryItem | null = null,
        reversedIndex: number | null = null // This is the index from the reversed list
    ) => {
        setIsOverlayVisible(!isOverlayVisible);
        if (item && reversedIndex !== null) {
            // Editing existing item via modal
            setSelectedFood(item.food);
            setGrams(String(item.grams));
            setEditIndex(reversedIndex); // Store the reversed index for modal context
        } else {
            // Adding new item or closing modal
            setSelectedFood(null);
            setGrams("");
            setEditIndex(null); // Clear modal edit index
            setSearch(""); // Clear search when opening for add
        }
    };

     // Triggered by swipe-to-edit button (passes reversed index)
    const handleEditEntryViaModal = (item: DailyEntryItem, reversedIndex: number) => {
        toggleOverlay(item, reversedIndex);
    };
    // --- END TOGGLE OVERLAY ---

    // Key Change: Update date handling
    const handleDateChange = (event: any, selectedDateVal?: Date) => {
        setShowDatePicker(false);
        if (event.type === "set" && selectedDateVal) {
            // Format the selected date to a string
            const formattedDate = formatISO(selectedDateVal, { representation: 'date' });
            setSelectedDate(formattedDate);
        }
    };

    const handlePreviousDay = () => {
        const currentDate = parseISO(selectedDate);
        const newDate = subDays(currentDate, 1);
        setSelectedDate(formatISO(newDate, { representation: 'date' }));
    }

    const handleNextDay = () => {
        const currentDate = parseISO(selectedDate);
        const newDate = addDays(currentDate, 1);
        setSelectedDate(formatISO(newDate, { representation: 'date' }));
    }

    // Calculate totals based on the original data structure
     const calculateTotals = () => {
        const currentOriginalEntry = dailyEntries.find((entry) => entry.date === selectedDate);
        let [totalCalories, totalProtein, totalCarbs, totalFat] = [0, 0, 0, 0];

        if (currentOriginalEntry) {
            currentOriginalEntry.items.forEach((item) => {
                totalCalories += (item.food.calories / 100) * item.grams;
                totalProtein += (item.food.protein / 100) * item.grams;
                totalCarbs += (item.food.carbs / 100) * item.grams;
                totalFat += (item.food.fat / 100) * item.grams;
            });
        }


        return {
            totalCalories: Math.round(totalCalories),
            totalProtein: Math.round(totalProtein),
            totalCarbs: Math.round(totalCarbs),
            totalFat: Math.round(totalFat),
        };
    };

    const { totalCalories, totalProtein, totalCarbs, totalFat } = calculateTotals();


    return (
        <SafeAreaView style={styles.container}>
            {/* Date Navigation */}
            <View style={styles.dateNavigation}>
                <Button
                    type="clear"
                    onPress={handlePreviousDay}
                    icon={
                        <Icon name="arrow-back" type="ionicon" color={theme.colors.text} />
                    }
                />
                <Text h4 style={styles.dateText} onPress={() => setShowDatePicker(true)}>
                    {formatDateReadable(selectedDate)}
                </Text>
                <Button
                    type="clear"
                    onPress={handleNextDay}
                    icon={
                        <Icon
                            name="arrow-forward"
                            type="ionicon"
                            color={theme.colors.text}
                        />
                    }
                />
            </View>

            {showDatePicker && (
                <DateTimePicker
                    value={parseISO(selectedDate)} // Use parseISO here
                    mode="date"
                    display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                    onChange={handleDateChange}
                />
            )}

            {/* Daily Progress */}
            <DailyProgress
                calories={totalCalories}
                protein={totalProtein}
                carbs={totalCarbs}
                fat={totalFat}
                goals={dailyGoals}
            />
            <Divider style={styles.divider} />

            <Text h4 style={[styles.sectionTitle, { color: theme.colors.text }]}>
                Entries:
            </Text>

            {/* Entries List - Use the memoized and reversed list */}
            <FlatList
                // Use the reversed list for display
                data={currentEntryItems}
                // Key extractor uses the reversed index
                keyExtractor={(item, index) => `${item.food.id}-${index}`} // More robust key
                renderItem={({ item, index: reversedIndex }) => {
                    // Check if the current item is being inline-edited
                    // Need to convert reversedIndex back to originalIndex for comparison
                    const originalIndex = getOriginalIndex(reversedIndex);
                    const isInlineEditing = editingIndex === originalIndex;

                    return (
                        <ListItem.Swipeable
                            bottomDivider
                            leftContent={(reset) => (
                                <Button
                                    title="Edit"
                                    // Pass the reversed index to the modal edit handler
                                    onPress={() => {
                                        handleEditEntryViaModal(item, reversedIndex);
                                        reset();
                                    }}
                                    icon={{ name: "edit", color: "white" }}
                                    buttonStyle={{ minHeight: "100%", backgroundColor: theme.colors.warning }}
                                />
                            )}
                            rightContent={(reset) => (
                                <Button
                                    title="Delete"
                                    // Pass the reversed index to the remove handler
                                    onPress={() => {
                                        handleRemoveEntry(reversedIndex);
                                        reset();
                                    }}
                                    icon={{ name: "delete", color: "white" }}
                                    buttonStyle={{ minHeight: "100%", backgroundColor: theme.colors.error }}
                                />
                            )}
                            containerStyle={{ backgroundColor: theme.colors.background }}
                        >
                            {/* Food Icon */}
                            {foodIcons[item.food.name] ? (
                                <Image
                                    source={{ uri: foodIcons[item.food.name] as string }}
                                    style={styles.foodIcon}
                                    onError={(e) => console.warn(`Failed to load image: ${foodIcons[item.food.name]}`, e.nativeEvent.error)} // Add error handling
                                />
                            ) : (
                                <Icon
                                    name="nutrition-outline"
                                    type="ionicon"
                                    color={theme.colors.grey3}
                                    containerStyle={styles.defaultIconContainer}
                                />
                            )}
                             {/* List Item Content */}
                            <ListItem.Content>
                                <ListItem.Title style={{ color: theme.colors.text, fontWeight: 'bold' }}>
                                    {item.food.name}
                                </ListItem.Title>
                                {isInlineEditing ? (
                                    // Inline Edit View
                                    <View style={styles.inlineEditContainer}>
                                        <Input
                                            value={tempGrams}
                                            onChangeText={setTempGrams}
                                            keyboardType="numeric"
                                            containerStyle={styles.inlineInputContainer}
                                            inputContainerStyle={styles.inlineInputInnerContainer}
                                            inputStyle={[styles.inlineInput, { color: theme.colors.text }]}
                                            autoFocus // Focus when editing starts
                                            selectTextOnFocus // Select text for easy replacement
                                        />
                                        <Text style={styles.inlineInputSuffix}>g</Text>
                                        <Button
                                            type="clear"
                                            onPress={handleSaveInlineEdit} // No index needed here, uses state
                                            icon={<Icon name="checkmark-circle" type="ionicon" color={theme.colors.success} size={24} />}
                                            containerStyle={styles.inlineButtonContainer}
                                        />
                                        <Button
                                            type="clear"
                                            onPress={handleCancelInlineEdit}
                                            icon={<Icon name="close-circle" type="ionicon" color={theme.colors.error} size={24} />}
                                            containerStyle={styles.inlineButtonContainer}
                                        />
                                    </View>
                                ) : (
                                    // Display View
                                    <ListItem.Subtitle
                                        style={{ color: theme.colors.grey1 }}
                                        // Pass the reversed index to start inline editing
                                        onPress={() => handleStartEditing(reversedIndex)}
                                    >
                                        {`${item.grams}g • ${Math.round((item.food.calories / 100) * item.grams)} kcal`}
                                    </ListItem.Subtitle>
                                )}
                            </ListItem.Content>
                            {/* Display calculated calories for the item */}
                            {!isInlineEditing && (
                                <Text style={{ color: theme.colors.grey2 }}>
                                     {/* {`${Math.round((item.food.calories / 100) * item.grams)} kcal`} */}
                                     {/* Removed kcal display here as it's now in subtitle */}
                                </Text>
                            )}
                            {/* Add chevron for visual cue (optional) */}
                           {!isInlineEditing && <ListItem.Chevron color={theme.colors.grey3} />}
                        </ListItem.Swipeable>
                    )
                }}
                // Add message for when the list is empty
                ListEmptyComponent={
                    <View style={styles.emptyListContainer}>
                        <Text style={styles.emptyListText}>No entries for this day yet.</Text>
                        <Text style={styles.emptyListSubText}>Tap the '+' button to add food.</Text>
                    </View>
                }
            />

            {/* FAB to add new entry */}
            <FAB
                icon={<Icon name="add" color="white" />}
                color={theme.colors.primary}
                onPress={() => toggleOverlay()} // Open modal for adding
                placement="right"
                size="large"
                style={styles.fab} // Use style instead of containerStyle for better positioning control maybe? Check docs.
            />

            {/* Add/Edit Entry Modal */}
            <AddEntryModal
                isVisible={isOverlayVisible}
                toggleOverlay={toggleOverlay}
                selectedFood={selectedFood}
                grams={grams} // Pass the current grams state
                setGrams={setGrams} // Pass the setter function
                foods={foods} // Pass all foods
                handleAddEntry={handleAddEntry} // Handles both add and edit commit
                handleSelectFood={handleSelectFood}
                search={search}
                updateSearch={updateSearch}
                isEditMode={editIndex !== null} // Determine if modal is in edit mode
                // REMOVED initialGrams prop - it's not needed as 'grams' is already set
            />
        </SafeAreaView>
    );
};

// Styles
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
        paddingHorizontal: 10,
        borderBottomWidth: 1,
        borderBottomColor: theme.colors.divider,
    },
    dateText: {
        fontSize: 18,
        fontWeight: "bold",
        color: theme.colors.text,
        textAlign: 'center', // Center the date text
    },
    foodIcon: {
        width: 40, // Slightly larger icon
        height: 40,
        marginRight: 15, // More spacing
        borderRadius: 20, // Keep it circular
        resizeMode: "contain", // 'contain' might be better if icons have transparency/padding
        backgroundColor: theme.colors.grey5, // Background color for loading/error state
    },
    defaultIconContainer: {
        width: 40,
        height: 40,
        marginRight: 15,
        borderRadius: 20,
        backgroundColor: theme.colors.grey5,
        alignItems: 'center',
        justifyContent: 'center',
    },
    divider: {
        marginVertical: 10,
    },
    sectionTitle: {
        marginTop: 10,
        marginBottom: 5,
        paddingHorizontal: 15,
        fontWeight: 'bold',
    },
    fab: { // Changed from fabContainer to style
        position: 'absolute', // Keep absolute positioning
        margin: 16, // Standard margin
        right: 0,
        bottom: 0,
    },
     emptyListContainer: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        marginTop: 50, // Add some margin from the top
        paddingHorizontal: 20,
    },
    emptyListText: {
        fontSize: 18,
        color: theme.colors.grey2,
        textAlign: 'center',
    },
     emptyListSubText: {
        fontSize: 14,
        color: theme.colors.grey3,
        textAlign: 'center',
        marginTop: 5,
    },
    // Inline Editing Styles
    inlineEditContainer: {
        flexDirection: "row",
        alignItems: "center",
        marginTop: 5, // Add some space below the title
    },
    inlineInputContainer: {
        // flex: 1, // Take up available space
        paddingHorizontal: 0,
         width: 70, // Fixed width for the input
         height: 40, // Match button height
    },
    inlineInputInnerContainer: {
        borderBottomWidth: 1, // Simple underline
         borderColor: theme.colors.primary,
         paddingHorizontal: 6,
         height: '100%', // Fill container height
         justifyContent: 'center',
    },
    inlineInput: {
        fontSize: 14, // Match subtitle size
        paddingVertical: 0, // Remove default padding
        textAlign: 'right', // Align text to right
    },
    inlineInputSuffix: {
         fontSize: 14,
         color: theme.colors.grey1,
         marginLeft: 2, // Space before 'g'
         marginRight: 8, // Space after 'g'
    },
     inlineButtonContainer: {
        marginLeft: 0,
        padding: 0,
        minWidth: 30, // Ensure button tap area
    },
}));

export default DailyEntryScreen;
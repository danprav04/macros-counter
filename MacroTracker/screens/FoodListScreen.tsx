// screens/FoodListScreen.tsx

import React, { useState, useEffect, useCallback } from "react";
import { View, FlatList, Alert, Platform, Image, Text, StyleSheet } from "react-native"; // Added Text, StyleSheet
import {
    createFood,
    getFoods,
    updateFood,
    deleteFood,
} from "../services/foodService";
import { Food } from "../types/food";
import { isValidNumberInput, isNotEmpty } from "../utils/validationUtils";
import FoodItem from "../components/FoodItem";
// Ensure correct import: SearchBar comes from @rneui/themed
import { Button, SearchBar, useTheme, makeStyles, Icon } from "@rneui/themed";
import { FAB } from "@rneui/base"; // FAB might be from base or themed depending on version
import { SafeAreaView } from "react-native-safe-area-context";
import AddFoodModal from "../components/AddFoodModal";
import Toast from "react-native-toast-message";
import { useFocusEffect } from "@react-navigation/native";
// Icon already imported from themed
import { getFoodIconUrl } from "./../utils/iconUtils";

interface FoodListScreenProps {
    onFoodChange?: () => void; // Callback for when food list data changes (add, update, delete)
}

const FoodListScreen: React.FC<FoodListScreenProps> = ({ onFoodChange }) => {
    const [foods, setFoods] = useState<Food[]>([]);
    const [foodIcons, setFoodIcons] = useState<{ [foodName: string]: string | null }>({});
    const [isOverlayVisible, setIsOverlayVisible] = useState(false);
    const [search, setSearch] = useState("");
    const [newFood, setNewFood] = useState<Omit<Food, "id">>({
        name: "",
        calories: 0,
        protein: 0,
        carbs: 0,
        fat: 0,
    });
    const [editFood, setEditFood] = useState<Food | null>(null);
    const [errors, setErrors] = useState<{ [key: string]: string }>({});
    const { theme } = useTheme();
    const styles = useStyles();

    const loadFoodData = useCallback(async () => {
        try {
            const loadedFoods = await getFoods();
            // Sort foods alphabetically by name after loading
            const sortedFoods = loadedFoods.sort((a, b) => a.name.localeCompare(b.name));
            setFoods(sortedFoods);
        } catch (error) {
            console.error("Failed to load food data:", error);
            Alert.alert("Error", "Could not load food list.");
        }
    }, []);

    // Load data when the screen comes into focus
    useFocusEffect(
        useCallback(() => {
            loadFoodData();
        }, [loadFoodData])
    );

    // Load icons whenever the food list changes
    useEffect(() => {
        const loadIcons = async () => {
            const icons: { [foodName: string]: string | null } = {};
            // Use Promise.all for potentially faster icon fetching
            await Promise.all(foods.map(async (food) => {
                try {
                    const iconUrl = await getFoodIconUrl(food.name);
                    icons[food.name] = iconUrl;
                } catch (iconError) {
                    console.warn(`Failed to get icon for ${food.name}:`, iconError);
                    icons[food.name] = null; // Set to null on error
                }
            }));
            setFoodIcons(icons);
        };

        if (foods.length > 0) {
            loadIcons();
        } else {
            setFoodIcons({}); // Clear icons if food list is empty
        }
    }, [foods]);

    // Validate food data (used by the modal)
    const validateFood = (food: Omit<Food, "id">): { [key: string]: string } | null => {
        const newErrors: { [key: string]: string } = {};
        if (!isNotEmpty(food.name)) {
            newErrors.name = "Name is required";
        } else if (food.name.length > 50) { // Example: Add length validation
            newErrors.name = "Name cannot exceed 50 characters";
        }

        // Check if it's a valid non-negative number
        const checkNumericField = (value: number, fieldName: string): string | undefined => {
            if (!isValidNumberInput(String(value)) || value < 0) {
                return `Invalid ${fieldName} value (must be 0 or positive)`;
            }
            return undefined;
        };

        const caloriesError = checkNumericField(food.calories, 'calorie');
        if (caloriesError) newErrors.calories = caloriesError;

        const proteinError = checkNumericField(food.protein, 'protein');
        if (proteinError) newErrors.protein = proteinError;

        const carbsError = checkNumericField(food.carbs, 'carbs');
        if (carbsError) newErrors.carbs = carbsError;

        const fatError = checkNumericField(food.fat, 'fat');
        if (fatError) newErrors.fat = fatError;

        return Object.keys(newErrors).length === 0 ? null : newErrors;
    };


    // This function will now be called from within the modal's handleCreateOrUpdate
    const handleCreateFood = async (): Promise<void> => {
        // Validation is now done inside the modal *before* calling this
        // Assume newFood state here is valid if this is called
        try {
            const createdFood = await createFood(newFood);
            // Add to local state and sort
            setFoods((prevFoods) => [...prevFoods, createdFood].sort((a, b) => a.name.localeCompare(b.name)));
             // Reset the form state used by the modal *after* successful creation
            setNewFood({ name: "", calories: 0, protein: 0, carbs: 0, fat: 0 });
            // setIsOverlayVisible(false); // Modal handles its own closing now
            onFoodChange && onFoodChange(); // Notify parent screen/component
            // Toast is shown within the modal now
        } catch (error: any) {
            console.error("Error creating food:", error);
            // Re-throw the error so the modal's catch block can display the Alert
            throw error;
        }
    };

    // This function will now be called from within the modal's handleCreateOrUpdate
    const handleUpdateFood = async (): Promise<void> => {
        if (!editFood) {
             // This should technically not be reachable if modal logic is correct
             console.error("handleUpdateFood called without editFood being set.");
             throw new Error("Cannot update: No food selected.");
        }
        // Validation is now done inside the modal *before* calling this
        // Assume editFood state here is valid if this is called
        try {
            const updated = await updateFood(editFood);
            // Update local state and sort
            setFoods((prevFoods) =>
                prevFoods.map((f) => (f.id === updated.id ? updated : f))
                         .sort((a, b) => a.name.localeCompare(b.name))
            );
            // setEditFood(null); // Modal handles resetting editFood state now
            // setIsOverlayVisible(false); // Modal handles its own closing now
            onFoodChange && onFoodChange(); // Notify parent screen/component
            // Toast is shown within the modal now
        } catch (error: any) {
            console.error("Error updating food:", error);
            // Re-throw the error so the modal's catch block can display the Alert
            throw error;
        }
    };

     // Handles initiating the delete process (shows Toast with Undo)
        // Handles initiating the delete process (shows Toast with Undo)
    const handleDeleteFood = (foodId: string) => {
        const foodToDelete = foods.find((f) => f.id === foodId);
        if (!foodToDelete) {
            console.warn(`Attempted to delete non-existent food ID: ${foodId}`);
            return;
        }

        // Flag to track if the undo action was pressed
        let undoPressed = false; // <-- Initialize flag

        // Optimistically remove from UI
        setFoods(prevFoods => prevFoods.filter((f) => f.id !== foodId));

        // Show Undo Toast Immediately
        Toast.show({
            type: "success",
            text1: `${foodToDelete.name} deleted`,
            text2: "Tap here to undo",
            position: "bottom",
            bottomOffset: 90,
            visibilityTime: 4000,
            autoHide: true,
            onPress: () => { // This runs ONLY if the user taps the toast
                console.log(`Undo delete pressed for ${foodToDelete.name}`);
                undoPressed = true; // <-- Set the flag when pressed
                handleUndoDeleteFood(foodToDelete); // Call the restore function
                // Toast.hide() might be called automatically by the library on press,
                // but calling it explicitly is safe.
                Toast.hide();
            },
            onHide: async () => { // This runs when the toast hides for ANY reason (press or timeout)
                // Check the flag here. If undo was NOT pressed, proceed with delete.
                if (!undoPressed) {
                    try {
                        console.log(`Permanently deleting ${foodToDelete.name} (ID: ${foodId}) after timeout.`);
                        await deleteFood(foodId);
                        onFoodChange && onFoodChange(); // Notify parent only after permanent delete
                    } catch (error) {
                        console.error("Error during permanent delete after Toast hide:", error);
                        // Re-add the food if delete failed after timeout
                        setFoods((prevFoods) => [...prevFoods, foodToDelete].sort((a, b) => a.name.localeCompare(b.name)));
                        Alert.alert("Error", "Failed to permanently delete food. Restoring item.");
                    }
                } else {
                     console.log(`Permanent delete skipped for ${foodToDelete.name} because undo was pressed.`);
                }
            }
        });
    };

    // Restores the food item if Undo is tapped
    const handleUndoDeleteFood = (foodToRestore: Food) => {
        console.log(`Undo delete initiated for ${foodToRestore.name}`);
        // Check if already restored to prevent duplicates if tapped multiple times quickly
        if (!foods.some(f => f.id === foodToRestore.id)) {
            setFoods((prevFoods) => [...prevFoods, foodToRestore].sort((a, b) => a.name.localeCompare(b.name)));
            // No need to call onFoodChange here, as the food was never truly deleted from the backend yet
            // Toast.hide() is called automatically by RNEUI Toast when onPress is handled
        } else {
            console.log(`${foodToRestore.name} is already back in the list.`);
        }
         Toast.hide(); // Explicitly hide just in case
    };

    // Toggles the Add/Edit Modal visibility and sets up state
    const toggleOverlay = (food?: Food) => {
        if (food) {
            // Editing existing food
            setEditFood(food); // Set the food to be edited
            // setNewFood is not used when editing
        } else {
            // Adding new food
            setEditFood(null); // Ensure editFood is null for adding
            setNewFood({ // Reset new food form state
                name: "",
                calories: 0,
                protein: 0,
                carbs: 0,
                fat: 0,
            });
        }
        setErrors({}); // Clear previous errors when opening modal
        setIsOverlayVisible(prev => !prev); // Toggle visibility
    };

    // Updates the search text state
    const updateSearch = (search: string) => setSearch(search);

    // Filter foods based on search term (case-insensitive)
    const filteredFoods = foods.filter((food) =>
        food.name.toLowerCase().includes(search.toLowerCase())
    );

   // This function updates the state in FoodListScreen, which is passed down to AddFoodModal
   // It handles input changes for both new and edited food.
   const handleInputChange = (
        key: keyof Omit<Food, "id">,
        value: string,
        isEdit: boolean
    ) => {
        // Allow decimal point, but prevent multiple decimals and non-numeric characters
        const numericValue = value.replace(/[^0-9.]/g, '').replace(/(\..*)\./g, '$1');
        const isEmptyOrJustDot = value.trim() === "" || value.trim() === ".";

        const processedValue = key === "name"
            ? value // Keep name as string
            : isEmptyOrJustDot ? 0 : parseFloat(numericValue); // Store 0 if empty/dot, else parse

        if (isEdit) {
            setEditFood((prevEditFood) => {
                if (!prevEditFood) return null; // Safety check
                return {
                    ...prevEditFood,
                    [key]: processedValue,
                };
            });
        } else {
            setNewFood((prevNewFood) => ({
                ...prevNewFood,
                 [key]: processedValue,
            }));
        }
         // Optionally clear specific field error on change
         if (errors[key]) {
             setErrors(prev => ({ ...prev, [key]: '' }));
         }
    };

    // --- Render Section ---
    return (
        // Use SafeAreaView to avoid notches/status bars, adjust edges as needed
        <SafeAreaView style={styles.container} edges={['bottom', 'left', 'right']}>
            {/* Search Bar Component */}
            <SearchBar
                placeholder="Search Foods..."
                onChangeText={updateSearch}
                value={search}
                platform={Platform.OS === "ios" ? "ios" : "android"} // Platform-specific styling
                containerStyle={styles.searchBarContainer}
                inputContainerStyle={[
                    styles.searchBarInputContainer,
                    { backgroundColor: theme.colors.grey5 }, // Use theme color for background
                ]}
                inputStyle={{ color: theme.colors.text }} // Use theme color for text
                // lightTheme prop is removed as it's invalid
                showCancel={Platform.OS === 'ios' && search.length > 0} // Optional: Show cancel on iOS
                onClear={() => setSearch('')} // Optional: Clear action
                onCancel={() => setSearch('')} // Optional: Cancel action
            />

            {/* List of Food Items */}
            <FlatList
                data={filteredFoods}
                keyExtractor={(item) => item.id} // Use unique ID for keys
                renderItem={({ item }) => (
                    <FoodItem
                        food={item}
                        onEdit={() => toggleOverlay(item)} // Pass item to edit
                        onDelete={() => handleDeleteFood(item.id)} // Pass ID to delete handler
                        foodIconUrl={foodIcons[item.name]} // Pass fetched icon URL
                        onUndoDelete={function (food: Food): void {
                            throw new Error("Function not implemented.");
                        } }                    />
                )}
                ListEmptyComponent={ // Displayed when the list is empty
                    <View style={styles.emptyListContainer}>
                        <Text style={styles.emptyListText}>
                            {search ? "No foods match your search." : "No foods added yet.\nTap '+' to add!"}
                        </Text>
                    </View>
                }
                // Style content container to center empty message if list is empty
                contentContainerStyle={filteredFoods.length === 0 ? styles.emptyListContentContainer : styles.listContentContainer}
                keyboardShouldPersistTaps="handled" // Ensures taps work correctly when keyboard is open
            />

            {/* Floating Action Button to Add Food */}
            <FAB
                icon={<Icon name="add" color="white" size={24} />} // Standard add icon
                color={theme.colors.primary} // Use primary theme color
                onPress={() => toggleOverlay()} // Open modal for adding new food
                placement="right" // Position bottom-right
                style={styles.fabStyle} // Apply specific FAB styles
                visible={!isOverlayVisible} // Hide FAB when modal is open
            />

            {/* Add/Edit Food Modal (Rendered conditionally) */}
            {/* Using isOverlayVisible ensures modal unmounts when not needed */}
            {isOverlayVisible && (
                 <AddFoodModal
                    isVisible={isOverlayVisible}
                    toggleOverlay={() => setIsOverlayVisible(false)} // Simple function to close
                    newFood={newFood}        // Current state for new food form
                    editFood={editFood}      // Current food being edited (or null)
                    errors={errors}          // Validation errors object
                    handleInputChange={handleInputChange} // Callback to update state on input change
                    handleCreateFood={handleCreateFood} // Callback for creating food
                    handleUpdateFood={handleUpdateFood} // Callback for updating food
                    validateFood={validateFood} // Function to validate food data
                    setErrors={setErrors}      // Function to update errors state
                />
            )}
        </SafeAreaView>
    );
};

// --- Styles ---
const useStyles = makeStyles((theme) => ({
    container: {
        flex: 1,
        backgroundColor: theme.colors.background, // Use theme background color
    },
    searchBarContainer: {
        backgroundColor: theme.colors.background, // Match container background
        borderBottomColor: "transparent",
        borderTopColor: "transparent",
        paddingHorizontal: 8, // Reduced padding slightly
        paddingTop: 8,
        paddingBottom: 4, // Reduced bottom padding
    },
    searchBarInputContainer: {
        borderRadius: 20, // More rounded appearance
        // backgroundColor is set dynamically using theme.colors.grey5
    },
    fabStyle: {
        position: 'absolute', // Ensure FAB positioning works correctly
        bottom: 20, // Adjust bottom spacing as needed
        right: 20, // Adjust right spacing as needed
        // marginBottom: 10, // Use absolute positioning instead
        // marginRight: 8,
    },
    emptyListContainer: {
        flex: 1, // Take remaining space
        alignItems: 'center',
        justifyContent: 'center',
        padding: 20,
    },
    emptyListText: {
        fontSize: 17, // Slightly larger text
        color: theme.colors.grey1, // Use a slightly less muted grey
        textAlign: 'center',
        lineHeight: 24, // Improve readability for multi-line text
    },
    listContentContainer: {
        paddingBottom: 80, // Add padding at the bottom of the list so FAB doesn't overlap last item
    },
    emptyListContentContainer: { // Style for centering the empty message
        flexGrow: 1,
        justifyContent: 'center',
        alignItems: 'center',
    }
}));

export default FoodListScreen;
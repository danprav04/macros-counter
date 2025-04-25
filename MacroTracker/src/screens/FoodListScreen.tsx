// FoodListScreen.tsx (Corrected and Enhanced)
import React, { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { View, FlatList, Alert, Platform, ActivityIndicator, StyleSheet } from "react-native";
import {
    createFood,
    getFoods,
    updateFood,
    deleteFood,
} from "../services/foodService";
import { Food } from "../types/food";
import { isValidNumberInput, isNotEmpty } from "../utils/validationUtils";
import FoodItem from "../components/FoodItem";
import { Button, SearchBar, useTheme, makeStyles, Text, Icon as RNEIcon } from "@rneui/themed"; // Added Text, RNEIcon
import { FAB } from "@rneui/base";
import { SafeAreaView } from "react-native-safe-area-context";
import AddFoodModal from "../components/AddFoodModal";
import Toast from "react-native-toast-message";
import { useFocusEffect } from "@react-navigation/native";
import { getFoodIconUrl } from "../utils/iconUtils"; // Corrected import path

interface FoodListScreenProps {
    onFoodChange?: () => void; // Optional callback when food data changes
}

const FoodListScreen: React.FC<FoodListScreenProps> = ({ onFoodChange }) => {
    const [foods, setFoods] = useState<Food[]>([]);
    // State: undefined=not_checked, null=failed/no_icon, string=url
    const [foodIcons, setFoodIcons] = useState<{ [foodId: string]: string | null | undefined }>({});
    const [isLoading, setIsLoading] = useState(true); // Loading state for initial fetch
    const [isOverlayVisible, setIsOverlayVisible] = useState(false);
    const [search, setSearch] = useState("");
    const [newFood, setNewFood] = useState<Omit<Food, "id">>({
        name: "", calories: 0, protein: 0, carbs: 0, fat: 0,
    });
    const [editFood, setEditFood] = useState<Food | null>(null);
    const [errors, setErrors] = useState<{ [key: string]: string }>({});
    const [isSaving, setIsSaving] = useState(false); // State to disable buttons during save

    const { theme } = useTheme();
    const styles = useStyles();
    const flatListRef = useRef<FlatList>(null); // Ref for FlatList

    // --- Data Loading and Icon Fetching ---
    const loadFoodData = useCallback(async () => {
        console.log("FoodListScreen: Loading food data...");
        setIsLoading(true);
        setFoodIcons({}); // Clear icons on reload
        try {
            const loadedFoods = await getFoods();
            // Sort foods alphabetically by name
            loadedFoods.sort((a, b) => a.name.localeCompare(b.name));
            setFoods(loadedFoods);
            console.log(`FoodListScreen: Loaded ${loadedFoods.length} foods.`);
            // Trigger icon fetches after foods are loaded
            fetchIconsForFoods(loadedFoods);
        } catch (error) {
            console.error("FoodListScreen: Error loading food data:", error);
            Alert.alert("Error", "Failed to load food list.");
            setFoods([]);
        } finally {
            setIsLoading(false);
        }
    }, []); // No dependencies, should run once or on focus

    const fetchIconsForFoods = useCallback(async (foodsToFetch: Food[]) => {
        console.log(`FoodListScreen: Fetching icons for ${foodsToFetch.length} foods.`);
        const iconPromises = foodsToFetch.map(async (food) => {
            // Check if icon status is unknown before fetching
            if (foodIcons[food.id] === undefined) {
                try {
                    const iconUrl = await getFoodIconUrl(food.name);
                    return { id: food.id, url: iconUrl };
                } catch (error) {
                    console.warn(`Icon fetch failed for ${food.name} (${food.id}):`, error);
                    return { id: food.id, url: null }; // Ensure null on error
                }
            }
            return null; // Skip fetch if already checked/cached in state
        });

        const results = await Promise.all(iconPromises);
        const newIcons: { [foodId: string]: string | null | undefined } = {};
        results.forEach(result => {
            if (result) {
                newIcons[result.id] = result.url;
            }
        });

        if (Object.keys(newIcons).length > 0) {
             setFoodIcons(prevIcons => ({ ...prevIcons, ...newIcons }));
             console.log(`FoodListScreen: Updated icons for ${Object.keys(newIcons).length} foods.`);
        }

    }, [foodIcons]); // Depend on foodIcons to avoid re-fetching known ones unnecessarily

    // Load data when the screen comes into focus
    useFocusEffect(
        useCallback(() => {
            loadFoodData();
            // Cleanup function (optional)
            return () => {
                 console.log("FoodListScreen: Unfocused.");
                 // Reset search or other states if needed when leaving the screen
                 // setSearch("");
            };
        }, [loadFoodData]) // Dependency array includes the memoized load function
    );

    // --- Validation ---
    const validateFood = (food: Omit<Food, "id">): { [key: string]: string } | null => {
        const newErrors: { [key: string]: string } = {};
        if (!isNotEmpty(food.name)) newErrors.name = "Name is required";
        // Allow 0 for macros, but require a number
        if (isNaN(food.calories) || food.calories < 0) newErrors.calories = "Invalid number (>= 0)";
        if (isNaN(food.protein) || food.protein < 0) newErrors.protein = "Invalid number (>= 0)";
        if (isNaN(food.carbs) || food.carbs < 0) newErrors.carbs = "Invalid number (>= 0)";
        if (isNaN(food.fat) || food.fat < 0) newErrors.fat = "Invalid number (>= 0)";

        return Object.keys(newErrors).length === 0 ? null : newErrors;
    };

    // --- CRUD Operations ---
    const handleCreateFood = async () => {
        const validationErrors = validateFood(newFood);
        if (validationErrors) {
            setErrors(validationErrors);
            Toast.show({ type: 'error', text1: 'Please fix errors', position: 'bottom' });
            return;
        }
        setErrors({});
        setIsSaving(true);
        try {
            console.log("FoodListScreen: Creating food:", newFood);
            const createdFood = await createFood(newFood);
            console.log("FoodListScreen: Food created successfully:", createdFood);

            // Update state optimistically, then sort
            const updatedFoods = [...foods, createdFood].sort((a, b) => a.name.localeCompare(b.name));
            setFoods(updatedFoods);

             // Fetch icon for the newly created food
             const iconUrl = await getFoodIconUrl(createdFood.name);
             setFoodIcons(prev => ({ ...prev, [createdFood.id]: iconUrl }));

            // Reset form and close modal
            setNewFood({ name: "", calories: 0, protein: 0, carbs: 0, fat: 0 });
            setIsOverlayVisible(false);
            onFoodChange?.(); // Notify parent if needed
            Toast.show({ type: 'success', text1: `${createdFood.name} added`, position: 'bottom' });

             // Scroll to the newly added item (optional, might be complex with sorting)
             // const index = updatedFoods.findIndex(f => f.id === createdFood.id);
             // if (index !== -1 && flatListRef.current) {
             //    flatListRef.current.scrollToIndex({ animated: true, index });
             // }

        } catch (error: any) {
            console.error("FoodListScreen: Error creating food:", error);
            Alert.alert("Error", error.message || "Failed to create food.");
        } finally {
            setIsSaving(false);
        }
    };

    const handleUpdateFood = async () => {
        if (!editFood) return;
        const validationErrors = validateFood(editFood);
        if (validationErrors) {
            setErrors(validationErrors);
            Toast.show({ type: 'error', text1: 'Please fix errors', position: 'bottom' });
            return;
        }
        setErrors({});
        setIsSaving(true);
        try {
            console.log("FoodListScreen: Updating food:", editFood);
            const updated = await updateFood(editFood);
            console.log("FoodListScreen: Food updated successfully:", updated);

             // Update state, then sort
            const updatedFoods = foods.map((f) => (f.id === updated.id ? updated : f))
                                      .sort((a, b) => a.name.localeCompare(b.name));
            setFoods(updatedFoods);

             // Re-fetch icon if name changed (optional, could be more complex)
             // For simplicity, we assume icon is tied to name, no need to refetch unless name changes significantly
             // If name did change, fetch:
             // const iconUrl = await getFoodIconUrl(updated.name);
             // setFoodIcons(prev => ({ ...prev, [updated.id]: iconUrl }));

            setEditFood(null);
            setIsOverlayVisible(false);
            onFoodChange?.();
            Toast.show({ type: 'success', text1: `${updated.name} updated`, position: 'bottom' });
        } catch (error: any) {
            console.error("FoodListScreen: Error updating food:", error);
            Alert.alert("Error", error.message || "Failed to update food.");
        } finally {
            setIsSaving(false);
        }
    };

     const handleDeleteFood = async (foodId: string) => {
        const foodToDelete = foods.find((f) => f.id === foodId);
        if (!foodToDelete) return;

        // Optimistically remove from UI
        setFoods(foods.filter((f) => f.id !== foodId));

        try {
            console.log("FoodListScreen: Deleting food:", foodToDelete.name, foodId);
            await deleteFood(foodId);
            console.log("FoodListScreen: Food deleted successfully from storage.");
            // Toast handled by FoodItem's callback now
            // Toast.show({ ... }); // Already handled in FoodItem's handleDelete callback
            onFoodChange?.(); // Notify parent
        } catch (error) {
            console.error("FoodListScreen: Error deleting food:", error);
            // Revert UI change on error
            setFoods((prevFoods) => [...prevFoods, foodToDelete].sort((a,b) => a.name.localeCompare(b.name)));
            Alert.alert("Delete Error", "Failed to delete food from storage. Restored item.");
        }
    };

    // This function is called by the Toast in FoodItem when 'Undo' is pressed
    const handleUndoDeleteFood = async (food: Food) => {
         console.log("FoodListScreen: Undoing delete for:", food.name, food.id);
        // Optimistically add back to UI and sort
        const restoredFoods = [...foods, food].sort((a, b) => a.name.localeCompare(b.name));
        setFoods(restoredFoods);
        Toast.hide(); // Hide the 'Undo' toast

        // Attempt to re-create the food in storage (simple approach)
        // Note: This won't preserve the original ID if the backend auto-generates IDs.
        // A more robust solution would involve a "soft delete" mechanism.
        try {
             // We don't call createFood directly here as it generates a new ID.
             // This relies on the deleteFood having failed or being undone conceptually.
             // If deleteFood succeeded, this undo is purely client-side unless
             // you implement a backend "undelete" endpoint or re-create logic.
             // For now, we assume the UI restoration is the main goal of undo.
             console.log("FoodListScreen: Food restored in UI state.");
             // await createFood(food); // Avoid creating a duplicate with a new ID
             onFoodChange?.(); // Notify parent
             Toast.show({ type: 'success', text1: `${food.name} restored`, position: 'bottom', visibilityTime: 2000 });
        } catch (error) {
             console.error("FoodListScreen: Error trying to persist restored food (if applicable):", error);
             // UI is already restored, maybe show another message?
             // Alert.alert("Restore Error", "Could not fully save the restored food.");
        }
    };

    // --- Modal and Input Handling ---
    const toggleOverlay = (foodToEdit?: Food) => {
        if (foodToEdit) {
            console.log("FoodListScreen: Opening modal to edit:", foodToEdit.name);
            setEditFood(foodToEdit);
             // Ensure newFood state is clean when editing
            setNewFood({ name: "", calories: 0, protein: 0, carbs: 0, fat: 0 });
        } else {
             console.log("FoodListScreen: Opening modal to add new food.");
            setEditFood(null);
             // Reset new food form
            setNewFood({ name: "", calories: 0, protein: 0, carbs: 0, fat: 0 });
        }
        setErrors({}); // Clear errors when opening modal
        setIsOverlayVisible(!isOverlayVisible);
    };

    const updateSearch = (search: string) => setSearch(search);

    const filteredFoods = useMemo(() => {
        return foods.filter((food) =>
            food.name.toLowerCase().includes(search.toLowerCase())
        );
    }, [foods, search]);

    const handleInputChange = useCallback((
        key: keyof Omit<Food, "id">,
        value: string,
        isEdit: boolean
    ) => {
        // Basic validation: Allow only numbers and one decimal for numeric fields
        const numericKeys: (keyof Omit<Food, "id">)[] = ['calories', 'protein', 'carbs', 'fat'];
        let processedValue: string | number = value;

        if (numericKeys.includes(key)) {
             // Allow empty string temporarily, treat as 0 later
            if (value === "" || value === ".") {
                 processedValue = value; // Keep empty or decimal start
            } else {
                const cleaned = value.replace(/[^0-9.]/g, "").replace(/(\..*)\./g, "$1");
                if (!isNaN(parseFloat(cleaned)) || cleaned === "") {
                     processedValue = cleaned;
                } else {
                    // If cleaning results in invalid number, don't update (or revert?)
                    // Let's prevent update for now
                    return;
                }
            }
        }

        const updateState = (prevState: any) => {
             let finalValue: string | number;
             if (numericKeys.includes(key)) {
                 // Convert empty string or just "." to 0 for state, but allow input field to show "" or "."
                 if (processedValue === "" || processedValue === ".") {
                      finalValue = 0; // Store 0 in state if input is empty or just "."
                 } else {
                      finalValue = parseFloat(processedValue as string); // Convert valid string to number
                 }
             } else {
                finalValue = processedValue; // Use the string value for name
             }

             return {
                 ...prevState,
                 [key]: finalValue,
             };
        };

         const updateInputState = (setter: React.Dispatch<React.SetStateAction<any>>) => {
             setter((prevState: any) => ({
                ...prevState,
                 [key]: processedValue // Keep the potentially partial numeric string for the input field state
             }));
         };


        if (isEdit) {
            setEditFood(updateState);
            // We might not need separate input state if modal handles it,
            // but if needed: updateInputState(setEditFoodInput);
        } else {
            setNewFood(updateState);
             // updateInputState(setNewFoodInput);
        }
    }, []);

    // --- Render ---
    if (isLoading) {
        return (
            <SafeAreaView style={styles.centered}>
                <ActivityIndicator size="large" color={theme.colors.primary} />
                <Text style={styles.loadingText}>Loading Foods...</Text>
            </SafeAreaView>
        );
    }

    return (
        <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
            <SearchBar
                placeholder="Search Foods..."
                onChangeText={updateSearch}
                value={search}
                platform={Platform.OS === "ios" ? "ios" : "android"}
                containerStyle={styles.searchBarContainer}
                inputContainerStyle={styles.searchBarInputContainer}
                inputStyle={styles.searchInputStyle}
                onClear={() => setSearch('')} // Add clear button functionality
                showCancel={Platform.OS === 'ios'} // Show cancel on iOS
            />
            <FlatList
                ref={flatListRef} // Assign ref
                data={filteredFoods}
                keyExtractor={(item) => item.id}
                renderItem={({ item }) => (
                    <FoodItem
                        food={item}
                        onEdit={toggleOverlay}
                        onDelete={handleDeleteFood}
                        onUndoDelete={handleUndoDeleteFood} // Pass the undo handler
                        foodIconUrl={foodIcons[item.id]} // Pass icon state by food ID
                    />
                )}
                ListEmptyComponent={
                    <View style={styles.centered}>
                        <RNEIcon name="alert-circle-outline" type="ionicon" size={50} color={theme.colors.grey3} />
                        <Text style={styles.emptyText}>
                            {search ? `No foods found matching "${search}"` : "No foods added yet."}
                        </Text>
                        {!search && <Text style={styles.emptySubText}>Tap '+' to add your first food!</Text>}
                    </View>
                }
                contentContainerStyle={filteredFoods.length === 0 ? styles.listContainerEmpty : styles.listContainer}
                initialNumToRender={10}
                maxToRenderPerBatch={10}
                windowSize={11} // Adjust as needed
            />

            <FAB
                icon={{ name: "add", color: "white" }}
                color={theme.colors.primary}
                onPress={() => !isSaving && toggleOverlay()} // Prevent opening while saving
                placement="right"
                size="large"
                style={styles.fab}
                disabled={isSaving} // Disable FAB during save
            />

            <AddFoodModal
                isVisible={isOverlayVisible}
                toggleOverlay={() => !isSaving && setIsOverlayVisible(false)} // Prevent closing while saving
                newFood={newFood} // Pass state directly
                editFood={editFood}
                errors={errors}
                handleInputChange={handleInputChange} // Pass the correct handler
                handleCreateFood={handleCreateFood}
                handleUpdateFood={handleUpdateFood}
                validateFood={validateFood}
                setErrors={setErrors}
                // Pass isSaving to disable interactions in modal
            />
        </SafeAreaView>
    );
};

// Use makeStyles for theme-aware styles
const useStyles = makeStyles((theme) => ({
    container: {
        flex: 1,
        backgroundColor: theme.colors.background,
    },
    centered: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        padding: 20,
        marginTop: 50, // Add some top margin
    },
    loadingText: {
        marginTop: 10,
        color: theme.colors.grey1,
        fontSize: 16,
    },
    emptyText: {
        marginTop: 15,
        fontSize: 18,
        color: theme.colors.grey2,
        textAlign: 'center',
    },
     emptySubText: {
        marginTop: 8,
        fontSize: 14,
        color: theme.colors.grey3,
        textAlign: 'center',
    },
    searchBarContainer: {
        backgroundColor: theme.colors.background, // Match background
        borderBottomColor: theme.colors.divider, // Use divider color
        borderTopColor: theme.colors.divider, // Use divider color
        borderBottomWidth: StyleSheet.hairlineWidth, // Subtle border
        borderTopWidth: 0, // No top border typically
        paddingHorizontal: 8, // Add some horizontal padding
        paddingVertical: 4, // Adjust vertical padding
        marginBottom: 0, // Remove bottom margin if border is used
    },
    searchBarInputContainer: {
        backgroundColor: theme.colors.searchBg || theme.colors.grey5, // Use theme color for input background
        borderRadius: 10, // Consistent rounding
        height: 40, // Standard height
    },
    searchInputStyle: {
        color: theme.colors.text,
        fontSize: 15,
    },
    listContainer: {
        paddingBottom: 80, // Ensure space for FAB
    },
    listContainerEmpty: {
        flexGrow: 1, // Ensure empty component takes full height if needed
    },
    fab: {
        position: 'absolute',
        margin: 16,
        right: 0, // Position correctly
        bottom: 0, // Position correctly
    },
}));

export default FoodListScreen;
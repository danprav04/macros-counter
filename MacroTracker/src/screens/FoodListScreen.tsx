// src/screens/FoodListScreen.tsx
import React, { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { View, FlatList, Alert, Platform, ActivityIndicator, StyleSheet } from "react-native";
import {
    createFood,
    getFoods,
    updateFood,
    deleteFood,
} from "../services/foodService";
import { Food } from "../types/food";
import { isNotEmpty } from "../utils/validationUtils"; // Removed unused isValidNumberInput
import FoodItem from "../components/FoodItem";
import { Button, SearchBar, useTheme, makeStyles, Text, Icon as RNEIcon } from "@rneui/themed"; // Renamed import
import { FAB } from "@rneui/base";
import { SafeAreaView } from "react-native-safe-area-context";
import AddFoodModal from "../components/AddFoodModal";
import Toast from "react-native-toast-message";
import { useFocusEffect } from "@react-navigation/native";
import { getFoodIconUrl } from "../utils/iconUtils";

interface FoodListScreenProps {
    onFoodChange?: () => void;
}

const FoodListScreen: React.FC<FoodListScreenProps> = ({ onFoodChange }) => {
    const [foods, setFoods] = useState<Food[]>([]);
    // State: key=food.name, value=undefined(loading), null(failed/no_icon), string(url)
    const [foodIcons, setFoodIcons] = useState<{ [foodName: string]: string | null | undefined }>({});
    const [isLoading, setIsLoading] = useState(true);
    const [isOverlayVisible, setIsOverlayVisible] = useState(false);
    const [search, setSearch] = useState("");
    const [newFood, setNewFood] = useState<Omit<Food, "id">>({
        name: "", calories: 0, protein: 0, carbs: 0, fat: 0,
    });
    const [editFood, setEditFood] = useState<Food | null>(null);
    const [errors, setErrors] = useState<{ [key: string]: string }>({});
    const [isSaving, setIsSaving] = useState(false);

    const { theme } = useTheme();
    const styles = useStyles();
    const flatListRef = useRef<FlatList>(null);

    // --- Data Loading and Icon Fetching ---
    const loadFoodData = useCallback(async () => {
        console.log("FoodListScreen: Loading food data...");
        setIsLoading(true);
        setFoodIcons({}); // Clear icons on reload
        try {
            const loadedFoods = await getFoods();
            loadedFoods.sort((a, b) => a.name.localeCompare(b.name)); // Sort by name
            setFoods(loadedFoods);
            console.log(`FoodListScreen: Loaded ${loadedFoods.length} foods.`);
            // Trigger icon fetches for the loaded foods
            fetchIconsForFoods(loadedFoods);
        } catch (error) {
            console.error("FoodListScreen: Error loading food data:", error);
            Alert.alert("Error", "Failed to load food list.");
            setFoods([]);
        } finally {
            setIsLoading(false);
        }
    }, []); // No dependencies, runs on focus/mount

    // Fetch icons only for the specified list of foods
    const fetchIconsForFoods = useCallback(async (foodsToFetch: Food[]) => {
        if (!foodsToFetch || foodsToFetch.length === 0) return;
        console.log(`FoodListScreen: Fetching icons for ${foodsToFetch.length} visible foods.`);

        const iconUpdates: { [key: string]: string | null } = {};
        const promises = foodsToFetch.map(async (food) => {
            const foodName = food.name;
            // Only fetch if status is unknown (undefined)
            if (foodIcons[foodName] === undefined) {
                 setFoodIcons(prev => ({ ...prev, [foodName]: undefined })); // Mark as loading immediately
                 try {
                    const iconUrl = await getFoodIconUrl(foodName);
                    iconUpdates[foodName] = iconUrl;
                } catch (error) {
                    console.warn(`Icon fetch failed for ${foodName}:`, error);
                    iconUpdates[foodName] = null; // Store null on error
                }
            }
        });

        await Promise.all(promises);

        if (Object.keys(iconUpdates).length > 0) {
            setFoodIcons(prevIcons => ({ ...prevIcons, ...iconUpdates }));
            console.log(`FoodListScreen: Updated icons state for ${Object.keys(iconUpdates).length} food names.`);
        }

    }, [foodIcons]); // Depend on foodIcons to know fetch status

    useFocusEffect(
        useCallback(() => {
            loadFoodData();
            return () => {
                 console.log("FoodListScreen: Unfocused.");
                 setSearch(""); // Clear search on blur
                 setIsOverlayVisible(false); // Ensure modal is closed
            };
        }, [loadFoodData])
    );

    // --- Validation ---
    const validateFood = (food: Omit<Food, "id"> | Food): { [key: string]: string } | null => {
        const newErrors: { [key: string]: string } = {};
        // Check if name is provided and not just whitespace
        if (!isNotEmpty(food.name)) newErrors.name = "Name is required";
        // Ensure macros are non-negative numbers
        if (isNaN(food.calories) || food.calories < 0) newErrors.calories = "Must be a non-negative number";
        if (isNaN(food.protein) || food.protein < 0) newErrors.protein = "Must be a non-negative number";
        if (isNaN(food.carbs) || food.carbs < 0) newErrors.carbs = "Must be a non-negative number";
        if (isNaN(food.fat) || food.fat < 0) newErrors.fat = "Must be a non-negative number";
        return Object.keys(newErrors).length === 0 ? null : newErrors;
    };

    // --- CRUD Operations ---
    const handleCreateFood = async () => {
        const trimmedFood = { ...newFood, name: newFood.name.trim() };
        const validationErrors = validateFood(trimmedFood);
        if (validationErrors) {
            setErrors(validationErrors);
            Toast.show({ type: 'error', text1: 'Please fix errors', position: 'bottom' });
            return;
        }
        setErrors({});
        setIsSaving(true);
        try {
            console.log("FoodListScreen: Creating food:", trimmedFood);
            const createdFood = await createFood(trimmedFood);
            console.log("FoodListScreen: Food created successfully:", createdFood);

            // Add and re-sort
            const updatedFoods = [...foods, createdFood].sort((a, b) => a.name.localeCompare(b.name));
            setFoods(updatedFoods);

             // Fetch icon for the new food immediately
             fetchIconsForFoods([createdFood]); // Fetch just for the new one

            setNewFood({ name: "", calories: 0, protein: 0, carbs: 0, fat: 0 }); // Reset form
            setIsOverlayVisible(false);
            onFoodChange?.(); // Notify parent/navigator if needed
            Toast.show({ type: 'success', text1: `${createdFood.name} added`, position: 'bottom' });

        } catch (error: any) {
            console.error("FoodListScreen: Error creating food:", error);
            Alert.alert("Error", error.message || "Failed to create food.");
        } finally {
            setIsSaving(false);
        }
    };

    const handleUpdateFood = async () => {
        if (!editFood) return;
        const trimmedFood = { ...editFood, name: editFood.name.trim() };
        const validationErrors = validateFood(trimmedFood);
        if (validationErrors) {
            setErrors(validationErrors);
            Toast.show({ type: 'error', text1: 'Please fix errors', position: 'bottom' });
            return;
        }
        setErrors({});
        setIsSaving(true);
        try {
            console.log("FoodListScreen: Updating food:", trimmedFood);
            const updated = await updateFood(trimmedFood);
            console.log("FoodListScreen: Food updated successfully:", updated);

            const originalFood = foods.find(f => f.id === updated.id); // Find original for name comparison
            const updatedFoods = foods.map((f) => (f.id === updated.id ? updated : f))
                                      .sort((a, b) => a.name.localeCompare(b.name)); // Update and re-sort
            setFoods(updatedFoods);

             // If name changed, trigger icon refetch for the new name
            if (originalFood && originalFood.name.toLowerCase() !== updated.name.toLowerCase()) {
                 console.log(`Food name changed from "${originalFood.name}" to "${updated.name}", refetching icon.`);
                 fetchIconsForFoods([updated]);
                 // Optionally remove old icon state if name was key: delete newIcons[originalFood.name];
            }

            setEditFood(null); // Clear edit state
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

        // Optimistic UI update: Remove immediately
        setFoods(foods.filter((f) => f.id !== foodId));

        try {
            console.log("FoodListScreen: Deleting food:", foodToDelete.name, foodId);
            await deleteFood(foodId);
            console.log("FoodListScreen: Food deleted successfully from storage.");
            // Success toast is handled by the callback from FoodItem
            onFoodChange?.();

            // Remove icon from cache if needed (using name as key)
            setFoodIcons(prev => {
                const newIcons = {...prev};
                delete newIcons[foodToDelete.name];
                return newIcons;
            });

        } catch (error) {
            console.error("FoodListScreen: Error deleting food:", error);
            // Revert UI change on error
            setFoods((prevFoods) => [...prevFoods, foodToDelete].sort((a,b) => a.name.localeCompare(b.name)));
            Alert.alert("Delete Error", "Failed to delete food from storage. Restored item.");
        }
    };

    // Handles the UI restoration after optimistic delete
    const handleUndoDeleteFood = useCallback((food: Food) => {
        console.log("FoodListScreen: Undoing delete for:", food.name, food.id);
        // Add back and re-sort
        const restoredFoods = [...foods, food].sort((a, b) => a.name.localeCompare(b.name));
        setFoods(restoredFoods);
        Toast.hide(); // Hide the undo toast
        // Note: This doesn't re-add to backend, assumes delete failed or user changed mind before persistence
        onFoodChange?.();
        Toast.show({ type: 'success', text1: `${food.name} restored`, position: 'bottom', visibilityTime: 2000 });

        // Re-fetch icon if it was removed from cache
        if (foodIcons[food.name] === undefined) {
            fetchIconsForFoods([food]);
        }
    }, [foods, onFoodChange, foodIcons, fetchIconsForFoods]); // Add dependencies

    // --- Modal and Input Handling ---
    const toggleOverlay = (foodToEdit?: Food) => {
        if (isSaving) return;
        if (foodToEdit) {
            console.log("FoodListScreen: Opening modal to edit:", foodToEdit.name);
            setEditFood({ ...foodToEdit }); // Set as edit target
            setNewFood({ name: "", calories: 0, protein: 0, carbs: 0, fat: 0 }); // Clear add form
        } else {
             console.log("FoodListScreen: Opening modal to add new food.");
            setEditFood(null); // Clear edit target
            setNewFood({ name: "", calories: 0, protein: 0, carbs: 0, fat: 0 }); // Clear add form
        }
        setErrors({}); // Clear errors on modal open
        setIsOverlayVisible(!isOverlayVisible);
    };

    const updateSearch = (search: string) => setSearch(search);

    // Filter foods based on search query
    const filteredFoods = useMemo(() => {
        return foods.filter((food) =>
            food.name.toLowerCase().includes(search.toLowerCase())
        );
    }, [foods, search]);

    // Handle input changes in the Add/Edit modal
    const handleInputChange = useCallback((
        key: keyof Omit<Food, "id">,
        value: string,
        isEdit: boolean
    ) => {
        const numericKeys: (keyof Omit<Food, "id">)[] = ['calories', 'protein', 'carbs', 'fat'];
        let processedValue: string | number = value;

        // Clean numeric inputs, allow empty string or just "." temporarily
        if (numericKeys.includes(key)) {
            if (value === "" || value === ".") {
                 processedValue = value; // Keep as is for intermediate state
            } else {
                // Allow only numbers and one decimal point
                const cleaned = value.replace(/[^0-9.]/g, "").replace(/(\..*)\./g, "$1");
                // Only update if it's a valid partial number or empty
                if (cleaned === "" || !isNaN(parseFloat(cleaned))) {
                     processedValue = cleaned;
                } else {
                    return; // Do not update state if cleaning results in invalid format
                }
            }
        }

        // Determine the final value to store (0 for empty/invalid numerics, string for name)
        const updateState = (prevState: any) => {
             let finalValue: string | number;
             if (numericKeys.includes(key)) {
                  // Store number 0 if empty or just ".", otherwise parse the valid numeric string
                  if (processedValue === "" || processedValue === ".") {
                      finalValue = 0;
                  } else {
                      finalValue = parseFloat(processedValue as string);
                  }
             } else {
                finalValue = processedValue; // Use the string value for name
             }
             return { ...prevState, [key]: finalValue };
        };

        // Update the correct state object (editFood or newFood)
        if (isEdit) {
            setEditFood(updateState);
        } else {
            setNewFood(updateState);
        }
    }, []);

    // --- Render ---
    if (isLoading) {
        return (
            <SafeAreaView style={styles.centeredLoader}>
                <ActivityIndicator size="large" color={theme.colors.primary} />
                <Text style={styles.loadingText}>Loading Foods...</Text>
            </SafeAreaView>
        );
    }

    return (
        <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
            <SearchBar
                placeholder="Search Your Food Library..." // More descriptive placeholder
                onChangeText={updateSearch}
                value={search}
                platform={Platform.OS === "ios" ? "ios" : "android"}
                containerStyle={styles.searchBarContainer}
                inputContainerStyle={styles.searchBarInputContainer}
                inputStyle={styles.searchInputStyle}
                onClear={() => setSearch('')} // Clear button action
                showCancel={Platform.OS === 'ios'} // iOS convention
            />
            <FlatList
                ref={flatListRef}
                data={filteredFoods}
                keyExtractor={(item) => item.id}
                renderItem={({ item }) => (
                    <FoodItem
                        food={item}
                        onEdit={toggleOverlay}
                        onDelete={handleDeleteFood} // Pass delete handler
                        onUndoDelete={handleUndoDeleteFood} // Pass undo handler
                        foodIconUrl={foodIcons[item.name]} // Pass icon state using food NAME
                    />
                )}
                ListEmptyComponent={
                    <View style={styles.emptyListContainer}>
                        <RNEIcon name="nutrition-outline" type="ionicon" size={50} color={theme.colors.grey3} />
                        <Text style={styles.emptyListText}>
                            {search ? `No foods found matching "${search}"` : "Your food library is empty."}
                        </Text>
                        {!search && <Text style={styles.emptyListSubText}>Tap '+' to add your first food item!</Text>}
                    </View>
                }
                contentContainerStyle={filteredFoods.length === 0 ? styles.listContentContainerEmpty : styles.listContentContainer}
                initialNumToRender={15}
                maxToRenderPerBatch={10}
                windowSize={21}
                keyboardShouldPersistTaps="handled" // Important for search bar interaction
            />

            {/* Saving Indicator Overlay (Optional, more prominent) */}
            {/* {isSaving && (
                <View style={styles.savingOverlay}>
                    <ActivityIndicator size="large" color={theme.colors.white} />
                    <Text style={styles.savingOverlayText}>Saving...</Text>
                </View>
            )} */}

            <FAB
                icon={<RNEIcon name="add" color={theme.colors.white} />} // Use white icon for contrast
                color={theme.colors.primary}
                onPress={() => !isSaving && toggleOverlay()} // Prevent opening modal while saving
                placement="right"
                size="large"
                style={styles.fab}
                disabled={isSaving} // Disable FAB during save
            />

            <AddFoodModal
                isVisible={isOverlayVisible}
                toggleOverlay={() => !isSaving && setIsOverlayVisible(false)}
                newFood={newFood}
                editFood={editFood}
                errors={errors}
                handleInputChange={handleInputChange}
                handleCreateFood={handleCreateFood}
                handleUpdateFood={handleUpdateFood}
                validateFood={validateFood}
                setErrors={setErrors}
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
    centeredLoader: { // Centered style for initial loading
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: theme.colors.background, // Ensure background matches
    },
    loadingText: {
        marginTop: 15,
        color: theme.colors.grey1,
        fontSize: 16,
    },
    emptyListContainer: { // Consistent Empty State Style
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        padding: 30,
        marginTop: 50,
    },
    emptyListText: {
        fontSize: 17, // Slightly larger text
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
    searchBarContainer: { // Improved Search Bar Style
        backgroundColor: theme.colors.background,
        borderBottomColor: theme.colors.divider, // Use divider color
        borderTopColor: theme.colors.background, // Match background
        borderBottomWidth: StyleSheet.hairlineWidth,
        paddingHorizontal: 10, // Adjust padding
        paddingVertical: 8,
        marginBottom: 0, // Remove margin if list items handle spacing
    },
    searchBarInputContainer: { // Style for the input field itself
        backgroundColor: theme.colors.searchBg || theme.colors.grey5, // Use specific theme color or fallback
        height: 40,
        borderRadius: 20, // Make it round
    },
    searchInputStyle: {
        color: theme.colors.text,
        fontSize: 15,
    },
    listContentContainer: { // Add padding at the bottom for FAB
        paddingBottom: 80,
    },
    listContentContainerEmpty: { // Ensure empty component can take up space
        flexGrow: 1,
        justifyContent: 'center',
    },
    fab: { // Standard FAB styling
        position: 'absolute',
        margin: 16,
        right: 10,
        bottom: 10,
    },
    // Optional Saving Overlay Styles
    // savingOverlay: {
    //     ...StyleSheet.absoluteFillObject, // Cover the whole screen
    //     backgroundColor: 'rgba(0, 0, 0, 0.4)', // Semi-transparent background
    //     justifyContent: 'center',
    //     alignItems: 'center',
    //     zIndex: 10, // Ensure it's on top
    // },
    // savingOverlayText: {
    //     color: theme.colors.white,
    //     marginTop: 10,
    //     fontSize: 16,
    // },
}));

export default FoodListScreen;
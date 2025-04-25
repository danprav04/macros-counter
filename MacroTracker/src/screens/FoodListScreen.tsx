// FoodListScreen.tsx (Corrected State Key and Prop Passing)
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
import { Button, SearchBar, useTheme, makeStyles, Text, Icon as RNEIcon } from "@rneui/themed";
import { FAB } from "@rneui/base";
import { SafeAreaView } from "react-native-safe-area-context";
import AddFoodModal from "../components/AddFoodModal";
import Toast from "react-native-toast-message";
import { useFocusEffect } from "@react-navigation/native";
import { getFoodIconUrl } from "../utils/iconUtils";

interface FoodListScreenProps {
    onFoodChange?: () => void; // Optional callback when food data changes
}

const FoodListScreen: React.FC<FoodListScreenProps> = ({ onFoodChange }) => {
    const [foods, setFoods] = useState<Food[]>([]);
    // State: key=food.name, value=undefined(loading), null(failed/no_icon), string(url)
    const [foodIcons, setFoodIcons] = useState<{ [foodName: string]: string | null | undefined }>({});
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
            loadedFoods.sort((a, b) => a.name.localeCompare(b.name));
            setFoods(loadedFoods);
            console.log(`FoodListScreen: Loaded ${loadedFoods.length} foods.`);
            // Trigger icon fetches after foods are loaded
            fetchIconsForFoods(loadedFoods); // Pass loaded foods directly
        } catch (error) {
            console.error("FoodListScreen: Error loading food data:", error);
            Alert.alert("Error", "Failed to load food list.");
            setFoods([]);
        } finally {
            setIsLoading(false);
        }
    }, []); // No dependencies, should run once or on focus

    const fetchIconsForFoods = useCallback(async (foodsToFetch: Food[]) => {
        if (!foodsToFetch || foodsToFetch.length === 0) return;
        console.log(`FoodListScreen: Fetching icons for ${foodsToFetch.length} foods.`);

        // Use food.name as the key
        const iconPromises = foodsToFetch.map(async (food) => {
            // Check if icon status is unknown (undefined) using food.name
            if (foodIcons[food.name] === undefined) {
                try {
                    const iconUrl = await getFoodIconUrl(food.name);
                    return { name: food.name, url: iconUrl }; // Return name and URL
                } catch (error) {
                    console.warn(`Icon fetch failed for ${food.name}:`, error);
                    return { name: food.name, url: null }; // Ensure null on error
                }
            }
            return null; // Skip fetch if already checked/cached in state
        });

        const results = await Promise.all(iconPromises);
        // Use functional update for reliability
        setFoodIcons(prevIcons => {
             const newIcons = { ...prevIcons }; // Copy previous state
             results.forEach(result => {
                 if (result) {
                     newIcons[result.name] = result.url; // Use food.name as key
                 }
             });
             // Log only if there were actual updates
             const updatedKeys = results.filter(r => r !== null).length;
             if (updatedKeys > 0) {
                  console.log(`FoodListScreen: Updated icons state for ${updatedKeys} food names.`);
             }
             return newIcons;
        });

    }, []); // Remove foodIcons dependency to allow re-fetching if needed, managed by undefined check

    // Load data when the screen comes into focus
    useFocusEffect(
        useCallback(() => {
            loadFoodData();
            return () => {
                 console.log("FoodListScreen: Unfocused.");
            };
        }, [loadFoodData])
    );

    // --- Validation ---
    const validateFood = (food: Omit<Food, "id">): { [key: string]: string } | null => {
        const newErrors: { [key: string]: string } = {};
        if (!isNotEmpty(food.name)) newErrors.name = "Name is required";
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
            const foodToCreate = { ...newFood, name: newFood.name.trim() }; // Trim name before saving
            console.log("FoodListScreen: Creating food:", foodToCreate);
            const createdFood = await createFood(foodToCreate);
            console.log("FoodListScreen: Food created successfully:", createdFood);

            const updatedFoods = [...foods, createdFood].sort((a, b) => a.name.localeCompare(b.name));
            setFoods(updatedFoods);

             // Fetch icon for the newly created food using its name
             const iconUrl = await getFoodIconUrl(createdFood.name);
             setFoodIcons(prev => ({ ...prev, [createdFood.name]: iconUrl })); // Use name as key

            setNewFood({ name: "", calories: 0, protein: 0, carbs: 0, fat: 0 });
            setIsOverlayVisible(false);
            onFoodChange?.();
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
        const foodToUpdate = { ...editFood, name: editFood.name.trim() }; // Trim name
        const validationErrors = validateFood(foodToUpdate);
        if (validationErrors) {
            setErrors(validationErrors);
            Toast.show({ type: 'error', text1: 'Please fix errors', position: 'bottom' });
            return;
        }
        setErrors({});
        setIsSaving(true);
        try {
            console.log("FoodListScreen: Updating food:", foodToUpdate);
            const updated = await updateFood(foodToUpdate); // Use trimmed version
            console.log("FoodListScreen: Food updated successfully:", updated);

            const originalFood = foods.find(f => f.id === updated.id); // Find original for comparison
            const updatedFoods = foods.map((f) => (f.id === updated.id ? updated : f))
                                      .sort((a, b) => a.name.localeCompare(b.name));
            setFoods(updatedFoods);

             // Check if the name changed and if the icon needs refetching
            if (originalFood && originalFood.name.toLowerCase() !== updated.name.toLowerCase()) {
                 console.log(`Food name changed from "${originalFood.name}" to "${updated.name}", refetching icon.`);
                 const iconUrl = await getFoodIconUrl(updated.name);
                 setFoodIcons(prev => ({ ...prev, [updated.name]: iconUrl }));
                 // Optionally remove old icon state if name was key: delete newIcons[originalFood.name];
            }

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

        setFoods(foods.filter((f) => f.id !== foodId)); // Optimistic UI update

        try {
            console.log("FoodListScreen: Deleting food:", foodToDelete.name, foodId);
            await deleteFood(foodId);
            console.log("FoodListScreen: Food deleted successfully from storage.");
            // Toast is handled by FoodItem callback
            onFoodChange?.();
        } catch (error) {
            console.error("FoodListScreen: Error deleting food:", error);
            // Revert UI change on error
            setFoods((prevFoods) => [...prevFoods, foodToDelete].sort((a,b) => a.name.localeCompare(b.name)));
            Alert.alert("Delete Error", "Failed to delete food from storage. Restored item.");
        }
    };

    const handleUndoDeleteFood = async (food: Food) => {
         console.log("FoodListScreen: Undoing delete for:", food.name, food.id);
        const restoredFoods = [...foods, food].sort((a, b) => a.name.localeCompare(b.name));
        setFoods(restoredFoods);
        Toast.hide();

        // --- Important Note on Undo ---
        // This UNDO is primarily client-side for the UI.
        // A robust backend implementation would ideally require an "undelete" endpoint
        // or use soft deletes. Re-creating the food via `createFood` would generate
        // a NEW ID, which is usually not the desired behavior for an undo.
        // We are skipping backend interaction here, assuming the user wants the UI restored.
        console.log("FoodListScreen: Food restored in UI state. Backend state not modified by undo.");
        onFoodChange?.();
        Toast.show({ type: 'success', text1: `${food.name} restored`, position: 'bottom', visibilityTime: 2000 });
    };

    // --- Modal and Input Handling ---
    const toggleOverlay = (foodToEdit?: Food) => {
        if (isSaving) return; // Prevent toggle while saving
        if (foodToEdit) {
            console.log("FoodListScreen: Opening modal to edit:", foodToEdit.name);
            setEditFood(foodToEdit);
            setNewFood({ name: "", calories: 0, protein: 0, carbs: 0, fat: 0 });
        } else {
             console.log("FoodListScreen: Opening modal to add new food.");
            setEditFood(null);
            setNewFood({ name: "", calories: 0, protein: 0, carbs: 0, fat: 0 });
        }
        setErrors({});
        setIsOverlayVisible(!isOverlayVisible);
    };

    const updateSearch = (search: string) => setSearch(search);

    const filteredFoods = useMemo(() => {
        return foods.filter((food) =>
            food.name.toLowerCase().includes(search.toLowerCase())
        );
    }, [foods, search]);

    // Using useCallback for stability if passed down, though AddFoodModal might not need it
    const handleInputChange = useCallback((
        key: keyof Omit<Food, "id">,
        value: string,
        isEdit: boolean
    ) => {
        const numericKeys: (keyof Omit<Food, "id">)[] = ['calories', 'protein', 'carbs', 'fat'];
        let processedValue: string | number = value;

        if (numericKeys.includes(key)) {
            if (value === "" || value === ".") {
                 processedValue = value;
            } else {
                const cleaned = value.replace(/[^0-9.]/g, "").replace(/(\..*)\./g, "$1");
                // Allow empty string result from cleaning, treat as 0 later
                if (cleaned === "" || !isNaN(parseFloat(cleaned))) {
                     processedValue = cleaned;
                } else {
                    return; // Prevent update if cleaning results in invalid state like ".."
                }
            }
        }

        const updateState = (prevState: any) => {
             let finalValue: string | number;
             if (numericKeys.includes(key)) {
                  // Store 0 in state if input is empty or just "."
                  if (processedValue === "" || processedValue === ".") {
                      finalValue = 0;
                  } else {
                      finalValue = parseFloat(processedValue as string); // Convert valid string to number
                  }
             } else {
                finalValue = processedValue; // Use the string value for name
             }
             return { ...prevState, [key]: finalValue };
        };

        if (isEdit) {
            // Update the editFood state which holds the actual numeric values
            setEditFood(updateState);
        } else {
            // Update the newFood state similarly
            setNewFood(updateState);
        }
    }, []); // No dependencies needed as it operates on arguments

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
                onClear={() => setSearch('')}
                showCancel={Platform.OS === 'ios'}
            />
            <FlatList
                ref={flatListRef}
                data={filteredFoods}
                keyExtractor={(item) => item.id} // Key remains the food ID
                renderItem={({ item }) => (
                    <FoodItem
                        food={item}
                        onEdit={toggleOverlay}
                        onDelete={handleDeleteFood}
                        onUndoDelete={handleUndoDeleteFood}
                        foodIconUrl={foodIcons[item.name]} // Pass icon state using food NAME
                    />
                )}
                ListEmptyComponent={
                    <View style={styles.centered}>
                        <RNEIcon name="fast-food-outline" type="ionicon" size={50} color={theme.colors.grey3} />
                        <Text style={styles.emptyText}>
                            {search ? `No foods found matching "${search}"` : "No foods added yet."}
                        </Text>
                        {!search && <Text style={styles.emptySubText}>Tap '+' to add your first food!</Text>}
                    </View>
                }
                contentContainerStyle={filteredFoods.length === 0 ? styles.listContainerEmpty : styles.listContainer}
                initialNumToRender={15} // Increased initial render
                maxToRenderPerBatch={10}
                windowSize={21}
                keyboardShouldPersistTaps="handled"
            />

            <FAB
                icon={{ name: "add", color: "white" }}
                color={theme.colors.primary}
                onPress={() => !isSaving && toggleOverlay()}
                placement="right"
                size="large"
                style={styles.fab}
                disabled={isSaving}
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
                // Consider passing isSaving to disable modal inputs/buttons
            />
        </SafeAreaView>
    );
};

// Use makeStyles for theme-aware styles (keep existing styles from previous correction)
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
        backgroundColor: theme.colors.background,
        borderBottomColor: theme.colors.divider,
        borderTopColor: theme.colors.background, // Match background
        borderBottomWidth: StyleSheet.hairlineWidth,
        borderTopWidth: 0,
        paddingHorizontal: 8,
        paddingVertical: 4,
        marginBottom: 0,
    },
    searchBarInputContainer: {
        backgroundColor: theme.colors.searchBg || theme.colors.grey5,
        borderRadius: 10,
        height: 40,
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
        right: 5, // Adjusted position slightly
        bottom: 5, // Adjusted position slightly
    },
}));

export default FoodListScreen;
// ---------- src/screens/FoodListScreen.tsx ----------
// src/screens/FoodListScreen.tsx
import React, { useState, useEffect, useCallback, useMemo, useRef } from "react"; // Added useRef
import { View, FlatList, Alert, Platform, ActivityIndicator, StyleSheet } from "react-native";
import {
    createFood,
    getFoods,
    updateFood,
    deleteFood,
} from "../services/foodService";
import { Food } from "../types/food";
import { isNotEmpty } from "../utils/validationUtils";
import FoodItem from "../components/FoodItem";
import { Button, SearchBar, useTheme, makeStyles, Text, Icon as RNEIcon } from "@rneui/themed";
import { FAB } from "@rneui/base";
import { SafeAreaView } from "react-native-safe-area-context";
import AddFoodModal from "../components/AddFoodModal";
import Toast from "react-native-toast-message";
import { useFocusEffect } from "@react-navigation/native";
import { getFoodIconUrl } from "../utils/iconUtils"; // Correct import

interface FoodListScreenProps {
    onFoodChange?: () => void;
}

const FoodListScreen: React.FC<FoodListScreenProps> = ({ onFoodChange }) => {
    const [foods, setFoods] = useState<Food[]>([]);
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
    // Ref to hold the current foodIcons state for checking inside triggerIconPrefetch
    const foodIconsRef = useRef(foodIcons);
    useEffect(() => {
      foodIconsRef.current = foodIcons;
    }, [foodIcons]);

    // --- Icon Pre-fetching ---
    // **** IMPORTANT FIX: Removed foodIcons from dependency array ****
    const triggerIconPrefetch = useCallback((foodsToFetch: Food[]) => {
        if (!foodsToFetch || foodsToFetch.length === 0) return;

        const uniqueFoodNames = new Set(foodsToFetch.map(f => f.name));
        if (uniqueFoodNames.size === 0) return;

        console.log(`FoodListScreen: Triggering pre-fetch for ${uniqueFoodNames.size} unique food names...`);
        const currentIcons = foodIconsRef.current; // Read current icons from ref
        const prefetchPromises = Array.from(uniqueFoodNames).map(name => {
            // Check *current* status from ref, not state dependency
            if (currentIcons[name] === undefined) {
                // Set state to loading IF NOT ALREADY SET
                 if (foodIconsRef.current[name] === undefined) {
                    setFoodIcons(prev => ({...prev, [name]: undefined}));
                 }
                // Fetch and update state directly in promise handlers
                return getFoodIconUrl(name).then(url => {
                    setFoodIcons(prev => ({...prev, [name]: url}));
                }).catch(err => {
                    console.warn(`Icon pre-fetch failed for ${name}:`, err);
                    setFoodIcons(prev => ({...prev, [name]: null}));
                });
            }
             return Promise.resolve(); // Already known/loading
        });

        // Run fetches in background
        Promise.allSettled(prefetchPromises).then(() => {
            console.log("FoodListScreen: Icon pre-fetch settle completed.");
        });
    // **** REMOVED foodIcons FROM DEPENDENCIES ****
    }, []); // Empty dependency array


    // --- Data Loading ---
    // **** IMPORTANT FIX: Removed triggerIconPrefetch from dependency array ****
    const loadFoodData = useCallback(async () => {
        console.log("FoodListScreen: Loading food data...");
        setIsLoading(true);
        setFoodIcons({}); // Clear icons on full reload
        try {
            const loadedFoods = await getFoods();
            loadedFoods.sort((a, b) => a.name.localeCompare(b.name));
            setFoods(loadedFoods);
            console.log(`FoodListScreen: Loaded ${loadedFoods.length} foods.`);
            // Call the stable pre-fetch function
            triggerIconPrefetch(loadedFoods);
        } catch (error) {
            console.error("FoodListScreen: Error loading food data:", error);
            Alert.alert("Error", "Failed to load food list.");
            setFoods([]);
        } finally {
            setIsLoading(false);
        }
    // **** REMOVED triggerIconPrefetch FROM DEPENDENCIES ****
    }, [triggerIconPrefetch]); // Dependency is stable


    // --- Focus Effect ---
    // **** IMPORTANT FIX: loadData dependency is now stable ****
    useFocusEffect(
        useCallback(() => {
            console.log("FoodListScreen: Focused. Running effect.");
            loadFoodData(); // Runs on focus
            return () => {
                 console.log("FoodListScreen: Cleanup effect run (blur).");
                 setSearch("");
                 setIsOverlayVisible(false);
                 // No need to clear icons here, they persist between focuses
            };
        }, [loadFoodData]) // Dependency is now stable
    );

    // --- Validation (Unchanged) ---
    const validateFood = (food: Omit<Food, "id"> | Food): { [key: string]: string } | null => {
        const newErrors: { [key: string]: string } = {};
        if (!isNotEmpty(food.name)) newErrors.name = "Name is required";
        if (isNaN(food.calories) || food.calories < 0) newErrors.calories = "Must be a non-negative number";
        if (isNaN(food.protein) || food.protein < 0) newErrors.protein = "Must be a non-negative number";
        if (isNaN(food.carbs) || food.carbs < 0) newErrors.carbs = "Must be a non-negative number";
        if (isNaN(food.fat) || food.fat < 0) newErrors.fat = "Must be a non-negative number";
        return Object.keys(newErrors).length === 0 ? null : newErrors;
    };

    // --- CRUD Operations (Only minor changes: removed explicit triggerIconFetch) ---
    const handleCreateFood = async () => {
        const trimmedFood = { ...newFood, name: newFood.name.trim() };
        const validationErrors = validateFood(trimmedFood);
        if (validationErrors) { setErrors(validationErrors); Toast.show({ type: 'error', text1: 'Please fix errors', position: 'bottom' }); return; }
        setErrors({}); setIsSaving(true);
        try {
            const createdFood = await createFood(trimmedFood);
            const updatedFoods = [...foods, createdFood].sort((a, b) => a.name.localeCompare(b.name));
            setFoods(updatedFoods);

            // No need to explicitly trigger icon fetch here

            setNewFood({ name: "", calories: 0, protein: 0, carbs: 0, fat: 0 });
            setIsOverlayVisible(false); onFoodChange?.();
            Toast.show({ type: 'success', text1: `${createdFood.name} added`, position: 'bottom' });
        } catch (error: any) {
            console.error("FoodListScreen: Error creating food:", error);
            Alert.alert("Error", error.message || "Failed to create food.");
        } finally { setIsSaving(false); }
    };

    const handleUpdateFood = async () => {
        if (!editFood) return;
        const trimmedFood = { ...editFood, name: editFood.name.trim() };
        const validationErrors = validateFood(trimmedFood);
        if (validationErrors) { setErrors(validationErrors); Toast.show({ type: 'error', text1: 'Please fix errors', position: 'bottom' }); return; }
        setErrors({}); setIsSaving(true);
        try {
            const updated = await updateFood(trimmedFood);
            const originalFood = foods.find(f => f.id === updated.id);
            const updatedFoods = foods.map((f) => (f.id === updated.id ? updated : f)).sort((a, b) => a.name.localeCompare(b.name));
            setFoods(updatedFoods);

            // No need to explicitly trigger icon fetch here

            setEditFood(null); setIsOverlayVisible(false); onFoodChange?.();
            Toast.show({ type: 'success', text1: `${updated.name} updated`, position: 'bottom' });
        } catch (error: any) {
            console.error("FoodListScreen: Error updating food:", error);
            Alert.alert("Error", error.message || "Failed to update food.");
        } finally { setIsSaving(false); }
    };

    const handleDeleteFood = async (foodId: string) => { // (Unchanged)
        const foodToDelete = foods.find((f) => f.id === foodId); if (!foodToDelete) return;
        const previousFoods = foods; // Store previous state
        setFoods(foods.filter((f) => f.id !== foodId)); // Optimistic UI
        try {
            await deleteFood(foodId);
            onFoodChange?.();
            setFoodIcons(prev => { const newIcons = {...prev}; delete newIcons[foodToDelete.name]; return newIcons; });
        } catch (error) {
            console.error("FoodListScreen: Error deleting food:", error);
            setFoods(previousFoods); // Revert on error
            Alert.alert("Delete Error", "Failed to delete food from storage. Restored item.");
        }
    };

    const handleUndoDeleteFood = useCallback((food: Food) => { // (Unchanged)
        const restoredFoods = [...foods, food].sort((a, b) => a.name.localeCompare(b.name));
        setFoods(restoredFoods); Toast.hide(); onFoodChange?.();
        Toast.show({ type: 'success', text1: `${food.name} restored`, position: 'bottom', visibilityTime: 2000 });
        // Re-fetch icon if needed (prefetch logic handles this implicitly now)
        // if (foodIconsRef.current[food.name] === undefined) {
        //    triggerIconPrefetch([food]); // Or just let render handle it via iconUtils
        // }
    }, [foods, onFoodChange]); // Removed foodIcons, triggerIconPrefetch

    // --- Modal and Input Handling (Unchanged) ---
    const toggleOverlay = (foodToEdit?: Food) => {
        if (isSaving) return;
        if (foodToEdit) { setEditFood({ ...foodToEdit }); setNewFood({ name: "", calories: 0, protein: 0, carbs: 0, fat: 0 }); }
        else { setEditFood(null); setNewFood({ name: "", calories: 0, protein: 0, carbs: 0, fat: 0 }); }
        setErrors({}); setIsOverlayVisible(!isOverlayVisible);
    };

    const updateSearch = (search: string) => setSearch(search);

    const filteredFoods = useMemo(() => {
        return foods.filter((food) => food.name.toLowerCase().includes(search.toLowerCase()));
    }, [foods, search]);

    const handleInputChange = useCallback(( key: keyof Omit<Food, "id">, value: string, isEdit: boolean ) => {
        const numericKeys: (keyof Omit<Food, "id">)[] = ['calories', 'protein', 'carbs', 'fat']; let processedValue: string | number = value;
        if (numericKeys.includes(key)) {
            if (value === "" || value === ".") { processedValue = value; } else {
                const cleaned = value.replace(/[^0-9.]/g, "").replace(/(\..*)\./g, "$1");
                if (cleaned === "" || !isNaN(parseFloat(cleaned))) { processedValue = cleaned; } else { return; }
            }
        }
        const updateState = (prevState: any) => {
             let finalValue: string | number;
             if (numericKeys.includes(key)) { finalValue = (processedValue === "" || processedValue === ".") ? 0 : parseFloat(processedValue as string); } else { finalValue = processedValue; }
             return { ...prevState, [key]: finalValue };
        };
        if (isEdit) { setEditFood(updateState); } else { setNewFood(updateState); }
    }, []);

    // --- Render (Unchanged) ---
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
                placeholder="Search Your Food Library..." onChangeText={updateSearch} value={search} platform={Platform.OS === "ios" ? "ios" : "android"}
                containerStyle={styles.searchBarContainer} inputContainerStyle={styles.searchBarInputContainer} inputStyle={styles.searchInputStyle}
                onClear={() => setSearch('')} showCancel={Platform.OS === 'ios'}
            />
            <FlatList
                ref={flatListRef} data={filteredFoods} keyExtractor={(item) => item.id}
                renderItem={({ item }) => ( <FoodItem food={item} onEdit={toggleOverlay} onDelete={handleDeleteFood} onUndoDelete={handleUndoDeleteFood} foodIconUrl={foodIcons[item.name]} /> )}
                ListEmptyComponent={ <View style={styles.emptyListContainer}><RNEIcon name="nutrition-outline" type="ionicon" size={50} color={theme.colors.grey3} /><Text style={styles.emptyListText}> {search ? `No foods found matching "${search}"` : "Your food library is empty."} </Text>{!search && <Text style={styles.emptyListSubText}>Tap '+' to add your first food item!</Text>}</View> }
                contentContainerStyle={filteredFoods.length === 0 ? styles.listContentContainerEmpty : styles.listContentContainer}
                initialNumToRender={15} maxToRenderPerBatch={10} windowSize={21} keyboardShouldPersistTaps="handled"
            />
            <FAB
                icon={<RNEIcon name="add" color={theme.colors.white} />} color={theme.colors.primary} onPress={() => !isSaving && toggleOverlay()}
                placement="right" size="large" style={styles.fab} disabled={isSaving}
            />
            <AddFoodModal
                isVisible={isOverlayVisible} toggleOverlay={() => !isSaving && setIsOverlayVisible(false)} newFood={newFood} editFood={editFood}
                errors={errors} handleInputChange={handleInputChange} handleCreateFood={handleCreateFood} handleUpdateFood={handleUpdateFood}
                validateFood={validateFood} setErrors={setErrors}
            />
        </SafeAreaView>
    );
};

// --- Styles (Unchanged) ---
const useStyles = makeStyles((theme) => ({
    container: { flex: 1, backgroundColor: theme.colors.background, },
    centeredLoader: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: theme.colors.background, },
    loadingText: { marginTop: 15, color: theme.colors.grey1, fontSize: 16, },
    emptyListContainer: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 30, marginTop: 50, },
    emptyListText: { fontSize: 17, color: theme.colors.grey2, textAlign: 'center', marginTop: 15, },
    emptyListSubText: { fontSize: 14, color: theme.colors.grey3, textAlign: 'center', marginTop: 8, },
    searchBarContainer: { backgroundColor: theme.colors.background, borderBottomColor: theme.colors.divider, borderTopColor: theme.colors.background, borderBottomWidth: StyleSheet.hairlineWidth, paddingHorizontal: 10, paddingVertical: 8, marginBottom: 0, },
    searchBarInputContainer: { backgroundColor: theme.colors.searchBg || theme.colors.grey5, height: 40, borderRadius: 20, },
    searchInputStyle: { color: theme.colors.text, fontSize: 15, },
    listContentContainer: { paddingBottom: 80, },
    listContentContainerEmpty: { flexGrow: 1, justifyContent: 'center', },
    fab: { position: 'absolute', margin: 16, right: 10, bottom: 10, },
}));

export default FoodListScreen;
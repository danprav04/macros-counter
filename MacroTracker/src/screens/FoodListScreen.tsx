// src/screens/FoodListScreen.tsx
// ---------- src/screens/FoodListScreen.tsx ----------
import React, { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { View, FlatList, Alert, Platform, ActivityIndicator, StyleSheet, I18nManager } from "react-native";
import { createFood, getFoods, updateFood, deleteFood } from "../services/foodService";
import { Food } from "../types/food";
import { isNotEmpty } from "../utils/validationUtils";
import FoodItem from "../components/FoodItem";
import { Button, SearchBar, useTheme, makeStyles, Text, Icon as RNEIcon } from "@rneui/themed";
import { FAB } from "@rneui/base";
import { SafeAreaView } from "react-native-safe-area-context";
import AddFoodModal from "../components/AddFoodModal";
import Toast from "react-native-toast-message";
import { useFocusEffect } from "@react-navigation/native";
import { getFoodIconUrl } from "../utils/iconUtils";
import { t } from '../localization/i18n';

interface FoodListScreenProps { onFoodChange?: () => void; }

const FoodListScreen: React.FC<FoodListScreenProps> = ({ onFoodChange }) => {
    const [foods, setFoods] = useState<Food[]>([]);
    const [foodIcons, setFoodIcons] = useState<{ [foodName: string]: string | null | undefined }>({});
    const [isLoading, setIsLoading] = useState(true);
    const [isOverlayVisible, setIsOverlayVisible] = useState(false);
    const [search, setSearch] = useState("");
    const [newFood, setNewFood] = useState<Omit<Food, "id">>({ name: "", calories: 0, protein: 0, carbs: 0, fat: 0, });
    const [editFood, setEditFood] = useState<Food | null>(null);
    const [errors, setErrors] = useState<{ [key: string]: string }>({});
    const [isSaving, setIsSaving] = useState(false);

    const { theme } = useTheme();
    const styles = useStyles();
    const flatListRef = useRef<FlatList>(null);
    const foodIconsRef = useRef(foodIcons);
    useEffect(() => { foodIconsRef.current = foodIcons; }, [foodIcons]);

    const triggerIconPrefetch = useCallback((foodsToFetch: Food[]) => {
        if (!foodsToFetch || foodsToFetch.length === 0) return;
        const uniqueFoodNames = new Set(foodsToFetch.map(f => f.name)); if (uniqueFoodNames.size === 0) return;
        const currentIcons = foodIconsRef.current;
        const prefetchPromises = Array.from(uniqueFoodNames).map(name => {
            if (currentIcons[name] === undefined) {
                 if (foodIconsRef.current[name] === undefined) setFoodIcons(prev => ({...prev, [name]: undefined}));
                return getFoodIconUrl(name).then(url => setFoodIcons(prev => ({...prev, [name]: url}))).catch(err => setFoodIcons(prev => ({...prev, [name]: null})));
            } return Promise.resolve();
        });
        Promise.allSettled(prefetchPromises);
    }, []);

    const loadFoodData = useCallback(async () => {
        setIsLoading(true); setFoodIcons({});
        try {
            const loadedFoods = await getFoods(); loadedFoods.sort((a, b) => a.name.localeCompare(b.name));
            setFoods(loadedFoods); triggerIconPrefetch(loadedFoods);
        } catch (error) {
            Alert.alert(t('foodListScreen.errorLoad'), t('foodListScreen.errorLoadMessage')); setFoods([]);
        } finally { setIsLoading(false); }
    }, [triggerIconPrefetch]);

    useFocusEffect( useCallback(() => { loadFoodData(); return () => { setSearch(""); setIsOverlayVisible(false); }; }, [loadFoodData]) );

    const validateFood = (food: Omit<Food, "id"> | Food): { [key: string]: string } | null => {
        const newErrors: { [key: string]: string } = {};
        if (!isNotEmpty(food.name)) newErrors.name = "Name is required"; // Keep internal keys consistent
        if (isNaN(food.calories) || food.calories < 0) newErrors.calories = "Must be a non-negative number";
        if (isNaN(food.protein) || food.protein < 0) newErrors.protein = "Must be a non-negative number";
        if (isNaN(food.carbs) || food.carbs < 0) newErrors.carbs = "Must be a non-negative number";
        if (isNaN(food.fat) || food.fat < 0) newErrors.fat = "Must be a non-negative number";
        return Object.keys(newErrors).length === 0 ? null : newErrors;
    };

    const handleCreateFood = async () => {
        const trimmedFood = { ...newFood, name: newFood.name.trim() };
        const validationErrors = validateFood(trimmedFood);
        if (validationErrors) { setErrors(validationErrors); Toast.show({ type: 'error', text1: t('foodListScreen.fixErrors'), position: 'bottom' }); return; }
        setErrors({}); setIsSaving(true);
        try {
            const createdFood = await createFood(trimmedFood);
            const updatedFoods = [...foods, createdFood].sort((a, b) => a.name.localeCompare(b.name));
            setFoods(updatedFoods);
            setNewFood({ name: "", calories: 0, protein: 0, carbs: 0, fat: 0 });
            setIsOverlayVisible(false); onFoodChange?.();
            Toast.show({ type: 'success', text1: t('foodListScreen.foodAdded', { foodName: createdFood.name }), position: 'bottom' });
        } catch (error: any) { Alert.alert(t('foodListScreen.errorCreate'), error.message || t('foodListScreen.errorCreateMessage'));
        } finally { setIsSaving(false); }
    };

    const handleUpdateFood = async () => {
        if (!editFood) return;
        const trimmedFood = { ...editFood, name: editFood.name.trim() };
        const validationErrors = validateFood(trimmedFood);
        if (validationErrors) { setErrors(validationErrors); Toast.show({ type: 'error', text1: t('foodListScreen.fixErrors'), position: 'bottom' }); return; }
        setErrors({}); setIsSaving(true);
        try {
            const updated = await updateFood(trimmedFood);
            const updatedFoods = foods.map((f) => (f.id === updated.id ? updated : f)).sort((a, b) => a.name.localeCompare(b.name));
            setFoods(updatedFoods);
            setEditFood(null); setIsOverlayVisible(false); onFoodChange?.();
            Toast.show({ type: 'success', text1: t('foodListScreen.foodUpdated', { foodName: updated.name }), position: 'bottom' });
        } catch (error: any) { Alert.alert(t('foodListScreen.errorUpdate'), error.message || t('foodListScreen.errorUpdateMessage'));
        } finally { setIsSaving(false); }
    };

    const handleDeleteFood = async (foodId: string) => {
        const foodToDelete = foods.find((f) => f.id === foodId); if (!foodToDelete) return;
        const previousFoods = foods; setFoods(foods.filter((f) => f.id !== foodId));
        try {
            await deleteFood(foodId); onFoodChange?.();
            setFoodIcons(prev => { const newIcons = {...prev}; delete newIcons[foodToDelete.name]; return newIcons; });
        } catch (error) {
            setFoods(previousFoods); Alert.alert(t('foodListScreen.errorDelete'), t('foodListScreen.errorDeleteMessage'));
        }
    };

    const handleUndoDeleteFood = useCallback((food: Food) => {
        const restoredFoods = [...foods, food].sort((a, b) => a.name.localeCompare(b.name));
        setFoods(restoredFoods); Toast.hide(); onFoodChange?.();
        Toast.show({ type: 'success', text1: t('foodListScreen.foodRestored', { foodName: food.name }), position: 'bottom', visibilityTime: 2000 });
    }, [foods, onFoodChange]);

    const toggleOverlay = (foodToEdit?: Food) => {
        if (isSaving) return;
        if (foodToEdit) { setEditFood({ ...foodToEdit }); setNewFood({ name: "", calories: 0, protein: 0, carbs: 0, fat: 0 }); }
        else { setEditFood(null); setNewFood({ name: "", calories: 0, protein: 0, carbs: 0, fat: 0 }); }
        setErrors({}); setIsOverlayVisible(!isOverlayVisible);
    };

    const updateSearch = (search: string) => setSearch(search);
    const filteredFoods = useMemo(() => { return foods.filter((food) => food.name.toLowerCase().includes(search.toLowerCase())); }, [foods, search]);

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

    if (isLoading) {
        return ( <SafeAreaView style={styles.centeredLoader}><ActivityIndicator size="large" color={theme.colors.primary} /><Text style={styles.loadingText}>{t('foodListScreen.loadingFoods')}</Text></SafeAreaView> );
    }

    return (
        <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
            <SearchBar placeholder={t('foodListScreen.searchPlaceholder')} onChangeText={updateSearch} value={search} platform={Platform.OS === "ios" ? "ios" : "android"} containerStyle={styles.searchBarContainer} inputContainerStyle={styles.searchBarInputContainer} inputStyle={styles.searchInputStyle} onClear={() => setSearch('')} showCancel={Platform.OS === 'ios'} />
            <FlatList ref={flatListRef} data={filteredFoods} keyExtractor={(item) => item.id} renderItem={({ item }) => ( <FoodItem food={item} onEdit={toggleOverlay} onDelete={handleDeleteFood} onUndoDelete={handleUndoDeleteFood} foodIconUrl={foodIcons[item.name]} /> )} ListEmptyComponent={ <View style={styles.emptyListContainer}><RNEIcon name="nutrition-outline" type="ionicon" size={50} color={theme.colors.grey3} /><Text style={styles.emptyListText}> {search ? t('foodListScreen.noResults', {searchTerm: search}) : t('foodListScreen.emptyLibrary')} </Text>{!search && <Text style={styles.emptyListSubText}>{t('foodListScreen.emptyLibraryHint')}</Text>}</View> } contentContainerStyle={filteredFoods.length === 0 ? styles.listContentContainerEmpty : styles.listContentContainer} initialNumToRender={15} maxToRenderPerBatch={10} windowSize={21} keyboardShouldPersistTaps="handled" />
            <FAB icon={<RNEIcon name="add" color={theme.colors.white} />} color={theme.colors.primary} onPress={() => !isSaving && toggleOverlay()} placement="right" size="large" style={styles.fab} disabled={isSaving} />
            <AddFoodModal isVisible={isOverlayVisible} toggleOverlay={() => !isSaving && setIsOverlayVisible(false)} newFood={newFood} editFood={editFood} errors={errors} handleInputChange={handleInputChange} handleCreateFood={handleCreateFood} handleUpdateFood={handleUpdateFood} validateFood={validateFood} setErrors={setErrors} />
        </SafeAreaView>
    );
};

const useStyles = makeStyles((theme) => ({
    container: { flex: 1, backgroundColor: theme.colors.background, },
    centeredLoader: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: theme.colors.background, },
    loadingText: { marginTop: 15, color: theme.colors.grey1, fontSize: 16, },
    emptyListContainer: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 30, marginTop: 50, },
    emptyListText: { fontSize: 17, color: theme.colors.grey2, textAlign: 'center', marginTop: 15, },
    emptyListSubText: { fontSize: 14, color: theme.colors.grey3, textAlign: 'center', marginTop: 8, },
    searchBarContainer: { backgroundColor: theme.colors.background, borderBottomColor: theme.colors.divider, borderTopColor: theme.colors.background, borderBottomWidth: StyleSheet.hairlineWidth, paddingHorizontal: 10, paddingVertical: 8, marginBottom: 0, },
    searchBarInputContainer: { backgroundColor: theme.colors.searchBg || theme.colors.grey5, height: 40, borderRadius: 20, },
    searchInputStyle: { color: theme.colors.text, fontSize: 15, textAlign: I18nManager.isRTL ? 'right' : 'left' },
    listContentContainer: { paddingBottom: 80, },
    listContentContainerEmpty: { flexGrow: 1, justifyContent: 'center', },
    fab: { position: 'absolute', margin: 16, right: I18nManager.isRTL ? undefined : 10, left: I18nManager.isRTL ? 10: undefined, bottom: 10, },
}));

export default FoodListScreen;
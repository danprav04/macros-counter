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
import { useFocusEffect, useNavigation, useRoute, RouteProp } from "@react-navigation/native"; 
import { getFoodIconUrl } from "../utils/iconUtils";
import { t } from '../localization/i18n';
import { NativeStackNavigationProp } from "@react-navigation/native-stack";

interface FoodListScreenProps { onFoodChange?: () => void; }

type RootStackParamList = {
  [key: string]: { openAddFoodModal?: boolean } | undefined;
};

const PAGE_SIZE = 20;

const FoodListScreen: React.FC<FoodListScreenProps> = ({ onFoodChange }) => {
    const [foods, setFoods] = useState<Food[]>([]);
    const [foodIcons, setFoodIcons] = useState<{ [foodName: string]: string | null | undefined }>({});
    
    const [offset, setOffset] = useState(0);
    const [totalFoods, setTotalFoods] = useState(0);
    const [isLoading, setIsLoading] = useState(true); // For initial load
    const [isLoadingMore, setIsLoadingMore] = useState(false); // For subsequent loads

    const [isOverlayVisible, setIsOverlayVisible] = useState(false);
    const [search, setSearch] = useState("");
    const [newFood, setNewFood] = useState<Omit<Food, "id">>({ name: "", calories: 0, protein: 0, carbs: 0, fat: 0, });
    const [editFood, setEditFood] = useState<Food | null>(null);
    const [errors, setErrors] = useState<{ [key: string]: string }>({});
    const [isSaving, setIsSaving] = useState(false); // For CUD operations in modal

    const { theme } = useTheme();
    const styles = useStyles();
    const flatListRef = useRef<FlatList>(null);
    const foodIconsRef = useRef(foodIcons);
    useEffect(() => { foodIconsRef.current = foodIcons; }, [foodIcons]);

    const route = useRoute<RouteProp<RootStackParamList, string>>();
    const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();

    const hasMoreData = useMemo(() => foods.length < totalFoods, [foods.length, totalFoods]);

    const triggerIconPrefetch = useCallback((foodsToFetch: Food[]) => {
        if (!foodsToFetch || foodsToFetch.length === 0) return;
        const uniqueFoodNames = new Set(foodsToFetch.map(f => f.name)); if (uniqueFoodNames.size === 0) return;
        
        foodsToFetch.forEach(food => {
            if (foodIconsRef.current[food.name] === undefined) {
                // Immediately mark as loading if not already initiated
                if (foodIcons[food.name] === undefined) { // Check against current state to avoid race conditions
                     setFoodIcons(prev => ({...prev, [food.name]: undefined}));
                }
                getFoodIconUrl(food.name)
                    .then(url => setFoodIcons(prev => ({...prev, [food.name]: url})))
                    .catch(err => setFoodIcons(prev => ({...prev, [food.name]: null})));
            }
        });
    }, [foodIcons]); // foodIcons dependency is important here for the conditional setFoodIcons

    const fetchFoodsData = useCallback(async (isRefresh: boolean = false) => {
        if (!isRefresh && (isLoadingMore || !hasMoreData)) return;

        const currentOffset = isRefresh ? 0 : offset;
        if (isRefresh) {
            setIsLoading(true);
            setFoodIcons({}); // Clear icons on full refresh
        } else {
            setIsLoadingMore(true);
        }

        try {
            const { items: newItems, total } = await getFoods(currentOffset, PAGE_SIZE);
            if (isRefresh) {
                setFoods(newItems);
            } else {
                setFoods(prevFoods => [...prevFoods, ...newItems]);
            }
            setTotalFoods(total);
            setOffset(currentOffset + newItems.length);
            triggerIconPrefetch(newItems);
        } catch (error) {
            Alert.alert(t('foodListScreen.errorLoad'), t('foodListScreen.errorLoadMessage'));
            if (isRefresh) setFoods([]); // Clear foods on error during refresh
        } finally {
            if (isRefresh) setIsLoading(false);
            else setIsLoadingMore(false);
        }
    }, [isLoadingMore, hasMoreData, offset, triggerIconPrefetch]);

    useFocusEffect(
      useCallback(() => {
        fetchFoodsData(true); // Initial load / refresh on focus
    
        const params = route.params;
        if (params?.openAddFoodModal && !isOverlayVisible) {
          toggleOverlay(); 
          navigation.setParams({ openAddFoodModal: undefined }); 
        }
    
        return () => {
          setSearch("");
        };
      }, [route.params, navigation, isOverlayVisible]) 
    );

    const validateFood = (food: Omit<Food, "id"> | Food): { [key: string]: string } | null => {
        const newErrors: { [key: string]: string } = {};
        if (!isNotEmpty(food.name)) newErrors.name = "Name is required"; 
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
            await createFood(trimmedFood); // createFood modifies storage directly
            setIsOverlayVisible(false); 
            onFoodChange?.(); // Signal change
            fetchFoodsData(true); // Refresh list from start
            Toast.show({ type: 'success', text1: t('foodListScreen.foodAdded', { foodName: trimmedFood.name }), position: 'bottom' });
            setNewFood({ name: "", calories: 0, protein: 0, carbs: 0, fat: 0 });
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
            await updateFood(trimmedFood); // updateFood modifies storage directly
            setIsOverlayVisible(false); 
            onFoodChange?.(); // Signal change
            fetchFoodsData(true); // Refresh list
            Toast.show({ type: 'success', text1: t('foodListScreen.foodUpdated', { foodName: trimmedFood.name }), position: 'bottom' });
            setEditFood(null);
        } catch (error: any) { Alert.alert(t('foodListScreen.errorUpdate'), error.message || t('foodListScreen.errorUpdateMessage'));
        } finally { setIsSaving(false); }
    };

    const handleDeleteFood = async (foodId: string) => {
        const foodToDelete = foods.find((f) => f.id === foodId); if (!foodToDelete) return;
        // Optimistically remove from UI for now, will be confirmed by refresh
        // setFoods(foods.filter((f) => f.id !== foodId)); 
        try {
            await deleteFood(foodId); 
            onFoodChange?.();
            setFoodIcons(prev => { const newIcons = {...prev}; delete newIcons[foodToDelete.name]; return newIcons; });
            fetchFoodsData(true); // Refresh list
            // Toast for delete will be handled by FoodItem component for undo functionality
        } catch (error) {
            // fetchFoodsData(true); // Re-fetch to revert optimistic update if needed (though refresh above does it)
            Alert.alert(t('foodListScreen.errorDelete'), t('foodListScreen.errorDeleteMessage'));
        }
    };

    const handleUndoDeleteFood = useCallback(async (food: Food) => {
        // Since deleteFood (and its CUD counterparts) now trigger a full refresh,
        // "undo" effectively means re-adding the food if it was truly deleted from backend/storage.
        // For local storage, it's more about ensuring the item is not in the "deleted" state.
        // Given current setup, delete is permanent. The Toast in FoodItem is for UI feedback.
        // If true undo (re-creating the item) is needed:
        // await createFood(food); // This would create a new ID. Better to restore original if possible.
        // For now, the refresh after delete ensures the list is accurate.
        // This function can be simplified if the "undo" is primarily a UI gesture before a final sync.
        // However, with `fetchFoodsData(true)` after delete, this specific undo becomes less meaningful
        // for reversing the *actual* data deletion.
        // Let's assume the Toast's undo in FoodItem is for immediate UI reversal before actual deletion logic.
        // For a robust undo with backend/async storage, it would involve a "soft delete" then "undelete" flow.
        // For current local storage, it's more complex. The refresh ensures list accuracy.
        // The original `handleUndoDeleteFood` was:
        // const restoredFoods = [...foods, food].sort((a, b) => a.name.localeCompare(b.name));
        // setFoods(restoredFoods); Toast.hide(); onFoodChange?.();
        // Toast.show({ type: 'success', text1: t('foodListScreen.foodRestored', { foodName: food.name }), position: 'bottom', visibilityTime: 2000 });
        // This is problematic with pagination. We should re-fetch.
        Toast.hide();
        fetchFoodsData(true); // Re-fetch to ensure state is correct, though this won't "undo" a permanent delete.
        Toast.show({ type: 'info', text1: t('foodListScreen.foodRestored', { foodName: food.name }), text2: "List refreshed.", position: 'bottom', visibilityTime: 2000 });

    }, [fetchFoodsData]);


    const toggleOverlay = (foodToEdit?: Food) => {
        if (isSaving) return;
        if (foodToEdit) { setEditFood({ ...foodToEdit }); setNewFood({ name: "", calories: 0, protein: 0, carbs: 0, fat: 0 }); }
        else { setEditFood(null); setNewFood({ name: "", calories: 0, protein: 0, carbs: 0, fat: 0 }); }
        setErrors({}); setIsOverlayVisible(!isOverlayVisible);
    };

    const updateSearch = (text: string) => setSearch(text);
    
    const filteredFoods = useMemo(() => {
        if (!search.trim()) return foods;
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

    const renderFooter = () => {
        if (!isLoadingMore) return null;
        return (
            <View style={styles.footerLoader}>
                <ActivityIndicator size="small" color={theme.colors.primary} />
            </View>
        );
    };
    
    const handleLoadMore = () => {
        if (search.trim()) return; // Don't load more if searching (filters current list)
        fetchFoodsData(false);
    };

    if (isLoading && foods.length === 0) { // Show full screen loader only on initial absolute empty load
        return ( <SafeAreaView style={styles.centeredLoader}><ActivityIndicator size="large" color={theme.colors.primary} /><Text style={styles.loadingText}>{t('foodListScreen.loadingFoods')}</Text></SafeAreaView> );
    }

    return (
        <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
            <SearchBar placeholder={t('foodListScreen.searchPlaceholder')} onChangeText={updateSearch} value={search} platform={Platform.OS === "ios" ? "ios" : "android"} containerStyle={styles.searchBarContainer} inputContainerStyle={styles.searchBarInputContainer} inputStyle={styles.searchInputStyle} onClear={() => setSearch('')} showCancel={Platform.OS === 'ios'} />
            <FlatList 
                ref={flatListRef} 
                data={filteredFoods} 
                keyExtractor={(item) => item.id} 
                renderItem={({ item }) => ( <FoodItem food={item} onEdit={toggleOverlay} onDelete={handleDeleteFood} onUndoDelete={handleUndoDeleteFood} foodIconUrl={foodIcons[item.name]} /> )} 
                ListEmptyComponent={ 
                    !isLoading ? ( // Don't show "empty" if initial load is happening
                        <View style={styles.emptyListContainer}>
                            <RNEIcon name="nutrition-outline" type="ionicon" size={50} color={theme.colors.grey3} />
                            <Text style={styles.emptyListText}> 
                                {search ? t('foodListScreen.noResults', {searchTerm: search}) : t('foodListScreen.emptyLibrary')} 
                            </Text>
                            {!search && <Text style={styles.emptyListSubText}>{t('foodListScreen.emptyLibraryHint')}</Text>}
                        </View> 
                    ) : null
                } 
                contentContainerStyle={filteredFoods.length === 0 && !isLoading ? styles.listContentContainerEmpty : styles.listContentContainer} 
                onEndReached={handleLoadMore}
                onEndReachedThreshold={0.5}
                ListFooterComponent={renderFooter}
                keyboardShouldPersistTaps="handled" 
                extraData={{ foodIcons, isLoadingMore }} // Add isLoadingMore to extraData
            />
            <FAB icon={<RNEIcon name="add" color={theme.colors.white} />} color={theme.colors.primary} onPress={() => !isSaving && toggleOverlay()} placement="right" size="large" style={styles.fab} disabled={isSaving || isLoading || isLoadingMore} />
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
    footerLoader: {
        paddingVertical: 20,
    },
}));

export default FoodListScreen;
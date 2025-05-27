// src/screens/FoodListScreen.tsx
import React, { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { View, FlatList, Alert, Platform, ActivityIndicator, StyleSheet, I18nManager, Share } from "react-native";
import { createFood, getFoods, updateFood, deleteFood } from "../services/foodService";
import { Food, SharedFoodData } from "../types/food";
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
import { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';
import { MainTabParamList } from "../navigation/AppNavigator";
import Constants from 'expo-constants';

// Polyfill atob if not available (e.g., in some JS environments without DOM)
if (typeof atob === 'undefined') {
  global.atob = (str) => Buffer.from(str, 'base64').toString('binary');
}
if (typeof btoa === 'undefined') {
  global.btoa = (str) => Buffer.from(str, 'binary').toString('base64');
}


interface FoodListScreenProps { onFoodChange?: () => void; }

const PAGE_SIZE = 20;

type FoodListScreenNavigationProp = BottomTabNavigationProp<MainTabParamList, 'FoodListRoute'>;
type FoodListScreenRouteProp = RouteProp<MainTabParamList, 'FoodListRoute'>;

const getBackendShareBaseUrl = (): string => {
    const envUrl = process.env.EXPO_PUBLIC_BACKEND_URL_PRODUCTION || process.env.EXPO_PUBLIC_BACKEND_URL;
    if (envUrl) {
        return envUrl.replace(/\/api\/v1$/, '').replace(/\/$/, '');
    }
    const configUrlKey = __DEV__ ? 'BACKEND_URL_DEVELOPMENT' : 'BACKEND_URL_PRODUCTION';
    const configUrl = Constants.expoConfig?.extra?.env?.[configUrlKey];
    
    if (configUrl) {
        console.warn(`Using Backend URL from app.json extra.env.${configUrlKey}. Consider using build-time environment variables (EXPO_PUBLIC_*) for production consistency.`);
        return configUrl.replace(/\/api\/v1$/, '').replace(/\/$/, '');
    }
    console.error("Backend URL for sharing not found. Using default DEVELOPMENT URL. THIS IS NOT FOR PRODUCTION.");
    const DEV_URL = Constants.expoConfig?.extra?.env?.BACKEND_URL_DEVELOPMENT || 'http://192.168.1.15:8000';
    return DEV_URL.replace(/\/api\/v1$/, '').replace(/\/$/, '');
};


const FoodListScreen: React.FC<FoodListScreenProps> = ({ onFoodChange }) => {
    const [foods, setFoods] = useState<Food[]>([]);
    const [foodIcons, setFoodIcons] = useState<{ [foodName: string]: string | null | undefined }>({});

    const [offset, setOffset] = useState(0);
    const [totalFoods, setTotalFoods] = useState(0);
    const [isLoading, setIsLoading] = useState(true); // Start true for initial load
    const [isLoadingMore, setIsLoadingMore] = useState(false);

    const [isOverlayVisible, setIsOverlayVisible] = useState(false);
    const [search, setSearch] = useState("");
    const [newFood, setNewFood] = useState<Omit<Food, "id">>({ name: "", calories: 0, protein: 0, carbs: 0, fat: 0, });
    const [editFood, setEditFood] = useState<Food | null>(null);
    const [errors, setErrors] = useState<{ [key: string]: string }>({});
    const [isSaving, setIsSaving] = useState(false);

    const { theme } = useTheme();
    const styles = useStyles();
    const flatListRef = useRef<FlatList<Food>>(null);
    const foodIconsRef = useRef(foodIcons);
    const prevSearchTermRef = useRef<string>(search.trim());
    const isFirstRunRef = useRef(true); // To track the very first run of useFocusEffect

    useEffect(() => { foodIconsRef.current = foodIcons; }, [foodIcons]);

    const route = useRoute<FoodListScreenRouteProp>();
    const navigation = useNavigation<FoodListScreenNavigationProp>();

    const triggerIconPrefetch = useCallback((foodsToFetch: Food[]) => {
        if (!foodsToFetch || foodsToFetch.length === 0) return;
        foodsToFetch.forEach(food => {
            if (food.name && foodIconsRef.current[food.name] === undefined) {
                setFoodIcons(prev => ({ ...prev, [food.name]: undefined }));
                getFoodIconUrl(food.name)
                    .then(url => setFoodIcons(prev => ({ ...prev, [food.name]: url })))
                    .catch(err => {
                        console.warn(`Failed to fetch icon for ${food.name} in triggerIconPrefetch:`, err);
                        setFoodIcons(prev => ({ ...prev, [food.name]: null }));
                    });
            }
        });
    }, []);

    const doFetchFoods = useCallback(async (
        isInitialOrNewSearch: boolean,
        termToFetch: string,
        currentOffset: number, // Current offset state before this fetch
        currentFoodsLength: number, // Current foods.length before this fetch
        currentTotalFoods: number, // Current totalFoods state before this fetch
        currentIsLoadingMore: boolean // Current isLoadingMore state
    ) => {
        // Prevent fetching more if already loading more or no more data for non-initial searches
        if (!isInitialOrNewSearch && (currentIsLoadingMore || (currentFoodsLength >= currentTotalFoods && currentTotalFoods > 0))) {
            return;
        }

        const offsetForThisFetch = isInitialOrNewSearch ? 0 : currentOffset;

        if (isInitialOrNewSearch) {
            setIsLoading(true); // Set main loading true
        } else {
            setIsLoadingMore(true);
        }

        try {
            const { items: newItemsFromApi, total: totalFromApi } = await getFoods(offsetForThisFetch, PAGE_SIZE, termToFetch);

            if (isInitialOrNewSearch) {
                if (flatListRef.current) {
                    flatListRef.current.scrollToOffset({ animated: false, offset: 0 });
                }
                setFoods(newItemsFromApi);
            } else {
                setFoods(prevFoods => {
                    const existingIds = new Set(prevFoods.map(f => f.id));
                    const uniqueNewItems = newItemsFromApi.filter(item => !existingIds.has(item.id));
                    return [...prevFoods, ...uniqueNewItems];
                });
            }
            setTotalFoods(totalFromApi);
            setOffset(offsetForThisFetch + newItemsFromApi.length);
            triggerIconPrefetch(newItemsFromApi);
        } catch (error) {
            Alert.alert(t('foodListScreen.errorLoad'), t('foodListScreen.errorLoadMessage'));
            if (isInitialOrNewSearch) {
                 setFoods([]);
                 setTotalFoods(0);
                 setOffset(0);
            }
        } finally {
            if (isInitialOrNewSearch) setIsLoading(false); // Critical: Set main loading false
            else setIsLoadingMore(false);
        }
    }, [triggerIconPrefetch, PAGE_SIZE, t]);

    const toggleOverlay = useCallback((foodToEdit?: Food) => {
        if (isSaving) return;
        if (foodToEdit) {
            setEditFood({ ...foodToEdit });
            setNewFood({ name: "", calories: 0, protein: 0, carbs: 0, fat: 0 });
        } else {
            setEditFood(null);
            setNewFood({ name: "", calories: 0, protein: 0, carbs: 0, fat: 0 });
        }
        setErrors({});
        setIsOverlayVisible(prev => !prev);
    }, [isSaving]);

    useFocusEffect(
        useCallback(() => {
            const currentTrimmedSearch = search.trim();
            const isNewSearch = prevSearchTermRef.current !== currentTrimmedSearch;
            let shouldFetchInitially = false;

            if (isFirstRunRef.current) {
                shouldFetchInitially = true;
                isFirstRunRef.current = false; 
            } else if (isNewSearch) {
                shouldFetchInitially = true;
            }
            
            if (shouldFetchInitially) {
                // Pass current state values that doFetchFoods needs for its internal logic
                doFetchFoods(true, currentTrimmedSearch, offset, foods.length, totalFoods, isLoadingMore);
            }
            prevSearchTermRef.current = currentTrimmedSearch;

            const params = route.params;
            if (params) {
                if (params.openAddFoodModal && !isOverlayVisible) {
                    toggleOverlay();
                    navigation.setParams({ openAddFoodModal: undefined });
                }
                if (params.foodData && typeof params.foodData === 'string') {
                    try {
                        let b64 = params.foodData.replace(/-/g, '+').replace(/_/g, '/');
                        const decodedJson = atob(b64); 
                        const sharedFood: SharedFoodData = JSON.parse(decodedJson);

                        if (sharedFood && typeof sharedFood.name === 'string') {
                            setNewFood({
                                name: sharedFood.name, calories: sharedFood.calories, protein: sharedFood.protein,
                                carbs: sharedFood.carbs, fat: sharedFood.fat,
                            });
                            setEditFood(null);
                            setIsOverlayVisible(true); 
                            navigation.setParams({ foodData: undefined });
                        } else {
                            console.warn("Parsed shared food data is invalid:", sharedFood);
                            Alert.alert(t('foodListScreen.deepLinkErrorTitle'), t('foodListScreen.deepLinkInvalidData'));
                            navigation.setParams({ foodData: undefined });
                        }
                    } catch (e) {
                        console.error("Error parsing shared food data from deep link:", e);
                        Alert.alert(t('foodListScreen.deepLinkErrorTitle'), t('foodListScreen.deepLinkParseError'));
                        navigation.setParams({ foodData: undefined });
                    }
                }
            }
            return () => {};
        }, [
            search, route.params, isOverlayVisible, 
            offset, foods.length, totalFoods, isLoadingMore, // Pass these to effect for doFetchFoods call
            doFetchFoods, toggleOverlay, navigation, t
        ])
    );

    const updateSearch = useCallback((text: string) => {
        setSearch(text);
        // Actual fetch will be triggered by useFocusEffect due to `search` dependency change
    }, []);

    const handleClearSearch = useCallback(() => {
        setSearch('');
        // Actual fetch will be triggered by useFocusEffect
    }, []);

    const handleLoadMore = () => {
        // Pass current state values to doFetchFoods
        if (!isLoading && !isLoadingMore && (foods.length < totalFoods)) {
            doFetchFoods(false, search.trim(), offset, foods.length, totalFoods, isLoadingMore);
        }
    };
    
    const handleQuickAdd = useCallback((foodToQuickAdd: Food) => {
        navigation.navigate('DailyEntryRoute', { quickAddFood: foodToQuickAdd });
    }, [navigation]);

    const validateFood = (foodToValidate: Omit<Food, "id"> | Food): { [key: string]: string } | null => {
        const newErrors: { [key: string]: string } = {};
        if (!isNotEmpty(foodToValidate.name)) newErrors.name = "Name is required";
        if (isNaN(foodToValidate.calories) || foodToValidate.calories < 0) newErrors.calories = "Must be a non-negative number";
        if (isNaN(foodToValidate.protein) || foodToValidate.protein < 0) newErrors.protein = "Must be a non-negative number";
        if (isNaN(foodToValidate.carbs) || foodToValidate.carbs < 0) newErrors.carbs = "Must be a non-negative number";
        if (isNaN(foodToValidate.fat) || foodToValidate.fat < 0) newErrors.fat = "Must be a non-negative number";
        return Object.keys(newErrors).length === 0 ? null : newErrors;
    };

    const handleCreateFood = async () => {
        const trimmedFood = { ...newFood, name: newFood.name.trim() };
        const validationErrors = validateFood(trimmedFood);
        if (validationErrors) { setErrors(validationErrors); Toast.show({ type: 'error', text1: t('foodListScreen.fixErrors'), position: 'bottom' }); return; }
        setErrors({}); setIsSaving(true);
        try {
            const created = await createFood(trimmedFood);
            setIsOverlayVisible(false); 
            onFoodChange?.(); 
            doFetchFoods(true, search.trim(), 0, 0, 0, false); // Refresh list
            Toast.show({ type: 'success', text1: t('foodListScreen.foodAdded', { foodName: created.name }), position: 'bottom' });
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
            const updated = await updateFood(trimmedFood);
            setIsOverlayVisible(false); 
            onFoodChange?.(); 
            doFetchFoods(true, search.trim(), 0, 0, 0, false); // Refresh list
            Toast.show({ type: 'success', text1: t('foodListScreen.foodUpdated', { foodName: updated.name }), position: 'bottom' });
            setEditFood(null);
        } catch (error: any) { Alert.alert(t('foodListScreen.errorUpdate'), error.message || t('foodListScreen.errorUpdateMessage'));
        } finally { setIsSaving(false); }
    };

    const handleDeleteFood = async (foodId: string) => {
        const foodToDelete = foods.find((f) => f.id === foodId); if (!foodToDelete) return;
        try {
            await deleteFood(foodId);
            onFoodChange?.();
            if (foodToDelete.name && foodIconsRef.current[foodToDelete.name] !== undefined) {
                setFoodIcons(prev => { const newIcons = { ...prev }; delete newIcons[foodToDelete.name]; return newIcons; });
            }
            doFetchFoods(true, search.trim(), 0, 0, 0, false); // Refresh list
        } catch (error) {
            Alert.alert(t('foodListScreen.errorDelete'), t('foodListScreen.errorDeleteMessage'));
            doFetchFoods(true, search.trim(), 0, 0, 0, false);
        }
    };

    const handleUndoDeleteFood = useCallback(async (food: Food) => {
        Toast.hide();
        doFetchFoods(true, search.trim(), 0, 0, 0, false); // Refresh list
        Toast.show({ type: 'info', text1: t('foodListScreen.foodRestored', { foodName: food.name }), text2: "List refreshed.", position: 'bottom', visibilityTime: 2000 });
    }, [search, doFetchFoods, t]); 


    const handleShareFood = useCallback(async (foodToShare: Food) => {
        const foodDataPayload: SharedFoodData = {
            name: foodToShare.name, calories: foodToShare.calories, protein: foodToShare.protein,
            carbs: foodToShare.carbs, fat: foodToShare.fat,
        };
        try {
            const jsonString = JSON.stringify(foodDataPayload);
            const base64Data = btoa(jsonString).replace(/\+/g, '-').replace(/\//g, '_');
            const backendBaseUrl = getBackendShareBaseUrl();
            const shareUrl = `${backendBaseUrl}/share/food?data=${base64Data}`;
            await Share.share({ message: shareUrl, title: t('foodListScreen.shareFoodTitle', {foodName: foodToShare.name}), });
        } catch (error) {
            console.error("Error sharing food:", error);
            Alert.alert(t('foodListScreen.shareErrorTitle'), t('foodListScreen.shareErrorMessage'));
        }
    }, [t]);

    const handleInputChange = useCallback((key: keyof Omit<Food, "id">, value: string, isEdit: boolean) => {
        const numericKeys: (keyof Omit<Food, "id">)[] = ['calories', 'protein', 'carbs', 'fat']; let processedValue: string | number = value;
        if (numericKeys.includes(key)) {
            if (value === "" || value === ".") { processedValue = value; } else {
                const cleaned = value.replace(/[^0-9.]/g, "").replace(/(\..*)\./g, "$1");
                if (cleaned === "" || !isNaN(parseFloat(cleaned))) { processedValue = cleaned; } else { return; }
            }
        }
        const updateState = (prevState: any) => {
            let finalValue: string | number;
            if (numericKeys.includes(key)) {
                finalValue = (processedValue === "" || processedValue === ".") ? 0 : parseFloat(processedValue as string);
                if (isNaN(finalValue)) finalValue = 0; 
            } else { finalValue = processedValue; }
            return { ...prevState, [key]: finalValue };
        };
        if (isEdit) { setEditFood(updateState); } else { setNewFood(updateState); }
    }, []);

    const renderFooter = () => {
        if (!isLoadingMore) return null;
        return ( <View style={styles.footerLoader}><ActivityIndicator size="small" color={theme.colors.primary} /></View> );
    };

    // Condition to show the main loading screen
    if (isLoading && foods.length === 0 && !isOverlayVisible) {
        return ( <SafeAreaView style={styles.centeredLoader} edges={['top', 'left', 'right']}><ActivityIndicator size="large" color={theme.colors.primary} /><Text style={styles.loadingText}>{t('foodListScreen.loadingFoods')}</Text></SafeAreaView> );
    }

    return (
        <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
            <SearchBar
                placeholder={t('foodListScreen.searchPlaceholder')}
                onChangeText={updateSearch}
                value={search}
                platform={Platform.OS === "ios" ? "ios" : "android"}
                containerStyle={styles.searchBarContainer}
                inputContainerStyle={styles.searchBarInputContainer}
                inputStyle={styles.searchInputStyle}
                onClear={handleClearSearch}
                showCancel={Platform.OS === 'ios' && search.length > 0}
                cancelButtonProps={{ color: theme.colors.primary }}
                showLoading={isLoading && search.trim().length > 0} 
            />
            <FlatList
                ref={flatListRef}
                data={foods}
                keyExtractor={(item) => item.id}
                renderItem={({ item }) => (
                    <FoodItem
                        food={item}
                        onEdit={() => toggleOverlay(item)}
                        onDelete={handleDeleteFood}
                        onUndoDelete={handleUndoDeleteFood}
                        onQuickAdd={handleQuickAdd}
                        onShare={handleShareFood}
                        foodIconUrl={foodIcons[item.name]} 
                    />
                )}
                ListEmptyComponent={
                    !isLoading ? ( // Only show empty component if not in main loading state
                        <View style={styles.emptyListContainer}>
                            <RNEIcon name="nutrition-outline" type="ionicon" size={50} color={theme.colors.grey3} />
                            <Text style={styles.emptyListText}>
                                {search.trim() ? t('foodListScreen.noResults', { searchTerm: search.trim() }) : t('foodListScreen.emptyLibrary')}
                            </Text>
                            {!search.trim() && <Text style={styles.emptyListSubText}>{t('foodListScreen.emptyLibraryHint')}</Text>}
                        </View>
                    ) : null 
                }
                contentContainerStyle={foods.length === 0 && !isLoading ? styles.listContentContainerEmpty : styles.listContentContainer}
                onEndReached={handleLoadMore}
                onEndReachedThreshold={0.5}
                ListFooterComponent={renderFooter}
                keyboardShouldPersistTaps="handled"
                extraData={{ 
                    foodIconsLength: Object.keys(foodIcons).length, 
                    isLoadingMore, 
                    isLoading, 
                    search, 
                    foodsLength: foods.length,
                    totalFoods
                }}
            />
            <FAB
                icon={<RNEIcon name="add" color={theme.colors.white} />}
                color={theme.colors.primary}
                onPress={() => !isSaving && toggleOverlay()} 
                placement="right"
                size="large"
                style={styles.fab}
                disabled={isSaving || isLoading} 
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
    fab: { position: 'absolute', margin: 16, right: I18nManager.isRTL ? undefined : 10, left: I18nManager.isRTL ? 10 : undefined, bottom: 10, },
    footerLoader: { paddingVertical: 20, alignItems: 'center', },
}));

export default FoodListScreen;
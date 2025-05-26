// src/screens/FoodListScreen.tsx
import React, { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { View, FlatList, Alert, Platform, ActivityIndicator, StyleSheet, I18nManager, Share } from "react-native"; // Import Share from react-native
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
// import * as Sharing from 'expo-sharing'; // No longer needed for this specific share
import * as Linking from 'expo-linking';

interface FoodListScreenProps { onFoodChange?: () => void; }

const PAGE_SIZE = 20;

type FoodListScreenNavigationProp = BottomTabNavigationProp<MainTabParamList, 'FoodListRoute'>;
type FoodListScreenRouteProp = RouteProp<MainTabParamList, 'FoodListRoute'>;

const FoodListScreen: React.FC<FoodListScreenProps> = ({ onFoodChange }) => {
    const [foods, setFoods] = useState<Food[]>([]);
    const [foodIcons, setFoodIcons] = useState<{ [foodName: string]: string | null | undefined }>({});

    const [offset, setOffset] = useState(0);
    const [totalFoods, setTotalFoods] = useState(0);
    const [isLoading, setIsLoading] = useState(true);
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
    useEffect(() => { foodIconsRef.current = foodIcons; }, [foodIcons]);

    const route = useRoute<FoodListScreenRouteProp>();
    const navigation = useNavigation<FoodListScreenNavigationProp>();

    const hasMoreData = useMemo(() => foods.length < totalFoods, [foods.length, totalFoods]);

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

    const fetchFoodsData = useCallback(async (
        isLoadOperationRequest: boolean = false,
        currentSearchTerm?: string
    ) => {
        const termToUse = (currentSearchTerm !== undefined ? currentSearchTerm : search).trim();
        const isActualLoadOperation = isLoadOperationRequest || (currentSearchTerm !== undefined && termToUse !== search.trim());

        if (!isActualLoadOperation && (isLoadingMore || !hasMoreData)) {
            return;
        }

        const currentOffsetToUse = isActualLoadOperation ? 0 : offset;
        
        if (isActualLoadOperation) {
            setIsLoading(true);
            if (flatListRef.current && currentSearchTerm !== undefined && termToUse !== search.trim()) {
                flatListRef.current.scrollToOffset({ animated: false, offset: 0 });
            }
        } else {
            setIsLoadingMore(true);
        }

        try {
            const { items: newItems, total } = await getFoods(currentOffsetToUse, PAGE_SIZE, termToUse);
            
            if (isActualLoadOperation) {
                setFoods(newItems);
            } else {
                setFoods(prevFoods => {
                    const existingIds = new Set(prevFoods.map(f => f.id));
                    const uniqueNewItems = newItems.filter(item => !existingIds.has(item.id));
                    return [...prevFoods, ...uniqueNewItems];
                });
            }
            setTotalFoods(total);
            setOffset(currentOffsetToUse + newItems.length);
            triggerIconPrefetch(newItems);
        } catch (error) {
            Alert.alert(t('foodListScreen.errorLoad'), t('foodListScreen.errorLoadMessage'));
            if (isActualLoadOperation) setFoods([]);
        } finally {
            if (isActualLoadOperation) setIsLoading(false);
            else setIsLoadingMore(false);
        }
    }, [search, offset, hasMoreData, isLoadingMore, triggerIconPrefetch, PAGE_SIZE, t]);

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

    const handleShareFood = useCallback(async (foodToShare: Food) => {
        const foodDataPayload: SharedFoodData = {
            name: foodToShare.name,
            calories: foodToShare.calories,
            protein: foodToShare.protein,
            carbs: foodToShare.carbs,
            fat: foodToShare.fat,
        };
        try {
            const jsonString = JSON.stringify(foodDataPayload);
            const base64Data = btoa(jsonString);
            const shareUrl = Linking.createURL('open-add-food-modal', {
                queryParams: { foodData: base64Data }
            });
            
            console.log("Sharing URL:", shareUrl);

            // Use React Native's Share API
            await Share.share({
                message: shareUrl, // The content you want to share
                title: t('foodListScreen.shareFoodTitle', {foodName: foodToShare.name}), // Optional title for some platforms
            });
            // Note: Share.share() doesn't throw an error if the user cancels,
            // it resolves with an object indicating the action (e.g., { action: Share.sharedAction })
            // or { action: Share.dismissedAction } on Android if dismissed.

        } catch (error) {
            console.error("Error sharing food:", error);
            Alert.alert(t('foodListScreen.shareErrorTitle'), t('foodListScreen.shareErrorMessage'));
        }
    }, [t]);

    useFocusEffect(
        useCallback(() => {
            fetchFoodsData(true, search.trim());
    
            const params = route.params;
            if (params?.openAddFoodModal && !isOverlayVisible) {
                toggleOverlay(); 
                navigation.setParams({ openAddFoodModal: undefined });
            }

            if (params?.foodData && typeof params.foodData === 'string') {
                try {
                    const decodedJson = atob(params.foodData);
                    const sharedFood: SharedFoodData = JSON.parse(decodedJson);
                    
                    if (sharedFood && typeof sharedFood.name === 'string') {
                        setNewFood({
                            name: sharedFood.name,
                            calories: sharedFood.calories,
                            protein: sharedFood.protein,
                            carbs: sharedFood.carbs,
                            fat: sharedFood.fat,
                        });
                        setEditFood(null);
                        setIsOverlayVisible(true);
                        navigation.setParams({ foodData: undefined });
                    } else {
                        console.warn("Parsed shared food data is invalid:", sharedFood);
                         Alert.alert(t('foodListScreen.deepLinkErrorTitle'), t('foodListScreen.deepLinkInvalidData'));
                    }
                } catch (e) {
                    console.error("Error parsing shared food data from deep link:", e);
                    Alert.alert(t('foodListScreen.deepLinkErrorTitle'), t('foodListScreen.deepLinkParseError'));
                    navigation.setParams({ foodData: undefined });
                }
            }

            return () => {};
        }, [search, route.params, navigation, isOverlayVisible, toggleOverlay, fetchFoodsData, t]) 
    );
    
    const updateSearch = useCallback((text: string) => {
        const newTrimmedText = text.trim();
        const oldTrimmedText = search.trim();
        setSearch(text); 

        if (newTrimmedText !== oldTrimmedText) {
            fetchFoodsData(true, newTrimmedText);
        } else if (text === "" && oldTrimmedText !== "") {
             fetchFoodsData(true, "");
        }
    }, [search, fetchFoodsData]);

    const handleClearSearch = useCallback(() => {
        const oldTrimmedText = search.trim();
        setSearch('');
        if (oldTrimmedText !== '') {
            fetchFoodsData(true, '');
        }
    }, [search, fetchFoodsData]);

    const handleLoadMore = () => {
        if (!isLoading && !isLoadingMore && hasMoreData) {
            fetchFoodsData(false);
        }
    };

    const handleQuickAdd = useCallback((foodToQuickAdd: Food) => {
        navigation.navigate('DailyEntryRoute', { quickAddFood: foodToQuickAdd });
    }, [navigation]);

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
            const created = await createFood(trimmedFood);
            setIsOverlayVisible(false);
            onFoodChange?.();
            fetchFoodsData(true, search.trim()); 
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
            fetchFoodsData(true, search.trim()); 
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
            if (foodToDelete.name) {
                setFoodIcons(prev => { const newIcons = { ...prev }; delete newIcons[foodToDelete.name]; return newIcons; });
            }
            fetchFoodsData(true, search.trim()); 
        } catch (error) {
            Alert.alert(t('foodListScreen.errorDelete'), t('foodListScreen.errorDeleteMessage'));
        }
    };

    const handleUndoDeleteFood = useCallback(async (food: Food) => {
        Toast.hide();
        fetchFoodsData(true, search.trim()); 
        Toast.show({ type: 'info', text1: t('foodListScreen.foodRestored', { foodName: food.name }), text2: "List refreshed.", position: 'bottom', visibilityTime: 2000 });
    }, [fetchFoodsData, search]);

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

    if (isLoading && foods.length === 0 && !search.trim()) {
        return ( <SafeAreaView style={styles.centeredLoader}><ActivityIndicator size="large" color={theme.colors.primary} /><Text style={styles.loadingText}>{t('foodListScreen.loadingFoods')}</Text></SafeAreaView> );
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
                    !isLoading ? (
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
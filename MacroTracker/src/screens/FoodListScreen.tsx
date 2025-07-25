// src/screens/FoodListScreen.tsx
import React, { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { View, FlatList, Alert, Platform, ActivityIndicator, StyleSheet, I18nManager, Share, LayoutAnimation, UIManager, TouchableOpacity } from "react-native";
import { createFood, getFoods, updateFood, deleteFood as deleteFoodService } from "../services/foodService";
import { Food, SharedFoodData } from "../types/food";
import { isNotEmpty } from "../utils/validationUtils";
import FoodItem from "../components/FoodItem";
import { SearchBar, useTheme, makeStyles, Text, Icon as RNEIcon, Overlay } from "@rneui/themed";
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

if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

if (typeof atob === 'undefined') {
  global.atob = (str: string): string => Buffer.from(str, 'base64').toString('binary');
}
if (typeof btoa === 'undefined') {
  global.btoa = (str: string): string => Buffer.from(str, 'binary').toString('base64');
}

interface FoodListScreenProps { onFoodChange?: () => void; }

type SortOptionValue = 'name' | 'newest' | 'oldest';

type FoodListScreenNavigationProp = BottomTabNavigationProp<MainTabParamList, 'FoodListRoute'>;
type FoodListScreenRouteProp = RouteProp<MainTabParamList, 'FoodListRoute'>;

const getBackendShareBaseUrl = (): string => {
    const envUrl = process.env.EXPO_PUBLIC_BACKEND_URL_PRODUCTION;
    const appJsonUrl = Constants.expoConfig?.extra?.env?.BACKEND_URL_PRODUCTION;
    let chosenUrl: string;

    if (envUrl) {
        chosenUrl = envUrl;
    } else if (appJsonUrl) {
        chosenUrl = appJsonUrl;
    } else {
        chosenUrl = "https://macros-vision-ai.xyz";
        console.warn(
            `Share Link WARNING: Production backend URL is not configured. Falling back to default: ${chosenUrl}.`
        );
    }
    return String(chosenUrl).replace(/\/api\/v1$/, '').replace(/\/$/, '');
};

const FoodListScreen: React.FC<FoodListScreenProps> = ({ onFoodChange }) => {
    const [masterFoods, setMasterFoods] = useState<Food[]>([]);
    const [foodIcons, setFoodIcons] = useState<{ [foodName: string]: string | null }>({});
    const [isLoading, setIsLoading] = useState(true);
    const [isOverlayVisible, setIsOverlayVisible] = useState(false);
    const [search, setSearch] = useState("");
    const [sortOption, setSortOption] = useState<SortOptionValue>('name');
    const [sortIndex, setSortIndex] = useState(0);
    const [newFood, setNewFood] = useState<Omit<Food, "id" | "createdAt">>({ name: "", calories: 0, protein: 0, carbs: 0, fat: 0, });
    const [editFood, setEditFood] = useState<Food | null>(null);
    const [errors, setErrors] = useState<{ [key: string]: string }>({});
    const [isSaving, setIsSaving] = useState(false);
    const [isSortMenuVisible, setIsSortMenuVisible] = useState(false);
    
    const { theme } = useTheme();
    const styles = useStyles();
    const deleteTimeoutRef = useRef<NodeJS.Timeout | null>(null);
    const sortButtonRef = useRef<TouchableOpacity>(null);
    const [sortButtonPosition, setSortButtonPosition] = useState({ x: 0, y: 0, width: 0, height: 0 });


    const route = useRoute<FoodListScreenRouteProp>();
    const navigation = useNavigation<FoodListScreenNavigationProp>();

    const sortOptions = useMemo<{label: string, value: SortOptionValue}[]>(() => [
        { label: t('foodListScreen.sortByName'), value: 'name' },
        { label: t('foodListScreen.sortByNewest'), value: 'newest' },
        { label: t('foodListScreen.sortByOldest'), value: 'oldest' },
    ], [t]);

    const handleSortChange = (index: number) => {
        if (isLoading || isSaving) return;
        setSortIndex(index);
        setSortOption(sortOptions[index].value);
        setIsSortMenuVisible(false);
    };
    
    const toggleSortMenu = () => {
        sortButtonRef.current?.measure((_fx, _fy, width, height, px, py) => {
            setSortButtonPosition({ x: px, y: py, width, height });
            setIsSortMenuVisible(!isSortMenuVisible);
        });
    };

    const triggerIconPrefetch = useCallback((foodsToFetch: Food[]) => {
        if (!foodsToFetch || foodsToFetch.length === 0) return;
        const iconsToResolve: { [key: string]: string | null } = {};
        foodsToFetch.forEach(food => {
            if (food.name && foodIcons[food.name] === undefined) {
                iconsToResolve[food.name] = getFoodIconUrl(food.name);
            }
        });
        if (Object.keys(iconsToResolve).length > 0) {
            setFoodIcons(prevIcons => ({ ...prevIcons, ...iconsToResolve }));
        }
    }, [foodIcons]);

    useFocusEffect(
      useCallback(() => {
        let isActive = true;
        const loadAllFoods = async () => {
          setIsLoading(true);
          try {
            const { items } = await getFoods();
            if (isActive) {
              setMasterFoods(items);
              triggerIconPrefetch(items);
            }
          } catch (error) {
            if (isActive) Alert.alert(t('foodListScreen.errorLoad'), t('foodListScreen.errorLoadMessage'));
          } finally {
            if (isActive) setIsLoading(false);
          }
        };
        loadAllFoods();
        return () => { isActive = false; };
      }, [triggerIconPrefetch, t])
    );

    const displayedFoods = useMemo(() => {
        let items = [...masterFoods];
        if (search.trim()) {
            const lowercasedSearchTerm = search.toLowerCase().trim();
            items = items.filter(food => food.name.toLowerCase().includes(lowercasedSearchTerm));
        }
        if (sortOption === 'name') {
            items.sort((a, b) => a.name.localeCompare(b.name));
        } else {
            const fallbackDate = '2020-01-01T00:00:00.000Z';
            items.sort((a, b) => {
                const dateA = new Date(a.createdAt || fallbackDate).getTime();
                const dateB = new Date(b.createdAt || fallbackDate).getTime();
                return sortOption === 'newest' ? dateB - dateA : dateA - dateB;
            });
        }
        return items;
    }, [masterFoods, search, sortOption]);

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

    useEffect(() => {
      const params = route.params;
      if (params) {
        if (params.openAddFoodModal && !isOverlayVisible) {
          toggleOverlay();
          navigation.setParams({ openAddFoodModal: undefined });
        }
        if (params.foodData && typeof params.foodData === 'string') {
          try {
            let b64 = params.foodData.replace(/-/g, '+').replace(/_/g, '/');
            const binaryString = atob(b64);
            const utf8Bytes = new Uint8Array(binaryString.length);
            for (let i = 0; i < binaryString.length; i++) utf8Bytes[i] = binaryString.charCodeAt(i);
            const decodedJson = new TextDecoder().decode(utf8Bytes);
            const sharedFood: SharedFoodData = JSON.parse(decodedJson);
            if (sharedFood && typeof sharedFood.name === 'string') {
              setNewFood({ ...sharedFood });
              setEditFood(null); setIsOverlayVisible(true);
            } else { Alert.alert(t('foodListScreen.deepLinkErrorTitle'), t('foodListScreen.deepLinkInvalidData')); }
          } catch (e) { Alert.alert(t('foodListScreen.deepLinkErrorTitle'), t('foodListScreen.deepLinkParseError'));
          } finally { navigation.setParams({ foodData: undefined }); }
        }
      }
    }, [route.params, isOverlayVisible, toggleOverlay, navigation, t]);

    const handleDeleteFood = (foodId: string) => {
        const foodToDelete = masterFoods.find(f => f.id === foodId);
        if (!foodToDelete) return;
        if (deleteTimeoutRef.current) clearTimeout(deleteTimeoutRef.current);
        
        LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
        setMasterFoods(prev => prev.filter(f => f.id !== foodId));

        deleteTimeoutRef.current = setTimeout(() => {
            deleteFoodService(foodId)
              .then(() => { onFoodChange?.(); console.log(`Permanently deleted ${foodId}`); })
              .catch(error => {
                  Alert.alert(t('foodListScreen.errorDelete'), t('foodListScreen.errorDeleteMessage'));
                  setMasterFoods(prev => [...prev, foodToDelete]);
              });
        }, 4000);

        Toast.show({
            type: 'info', text1: t('foodListScreen.foodDeleted', { foodName: foodToDelete.name }),
            text2: t('dailyEntryScreen.undo'), position: 'bottom', visibilityTime: 4000,
            onPress: () => handleUndoDelete(foodToDelete), bottomOffset: 80,
        });
    };

    const handleUndoDelete = (foodToRestore: Food) => {
        Toast.hide();
        if (deleteTimeoutRef.current) { clearTimeout(deleteTimeoutRef.current); deleteTimeoutRef.current = null; }
        
        LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
        setMasterFoods(prev => [...prev, foodToRestore]);
        Toast.show({
            type: 'success', text1: t('foodListScreen.foodRestored', { foodName: foodToRestore.name }),
            position: 'bottom', visibilityTime: 2000,
        });
    };
    
    const handleQuickAdd = useCallback((foodToQuickAdd: Food) => {
        navigation.navigate('DailyEntryRoute', { quickAddFood: foodToQuickAdd });
    }, [navigation]);

    const validateFood = (foodToValidate: Omit<Food, "id" | "createdAt"> | Food): { [key: string]: string } | null => {
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
        if (validateFood(trimmedFood)) { Toast.show({ type: 'error', text1: t('foodListScreen.fixErrors'), position: 'bottom' }); return; }
        setIsSaving(true);
        try {
            const created = await createFood(trimmedFood);
            LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
            setMasterFoods(prev => [...prev, created]);
            setIsOverlayVisible(false); onFoodChange?.();
            Toast.show({ type: 'success', text1: t('foodListScreen.foodAdded', { foodName: created.name }), position: 'bottom' });
            setNewFood({ name: "", calories: 0, protein: 0, carbs: 0, fat: 0 });
        } catch (error: any) { Alert.alert(t('foodListScreen.errorCreate'), error.message || t('foodListScreen.errorCreateMessage'));
        } finally { setIsSaving(false); }
    };

    const handleUpdateFood = async () => {
        if (!editFood) return;
        const trimmedFood = { ...editFood, name: editFood.name.trim() };
        if (validateFood(trimmedFood)) { Toast.show({ type: 'error', text1: t('foodListScreen.fixErrors'), position: 'bottom' }); return; }
        setIsSaving(true);
        try {
            const updated = await updateFood(trimmedFood);
            LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
            setMasterFoods(prev => prev.map(f => (f.id === updated.id ? updated : f)));
            setIsOverlayVisible(false); onFoodChange?.();
            Toast.show({ type: 'success', text1: t('foodListScreen.foodUpdated', { foodName: updated.name }), position: 'bottom' });
            setEditFood(null);
        } catch (error: any) { Alert.alert(t('foodListScreen.errorUpdate'), error.message || t('foodListScreen.errorUpdateMessage'));
        } finally { setIsSaving(false); }
    };
    
    const handleShareFood = useCallback(async (foodToShare: Food) => {
        const foodDataPayload: SharedFoodData = {
            name: foodToShare.name, calories: foodToShare.calories, protein: foodToShare.protein,
            carbs: foodToShare.carbs, fat: foodToShare.fat,
        };
        try {
            const jsonString = JSON.stringify(foodDataPayload);
            const utf8Bytes = new TextEncoder().encode(jsonString);
            let binaryString = '';
            utf8Bytes.forEach((byte) => { binaryString += String.fromCharCode(byte); });
            const base64Data = btoa(binaryString).replace(/\+/g, '-').replace(/\//g, '_');
            const backendBaseUrl = getBackendShareBaseUrl();
            const shareUrl = `${backendBaseUrl}/share/food?data=${base64Data}`;
            await Share.share({ message: shareUrl, title: t('foodListScreen.shareFoodTitle', {foodName: foodToShare.name}), });
        } catch (error) { Alert.alert(t('foodListScreen.shareErrorTitle'), t('foodListScreen.shareErrorMessage')); }
    }, [t]);

    const handleInputChange = (key: keyof Omit<Food, "id" | "createdAt">, value: string, isEdit: boolean) => {
        const numericKeys: (keyof Omit<Food, "id" | "createdAt">)[] = ['calories', 'protein', 'carbs', 'fat'];
        let processedValue: string | number = value;
        if (numericKeys.includes(key)) {
            if (value === "" || value === ".") { processedValue = value; }
            else { const cleaned = value.replace(/[^0-9.]/g, "").replace(/(\..*)\./g, "$1");
                   if (cleaned === "" || !isNaN(parseFloat(cleaned))) processedValue = cleaned; else return; }
        }
        const updateState = (prevState: any) => {
            let finalValue: string | number = numericKeys.includes(key) ? ((processedValue === "" || processedValue === ".") ? 0 : parseFloat(processedValue as string) || 0) : processedValue;
            return { ...prevState, [key]: finalValue };
        };
        if (isEdit) setEditFood(updateState); else setNewFood(updateState);
    };

    if (isLoading) {
        return (
            <SafeAreaView style={styles.centeredLoader} edges={['top', 'left', 'right']}>
                <ActivityIndicator size="large" color={theme.colors.primary} />
                <Text style={styles.loadingText}>{t('foodListScreen.loadingFoods')}</Text>
            </SafeAreaView>
        );
    }
    
    return (
        <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
            <SearchBar
                placeholder={t('foodListScreen.searchPlaceholder')}
                onChangeText={setSearch}
                value={search}
                platform="default"
                containerStyle={styles.searchBarContainer}
                inputContainerStyle={styles.searchBarInputContainer}
                inputStyle={styles.searchInputStyle}
                onClear={() => setSearch('')}
                lightTheme={theme.mode === 'light'}
                round
            />
            <View style={styles.controlsContainer}>
                <Text style={styles.resultsCount}>{`${displayedFoods.length} foods`}</Text>
                
                <TouchableOpacity ref={sortButtonRef} style={styles.sortButton} onPress={toggleSortMenu}>
                    <RNEIcon name="sort" type="material-community" size={18} color={theme.colors.primary} />
                    <Text style={styles.sortButtonText}>{sortOptions[sortIndex].label}</Text>
                </TouchableOpacity>

                <Overlay
                    isVisible={isSortMenuVisible}
                    onBackdropPress={toggleSortMenu}
                    overlayStyle={[styles.sortOverlay, { top: sortButtonPosition.y + sortButtonPosition.height, left: I18nManager.isRTL ? undefined : sortButtonPosition.x, right: I18nManager.isRTL ? (StyleSheet.absoluteFillObject.right || 0) + 15 : undefined }]}
                >
                    <View>
                        {sortOptions.map((option, index) => (
                            <TouchableOpacity key={option.value} style={styles.sortMenuItem} onPress={() => handleSortChange(index)}>
                                <Text style={styles.sortMenuText}>{option.label}</Text>
                                {sortIndex === index && <RNEIcon name="check" type="material-community" size={20} color={theme.colors.primary} />}
                            </TouchableOpacity>
                        ))}
                    </View>
                </Overlay>

            </View>
            <FlatList
                data={displayedFoods}
                keyExtractor={(item) => item.id}
                renderItem={({ item }) => (
                    <FoodItem
                        food={item}
                        onEdit={() => toggleOverlay(item)}
                        onDelete={handleDeleteFood}
                        onQuickAdd={handleQuickAdd}
                        onShare={handleShareFood}
                        foodIconUrl={foodIcons[item.name]}
                        setFoodIconForName={(name, icon) => setFoodIcons(prev => ({...prev, [name]: icon}))}
                    />
                )}
                ListEmptyComponent={
                    <View style={styles.emptyListContainer}>
                        <RNEIcon name="nutrition-outline" type="ionicon" size={50} color={theme.colors.grey3} />
                        <Text style={styles.emptyListText}>
                            {search.trim() ? t('foodListScreen.noResults', { searchTerm: search.trim() }) : t('foodListScreen.emptyLibrary')}
                        </Text>
                        {!search.trim() && <Text style={styles.emptyListSubText}>{t('foodListScreen.emptyLibraryHint')}</Text>}
                    </View>
                }
                contentContainerStyle={displayedFoods.length === 0 ? styles.listContentContainerEmpty : styles.listContentContainer}
                keyboardShouldPersistTaps="handled"
                extraData={{ foodIcons, masterFoodsLength: masterFoods.length }}
            />
            <FAB
                icon={<RNEIcon name="add" color={theme.colors.white} />}
                color={theme.colors.primary}
                onPress={() => !isSaving && toggleOverlay()}
                placement="right"
                size="large"
                style={styles.fab}
                disabled={isSaving}
            />
            {isOverlayVisible && <AddFoodModal
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
            />}
        </SafeAreaView>
    );
};

const useStyles = makeStyles((theme) => ({
    container: { flex: 1, backgroundColor: theme.colors.background, },
    centeredLoader: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: theme.colors.background, },
    loadingText: { marginTop: 15, color: theme.colors.grey1, fontSize: 16, },
    emptyListContainer: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 30, marginTop: 20, },
    emptyListText: { fontSize: 17, color: theme.colors.grey2, textAlign: 'center', marginTop: 15, },
    emptyListSubText: { fontSize: 14, color: theme.colors.grey3, textAlign: 'center', marginTop: 8, },
    searchBarContainer: {
        backgroundColor: 'transparent', borderBottomColor: 'transparent', borderTopColor: 'transparent',
        paddingHorizontal: 10, paddingTop: 8, paddingBottom: 5,
    },
    searchBarInputContainer: { backgroundColor: theme.colors.searchBg || theme.colors.grey5, },
    searchInputStyle: { color: theme.colors.text, fontSize: 15, textAlign: I18nManager.isRTL ? 'right' : 'left', },
    controlsContainer: {
        flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 15,
        paddingBottom: 12, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: theme.colors.divider,
    },
    resultsCount: { color: theme.colors.grey2, fontWeight: '600', fontSize: 14, },
    sortButton: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 6,
        paddingHorizontal: 12,
        borderRadius: 20,
        backgroundColor: theme.colors.grey5,
    },
    sortButtonText: {
        color: theme.colors.primary,
        fontWeight: 'bold',
        fontSize: 14,
        marginLeft: 6,
    },
    sortOverlay: {
        position: 'absolute',
        borderRadius: 8,
        padding: 0,
        backgroundColor: theme.colors.card,
        elevation: 5,
        shadowColor: theme.colors.black,
        shadowOpacity: 0.2,
        shadowRadius: 5,
        shadowOffset: { width: 0, height: 3 },
    },
    sortMenuItem: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingVertical: 12,
        paddingHorizontal: 16,
        borderBottomWidth: StyleSheet.hairlineWidth,
        borderBottomColor: theme.colors.divider,
    },
    sortMenuText: {
        color: theme.colors.text,
        fontSize: 16,
    },
    listContentContainer: { paddingBottom: 80, },
    listContentContainerEmpty: { flexGrow: 1, justifyContent: 'center', },
    fab: {
        position: 'absolute', margin: 16, right: I18nManager.isRTL ? undefined : 10,
        left: I18nManager.isRTL ? 10 : undefined, bottom: 10,
    },
}));

export default FoodListScreen;
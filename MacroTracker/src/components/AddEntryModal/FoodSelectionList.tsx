// src/components/AddEntryModal/FoodSelectionList.tsx
import React, { useMemo, useCallback, useRef, useEffect } from 'react';
import { View, FlatList, TouchableOpacity, Platform, Keyboard, StyleSheet, I18nManager } from 'react-native';
import { Text, ListItem, Icon, Button, SearchBar, CheckBox, useTheme, makeStyles } from '@rneui/themed';
import { Food } from '../../types/food';
import { RecentServings } from '../../services/storageService';
import { t } from '../../localization/i18n';
import { findFoodsByTagSearch } from '../../utils/searchUtils';
import { getFoodIconUrl } from '../../utils/iconUtils';

const DEFAULT_GRAMS_FOR_MULTI_ADD = 100;

interface FoodSelectionListProps {
    search: string;
    updateSearch: (search: string) => void;
    foods: Food[]; // Full library
    recentFoods: Food[];
    selectedFood: Food | null;
    handleSelectFood: (food: Food | null) => void;
    setGrams: (grams: string) => void;
    setSelectedMultipleFoods: React.Dispatch<React.SetStateAction<Map<string, { food: Food; grams: number }>>>;
    selectedMultipleFoods: Map<string, { food: Food; grams: number }>;
    handleToggleMultipleFoodSelection: (food: Food, displayGrams: number) => void;
    foodIcons: { [foodName: string]: string | null }; // No 'undefined'
    onAddNewFoodRequest: () => void;
    isActionDisabled: boolean;
    isEditMode: boolean;
    recentServings: RecentServings;
    modalMode: "normal" | "quickAddSelect";
}

type DisplayFoodItem = Food & { isRecent?: boolean };

const FoodSelectionList: React.FC<FoodSelectionListProps> = ({
    search,
    updateSearch,
    foods,
    recentFoods,
    selectedFood, 
    handleSelectFood,
    setGrams,
    setSelectedMultipleFoods,
    selectedMultipleFoods,
    handleToggleMultipleFoodSelection,
    foodIcons,
    onAddNewFoodRequest,
    isActionDisabled,
    isEditMode,
    recentServings,
    modalMode,
}) => {
    const { theme } = useTheme();
    const styles = useStyles();
    const flatListRef = useRef<FlatList<DisplayFoodItem>>(null);

    const filteredFoodsForSearch = useMemo(() => {
        const lowercasedSearchTerm = search.toLowerCase().trim();
        if (!lowercasedSearchTerm) return [];
    
        // 1. Primary search: by name
        const nameMatchedFoods = foods.filter((food) =>
            food.name.toLowerCase().includes(lowercasedSearchTerm)
        );
        const nameMatchIds = new Set(nameMatchedFoods.map(f => f.id));
    
        // 2. Secondary search: by tags, excluding items already found by name
        const tagMatchedFoods = findFoodsByTagSearch(lowercasedSearchTerm, foods);
        const tagMatchedFoodsOnly = tagMatchedFoods.filter(f => !nameMatchIds.has(f.id));
    
        // 3. Combine, with name matches first to ensure priority.
        return [...nameMatchedFoods, ...tagMatchedFoodsOnly];
    }, [foods, search]);

    const listDisplayData = useMemo((): DisplayFoodItem[] => {
        if (selectedFood) {
            const isSelRecent = recentFoods.some(rf => rf.id === selectedFood.id);
            return [{ ...selectedFood, isRecent: isSelRecent }];
        }

        if (search) {
            return filteredFoodsForSearch;
        }

        const tempCombinedList: DisplayFoodItem[] = [];
        const displayedIds = new Set<string>();

        recentFoods.forEach(rf => {
            if (!displayedIds.has(rf.id)) {
                tempCombinedList.push({ ...rf, isRecent: true });
                displayedIds.add(rf.id);
            }
        });

        const otherLibraryFoods = foods
            .filter(food => !displayedIds.has(food.id))
            .sort((a, b) => a.name.localeCompare(b.name))
            .slice(0, 10);

        otherLibraryFoods.forEach(olf => {
            tempCombinedList.push({ ...olf, isRecent: false });
        });

        return tempCombinedList;
    }, [search, recentFoods, foods, filteredFoodsForSearch, selectedFood]);

    useEffect(() => {
        if (selectedFood && flatListRef.current && listDisplayData.length > 0 && !search) {
            const index = listDisplayData.findIndex(item => item.id === selectedFood.id);
            if (index !== -1) {
                setTimeout(() => {
                    flatListRef.current?.scrollToIndex({ index, animated: true, viewPosition: 0.3 }); 
                }, 150);
            }
        }
    }, [selectedFood, listDisplayData, search]);

    const handleInternalSingleSelectFood = useCallback((item: Food | null) => {
        if (selectedMultipleFoods.size > 0 && item !== null && (!selectedFood || selectedFood.id !== item.id)) {
            Keyboard.dismiss();
            return; 
        }
        Keyboard.dismiss();
        if (selectedFood && item && selectedFood.id === item.id) {
            handleSelectFood(null);
            setGrams(""); 
            updateSearch(""); 
            setSelectedMultipleFoods(new Map()); 
        } else if (item === null) { 
            handleSelectFood(null);
            setGrams("");
        } else if (item !== null) { 
            handleSelectFood(item);
            updateSearch(""); 
            setSelectedMultipleFoods(new Map()); 
            if (!isEditMode) { 
                const lastPortion = recentServings[item.id]?.[0];
                if (lastPortion) {
                    setGrams(String(lastPortion));
                } else {
                    setGrams(String(DEFAULT_GRAMS_FOR_MULTI_ADD)); 
                }
            }
        }
    }, [
        handleSelectFood, 
        updateSearch, 
        selectedFood, 
        setGrams, 
        recentServings, 
        setSelectedMultipleFoods, 
        isEditMode,
        selectedMultipleFoods.size 
    ]);
    
    const handleSearchChange = (text: string) => {
        updateSearch(text);
        if (selectedFood && text.trim() !== "") { 
            handleInternalSingleSelectFood(null);
        }
    };

    const renderFoodItem = ({ item }: { item: DisplayFoodItem }) => {
        const foodItem = item;
        const isSingleSelectedViaState = selectedFood?.id === foodItem.id;
        const isMultiSelected = selectedMultipleFoods.has(foodItem.id);
        const iconIdentifier = getFoodIconUrl(foodItem.name);
        const displayGramsForMulti = recentServings[foodItem.id]?.[0] || DEFAULT_GRAMS_FOR_MULTI_ADD;

        const canShowCheckbox = modalMode === "normal" && !isEditMode && (selectedMultipleFoods.size > 0 || !selectedFood);
        const showSingleSelectCheckmark = isSingleSelectedViaState && selectedMultipleFoods.size === 0 && !search;

        return (
            <TouchableOpacity
                onPress={() => {
                    if (isActionDisabled) return;
                    if (selectedMultipleFoods.size > 0) {
                        handleToggleMultipleFoodSelection(foodItem, displayGramsForMulti);
                    } else {
                        handleInternalSingleSelectFood(foodItem);
                    }
                }}
                disabled={isActionDisabled}
                style={[isActionDisabled && styles.disabledOverlay]}
            >
                <View
                    style={[
                        styles.listItemContainer,
                        (showSingleSelectCheckmark || isMultiSelected) && styles.selectedListItem,
                    ]}
                >
                    <View style={styles.leftContent}>
                        {canShowCheckbox && (
                            <CheckBox
                                checked={isMultiSelected}
                                onPress={() => { 
                                    if (isActionDisabled) return;
                                    handleToggleMultipleFoodSelection(foodItem, displayGramsForMulti);
                                }}
                                containerStyle={styles.checkboxContainer}
                                size={22}
                                checkedColor={theme.colors.primary}
                                uncheckedColor={theme.colors.grey3}
                                disabled={isActionDisabled}
                            />
                        )}
                        
                        <View style={styles.iconWrapper}>
                            {iconIdentifier ? (
                                <Text style={styles.foodIconEmoji}>{iconIdentifier}</Text>
                            ) : (
                                <View style={styles.defaultIconContainer}>
                                    <Icon name="help-outline" type="material" size={20} color={theme.colors.grey3} />
                                </View>
                            )}
                        </View>

                        <View style={styles.textWrapper}>
                            <Text style={styles.listItemTitle} numberOfLines={1} ellipsizeMode="tail">
                                {foodItem.name}
                            </Text>
                            {canShowCheckbox && (
                                <Text style={styles.listItemSubtitle}>
                                    {t('addEntryModal.grams')}: {displayGramsForMulti}g
                                </Text>
                            )}
                        </View>
                    </View>

                    {showSingleSelectCheckmark && (
                        <Icon name="checkmark-circle" type="ionicon" color={theme.colors.primary} size={24} />
                    )}
                    
                    {foodItem.isRecent && !search && (!selectedFood || selectedFood.id !== foodItem.id) && (
                         <View style={styles.recentBadge}>
                             <Text style={styles.recentBadgeText}>{t('addEntryModal.recent')}</Text>
                         </View>
                    )}
                </View>
            </TouchableOpacity>
        );
    };

    const renderEmptyOrNoResults = () => {
        if (search && filteredFoodsForSearch.length === 0) {
            return (
                <View style={styles.noResultsContainer}>
                    <Text style={styles.noFoodsText}>
                        {t('addEntryModal.noResults', { searchTerm: search })}
                    </Text>
                    <Button
                        title={t('addEntryModal.addNewFoodButton')}
                        onPress={onAddNewFoodRequest}
                        type="outline"
                        buttonStyle={styles.addNewFoodButton}
                        titleStyle={styles.addNewFoodButtonTitle}
                        icon={<Icon name="add-circle-outline" type="ionicon" size={20} color={theme.colors.primary} />}
                        disabled={isActionDisabled}
                    />
                </View>
            );
        }
        if (!search && foods.length === 0 && recentFoods.length === 0) { 
             return (
                 <View style={styles.noResultsContainer}>
                     <Text style={styles.noFoodsText}>
                         {t('addEntryModal.emptyLibraryMessage')}
                     </Text>
                     <Button
                         title={t('addEntryModal.addNewFoodButton')}
                         onPress={onAddNewFoodRequest}
                         type="outline"
                         buttonStyle={styles.addNewFoodButton}
                         titleStyle={styles.addNewFoodButtonTitle}
                         icon={<Icon name="add-circle-outline" type="ionicon" size={20} color={theme.colors.primary} />}
                         disabled={isActionDisabled}
                     />
                 </View>
             );
        }
        return null;
    };

    return (
        <View style={styles.container}>
            <SearchBar
                placeholder={t('addEntryModal.searchPlaceholder')}
                onChangeText={handleSearchChange}
                value={search}
                platform="default"
                containerStyle={styles.searchBarContainer}
                inputContainerStyle={styles.searchBarInputContainer}
                inputStyle={styles.searchInputStyle}
                placeholderTextColor={theme.colors.grey3}
                onClear={() => updateSearch("")}
                disabled={isActionDisabled || modalMode !== "normal"}
                searchIcon={{ name: 'search', color: theme.colors.grey3 }}
                clearIcon={{ name: 'close', color: theme.colors.grey3 }}
            />
            <FlatList
                ref={flatListRef}
                data={listDisplayData}
                renderItem={renderFoodItem}
                keyExtractor={(item) => `food-sel-${item.id}`}
                ListEmptyComponent={renderEmptyOrNoResults}
                extraData={{ selectedFoodId: selectedFood?.id, selectedMultipleFoodsSize: selectedMultipleFoods.size, search, listLength: listDisplayData.length, recentServings }}
                keyboardShouldPersistTaps="handled"
                initialNumToRender={15}
                maxToRenderPerBatch={10}
                windowSize={21} 
                removeClippedSubviews={Platform.OS === 'android'}
                style={styles.flatListContainer}
                contentContainerStyle={styles.flatListContentContainer}
                getItemLayout={(data, index) => (
                    { length: 60, offset: 60 * index, index } 
                )}
            />
        </View>
    );
};

const useStyles = makeStyles((theme) => ({
    container: {
        flex: 1,
    },
    searchBarContainer: {
        backgroundColor: "transparent",
        borderBottomColor: "transparent",
        borderTopColor: "transparent",
        paddingHorizontal: 0,
        marginBottom: 10,
    },
    searchBarInputContainer: {
        backgroundColor: theme.colors.background,
        borderWidth: 1,
        borderColor: theme.colors.grey5,
        borderRadius: 12,
        height: 44,
        borderBottomWidth: 1, // Ensure all sides have border
    },
    searchInputStyle: {
        color: theme.colors.text,
        fontSize: 16,
        textAlign: I18nManager.isRTL ? 'right' : 'left',
    },
    flatListContainer: {
        flex: 1,
        minHeight: 150,
    },
    flatListContentContainer: {
        paddingBottom: 20,
    },
    listItemContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingVertical: 10,
        paddingHorizontal: 8,
        borderBottomWidth: StyleSheet.hairlineWidth,
        borderBottomColor: theme.colors.divider,
        minHeight: 60,
    },
    selectedListItem: { 
        backgroundColor: theme.colors.primaryLight,
        borderRadius: 8,
        borderBottomColor: 'transparent',
    },
    leftContent: {
        flexDirection: 'row',
        alignItems: 'center',
        flex: 1,
    },
    checkboxContainer: { 
        padding: 0, 
        margin: 0, 
        marginRight: 10,
        marginLeft: 0, 
        backgroundColor: 'transparent',
        borderWidth: 0,
        minWidth: 24,
    },
    iconWrapper: {
        width: 32,
        height: 32,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 12,
    },
    foodIconEmoji: {
        fontSize: 24,
        textAlign: 'center',
    },
    defaultIconContainer: {
        width: 32,
        height: 32,
        borderRadius: 16,
        backgroundColor: theme.colors.grey5,
        alignItems: "center",
        justifyContent: "center",
    },
    textWrapper: {
        flex: 1,
        justifyContent: 'center',
    },
    listItemTitle: {
        color: theme.colors.text,
        fontSize: 16,
        fontWeight: "500",
        textAlign: 'left',
    },
    listItemSubtitle: {
        color: theme.colors.secondary,
        fontSize: 12,
        textAlign: 'left',
        marginTop: 2,
    },
    recentBadge: {
        paddingHorizontal: 6,
        paddingVertical: 2,
        borderRadius: 4,
        backgroundColor: theme.colors.grey5,
    },
    recentBadgeText: {
        fontSize: 10,
        color: theme.colors.secondary,
        fontWeight: 'bold',
        textTransform: 'uppercase'
    },
    disabledOverlay: {
        opacity: 0.6,
    },
    noResultsContainer: {
        alignItems: 'center',
        paddingVertical: 40,
        paddingHorizontal: 20,
        justifyContent: 'center',
    },
    noFoodsText: {
        color: theme.colors.grey2,
        fontStyle: "italic",
        textAlign: "center",
        marginBottom: 15,
        fontSize: 15,
    },
    addNewFoodButton: {
        marginTop: 10,
        borderColor: theme.colors.primary,
        paddingHorizontal: 20,
        paddingVertical: 10,
        borderWidth: 1,
        borderRadius: 20,
    },
    addNewFoodButtonTitle: {
        color: theme.colors.primary,
        fontWeight: '600',
    },
}));

export default FoodSelectionList;
// src/components/AddEntryModal/FoodSelectionList.tsx
import React, { useMemo, useCallback, useRef, useEffect } from 'react';
import { View, FlatList, TouchableOpacity, Image, ActivityIndicator, Platform, Keyboard, StyleSheet } from 'react-native';
import { Text, ListItem, Icon, Button, SearchBar, CheckBox, useTheme, makeStyles } from '@rneui/themed';
import { Food } from '../../types/food';
import { LastUsedPortions } from '../../services/storageService';
import { t } from '../../localization/i18n';

const DEFAULT_GRAMS_FOR_MULTI_ADD = 100;

interface FoodSelectionListProps {
    search: string;
    updateSearch: (search: string) => void;
    foods: Food[]; // Full library
    recentFoods: Food[];
    selectedFood: Food | null; // This is internalSelectedFood from AddEntryModal
    handleSelectFood: (food: Food | null) => void;
    setGrams: (grams: string) => void;
    setSelectedMultipleFoods: React.Dispatch<React.SetStateAction<Map<string, { food: Food; grams: number }>>>;
    selectedMultipleFoods: Map<string, { food: Food; grams: number }>;
    handleToggleMultipleFoodSelection: (food: Food, displayGrams: number) => void;
    foodIcons: { [foodName: string]: string | null | undefined };
    onAddNewFoodRequest: () => void;
    isActionDisabled: boolean;
    isEditMode: boolean; // Editing a DailyEntryItem, not AddFoodModal's editFood
    lastUsedPortions: LastUsedPortions;
    modalMode: "normal" | "quickAddSelect";
}

type DisplayFoodItem = Food & { isRecent?: boolean };

const FoodSelectionList: React.FC<FoodSelectionListProps> = ({
    search,
    updateSearch,
    foods,
    recentFoods,
    selectedFood, // This is internalSelectedFood from AddEntryModal
    handleSelectFood,
    setGrams,
    setSelectedMultipleFoods,
    selectedMultipleFoods,
    handleToggleMultipleFoodSelection,
    foodIcons,
    onAddNewFoodRequest,
    isActionDisabled,
    isEditMode,
    lastUsedPortions,
    modalMode,
}) => {
    const { theme } = useTheme();
    const styles = useStyles();
    const flatListRef = useRef<FlatList<DisplayFoodItem>>(null);

    const filteredFoodsForSearch = useMemo(() => {
        if (!search) return [];
        const searchTerm = search.toLowerCase();
        return foods.filter((food) =>
            food.name.toLowerCase().includes(searchTerm)
        );
    }, [foods, search]);

    const listDisplayData = useMemo((): DisplayFoodItem[] => {
        if (search) {
            return filteredFoodsForSearch;
        }

        const tempCombinedList: DisplayFoodItem[] = [];
        const displayedIds = new Set<string>();

        // 1. If selectedFood is provided (pre-selected), ensure it's at the top.
        if (selectedFood) {
            const isSelRecent = recentFoods.some(rf => rf.id === selectedFood.id);
            tempCombinedList.push({ ...selectedFood, isRecent: isSelRecent });
            displayedIds.add(selectedFood.id);
        }

        // 2. Add recent foods not already added.
        recentFoods.forEach(rf => {
            if (!displayedIds.has(rf.id)) {
                tempCombinedList.push({ ...rf, isRecent: true });
                displayedIds.add(rf.id);
            }
        });
        
        // 3. Add other foods from the main library, not already added, sorted, and limited.
        const otherLibraryFoods = foods
            .filter(food => !displayedIds.has(food.id))
            .sort((a, b) => a.name.localeCompare(b.name))
            .slice(0, 10); // Limit the number of general library items shown when no search

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


    const handleInternalSelectFood = useCallback((item: Food | null) => {
        Keyboard.dismiss();
        // Check if the clicked item is the currently selected item
        if (selectedFood && item && selectedFood.id === item.id) {
            // Item clicked is the currently selected item, so deselect it
            handleSelectFood(null);
            setGrams(""); // Clear grams when deselecting
            updateSearch(""); // Clear search as well
            setSelectedMultipleFoods(new Map()); // Ensure multi-select is cleared
        } else {
            // New item selected or selection is being cleared by passing null (e.g. from search change)
            handleSelectFood(item);
            updateSearch(""); // Clear search on new selection
            setSelectedMultipleFoods(new Map()); // Clear any multi-selections

            if (item) { // If a new food is selected (item is not null)
                 if (!isEditMode) { // Only auto-fill grams if not editing a daily entry item
                    const lastPortion = lastUsedPortions[item.id];
                    if (lastPortion) {
                        setGrams(String(lastPortion));
                    } else {
                        setGrams(""); // Clear grams if no last portion for the new item
                    }
                }
                // If isEditMode is true (editing a daily log item), AddEntryModal's useEffect handles initialGrams.
                // We should not overwrite it here with last used portions.
            } else {
                // If item is null (selection explicitly cleared, e.g. by starting a search), ensure grams are cleared
                setGrams("");
            }
        }
    }, [handleSelectFood, updateSearch, selectedFood, setGrams, lastUsedPortions, setSelectedMultipleFoods, isEditMode]);
    
    const handleSearchChange = (text: string) => {
        updateSearch(text);
        if (selectedFood && text.trim() !== "") { 
            handleSelectFood(null); // Clear single selection if user starts typing
            setGrams("");
            // setSelectedMultipleFoods(new Map()); // Keep multi-select if user is searching
        }
    };

    const renderFoodItem = ({ item }: { item: DisplayFoodItem }) => {
        const foodItem = item;
        const isSingleSelected = selectedFood?.id === foodItem.id && !search; 
        const iconStatus = foodIcons[foodItem.name];
        const displayGramsForMulti = lastUsedPortions[foodItem.id] || DEFAULT_GRAMS_FOR_MULTI_ADD;
        const isMultiSelected = selectedMultipleFoods.has(foodItem.id);
        const canMultiSelect = modalMode === "normal" && !isEditMode && !selectedFood;

        return (
            <TouchableOpacity
                onPress={() => !isActionDisabled && handleInternalSelectFood(foodItem)}
                disabled={isActionDisabled}
                style={[isActionDisabled && styles.disabledOverlay]}
            >
                <ListItem
                    bottomDivider
                    containerStyle={[
                        styles.listItemContainer,
                        isSingleSelected && styles.selectedListItem,
                        isMultiSelected && canMultiSelect && styles.multiSelectedListItem,
                    ]}
                >
                    {!isEditMode && !selectedFood && (
                        <CheckBox
                            checked={isMultiSelected}
                            onPress={() => handleToggleMultipleFoodSelection(foodItem, displayGramsForMulti)}
                            containerStyle={styles.multiSelectCheckbox}
                            size={22}
                            disabled={!canMultiSelect || isActionDisabled}
                        />
                    )}
                    {iconStatus === undefined ? (
                        <ActivityIndicator size="small" color={theme.colors.grey3} style={styles.foodIcon} />
                    ) : iconStatus ? (
                        <Image source={{ uri: iconStatus }} style={styles.foodIcon} resizeMode="contain" />
                    ) : (
                        <View style={styles.defaultIconContainer}>
                            <Icon name="restaurant" type="material" size={18} color={theme.colors.grey3} />
                        </View>
                    )}
                    <ListItem.Content>
                        <ListItem.Title style={styles.listItemTitle} numberOfLines={1} ellipsizeMode="tail">
                            {foodItem.name}
                        </ListItem.Title>
                        {!selectedFood && !isEditMode && (
                            <ListItem.Subtitle style={styles.listItemSubtitleSecondary}>
                                {t('addEntryModal.grams')}: {displayGramsForMulti}g
                            </ListItem.Subtitle>
                        )}
                        {foodItem.isRecent && !search && (!selectedFood || selectedFood.id !== foodItem.id) && (
                             <Text style={styles.recentBadge}>{t('addEntryModal.recent')}</Text>
                        )}
                    </ListItem.Content>
                    {isSingleSelected && (<Icon name="checkmark-circle" type="ionicon" color={theme.colors.primary} size={24} />)}
                </ListItem>
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
        <View>
            <SearchBar
                placeholder={t('addEntryModal.searchPlaceholder')}
                onChangeText={handleSearchChange}
                value={search}
                platform={Platform.OS === "ios" ? "ios" : "android"}
                containerStyle={styles.searchBarContainer}
                inputContainerStyle={styles.searchBarInputContainer}
                inputStyle={styles.searchInputStyle}
                onCancel={() => { updateSearch(""); Keyboard.dismiss();}}
                showCancel={Platform.OS === "ios"}
                onClear={() => updateSearch("")}
                disabled={isActionDisabled || modalMode !== "normal"}
            />
            <FlatList
                ref={flatListRef}
                data={listDisplayData}
                renderItem={renderFoodItem}
                keyExtractor={(item) => `food-sel-${item.id}`}
                ListEmptyComponent={renderEmptyOrNoResults}
                extraData={{ selectedFoodId: selectedFood?.id, foodIcons, selectedMultipleFoodsSize: selectedMultipleFoods.size, search, listLength: listDisplayData.length }}
                keyboardShouldPersistTaps="handled"
                initialNumToRender={15}
                maxToRenderPerBatch={10}
                windowSize={21} 
                removeClippedSubviews={Platform.OS === 'android'}
                style={styles.flatListContainer}
                contentContainerStyle={styles.flatListContentContainer}
                getItemLayout={(data, index) => (
                    { length: 65, offset: 65 * index, index } 
                )}
            />
        </View>
    );
};

const useStyles = makeStyles((theme) => ({
    searchBarContainer: {
        backgroundColor: "transparent",
        borderBottomColor: "transparent",
        borderTopColor: "transparent",
        paddingHorizontal: 0,
        marginBottom: 10,
    },
    searchBarInputContainer: {
        borderRadius: 25,
        backgroundColor: theme.colors.searchBg || theme.colors.grey5,
        height: 40,
    },
    searchInputStyle: {
        color: theme.colors.text,
        fontSize: 15,
        textAlign: 'left',
    },
    flatListContainer: {
        maxHeight: 250, 
        minHeight: 150,
    },
    flatListContentContainer: {
        paddingBottom: 10,
    },
    foodIcon: {
        width: 35,
        height: 35,
        marginRight: 10,
        borderRadius: 17.5,
        backgroundColor: theme.colors.grey5,
        alignItems: "center",
        justifyContent: "center",
    },
    defaultIconContainer: {
        width: 35,
        height: 35,
        marginRight: 10,
        borderRadius: 17.5,
        backgroundColor: theme.colors.grey5,
        alignItems: "center",
        justifyContent: "center",
    },
    listItemContainer: {
        backgroundColor: "transparent",
        paddingVertical: 8,
        paddingHorizontal: 5,
        borderBottomColor: theme.colors.divider,
        minHeight: 65,
    },
    selectedListItem: {
        backgroundColor: theme.colors.grey5,
        borderRadius: 8,
    },
    multiSelectedListItem: {
        backgroundColor: theme.colors.successLight,
        borderRadius: 8,
        borderLeftWidth: 3,
        borderLeftColor: theme.colors.success,
    },
    multiSelectCheckbox: {
        padding: 0,
        margin: 0,
        marginRight: 10,
        backgroundColor: 'transparent',
        borderWidth: 0,
    },
    listItemTitle: {
        color: theme.colors.text,
        fontSize: 16,
        fontWeight: "500",
        textAlign: 'left',
        flexShrink: 1,
    },
    listItemSubtitleSecondary: {
        color: theme.colors.secondary,
        fontSize: 12,
        textAlign: 'left',
        marginTop: 2,
    },
    recentBadge: {
        position: 'absolute',
        top: -2,
        right: 0,
        fontSize: 10,
        color: theme.colors.primary,
        backgroundColor: theme.colors.grey5,
        paddingHorizontal: 4,
        paddingVertical: 1,
        borderRadius: 4,
        fontWeight: 'bold',
        textTransform: 'uppercase'
    },
    disabledOverlay: {
        opacity: 0.6,
    },
    noResultsContainer: {
        alignItems: 'center',
        paddingVertical: 20,
        paddingHorizontal: 10,
        minHeight: 150, 
        justifyContent: 'center',
    },
    noFoodsText: {
        color: theme.colors.grey2,
        fontStyle: "italic",
        textAlign: "center",
        marginBottom: 15,
    },
    addNewFoodButton: {
        marginTop: 10,
        borderColor: theme.colors.primary,
        paddingHorizontal: 20,
        borderRadius: 20,
    },
    addNewFoodButtonTitle: {
        color: theme.colors.primary,
        fontWeight: '600',
    },
}));

export default FoodSelectionList;
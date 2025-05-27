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
    handleToggleMultipleFoodSelection: (food: Food, displayGrams: number) => void; // This comes from AddEntryModal
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
    selectedFood, 
    handleSelectFood,
    setGrams,
    setSelectedMultipleFoods,
    selectedMultipleFoods,
    handleToggleMultipleFoodSelection, // Prop from AddEntryModal
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
        if (selectedFood) {
            const isSelRecent = recentFoods.some(rf => rf.id === selectedFood.id);
            tempCombinedList.push({ ...selectedFood, isRecent: isSelRecent });
            displayedIds.add(selectedFood.id);
        }
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
                const lastPortion = lastUsedPortions[item.id];
                if (lastPortion) {
                    setGrams(String(lastPortion));
                } else {
                    setGrams(""); 
                }
            }
        }
    }, [
        handleSelectFood, 
        updateSearch, 
        selectedFood, 
        setGrams, 
        lastUsedPortions, 
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
        const iconStatus = foodIcons[foodItem.name];
        const displayGramsForMulti = lastUsedPortions[foodItem.id] || DEFAULT_GRAMS_FOR_MULTI_ADD;

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
                <ListItem
                    bottomDivider
                    containerStyle={[
                        styles.listItemContainer,
                        (showSingleSelectCheckmark || isMultiSelected) && styles.selectedListItem,
                        isMultiSelected && styles.multiSelectedListItemBorder,
                    ]}
                >
                    {canShowCheckbox && (
                        <CheckBox
                            checked={isMultiSelected}
                            onPress={() => { 
                                if (isActionDisabled) return;
                                handleToggleMultipleFoodSelection(foodItem, displayGramsForMulti);
                            }}
                            containerStyle={styles.multiSelectCheckboxContainer}
                            size={22}
                            disabled={isActionDisabled}
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
                        {canShowCheckbox && (
                            <ListItem.Subtitle style={styles.listItemSubtitleSecondary}>
                                {t('addEntryModal.grams')}: {displayGramsForMulti}g
                            </ListItem.Subtitle>
                        )}
                        {foodItem.isRecent && !search && (!selectedFood || selectedFood.id !== foodItem.id) && (
                             <Text style={styles.recentBadge}>{t('addEntryModal.recent')}</Text>
                        )}
                    </ListItem.Content>
                    {showSingleSelectCheckmark && (<Icon name="checkmark-circle" type="ionicon" color={theme.colors.primary} size={24} />)}
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
    multiSelectedListItemBorder: { 
        borderLeftWidth: 3, 
        borderLeftColor: theme.colors.success, 
    },
    multiSelectCheckboxContainer: { 
        padding: 10, 
        marginRight: 0, 
        marginLeft: -10, 
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
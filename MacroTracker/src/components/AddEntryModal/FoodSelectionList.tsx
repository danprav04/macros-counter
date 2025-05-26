// src/components/AddEntryModal/FoodSelectionList.tsx
import React, { useMemo, useCallback } from 'react';
import { View, FlatList, TouchableOpacity, Image, ActivityIndicator, Platform, Keyboard } from 'react-native';
import { Text, ListItem, Icon, Button, SearchBar, CheckBox, useTheme, makeStyles } from '@rneui/themed';
import { Food } from '../../types/food';
import { LastUsedPortions } from '../../services/storageService';
import { t } from '../../localization/i18n';

const DEFAULT_GRAMS_FOR_MULTI_ADD = 100;
const MAX_RECENT_FOODS_TO_DISPLAY_WITH_ALL = 3;

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
    foodIcons: { [foodName: string]: string | null | undefined };
    onAddNewFoodRequest: () => void;
    isActionDisabled: boolean;
    isEditMode: boolean;
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
        // No search term: combine recent and library foods
        let combinedList: DisplayFoodItem[] = recentFoods.map(f => ({...f, isRecent: true}));
        const recentFoodIds = new Set(recentFoods.map(f => f.id));

        if (recentFoods.length < MAX_RECENT_FOODS_TO_DISPLAY_WITH_ALL && foods.length > 0) {
            const otherFoodsFromLibrary = foods
                .filter(food => !recentFoodIds.has(food.id))
                .sort((a, b) => a.name.localeCompare(b.name));
            combinedList = [...combinedList, ...otherFoodsFromLibrary.map(f => ({...f, isRecent: false}))];
        } else if (recentFoods.length >= MAX_RECENT_FOODS_TO_DISPLAY_WITH_ALL && foods.length > 0 && recentFoods.length !== foods.length) {
             // If many recents, only show recents unless search is active or library is very small
             // This behavior might need adjustment based on UX preference
        }
        return combinedList;
    }, [search, recentFoods, foods, filteredFoodsForSearch]);


    const handleInternalSelectFood = useCallback((item: Food | null) => {
        handleSelectFood(item);
        updateSearch(""); // Clear search when a food is selected for single entry
        Keyboard.dismiss();
        setSelectedMultipleFoods(new Map()); // Clear multi-selection when entering single food mode

        if (!isEditMode && item?.id !== selectedFood?.id) {
            const lastPortion = item?.id ? lastUsedPortions[item.id] : undefined;
            if (lastPortion) {
                setGrams(String(lastPortion));
            } else {
                setGrams("");
            }
        }
    }, [handleSelectFood, updateSearch, isEditMode, selectedFood, setGrams, lastUsedPortions, setSelectedMultipleFoods]);
    
    const handleSearchChange = (text: string) => {
        updateSearch(text);
        if (selectedFood) {
            handleSelectFood(null);
            setGrams("");
            setSelectedMultipleFoods(new Map());
        }
    };

    const renderFoodItem = ({ item }: { item: DisplayFoodItem }) => {
        const foodItem = item;
        const isSingleSelected = selectedFood?.id === foodItem.id;
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
                        {foodItem.isRecent && !search && <Text style={styles.recentBadge}>{t('addEntryModal.recent')}</Text>}
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
        if (!search && foods.length === 0 && recentFoods.length === 0) { // Check both foods and recentFoods
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
                onCancel={() => handleSearchChange("")}
                showCancel={Platform.OS === "ios"}
                onClear={() => handleSearchChange("")}
                disabled={isActionDisabled || modalMode !== "normal"}
            />
            <FlatList
                data={listDisplayData}
                renderItem={renderFoodItem}
                keyExtractor={(item) => `food-${item.id}`}
                ListEmptyComponent={renderEmptyOrNoResults}
                extraData={{ selectedFoodId: selectedFood?.id, foodIcons, selectedMultipleFoodsSize: selectedMultipleFoods.size, search }}
                keyboardShouldPersistTaps="handled"
                initialNumToRender={10}
                maxToRenderPerBatch={10}
                windowSize={11}
                removeClippedSubviews={Platform.OS === 'android'}
                style={styles.flatListContainer}
                contentContainerStyle={styles.flatListContentContainer}
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
        // Max height or flex grow might be needed depending on parent layout
        maxHeight: 250, // Example, adjust as needed
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
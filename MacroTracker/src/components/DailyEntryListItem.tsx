import React, { useState, useEffect, useCallback, memo } from 'react';
import { View, Image, ActivityIndicator, StyleSheet } from 'react-native';
import { ListItem, Button, Icon as RNEIcon, useTheme, makeStyles } from '@rneui/themed';
import { DailyEntryItem } from '../types/dailyEntry';

interface DailyEntryListItemProps {
    item: DailyEntryItem;
    reversedIndex: number; // Index in the reversed list for removal/edit identification
    foodIcons: { [foodName: string]: string | null | undefined };
    setFoodIcons: React.Dispatch<React.SetStateAction<{ [foodName: string]: string | null | undefined }>>;
    onEdit: (item: DailyEntryItem, reversedIndex: number) => void;
    onRemove: (reversedIndex: number) => void;
    isSaving: boolean;
}

const DailyEntryListItem = memo<DailyEntryListItemProps>(({
    item,
    reversedIndex,
    foodIcons,
    setFoodIcons, // Needed to update cache on image error
    onEdit,
    onRemove,
    isSaving,
}) => {
    const { theme } = useTheme();
    const styles = useStyles();
    const [iconLoadError, setIconLoadError] = useState(false);

    const iconStatus = item?.food?.name ? foodIcons[item.food.name] : undefined;
    const isLoadingIcon = iconStatus === undefined;

    const handleImageError = useCallback(() => {
        console.warn(`Image component failed to load icon for ${item.food.name}: ${iconStatus}`);
        setIconLoadError(true);
        // Explicitly update state in cache to null if Image fails
        if (item?.food?.name && foodIcons[item.food.name] !== null) {
            setFoodIcons(prev => ({ ...prev, [item.food.name]: null }));
        }
    }, [item.food.name, iconStatus, foodIcons, setFoodIcons]); // Added dependencies

    // Reset error state if the URL changes (e.g., during refresh)
    useEffect(() => {
        setIconLoadError(false);
    }, [iconStatus]);

    const renderListItemIcon = () => {
        if (!item?.food) {
             return ( // Placeholder if food data is somehow missing
                 <View style={[styles.foodIcon, styles.iconPlaceholder]}>
                     <RNEIcon name="help-circle-outline" type="ionicon" size={20} color={theme.colors.grey3} />
                 </View>
             );
        }
        if (isLoadingIcon) {
            // Consistent Loading Placeholder
            return (
                <View style={[styles.foodIcon, styles.iconPlaceholder]}>
                    <ActivityIndicator size="small" color={theme.colors.grey3} />
                </View>
            );
        } else if (iconStatus && !iconLoadError) {
            // Display Image
            return <Image source={{ uri: iconStatus }} style={styles.foodIconImage} onError={handleImageError} resizeMode="contain" />;
        } else {
            // Consistent Default/Error Placeholder
            return (
                <View style={[styles.foodIcon, styles.iconPlaceholder]}>
                    <RNEIcon
                        name="fast-food-outline" // Default icon consistent with FoodListScreen
                        type="ionicon"
                        size={20}
                        color={theme.colors.grey3}
                    />
                </View>
            );
        }
    };

    // Safe rendering check
     if (!item || !item.food) {
         console.warn("DailyEntryListItem: Attempted to render with invalid item:", item);
         // Optionally render a placeholder or null
         return (
             <ListItem containerStyle={styles.listItemContainer}>
                 <ListItem.Content>
                      <ListItem.Title style={{color: theme.colors.error}}>Invalid Entry Data</ListItem.Title>
                 </ListItem.Content>
             </ListItem>
         );
     }

    const handleEditPress = () => {
        if (!isSaving) {
            onEdit(item, reversedIndex);
        }
    };

    const handleDeletePress = () => {
        if (!isSaving) {
            onRemove(reversedIndex);
        }
    };

    return (
        <ListItem.Swipeable
            bottomDivider
            leftContent={(reset) => (
                <Button
                    title="Edit"
                    onPress={() => { handleEditPress(); reset(); }}
                    icon={{ name: "edit", color: theme.colors.white }}
                    buttonStyle={styles.swipeButtonEdit}
                    titleStyle={styles.swipeButtonTitle}
                    disabled={isSaving}
                />
            )}
            rightContent={(reset) => (
                <Button
                    title="Delete"
                    onPress={() => { handleDeletePress(); reset(); }}
                    icon={{ name: "delete", color: theme.colors.white }}
                    buttonStyle={styles.swipeButtonDelete}
                    titleStyle={styles.swipeButtonTitle}
                    disabled={isSaving}
                />
            )}
            containerStyle={styles.listItemContainer}
        >
            {renderListItemIcon()}

            <ListItem.Content>
                <ListItem.Title style={styles.listItemTitle}>
                    {item.food.name}
                </ListItem.Title>
                {/* Display Grams and Calculated Calories */}
                <ListItem.Subtitle style={styles.listItemSubtitle}>
                    {`${item.grams}g • ${Math.round((item.food.calories / 100) * item.grams)} kcal`}
                </ListItem.Subtitle>
            </ListItem.Content>
            {/* Chevron indicates interactibility (swipe) */}
            <ListItem.Chevron color={theme.colors.grey3} />
        </ListItem.Swipeable>
    );
});

const useStyles = makeStyles((theme) => ({
    // Consistent Icon Styles (Adopted from FoodItem/FoodListScreen)
    foodIcon: { // Container style for placeholder/loading icon
        width: 40,
        height: 40,
        marginRight: 15, // Consistent spacing
        borderRadius: 8, // Consistent shape
        alignItems: 'center',
        justifyContent: 'center',
    },
    foodIconImage: { // Specific style for the Image component itself
        width: 40,
        height: 40,
        marginRight: 15,
        borderRadius: 8, // Consistent shape
    },
    iconPlaceholder: {
        backgroundColor: theme.colors.grey5, // Consistent placeholder background
    },
    // Consistent List Item Styles
    listItemContainer: {
        backgroundColor: theme.colors.background,
        paddingVertical: 12,
        paddingHorizontal: 15,
        borderBottomColor: theme.colors.divider,
    },
    listItemTitle: {
        color: theme.colors.text,
        fontWeight: "600", // Slightly bolder than default
        fontSize: 16,
        marginBottom: 3, // Space between title and subtitle
    },
    listItemSubtitle: {
        color: theme.colors.secondary,
        fontSize: 14,
    },
    // Consistent Swipe Button Styles
    swipeButtonEdit: {
        minHeight: "100%",
        backgroundColor: theme.colors.warning, // Use theme color
        justifyContent: 'center', // Center content vertically
        alignItems: 'center', // Center content horizontally
    },
    swipeButtonDelete: {
        minHeight: "100%",
        backgroundColor: theme.colors.error, // Use theme color
        justifyContent: 'center', // Center content vertically
        alignItems: 'center', // Center content horizontally
    },
    swipeButtonTitle: {
        color: theme.colors.white,
        fontWeight: 'bold',
        fontSize: 15,
    },
}));

export default DailyEntryListItem;
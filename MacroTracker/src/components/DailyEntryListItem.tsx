// src/components/DailyEntryListItem.tsx
import React, { useState, useEffect, useCallback, memo, useMemo } from 'react';
import { View, StyleSheet } from 'react-native';
import { ListItem, Button, Icon as RNEIcon, useTheme, makeStyles, Text } from '@rneui/themed';
import { DailyEntryItem } from '../types/dailyEntry';
import { t } from '../localization/i18n';
import { calculateDailyEntryGrade, FoodGradeResult } from '../utils/gradingUtils';
import { Settings } from '../types/settings';
import { getFoodIconUrl } from '../utils/iconUtils'; // Import local icon utility
import i18n from '../localization/i18n';


interface DailyEntryListItemProps {
    item: DailyEntryItem;
    reversedIndex: number;
    foodIcons: { [foodName: string]: string | null }; // Changed: no 'undefined' for loading
    setFoodIcons: React.Dispatch<React.SetStateAction<{ [foodName: string]: string | null }>>;
    onEdit: (item: DailyEntryItem, reversedIndex: number) => void;
    onRemove: (reversedIndex: number) => void;
    isSaving: boolean;
    dailyGoals: Settings['dailyGoals'];
}

const DailyEntryListItem = memo<DailyEntryListItemProps>(({
    item,
    reversedIndex,
    foodIcons,
    setFoodIcons,
    onEdit,
    onRemove,
    isSaving,
    dailyGoals,
}) => {
    const { theme } = useTheme();
    const styles = useStyles();

    const iconIdentifier = useMemo(() => {
        if (item?.food?.name) {
            if (foodIcons[item.food.name] !== undefined) {
                return foodIcons[item.food.name];
            }
            // Icon not yet in state, resolve it
            return getFoodIconUrl(item.food.name, i18n.locale);
        }
        return null;
    }, [item.food?.name, foodIcons, i18n.locale]);

    // Update foodIcons state if a new icon was resolved
    useEffect(() => {
        if (item?.food?.name && iconIdentifier !== undefined && foodIcons[item.food.name] === undefined) {
            setFoodIcons(prev => ({ ...prev, [item.food.name]: iconIdentifier }));
        }
    }, [item.food?.name, iconIdentifier, foodIcons, setFoodIcons]);


    const gradeResult: FoodGradeResult | null = useMemo(() => {
        if (!item || !item.food || !dailyGoals) return null;
        return calculateDailyEntryGrade(item.food, item.grams, dailyGoals);
    }, [item, dailyGoals]);


    const renderListItemIcon = () => {
        if (!item?.food) {
             return (
                 <View style={[styles.foodIcon, styles.iconPlaceholder]}>
                     <RNEIcon name="help-circle-outline" type="ionicon" size={20} color={theme.colors.grey3} />
                 </View>
             );
        }
        if (iconIdentifier) { // iconIdentifier is now string (emoji) or null
            return <Text style={styles.foodIconEmoji}>{iconIdentifier}</Text>;
        } else {
            // Fallback if no icon found (e.g., default or placeholder)
            return (
                <View style={[styles.foodIcon, styles.iconPlaceholder]}>
                    <RNEIcon name="fast-food-outline" type="ionicon" size={20} color={theme.colors.grey3} />
                </View>
            );
        }
    };

     if (!item || !item.food) {
         return (
             <ListItem containerStyle={styles.listItemContainer}>
                 <ListItem.Content>
                      <ListItem.Title style={[{color: theme.colors.error}, styles.textLeft]}>{t('dailyEntryScreen.invalidEntryData')}</ListItem.Title>
                 </ListItem.Content>
             </ListItem>
         );
     }

    const handleEditPress = () => { if (!isSaving) onEdit(item, reversedIndex); };
    const handleDeletePress = () => { if (!isSaving) onRemove(reversedIndex); };

    const calculatedCalories = Math.round((item.food.calories / 100) * item.grams);
    const calculatedProtein = Math.round((item.food.protein / 100) * item.grams);
    const calculatedCarbs = Math.round((item.food.carbs / 100) * item.grams);
    const calculatedFat = Math.round((item.food.fat / 100) * item.grams);

    return (
        <ListItem.Swipeable
            bottomDivider
            leftContent={(reset) => (
                <Button
                    title={t('dailyEntryScreen.edit')}
                    onPress={() => { handleEditPress(); reset(); }}
                    icon={{ name: "edit", color: theme.colors.white }}
                    buttonStyle={styles.swipeButtonEdit}
                    titleStyle={styles.swipeButtonTitle}
                    disabled={isSaving}
                />
            )}
            rightContent={(reset) => (
                <Button
                    title={t('dailyEntryScreen.delete')}
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
                <View style={styles.titleContainer}>
                    {gradeResult && (
                        <Text style={[styles.gradePill, { backgroundColor: gradeResult.color }]}>
                            {gradeResult.letter}
                        </Text>
                    )}
                    <ListItem.Title style={styles.listItemTitle}>
                        {item.food.name}
                    </ListItem.Title>
                </View>
                <ListItem.Subtitle style={styles.listItemSubtitle}>
                    {`${item.grams}g • Cal: ${calculatedCalories} P: ${calculatedProtein} C: ${calculatedCarbs} F: ${calculatedFat}`}
                </ListItem.Subtitle>
            </ListItem.Content>
            <ListItem.Chevron color={theme.colors.grey3} />
        </ListItem.Swipeable>
    );
});

const useStyles = makeStyles((theme) => ({
    foodIcon: { width: 40, height: 40, marginRight: 15, borderRadius: 8, alignItems: 'center', justifyContent: 'center', },
    foodIconEmoji: {
        fontSize: 28, // Adjust size for emoji
        width: 40,
        height: 40,
        marginRight: 15,
        textAlign: 'center',
        textAlignVertical: 'center',
    },
    iconPlaceholder: { backgroundColor: theme.colors.grey5, },
    listItemContainer: { backgroundColor: theme.colors.background, paddingVertical: 12, paddingHorizontal: 15, borderBottomColor: theme.colors.divider, },
    titleContainer: { flexDirection: 'row', alignItems: 'center', marginBottom: 3, },
    gradePill: {
        fontSize: 12,
        fontWeight: 'bold',
        color: theme.colors.white,
        paddingHorizontal: 6,
        paddingVertical: 2,
        borderRadius: 8,
        marginRight: 8,
        minWidth: 20,
        textAlign: 'center',
        overflow: 'hidden',
    },
    listItemTitle: {
        color: theme.colors.text,
        fontWeight: "600",
        fontSize: 16,
        flexShrink: 1,
        textAlign: 'left',
    },
    listItemSubtitle: { color: theme.colors.secondary, fontSize: 14, textAlign: 'left', },
    swipeButtonEdit: { minHeight: "100%", backgroundColor: theme.colors.warning, justifyContent: 'center', alignItems: 'center', },
    swipeButtonDelete: { minHeight: "100%", backgroundColor: theme.colors.error, justifyContent: 'center', alignItems: 'center', },
    swipeButtonTitle: { color: theme.colors.white, fontWeight: 'bold', fontSize: 15, },
    textLeft: { textAlign: 'left'},
}));

export default DailyEntryListItem;
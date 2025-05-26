// src/components/FoodItem.tsx
import React, { forwardRef, useState, useCallback, memo, useMemo } from "react";
import { StyleSheet, View, Image, ActivityIndicator, TouchableOpacity } from "react-native";
import { ListItem, Icon as RNEIcon, useTheme, Button, makeStyles, Text } from "@rneui/themed";
import { Food } from "../types/food";
import Toast from "react-native-toast-message";
import { t } from '../localization/i18n';
import { calculateBaseFoodGrade, FoodGradeResult } from "../utils/gradingUtils";

interface FoodItemProps {
  food: Food;
  onEdit: (food: Food) => void;
  onDelete: (foodId: string) => void;
  onUndoDelete: (food: Food) => void;
  onQuickAdd: (food: Food) => void;
  onShare: (food: Food) => void;
  foodIconUrl: string | null | undefined;
}

const FoodItem = memo(forwardRef<any, FoodItemProps>(
  ({ food, onEdit, onDelete, onUndoDelete, onQuickAdd, onShare, foodIconUrl }, ref) => {
    const { theme } = useTheme();
    const styles = useStyles();
    const [iconLoadError, setIconLoadError] = useState(false);

    const gradeResult: FoodGradeResult | null = useMemo(() => {
        return calculateBaseFoodGrade(food);
    }, [food]);

    const handleUndo = useCallback(() => {
         onUndoDelete(food);
    }, [food, onUndoDelete]);

    const handleDelete = useCallback(() => {
      onDelete(food.id);
       Toast.show({
            type: 'info',
            text1: t('foodListScreen.foodDeleted', { foodName: food.name }),
            text2: t('dailyEntryScreen.undo'), 
            position: 'bottom',
            visibilityTime: 4000,
            onPress: handleUndo,
            bottomOffset: 80,
        });
    }, [food.id, food.name, onDelete, handleUndo]);

    const handleImageError = useCallback(() => {
        setIconLoadError(true);
    }, []); 

    React.useEffect(() => {
        setIconLoadError(false); 
    }, [foodIconUrl]);

    const renderIcon = () => {
        const isLoadingIcon = foodIconUrl === undefined;
        if (isLoadingIcon) {
            return ( <View style={[styles.foodIcon, styles.iconPlaceholder]}><ActivityIndicator size="small" color={theme.colors.grey3} /></View> );
        } else if (foodIconUrl && !iconLoadError) {
             return ( <Image source={{ uri: foodIconUrl }} style={styles.foodIconImage} onError={handleImageError} resizeMode="contain" /> );
        } else {
            return ( <View style={[styles.foodIcon, styles.iconPlaceholder]}><RNEIcon name="fast-food-outline" type="ionicon" size={20} color={theme.colors.grey3} /></View> );
        }
    };

    return (
      <ListItem.Swipeable
        ref={ref}
        bottomDivider
        leftContent={(reset) => (
          <Button title={t('foodListScreen.edit')} onPress={() => { onEdit(food); reset(); }} icon={{ name: "edit", color: theme.colors.white }} buttonStyle={styles.swipeButtonEdit} titleStyle={styles.swipeButtonTitle} />
        )}
        rightContent={(reset) => ( // Share button removed from here
          <Button title={t('foodListScreen.delete')} onPress={() => { handleDelete(); reset(); }} icon={{ name: "delete", color: theme.colors.white }} buttonStyle={styles.swipeButtonDelete} titleStyle={styles.swipeButtonTitle} />
        )}
        containerStyle={styles.listItemContainer}
      >
        {renderIcon()}
        <ListItem.Content>
          <View style={styles.titleContainer}>
            {gradeResult && (
                <Text style={[styles.gradePill, { backgroundColor: gradeResult.color }]}>
                    {gradeResult.letter}
                </Text>
            )}
            <ListItem.Title style={styles.title} numberOfLines={1} ellipsizeMode="tail">
                {food.name}
            </ListItem.Title>
          </View>
          <ListItem.Subtitle style={styles.subtitle}>
            {`100g: Cal: ${Math.round(food.calories)} P: ${Math.round(food.protein)} C: ${Math.round(food.carbs)} F: ${Math.round(food.fat)}`}
          </ListItem.Subtitle>
        </ListItem.Content>
        <TouchableOpacity onPress={() => onShare(food)} style={styles.actionButton} hitSlop={{ top: 10, bottom: 10, left: 5, right: 5 }}>
            <RNEIcon name="share-variant-outline" type="material-community" color={theme.colors.primary} size={24} />
        </TouchableOpacity>
        <TouchableOpacity onPress={() => onQuickAdd(food)} style={styles.actionButton} hitSlop={{ top: 10, bottom: 10, left: 5, right: 5 }}>
            <RNEIcon name="add-circle-outline" type="ionicon" color={theme.colors.primary} size={26} />
        </TouchableOpacity>
        <ListItem.Chevron color={theme.colors.grey3} />
      </ListItem.Swipeable>
    );
  }
));

const useStyles = makeStyles((theme) => ({
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
    title: { color: theme.colors.text, fontWeight: "600", fontSize: 16, flexShrink: 1, textAlign: 'left', }, 
    subtitle: { color: theme.colors.secondary, fontSize: 13, marginTop: 2, textAlign: 'left', },
    swipeButtonEdit: { minHeight: "100%", backgroundColor: theme.colors.warning, justifyContent: 'center', alignItems: 'center', },
    swipeButtonDelete: { minHeight: "100%", backgroundColor: theme.colors.error, justifyContent: 'center', alignItems: 'center', },
    swipeButtonTitle: { color: theme.colors.white, fontWeight: 'bold', fontSize: 15, },
    foodIcon: { width: 40, height: 40, marginRight: 15, borderRadius: 8, alignItems: 'center', justifyContent: 'center', },
    foodIconImage: { width: 40, height: 40, marginRight: 15, borderRadius: 8, },
    iconPlaceholder: { backgroundColor: theme.colors.grey5, },
    actionButton: { // Unified style for quick add and share
        paddingHorizontal: 8,
        justifyContent: 'center',
        alignItems: 'center',
        marginLeft: 5, // Add some space between icons
    },
}));

export default FoodItem;
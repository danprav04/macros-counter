// src/components/FoodItem.tsx
// src/components/FoodItem.tsx
import React, { forwardRef, useState, useCallback, memo } from "react";
import { StyleSheet, View, Image, ActivityIndicator } from "react-native";
import { ListItem, Icon as RNEIcon, useTheme, Button, makeStyles, Text } from "@rneui/themed";
import { Food } from "../types/food";
import Toast from "react-native-toast-message";
import { t } from '../localization/i18n';

interface FoodItemProps {
  food: Food;
  onEdit: (food: Food) => void;
  onDelete: (foodId: string) => void;
  onUndoDelete: (food: Food) => void;
  foodIconUrl: string | null | undefined;
}

const FoodItem = memo(forwardRef<any, FoodItemProps>(
  ({ food, onEdit, onDelete, onUndoDelete, foodIconUrl }, ref) => {
    const { theme } = useTheme();
    const styles = useStyles();
    const [iconLoadError, setIconLoadError] = useState(false);

    const handleUndo = useCallback(() => {
         onUndoDelete(food);
    }, [food, onUndoDelete]);

    const handleDelete = useCallback(() => {
      onDelete(food.id);
       Toast.show({
            type: 'info',
            text1: t('foodListScreen.foodDeleted', { foodName: food.name }),
            text2: t('dailyEntryScreen.undo'), // Re-use "Tap here to undo"
            position: 'bottom',
            visibilityTime: 4000,
            onPress: handleUndo,
            bottomOffset: 80,
        });
    }, [food.id, food.name, onDelete, handleUndo]);

    const handleImageError = useCallback(() => {
        setIconLoadError(true);
    }, [food.name, foodIconUrl]);

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
        rightContent={(reset) => (
          <Button title={t('foodListScreen.delete')} onPress={() => { handleDelete(); reset(); }} icon={{ name: "delete", color: theme.colors.white }} buttonStyle={styles.swipeButtonDelete} titleStyle={styles.swipeButtonTitle} />
        )}
        containerStyle={styles.listItemContainer}
      >
        {renderIcon()}
        <ListItem.Content>
          <ListItem.Title style={styles.title}>
            {food.name}
          </ListItem.Title>
          <ListItem.Subtitle style={styles.subtitle}>
            {`100g: Cal: ${Math.round(food.calories)} P: ${Math.round(food.protein)} C: ${Math.round(food.carbs)} F: ${Math.round(food.fat)}`}
          </ListItem.Subtitle>
        </ListItem.Content>
        <ListItem.Chevron color={theme.colors.grey3} />
      </ListItem.Swipeable>
    );
  }
));

const useStyles = makeStyles((theme) => ({
    listItemContainer: { backgroundColor: theme.colors.background, paddingVertical: 12, paddingHorizontal: 15, borderBottomColor: theme.colors.divider, },
    title: { color: theme.colors.text, fontWeight: "600", fontSize: 16, marginBottom: 3, textAlign: 'left', },
    subtitle: { color: theme.colors.secondary, fontSize: 13, marginTop: 2, textAlign: 'left', },
    swipeButtonEdit: { minHeight: "100%", backgroundColor: theme.colors.warning, justifyContent: 'center', alignItems: 'center', },
    swipeButtonDelete: { minHeight: "100%", backgroundColor: theme.colors.error, justifyContent: 'center', alignItems: 'center', },
    swipeButtonTitle: { color: theme.colors.white, fontWeight: 'bold', fontSize: 15, },
   foodIcon: { width: 40, height: 40, marginRight: 15, borderRadius: 8, alignItems: 'center', justifyContent: 'center', },
   foodIconImage: { width: 40, height: 40, marginRight: 15, borderRadius: 8, },
   iconPlaceholder: { backgroundColor: theme.colors.grey5, }
}));

export default FoodItem;
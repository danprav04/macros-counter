// src/components/FoodItem.tsx
import React, { forwardRef, useState, useCallback, memo } from "react";
import { StyleSheet, View, Image, ActivityIndicator } from "react-native"; // Added ActivityIndicator
import { ListItem, Icon as RNEIcon, useTheme, Button, makeStyles, Text } from "@rneui/themed";
import { Food } from "../types/food";
import Toast from "react-native-toast-message";

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

    // --- Declare handleUndo FIRST ---
    const handleUndo = useCallback(() => {
         onUndoDelete(food); // Parent handles actual restoration
    }, [food, onUndoDelete]);

    // --- Declare handleDelete SECOND, now it can safely use handleUndo ---
    const handleDelete = useCallback(() => {
      onDelete(food.id); // Parent handles logic and initial toast
       Toast.show({ // Show UNDO toast here for consistency
            type: 'info',
            text1: `${food.name} deleted`,
            text2: 'Tap here to undo',
            position: 'bottom',
            visibilityTime: 4000,
            onPress: handleUndo, // Call local undo handler declared above
            bottomOffset: 80,
        });
    }, [food.id, food.name, onDelete, handleUndo]); // Dependency array is now valid

    const handleImageError = useCallback(() => {
        console.warn(`Failed to load image for ${food.name} from URL: ${foodIconUrl}`);
        setIconLoadError(true);
    }, [food.name, foodIconUrl]);

    // Reset error state if the URL changes
    React.useEffect(() => {
        setIconLoadError(false);
    }, [foodIconUrl]);

    const renderIcon = () => {
        const isLoadingIcon = foodIconUrl === undefined;
        if (isLoadingIcon) {
            return (
                <View style={[styles.foodIcon, styles.iconPlaceholder]}>
                    <ActivityIndicator size="small" color={theme.colors.grey3} />
                </View>
            );
        } else if (foodIconUrl && !iconLoadError) {
             return (
                <Image
                    source={{ uri: foodIconUrl }}
                    style={styles.foodIconImage}
                    onError={handleImageError}
                    resizeMode="contain"
                />
            );
        } else {
            return (
                <View style={[styles.foodIcon, styles.iconPlaceholder]}>
                    <RNEIcon
                        name="fast-food-outline" // Consistent placeholder
                        type="ionicon"
                        size={20}
                        color={theme.colors.grey3}
                    />
                </View>
            );
        }
    };

    return (
      <ListItem.Swipeable
        ref={ref}
        bottomDivider
        leftContent={(reset) => (
          <Button
            title="Edit"
            onPress={() => {
              onEdit(food);
              reset();
            }}
            icon={{ name: "edit", color: theme.colors.white }}
            buttonStyle={styles.swipeButtonEdit} // Consistent style
            titleStyle={styles.swipeButtonTitle}
          />
        )}
        rightContent={(reset) => (
          <Button
            title="Delete"
            onPress={() => {
                handleDelete(); // Use local handler to show toast
                reset();
            }}
            icon={{ name: "delete", color: theme.colors.white }}
            buttonStyle={styles.swipeButtonDelete} // Consistent style
            titleStyle={styles.swipeButtonTitle}
          />
        )}
        containerStyle={styles.listItemContainer} // Consistent container style
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
         {/* Chevron indicates interactibility (swipe) */}
        <ListItem.Chevron color={theme.colors.grey3} />
      </ListItem.Swipeable>
    );
  }
));

// Consistent Styles matching DailyEntryScreen where applicable
const useStyles = makeStyles((theme) => ({
    listItemContainer: {
        backgroundColor: theme.colors.background, // Use theme background
        paddingVertical: 12,
        paddingHorizontal: 15,
        borderBottomColor: theme.colors.divider, // Use theme divider
    },
    title: {
        color: theme.colors.text, // Use theme text color
        fontWeight: "600",
        fontSize: 16,
        marginBottom: 3,
    },
    subtitle: {
        color: theme.colors.secondary, // Use theme grey
        fontSize: 13, // Slightly smaller subtitle
        marginTop: 2,
    },
    swipeButtonEdit: {
        minHeight: "100%",
        backgroundColor: theme.colors.warning, // Theme color
        justifyContent: 'center',
        alignItems: 'flex-start',
        paddingLeft: 20,
    },
    swipeButtonDelete: {
        minHeight: "100%",
        backgroundColor: theme.colors.error, // Theme color
        justifyContent: 'center',
        alignItems: 'flex-end',
        paddingRight: 20,
    },
    swipeButtonTitle: {
        color: theme.colors.white, // White text on colored buttons
        fontWeight: 'bold',
        fontSize: 15,
    },
   // Consistent Icon styles
   foodIcon: {
       width: 40,
       height: 40,
       marginRight: 15,
       borderRadius: 8, // Slightly rounded square
       alignItems: 'center',
       justifyContent: 'center',
   },
   foodIconImage: {
       width: 40,
       height: 40,
       marginRight: 15,
       borderRadius: 8,
   },
   iconPlaceholder: {
      backgroundColor: theme.colors.grey5, // Consistent placeholder background
   }
}));

export default FoodItem;
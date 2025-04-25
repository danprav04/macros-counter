// FoodItem.tsx (Corrected - Theme used inside component)
import React, { forwardRef, useState, useCallback, useMemo } from "react"; // Import useMemo
import { StyleSheet, View, Image } from "react-native";
import { ListItem, Icon, useTheme, Button, Text } from "@rneui/themed";
import { Food } from "../types/food";
import Toast from "react-native-toast-message";

interface FoodItemProps {
  food: Food;
  onEdit: (food: Food) => void;
  onDelete: (foodId: string) => void;
  onUndoDelete: (food: Food) => void;
  foodIconUrl: string | null | undefined;
}

const FoodItem = forwardRef<any, FoodItemProps>(
  ({ food, onEdit, onDelete, onUndoDelete, foodIconUrl }, ref) => {
    // --- Theme hook is called inside the component ---
    const { theme } = useTheme();
    const [iconLoadError, setIconLoadError] = useState(false);

    const handleDelete = useCallback(() => {
      onDelete(food.id);
      Toast.show({
        type: "info",
        text1: `${food.name} deleted`,
        text2: "Tap here to undo",
        position: "bottom",
        bottomOffset: 80,
        onPress: () => onUndoDelete(food),
        visibilityTime: 4000,
      });
    }, [food, onDelete, onUndoDelete]);

    const handleImageError = useCallback(() => {
        console.warn(`Failed to load image for ${food.name} from URL: ${foodIconUrl}`);
        setIconLoadError(true);
    }, [food.name, foodIconUrl]);

    React.useEffect(() => {
        setIconLoadError(false);
    }, [foodIconUrl]);

    // --- Define theme-dependent styles inside the component ---
    // useMemo prevents recreating these style objects on every render unless theme changes
    const dynamicStyles = useMemo(() => ({
        swipeButtonEdit: {
            backgroundColor: theme.colors.warning,
        },
        swipeButtonDelete: {
            backgroundColor: theme.colors.error,
        },
        iconPlaceholder: {
            backgroundColor: theme.colors.grey5,
        },
        listItemContainer: {
           backgroundColor: theme.colors.background,
        },
        title: {
           color: theme.colors.text,
        },
        subtitle: {
           color: theme.colors.grey1,
        }
    }), [theme]); // Recalculate only if theme changes

    const renderIcon = () => {
        if (foodIconUrl === undefined) {
             return (
                <View style={[styles.foodIcon, styles.iconPlaceholderBase, dynamicStyles.iconPlaceholder]}>
                    <Icon name="hourglass-outline" type="ionicon" size={18} color={theme.colors.grey3} />
                </View>
             );
        } else if (foodIconUrl && !iconLoadError) {
             return (
                <Image
                    source={{ uri: foodIconUrl }}
                    style={styles.foodIcon}
                    onError={handleImageError}
                    resizeMode="contain"
                />
            );
        } else {
            return (
                <View style={[styles.foodIcon, styles.iconPlaceholderBase, dynamicStyles.iconPlaceholder]}>
                    <Icon
                        name="fast-food-outline"
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
            // Apply static and dynamic styles
            buttonStyle={[styles.swipeButtonBase, styles.swipeButtonEditBase, dynamicStyles.swipeButtonEdit]}
          />
        )}
        rightContent={(reset) => (
          <Button
            title="Delete"
            onPress={() => {
                handleDelete();
                reset();
            }}
            icon={{ name: "delete", color: theme.colors.white }}
            // Apply static and dynamic styles
            buttonStyle={[styles.swipeButtonBase, styles.swipeButtonDeleteBase, dynamicStyles.swipeButtonDelete]}
          />
        )}
        // Apply static and dynamic styles
        containerStyle={[
          styles.listItemContainerBase,
          dynamicStyles.listItemContainer
        ]}
      >
        {renderIcon()}

        <ListItem.Content>
          {/* Apply static and dynamic styles */}
          <ListItem.Title style={[styles.titleBase, dynamicStyles.title]}>
            {food.name}
          </ListItem.Title>
           {/* Apply static and dynamic styles */}
          <ListItem.Subtitle style={[styles.subtitleBase, dynamicStyles.subtitle]}>
            {`Cal: ${Math.round(food.calories)} P: ${Math.round(food.protein)}g C: ${Math.round(food.carbs)}g F: ${Math.round(food.fat)}g (per 100g)`}
          </ListItem.Subtitle>
        </ListItem.Content>
        {/* <ListItem.Chevron color={theme.colors.grey2}/> */}
      </ListItem.Swipeable>
    );
  }
);

// --- StyleSheet now only contains static styles ---
const styles = StyleSheet.create({
  listItemContainerBase: { // Renamed to Base
    paddingVertical: 12,
    paddingHorizontal: 15,
    borderRadius: 0,
    marginVertical: 0,
  },
  titleBase: { // Renamed to Base
    fontWeight: "600",
    fontSize: 16,
    marginBottom: 2,
  },
  subtitleBase: { // Added Base styles for subtitle
    fontSize: 13,
    marginTop: 3,
  },
  swipeButtonBase: { // Added Base styles for buttons
     minHeight: "100%",
     justifyContent: 'center',
  },
  swipeButtonEditBase: { // Renamed to Base
    alignItems: 'flex-start',
    paddingLeft: 20,
  },
  swipeButtonDeleteBase: { // Renamed to Base
    alignItems: 'flex-end',
    paddingRight: 20,
  },
  foodIcon: {
    width: 40,
    height: 40,
    marginRight: 12,
    borderRadius: 8,
  },
   iconPlaceholderBase: { // Renamed to Base
      alignItems: 'center',
      justifyContent: 'center',
   }
});

export default FoodItem;
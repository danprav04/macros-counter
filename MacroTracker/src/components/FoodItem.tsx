// FoodItem.tsx (Corrected with forwardRef and Enhanced Icon Handling)
import React, { forwardRef, useState, useCallback, memo } from "react"; // Import forwardRef, useState, useCallback, memo
import { StyleSheet, View, Image } from "react-native"; // Import View and Image
import { ListItem, Icon, useTheme, Button, makeStyles, Text } from "@rneui/themed"; // Added makeStyles, Text
import { Food } from "../types/food";
import Toast from "react-native-toast-message";

interface FoodItemProps {
  food: Food;
  onEdit: (food: Food) => void;
  onDelete: (foodId: string) => void;
  onUndoDelete: (food: Food) => void;
  foodIconUrl: string | null | undefined; // Accept undefined for loading state
}

// Use forwardRef to receive the ref from the parent
// Use memo to prevent unnecessary re-renders if props haven't changed
const FoodItem = memo(forwardRef<any, FoodItemProps>(
  ({ food, onEdit, onDelete, onUndoDelete, foodIconUrl }, ref) => {
    const { theme } = useTheme();
    const styles = useStyles(); // Use makeStyles hook
    const [iconLoadError, setIconLoadError] = useState(false); // State to track image load errors

    const handleDelete = useCallback(() => {
      // The parent (FoodListScreen) handles the actual deletion and Toast
      onDelete(food.id);
      // Toast is shown in the parent component after delete confirmation/logic
    }, [food.id, onDelete]); // Depend only on what's needed for the callback itself

    const handleUndo = useCallback(() => {
         // The parent handles the undo logic and Toast confirmation
         onUndoDelete(food);
    }, [food, onUndoDelete]);


    const handleImageError = useCallback(() => {
        console.warn(`Failed to load image for ${food.name} from URL: ${foodIconUrl}`);
        setIconLoadError(true);
    }, [food.name, foodIconUrl]);

    // Reset error state if the URL changes (e.g., during refresh)
    React.useEffect(() => {
        setIconLoadError(false);
    }, [foodIconUrl]);

    const renderIcon = () => {
        // Explicitly handle undefined (loading), null (no icon), or error state
        if (foodIconUrl === undefined) {
            // Still loading the URL itself
             return (
                <View style={[styles.foodIcon, styles.iconPlaceholder]}>
                    <Icon name="hourglass-outline" type="ionicon" size={18} color={theme.colors.grey3} />
                </View>
             );
        } else if (foodIconUrl && !iconLoadError) {
            // URL exists and no loading error occurred yet
             return (
                <Image
                    source={{ uri: foodIconUrl }}
                    style={styles.foodIconImage} // Use specific style for image
                    onError={handleImageError} // Use callback for error
                    resizeMode="contain" // Ensure image fits well
                />
            );
        } else {
             // URL is null, empty, or an error occurred loading the image
            return (
                <View style={[styles.foodIcon, styles.iconPlaceholder]}>
                    <Icon
                        name="fast-food-outline" // Default placeholder icon
                        type="ionicon"
                        size={20} // Slightly larger placeholder icon
                        color={theme.colors.grey3}
                    />
                </View>
            );
        }
    };

    return (
      // Attach the received ref to ListItem.Swipeable
      <ListItem.Swipeable
        ref={ref} // Pass the forwarded ref here!
        bottomDivider
        leftContent={(reset) => (
          <Button
            title="Edit"
            onPress={() => {
              onEdit(food);
              reset();
            }}
            icon={{ name: "edit", color: theme.colors.white }}
            buttonStyle={styles.swipeButtonEdit}
            titleStyle={styles.swipeButtonTitle}
          />
        )}
        rightContent={(reset) => (
          <Button
            title="Delete"
            onPress={() => { // Wrap handleDelete in another function to call reset
                handleDelete(); // Call the memoized delete handler
                reset();
            }}
            icon={{ name: "delete", color: theme.colors.white }}
            buttonStyle={styles.swipeButtonDelete}
            titleStyle={styles.swipeButtonTitle}
          />
        )}
        containerStyle={[
          styles.listItemContainer,
          { backgroundColor: theme.colors.background },
        ]}
      >
        {/* Render the icon based on state */}
        {renderIcon()}

        <ListItem.Content>
          <ListItem.Title style={[styles.title, { color: theme.colors.text }]}>
            {food.name}
          </ListItem.Title>
          <ListItem.Subtitle style={{ color: theme.colors.grey1, fontSize: 13, marginTop: 3 }}>
            {`Cal: ${Math.round(food.calories)} P: ${Math.round(food.protein)}g C: ${Math.round(food.carbs)}g F: ${Math.round(food.fat)}g (per 100g)`}
          </ListItem.Subtitle>
        </ListItem.Content>
        {/* Optional: Chevron can indicate drill-down, but swipe provides actions */}
        {/* <ListItem.Chevron color={theme.colors.grey2}/> */}
      </ListItem.Swipeable>
    );
  }
)); // Close memo wrapper

const useStyles = makeStyles((theme) => ({ // Define styles using makeStyles
  listItemContainer: {
    paddingVertical: 12,
    paddingHorizontal: 15,
    borderRadius: 0,
    marginVertical: 0,
    borderBottomColor: theme.colors.divider, // Ensure bottom divider color matches theme
  },
  title: {
    fontWeight: "600",
    fontSize: 16,
    marginBottom: 2,
  },
  swipeButtonEdit: {
    minHeight: "100%",
    backgroundColor: theme.colors.warning,
    justifyContent: 'center',
    alignItems: 'flex-start',
    paddingLeft: 20,
  },
  swipeButtonDelete: {
    minHeight: "100%",
    backgroundColor: theme.colors.error,
    justifyContent: 'center',
    alignItems: 'flex-end',
    paddingRight: 20,
  },
  swipeButtonTitle: {
    color: theme.colors.white,
    fontWeight: 'bold',
    fontSize: 15,
  },
   foodIcon: { // Container style for placeholder/loading icon
       width: 40,
       height: 40,
       marginRight: 12,
       borderRadius: 8,
       alignItems: 'center',
       justifyContent: 'center',
   },
   foodIconImage: { // Specific style for the Image component itself
       width: 40,
       height: 40,
       marginRight: 12,
       borderRadius: 8,
   },
   iconPlaceholder: {
      backgroundColor: theme.colors.grey5, // Background for placeholder/loading
   }
})); // Close useStyles definition

export default FoodItem;
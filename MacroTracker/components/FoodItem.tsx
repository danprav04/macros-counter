// FoodItem.tsx
import React, { useRef } from 'react'; // Import useRef
import { StyleSheet } from 'react-native';
import { ListItem, Icon, useTheme, Button } from '@rneui/themed';
import { Food } from '../types/food';
import Toast from 'react-native-toast-message';

interface FoodItemProps {
  food: Food;
  onEdit: (food: Food) => void;
  onDelete: (foodId: string) => void;
  onUndoDelete: (food: Food) => void; // Add undo prop
}

const FoodItem: React.FC<FoodItemProps> = ({ food, onEdit, onDelete, onUndoDelete }) => {
  const { theme } = useTheme();
  const swipeableRef = useRef<any>(null); // Ref for swipeable

  const handleDelete = () => {
      onDelete(food.id);
       swipeableRef.current?.close(); // Close after delete
      Toast.show({
          type: 'success',
          text1: `${food.name} deleted`,
          text2: 'Tap to undo',
          position: 'bottom',
          bottomOffset: 80,
          onPress: () => onUndoDelete(food), // Call undo function
          visibilityTime: 3000, // Show for 3 seconds
        });
  };

  return (
    <ListItem.Swipeable
      ref={swipeableRef} // Attach ref
      bottomDivider
      leftContent={(reset) => (
        <Button
          title="Edit"
          onPress={() => {
            onEdit(food);
            reset();
          }}
          icon={{ name: 'edit', color: 'white' }}
          buttonStyle={styles.swipeButtonEdit}
        />
      )}
      rightContent={(reset) => (
        <Button
          title="Delete"
          onPress={handleDelete} // Call handleDelete
          icon={{ name: 'delete', color: 'white' }}
          buttonStyle={styles.swipeButtonDelete}
        />
      )}
      containerStyle={[
        styles.listItemContainer,
        { backgroundColor: theme.colors.background },
      ]}
    >
      <Icon name="fast-food-outline" type="ionicon" color={theme.colors.text} />
      <ListItem.Content>
        <ListItem.Title style={[styles.title, { color: theme.colors.text }]}>
          {food.name}
        </ListItem.Title>
        <ListItem.Subtitle style={{ color: theme.colors.text }}>
          {`Cal: ${food.calories}, P: ${food.protein}g, C: ${food.carbs}g, F: ${food.fat}g`}
        </ListItem.Subtitle>
      </ListItem.Content>
      <ListItem.Chevron />
    </ListItem.Swipeable>
  );
};

const styles = StyleSheet.create({
    listItemContainer: {
      paddingVertical: 15,
      borderRadius: 0,
      marginVertical: 0,
    },
    title: {
      fontWeight: 'bold',
      fontSize: 16,
    },
    swipeButtonEdit: {
        minHeight: '100%',
        backgroundColor: 'orange'
    },
    swipeButtonDelete: {
        minHeight: '100%',
        backgroundColor: 'red'
    }

  });

export default FoodItem;
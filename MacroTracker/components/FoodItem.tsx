// components/FoodItem.tsx
import React from 'react';
import { StyleSheet } from 'react-native';
import { ListItem, Icon, useTheme, Button } from '@rneui/themed';
import { Food } from '../types/food';

interface FoodItemProps {
  food: Food;
  onEdit: (food: Food) => void;
  onDelete: (foodId: string) => void;
}

const FoodItem: React.FC<FoodItemProps> = ({ food, onEdit, onDelete }) => {

    const {theme} = useTheme();
  return (
    <ListItem.Swipeable
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
          onPress={() => {
            onDelete(food.id);
            reset();
          }}
          icon={{ name: 'delete', color: 'white' }}
          buttonStyle={styles.swipeButtonDelete}
        />
      )}
      containerStyle={[styles.listItemContainer, {backgroundColor: theme.colors.background}]}
    >
      <Icon name="fast-food-outline" type="ionicon" color={theme.colors.text} />
      <ListItem.Content>
        <ListItem.Title style={[styles.title, {color: theme.colors.text}]}>{food.name}</ListItem.Title>
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
      paddingVertical: 15, // Add some vertical padding
      borderRadius: 8,   // Rounded corners
      marginVertical: 5, // Space between list items
      //borderWidth: 1,       // Subtle border //Removed for theme
      //borderColor: '#ddd',
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
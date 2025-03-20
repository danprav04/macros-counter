// components/FoodItem.tsx
import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Food } from '../types/food';
import { ListItem, Icon, Text, Button } from '@rneui/themed';

interface FoodItemProps {
  food: Food;
  onEdit: (food: Food) => void;
  onDelete: (foodId: string) => void;
}

const FoodItem: React.FC<FoodItemProps> = ({ food, onEdit, onDelete }) => {
  return (
    <ListItem.Swipeable
      bottomDivider
      leftContent={(reset) => (
          <Button
              title="Edit"
              onPress={() => {onEdit(food); reset()}}
              icon={{ name: 'edit', color: 'white' }}
              buttonStyle={{ minHeight: '100%', backgroundColor: 'orange' }}
          />
      )}
      rightContent={(reset) => (
        <Button
          title="Delete"
          onPress={() => {onDelete(food.id); reset()}}
          icon={{ name: 'delete', color: 'white' }}
          buttonStyle={{ minHeight: '100%', backgroundColor: 'red' }}
        />
      )}
    >
        <ListItem.Content>
            <ListItem.Title>{food.name}</ListItem.Title>
            <ListItem.Subtitle>
                {`Calories: ${food.calories}, Protein: ${food.protein}, Carbs: ${food.carbs}, Fat: ${food.fat}`}
            </ListItem.Subtitle>
        </ListItem.Content>
        <ListItem.Chevron />
    </ListItem.Swipeable>
  );
};

export default FoodItem;
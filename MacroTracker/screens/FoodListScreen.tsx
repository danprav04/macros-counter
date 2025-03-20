// screens/FoodListScreen.tsx
import React, { useState, useEffect, useCallback } from 'react';
import { View, FlatList, StyleSheet, Alert, TextInput, ScrollView, Platform } from 'react-native';
import { createFood, getFoods, updateFood, deleteFood } from '../services/foodService';
import { Food } from '../types/food';
import { isValidNumberInput, isNotEmpty } from '../utils/validationUtils';
import FoodItem from '../components/FoodItem';
import { Button, Input, Text, ListItem, FAB, Overlay, SearchBar, useTheme, makeStyles } from '@rneui/themed';
import { formatDate } from '../utils/dateUtils';
import Icon from "@rneui/base/dist/Icon/Icon";

const FoodListScreen: React.FC = () => {
  const [foods, setFoods] = useState<Food[]>([]);
  const [isOverlayVisible, setIsOverlayVisible] = useState(false);
  const [search, setSearch] = useState('');
  const [newFood, setNewFood] = useState<Omit<Food, 'id'>>({
    name: '',
    calories: 0,
    protein: 0,
    carbs: 0,
    fat: 0,
  });
  const [editFood, setEditFood] = useState<Food | null>(null);
  const { theme } = useTheme();
  const styles = useStyles();

  const loadFoodData = useCallback(async () => {
    const loadedFoods = await getFoods();
    setFoods(loadedFoods);
  }, []);

  useEffect(() => {
    loadFoodData();
  }, [loadFoodData]);

  const handleCreateFood = async () => {
    if (!isNotEmpty(newFood.name) || !isValidNumberInput(String(newFood.calories)) || !isValidNumberInput(String(newFood.protein)) || !isValidNumberInput(String(newFood.carbs)) || !isValidNumberInput(String(newFood.fat))) {
      Alert.alert('Invalid Input', 'Please enter valid food data.');
      return;
    }

    try {
      const createdFood = await createFood(newFood);
      setFoods([...foods, createdFood]);
      setNewFood({ name: '', calories: 0, protein: 0, carbs: 0, fat: 0 });
      setIsOverlayVisible(false);
    } catch (error) {
      Alert.alert('Error', 'Failed to create food.');
    }
  };

  const handleUpdateFood = async () => {
    if (!editFood || !isNotEmpty(editFood.name) || !isValidNumberInput(String(editFood.calories)) || !isValidNumberInput(String(editFood.protein)) || !isValidNumberInput(String(editFood.carbs)) || !isValidNumberInput(String(editFood.fat))) {
      Alert.alert('Invalid Input', 'Please enter valid food data.');
      return;
    }

    try {
      const updated = await updateFood(editFood);
      setFoods(foods.map(f => f.id === updated.id ? updated : f));
      setEditFood(null);
      setIsOverlayVisible(false);
    } catch (error) {
      Alert.alert('Error', 'Failed to update food.');
    }
  };

  const handleDeleteFood = async (foodId: string) => {
    try {
      await deleteFood(foodId);
      setFoods(foods.filter((f) => f.id !== foodId));
    } catch (error) {
      Alert.alert('Error', 'Failed to delete food.');
    }
  };

  const toggleOverlay = (food?: Food) => {
    if (food) {
      setEditFood(food);
    } else {
      setNewFood({ name: '', calories: 0, protein: 0, carbs: 0, fat: 0 });
    }

    setIsOverlayVisible(!isOverlayVisible);
  };

  const updateSearch = (search: string) => {
    setSearch(search);
  };

  const filteredFoods = foods.filter((food) => {
    return food.name.toLowerCase().includes(search.toLowerCase());
  });

  return (
    <View style={styles.container}>
      <SearchBar
        placeholder="Search Foods..."
        onChangeText={updateSearch}
        value={search}
        platform={Platform.select({ ios: 'ios', android: 'android', default: 'default' })} // Use Platform.select
      />
      <FlatList
        data={filteredFoods}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <FoodItem food={item} onEdit={toggleOverlay} onDelete={handleDeleteFood} />
        )}
      />

      <FAB
        icon={{ name: 'add', color: 'white' }}
        color={theme.colors.primary}
        onPress={() => toggleOverlay()}
        placement="right"
      />

      <Overlay isVisible={isOverlayVisible} onBackdropPress={() => toggleOverlay()}>
        <ScrollView>
          <Text h4 style={{ marginBottom: 10 }}>{editFood ? 'Edit Food' : 'Add New Food'}</Text>
          <Input
            placeholder="Food Name"
            value={editFood ? editFood.name : newFood.name}
            onChangeText={(text) => editFood ? setEditFood({ ...editFood, name: text }) : setNewFood({ ...newFood, name: text })}
          />
          <Input
            placeholder="Calories (per 100g)"
            keyboardType="numeric"
            value={editFood ? String(editFood.calories) : String(newFood.calories)}
            onChangeText={(text) => editFood ? setEditFood({ ...editFood, calories: parseFloat(text) || 0 }) : setNewFood({ ...newFood, calories: parseFloat(text) || 0 })}
          />
          <Input
            placeholder="Protein (per 100g)"
            keyboardType="numeric"
            value={editFood ? String(editFood.protein) : String(newFood.protein)}
            onChangeText={(text) => editFood ? setEditFood({ ...editFood, protein: parseFloat(text) || 0 }) : setNewFood({ ...newFood, protein: parseFloat(text) || 0 })}
          />
          <Input
            placeholder="Carbs (per 100g)"
            keyboardType="numeric"
            value={editFood ? String(editFood.carbs) : String(newFood.carbs)}
            onChangeText={(text) => editFood ? setEditFood({ ...editFood, carbs: parseFloat(text) || 0 }) : setNewFood({ ...newFood, carbs: parseFloat(text) || 0 })}
          />
          <Input
            placeholder="Fat (per 100g)"
            keyboardType="numeric"
            value={editFood ? String(editFood.fat) : String(newFood.fat)}
            onChangeText={(text) => editFood ? setEditFood({ ...editFood, fat: parseFloat(text) || 0 }) : setNewFood({ ...newFood, fat: parseFloat(text) || 0 })}
          />
          <Button title={editFood ? "Update Food" : "Add Food"} onPress={editFood ? handleUpdateFood : handleCreateFood} />
        </ScrollView>
      </Overlay>
    </View>
  );
};
const useStyles = makeStyles((theme) => ({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  }
}));
export default FoodListScreen;
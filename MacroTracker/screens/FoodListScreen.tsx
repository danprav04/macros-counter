// FoodListScreen.tsx
import React, { useState, useEffect, useCallback } from "react";
import { View, FlatList, Alert, Platform } from "react-native";
import {
  createFood,
  getFoods,
  updateFood,
  deleteFood,
} from "../services/foodService";
import { Food } from "../types/food";
import { isValidNumberInput, isNotEmpty } from "../utils/validationUtils";
import FoodItem from "../components/FoodItem";
import { Button, SearchBar, useTheme, makeStyles } from "@rneui/themed";
import { FAB } from "@rneui/base";
import { SafeAreaView } from "react-native-safe-area-context";
import AddFoodModal from "../components/AddFoodModal";
import Toast from "react-native-toast-message";
import { useFocusEffect } from "@react-navigation/native"; // Import useFocusEffect

interface FoodListScreenProps {
  onFoodChange?: () => void;
}

const FoodListScreen: React.FC<FoodListScreenProps> = ({ onFoodChange }) => {
  const [foods, setFoods] = useState<Food[]>([]);
  const [isOverlayVisible, setIsOverlayVisible] = useState(false);
  const [search, setSearch] = useState("");
  const [newFood, setNewFood] = useState<Omit<Food, "id">>({
    name: "",
    calories: 0,
    protein: 0,
    carbs: 0,
    fat: 0,
    category: "", // Make sure to initialize all properties
  });
  const [editFood, setEditFood] = useState<Food | null>(null);
  const [errors, setErrors] = useState<{ [key: string]: string }>({});
  const { theme } = useTheme();
  const styles = useStyles();

  const loadFoodData = useCallback(async () => {
    const loadedFoods = await getFoods();
    setFoods(loadedFoods);
  }, []);

    // Use useFocusEffect to reload data
  useFocusEffect(
    useCallback(() => {
      loadFoodData();
    }, [loadFoodData])
  );


  const validateFood = (food: Omit<Food, "id">) => {
    const newErrors: { [key: string]: string } = {};
    if (!isNotEmpty(food.name)) newErrors.name = "Name is required";
    if (!isValidNumberInput(String(food.calories)))
      newErrors.calories = "Invalid input";
    if (!isValidNumberInput(String(food.protein)))
      newErrors.protein = "Invalid input";
    if (!isValidNumberInput(String(food.carbs)))
      newErrors.carbs = "Invalid input";
    if (!isValidNumberInput(String(food.fat))) newErrors.fat = "Invalid input";

    return Object.keys(newErrors).length === 0 ? null : newErrors;
  };

  const handleCreateFood = async () => {
    const validationErrors = validateFood(newFood);
    if (validationErrors) {
      setErrors(validationErrors);
      return;
    }
    setErrors({});
    try {
      const createdFood = await createFood(newFood);
      setFoods([...foods, createdFood]);
      setNewFood({
        name: "",
        calories: 0,
        protein: 0,
        carbs: 0,
        fat: 0,
        category: "", // Reset category too
      });
      setIsOverlayVisible(false);
      onFoodChange && onFoodChange(); // Trigger data refresh in parent
    } catch (error: any) {
      Alert.alert("Error", error.message || "Failed to create food.");
    }
  };

  const handleUpdateFood = async () => {
    if (!editFood) return;
    const validationErrors = validateFood(editFood);
    if (validationErrors) {
      setErrors(validationErrors);
      return;
    }
    setErrors({});
    try {
      const updated = await updateFood(editFood);
      setFoods(foods.map((f) => (f.id === updated.id ? updated : f)));
      setEditFood(null);
      setIsOverlayVisible(false);
      onFoodChange && onFoodChange(); // Notify parent of change
    } catch (error: any) {
      Alert.alert("Error", error.message || "Failed to update food.");
    }
  };

  const handleDeleteFood = async (foodId: string) => {
    // Optimistically remove the food from the list
    const foodToDelete = foods.find((f) => f.id === foodId);
    if (!foodToDelete) return; // Should not happen, but handle for safety
    setFoods(foods.filter((f) => f.id !== foodId));

    try {
      await deleteFood(foodId);
      // If deletion is successful, show the toast
      Toast.show({
        type: "success",
        text1: `${foodToDelete.name} deleted`,
        text2: "Tap to undo",
        position: "bottom",
        bottomOffset: 80,
        onPress: () => handleUndoDeleteFood(foodToDelete),
        visibilityTime: 3000,
      });
       onFoodChange && onFoodChange();
    } catch (error) {
      // If deletion failed, add the food back to the list
      setFoods((prevFoods) => [...prevFoods, foodToDelete]);
      Alert.alert("Error", "Failed to delete food.");
    }
  };

  const handleUndoDeleteFood = (food: Food) => {
    setFoods((prevFoods) => [...prevFoods, food]);
    Toast.hide();
     onFoodChange && onFoodChange();

  };

  const toggleOverlay = (food?: Food) => {
    if (food) {
      setEditFood(food);
      setNewFood({
        name: "",
        calories: 0,
        protein: 0,
        carbs: 0,
        fat: 0,
        category: "",
      }); // Clear newFood
    } else {
      setEditFood(null);
      setNewFood({
        name: "",
        calories: 0,
        protein: 0,
        carbs: 0,
        fat: 0,
        category: "",
      });
    }
    setErrors({});
    setIsOverlayVisible(!isOverlayVisible);
  };

  const updateSearch = (search: string) => setSearch(search);
  const filteredFoods = foods.filter((food) =>
    food.name.toLowerCase().includes(search.toLowerCase())
  );

  const handleInputChange = (
    key: keyof Omit<Food, "id">,
    value: string
  ) => {
    const updatedFood = editFood
      ? { ...editFood, [key]: key === "name" ? value : value === "" ? 0 :  parseFloat(value)  } // Allow empty string, treat as 0
      : { ...newFood, [key]: key === "name" ? value : value === "" ? 0: parseFloat(value) };

    if (editFood) {
      setEditFood(updatedFood as Food);
    } else {
      setNewFood(updatedFood);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <SearchBar
        placeholder="Search Foods..."
        onChangeText={updateSearch}
        value={search}
        platform={Platform.OS === "ios" ? "ios" : "android"}
        containerStyle={styles.searchBarContainer}
        inputContainerStyle={[
          styles.searchBarInputContainer,
          { backgroundColor: theme.colors.grey5 },
        ]}
        inputStyle={{ color: theme.colors.text }}
      />
      <FlatList
        data={filteredFoods}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <FoodItem
            food={item}
            onEdit={toggleOverlay}
            onDelete={handleDeleteFood}
            onUndoDelete={handleUndoDeleteFood}
          />
        )}
      />

      <FAB
        icon={{ name: "add", color: "white" }}
        color={theme.colors.primary}
        onPress={() => toggleOverlay()}
        placement="right"
        title=""
        style={{ marginBottom: 10, marginRight: 8 }}
      />

      <AddFoodModal
        isVisible={isOverlayVisible}
        toggleOverlay={toggleOverlay}
        newFood={newFood}
        editFood={editFood}
        errors={errors}
        handleInputChange={handleInputChange}
        handleCreateFood={handleCreateFood}
        handleUpdateFood={handleUpdateFood}
        validateFood={validateFood}
        setErrors={setErrors}
      />
    </SafeAreaView>
  );
};

const useStyles = makeStyles((theme) => ({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  searchBarContainer: {
    backgroundColor: "transparent",
    borderBottomColor: "transparent",
    borderTopColor: "transparent",
    marginBottom: 10,
    padding: 0,
  },
  searchBarInputContainer: {
    borderRadius: 10,
  },
}));

export default FoodListScreen;
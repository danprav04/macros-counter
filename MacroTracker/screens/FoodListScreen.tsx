// FoodListScreen.tsx
import React, { useState, useEffect, useCallback } from "react";
import { View, FlatList, Alert, Platform, Image } from "react-native"; // Import Image
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
import { useFocusEffect } from "@react-navigation/native";
import { Icon } from "@rneui/base";
import { getFoodIconUrl } from "./../utils/iconUtils"; // Import the icon helper function

interface FoodListScreenProps {
  onFoodChange?: () => void;
}

const FoodListScreen: React.FC<FoodListScreenProps> = ({ onFoodChange }) => {
  const [foods, setFoods] = useState<Food[]>([]);
    const [foodIcons, setFoodIcons] = useState<{ [foodName: string]: string | null }>({});
  const [isOverlayVisible, setIsOverlayVisible] = useState(false);
  const [search, setSearch] = useState("");
  const [newFood, setNewFood] = useState<Omit<Food, "id">>({
    name: "",
    calories: 0,
    protein: 0,
    carbs: 0,
    fat: 0,
    // category: "", // REMOVED - No category field
  });
  const [editFood, setEditFood] = useState<Food | null>(null);
  const [errors, setErrors] = useState<{ [key: string]: string }>({});
  const { theme } = useTheme();
  const styles = useStyles();

  const loadFoodData = useCallback(async () => {
    const loadedFoods = await getFoods();
    setFoods(loadedFoods);
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadFoodData();
    }, [loadFoodData])
  );
    useEffect(() => {
        const loadIcons = async () => {
            const icons: { [foodName: string]: string | null } = {};
            for (const food of foods) {
                const iconUrl = await getFoodIconUrl(food.name);
                icons[food.name] = iconUrl;
            }
            setFoodIcons(icons);
        };

        loadIcons();
    }, [foods]);

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
        // category: "", // REMOVED - No category
      });
      setIsOverlayVisible(false);
      onFoodChange && onFoodChange();
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
      onFoodChange && onFoodChange();
    } catch (error: any) {
      Alert.alert("Error", error.message || "Failed to update food.");
    }
  };

  const handleDeleteFood = async (foodId: string) => {
    const foodToDelete = foods.find((f) => f.id === foodId);
    if (!foodToDelete) return;
    setFoods(foods.filter((f) => f.id !== foodId));

    try {
      await deleteFood(foodId);
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
    } else {
      setEditFood(null);
      setNewFood({  // Reset newFood when adding, not editing
        name: "",
        calories: 0,
        protein: 0,
        carbs: 0,
        fat: 0,
      });
    }
    setErrors({}); // Clear errors
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
        // crucial change:  handle name and number inputs
    const updatedFood = editFood
      ? { ...editFood, [key]: key === "name" ? value : value === "" ? 0 : parseFloat(value) }
      : { ...newFood, [key]: key === "name" ? value : value === "" ? 0 : parseFloat(value) };

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
            <View style={{flexDirection:'row'}}>
              <FoodItem
                food={item}
                onEdit={toggleOverlay}
                onDelete={handleDeleteFood}
                onUndoDelete={handleUndoDeleteFood} // Pass undo function
                />
            </View>

        )}
      />

      <FAB
        icon={{ name: "add", color: "white" }}
        color={theme.colors.primary}
        onPress={() => toggleOverlay()}  // Open overlay for adding
        placement="right"
        title=""  // No title, just the icon
        style={{marginBottom: 10, marginRight: 8}}
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
    padding: 0, // Remove extra padding
  },
  searchBarInputContainer: {
    borderRadius: 10,
  },
    foodIcon: {
        width: 30,
        height: 30,
        marginRight: 10,
        borderRadius: 15, // Make it circular
    },
}));

export default FoodListScreen;
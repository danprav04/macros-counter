// screens/FoodListScreen.tsx
import React, { useState, useEffect } from "react";
import {
  View,
  FlatList,
  Alert,
  Platform,
  KeyboardAvoidingView,
  Modal,
} from "react-native"; // Removed ScrollView
import {
  createFood,
  getFoods,
  updateFood,
  deleteFood,
} from "../services/foodService";
import { Food } from "../types/food";
import { isValidNumberInput, isNotEmpty } from "../utils/validationUtils";
import FoodItem from "../components/FoodItem";
import {
  Button,
  Input,
  Text,
  Overlay,
  SearchBar,
  useTheme,
  makeStyles,
} from "@rneui/themed";
import { FAB } from "@rneui/base";
import { SafeAreaView } from "react-native-safe-area-context";

const FoodListScreen: React.FC = () => {
  const [foods, setFoods] = useState<Food[]>([]);
  const [isOverlayVisible, setIsOverlayVisible] = useState(false);
  const [search, setSearch] = useState("");
  const [newFood, setNewFood] = useState<Omit<Food, "id">>({
    name: "",
    calories: 0,
    protein: 0,
    carbs: 0,
    fat: 0,
  });
  const [editFood, setEditFood] = useState<Food | null>(null);
  const [errors, setErrors] = useState<{ [key: string]: string }>({});
  const { theme } = useTheme();
  const styles = useStyles();

  const loadFoodData = async () => {
    const loadedFoods = await getFoods();
    setFoods(loadedFoods);
  };

  useEffect(() => {
    loadFoodData();
  }, []);

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
      setNewFood({ name: "", calories: 0, protein: 0, carbs: 0, fat: 0 });
      setIsOverlayVisible(false);
    } catch (error) {
      Alert.alert("Error", "Failed to create food.");
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
    } catch (error) {
      Alert.alert("Error", "Failed to update food.");
    }
  };

  const handleDeleteFood = async (foodId: string) => {
    await deleteFood(foodId);
    setFoods(foods.filter((f) => f.id !== foodId));
  };

  const toggleOverlay = (food?: Food) => {
    setEditFood(food ?? null); // Use null coalescing for cleaner initialization
    setErrors({});
    setIsOverlayVisible(!isOverlayVisible);
  };

  const updateSearch = (search: string) => setSearch(search);
  const filteredFoods = foods.filter((food) =>
    food.name.toLowerCase().includes(search.toLowerCase())
  );

  const handleInputChange = (key: keyof Omit<Food, "id">, value: string) => {
    const updatedFood = editFood
      ? { ...editFood, [key]: key === "name" ? value : parseFloat(value) || 0 }
      : { ...newFood, [key]: key === "name" ? value : parseFloat(value) || 0 };

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
          />
        )}
      />

      <FAB
        icon={{ name: "add", color: "white" }}
        color={theme.colors.primary}
        onPress={() => toggleOverlay()}
        placement="right"
        title="Add"
      />

      <Overlay
        isVisible={isOverlayVisible}
        onBackdropPress={() => toggleOverlay()}
        animationType="slide"
        transparent={true}
        statusBarTranslucent={true}
      >
        <SafeAreaView style={styles.modalSafeArea}>
          <KeyboardAvoidingView
            behavior={Platform.OS === "ios" ? "padding" : "height"}
            style={styles.keyboardAvoidingView}
          >
            <View style={styles.overlayContent}>
              <Text
                h4
                style={[styles.overlayTitle, { color: theme.colors.text }]}
              >
                {editFood ? "Edit Food" : "Add New Food"}
              </Text>
              {/* Inputs are directly inside the View, not a ScrollView */}
              <Input
                placeholder="Food Name"
                value={editFood ? editFood.name : newFood.name}
                onChangeText={(text) => handleInputChange("name", text)}
                errorMessage={errors.name}
                style={{ color: theme.colors.text }}
                inputContainerStyle={{ borderBottomColor: theme.colors.text }}
              />
              <Input
                placeholder="Calories (per 100g)"
                keyboardType="numeric"
                value={
                  editFood
                    ? String(editFood.calories)
                    : String(newFood.calories)
                }
                onChangeText={(text) => handleInputChange("calories", text)}
                errorMessage={errors.calories}
                style={{ color: theme.colors.text }}
                inputContainerStyle={{ borderBottomColor: theme.colors.text }}
              />
              <Input
                placeholder="Protein (per 100g)"
                keyboardType="numeric"
                value={
                  editFood ? String(editFood.protein) : String(newFood.protein)
                }
                onChangeText={(text) => handleInputChange("protein", text)}
                errorMessage={errors.protein}
                style={{ color: theme.colors.text }}
                inputContainerStyle={{ borderBottomColor: theme.colors.text }}
              />
              <Input
                placeholder="Carbs (per 100g)"
                keyboardType="numeric"
                value={
                  editFood ? String(editFood.carbs) : String(newFood.carbs)
                }
                onChangeText={(text) => handleInputChange("carbs", text)}
                errorMessage={errors.carbs}
                style={{ color: theme.colors.text }}
                inputContainerStyle={{ borderBottomColor: theme.colors.text }}
              />
              <Input
                placeholder="Fat (per 100g)"
                keyboardType="numeric"
                value={editFood ? String(editFood.fat) : String(newFood.fat)}
                onChangeText={(text) => handleInputChange("fat", text)}
                errorMessage={errors.fat}
                style={{ color: theme.colors.text }}
                inputContainerStyle={{ borderBottomColor: theme.colors.text }}
              />
              <Button
                title={editFood ? "Update Food" : "Add Food"}
                onPress={editFood ? handleUpdateFood : handleCreateFood}
                disabled={
                  editFood ? !!validateFood(editFood) : !!validateFood(newFood)
                }
                buttonStyle={styles.button}
              />
            </View>
          </KeyboardAvoidingView>
        </SafeAreaView>
      </Overlay>
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
  modalSafeArea: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "rgba(0, 0, 0, 0)",
  },
  keyboardAvoidingView: {
    width: "100%",
    flex: 1, // Important: Allow KeyboardAvoidingView to expand
  },
  overlayContent: {
    backgroundColor: theme.colors.background,
    width: "100%",
    height: "100%",
    borderRadius: 10,
    padding: 20,
  },
  overlayTitle: {
    marginBottom: 20,
    textAlign: "center",
  },
  button: {
    marginTop: 10,
  },
}));

export default FoodListScreen;

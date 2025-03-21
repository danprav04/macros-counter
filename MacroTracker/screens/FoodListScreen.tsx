 //FoodListScreen.tsx
 import React, { useState, useEffect, useCallback } from "react"; // Import useCallback
 import { View, FlatList, Alert, Platform } from "react-native";
 import { createFood, getFoods, updateFood, deleteFood } from "../services/foodService";
 import { Food } from "../types/food";
 import { isValidNumberInput, isNotEmpty } from "../utils/validationUtils";
 import FoodItem from "../components/FoodItem";
 import { Button, SearchBar, useTheme, makeStyles } from "@rneui/themed";
 import { FAB } from "@rneui/base";
 import { SafeAreaView } from "react-native-safe-area-context";
 import AddFoodModal from "../components/AddFoodModal";
 import Toast from 'react-native-toast-message';

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

 const loadFoodData = useCallback(async () => { // Use useCallback
     const loadedFoods = await getFoods();
     setFoods(loadedFoods);
 }, []);  // Empty dependency array

 useEffect(() => {
     loadFoodData();
 }, [loadFoodData]);

 const validateFood = (food: Omit<Food, "id">) => {
     const newErrors: { [key: string]: string } = {};
     if (!isNotEmpty(food.name || '')) newErrors.name = "Name is required";
     if (!isValidNumberInput(String(food.calories))) newErrors.calories = "Invalid input";
     if (!isValidNumberInput(String(food.protein))) newErrors.protein = "Invalid input";
     if (!isValidNumberInput(String(food.carbs))) newErrors.carbs = "Invalid input";
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

 // Add undo function
 const handleUndoDeleteFood = (food: Food) => {
     setFoods(prevFoods => [...prevFoods, food]); // Re-add the food
     Toast.hide();
 };


 const toggleOverlay = (food?: Food) => {
     if (food) {
     setEditFood(food);
     setNewFood({ name: "", calories: 0, protein: 0, carbs: 0, fat: 0 });
     } else {
         setEditFood(null);
         setNewFood({ name: "", calories: 0, protein: 0, carbs: 0, fat: 0 });
     }
     setErrors({});
     setIsOverlayVisible(!isOverlayVisible);
 };

 const updateSearch = (search: string) => setSearch(search);
 const filteredFoods = foods.filter((food) => food.name.toLowerCase().includes(search.toLowerCase()));

 const handleInputChange = (key: keyof Omit<Food, "id">, value: string) => { // Corrected type
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
             inputContainerStyle={[styles.searchBarInputContainer, { backgroundColor: theme.colors.grey5 }]}
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
                     onUndoDelete={handleUndoDeleteFood} // Pass undo handler
                 />
             )}
         />

         <FAB
             icon={{ name: "add", color: "white" }}
             color={theme.colors.primary}
             onPress={() => toggleOverlay()}
             placement="right"
             title="Add"
             style={{marginBottom:70}}
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
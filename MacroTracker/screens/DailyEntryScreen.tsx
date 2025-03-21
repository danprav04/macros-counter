//screens/DailyEntryScreen.tsx
// Import necessary modules and components
import React, { useState, useEffect, useCallback } from "react";
import { View, FlatList, Alert, Platform } from "react-native";
import { DailyEntry, DailyEntryItem } from "../types/dailyEntry";
import { Food } from "../types/food";
import { getFoods } from "../services/foodService";
import {
  saveDailyEntries,
  loadDailyEntries,
  loadSettings,
} from "../services/storageService";
import {
  formatDate,
  formatDateReadable,
  getTodayDateString,
} from "../utils/dateUtils";
import { isValidNumberInput } from "../utils/validationUtils";
import DailyProgress from "../components/DailyProgress";
import {
  Button,
  Text,
  ListItem,
  FAB,
  SearchBar,
  makeStyles,
  useTheme,
  Divider,
} from "@rneui/themed";
import DateTimePicker from "@react-native-community/datetimepicker";
import { addDays, subDays, parseISO } from "date-fns";
import { Icon } from "@rneui/base";
import { SafeAreaView } from "react-native-safe-area-context";
import AddEntryModal from "../components/AddEntryModal"; // Import
import "react-native-get-random-values";
import { v4 as uuidv4 } from "uuid";

// Define the DailyGoals interface
interface DailyGoals {
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
}

// DailyEntryScreen Component
const DailyEntryScreen: React.FC = () => {
  // State variables
  const [dailyEntries, setDailyEntries] = useState<DailyEntry[]>([]);
  const [selectedDate, setSelectedDate] = useState<string>(
    getTodayDateString()
  );
  const [foods, setFoods] = useState<Food[]>([]);
  const [selectedFood, setSelectedFood] = useState<Food | null>(null);
  const [grams, setGrams] = useState("");
  const [isOverlayVisible, setIsOverlayVisible] = useState(false);
  const [search, setSearch] = useState("");
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [dailyGoals, setDailyGoals] = useState<DailyGoals>({
    calories: 2000,
    protein: 50,
    carbs: 200,
    fat: 70,
  });

  // Get theme and styles
  const { theme } = useTheme();
  const styles = useStyles();

  // Load data function (using useCallback for memoization)
  const loadData = useCallback(async () => {
    const loadedFoods = await getFoods();
    const loadedEntries = await loadDailyEntries();
    const loadedSettings = await loadSettings();

    if (loadedSettings.dailyGoals) {
      setDailyGoals((prevGoals) => ({
        ...prevGoals,
        ...loadedSettings.dailyGoals,
      }));
    }

    setFoods(loadedFoods);
    setDailyEntries(loadedEntries);
  }, []);

  // Load data on component mount
  useEffect(() => {
    loadData();
  }, [loadData]);

  // Function to get the current entry for the selected date
  const getCurrentEntry = (): DailyEntry => {
    return (
      dailyEntries.find((entry) => entry.date === selectedDate) || {
        date: selectedDate,
        items: [],
      }
    );
  };

  // Function to update and save entries
  const updateAndSaveEntries = async (updatedEntries: DailyEntry[]) => {
    await saveDailyEntries(updatedEntries);
    setDailyEntries(updatedEntries);
  };

  // Function to handle adding a new entry
  const handleAddEntry = async () => {
    if (!selectedFood || !isValidNumberInput(grams) || parseFloat(grams) <= 0) {
      Alert.alert(
        "Invalid Input",
        "Please select a food and enter a valid, positive number for grams."
      );
      return;
    }

    const newEntryItem: DailyEntryItem = {
      food: selectedFood,
      grams: parseFloat(grams),
    };
    const currentEntry = getCurrentEntry();
    const updatedItems = [...currentEntry.items, newEntryItem];
    const updatedEntry = { ...currentEntry, items: updatedItems };

    const updatedEntries = dailyEntries.filter(
      (entry) => entry.date !== selectedDate
    );
    updatedEntries.push(updatedEntry);

    await updateAndSaveEntries(updatedEntries);
    setSelectedFood(null);
    setGrams("");
    setIsOverlayVisible(false);
  };

  // Function to handle removing an entry
  const handleRemoveEntry = async (index: number) => {
    const currentEntry = getCurrentEntry();
    const updatedItems = currentEntry.items.filter((_, i) => i !== index);
    const updatedEntry = { ...currentEntry, items: updatedItems };

    const updatedEntries = dailyEntries.filter(
      (entry) => entry.date !== selectedDate
    );
    if (updatedItems.length > 0) {
      updatedEntries.push(updatedEntry);
    }

    await updateAndSaveEntries(updatedEntries);
  };

  // Toggle the visibility of the overlay
  const toggleOverlay = () => {
    setIsOverlayVisible(!isOverlayVisible);
    if (isOverlayVisible) {
      // Corrected condition
      setSearch("");
      setSelectedFood(null);
    }
  };

  // Update search text
  const updateSearch = (search: string) => setSearch(search);

  // Filter foods based on search text
  const filteredFoods = foods.filter((food) =>
    food.name.toLowerCase().includes(search.toLowerCase())
  );

  // Handle date change
  const handleDateChange = (event: any, selectedDateVal?: Date) => {
    setShowDatePicker(false);
    if (event.type === "set" && selectedDateVal) {
      setSelectedDate(formatDate(selectedDateVal));
    }
  };

  // Navigate to previous day
  const handlePreviousDay = () =>
    setSelectedDate(formatDate(subDays(parseISO(selectedDate), 1)));

  // Navigate to next day
  const handleNextDay = () =>
    setSelectedDate(formatDate(addDays(parseISO(selectedDate), 1)));

  // Handle food selection
  const handleSelectFood = (item: Food) => {
    setSelectedFood(item);
    setSearch("");
  };

  // Calculate total macros for the selected date
  const calculateTotals = () => {
    const currentEntry = getCurrentEntry();
    let [totalCalories, totalProtein, totalCarbs, totalFat] = [0, 0, 0, 0];

    currentEntry.items.forEach((item) => {
      totalCalories += (item.food.calories / 100) * item.grams;
      totalProtein += (item.food.protein / 100) * item.grams;
      totalCarbs += (item.food.carbs / 100) * item.grams;
      totalFat += (item.food.fat / 100) * item.grams;
    });

    return {
      totalCalories: Math.round(totalCalories),
      totalProtein: Math.round(totalProtein),
      totalCarbs: Math.round(totalCarbs),
      totalFat: Math.round(totalFat),
    };
  };

  // Destructure calculated totals
  const { totalCalories, totalProtein, totalCarbs, totalFat } =
    calculateTotals();

  // Return the JSX for the DailyEntryScreen
  return (
    <SafeAreaView style={styles.container}>
      {/* Date Navigation */}
      <View style={styles.dateNavigation}>
        <Button
          type="clear"
          onPress={handlePreviousDay}
          icon={
            <Icon name="arrow-back" type="ionicon" color={theme.colors.text} />
          }
        />
        <Text style={styles.dateText} onPress={() => setShowDatePicker(true)}>
          {formatDateReadable(selectedDate)}
        </Text>
        <Button
          type="clear"
          onPress={handleNextDay}
          icon={
            <Icon
              name="arrow-forward"
              type="ionicon"
              color={theme.colors.text}
            />
          }
        />
      </View>

      {/* Date Picker (conditional rendering) */}
      {showDatePicker && (
        <DateTimePicker
          value={parseISO(selectedDate)}
          mode="date"
          display="default"
          onChange={handleDateChange}
        />
      )}

      {/* Daily Progress Component */}
      <DailyProgress
        calories={totalCalories}
        protein={totalProtein}
        carbs={totalCarbs}
        fat={totalFat}
        goals={dailyGoals}
      />
      <Divider style={styles.divider} />

      {/* Entries Section */}
      <Text h4 style={[styles.sectionTitle, { color: theme.colors.text }]}>
        Entries:
      </Text>
      <FlatList
        data={getCurrentEntry().items}
        keyExtractor={(_, index) => index.toString()}
        renderItem={({ item, index }) => (
          <ListItem
            bottomDivider
            containerStyle={{ backgroundColor: theme.colors.background }}
          >
            <Icon
              name="nutrition-outline"
              type="ionicon"
              color={theme.colors.text}
            />
            <ListItem.Content>
              <ListItem.Title style={{ color: theme.colors.text }}>
                {item.food.name}
              </ListItem.Title>
              <ListItem.Subtitle
                style={{ color: theme.colors.text }}
              >{`${item.grams}g`}</ListItem.Subtitle>
            </ListItem.Content>
            <Button
              type="clear"
              onPress={() => handleRemoveEntry(index)}
              icon={<Icon name="trash" type="ionicon" color="red" />}
            />
          </ListItem>
        )}
      />

      {/* Add Entry FAB */}
      <FAB
        icon={<Icon name="add" color="white" />}
        color={theme.colors.primary}
        onPress={toggleOverlay}
        placement="right"
        title="Add"
      />

      {/* Add Entry Modal */}
      <AddEntryModal
        isVisible={isOverlayVisible}
        toggleOverlay={toggleOverlay}
        search={search}
        updateSearch={updateSearch}
        filteredFoods={filteredFoods}
        handleSelectFood={handleSelectFood}
        grams={grams}
        setGrams={setGrams}
        handleAddEntry={handleAddEntry}
        selectedFood={selectedFood}
      />
    </SafeAreaView>
  );
};

// StyleSheet using makeStyles
const useStyles = makeStyles((theme) => ({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  dateNavigation: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginVertical: 10,
    paddingHorizontal: 10,
  },
  dateText: {
    fontSize: 18,
    fontWeight: "bold",
    color: theme.colors.text,
  },
  divider: {
    marginVertical: 10,
  },
  sectionTitle: {
    marginBottom: 10,
    paddingHorizontal: 10,
  },
}));

// Export the component
export default DailyEntryScreen;

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
  makeStyles,
  useTheme,
  Divider,
  Input,
} from "@rneui/themed";
import DateTimePicker from "@react-native-community/datetimepicker";
import { addDays, subDays, parseISO } from "date-fns";
import { Icon } from "@rneui/base";
import { SafeAreaView } from "react-native-safe-area-context";
import AddEntryModal from "../components/AddEntryModal";
import "react-native-get-random-values";
import Toast from "react-native-toast-message";

interface DailyGoals {
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
}

const DailyEntryScreen: React.FC = () => {
  const [dailyEntries, setDailyEntries] = useState<DailyEntry[]>([]);
  const [selectedDate, setSelectedDate] = useState<string>(getTodayDateString());
  const [foods, setFoods] = useState<Food[]>([]);
  const [selectedFood, setSelectedFood] = useState<Food | null>(null);
  const [grams, setGrams] = useState("");
  const [isOverlayVisible, setIsOverlayVisible] = useState(false);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [dailyGoals, setDailyGoals] = useState<DailyGoals>({
    calories: 2000,
    protein: 50,
    carbs: 200,
    fat: 70,
  });
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [tempGrams, setTempGrams] = useState("");
  const [search, setSearch] = useState("");
  const [editIndex, setEditIndex] = useState<number | null>(null); // Added state

  const { theme } = useTheme();
  const styles = useStyles();

  const loadData = useCallback(async () => {
    const loadedFoods = await getFoods();
    const loadedEntries = await loadDailyEntries();
    const loadedSettings = await loadSettings();

    if (loadedSettings.dailyGoals) {
      setDailyGoals(loadedSettings.dailyGoals);
    }

    setFoods(loadedFoods);
    setDailyEntries(loadedEntries);
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const getCurrentEntry = (): DailyEntry => {
    return (
      dailyEntries.find((entry) => entry.date === selectedDate) || {
        date: selectedDate,
        items: [],
      }
    );
  };

  const updateAndSaveEntries = async (updatedEntries: DailyEntry[]) => {
    await saveDailyEntries(updatedEntries);
    setDailyEntries(updatedEntries);
  };

  const handleStartEditing = (index: number, currentGrams: number) => {
    setEditingIndex(index);
    setTempGrams(String(currentGrams));
  };

  const handleSaveInlineEdit = async (index: number) => {
    if (!isValidNumberInput(tempGrams) || parseFloat(tempGrams) <= 0) {
      Alert.alert(
        "Invalid Input",
        "Please enter a valid, positive number for grams."
      );
      return;
    }

    const currentEntry = getCurrentEntry();
    const updatedItems = [...currentEntry.items];
    updatedItems[index] = { ...updatedItems[index], grams: parseFloat(tempGrams) };
    const updatedEntry = { ...currentEntry, items: updatedItems };

    const updatedEntries = dailyEntries.filter(
      (entry) => entry.date !== selectedDate
    );
    updatedEntries.push(updatedEntry);

    await updateAndSaveEntries(updatedEntries);
    setEditingIndex(null);
    setTempGrams("");
  };

  const handleCancelInlineEdit = () => {
    setEditingIndex(null);
    setTempGrams("");
  };

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
    let updatedItems;

    if (editIndex !== null) {
      // Replace existing item if editing
      updatedItems = currentEntry.items.map((item, index) =>
        index === editIndex ? newEntryItem : item
      );
    } else {
      // Add new item if not editing
      updatedItems = [...currentEntry.items, newEntryItem];
    }

    const updatedEntry = { ...currentEntry, items: updatedItems };

    const updatedEntries = dailyEntries.map(entry => {
        if (entry.date === currentEntry.date) {
            return updatedEntry;
        }
        return entry;
    });


    await updateAndSaveEntries(updatedEntries);
    setSelectedFood(null);
    setGrams("");
    setEditIndex(null); // Reset edit index
    setIsOverlayVisible(false);
  };


  const handleSelectFood = (item: Food) => {
    setSelectedFood(item);
  };


  const handleRemoveEntry = async (index: number) => {
    const currentEntry = getCurrentEntry();
    const itemToRemove = currentEntry.items[index];
    const updatedItems = currentEntry.items.filter((_, i) => i !== index);
    const updatedEntry = { ...currentEntry, items: updatedItems };

    const updatedEntries = dailyEntries.map(entry => {
        if (entry.date === currentEntry.date) {
            return updatedEntry;
        }
        return entry;
    });
    if (updatedItems.length === 0) {
       const newEntries = dailyEntries.filter((entry) => entry.date !== currentEntry.date)
        await updateAndSaveEntries(newEntries)
        setDailyEntries(newEntries)

    }
    else {
        await updateAndSaveEntries(updatedEntries);
        setDailyEntries(updatedEntries)
    }


    Toast.show({
      type: "success",
      text1: `${itemToRemove.food.name} entry deleted`,
      text2: "Tap to undo",
      position: "bottom",
      bottomOffset: 80,
      onPress: () => handleUndoRemoveEntry(itemToRemove, currentEntry),
      visibilityTime: 3000,
    });
  };

  const handleUndoRemoveEntry = (
    item: DailyEntryItem,
    originalEntry: DailyEntry
  ) => {
    const updatedEntries = dailyEntries.map(entry => {
      if (entry.date === originalEntry.date) {
        const existingItemIndex = entry.items.findIndex(
          existingItem => existingItem.food.id === item.food.id
        );

        let updatedItems = [...entry.items];

        if (existingItemIndex === -1) {
          updatedItems = [...entry.items, item];
        }

        return { ...entry, items: updatedItems };
      }
      return entry;
    });

    updateAndSaveEntries(updatedEntries);
    Toast.hide();
  };


  const updateSearch = (search: string) => setSearch(search); //handleSearch
  const filteredFoods = foods.filter((food) => //handle filter
    food.name.toLowerCase().includes(search.toLowerCase())
  );

  const toggleOverlay = (item: DailyEntryItem | null = null, index: number | null = null) => {
    setIsOverlayVisible(!isOverlayVisible);
    if (item) {
      setSelectedFood(item.food);
      setGrams(String(item.grams)); // Pre-fill grams
      setEditIndex(index); // Store the index being edited

    }
    else {
      setSelectedFood(null);
      setGrams("");
      setEditIndex(null);


    }
  };

  const handleEditEntry = (item: DailyEntryItem, index: number) => {
    toggleOverlay(item, index);
  };


  const handleDateChange = (event: any, selectedDateVal?: Date) => {
    setShowDatePicker(false);
    if (event.type === "set" && selectedDateVal) {
      setSelectedDate(formatDate(selectedDateVal));
    }
  };

  const handlePreviousDay = () =>
    setSelectedDate(formatDate(subDays(parseISO(selectedDate), 1)));

  const handleNextDay = () =>
    setSelectedDate(formatDate(addDays(parseISO(selectedDate), 1)));


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

  const { totalCalories, totalProtein, totalCarbs, totalFat } = calculateTotals();

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.dateNavigation}>
        <Button
          type="clear"
          onPress={handlePreviousDay}
          icon={<Icon name="arrow-back" type="ionicon" color={theme.colors.text} />}
        />
        <Text style={styles.dateText} onPress={() => setShowDatePicker(true)}>
          {formatDateReadable(selectedDate)}
        </Text>
        <Button
          type="clear"
          onPress={handleNextDay}
          icon={<Icon name="arrow-forward" type="ionicon" color={theme.colors.text} />}
        />
      </View>

      {showDatePicker && (
        <DateTimePicker
          value={parseISO(selectedDate)}
          mode="date"
          display="default"
          onChange={handleDateChange}
        />
      )}

      <DailyProgress
        calories={totalCalories}
        protein={totalProtein}
        carbs={totalCarbs}
        fat={totalFat}
        goals={dailyGoals}
      />
      <Divider style={styles.divider} />

      <Text h4 style={[styles.sectionTitle, { color: theme.colors.text }]}>
        Entries:
      </Text>

      <FlatList
        data={getCurrentEntry().items}
        keyExtractor={(_, index) => index.toString()}
        renderItem={({ item, index }) => (
          <ListItem.Swipeable
            bottomDivider
            leftContent={(reset) => (
              <Button
                title="Edit"
                onPress={() => {
                  handleEditEntry(item, index); // Pass the entire item
                  reset();
                }}
                icon={{ name: 'edit', color: 'white' }}
                buttonStyle={{ minHeight: '100%', backgroundColor: 'orange' }}
              />
            )}
            rightContent={(reset) => (
              <Button
                title="Delete"
                onPress={() => {
                  handleRemoveEntry(index);
                  reset();
                }}
                icon={{ name: 'delete', color: 'white' }}
                buttonStyle={{ minHeight: '100%', backgroundColor: 'red' }}
              />
            )}
            containerStyle={{ backgroundColor: theme.colors.background }}
          >
            <Icon name="nutrition-outline" type="ionicon" color={theme.colors.text} />
            <ListItem.Content>
              <ListItem.Title style={{ color: theme.colors.text }}>
                {item.food.name}
              </ListItem.Title>

              {editingIndex === index ? ( // Inline editing input
                <View style={{ flexDirection: "row", alignItems: "center" }}>
                  <Input
                    value={tempGrams}
                    onChangeText={setTempGrams}
                    keyboardType="numeric"
                    inputContainerStyle={{ borderBottomWidth: 0 }} // Remove default border
                    style={{ width: 80, color: theme.colors.text }} // Adjust width as needed
                  />
                  <Button
                    title="Save"
                    type="clear"
                    onPress={() => handleSaveInlineEdit(index)}
                    icon={<Icon name="checkmark" type="ionicon" color="green" />}
                  />
                  <Button
                    title="Cancel"
                    type="clear"
                    onPress={handleCancelInlineEdit}
                    icon={<Icon name="close" type="ionicon" color="red" />}
                  />
                </View>
              ) : ( // Regular display of grams
                <ListItem.Subtitle style={{ color: theme.colors.text }}>
                  {`${item.grams}g`}
                </ListItem.Subtitle>
              )}

            </ListItem.Content>
          </ListItem.Swipeable>
        )}
      />

      <FAB
        icon={<Icon name="add" color="white" />}
        color={theme.colors.primary}
        onPress={() => toggleOverlay()}
        placement="right"
        size="large"
        containerStyle={styles.fabContainer}
      />

      <AddEntryModal
        isVisible={isOverlayVisible}
        toggleOverlay={() => toggleOverlay()}
        selectedFood={selectedFood} //Pass the selected food
        grams={grams} //pass the current number of grams
        setGrams={setGrams}
        filteredFoods={foods}
        handleAddEntry={handleAddEntry}
        handleSelectFood={handleSelectFood}
        search={search}
        updateSearch={updateSearch}
        isEditMode={editIndex !== null} // Pass isEditMode
      />
    </SafeAreaView>
  );
};

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
  fabContainer: {
    position: "absolute",
    bottom: -6,
    right: -8,
    elevation: 0,
    zIndex: 10,
  },

}));

export default DailyEntryScreen;
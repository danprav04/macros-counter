// screens/DailyEntryScreen.tsx
import React, { useState, useEffect, useCallback } from "react";
import {
  View,
  FlatList,
  Alert,
  Platform,
  KeyboardAvoidingView,
  Modal,
} from "react-native"; // Removed ScrollView
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
  Input,
  Text,
  ListItem,
  FAB,
  Overlay,
  SearchBar,
  makeStyles,
  useTheme,
  Divider,
} from "@rneui/themed";
import DateTimePicker from "@react-native-community/datetimepicker";
import { addDays, subDays, parseISO } from "date-fns";
import { Icon } from "@rneui/base";
import { SafeAreaView } from "react-native-safe-area-context";

interface DailyGoals {
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
}

const DailyEntryScreen: React.FC = () => {
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

  const { theme } = useTheme();
  const styles = useStyles();

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

  const toggleOverlay = () => {
    setIsOverlayVisible(!isOverlayVisible);
    if (isOverlayVisible) {
      // Corrected condition
      setSearch("");
      setSelectedFood(null);
    }
  };

  const updateSearch = (search: string) => setSearch(search);
  const filteredFoods = foods.filter((food) =>
    food.name.toLowerCase().includes(search.toLowerCase())
  );
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
  const handleSelectFood = (item: Food) => {
    setSelectedFood(item);
    setSearch("");
  };

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

  const { totalCalories, totalProtein, totalCarbs, totalFat } =
    calculateTotals();

  return (
    <SafeAreaView style={styles.container}>
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

      <FAB
        icon={<Icon name="add" color="white" />}
        color={theme.colors.primary}
        onPress={toggleOverlay}
        placement="right"
        title="Add"
      />

      <Overlay
        isVisible={isOverlayVisible}
        onBackdropPress={toggleOverlay}
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
                Add Entry
              </Text>
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
              {/* FlatList is now inside the main View, NOT a ScrollView */}
              <FlatList
                data={filteredFoods}
                keyExtractor={(item) => item.id}
                renderItem={({ item }) => (
                  <ListItem
                    bottomDivider
                    onPress={() => handleSelectFood(item)}
                    containerStyle={{
                      backgroundColor: theme.colors.background,
                    }}
                  >
                    <ListItem.Content>
                      <ListItem.Title style={{ color: theme.colors.text }}>
                        {item.name}
                      </ListItem.Title>
                    </ListItem.Content>
                  </ListItem>
                )}
                style={styles.foodList}
              />

              <Input
                placeholder="Grams (e.g. 150)"
                keyboardType="numeric"
                value={grams}
                onChangeText={setGrams}
                style={{ color: theme.colors.text }}
                inputContainerStyle={{ borderBottomColor: theme.colors.text }}
                errorMessage={
                  !isValidNumberInput(grams) && grams !== ""
                    ? "Enter a valid number"
                    : ""
                }
              />
              <Button
                title="Add Entry"
                onPress={handleAddEntry}
                disabled={
                  !selectedFood || !isValidNumberInput(grams) || grams === ""
                }
                buttonStyle={styles.addButton}
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
  modalSafeArea: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "rgba(0, 0, 0, 0)",
  },
  keyboardAvoidingView: {
    width: "100%",
    flex: 1, // Important: Allow KeyboardAvoidingView to take up all available space
  },
  overlayContent: {
    backgroundColor: theme.colors.background,
    width: "100%",
    height: "80%",
    borderRadius: 10,
    padding: 20,
    // maxHeight: '80%',  //  Add a maxHeight to prevent overly large modals
  },
  overlayTitle: {
    marginBottom: 20,
    textAlign: "center",
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
  foodList: {
    maxHeight: 200, // Limit height for scrollability *within* the FlatList
    marginBottom: 10,
    width: "100%",
  },
  addButton: {
    marginTop: 10,
  },
}));

export default DailyEntryScreen;

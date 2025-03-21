// screens/DailyEntryScreen.tsx
import React, { useState, useEffect, useCallback } from 'react';
import { View, FlatList, Alert, StyleSheet, ScrollView, Platform } from 'react-native';
import { DailyEntry, DailyEntryItem } from '../types/dailyEntry';
import { Food } from '../types/food';
import { getFoods } from '../services/foodService';
import { saveDailyEntries, loadDailyEntries, loadSettings } from '../services/storageService';
import { formatDate, formatDateReadable, getTodayDateString } from '../utils/dateUtils';
import { isValidNumberInput } from '../utils/validationUtils';
import DailyProgress from '../components/DailyProgress';
import { Button, Input, Text, ListItem, FAB, Overlay, SearchBar, makeStyles, useTheme, Divider } from '@rneui/themed';
import DateTimePicker from '@react-native-community/datetimepicker';
import { addDays, subDays, parseISO } from 'date-fns';
import { Icon } from "@rneui/base";

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
  const [grams, setGrams] = useState('');
  const [isOverlayVisible, setIsOverlayVisible] = useState(false);
  const [search, setSearch] = useState('');
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

//Added this function for code clarity and reusability
    const updateAndSaveEntries = async (updatedEntries: DailyEntry[]) => {
        try {
            await saveDailyEntries(updatedEntries);
            setDailyEntries(updatedEntries);
        } catch (error) {
            Alert.alert('Error', 'Failed to update entries.');
        }
    }

  const handleAddEntry = async () => {
    if (!selectedFood) {
      Alert.alert('No Food Selected', 'Please select a food.');
      return; // Early return
    }
    if (!isValidNumberInput(grams)) {
      Alert.alert('Invalid Grams', 'Please enter a valid number for grams.');
      return; // Early return
    }

    const gramsNumber = parseFloat(grams);
    if (gramsNumber <= 0)
    {
        Alert.alert('Invalid Grams', 'Grams must be greater than zero');
        return;
    }

    const newEntryItem: DailyEntryItem = {
      food: selectedFood,
      grams: gramsNumber,
    };

    const currentEntry = getCurrentEntry();
    const updatedItems = [...currentEntry.items, newEntryItem];
    const updatedEntry: DailyEntry = { ...currentEntry, items: updatedItems };

    const updatedEntries = dailyEntries.filter((entry) => entry.date !== selectedDate);
    updatedEntries.push(updatedEntry);

    await updateAndSaveEntries(updatedEntries); //Uses new function
    setSelectedFood(null);
    setGrams('');
    setIsOverlayVisible(false);
  };

  const handleRemoveEntry = async (index: number) => {
    const currentEntry = getCurrentEntry();
    const updatedItems = currentEntry.items.filter((_, i) => i !== index);
    const updatedEntry: DailyEntry = { ...currentEntry, items: updatedItems };

    const updatedEntries = dailyEntries.filter((entry) => entry.date !== selectedDate);
    if (updatedItems.length > 0) {
      updatedEntries.push(updatedEntry);
    }

    await updateAndSaveEntries(updatedEntries); //Uses new function
  };

  const toggleOverlay = () => {
    setIsOverlayVisible(!isOverlayVisible);
    if (isOverlayVisible) {
      //Clear when closing
      setSearch('');
      setSelectedFood(null);
    }
  };

  const updateSearch = (search: string) => {
    setSearch(search);
  };

  const filteredFoods = foods.filter((food) => {
    return food.name.toLowerCase().includes(search.toLowerCase());
  });

  const handleDateChange = (event: any, selectedDateVal?: Date) => {
    setShowDatePicker(false);
    if (event.type === 'set' && selectedDateVal) {
      setSelectedDate(formatDate(selectedDateVal));
    }
  };

  const handlePreviousDay = () => {
    setSelectedDate(formatDate(subDays(parseISO(selectedDate), 1)));
  };

  const handleNextDay = () => {
    setSelectedDate(formatDate(addDays(parseISO(selectedDate), 1)));
  };

    const handleSelectFood = (item: Food) => {
      setSelectedFood(item);
      setSearch('');  // Clear search on selection
    }

  const calculateTotals = () => {
    const currentEntry = getCurrentEntry();
    let totalCalories = 0;
    let totalProtein = 0;
    let totalCarbs = 0;
    let totalFat = 0;

    currentEntry.items.forEach((item) => {
      totalCalories += (item.food.calories / 100) * item.grams;
      totalProtein += (item.food.protein / 100) * item.grams;
      totalCarbs += (item.food.carbs / 100) * item.grams;
      totalFat += (item.food.fat / 100) * item.grams;
    });

    return {
      totalCalories: Math.round(totalCalories), // Round for display
      totalProtein: Math.round(totalProtein),
      totalCarbs: Math.round(totalCarbs),
      totalFat: Math.round(totalFat),
    };
  };

  const { totalCalories, totalProtein, totalCarbs, totalFat } = calculateTotals();

  return (
    <View style={styles.container}>
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
      <Text h4 style={[styles.sectionTitle, {color: theme.colors.text}]}>Entries:</Text>
      <FlatList
        data={getCurrentEntry().items}
        keyExtractor={(_, index) => index.toString()}
        renderItem={({ item, index }) => (
          <ListItem bottomDivider containerStyle={{ backgroundColor: theme.colors.background }}>
            <Icon name="nutrition-outline" type='ionicon' color={theme.colors.text} />
            <ListItem.Content>
              <ListItem.Title style={{ color: theme.colors.text }}>{item.food.name}</ListItem.Title>
              <ListItem.Subtitle style={{ color: theme.colors.text }}>
                {`${item.grams}g`}
              </ListItem.Subtitle>
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
        fullScreen={false}
        overlayStyle={[styles.overlay, {backgroundColor: theme.colors.background}]}
      >
        <View style={styles.overlayContent}>
          <Text h4 style={[styles.overlayTitle, {color: theme.colors.text}]}>Add Entry</Text>
          <SearchBar
            placeholder="Search Foods..."
            onChangeText={updateSearch}
            value={search}
            platform={Platform.OS === 'ios' ? 'ios' : 'android'}
            containerStyle={styles.searchBarContainer}
            inputContainerStyle={[styles.searchBarInputContainer, {backgroundColor: theme.colors.grey5}]}
            inputStyle={{color: theme.colors.text}}
          />
          <FlatList
            data={filteredFoods}
            keyExtractor={(item) => item.id}
            renderItem={({ item }) => (
              <ListItem
                bottomDivider
                onPress={() => handleSelectFood(item)} //Use new handler
                containerStyle={{ backgroundColor: theme.colors.background }}
              >
                 <Icon name="fast-food-outline" type="ionicon" color={theme.colors.text} />
                <ListItem.Content>
                  <ListItem.Title style={{ color: theme.colors.text }}>{item.name}</ListItem.Title>
                </ListItem.Content>
              </ListItem>
            )}
          />

            <Input
              placeholder="Grams (e.g. 150)"
              keyboardType="numeric"
              value={grams}
              onChangeText={setGrams}
              style={{color: theme.colors.text}}
              inputContainerStyle={{borderBottomColor: theme.colors.text}}
              errorMessage={
                !isValidNumberInput(grams) && grams !== '' ? 'Enter a valid number' : ''
              } // Show error
              />
            <Button
              title="Add Entry"
              onPress={handleAddEntry}
              disabled={!selectedFood || !isValidNumberInput(grams)} // Disable button
              buttonStyle={{marginTop: 10}}
            />
        </View>
      </Overlay>
    </View>
  );
};

const useStyles = makeStyles((theme) => ({
  container: {
    flex: 1,
    padding: 10,
    backgroundColor: theme.colors.background,
  },
  dateNavigation: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  dateText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: theme.colors.text,
  },
  divider: {
    marginVertical: 10,
  },
  sectionTitle: {
    marginBottom: 10,
  },
    overlay: {
        width: '90%', // Responsive width
        maxHeight: '80%', // Limit height
        borderRadius: 10
    },
    overlayContent: {
        flex: 1,
        padding: 10
    },
    overlayTitle: {
        marginBottom: 20,
        textAlign: 'center',
    },
  searchBarContainer: {
    backgroundColor: 'transparent',
    borderBottomColor: 'transparent',
    borderTopColor: 'transparent',
    marginBottom: 10,
    padding: 0
  },
  searchBarInputContainer: {
      borderRadius: 10
  }
}));

export default DailyEntryScreen;
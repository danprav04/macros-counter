// screens/DailyEntryScreen.tsx
import React, { useState, useEffect, useCallback } from 'react';
import { View, FlatList, Alert, StyleSheet, ScrollView } from 'react-native';
import { DailyEntry, DailyEntryItem } from '../types/dailyEntry';
import { Food } from '../types/food';
import { getFoods } from '../services/foodService';
import { saveDailyEntries, loadDailyEntries, loadSettings } from '../services/storageService';
import { formatDate, formatDateReadable, getTodayDateString } from '../utils/dateUtils';
import { isValidNumberInput } from '../utils/validationUtils';
import DailyProgress from '../components/DailyProgress';
import { Button, Input, Text, ListItem, FAB, Overlay, SearchBar, colors, makeStyles, useTheme, Divider } from '@rneui/themed';
import DateTimePicker from '@react-native-community/datetimepicker';
import { addDays, subDays, parseISO } from 'date-fns';
import Icon from "@rneui/base/dist/Icon/Icon";

const DailyEntryScreen: React.FC = () => {
  const [dailyEntries, setDailyEntries] = useState<DailyEntry[]>([]);
  const [selectedDate, setSelectedDate] = useState<string>(getTodayDateString());
  const [foods, setFoods] = useState<Food[]>([]);
  const [selectedFood, setSelectedFood] = useState<Food | null>(null);
  const [grams, setGrams] = useState('');
  const [isOverlayVisible, setIsOverlayVisible] = useState(false);
  const [search, setSearch] = useState('');
    const [showDatePicker, setShowDatePicker] = useState(false);
    const [dailyGoals, setDailyGoals] = useState({
        calories: 2000,
        protein: 50,
        carbs: 200,
        fat: 70
    });

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

  const handleAddEntry = async () => {
    if (!selectedFood || !isValidNumberInput(grams)) {
      Alert.alert('Invalid Input', 'Please select a food and enter a valid weight.');
      return;
    }

    const newEntryItem: DailyEntryItem = {
      food: selectedFood,
      grams: parseFloat(grams),
    };

    const currentEntry = getCurrentEntry();
    const updatedItems = [...currentEntry.items, newEntryItem];
    const updatedEntry: DailyEntry = { ...currentEntry, items: updatedItems };

    const updatedEntries = dailyEntries.filter((entry) => entry.date !== selectedDate);
    updatedEntries.push(updatedEntry);

    try {
      await saveDailyEntries(updatedEntries);
      setDailyEntries(updatedEntries);
      setSelectedFood(null);
      setGrams('');
      setIsOverlayVisible(false);
    } catch (error) {
      Alert.alert('Error', 'Failed to add entry.');
    }
  };

    const handleRemoveEntry = async (index: number) => {
        const currentEntry = getCurrentEntry();
        const updatedItems = currentEntry.items.filter((_, i) => i !== index);
        const updatedEntry: DailyEntry = { ...currentEntry, items: updatedItems };

        const updatedEntries = dailyEntries.filter((entry) => entry.date !== selectedDate);
        if (updatedItems.length > 0) { // Only add back if there are items
            updatedEntries.push(updatedEntry);
        }

        try {
            await saveDailyEntries(updatedEntries);
            setDailyEntries(updatedEntries);
        } catch (error) {
            Alert.alert('Error', 'Failed to remove entry.');
        }
    };

  const toggleOverlay = () => {
    setIsOverlayVisible(!isOverlayVisible);
  };

    const updateSearch = (search: string) => {
        setSearch(search);
    };

    const filteredFoods = foods.filter((food) => {
        return food.name.toLowerCase().includes(search.toLowerCase());
    });

    const handleDateChange = (event: any, selectedDateVal?: Date) => {

        const currentDate = selectedDateVal || new Date();

        setShowDatePicker(false);

        if(event.type === "set") {
            setSelectedDate(formatDate(currentDate));
        }
    };
    const handlePreviousDay = () => {
        setSelectedDate(formatDate(subDays(parseISO(selectedDate), 1)));
    };

    const handleNextDay = () => {
        setSelectedDate(formatDate(addDays(parseISO(selectedDate), 1)));
    };

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

        return { totalCalories, totalProtein, totalCarbs, totalFat };
    };
    const { totalCalories, totalProtein, totalCarbs, totalFat } = calculateTotals();

  return (
    <View style={styles.container}>
      <View style={styles.dateNavigation}>
          <Button  type="clear" onPress={handlePreviousDay}><Icon name="arrow-back" type="ionicon"/></Button>
        <Text style={styles.dateText} onPress={() => setShowDatePicker(true)}>{formatDateReadable(selectedDate)}</Text>
          <Button  type="clear" onPress={handleNextDay}><Icon name="arrow-forward" type="ionicon"/></Button>
      </View>
        {showDatePicker && (
            <DateTimePicker
                value={parseISO(selectedDate)}
                mode="date"
                is24Hour={true}
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
        <Divider style={{marginVertical: 10}}/>
        <Text h4>Entries:</Text>
      <FlatList
        data={getCurrentEntry().items}
        keyExtractor={(_, index) => index.toString()}
        renderItem={({ item, index }) => (
          <ListItem bottomDivider>
            <ListItem.Content>
              <ListItem.Title>{item.food.name}</ListItem.Title>
              <ListItem.Subtitle>{`${item.grams}g`}</ListItem.Subtitle>
            </ListItem.Content>
              <Button type="clear" onPress={() => handleRemoveEntry(index)}><Icon name="trash" type="ionicon" color="red"/></Button>
          </ListItem>
        )}
      />

      <FAB
        icon={{ name: 'add', color: 'white' }}
        color={theme.colors.primary}
        onPress={toggleOverlay}
        placement="right"
      />


      <Overlay isVisible={isOverlayVisible} onBackdropPress={toggleOverlay}>
        <ScrollView>
          <Text h4 style={{marginBottom: 10}}>Add Entry</Text>
            <SearchBar
                placeholder="Search Foods..."
                onChangeText={updateSearch}
                value={search}
                platform="ios"
            />
          <FlatList
            data={filteredFoods}
            keyExtractor={(item) => item.id}
            renderItem={({ item }) => (
              <ListItem bottomDivider onPress={() => {setSelectedFood(item); setSearch('')}}>
                <ListItem.Content>
                  <ListItem.Title>{item.name}</ListItem.Title>
                </ListItem.Content>
              </ListItem>
            )}
          />

          <Input
            placeholder="Grams"
            keyboardType="numeric"
            value={grams}
            onChangeText={setGrams}
          />
          <Button title="Add Entry" onPress={handleAddEntry} disabled={!selectedFood} />
        </ScrollView>
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
        marginBottom: 10,
    },
    dateText: {
        fontSize: 18,
        fontWeight: 'bold',
    },
}));

export default DailyEntryScreen;
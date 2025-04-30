// src/screens/DailyEntryScreen.tsx
import React, { useState, useEffect, useCallback, useMemo } from "react";
import {
  View,
  FlatList,
  Alert,
  Platform,
  StyleSheet,
  ActivityIndicator,
} from "react-native";
import { DailyEntry, DailyEntryItem } from "../types/dailyEntry";
import { Food } from "../types/food";
import { getFoods } from "../services/foodService";
import {
  saveDailyEntries,
  loadDailyEntries,
  loadSettings,
} from "../services/storageService";
import {
  getTodayDateString,
  formatDateISO,
  formatDateReadable,
} from "../utils/dateUtils";
import { isValidNumberInput } from "../utils/validationUtils";
import DailyProgress from "../components/DailyProgress";
import {
  Text,
  FAB,
  makeStyles,
  useTheme,
  Divider,
  Icon as RNEIcon,
} from "@rneui/themed";
import DateTimePicker, {
  DateTimePickerEvent,
} from "@react-native-community/datetimepicker";
import { addDays, subDays, parseISO, formatISO, isValid } from "date-fns";
import { SafeAreaView } from "react-native-safe-area-context";
import AddEntryModal from "../components/AddEntryModal";
import "react-native-get-random-values";
import Toast from "react-native-toast-message";
import { useFocusEffect } from "@react-navigation/native";
import { getFoodIconUrl } from "../utils/iconUtils";
import DateNavigator from "../components/DateNavigator"; // Import extracted component
import DailyEntryListItem from "../components/DailyEntryListItem"; // Import extracted component

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
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [dailyGoals, setDailyGoals] = useState<DailyGoals>({
    calories: 2000,
    protein: 150,
    carbs: 200,
    fat: 70,
  });
  const [search, setSearch] = useState("");
  const [editIndex, setEditIndex] = useState<number | null>(null); // Modal edit index (reversed)
  const [foodIcons, setFoodIcons] = useState<{
    [foodName: string]: string | null | undefined;
  }>({});
  const [isLoadingData, setIsLoadingData] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  const { theme } = useTheme();
  const styles = useStyles();

  // --- Data Loading and Icon Fetching ---
  const loadData = useCallback(async () => {
    // (unchanged)
    console.log(`DailyEntryScreen: Loading data for date: ${selectedDate}`);
    setIsLoadingData(true);
    try {
      const [loadedFoods, loadedEntries, loadedSettings] = await Promise.all([
        getFoods(),
        loadDailyEntries(),
        loadSettings(),
      ]);
      const currentGoals = loadedSettings?.dailyGoals ?? {
        calories: 2000,
        protein: 150,
        carbs: 200,
        fat: 70,
      };
      setDailyGoals(currentGoals);
      loadedFoods.sort((a, b) => a.name.localeCompare(b.name));
      setFoods(loadedFoods);
      setDailyEntries(loadedEntries);
      console.log(
        `DailyEntryScreen: Loaded ${loadedFoods.length} foods, ${loadedEntries.length} entry days.`
      );
      triggerIconFetches(loadedFoods, loadedEntries, selectedDate);
    } catch (error) {
      console.error("DailyEntryScreen: Error loading data:", error);
      Alert.alert("Load Error", "Failed to load necessary data.");
      setFoods([]);
      setDailyEntries([]);
      setDailyGoals({ calories: 0, protein: 0, carbs: 0, fat: 0 });
    } finally {
      setIsLoadingData(false);
    }
  }, [selectedDate]);

  const triggerIconFetches = useCallback(
    (allFoods: Food[], allEntries: DailyEntry[], currentDate: string) => {
      // (unchanged)
      const relevantFoodNames = new Set<string>();
      const currentOriginalEntry = allEntries.find(
        (entry) => entry.date === currentDate
      );
      if (currentOriginalEntry)
        currentOriginalEntry.items.forEach((item) => {
          if (item.food?.name) relevantFoodNames.add(item.food.name);
        });
      console.log(
        `DailyEntryScreen: Triggering icon fetches for ${relevantFoodNames.size} unique food names.`
      );
      relevantFoodNames.forEach((foodName) => {
        if (foodIcons[foodName] === undefined) {
          setFoodIcons((prevIcons) => ({
            ...prevIcons,
            [foodName]: undefined,
          }));
          getFoodIconUrl(foodName)
            .then((iconUrl) =>
              setFoodIcons((prevIcons) => ({
                ...prevIcons,
                [foodName]: iconUrl,
              }))
            )
            .catch((error) => {
              console.warn(
                `Icon fetch failed for ${foodName} in background:`,
                error
              );
              setFoodIcons((prevIcons) => ({ ...prevIcons, [foodName]: null }));
            });
        }
      });
    },
    [foodIcons]
  );

  useFocusEffect(
    useCallback(() => {
      loadData();
      return () => {
        console.log("DailyEntryScreen: Unfocused.");
        setSearch("");
        setIsOverlayVisible(false);
        setEditIndex(null);
      };
    }, [loadData])
  );

  // --- List and Index Management ---
  const currentEntryItems = useMemo(() => {
    // (unchanged)
    const entry = dailyEntries.find((e) => e.date === selectedDate);
    return entry ? [...entry.items].reverse() : [];
  }, [dailyEntries, selectedDate]);

  const getOriginalIndex = useCallback(
    (reversedIndex: number): number => {
      // (unchanged)
      const entry = dailyEntries.find((e) => e.date === selectedDate);
      if (!entry || reversedIndex < 0 || reversedIndex >= entry.items.length) {
        console.error(
          `getOriginalIndex: Invalid reversedIndex ${reversedIndex} for entry length ${entry?.items?.length}`
        );
        return -1;
      }
      return entry.items.length - 1 - reversedIndex;
    },
    [dailyEntries, selectedDate]
  );

  // --- State Update Helper ---
  const updateAndSaveEntries = useCallback(
    async (updatedEntries: DailyEntry[]) => {
      // (unchanged)
      setIsSaving(true);
      const entryForSelectedDate = updatedEntries.find(
        (e) => e.date === selectedDate
      );
      console.log(
        `DailyEntryScreen: updateAndSaveEntries called. Saving ${updatedEntries.length} total entries.`
      );
      console.log(
        `Entry for ${selectedDate} contains ${
          entryForSelectedDate?.items?.length ?? 0
        } items.`
      );
      setDailyEntries(updatedEntries);
      try {
        await saveDailyEntries(updatedEntries);
        console.log(
          "DailyEntryScreen: Successfully saved updated entries to storage."
        );
      } catch (error) {
        console.error(
          "DailyEntryScreen: Failed to save updated entries to storage:",
          error
        );
        Alert.alert("Save Error", "Could not save changes. Please try again.");
      } finally {
        setIsSaving(false);
      }
    },
    [selectedDate]
  );

  // --- Add/Update/Remove Entry Handlers ---
  const handleSingleEntryAction = useCallback(async () => {
    // (unchanged)
    if (isSaving) return;
    if (!selectedFood || !selectedFood.id) {
      Alert.alert("Food Not Selected", "Please select a valid food item.");
      return;
    }
    const trimmedGrams = grams.trim();
    if (!isValidNumberInput(trimmedGrams) || parseFloat(trimmedGrams) <= 0) {
      Alert.alert(
        "Invalid Amount",
        "Please enter a valid positive number for grams."
      );
      return;
    }
    const numericGrams = parseFloat(trimmedGrams);
    const entryItem: DailyEntryItem = {
      food: selectedFood,
      grams: numericGrams,
    };
    const isEditMode = editIndex !== null;
    console.log(
      `handleSingleEntryAction: Mode=${isEditMode ? "Edit" : "Add"}, Food=${
        selectedFood.name
      }, Grams=${numericGrams}, ReversedIndex=${editIndex}`
    );
    const existingEntryIndex = dailyEntries.findIndex(
      (entry) => entry.date === selectedDate
    );
    let updatedEntries: DailyEntry[];
    if (existingEntryIndex > -1) {
      const existingEntry = dailyEntries[existingEntryIndex];
      let updatedItems;
      if (isEditMode) {
        const originalEditIndex = getOriginalIndex(editIndex!);
        if (originalEditIndex === -1) {
          console.error(
            "DailyEntryScreen: Error updating entry - Could not find original index."
          );
          Alert.alert("Update Error", "Internal error updating entry.");
          setIsOverlayVisible(false);
          setIsSaving(false);
          return;
        }
        console.log(`Updating item at original index ${originalEditIndex}`);
        updatedItems = existingEntry.items.map((item, index) =>
          index === originalEditIndex ? entryItem : item
        );
      } else {
        console.log("Adding new single item to existing date entry.");
        updatedItems = [entryItem, ...(existingEntry.items ?? [])];
      }
      const updatedEntry = { ...existingEntry, items: updatedItems };
      updatedEntries = dailyEntries.map((entry, index) =>
        index === existingEntryIndex ? updatedEntry : entry
      );
    } else {
      if (isEditMode) {
        console.error(
          "DailyEntryScreen: Error - Trying to edit entry for non-existent date."
        );
        Alert.alert(
          "Update Error",
          "Cannot edit entry for a day with no entries."
        );
        setIsOverlayVisible(false);
        setIsSaving(false);
        return;
      }
      console.log("Creating new date entry with the first item.");
      const newDailyEntry: DailyEntry = {
        date: selectedDate,
        items: [entryItem],
      };
      updatedEntries = [...dailyEntries, newDailyEntry];
      updatedEntries.sort((a, b) => a.date.localeCompare(b.date));
    }
    await updateAndSaveEntries(updatedEntries);
    if (foodIcons[selectedFood.name] === undefined)
      triggerIconFetches([selectedFood], [], selectedDate);
    setSelectedFood(null);
    setGrams("");
    setEditIndex(null);
    setIsOverlayVisible(false);
    setSearch("");
    Toast.show({
      type: "success",
      text1: `Entry ${isEditMode ? "updated" : "added"}`,
      position: "bottom",
      visibilityTime: 2000,
    });
  }, [
    selectedFood,
    grams,
    editIndex,
    dailyEntries,
    selectedDate,
    isSaving,
    getOriginalIndex,
    updateAndSaveEntries,
    foodIcons,
    triggerIconFetches,
  ]);

  const handleAddMultipleEntries = useCallback(
    async (entriesToAdd: { food: Food; grams: number }[]) => {
      // (unchanged)
      if (isSaving) return;
      console.log(
        `DailyEntryScreen: handleAddMultipleEntries START - Received ${entriesToAdd.length} items for ${selectedDate}`
      );
      try {
        if (!entriesToAdd || entriesToAdd.length === 0) {
          console.warn("handleAddMultipleEntries called with no items.");
          return;
        }
        const newItems: DailyEntryItem[] = entriesToAdd.map((entry) => ({
          food: entry.food,
          grams: entry.grams,
        }));
        console.log(
          `DailyEntryScreen: Mapped to ${newItems.length} DailyEntryItems.`
        );
        const existingEntryIndex = dailyEntries.findIndex(
          (entry) => entry.date === selectedDate
        );
        let updatedEntries: DailyEntry[];
        if (existingEntryIndex > -1) {
          console.log(`Appending ${newItems.length} items to existing entry.`);
          const existingEntry = dailyEntries[existingEntryIndex];
          const updatedItems = [...newItems, ...(existingEntry.items ?? [])];
          const updatedEntry = { ...existingEntry, items: updatedItems };
          updatedEntries = dailyEntries.map((entry, index) =>
            index === existingEntryIndex ? updatedEntry : entry
          );
        } else {
          console.log(`Creating new entry with ${newItems.length} items.`);
          const newDailyEntry: DailyEntry = {
            date: selectedDate,
            items: newItems,
          };
          updatedEntries = [...dailyEntries, newDailyEntry];
          updatedEntries.sort((a, b) => a.date.localeCompare(b.date));
        }
        await updateAndSaveEntries(updatedEntries);
        console.log("Update completed for multiple items.");
        const foodsToFetchIconsFor = newItems.map((item) => item.food);
        triggerIconFetches(foodsToFetchIconsFor, [], selectedDate);
        Toast.show({
          type: "success",
          text1: `${entriesToAdd.length} item(s) added`,
          text2: `to ${formatDateReadable(parseISO(selectedDate))}`,
          position: "bottom",
          visibilityTime: 3000,
        });
        setIsOverlayVisible(false);
        setSelectedFood(null);
        setGrams("");
        setEditIndex(null);
        setSearch("");
      } catch (error) {
        console.error(
          "DailyEntryScreen: Error in handleAddMultipleEntries:",
          error
        );
        Alert.alert(
          "Quick Add Error",
          `Failed to add items. ${
            error instanceof Error ? error.message : "Please try again."
          }`
        );
        setIsOverlayVisible(false);
      }
    },
    [
      dailyEntries,
      selectedDate,
      isSaving,
      updateAndSaveEntries,
      triggerIconFetches,
    ]
  );

  const handleSelectFood = (item: Food | null) => {
    // (unchanged)
    console.log("Modal selecting food:", item?.name ?? "null");
    setSelectedFood(item);
    if (item && editIndex === null) setGrams("");
  };

  const handleRemoveEntry = useCallback(
    async (reversedIndex: number) => {
      // (unchanged)
      if (isSaving) return;
      const originalIndex = getOriginalIndex(reversedIndex);
      if (originalIndex === -1) {
        console.error(
          `handleRemoveEntry: Invalid reversedIndex ${reversedIndex}`
        );
        return;
      }
      const currentEntry = dailyEntries.find((e) => e.date === selectedDate);
      if (!currentEntry || originalIndex >= currentEntry.items.length) {
        console.error(
          `handleRemoveEntry: Cannot find entry or item at index ${originalIndex}`
        );
        return;
      }
      const itemToRemove = currentEntry.items[originalIndex];
      console.log(
        `Removing item at index ${originalIndex}: ${itemToRemove.food.name}`
      );
      const updatedItems = currentEntry.items.filter(
        (_, i) => i !== originalIndex
      );
      let finalEntries: DailyEntry[];
      if (updatedItems.length === 0) {
        console.log(`Removing last item for date ${selectedDate}.`);
        finalEntries = dailyEntries.filter(
          (entry) => entry.date !== selectedDate
        );
      } else {
        const updatedEntry = { ...currentEntry, items: updatedItems };
        finalEntries = dailyEntries.map((entry) =>
          entry.date === selectedDate ? updatedEntry : entry
        );
      }
      await updateAndSaveEntries(finalEntries);
      Toast.show({
        type: "info",
        text1: `${itemToRemove.food.name} removed`,
        text2: "Tap here to undo",
        position: "bottom",
        bottomOffset: 80,
        visibilityTime: 4000,
        onPress: () =>
          handleUndoRemoveEntry(itemToRemove, selectedDate, originalIndex),
      });
    },
    [
      dailyEntries,
      selectedDate,
      isSaving,
      getOriginalIndex,
      updateAndSaveEntries,
    ]
  );

  const handleUndoRemoveEntry = useCallback(
    async (
      itemToRestore: DailyEntryItem,
      entryDate: string,
      originalIndex: number
    ) => {
      // (unchanged)
      if (isSaving) return;
      console.log(
        `Undoing removal of ${itemToRestore.food.name} at index ${originalIndex} on ${entryDate}`
      );
      const existingEntryIndex = dailyEntries.findIndex(
        (e) => e.date === entryDate
      );
      let updatedEntries;
      if (existingEntryIndex > -1) {
        const entryToUpdate = dailyEntries[existingEntryIndex];
        const updatedItems = [...entryToUpdate.items];
        updatedItems.splice(originalIndex, 0, itemToRestore);
        const restoredEntry = { ...entryToUpdate, items: updatedItems };
        updatedEntries = dailyEntries.map((entry, index) =>
          index === existingEntryIndex ? restoredEntry : entry
        );
        console.log(`Item inserted back.`);
      } else {
        console.log(`Creating new entry for date ${entryDate}.`);
        const newEntry: DailyEntry = {
          date: entryDate,
          items: [itemToRestore],
        };
        updatedEntries = [...dailyEntries, newEntry];
        updatedEntries.sort((a, b) => a.date.localeCompare(b.date));
      }
      await updateAndSaveEntries(updatedEntries);
      Toast.hide();
      Toast.show({
        type: "success",
        text1: "Entry restored!",
        visibilityTime: 1500,
        position: "bottom",
      });
    },
    [dailyEntries, isSaving, updateAndSaveEntries]
  );

  const updateSearch = (search: string) => setSearch(search); // (unchanged)

  // --- Modal Toggle Logic ---
  const toggleOverlay = useCallback(
    (
      itemToEdit: DailyEntryItem | null = null,
      reversedIndex: number | null = null
    ) => {
      // (unchanged)
      if (isSaving) {
        console.warn("Attempted to toggle modal while saving.");
        return;
      }
      setSelectedFood(null);
      setGrams("");
      setEditIndex(null);
      setSearch(""); // Clear general state first
      if (itemToEdit && reversedIndex !== null) {
        console.log(
          `Opening modal to edit '${itemToEdit.food.name}' at reversed index ${reversedIndex}`
        );
        setSelectedFood(itemToEdit.food);
        setGrams(String(itemToEdit.grams));
        setEditIndex(reversedIndex);
      }
      setIsOverlayVisible((current) => !current);
    },
    [isSaving]
  );

  const handleEditEntryViaModal = (
    item: DailyEntryItem,
    reversedIndex: number
  ) => toggleOverlay(item, reversedIndex); // (unchanged)

  // --- Date Navigation Handlers ---
  const handleDateChange = useCallback(
    (event: DateTimePickerEvent, selectedDateValue?: Date) => {
      // (unchanged)
      const isAndroidDismiss =
        Platform.OS === "android" && event.type === "dismissed";
      setShowDatePicker(Platform.OS === "ios");
      if (!isAndroidDismiss && event.type === "set" && selectedDateValue) {
        if (isValid(selectedDateValue)) {
          const formattedDate = formatISO(selectedDateValue, {
            representation: "date",
          });
          if (formattedDate !== selectedDate) {
            console.log(`Date changed to: ${formattedDate}`);
            setSelectedDate(formattedDate);
            setEditIndex(null);
          }
        } else {
          console.warn("Invalid date:", selectedDateValue);
          Alert.alert("Invalid Date", "Selected date is not valid.");
        }
      }
      if (Platform.OS === "android") setShowDatePicker(false);
    },
    [selectedDate]
  );

  const handlePreviousDay = useCallback(() => {
    // (unchanged)
    try {
      const currentDateObj = parseISO(selectedDate);
      if (!isValid(currentDateObj)) {
        console.error("Error parsing date:", selectedDate);
        return;
      }
      const newDate = subDays(currentDateObj, 1);
      const newDateString = formatISO(newDate, { representation: "date" });
      console.log(`Navigating prev: ${newDateString}`);
      setSelectedDate(newDateString);
      setEditIndex(null);
    } catch (e) {
      console.error("Error calculating prev day:", selectedDate, e);
    }
  }, [selectedDate]);

  const handleNextDay = useCallback(() => {
    // (unchanged)
    try {
      const currentDateObj = parseISO(selectedDate);
      if (!isValid(currentDateObj)) {
        console.error("Error parsing date:", selectedDate);
        return;
      }
      const newDate = addDays(currentDateObj, 1);
      const newDateString = formatISO(newDate, { representation: "date" });
      console.log(`Navigating next: ${newDateString}`);
      setSelectedDate(newDateString);
      setEditIndex(null);
    } catch (e) {
      console.error("Error calculating next day:", selectedDate, e);
    }
  }, [selectedDate]);

  // --- Totals Calculation ---
  const calculateTotals = useMemo(() => {
    // (unchanged)
    const currentOriginalEntry = dailyEntries.find(
      (entry) => entry.date === selectedDate
    );
    let totals = {
      totalCalories: 0,
      totalProtein: 0,
      totalCarbs: 0,
      totalFat: 0,
    };
    if (currentOriginalEntry) {
      currentOriginalEntry.items.forEach((item) => {
        if (
          item.food &&
          typeof item.food.calories === "number" &&
          typeof item.food.protein === "number" &&
          typeof item.food.carbs === "number" &&
          typeof item.food.fat === "number" &&
          typeof item.grams === "number" &&
          item.grams > 0
        ) {
          const factor = item.grams / 100;
          totals.totalCalories += item.food.calories * factor;
          totals.totalProtein += item.food.protein * factor;
          totals.totalCarbs += item.food.carbs * factor;
          totals.totalFat += item.food.fat * factor;
        } else console.warn("Skipping item in total calculation:", item);
      });
    }
    return {
      totalCalories: Math.round(totals.totalCalories),
      totalProtein: Math.round(totals.totalProtein),
      totalCarbs: Math.round(totals.totalCarbs),
      totalFat: Math.round(totals.totalFat),
    };
  }, [dailyEntries, selectedDate]);

  // --- Main Render ---
  return (
    <SafeAreaView style={styles.container} edges={["top", "left", "right"]}>
      {/* Date Navigation using DateNavigator Component */}
      <DateNavigator
        selectedDate={selectedDate}
        onPreviousDay={handlePreviousDay}
        onNextDay={handleNextDay}
        onShowDatePicker={() =>
          !isSaving && !isLoadingData && setShowDatePicker(true)
        }
        isSaving={isSaving}
        isLoadingData={isLoadingData}
      />

      {/* Date Picker (unchanged) */}
      {showDatePicker && (
        <DateTimePicker
          value={parseISO(selectedDate)}
          mode="date"
          display={Platform.OS === "ios" ? "spinner" : "default"}
          onChange={handleDateChange}
        />
      )}

      {/* Progress Section (unchanged) */}
      <View style={styles.progressContainer}>
        <DailyProgress
          calories={calculateTotals.totalCalories}
          protein={calculateTotals.totalProtein}
          carbs={calculateTotals.totalCarbs}
          fat={calculateTotals.totalFat}
          goals={dailyGoals}
        />
      </View>
      <Divider style={styles.divider} />

      {/* Saving Indicator (unchanged) */}
      {isSaving && (
        <View style={styles.savingIndicator}>
          
          <ActivityIndicator size="small" color={theme.colors.primary} />
          <Text style={styles.savingText}>Saving...</Text>
        </View>
      )}

      <Text style={styles.sectionTitle}> Today's Entries </Text>

      {/* Entries List */}
      {isLoadingData ? (
        <View style={styles.centeredLoader}>
          
          <ActivityIndicator size="large" color={theme.colors.primary} />
          <Text style={styles.loadingText}>Loading Entries...</Text>
        </View>
      ) : (
        <FlatList
          data={currentEntryItems}
          keyExtractor={(item, index) =>
            `entry-${item?.food?.id ?? "unknown"}-${getOriginalIndex(index)}-${
              item?.grams ?? index
            }`
          }
          // Use DailyEntryListItem Component
          renderItem={({ item, index }) => (
            <DailyEntryListItem
              item={item}
              reversedIndex={index}
              foodIcons={foodIcons}
              setFoodIcons={setFoodIcons}
              onEdit={handleEditEntryViaModal} // Pass modal edit handler
              onRemove={handleRemoveEntry} // Pass remove handler
              isSaving={isSaving}
            />
          )}
          ListEmptyComponent={
            <View style={styles.emptyListContainer}>
              
              <RNEIcon
                name="reader-outline"
                type="ionicon"
                size={50}
                color={theme.colors.grey3}
              />
              <Text style={styles.emptyListText}>
                No entries recorded for this day.
              </Text>
              <Text style={styles.emptyListSubText}>
                Tap '+' to add your first meal.
              </Text>
            </View>
          }
          initialNumToRender={10}
          maxToRenderPerBatch={5}
          windowSize={11}
          contentContainerStyle={styles.listContentContainer}
          keyboardShouldPersistTaps="handled"
        />
      )}

      {/* FAB (unchanged) */}
      <FAB
        icon={<RNEIcon name="add" color="white" />}
        color={theme.colors.primary}
        onPress={() => !isSaving && toggleOverlay()}
        placement="right"
        size="large"
        style={styles.fab}
        disabled={isSaving || isLoadingData}
      />

      {/* Add/Edit Modal (unchanged) */}
      <AddEntryModal
        isVisible={isOverlayVisible}
        toggleOverlay={toggleOverlay}
        selectedFood={selectedFood}
        grams={grams}
        setGrams={setGrams}
        foods={foods}
        handleAddEntry={handleSingleEntryAction}
        handleAddMultipleEntries={handleAddMultipleEntries}
        handleSelectFood={handleSelectFood}
        search={search}
        updateSearch={updateSearch}
        isEditMode={editIndex !== null}
        initialGrams={editIndex !== null ? grams : undefined}
      />
    </SafeAreaView>
  );
};

// --- Styles --- (Removed inline RenderItem styles, DateNavigator styles moved)
const useStyles = makeStyles((theme) => ({
  container: { flex: 1, backgroundColor: theme.colors.background },
  progressContainer: { paddingHorizontal: 15, paddingTop: 10 },
  divider: {
    marginVertical: 0,
    height: StyleSheet.hairlineWidth,
    backgroundColor: theme.colors.divider,
  },
  sectionTitle: {
    marginTop: 15,
    marginBottom: 10,
    paddingHorizontal: 15,
    fontWeight: "bold",
    fontSize: 18,
    color: theme.colors.text,
  },
  fab: { position: "absolute", margin: 16, right: 10, bottom: 10 },
  emptyListContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 30,
    marginTop: 50,
  },
  emptyListText: {
    fontSize: 17,
    color: theme.colors.grey2,
    textAlign: "center",
    marginTop: 15,
  },
  emptyListSubText: {
    fontSize: 14,
    color: theme.colors.grey3,
    textAlign: "center",
    marginTop: 8,
  },
  centeredLoader: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingBottom: 50,
  },
  loadingText: { marginTop: 10, color: theme.colors.grey2, fontSize: 16 },
  savingIndicator: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 5,
    backgroundColor: theme.colors.grey5,
  },
  savingText: {
    marginLeft: 8,
    color: theme.colors.primary,
    fontSize: 14,
    fontStyle: "italic",
  },
  listContentContainer: { paddingBottom: 80 },
}));

export default DailyEntryScreen;

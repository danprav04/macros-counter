// ---------- src/screens/DailyEntryScreen.tsx ----------
// src/screens/DailyEntryScreen.tsx
import React, { useState, useEffect, useCallback, useMemo, useRef } from "react"; // Added useRef
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
import { getFoodIconUrl } from "../utils/iconUtils"; // Correct import
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
  // Ref to hold the current foodIcons state for checking inside triggerIconPrefetch without causing dependency loop
  const foodIconsRef = useRef(foodIcons);
  useEffect(() => {
    foodIconsRef.current = foodIcons;
  }, [foodIcons]);


  // --- Icon Pre-fetching Trigger ---
  // **** IMPORTANT FIX: Removed foodIcons from dependency array ****
  const triggerIconPrefetch = useCallback((entries: DailyEntry[], currentSelectedDate: string) => {
      const uniqueFoodNames = new Set<string>();
      entries.forEach(entry => {
          if (entry.date === currentSelectedDate && entry.items) {
              entry.items.forEach(item => {
                  if (item.food?.name) {
                      uniqueFoodNames.add(item.food.name);
                  }
              });
          }
      });

      if (uniqueFoodNames.size > 0) {
          console.log(`DailyEntryScreen: Triggering pre-fetch for ${uniqueFoodNames.size} unique names on date ${currentSelectedDate}...`);
          const currentIcons = foodIconsRef.current; // Read current icons from ref
          const prefetchPromises = Array.from(uniqueFoodNames).map(name => {
              // Check *current* status from ref, not state dependency
              if (currentIcons[name] === undefined) {
                  // Set state to loading IF NOT ALREADY SET (prevents infinite triggers if fetch fails quickly)
                  // We check state here because ref might not update instantly if fetch starts immediately
                   if (foodIconsRef.current[name] === undefined) {
                      setFoodIcons(prev => ({...prev, [name]: undefined}));
                   }
                  // Fetch and update state directly in promise handlers
                  return getFoodIconUrl(name).then(url => {
                      setFoodIcons(prev => ({...prev, [name]: url}));
                  }).catch(err => {
                      console.warn(`Icon pre-fetch failed for ${name}:`, err);
                      setFoodIcons(prev => ({...prev, [name]: null}));
                  });
              }
              return Promise.resolve(); // Already known/loading
          });

          Promise.allSettled(prefetchPromises).then(() => {
              console.log(`DailyEntryScreen: Icon pre-fetch settle completed for date ${currentSelectedDate}.`);
          });
      } else {
          console.log(`DailyEntryScreen: No unique food names found to pre-fetch for date ${currentSelectedDate}.`);
      }
  // **** REMOVED foodIcons FROM DEPENDENCIES ****
  // Now depends only on external variables, should be stable unless they change
  }, []); // Empty dependency array (or add stable external fns if needed)


  // --- Data Loading ---
  // **** IMPORTANT FIX: Removed triggerIconPrefetch from dependency array ****
  // triggerIconPrefetch is now stable due to its own empty dependency array
  const loadData = useCallback(async () => {
    console.log(`DailyEntryScreen: Loading data for date: ${selectedDate}`);
    setIsLoadingData(true);
    try {
      const [loadedFoods, loadedEntries, loadedSettings] = await Promise.all([
        getFoods(),
        loadDailyEntries(),
        loadSettings(),
      ]);
      const currentGoals = loadedSettings?.dailyGoals ?? { calories: 2000, protein: 150, carbs: 200, fat: 70, };
      setDailyGoals(currentGoals);
      loadedFoods.sort((a, b) => a.name.localeCompare(b.name));
      setFoods(loadedFoods);
      setDailyEntries(loadedEntries);
      console.log( `DailyEntryScreen: Loaded ${loadedFoods.length} foods, ${loadedEntries.length} entry days.` );
      // Call the stable pre-fetch function
      triggerIconPrefetch(loadedEntries, selectedDate);
    } catch (error) {
      console.error("DailyEntryScreen: Error loading data:", error);
      Alert.alert("Load Error", "Failed to load necessary data.");
      setFoods([]); setDailyEntries([]); setDailyGoals({ calories: 0, protein: 0, carbs: 0, fat: 0 });
    } finally {
      setIsLoadingData(false);
    }
  // **** Only depends on selectedDate now ****
  }, [selectedDate, triggerIconPrefetch]); // Keep triggerIconPrefetch here, but it's stable now


  // --- Focus Effect ---
  // **** IMPORTANT FIX: loadData dependency is now stable unless selectedDate changes ****
  useFocusEffect(
    useCallback(() => {
      console.log("DailyEntryScreen: Focused. Running effect.");
      loadData(); // Runs on focus or if selectedDate changes (via loadData dependency)
      return () => {
        console.log("DailyEntryScreen: Cleanup effect run (blur or dependency change).");
        // Cleanup logic remains the same
        setSearch("");
        setIsOverlayVisible(false);
        setEditIndex(null);
      };
    }, [loadData]) // Dependency on loadData is now correct and stable
  );

  // --- List and Index Management (Unchanged) ---
  const currentEntryItems = useMemo(() => {
    const entry = dailyEntries.find((e) => e.date === selectedDate);
    return entry ? [...entry.items].reverse() : [];
  }, [dailyEntries, selectedDate]);

  const getOriginalIndex = useCallback(
    (reversedIndex: number): number => {
      const entry = dailyEntries.find((e) => e.date === selectedDate);
      if (!entry || reversedIndex < 0 || reversedIndex >= entry.items.length) {
        console.error( `getOriginalIndex: Invalid reversedIndex ${reversedIndex} for entry length ${entry?.items?.length}` );
        return -1;
      }
      return entry.items.length - 1 - reversedIndex;
    },
    [dailyEntries, selectedDate]
  );

  // --- State Update Helper (Unchanged) ---
  const updateAndSaveEntries = useCallback(
    async (updatedEntries: DailyEntry[]) => {
      setIsSaving(true);
      const previousEntries = dailyEntries; // Store previous state for potential revert
      const entryForSelectedDate = updatedEntries.find( (e) => e.date === selectedDate );
      console.log( `DailyEntryScreen: updateAndSaveEntries called. Saving ${updatedEntries.length} total entries.` );
      console.log( `Entry for ${selectedDate} contains ${ entryForSelectedDate?.items?.length ?? 0 } items.` );
      setDailyEntries(updatedEntries); // Optimistic UI update
      try {
        await saveDailyEntries(updatedEntries);
        console.log( "DailyEntryScreen: Successfully saved updated entries to storage." );
      } catch (error) {
        console.error( "DailyEntryScreen: Failed to save updated entries to storage:", error );
        Alert.alert("Save Error", "Could not save changes. Please try again.");
        // Revert UI on save failure
        setDailyEntries(previousEntries);
      } finally {
        setIsSaving(false);
      }
    },
    [selectedDate, dailyEntries] // Add dailyEntries here so previous state is captured correctly
  );

  // --- Add/Update/Remove Handlers (Only minor change: removed explicit triggerIconFetch) ---
  const handleSingleEntryAction = useCallback(async () => {
    if (isSaving) return;
    if (!selectedFood || !selectedFood.id) { Alert.alert("Food Not Selected", "Please select a valid food item."); return; }
    const trimmedGrams = grams.trim();
    if (!isValidNumberInput(trimmedGrams) || parseFloat(trimmedGrams) <= 0) { Alert.alert( "Invalid Amount", "Please enter a valid positive number for grams." ); return; }
    const numericGrams = parseFloat(trimmedGrams);
    const entryItem: DailyEntryItem = { food: selectedFood, grams: numericGrams };
    const isEditMode = editIndex !== null;
    const existingEntryIndex = dailyEntries.findIndex( (entry) => entry.date === selectedDate );
    let updatedEntries: DailyEntry[];
    if (existingEntryIndex > -1) {
      const existingEntry = dailyEntries[existingEntryIndex]; let updatedItems;
      if (isEditMode) {
        const originalEditIndex = getOriginalIndex(editIndex!);
        if (originalEditIndex === -1) { console.error("..."); Alert.alert("..."); return; }
        updatedItems = existingEntry.items.map((item, index) => index === originalEditIndex ? entryItem : item );
      } else { updatedItems = [entryItem, ...(existingEntry.items ?? [])]; }
      const updatedEntry = { ...existingEntry, items: updatedItems };
      updatedEntries = dailyEntries.map((entry, index) => index === existingEntryIndex ? updatedEntry : entry );
    } else {
      if (isEditMode) { console.error("..."); Alert.alert("..."); return; }
      const newDailyEntry: DailyEntry = { date: selectedDate, items: [entryItem] };
      updatedEntries = [...dailyEntries, newDailyEntry];
      updatedEntries.sort((a, b) => a.date.localeCompare(b.date));
    }
    await updateAndSaveEntries(updatedEntries);

    // No need to explicitly trigger icon fetch here, pre-fetch should handle it,
    // and iconUtils already fetches if needed on render.

    setSelectedFood(null); setGrams(""); setEditIndex(null);
    setIsOverlayVisible(false); setSearch("");
    Toast.show({ type: "success", text1: `Entry ${isEditMode ? "updated" : "added"}`, position: "bottom", visibilityTime: 2000, });
  }, [ selectedFood, grams, editIndex, dailyEntries, selectedDate, isSaving, getOriginalIndex, updateAndSaveEntries ]);

  const handleAddMultipleEntries = useCallback(
    async (entriesToAdd: { food: Food; grams: number }[]) => {
      if (isSaving) return;
      try {
        if (!entriesToAdd || entriesToAdd.length === 0) { return; }
        const newItems: DailyEntryItem[] = entriesToAdd.map((entry) => ({ food: entry.food, grams: entry.grams }));
        const existingEntryIndex = dailyEntries.findIndex((entry) => entry.date === selectedDate);
        let updatedEntries: DailyEntry[];
        if (existingEntryIndex > -1) {
          const existingEntry = dailyEntries[existingEntryIndex];
          const updatedItems = [...newItems, ...(existingEntry.items ?? [])];
          const updatedEntry = { ...existingEntry, items: updatedItems };
          updatedEntries = dailyEntries.map((entry, index) => index === existingEntryIndex ? updatedEntry : entry );
        } else {
          const newDailyEntry: DailyEntry = { date: selectedDate, items: newItems };
          updatedEntries = [...dailyEntries, newDailyEntry];
          updatedEntries.sort((a, b) => a.date.localeCompare(b.date));
        }
        await updateAndSaveEntries(updatedEntries);

        // No need to explicitly trigger icon fetch here

        Toast.show({ type: "success", text1: `${entriesToAdd.length} item(s) added`, text2: `to ${formatDateReadable(parseISO(selectedDate))}`, position: "bottom", visibilityTime: 3000, });
        setIsOverlayVisible(false); setSelectedFood(null); setGrams("");
        setEditIndex(null); setSearch("");
      } catch (error) { console.error("...", error); Alert.alert("...", `...`); setIsOverlayVisible(false); }
    }, [ dailyEntries, selectedDate, isSaving, updateAndSaveEntries ]
  );

  const handleSelectFood = (item: Food | null) => { // Unchanged
    setSelectedFood(item);
    if (item && editIndex === null) setGrams("");
  };

  const handleRemoveEntry = useCallback( async (reversedIndex: number) => { // Unchanged
      if (isSaving) return;
      const originalIndex = getOriginalIndex(reversedIndex); if (originalIndex === -1) return;
      const currentEntry = dailyEntries.find((e) => e.date === selectedDate); if (!currentEntry || originalIndex >= currentEntry.items.length) return;
      const itemToRemove = currentEntry.items[originalIndex];
      const updatedItems = currentEntry.items.filter((_, i) => i !== originalIndex); let finalEntries: DailyEntry[];
      if (updatedItems.length === 0) { finalEntries = dailyEntries.filter((entry) => entry.date !== selectedDate); }
      else { const updatedEntry = { ...currentEntry, items: updatedItems }; finalEntries = dailyEntries.map((entry) => entry.date === selectedDate ? updatedEntry : entry ); }
      await updateAndSaveEntries(finalEntries);
      Toast.show({ type: "info", text1: `${itemToRemove.food.name} removed`, text2: "Tap here to undo", position: "bottom", bottomOffset: 80, visibilityTime: 4000, onPress: () => handleUndoRemoveEntry(itemToRemove, selectedDate, originalIndex), });
    }, [ dailyEntries, selectedDate, isSaving, getOriginalIndex, updateAndSaveEntries ]
  );

  const handleUndoRemoveEntry = useCallback( async ( itemToRestore: DailyEntryItem, entryDate: string, originalIndex: number ) => { // Unchanged
      if (isSaving) return;
      const existingEntryIndex = dailyEntries.findIndex((e) => e.date === entryDate); let updatedEntries;
      if (existingEntryIndex > -1) {
        const entryToUpdate = dailyEntries[existingEntryIndex]; const updatedItems = [...entryToUpdate.items];
        updatedItems.splice(originalIndex, 0, itemToRestore);
        const restoredEntry = { ...entryToUpdate, items: updatedItems };
        updatedEntries = dailyEntries.map((entry, index) => index === existingEntryIndex ? restoredEntry : entry );
      } else {
        const newEntry: DailyEntry = { date: entryDate, items: [itemToRestore] };
        updatedEntries = [...dailyEntries, newEntry]; updatedEntries.sort((a, b) => a.date.localeCompare(b.date));
      }
      await updateAndSaveEntries(updatedEntries); Toast.hide();
      Toast.show({ type: "success", text1: "Entry restored!", visibilityTime: 1500, position: "bottom" });
    }, [ dailyEntries, isSaving, updateAndSaveEntries ]
  );

  const updateSearch = (search: string) => setSearch(search); // Unchanged

  const toggleOverlay = useCallback( ( itemToEdit: DailyEntryItem | null = null, reversedIndex: number | null = null ) => { // Unchanged
      if (isSaving) return;
      setSelectedFood(null); setGrams(""); setEditIndex(null); setSearch("");
      if (itemToEdit && reversedIndex !== null) {
        setSelectedFood(itemToEdit.food); setGrams(String(itemToEdit.grams)); setEditIndex(reversedIndex);
      }
      setIsOverlayVisible((current) => !current);
    }, [isSaving]
  );

  const handleEditEntryViaModal = ( item: DailyEntryItem, reversedIndex: number ) => toggleOverlay(item, reversedIndex); // Unchanged

  const handleDateChange = useCallback( (event: DateTimePickerEvent, selectedDateValue?: Date) => { // Unchanged
      const isAndroidDismiss = Platform.OS === "android" && event.type === "dismissed";
      setShowDatePicker(Platform.OS === "ios");
      if (!isAndroidDismiss && event.type === "set" && selectedDateValue) {
        if (isValid(selectedDateValue)) {
          const formattedDate = formatISO(selectedDateValue, { representation: "date" });
          if (formattedDate !== selectedDate) {
            setSelectedDate(formattedDate); setEditIndex(null);
          }
        } else { Alert.alert("Invalid Date", "Selected date is not valid."); }
      }
      if (Platform.OS === "android") setShowDatePicker(false);
    }, [selectedDate]
  );

  const handlePreviousDay = useCallback(() => { // Unchanged
    if (isSaving || isLoadingData) return;
    try {
      const currentDateObj = parseISO(selectedDate); if (!isValid(currentDateObj)) return;
      const newDate = subDays(currentDateObj, 1); const newDateString = formatISO(newDate, { representation: "date" });
      setSelectedDate(newDateString); setEditIndex(null);
    } catch (e) { console.error("...", e); }
  }, [selectedDate, isSaving, isLoadingData]);

  const handleNextDay = useCallback(() => { // Unchanged
     if (isSaving || isLoadingData) return;
    try {
      const currentDateObj = parseISO(selectedDate); if (!isValid(currentDateObj)) return;
      const newDate = addDays(currentDateObj, 1); const newDateString = formatISO(newDate, { representation: "date" });
      setSelectedDate(newDateString); setEditIndex(null);
    } catch (e) { console.error("...", e); }
  }, [selectedDate, isSaving, isLoadingData]);

  const calculateTotals = useMemo(() => { // Unchanged
    const currentOriginalEntry = dailyEntries.find((entry) => entry.date === selectedDate);
    let totals = { totalCalories: 0, totalProtein: 0, totalCarbs: 0, totalFat: 0 };
    if (currentOriginalEntry) {
      currentOriginalEntry.items.forEach((item) => {
        if ( item.food && typeof item.food.calories === "number" && typeof item.food.protein === "number" && typeof item.food.carbs === "number" && typeof item.food.fat === "number" && typeof item.grams === "number" && item.grams > 0 ) {
          const factor = item.grams / 100; totals.totalCalories += item.food.calories * factor; totals.totalProtein += item.food.protein * factor; totals.totalCarbs += item.food.carbs * factor; totals.totalFat += item.food.fat * factor;
        } else console.warn("...");
      });
    }
    return { totalCalories: Math.round(totals.totalCalories), totalProtein: Math.round(totals.totalProtein), totalCarbs: Math.round(totals.totalCarbs), totalFat: Math.round(totals.totalFat), };
  }, [dailyEntries, selectedDate]);

  // --- Main Render (Unchanged) ---
  return (
    <SafeAreaView style={styles.container} edges={["top", "left", "right"]}>
      <DateNavigator
        selectedDate={selectedDate} onPreviousDay={handlePreviousDay} onNextDay={handleNextDay}
        onShowDatePicker={() => !isSaving && !isLoadingData && setShowDatePicker(true)}
        isSaving={isSaving} isLoadingData={isLoadingData}
      />
      {showDatePicker && ( <DateTimePicker value={parseISO(selectedDate)} mode="date" display={Platform.OS === "ios" ? "spinner" : "default"} onChange={handleDateChange} /> )}
      <View style={styles.progressContainer}>
        <DailyProgress calories={calculateTotals.totalCalories} protein={calculateTotals.totalProtein} carbs={calculateTotals.totalCarbs} fat={calculateTotals.totalFat} goals={dailyGoals} />
      </View>
      <Divider style={styles.divider} />
      {isSaving && ( <View style={styles.savingIndicator}><ActivityIndicator size="small" color={theme.colors.primary} /><Text style={styles.savingText}>Saving...</Text></View> )}
      <Text style={styles.sectionTitle}> Today's Entries </Text>
      {isLoadingData ? ( <View style={styles.centeredLoader}><ActivityIndicator size="large" color={theme.colors.primary} /><Text style={styles.loadingText}>Loading Entries...</Text></View>
      ) : (
        <FlatList
          data={currentEntryItems} keyExtractor={(item, index) => `entry-${item?.food?.id ?? "unknown"}-${getOriginalIndex(index)}-${ item?.grams ?? index }`}
          renderItem={({ item, index }) => ( <DailyEntryListItem item={item} reversedIndex={index} foodIcons={foodIcons} setFoodIcons={setFoodIcons} onEdit={handleEditEntryViaModal} onRemove={handleRemoveEntry} isSaving={isSaving} /> )}
          ListEmptyComponent={ <View style={styles.emptyListContainer}><RNEIcon name="reader-outline" type="ionicon" size={50} color={theme.colors.grey3} /><Text style={styles.emptyListText}> No entries recorded for this day. </Text><Text style={styles.emptyListSubText}> Tap '+' to add your first meal. </Text></View> }
          initialNumToRender={10} maxToRenderPerBatch={5} windowSize={11} contentContainerStyle={styles.listContentContainer} keyboardShouldPersistTaps="handled"
        />
      )}
      <FAB icon={<RNEIcon name="add" color="white" />} color={theme.colors.primary} onPress={() => !isSaving && toggleOverlay()} placement="right" size="large" style={styles.fab} disabled={isSaving || isLoadingData} />
      <AddEntryModal
        isVisible={isOverlayVisible} toggleOverlay={toggleOverlay} selectedFood={selectedFood} grams={grams} setGrams={setGrams} foods={foods}
        handleAddEntry={handleSingleEntryAction} handleAddMultipleEntries={handleAddMultipleEntries} handleSelectFood={handleSelectFood}
        search={search} updateSearch={updateSearch} isEditMode={editIndex !== null} initialGrams={editIndex !== null ? grams : undefined}
      />
    </SafeAreaView>
  );
};

// --- Styles (Unchanged) ---
const useStyles = makeStyles((theme) => ({
  container: { flex: 1, backgroundColor: theme.colors.background },
  progressContainer: { paddingHorizontal: 15, paddingTop: 10 },
  divider: { marginVertical: 0, height: StyleSheet.hairlineWidth, backgroundColor: theme.colors.divider, },
  sectionTitle: { marginTop: 15, marginBottom: 10, paddingHorizontal: 15, fontWeight: "bold", fontSize: 18, color: theme.colors.text, },
  fab: { position: "absolute", margin: 16, right: 10, bottom: 10 },
  emptyListContainer: { flex: 1, alignItems: "center", justifyContent: "center", padding: 30, marginTop: 50, },
  emptyListText: { fontSize: 17, color: theme.colors.grey2, textAlign: "center", marginTop: 15, },
  emptyListSubText: { fontSize: 14, color: theme.colors.grey3, textAlign: "center", marginTop: 8, },
  centeredLoader: { flex: 1, justifyContent: "center", alignItems: "center", paddingBottom: 50, },
  loadingText: { marginTop: 10, color: theme.colors.grey2, fontSize: 16 },
  savingIndicator: { flexDirection: "row", alignItems: "center", justifyContent: "center", paddingVertical: 5, backgroundColor: theme.colors.grey5, },
  savingText: { marginLeft: 8, color: theme.colors.primary, fontSize: 14, fontStyle: "italic", },
  listContentContainer: { paddingBottom: 80 },
}));

export default DailyEntryScreen;
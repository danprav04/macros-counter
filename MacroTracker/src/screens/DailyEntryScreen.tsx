// src/screens/DailyEntryScreen.tsx
import React, { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { View, FlatList, Alert, Platform, StyleSheet, ActivityIndicator, I18nManager } from "react-native";
import { DailyEntry, DailyEntryItem } from "../types/dailyEntry";
import { Food } from "../types/food";
import { getFoods, createFood, updateFood as updateFoodService } from "../services/foodService";
import { saveDailyEntries, loadDailyEntries, loadSettings } from "../services/storageService";
import { getTodayDateString, formatDateISO, formatDateReadableAsync } from "../utils/dateUtils";
import { isValidNumberInput } from "../utils/validationUtils"; // Keep this import
import DailyProgress from "../components/DailyProgress";
import { Text, FAB, makeStyles, useTheme, Divider, Icon as RNEIcon } from "@rneui/themed";
import DateTimePicker, { DateTimePickerEvent } from "@react-native-community/datetimepicker";
import { addDays, subDays, parseISO, formatISO, isValid } from "date-fns";
import { SafeAreaView } from "react-native-safe-area-context";
import AddEntryModal from "../components/AddEntryModal/AddEntryModal";
import "react-native-get-random-values";
import Toast from "react-native-toast-message";
import { useFocusEffect, useNavigation, useRoute, RouteProp } from "@react-navigation/native";
import { getFoodIconUrl } from "../utils/iconUtils";
import DateNavigator from "../components/DateNavigator";
import DailyEntryListItem from "../components/DailyEntryListItem";
import { t } from '../localization/i18n';
import i18n from '../localization/i18n';
import { Settings as AppSettings } from "../types/settings";
import { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';
import { MainTabParamList } from "../navigation/AppNavigator";

type DailyEntryScreenNavigationProp = BottomTabNavigationProp<MainTabParamList, 'DailyEntryRoute'>;
type DailyEntryScreenRouteProp = RouteProp<MainTabParamList, 'DailyEntryRoute'>;

const DailyEntryScreen: React.FC = () => {
  const [dailyEntries, setDailyEntries] = useState<DailyEntry[]>([]);
  const [selectedDate, setSelectedDate] = useState<string>(getTodayDateString());
  const [foods, setFoods] = useState<Food[]>([]);
  
  const [isOverlayVisible, setIsOverlayVisible] = useState(false);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [dailyGoals, setDailyGoals] = useState<AppSettings['dailyGoals']>({ calories: 2000, protein: 150, carbs: 200, fat: 70 });
  
  const [editIndex, setEditIndex] = useState<number | null>(null); // This is reversedIndex for editing
  const [initialGramsForEdit, setInitialGramsForEdit] = useState<string | undefined>(undefined);
  const [foodForEditModal, setFoodForEditModal] = useState<Food | null>(null);


  const [foodIcons, setFoodIcons] = useState<{ [foodName: string]: string | null | undefined; }>({});
  const [isLoadingData, setIsLoadingData] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [readableDate, setReadableDate] = useState('');
  const [pendingQuickAddFood, setPendingQuickAddFood] = useState<Food | null>(null);


  const { theme } = useTheme();
  const styles = useStyles();
  const foodIconsRef = useRef(foodIcons);
  useEffect(() => { foodIconsRef.current = foodIcons; }, [foodIcons]);

  const navigation = useNavigation<DailyEntryScreenNavigationProp>();
  const route = useRoute<DailyEntryScreenRouteProp>();

  useEffect(() => {
    const updateDateForToast = async () => {
      const formatted = await formatDateReadableAsync(parseISO(selectedDate));
      setReadableDate(formatted);
    };
    updateDateForToast();
  }, [selectedDate, i18n.locale]);

  const fetchAndSetIcon = useCallback(async (foodName: string) => {
    if (!foodName) return;
    if (foodIconsRef.current[foodName] === undefined) {
      setFoodIcons(prev => ({ ...prev, [foodName]: undefined }));
      try {
        const url = await getFoodIconUrl(foodName);
        setFoodIcons(prev => ({ ...prev, [foodName]: url }));
      } catch (error) {
        console.error(`Failed to fetch icon for ${foodName}:`, error);
        setFoodIcons(prev => ({ ...prev, [foodName]: null }));
      }
    }
  }, []);

  const triggerIconPrefetch = useCallback((entries: DailyEntry[], currentSelectedDate: string) => {
    const uniqueFoodNames = new Set<string>();
    entries.forEach(entry => { if (entry.date === currentSelectedDate && entry.items) { entry.items.forEach(item => { if (item.food?.name) uniqueFoodNames.add(item.food.name); }); } });

    if (uniqueFoodNames.size > 0) {
      Array.from(uniqueFoodNames).forEach(name => {
        fetchAndSetIcon(name);
      });
    }
  }, [fetchAndSetIcon]);

  const loadData = useCallback(async () => {
    setIsLoadingData(true);
    try {
      const [foodsResult, loadedEntries, loadedSettings] = await Promise.all([
        getFoods(),
        loadDailyEntries(),
        loadSettings(),
      ]);

      const loadedFoodsArray = foodsResult.items;

      setDailyGoals(loadedSettings?.dailyGoals ?? { calories: 2000, protein: 150, carbs: 200, fat: 70 });
      loadedFoodsArray.sort((a, b) => a.name.localeCompare(b.name));
      setFoods(loadedFoodsArray);
      setDailyEntries(loadedEntries);
      triggerIconPrefetch(loadedEntries, selectedDate);
    } catch (error) {
      console.error("Error in DailyEntryScreen loadData:", error);
      Alert.alert(t('dailyEntryScreen.errorLoad'), t('dailyEntryScreen.errorLoadMessage'));
      setFoods([]); setDailyEntries([]); setDailyGoals({ calories: 0, protein: 0, carbs: 0, fat: 0 });
    } finally {
      setIsLoadingData(false);
    }
  }, [selectedDate, triggerIconPrefetch]);

  useEffect(() => {
    const quickAddFoodParam = route.params?.quickAddFood;
    if (quickAddFoodParam) {
      setPendingQuickAddFood(quickAddFoodParam);
      navigation.setParams({ quickAddFood: undefined }); 
    }
  }, [route.params, navigation]);

  // Effect to open modal when pendingQuickAddFood is set
  useEffect(() => {
    if (pendingQuickAddFood && !isLoadingData && !isOverlayVisible && foods.length > 0) {
      const foodExistsInLibrary = foods.find(f => f.id === pendingQuickAddFood.id);
      const foodToUse = foodExistsInLibrary || pendingQuickAddFood;
  
      // For pendingQuickAddFood, we are essentially opening the modal for a "new" entry,
      // but pre-filling the food.
      setFoodForEditModal(foodToUse); // Use this to pass to AddEntryModal
      setInitialGramsForEdit("");     // New entry, so grams are empty
      setEditIndex(null);             // Not editing an existing list item
  
      fetchAndSetIcon(foodToUse.name);
      setIsOverlayVisible(true);      // Open the modal
      setPendingQuickAddFood(null);   // Clear pending food
    }
  }, [pendingQuickAddFood, isLoadingData, isOverlayVisible, foods, fetchAndSetIcon]);


  useFocusEffect(
    useCallback(() => {
      loadData();
      return () => {};
    }, [loadData]) 
  );


  const currentEntryItems = useMemo(() => {
    const entry = dailyEntries.find((e) => e.date === selectedDate);
    return entry ? [...entry.items].reverse() : [];
  }, [dailyEntries, selectedDate]);

  const getOriginalIndex = useCallback((reversedIndex: number): number => {
    const entry = dailyEntries.find((e) => e.date === selectedDate);
    if (!entry || reversedIndex < 0 || reversedIndex >= entry.items.length) return -1;
    return entry.items.length - 1 - reversedIndex;
  }, [dailyEntries, selectedDate]);

  const updateAndSaveEntries = useCallback(async (updatedEntriesOrUpdater: DailyEntry[] | ((prevEntries: DailyEntry[]) => DailyEntry[])) => {
    setIsSaving(true);
    let finalNewEntries: DailyEntry[];
    let previousEntriesState: DailyEntry[] = [];

    setDailyEntries(prevEntries => {
        previousEntriesState = [...prevEntries]; 
        if (typeof updatedEntriesOrUpdater === 'function') {
            finalNewEntries = updatedEntriesOrUpdater(prevEntries);
        } else {
            finalNewEntries = updatedEntriesOrUpdater;
        }
        return finalNewEntries;
    });
    try {
      const entriesToSave = typeof updatedEntriesOrUpdater === 'function'
          ? updatedEntriesOrUpdater(dailyEntries) 
          : updatedEntriesOrUpdater;
      await saveDailyEntries(entriesToSave);
    }
    catch (error) {
      Alert.alert(t('dailyEntryScreen.errorSave'), t('dailyEntryScreen.errorSaveMessage'));
      setDailyEntries(previousEntriesState); 
    }
    finally {
      setIsSaving(false);
    }
  }, [dailyEntries]);

  // This function is now called by AddEntryModal with the food and grams
  const handleSingleEntryActionFinal = useCallback(async (foodToAdd: Food, gramsToAdd: number) => {
    if (isSaving) return;
    const entryItem: DailyEntryItem = { food: foodToAdd, grams: gramsToAdd };
    const isEditingThisAction = editIndex !== null; // Use a local const for clarity
    
    const newEntriesState = (prevDailyEntries: DailyEntry[]): DailyEntry[] => {
        const existingEntryIndex = prevDailyEntries.findIndex((entry) => entry.date === selectedDate);
        let updatedEntries: DailyEntry[];
        if (existingEntryIndex > -1) {
            const existingEntry = prevDailyEntries[existingEntryIndex]; let updatedItems;
            if (isEditingThisAction) { // Check if it was an edit operation
                const originalEditIndex = getOriginalIndex(editIndex!);
                if (originalEditIndex === -1) { console.error("Edit error: original index not found."); return prevDailyEntries; }
                updatedItems = existingEntry.items.map((item, index) => index === originalEditIndex ? entryItem : item);
            } else { updatedItems = [entryItem, ...(existingEntry.items ?? [])]; }
            const updatedEntry = { ...existingEntry, items: updatedItems };
            updatedEntries = prevDailyEntries.map((entry, index) => index === existingEntryIndex ? updatedEntry : entry);
        } else {
            if (isEditingThisAction) { console.error("Edit error: entry to edit not found."); return prevDailyEntries; }
            const newDailyEntry: DailyEntry = { date: selectedDate, items: [entryItem] };
            updatedEntries = [...prevDailyEntries, newDailyEntry]; updatedEntries.sort((a, b) => a.date.localeCompare(b.date));
        }
        return updatedEntries;
    };
    await updateAndSaveEntries(newEntriesState(dailyEntries));

    if (foodToAdd?.name) fetchAndSetIcon(foodToAdd.name);
    
    setIsOverlayVisible(false); // Close modal
    setEditIndex(null); // Reset edit state
    setInitialGramsForEdit(undefined);
    setFoodForEditModal(null);

    Toast.show({ type: "success", text1: t(isEditingThisAction ? 'dailyEntryScreen.entryUpdated' : 'dailyEntryScreen.entryAdded'), position: "bottom", visibilityTime: 2000, });
  }, [ isSaving, editIndex, dailyEntries, selectedDate, getOriginalIndex, updateAndSaveEntries, fetchAndSetIcon ]);


  const handleAddMultipleEntriesFinal = useCallback(async (entriesToAdd: { food: Food; grams: number }[]) => {
    if (isSaving) return;
    try {
      if (!entriesToAdd || entriesToAdd.length === 0) return;
      const newItems: DailyEntryItem[] = entriesToAdd.map((entry) => ({ food: entry.food, grams: entry.grams }));
      
      const newEntriesState = (prevDailyEntries: DailyEntry[]): DailyEntry[] => {
          const existingEntryIndex = prevDailyEntries.findIndex((entry) => entry.date === selectedDate);
          let updatedEntries: DailyEntry[];
          if (existingEntryIndex > -1) {
            const existingEntry = prevDailyEntries[existingEntryIndex];
            const updatedItems = [...newItems, ...(existingEntry.items ?? [])];
            const updatedEntry = { ...existingEntry, items: updatedItems };
            updatedEntries = prevDailyEntries.map((entry, index) => index === existingEntryIndex ? updatedEntry : entry);
          } else {
            const newDailyEntry: DailyEntry = { date: selectedDate, items: newItems };
            updatedEntries = [...prevDailyEntries, newDailyEntry]; updatedEntries.sort((a, b) => a.date.localeCompare(b.date));
          }
          return updatedEntries;
      };
      await updateAndSaveEntries(newEntriesState(dailyEntries));

      newItems.forEach(item => { if (item.food?.name) fetchAndSetIcon(item.food.name); });
      
      Toast.show({ type: "success", text1: t('dailyEntryScreen.itemsAdded', { count: entriesToAdd.length }), text2: t('dailyEntryScreen.toDateFormat', { date: readableDate }), position: "bottom", visibilityTime: 3000, });
      
      setIsOverlayVisible(false); 
      setEditIndex(null);
      setInitialGramsForEdit(undefined);
      setFoodForEditModal(null);
    } catch (error) { Alert.alert(t('dailyEntryScreen.errorAddMultiple'), t('dailyEntryScreen.errorAddMultipleMessage')); setIsOverlayVisible(false); }
  }, [dailyEntries, selectedDate, isSaving, updateAndSaveEntries, readableDate, fetchAndSetIcon]);


  const handleUndoRemoveEntry = useCallback(async (itemToRestore: DailyEntryItem, entryDate: string, originalIndexToRestoreAt: number) => {
    if (isSaving) return;
    Toast.hide(); 
    const newEntriesState = (prevDailyEntries: DailyEntry[]): DailyEntry[] => {
        const entryIdx = prevDailyEntries.findIndex(e => e.date === entryDate);
        let finalEntries: DailyEntry[];
        if (entryIdx > -1) {
            const entryToUpdate = prevDailyEntries[entryIdx];
            const currentItems = [...entryToUpdate.items];
            currentItems.splice(originalIndexToRestoreAt, 0, itemToRestore);
            const restoredEntry = { ...entryToUpdate, items: currentItems };
            finalEntries = prevDailyEntries.map((entry, i) => i === entryIdx ? restoredEntry : entry);
        } else {
            const newDailyEntry: DailyEntry = { date: entryDate, items: [itemToRestore] };
            finalEntries = [...prevDailyEntries, newDailyEntry];
            finalEntries.sort((a, b) => a.date.localeCompare(b.date));
        }
        return finalEntries;
    };
    await updateAndSaveEntries(newEntriesState(dailyEntries));
    Toast.show({ type: "success", text1: t('dailyEntryScreen.entryRestored'), visibilityTime: 1500, position: "bottom" });
  }, [isSaving, updateAndSaveEntries, dailyEntries]);

  const undoHandlerRef = useRef(handleUndoRemoveEntry);
  useEffect(() => { undoHandlerRef.current = handleUndoRemoveEntry; }, [handleUndoRemoveEntry]);

  const handleRemoveEntry = useCallback(async (reversedIndex: number) => {
    if (isSaving) return; 
    const originalIndex = getOriginalIndex(reversedIndex); 
    if (originalIndex === -1) return;
    let itemToRemove: DailyEntryItem | null = null;
    const newEntriesState = (prevDailyEntries: DailyEntry[]): DailyEntry[] => {
        const currentEntry = prevDailyEntries.find((e) => e.date === selectedDate);
        if (!currentEntry || originalIndex >= currentEntry.items.length) return prevDailyEntries;
        itemToRemove = currentEntry.items[originalIndex];
        const updatedItems = currentEntry.items.filter((_, i) => i !== originalIndex); 
        let finalEntries: DailyEntry[];
        if (updatedItems.length === 0) { finalEntries = prevDailyEntries.filter((entry) => entry.date !== selectedDate); } 
        else { const updatedEntry = { ...currentEntry, items: updatedItems }; finalEntries = prevDailyEntries.map((entry) => entry.date === selectedDate ? updatedEntry : entry); }
        return finalEntries;
    };
    const previousDailyEntries = [...dailyEntries];
    const finalEntriesAfterRemoval = newEntriesState(previousDailyEntries);
    const capturedItemToRemove = previousDailyEntries.find(e => e.date === selectedDate)?.items[originalIndex];
    if (!capturedItemToRemove) { return; }
    await updateAndSaveEntries(finalEntriesAfterRemoval);
    Toast.show({ type: "info", text1: t('dailyEntryScreen.itemRemoved', { itemName: capturedItemToRemove.food.name }), text2: t('dailyEntryScreen.undo'), position: "bottom", bottomOffset: 80, visibilityTime: 4000, onPress: () => undoHandlerRef.current(capturedItemToRemove, selectedDate, originalIndex), });
  }, [dailyEntries, selectedDate, isSaving, getOriginalIndex, updateAndSaveEntries]);


  const toggleOverlay = useCallback((itemToEdit: DailyEntryItem | null = null, reversedItemIndex: number | null = null) => {
    if (isSaving) return;
    
    if (itemToEdit && reversedItemIndex !== null) {
      setFoodForEditModal(itemToEdit.food); 
      setInitialGramsForEdit(String(itemToEdit.grams));
      setEditIndex(reversedItemIndex);
      if (itemToEdit.food.name) fetchAndSetIcon(itemToEdit.food.name); 
    } else {
      setFoodForEditModal(null);
      setInitialGramsForEdit(undefined);
      setEditIndex(null);
    }
    setIsOverlayVisible((current) => !current);
  }, [isSaving, fetchAndSetIcon]);

  const handleAddNewFoodRequestFromModal = useCallback(() => {
    if (isSaving) return;
    setIsOverlayVisible(false); 
    setFoodForEditModal(null);
    setInitialGramsForEdit(undefined);
    setEditIndex(null);
    navigation.navigate('FoodListRoute', { openAddFoodModal: true });
  }, [isSaving, navigation]);


  const handleCommitFoodItemToMainLibrary = useCallback(async (
    foodData: Omit<Food, 'id'> | Food,
    isUpdate: boolean
  ): Promise<Food | null> => {
    if (isSaving) return null;
    setIsSaving(true);
    try {
      let committedFood: Food;
      if (isUpdate) {
        committedFood = await updateFoodService(foodData as Food);
        setFoods(prevFoods =>
          prevFoods.map(f => (f.id === committedFood.id ? committedFood : f)).sort((a, b) => a.name.localeCompare(b.name))
        );
      } else {
        committedFood = await createFood(foodData as Omit<Food, 'id'>);
        setFoods(prevFoods => [...prevFoods, committedFood].sort((a, b) => a.name.localeCompare(b.name)));
      }
      if(committedFood.name) fetchAndSetIcon(committedFood.name);
      return committedFood;
    } catch (error) {
      console.error("Error committing food to library:", error);
      Alert.alert( t('foodListScreen.errorLoad'), error instanceof Error ? error.message : t(isUpdate ? 'foodListScreen.errorUpdateMessage' : 'foodListScreen.errorCreateMessage') );
      return null;
    } finally {
      setIsSaving(false);
    }
  }, [isSaving, fetchAndSetIcon]);


  const handleEditEntryViaModal = (item: DailyEntryItem, reversedIndex: number) => toggleOverlay(item, reversedIndex);

  const handleDateChange = useCallback((event: DateTimePickerEvent, selectedDateValue?: Date) => {
    const isAndroidDismiss = Platform.OS === "android" && event.type === "dismissed";
    setShowDatePicker(Platform.OS === "ios");
    if (!isAndroidDismiss && event.type === "set" && selectedDateValue) {
      if (isValid(selectedDateValue)) {
        const formattedDate = formatISO(selectedDateValue, { representation: "date" });
        if (formattedDate !== selectedDate) { setSelectedDate(formattedDate); setEditIndex(null); }
      } else { Alert.alert(t('dailyEntryScreen.errorInvalidDate'), t('dailyEntryScreen.errorInvalidDateMessage')); }
    }
    if (Platform.OS === "android") setShowDatePicker(false);
  }, [selectedDate]);

  const handlePreviousDay = useCallback(() => {
    if (isSaving || isLoadingData) return;
    try {
      const currentDateObj = parseISO(selectedDate); if (!isValid(currentDateObj)) return;
      const newDate = subDays(currentDateObj, 1); const newDateString = formatISO(newDate, { representation: "date" });
      setSelectedDate(newDateString); setEditIndex(null);
    } catch (e) { console.error("DateNav Error (Prev):", e); }
  }, [selectedDate, isSaving, isLoadingData]);

  const handleNextDay = useCallback(() => {
    if (isSaving || isLoadingData) return;
    try {
      const currentDateObj = parseISO(selectedDate); if (!isValid(currentDateObj)) return;
      const newDate = addDays(currentDateObj, 1); const newDateString = formatISO(newDate, { representation: "date" });
      setSelectedDate(newDateString); setEditIndex(null);
    } catch (e) { console.error("DateNav Error (Next):", e); }
  }, [selectedDate, isSaving, isLoadingData]);

  const calculateTotals = useMemo(() => {
    const currentOriginalEntry = dailyEntries.find((entry) => entry.date === selectedDate);
    let totals = { totalCalories: 0, totalProtein: 0, totalCarbs: 0, totalFat: 0 };
    if (currentOriginalEntry) {
      currentOriginalEntry.items.forEach((item) => {
        if (item.food && typeof item.food.calories === "number" && typeof item.food.protein === "number" && typeof item.food.carbs === "number" && typeof item.food.fat === "number" && typeof item.grams === "number" && item.grams > 0) {
          const factor = item.grams / 100; totals.totalCalories += item.food.calories * factor; totals.totalProtein += item.food.protein * factor; totals.totalCarbs += item.food.carbs * factor; totals.totalFat += item.food.fat * factor;
        }
      });
    } return { totalCalories: Math.round(totals.totalCalories), totalProtein: Math.round(totals.totalProtein), totalCarbs: Math.round(totals.totalCarbs), totalFat: Math.round(totals.totalFat), };
  }, [dailyEntries, selectedDate]);

  return (
    <SafeAreaView style={styles.container} edges={["top", "left", "right"]}>
      <DateNavigator selectedDate={selectedDate} onPreviousDay={handlePreviousDay} onNextDay={handleNextDay} onShowDatePicker={() => !isSaving && !isLoadingData && setShowDatePicker(true)} isSaving={isSaving} isLoadingData={isLoadingData} />
      {showDatePicker && (<DateTimePicker value={parseISO(selectedDate)} mode="date" display={Platform.OS === "ios" ? "spinner" : "default"} onChange={handleDateChange} />)}
      <View style={styles.progressContainer}><DailyProgress calories={calculateTotals.totalCalories} protein={calculateTotals.totalProtein} carbs={calculateTotals.totalCarbs} fat={calculateTotals.totalFat} goals={dailyGoals} /></View>
      <Divider style={styles.divider} />
      {isSaving && (<View style={styles.savingIndicator}><ActivityIndicator size="small" color={theme.colors.primary} /><Text style={styles.savingText}>{t('dailyEntryScreen.saving')}</Text></View>)}
      <Text style={styles.sectionTitle}>{t('dailyEntryScreen.todaysEntries')}</Text>
      {isLoadingData ? (<View style={styles.centeredLoader}><ActivityIndicator size="large" color={theme.colors.primary} /><Text style={styles.loadingText}>{t('dailyEntryScreen.loadingEntries')}</Text></View>
      ) : (
        <FlatList
          data={currentEntryItems}
          keyExtractor={(item, index) => `entry-${item?.food?.id ?? "unknown"}-${getOriginalIndex(index)}-${item?.grams ?? index}-${selectedDate}-${index}`}
          renderItem={({ item, index }) => (
            <DailyEntryListItem
              item={item}
              reversedIndex={index}
              foodIcons={foodIcons}
              setFoodIcons={setFoodIcons}
              onEdit={handleEditEntryViaModal}
              onRemove={handleRemoveEntry}
              isSaving={isSaving}
              dailyGoals={dailyGoals} />
          )}
          ListEmptyComponent={<View style={styles.emptyListContainer}><RNEIcon name="reader-outline" type="ionicon" size={50} color={theme.colors.grey3} /><Text style={styles.emptyListText}>{t('dailyEntryScreen.noEntries')}</Text><Text style={styles.emptyListSubText}>{t('dailyEntryScreen.noEntriesHint')}</Text></View>}
          initialNumToRender={10}
          maxToRenderPerBatch={5}
          windowSize={11}
          contentContainerStyle={styles.listContentContainer}
          keyboardShouldPersistTaps="handled"
          extraData={{ foodIcons, isSaving, dailyGoals, selectedDate, itemsLength: currentEntryItems.length }}
        />
      )}
      <FAB icon={<RNEIcon name="add" color="white" />} color={theme.colors.primary} onPress={() => !isSaving && toggleOverlay()} placement="right" size="large" style={styles.fab} disabled={isSaving || isLoadingData} />
      
      {isOverlayVisible && (
          <AddEntryModal
            isVisible={isOverlayVisible}
            toggleOverlay={toggleOverlay}
            handleAddEntry={handleSingleEntryActionFinal}
            handleAddMultipleEntries={handleAddMultipleEntriesFinal}
            foods={foods} 
            isEditMode={editIndex !== null}
            initialGrams={initialGramsForEdit}
            initialSelectedFoodForEdit={foodForEditModal}
            onAddNewFoodRequest={handleAddNewFoodRequestFromModal}
            onCommitFoodToLibrary={handleCommitFoodItemToMainLibrary}
            dailyGoals={dailyGoals}
          />
      )}
    </SafeAreaView>
  );
};

const useStyles = makeStyles((theme) => ({
  container: { flex: 1, backgroundColor: theme.colors.background },
  progressContainer: { paddingHorizontal: 15, paddingTop: 10 },
  divider: { marginVertical: 0, height: StyleSheet.hairlineWidth, backgroundColor: theme.colors.divider, },
  sectionTitle: { marginTop: 15, marginBottom: 10, paddingHorizontal: 15, fontWeight: "bold", fontSize: 18, color: theme.colors.text, textAlign: I18nManager.isRTL ? 'right' : 'left' },
  fab: { position: "absolute", margin: 16, right: I18nManager.isRTL ? undefined : 10, left: I18nManager.isRTL ? 10 : undefined, bottom: 10 },
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
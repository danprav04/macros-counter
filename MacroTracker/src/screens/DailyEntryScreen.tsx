// src/screens/DailyEntryScreen.tsx
import React, { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { View, FlatList, Alert, Platform, StyleSheet, ActivityIndicator, I18nManager } from "react-native";
import { DailyEntry, DailyEntryItem } from "../types/dailyEntry";
import { Food } from "../types/food";
import { getFoods, createFood, updateFood as updateFoodService } from "../services/foodService";
import { saveDailyEntries, loadDailyEntries, loadSettings } from "../services/storageService";
import { getTodayDateString, formatDateISO, formatDateReadableAsync } from "../utils/dateUtils";
import DailyProgress from "../components/DailyProgress";
import { Text, makeStyles, useTheme, Divider, Icon as RNEIcon } from "@rneui/themed";
import { FAB } from "@rneui/base";
import DateTimePicker, { DateTimePickerEvent } from "@react-native-community/datetimepicker";
import { addDays, subDays, parseISO, formatISO, isValid } from "date-fns";
import { SafeAreaView } from "react-native-safe-area-context";
import AddEntryModal from "../components/AddEntryModal/AddEntryModal";
import DailyEntryDetailsModal from "../components/DailyEntryDetailsModal";
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
import useDelayedLoading from "../hooks/useDelayedLoading";

type DailyEntryScreenNavigationProp = BottomTabNavigationProp<MainTabParamList, 'DailyEntryRoute'>;
type DailyEntryScreenRouteProp = RouteProp<MainTabParamList, 'DailyEntryRoute'>;

const DailyEntryScreen: React.FC = () => {
  const [dailyEntries, setDailyEntries] = useState<DailyEntry[]>([]);
  const [selectedDate, setSelectedDate] = useState<string>(getTodayDateString());
  const [foods, setFoods] = useState<Food[]>([]);
  
  const [isAddModalVisible, setIsAddModalVisible] = useState(false);
  const [isDetailsModalVisible, setIsDetailsModalVisible] = useState(false);
  const [selectedEntryForDetails, setSelectedEntryForDetails] = useState<{ item: DailyEntryItem; reversedIndex: number } | null>(null);

  const [showDatePicker, setShowDatePicker] = useState(false);
  const [dailyGoals, setDailyGoals] = useState<AppSettings['dailyGoals']>({ calories: 2000, protein: 150, carbs: 200, fat: 70 });
  
  const [foodForAddModal, setFoodForAddModal] = useState<Food | null>(null);

  const [foodIcons, setFoodIcons] = useState<{ [foodName: string]: string | null; }>({});
  const [isLoadingData, setIsLoadingData] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [readableDate, setReadableDate] = useState('');
  const [pendingQuickAddFood, setPendingQuickAddFood] = useState<Food | null>(null);

  const { theme } = useTheme();
  const styles = useStyles();

  const showIsLoadingData = useDelayedLoading(isLoadingData);
  const showIsSaving = useDelayedLoading(isSaving, 300);

  const navigation = useNavigation<DailyEntryScreenNavigationProp>();
  const route = useRoute<DailyEntryScreenRouteProp>();

  useEffect(() => {
    const updateDateForToast = async () => {
      const parsedDate = parseISO(selectedDate);
      if (isValid(parsedDate)) {
        const formatted = await formatDateReadableAsync(parsedDate);
        setReadableDate(formatted);
      } else {
        setReadableDate(t('dateNavigator.invalidDate'));
      }
    };
    updateDateForToast();
  }, [selectedDate, i18n.locale, t]);

  const resolveAndSetIcon = useCallback((foodName: string) => {
    if (!foodName) return;
    if (foodIcons[foodName] === undefined) {
      const icon = getFoodIconUrl(foodName);
      setFoodIcons(prev => ({ ...prev, [foodName]: icon }));
    }
  }, [foodIcons]);

  const triggerIconPrefetch = useCallback((entries: DailyEntry[], currentSelectedDate: string) => {
    const uniqueFoodNames = new Set<string>();
    entries.forEach(entry => { 
      if (entry.date === currentSelectedDate && entry.items) { 
        entry.items.forEach(item => { 
          if (item.food?.name) uniqueFoodNames.add(item.food.name); 
        }); 
      } 
    });

    if (uniqueFoodNames.size > 0) {
      const newIconsStateBatch: { [key: string]: string | null } = {};
      Array.from(uniqueFoodNames).forEach(name => {
        if (foodIcons[name] === undefined) {
           newIconsStateBatch[name] = getFoodIconUrl(name);
        }
      });
      if (Object.keys(newIconsStateBatch).length > 0) {
          setFoodIcons(prev => ({ ...prev, ...newIconsStateBatch }));
      }
    }
  }, [foodIcons]);

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
  }, [selectedDate, triggerIconPrefetch, t]);

  useEffect(() => {
    const quickAddFoodParam = route.params?.quickAddFood;
    if (quickAddFoodParam) {
      setPendingQuickAddFood(quickAddFoodParam);
      navigation.setParams({ quickAddFood: undefined }); 
    }
  }, [route.params, navigation]);

  useEffect(() => {
    if (pendingQuickAddFood && !isLoadingData && !isAddModalVisible && foods.length > 0) {
      const foodExistsInLibrary = foods.find(f => f.id === pendingQuickAddFood.id);
      const foodToUse = foodExistsInLibrary || pendingQuickAddFood;
  
      setFoodForAddModal(foodToUse);
  
      if (foodToUse.name) resolveAndSetIcon(foodToUse.name);
      setIsAddModalVisible(true);      
      setPendingQuickAddFood(null);   
    }
  }, [pendingQuickAddFood, isLoadingData, isAddModalVisible, foods, resolveAndSetIcon]);

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

  const updateAndSaveEntries = useCallback(async (updaterOrNewEntries: DailyEntry[] | ((prevEntries: DailyEntry[]) => DailyEntry[])) => {
    setIsSaving(true);
    const previousEntriesState = dailyEntries;

    let newEntriesForStateAndSave: DailyEntry[];
    if (typeof updaterOrNewEntries === 'function') {
        newEntriesForStateAndSave = updaterOrNewEntries(previousEntriesState);
    } else {
        newEntriesForStateAndSave = updaterOrNewEntries;
    }

    setDailyEntries(newEntriesForStateAndSave);

    try {
      await saveDailyEntries(newEntriesForStateAndSave);
    } catch (error) {
      Alert.alert(t('dailyEntryScreen.errorSave'), t('dailyEntryScreen.errorSaveMessage'));
      setDailyEntries(previousEntriesState);
    } finally {
      setIsSaving(false);
    }
  }, [dailyEntries, t]);

  const handleSingleEntryActionFinal = useCallback(async (foodToAdd: Food, gramsToAdd: number) => {
    if (isSaving) return;
    const entryItem: DailyEntryItem = { food: foodToAdd, grams: gramsToAdd };
    
    await updateAndSaveEntries((prevDailyEntries) => {
        const existingEntryIndex = prevDailyEntries.findIndex((entry) => entry.date === selectedDate);
        let updatedEntriesArray: DailyEntry[];
        if (existingEntryIndex > -1) {
            const existingEntry = prevDailyEntries[existingEntryIndex];
            const updatedItems = [entryItem, ...(existingEntry.items ?? [])];
            const updatedEntry = { ...existingEntry, items: updatedItems };
            updatedEntriesArray = prevDailyEntries.map((entry, index) => index === existingEntryIndex ? updatedEntry : entry);
        } else {
            const newDailyEntry: DailyEntry = { date: selectedDate, items: [entryItem] };
            updatedEntriesArray = [...prevDailyEntries, newDailyEntry];
            updatedEntriesArray.sort((a, b) => a.date.localeCompare(b.date));
        }
        return updatedEntriesArray;
    });

    if (foodToAdd?.name) resolveAndSetIcon(foodToAdd.name);
    
    setIsAddModalVisible(false);
    setFoodForAddModal(null);

    Toast.show({ type: "success", text1: t('dailyEntryScreen.entryAdded'), position: "bottom", visibilityTime: 2000, });
  }, [ isSaving, selectedDate, updateAndSaveEntries, resolveAndSetIcon, t ]);

  const handleUpdateGrams = useCallback(async (reversedItemIndex: number, newGrams: number) => {
    if (isSaving) return;
    const originalIndex = getOriginalIndex(reversedItemIndex);
    if (originalIndex === -1) {
        console.error("Update error: original index not found for reversed index:", reversedItemIndex);
        return;
    }

    await updateAndSaveEntries(prev => {
        const entryIndex = prev.findIndex(e => e.date === selectedDate);
        if (entryIndex === -1) return prev;
        
        const newEntries = [...prev];
        const newItems = [...newEntries[entryIndex].items];
        const itemToUpdate = newItems[originalIndex];
        
        newItems[originalIndex] = { ...itemToUpdate, grams: newGrams };
        newEntries[entryIndex] = { ...newEntries[entryIndex], items: newItems };
        
        return newEntries;
    });

    setIsDetailsModalVisible(false);
    setSelectedEntryForDetails(null);
    Toast.show({ type: "success", text1: t('dailyEntryScreen.entryUpdated'), position: "bottom" });
  }, [isSaving, selectedDate, getOriginalIndex, updateAndSaveEntries, t]);

  const handleAddMultipleEntriesFinal = useCallback(async (entriesToAdd: { food: Food; grams: number }[]) => {
    if (isSaving) return;
    try {
      if (!entriesToAdd || entriesToAdd.length === 0) return;
      const newItems: DailyEntryItem[] = entriesToAdd.map((entry) => ({ food: entry.food, grams: entry.grams }));
      
      await updateAndSaveEntries((prevDailyEntries) => {
          const existingEntryIndex = prevDailyEntries.findIndex((entry) => entry.date === selectedDate);
          let updatedEntriesArray: DailyEntry[];
          if (existingEntryIndex > -1) {
            const existingEntry = prevDailyEntries[existingEntryIndex];
            const updatedItems = [...newItems, ...(existingEntry.items ?? [])];
            const updatedEntry = { ...existingEntry, items: updatedItems };
            updatedEntriesArray = prevDailyEntries.map((entry, index) => index === existingEntryIndex ? updatedEntry : entry);
          } else {
            const newDailyEntry: DailyEntry = { date: selectedDate, items: newItems };
            updatedEntriesArray = [...prevDailyEntries, newDailyEntry];
            updatedEntriesArray.sort((a, b) => a.date.localeCompare(b.date));
          }
          return updatedEntriesArray;
      });

      newItems.forEach(item => { if (item.food?.name) resolveAndSetIcon(item.food.name); });
      
      Toast.show({ type: "success", text1: t('dailyEntryScreen.itemsAdded', { count: entriesToAdd.length }), text2: t('dailyEntryScreen.toDateFormat', { date: readableDate }), position: "bottom", visibilityTime: 3000, });
      
      setIsAddModalVisible(false); 
      setFoodForAddModal(null);
    } catch (error) { Alert.alert(t('dailyEntryScreen.errorAddMultiple'), t('dailyEntryScreen.errorAddMultipleMessage')); setIsAddModalVisible(false); }
  }, [selectedDate, isSaving, updateAndSaveEntries, readableDate, resolveAndSetIcon, t]);


  const handleUndoRemoveEntry = useCallback(async (itemToRestore: DailyEntryItem, entryDate: string, originalIndexToRestoreAt: number) => {
    if (isSaving) return;
    Toast.hide(); 
    await updateAndSaveEntries((prevDailyEntries) => {
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
    });
    Toast.show({ type: "success", text1: t('dailyEntryScreen.entryRestored'), visibilityTime: 1500, position: "bottom" });
  }, [isSaving, updateAndSaveEntries, t]);

  const undoHandlerRef = useRef(handleUndoRemoveEntry);
  useEffect(() => { undoHandlerRef.current = handleUndoRemoveEntry; }, [handleUndoRemoveEntry]);

  const handleRemoveEntry = useCallback(async (reversedItemIndex: number) => {
    if (isSaving) return;
    const originalItemIndex = getOriginalIndex(reversedItemIndex);
    if (originalItemIndex === -1) {
      console.error("handleRemoveEntry: Original index not found for reversed index:", reversedItemIndex);
      return;
    }

    const entryForToast = dailyEntries.find((e) => e.date === selectedDate);
    const itemToRemoveForToast = entryForToast?.items[originalItemIndex];

    if (!itemToRemoveForToast) {
      console.error("handleRemoveEntry: Item to remove not found in current state for Toast.");
      return;
    }

    await updateAndSaveEntries((prevDailyEntries) => {
      const currentEntryIndex = prevDailyEntries.findIndex((e) => e.date === selectedDate);
      if (currentEntryIndex === -1) {
        return prevDailyEntries;
      }
      const currentEntry = prevDailyEntries[currentEntryIndex];
      const updatedItems = currentEntry.items.filter((_, i) => i !== originalItemIndex);
      
      if (updatedItems.length === 0) {
        return prevDailyEntries.filter((entry) => entry.date !== selectedDate);
      } else {
        const updatedEntry = { ...currentEntry, items: updatedItems };
        return prevDailyEntries.map((entry, i) => i === currentEntryIndex ? updatedEntry : entry);
      }
    });

    Toast.show({
        type: "info",
        text1: t('dailyEntryScreen.itemRemoved', { itemName: itemToRemoveForToast.food.name }),
        text2: t('dailyEntryScreen.undo'),
        position: "bottom",
        bottomOffset: 80,
        visibilityTime: 4000,
        onPress: () => undoHandlerRef.current(itemToRemoveForToast, selectedDate, originalItemIndex),
    });
  }, [dailyEntries, selectedDate, isSaving, getOriginalIndex, updateAndSaveEntries, t]);

  const handleDeleteFromDetails = useCallback(() => {
    if (selectedEntryForDetails) {
        handleRemoveEntry(selectedEntryForDetails.reversedIndex);
    }
    setIsDetailsModalVisible(false);
    setSelectedEntryForDetails(null);
  }, [selectedEntryForDetails, handleRemoveEntry]);

  const toggleAddOverlay = useCallback(() => {
    if (isSaving) return;
    setFoodForAddModal(null);
    setIsAddModalVisible((current) => !current);
  }, [isSaving]);

  const handleViewOrEditEntry = (item: DailyEntryItem, reversedIndex: number) => {
    if (isSaving) return;
    setSelectedEntryForDetails({ item, reversedIndex });
    setIsDetailsModalVisible(true);
  };
  
  const handleAddNewFoodRequestFromModal = useCallback(() => {
    if (isSaving) return;
    setIsAddModalVisible(false); 
    setFoodForAddModal(null);
    navigation.navigate('FoodListRoute', { openAddFoodModal: true });
  }, [isSaving, navigation]);

  const handleCommitFoodItemToMainLibrary = useCallback(async (
    foodData: Omit<Food, 'id' | 'createdAt'> | Food,
    isUpdate: boolean
  ): Promise<Food | null> => {
    if (isSaving) return null;
    setIsSaving(true);
    try {
      let committedFood: Food;
      if (isUpdate && 'id' in foodData) {
        committedFood = await updateFoodService(foodData as Food);
        setFoods(prevFoods =>
          prevFoods.map(f => (f.id === committedFood.id ? committedFood : f)).sort((a, b) => a.name.localeCompare(b.name))
        );
      } else if (!isUpdate && !('id' in foodData)) {
        committedFood = await createFood(foodData as Omit<Food, 'id' | 'createdAt'>);
        setFoods(prevFoods => [...prevFoods, committedFood].sort((a, b) => a.name.localeCompare(b.name)));
      } else {
        throw new Error("Invalid data for commitFoodItemToMainLibrary");
      }
      if(committedFood.name) resolveAndSetIcon(committedFood.name);
      return committedFood;
    } catch (error) {
      console.error("Error committing food to library:", error);
      Alert.alert( t('foodListScreen.errorLoad'), error instanceof Error ? error.message : t(isUpdate ? 'foodListScreen.errorUpdateMessage' : 'foodListScreen.errorCreateMessage') );
      return null;
    } finally {
      setIsSaving(false);
    }
  }, [isSaving, resolveAndSetIcon, t]);

  const handleDateChange = useCallback((event: DateTimePickerEvent, selectedDateValue?: Date) => {
    const isAndroidDismiss = Platform.OS === "android" && event.type === "dismissed";
    setShowDatePicker(Platform.OS === "ios");
    if (!isAndroidDismiss && event.type === "set" && selectedDateValue) {
      if (isValid(selectedDateValue)) {
        const formattedDate = formatISO(selectedDateValue, { representation: "date" });
        if (formattedDate !== selectedDate) {
           setSelectedDate(formattedDate);
        }
      } else {
        Alert.alert(t('dailyEntryScreen.errorInvalidDate'), t('dailyEntryScreen.errorInvalidDateMessage'));
      }
    }
    if (Platform.OS === "android") {
        setShowDatePicker(false);
    }
  }, [selectedDate, t]);

  const handlePreviousDay = useCallback(() => {
    if (isSaving || isLoadingData) return;
    try {
      const currentDateObj = parseISO(selectedDate);
      if (!isValid(currentDateObj)) return;
      const newDate = subDays(currentDateObj, 1);
      const newDateString = formatISO(newDate, { representation: "date" });
      setSelectedDate(newDateString);
    } catch (e) { console.error("DateNav Error (Prev):", e); }
  }, [selectedDate, isSaving, isLoadingData]);

  const handleNextDay = useCallback(() => {
    if (isSaving || isLoadingData) return;
    try {
      const currentDateObj = parseISO(selectedDate);
      if (!isValid(currentDateObj)) return;
      const newDate = addDays(currentDateObj, 1);
      const newDateString = formatISO(newDate, { representation: "date" });
      setSelectedDate(newDateString);
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
      {showDatePicker && (<DateTimePicker value={isValid(parseISO(selectedDate)) ? parseISO(selectedDate) : new Date()} mode="date" display={Platform.OS === "ios" ? "spinner" : "default"} onChange={handleDateChange} />)}
      <View style={styles.progressContainer}><DailyProgress calories={calculateTotals.totalCalories} protein={calculateTotals.totalProtein} carbs={calculateTotals.totalCarbs} fat={calculateTotals.totalFat} goals={dailyGoals} /></View>
      <View style={styles.disclaimerContainer}>
          <RNEIcon name="alert-circle-outline" type="material-community" color={theme.colors.grey2} size={16} />
          <Text style={styles.disclaimerText}>{t('disclaimers.medicalDisclaimer')}</Text>
      </View>
      <Divider style={styles.divider} />
      {showIsSaving && (<View style={styles.savingIndicator}><ActivityIndicator size="small" color={theme.colors.primary} /><Text style={styles.savingText}>{t('dailyEntryScreen.saving')}</Text></View>)}
      <Text style={styles.sectionTitle}>{t('dailyEntryScreen.todaysEntries')}</Text>
      {showIsLoadingData ? (<View style={styles.centeredLoader}><ActivityIndicator size="large" color={theme.colors.primary} /><Text style={styles.loadingText}>{t('dailyEntryScreen.loadingEntries')}</Text></View>
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
              onPress={handleViewOrEditEntry}
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
      <FAB
        icon={<RNEIcon name="add" color={theme.colors.white} />}
        color={theme.colors.primary}
        onPress={() => !isSaving && toggleAddOverlay()}
        placement="right"
        size="large"
        style={styles.fab}
        disabled={isSaving || isLoadingData}
      />
      
      {isAddModalVisible && (
          <AddEntryModal
            isVisible={isAddModalVisible}
            toggleOverlay={toggleAddOverlay}
            handleAddEntry={handleSingleEntryActionFinal}
            handleAddMultipleEntries={handleAddMultipleEntriesFinal}
            foods={foods} 
            isEditMode={false} // This modal is now only for adding
            initialSelectedFoodForEdit={foodForAddModal}
            onAddNewFoodRequest={handleAddNewFoodRequestFromModal}
            onCommitFoodToLibrary={handleCommitFoodItemToMainLibrary}
            dailyGoals={dailyGoals}
          />
      )}
      <DailyEntryDetailsModal
        isVisible={isDetailsModalVisible}
        onClose={() => {
            setIsDetailsModalVisible(false);
            setSelectedEntryForDetails(null);
        }}
        onSave={(newGrams) => {
            if (selectedEntryForDetails) {
                handleUpdateGrams(selectedEntryForDetails.reversedIndex, newGrams);
            }
        }}
        onDelete={handleDeleteFromDetails}
        item={selectedEntryForDetails?.item || null}
        dailyGoals={dailyGoals}
      />
    </SafeAreaView>
  );
};

const useStyles = makeStyles((theme) => ({
  container: { flex: 1, backgroundColor: theme.colors.background },
  progressContainer: { paddingHorizontal: 15, paddingTop: 10 },
  disclaimerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 15,
    paddingBottom: 10,
    opacity: 0.8,
  },
  disclaimerText: {
    marginLeft: 8,
    fontSize: 12,
    color: theme.colors.grey2,
    fontStyle: 'italic',
    textAlign: 'center',
  },
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
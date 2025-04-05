// src/components/AddEntryModal.tsx
import React, { useEffect, useState, useMemo, useCallback } from "react";
import {
    View,
    FlatList,
    KeyboardAvoidingView,
    Platform,
    TouchableOpacity,
    ScrollView,
    Dimensions,
    Image,
    StyleSheet,
    ActivityIndicator,
    Alert,
    Pressable, // Use Pressable for better checkbox-like interaction
} from "react-native";
import {
    Button,
    Input,
    Text,
    ListItem,
    Overlay,
    SearchBar,
    makeStyles,
    useTheme,
    Icon,
    ButtonGroup,
    CheckBox, // Import CheckBox
} from "@rneui/themed";
import { Food } from "../types/food";
import { isValidNumberInput } from "../utils/validationUtils";
import { loadRecentFoods, saveRecentFoods } from "../services/storageService";
import { getFoodIconUrl } from "../utils/iconUtils";
import { getGramsFromNaturalLanguage } from "../utils/units";
import Toast from "react-native-toast-message";
import * as ImagePicker from "expo-image-picker";
import { EstimatedFoodItem, getMultipleFoodsFromImage } from "../utils/macros"; // Import new types/functions
import { v4 as uuidv4 } from 'uuid'; // Import uuid

interface AddEntryModalProps {
    isVisible: boolean;
    toggleOverlay: () => void;
    selectedFood: Food | null;
    grams: string;
    setGrams: (grams: string) => void;
    handleAddEntry: () => void; // For single entry add/update
    handleAddMultipleEntries: (entries: { food: Food, grams: number }[]) => void; // NEW: For quick add
    foods: Food[];
    handleSelectFood: (item: Food | null) => void;
    updateSearch: (search: string) => void;
    search: string;
    isEditMode: boolean;
    initialGrams?: string;
}

const KEYBOARD_VERTICAL_OFFSET = Platform.OS === 'ios' ? 80 : 0;

type UnitMode = 'grams' | 'auto';
type ModalMode = 'normal' | 'quickAddSelect'; // NEW: Control modal display

const AddEntryModal: React.FC<AddEntryModalProps> = ({
    isVisible,
    toggleOverlay,
    selectedFood,
    grams,
    setGrams,
    handleAddEntry,
    handleAddMultipleEntries, // Destructure new prop
    foods,
    handleSelectFood,
    updateSearch,
    search,
    isEditMode,
    initialGrams
}) => {
    const { theme } = useTheme();
    const styles = useStyles();
    const [recentFoods, setRecentFoods] = useState<Food[]>([]);
    const MAX_RECENT_FOODS = 5;
    const [foodIcons, setFoodIcons] = useState<{ [foodName: string]: string | null }>({});

    const [unitMode, setUnitMode] = useState<UnitMode>('grams');
    const [autoInput, setAutoInput] = useState("");
    const [isAiLoading, setIsAiLoading] = useState(false); // For text AI

    // --- Quick Add State ---
    const [modalMode, setModalMode] = useState<ModalMode>('normal');
    const [quickAddLoading, setQuickAddLoading] = useState(false);
    const [quickAddItems, setQuickAddItems] = useState<EstimatedFoodItem[]>([]);
    const [selectedQuickAddIndices, setSelectedQuickAddIndices] = useState<Set<number>>(new Set());
    // --- End Quick Add State ---

    const screenWidth = Dimensions.get('window').width;

    // Filtered foods based on search
    const filteredFoods = useMemo(() => {
        if (!search) return []; // Don't filter if search is empty
        return foods.filter((food) =>
            food.name.toLowerCase().includes(search.toLowerCase())
        );
    }, [foods, search]);

    // Effect to handle state resets based on visibility, edit mode, and selected food changes
    useEffect(() => {
        if (!isVisible) {
            // Reset everything when modal closes
            handleSelectFood(null);
            setGrams("");
            updateSearch("");
            setUnitMode('grams');
            setAutoInput("");
            setIsAiLoading(false);
            // Reset Quick Add State on close
            setModalMode('normal');
            setQuickAddItems([]);
            setSelectedQuickAddIndices(new Set());
            setQuickAddLoading(false);
        } else {
             // When modal becomes visible, ensure it's in normal mode unless already loading quick add
             if (!quickAddLoading) {
                 setModalMode('normal');
             }
            // Only reset autoInput if not loading AI/QuickAdd
            if (!isAiLoading && !quickAddLoading) {
                 setAutoInput("");
             }

            // Determine the correct initial grams value and unit mode based on mode/food
            let targetGrams = grams; // Start with current grams
            let targetUnitMode = unitMode; // Start with current unit mode

            if (isEditMode && selectedFood && initialGrams) {
                // If editing the *same* item for which we have initial grams, restore it.
                targetGrams = initialGrams;
                targetUnitMode = 'grams'; // Default to grams view when editing existing value
            } else if (!isEditMode && selectedFood) {
                targetUnitMode = 'grams'; // Switch to grams mode when a food is selected
            } else if (!selectedFood) {
                targetGrams = ""; // Clear grams if no food is selected
                targetUnitMode = 'grams'; // Default mode
            }
            // Apply the determined state changes *only if they are different* to avoid loops
            if (grams !== targetGrams) {
                setGrams(targetGrams);
            }
             // Only change unit mode if not loading AI/QuickAdd
            if (unitMode !== targetUnitMode && !isAiLoading && !quickAddLoading) {
                 setUnitMode(targetUnitMode);
            }
        }

    // Dependencies: Trigger when visibility, edit mode, selected food, or initial grams change.
    // Also added quickAddLoading dependency to ensure state reset doesn't happen prematurely.
    }, [isVisible, isEditMode, selectedFood, initialGrams, quickAddLoading, handleSelectFood, updateSearch]);


    // Load recent foods when modal becomes visible
    useEffect(() => {
        const loadRecents = async () => {
            const loadedRecentFoods = await loadRecentFoods();
            setRecentFoods(loadedRecentFoods);
        };
        if (isVisible) {
            loadRecents();
        }
    }, [isVisible]);

    // Load icons for visible foods (recent or filtered)
    useEffect(() => {
        const loadIcons = async () => {
            const iconsToLoad: { [foodName: string]: string | null } = {};
            // Only consider relevant foods based on current view (search or recent)
            const relevantFoods = search ? filteredFoods : recentFoods;
            // Create a Map to easily get unique foods by ID
            const uniqueFoodsMap = new Map(relevantFoods.map(food => [food.id, food]));

            let shouldUpdateState = false;
            for (const food of uniqueFoodsMap.values()) {
                // Check if icon state is unknown (undefined) for this food name
                if (foodIcons[food.name] === undefined) {
                    try {
                        const iconUrl = await getFoodIconUrl(food.name);
                        iconsToLoad[food.name] = iconUrl; // Store URL or null if fetch was ok but no result
                        shouldUpdateState = true;
                    } catch (error) {
                         console.warn(`Failed to load icon for ${food.name}:`, error);
                         iconsToLoad[food.name] = null; // Store null explicitly on fetch failure
                         shouldUpdateState = true;
                    }
                }
                 // If already fetched (exists in foodIcons, even if null), don't re-fetch
            }

            if (shouldUpdateState) {
                 setFoodIcons(prevIcons => ({ ...prevIcons, ...iconsToLoad }));
            }
        };

        // Only load if modal is visible and in normal mode
        if (isVisible && modalMode === 'normal' && (foods.length > 0 || recentFoods.length > 0)) {
           loadIcons();
        }
        // Dependencies: isVisible, modalMode, search, filteredFoods, recentFoods, foods
        // Avoid dependency on foodIcons itself to prevent infinite loop
    }, [isVisible, modalMode, search, filteredFoods, recentFoods, foods]);


    const addToRecentFoods = async (food: Food) => {
        // Ensure food and food.id exist before proceeding
        if (!food || !food.id) {
            console.warn("Attempted to add invalid food to recents:", food);
            return;
        }
        // If the most recent food is already the one being added, do nothing
        if (recentFoods.length > 0 && recentFoods[0].id === food.id) return;

        // Filter out the food if it already exists in the list to avoid duplicates
        const updatedRecentFoods = recentFoods.filter(recentFood => recentFood.id !== food.id);
        // Add the new food to the beginning of the list
        updatedRecentFoods.unshift(food);
        // Trim the list to the maximum allowed size
        const trimmedRecentFoods = updatedRecentFoods.slice(0, MAX_RECENT_FOODS);
        // Update the state and save to storage
        setRecentFoods(trimmedRecentFoods);
        await saveRecentFoods(trimmedRecentFoods);
    };


    // Serving size suggestions based on selected food
    const servingSizeSuggestions = useMemo(() => {
        if (!selectedFood) return [];
        return [
            { label: "50g", value: "50" },
            { label: "100g", value: "100" },
            { label: "150g", value: "150" },
            { label: "200g", value: "200" },
        ];
    }, [selectedFood]);

    // Handler for AI gram estimation (Text)
    const handleEstimateGrams = async () => {
        if (!selectedFood || !autoInput.trim()) {
            Alert.alert("Input Missing", "Please select a food and enter a quantity description (e.g., '1 cup', '2 medium').");
            return;
        }

        setIsAiLoading(true);
        try {
            const estimatedGrams = await getGramsFromNaturalLanguage(selectedFood.name, autoInput);
            const roundedGrams = String(Math.round(estimatedGrams));

            setGrams(roundedGrams); // Update the grams state
            setUnitMode('grams'); // Switch view back to grams input
            Toast.show({
                type: 'success',
                text1: 'Grams Estimated',
                text2: `Estimated ${roundedGrams}g for ${selectedFood.name}`,
                position: 'bottom',
                visibilityTime: 3000,
            });
        } catch (error: any) {
            console.error("AI Estimation Error:", error);
            Alert.alert("AI Estimation Failed", error.message || "Could not estimate grams. Please enter manually.");
             // Keep unitMode as 'auto' on failure so user can retry or see input
        } finally {
            setIsAiLoading(false); // Ensure loading state is turned off
        }
    };

    // Handler for adding or updating a SINGLE entry (from normal mode)
    const handleAddOrUpdateSingleEntry = async () => {
        if (!selectedFood) {
             Alert.alert("Food Not Selected", "Please select a food item.");
             return;
        }
        const numericGrams = parseFloat(grams);
        if (!isValidNumberInput(grams) || numericGrams <= 0) {
             Alert.alert(
                "Invalid Amount",
                "Please enter a valid positive number for grams."
            );
            return;
        }

        // Prevent adding if AI or QuickAdd is still loading
        if (isAiLoading || quickAddLoading) return;

        handleAddEntry(); // Call the original prop function for single add/update
        // Add to recents *after* the main action (assuming handleAddEntry doesn't close modal immediately)
        await addToRecentFoods(selectedFood);
        // Note: The modal closing is typically handled within the handleAddEntry implementation
        // in the parent component (DailyEntryScreen) after the state is updated there.
    };


    // Handler for selecting a food item in NORMAL mode
    const handleInternalSelectFood = (item: Food | null) => {
        // If the same food is selected again, do nothing
        if (selectedFood?.id === item?.id) return;

        handleSelectFood(item); // Call the prop function to update parent state

        // When a food is selected/changed (and not in edit mode with initial grams):
        if (item && (!isEditMode || !initialGrams)) {
            // Always switch to grams mode when selecting a food
            setUnitMode('grams');
            setAutoInput(""); // Clear any previous auto input
        } else if (!item) {
             // If food is deselected (set to null)
             setGrams(""); // Clear grams
             setUnitMode('grams');
             setAutoInput("");
        }
        // If isEditMode and initialGrams exist, the main useEffect will handle setting grams.
    };


    // --- Quick Add Functions ---

    const handleQuickAddImage = async () => {
        Alert.alert(
            "Quick Add from Image",
            "Identify multiple foods from a single image.",
            [
                { text: "Cancel", style: "cancel" },
                { text: "Camera", onPress: () => pickImageAndAnalyze('camera') },
                { text: "Gallery", onPress: () => pickImageAndAnalyze('gallery') },
            ]
        );
    };

    const pickImageAndAnalyze = async (source: 'camera' | 'gallery') => {
        let permissionResult;
        let pickerResult: ImagePicker.ImagePickerResult;

        setQuickAddLoading(true); // Start loading indicator

        try {
            if (source === 'camera') {
                permissionResult = await ImagePicker.requestCameraPermissionsAsync();
                if (!permissionResult.granted) {
                    Alert.alert("Permission Required", "Camera access needed.");
                    setQuickAddLoading(false);
                    return;
                }
                pickerResult = await ImagePicker.launchCameraAsync({ quality: 0.6 });
            } else { // gallery
                permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
                if (!permissionResult.granted) {
                    Alert.alert("Permission Required", "Gallery access needed.");
                    setQuickAddLoading(false);
                    return;
                }
                pickerResult = await ImagePicker.launchImageLibraryAsync({
                    mediaTypes: ImagePicker.MediaTypeOptions.Images,
                    quality: 0.6,
                });
            }

            // Handle cancellation
            if (pickerResult.canceled) {
                 console.log("Image selection/capture cancelled for Quick Add.");
                 setQuickAddLoading(false);
                 return; // Exit without changing modal mode
            }

            // Process selected asset
            if (pickerResult.assets && pickerResult.assets.length > 0) {
                const asset = pickerResult.assets[0];
                console.log("Quick Add Image acquired:", asset.uri);

                const fileInfoForApi = {
                    uri: asset.uri,
                    fileName: asset.fileName ?? `quickadd_${Date.now()}.jpg`,
                    type: asset.mimeType ?? 'image/jpeg'
                };

                // --- Call the multi-food analysis function ---
                const results = await getMultipleFoodsFromImage(fileInfoForApi);
                // ---------------------------------------------

                if (results.length === 0) {
                    Alert.alert("No Foods Found", "The AI couldn't identify any food items in the image. Try again or add manually.");
                    setQuickAddItems([]);
                    // Keep loading false, stay in normal mode
                } else {
                    console.log("Quick Add Results:", results);
                    setQuickAddItems(results);
                    setSelectedQuickAddIndices(new Set()); // Reset selection for the new items
                    setModalMode('quickAddSelect'); // << SWITCH TO SELECTION MODE >>

                     // Clear single food selection state when entering quick add
                    handleSelectFood(null);
                    setGrams("");
                    updateSearch("");
                    setUnitMode('grams');
                    setAutoInput("");
                }

            } else {
                 console.log("No assets selected or returned for Quick Add.");
                 Alert.alert("Error", "Could not select image.");
                 // Keep loading false, stay in normal mode
            }

        } catch (error: any) {
            console.error("Error during Quick Add image process:", error);
            Alert.alert(
                "Quick Add Failed",
                `Could not analyze the image. ${error.message || "Please try again."}`
            );
             // Reset state on error and return to normal mode
             setModalMode('normal');
             setQuickAddItems([]);
             setSelectedQuickAddIndices(new Set());
        } finally {
            // Ensure loading state is turned off, possibly after a short delay for UI update
            setTimeout(() => setQuickAddLoading(false), 100);
        }
    };


    const handleToggleQuickAddItem = (index: number) => {
        setSelectedQuickAddIndices(prev => {
            const newSet = new Set(prev);
            if (newSet.has(index)) {
                newSet.delete(index);
            } else {
                newSet.add(index);
            }
            return newSet;
        });
    };

    const handleConfirmQuickAdd = () => {
        if (selectedQuickAddIndices.size === 0) {
            Alert.alert("No Items Selected", "Please select at least one item to add.");
            return;
        }

        // Create the array of entries to pass back to DailyEntryScreen
        const entriesToAdd = Array.from(selectedQuickAddIndices).map(index => {
            const item = quickAddItems[index];
            // Create a temporary Food object for this entry
            // IMPORTANT: This food object is NOT saved to the main food list in storage
            const quickFood: Food = {
                id: uuidv4(), // Generate a temporary UUID for the DailyEntryItem linkage
                name: item.foodName,
                // Round macro values obtained from AI
                calories: Math.round(item.calories_per_100g),
                protein: Math.round(item.protein_per_100g),
                carbs: Math.round(item.carbs_per_100g),
                fat: Math.round(item.fat_per_100g),
            };
             // Round estimated grams as well, ensure it's at least 1g
            const entryGrams = Math.max(1, Math.round(item.estimatedWeightGrams));
            return { food: quickFood, grams: entryGrams };
        });

        // Call the new prop function provided by DailyEntryScreen
        handleAddMultipleEntries(entriesToAdd);

        // Close the modal after successfully initiating the add process
        toggleOverlay();
    };

    // --- End Quick Add Functions ---

    // Combined loading state check
    const isActionDisabled = isAiLoading || quickAddLoading;

    // Disable Add/Update button logic
    const isAddButtonDisabled = modalMode !== 'normal' || !selectedFood || !isValidNumberInput(grams) || parseFloat(grams) <= 0 || isActionDisabled;
    // Disable AI Estimate button logic
    const isAiButtonDisabled = modalMode !== 'normal' || !selectedFood || !autoInput.trim() || isActionDisabled;
    // Disable Quick Add Confirm button logic
    const isQuickAddConfirmDisabled = modalMode !== 'quickAddSelect' || selectedQuickAddIndices.size === 0 || isActionDisabled;


    // Prepare styles and theme
    const combinedOverlayStyle = StyleSheet.flatten([
        styles.overlayStyle,
        { backgroundColor: theme.colors.background }
    ]);

    return (
        <Overlay
            isVisible={isVisible}
            onBackdropPress={!isActionDisabled ? toggleOverlay : undefined} // Prevent closing while loading
            animationType="slide"
            overlayStyle={styles.overlayContainer}
        >
            <KeyboardAvoidingView
                behavior={Platform.OS === "ios" ? "padding" : "height"}
                style={styles.keyboardAvoidingView}
                keyboardVerticalOffset={KEYBOARD_VERTICAL_OFFSET}
            >
                {/* Main content view inside KeyboardAvoidingView */}
                <View style={combinedOverlayStyle}>
                    {/* Header */}
                    <View style={styles.header}>
                         {/* Close Button */}
                         <TouchableOpacity onPress={!isActionDisabled ? toggleOverlay : undefined} style={styles.closeIconTouchable} disabled={isActionDisabled}>
                            <Icon
                                name="close"
                                type="material"
                                size={28}
                                color={isActionDisabled ? theme.colors.grey3 : theme.colors.text}
                            />
                        </TouchableOpacity>

                        {/* Title */}
                        <Text h4 h4Style={[styles.overlayTitle, isEditMode && modalMode === 'normal' && styles.editModeTitle]} numberOfLines={1} ellipsizeMode="tail">
                            {modalMode === 'quickAddSelect'
                                ? "Select Items to Add"
                                : isEditMode
                                ? "Edit Entry"
                                : "Add Entry"}
                        </Text>

                         {/* Conditional Header Actions */}
                         {modalMode === 'normal' && (
                            <>
                                {/* Quick Add Icon Button */}
                                <TouchableOpacity onPress={handleQuickAddImage} disabled={isActionDisabled} style={styles.headerIcon}>
                                    {quickAddLoading ? (
                                        <ActivityIndicator size="small" color={theme.colors.primary} />
                                     ) : (
                                        <Icon
                                            name="camera-burst" // Icon for quick add image feature
                                            type="material-community"
                                            size={26}
                                            color={isActionDisabled ? theme.colors.grey3 : theme.colors.primary}
                                        />
                                    )}
                                </TouchableOpacity>

                                {/* Add/Update Button (Single Entry) */}
                                <Button
                                    title={isEditMode ? "Update" : "Add"}
                                    onPress={handleAddOrUpdateSingleEntry}
                                    disabled={isAddButtonDisabled}
                                    buttonStyle={[styles.addButton, isEditMode && styles.updateButton]}
                                    titleStyle={styles.buttonTitle}
                                    // No loading needed here as DailyEntryScreen handles it
                                />
                             </>
                         )}
                         {modalMode === 'quickAddSelect' && (
                            /* Confirm Quick Add Button */
                            <Button
                                title={`Add ${selectedQuickAddIndices.size}`} // Show count
                                onPress={handleConfirmQuickAdd}
                                disabled={isQuickAddConfirmDisabled}
                                buttonStyle={[styles.addButton, { backgroundColor: theme.colors.success }]} // Use success color
                                titleStyle={styles.buttonTitle}
                                // Loading is handled by the global indicator
                            />
                         )}
                    </View>

                    {/* --- Loading Indicators (Centered) --- */}
                    {(isAiLoading || quickAddLoading) && (
                        <View style={styles.loadingContainer}>
                            <ActivityIndicator size="large" color={theme.colors.primary} />
                             <Text style={styles.loadingText}>
                                {quickAddLoading ? "Analyzing Image..." : "Estimating Grams..."}
                             </Text>
                        </View>
                    )}

                    {/* --- Conditional Content (Normal Mode) --- */}
                    {!isActionDisabled && modalMode === 'normal' && (
                         <>
                            {/* Search Bar */}
                            <SearchBar
                                placeholder="Search Foods..."
                                onChangeText={updateSearch}
                                value={search}
                                platform={Platform.OS === "ios" ? "ios" : "android"}
                                containerStyle={styles.searchBarContainer}
                                inputContainerStyle={styles.searchBarInputContainer}
                                inputStyle={styles.searchInputStyle}
                                onCancel={() => updateSearch('')}
                                // No need to disable search while AI loading, handled by isActionDisabled check
                            />

                            {/* Recent Foods (Only show if NOT searching) */}
                            {!search && recentFoods.length > 0 && (
                                <View style={styles.recentFoodsSection}>
                                     <Text style={styles.sectionTitle}>Recent</Text>
                                        <FlatList
                                            data={recentFoods}
                                            keyExtractor={(item) => `recent-${item.id}`}
                                            horizontal
                                            showsHorizontalScrollIndicator={false}
                                            contentContainerStyle={styles.recentFoodsContainer}
                                            renderItem={({ item }) => (
                                                <TouchableOpacity
                                                    style={[
                                                        styles.recentFoodItem,
                                                        screenWidth < 350 && styles.smallRecentFoodItem,
                                                        selectedFood?.id === item.id && styles.selectedRecentFoodItem,
                                                    ]}
                                                    onPress={() => handleInternalSelectFood(item)}
                                                    // Disabled handled by isActionDisabled check
                                                >
                                                    {/* Icon Loading/Display Logic */}
                                                    {foodIcons[item.name] !== undefined ? ( // Check if status is known
                                                        foodIcons[item.name] ? ( // Check if URL exists
                                                            <Image
                                                                source={{ uri: foodIcons[item.name] as string }}
                                                                style={styles.foodIconSmall}
                                                                onError={() => setFoodIcons(prev => ({...prev, [item.name]: null}))} // Mark failed
                                                            />
                                                        ) : ( // URL is null (fetch failed or no icon found)
                                                             <View style={[styles.foodIconSmall, styles.iconPlaceholderSmall]}>
                                                                 <Icon name="fastfood" type="material" size={12} color={theme.colors.grey2} />
                                                             </View>
                                                        )
                                                    ) : ( // Undefined: Still loading
                                                        <ActivityIndicator size="small" color={theme.colors.grey3} style={styles.foodIconSmall} />
                                                    )}
                                                    <Text
                                                        style={[styles.recentFoodText, screenWidth < 350 && styles.smallRecentFoodText]}
                                                        numberOfLines={1}
                                                        ellipsizeMode="tail"
                                                    >
                                                        {item.name}
                                                    </Text>
                                                </TouchableOpacity>
                                            )}
                                        />
                                </View>
                            )}

                            {/* Food Search Results List (Only show IF searching) */}
                             {search && (
                                <FlatList
                                    data={filteredFoods}
                                    keyExtractor={(item) => `search-${item.id}`}
                                    renderItem={({ item }) => (
                                        <TouchableOpacity onPress={() => handleInternalSelectFood(item)} >
                                            <ListItem
                                                bottomDivider
                                                containerStyle={[
                                                    styles.listItemContainer,
                                                    selectedFood?.id === item.id && styles.selectedListItem,
                                                ]}
                                            >
                                                {/* Icon Loading/Display Logic */}
                                                {foodIcons[item.name] !== undefined ? (
                                                    foodIcons[item.name] ? (
                                                        <Image
                                                            source={{ uri: foodIcons[item.name] as string }}
                                                            style={styles.foodIcon}
                                                            onError={() => setFoodIcons(prev => ({...prev, [item.name]: null}))}
                                                        />
                                                    ) : (
                                                        <View style={styles.defaultIconContainer}>
                                                            <Icon name="restaurant" type="material" size={18} color={theme.colors.grey3} />
                                                        </View>
                                                    )
                                                ) : (
                                                     <ActivityIndicator size="small" color={theme.colors.grey3} style={styles.foodIcon} />
                                                )}
                                                <ListItem.Content>
                                                    <ListItem.Title style={styles.listItemTitle}>{item.name}</ListItem.Title>
                                                </ListItem.Content>
                                                {selectedFood?.id === item.id && (
                                                    <Icon name="checkmark-circle" type="ionicon" color={theme.colors.primary} size={24} />
                                                )}
                                            </ListItem>
                                        </TouchableOpacity>
                                    )}
                                    style={styles.foodList}
                                    ListEmptyComponent={
                                        <Text style={styles.noFoodsText}>No foods found matching "{search}".</Text>
                                    }
                                    initialNumToRender={10}
                                    maxToRenderPerBatch={10}
                                    windowSize={5}
                                    keyboardShouldPersistTaps="handled"
                                />
                             )}

                            {/* Amount Input Section (Only show if a food is selected) */}
                            {selectedFood && (
                                <View style={styles.amountSection}>
                                     {/* Unit Mode Selector */}
                                     <View style={styles.unitSelectorContainer}>
                                        <Text style={styles.inputLabel}>Amount</Text>
                                        <ButtonGroup
                                            buttons={['Grams', 'Auto (AI)']}
                                            selectedIndex={unitMode === 'grams' ? 0 : 1}
                                            onPress={(index) => {
                                                const newMode = index === 0 ? 'grams' : 'auto';
                                                if (unitMode !== newMode) {
                                                     setUnitMode(newMode);
                                                    // Optional: Clear auto input when switching to it?
                                                    // if (newMode === 'auto') setAutoInput("");
                                                }
                                            }}
                                            containerStyle={styles.buttonGroupContainer}
                                            selectedButtonStyle={{ backgroundColor: theme.colors.primary }}
                                            textStyle={styles.buttonGroupText}
                                            selectedTextStyle={{ color: theme.colors.white }}
                                            // Disabled handled by isActionDisabled check
                                        />
                                     </View>

                                    {/* Conditional Input Field */}
                                    {unitMode === 'grams' && (
                                        <>
                                             {/* Serving Size Suggestions */}
                                             {servingSizeSuggestions.length > 0 && (
                                                <View style={styles.servingSizeRow}>
                                                    <Text style={styles.servingSizeLabel}>Quick Add:</Text>
                                                    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.servingSizeContainer}>
                                                        {servingSizeSuggestions.map((suggestion) => (
                                                            <TouchableOpacity
                                                                key={suggestion.label}
                                                                style={styles.servingSizeButton}
                                                                onPress={() => {
                                                                    if (grams !== suggestion.value) {
                                                                        setGrams(suggestion.value);
                                                                    }
                                                                }}
                                                                // Disabled handled by isActionDisabled check
                                                            >
                                                                <Text style={styles.servingSizeButtonTitle}>{suggestion.label}</Text>
                                                            </TouchableOpacity>
                                                        ))}
                                                    </ScrollView>
                                                </View>
                                             )}
                                            {/* Grams Input */}
                                            <Input
                                                placeholder="Enter exact grams (e.g., 150)"
                                                keyboardType="numeric"
                                                value={grams} // Value is correctly bound to state
                                                onChangeText={(text) => {
                                                    // Allow only numbers and one decimal point
                                                    const cleanedText = text.replace(/[^0-9.]/g, "").replace(/(\..*)\./g, '$1');
                                                    if (grams !== cleanedText) { // Prevent unnecessary state updates
                                                        setGrams(cleanedText);
                                                    }
                                                }}
                                                inputStyle={styles.gramInputStyle}
                                                inputContainerStyle={styles.gramInputContainerStyle}
                                                errorMessage={!isValidNumberInput(grams) && grams !== "" && grams !== "." ? "Enter a valid number" : ""}
                                                errorStyle={{ color: theme.colors.error }}
                                                rightIcon={<Text style={styles.unitText}> g</Text>}
                                                // Disabled handled by isActionDisabled check
                                                containerStyle={{ paddingHorizontal: 0 }}
                                                key={`grams-input-${selectedFood?.id}`}
                                            />
                                        </>
                                    )}

                                    {unitMode === 'auto' && (
                                        <View style={styles.autoInputRow}>
                                            <Input
                                                placeholder="Describe quantity (e.g., 1 cup cooked)"
                                                value={autoInput}
                                                onChangeText={setAutoInput}
                                                inputStyle={[styles.gramInputStyle, styles.autoInputField]}
                                                inputContainerStyle={styles.gramInputContainerStyle}
                                                containerStyle={styles.autoInputContainer}
                                                multiline={false}
                                                // Disabled handled by isActionDisabled check
                                                onSubmitEditing={handleEstimateGrams} // Trigger estimation on submit
                                                key={`auto-input-${selectedFood?.id}`}
                                            />
                                            <Button
                                                onPress={handleEstimateGrams}
                                                disabled={isAiButtonDisabled}
                                                loading={isAiLoading} // Show loading indicator on the button itself
                                                buttonStyle={styles.aiButton}
                                                icon={
                                                    isAiLoading ? (
                                                        <ActivityIndicator size="small" color={theme.colors.white} />
                                                    ) : (
                                                        <Icon name="calculator-variant" type="material-community" size={20} color={theme.colors.white} />
                                                    )
                                                }
                                            />
                                        </View>
                                    )}
                                </View>
                            )}
                         </>
                    )}

                    {/* --- Conditional Content (Quick Add Selection Mode) --- */}
                    {!isActionDisabled && modalMode === 'quickAddSelect' && (
                        <>
                          {/* Header for Quick Add section */}
                          <View style={styles.quickAddHeader}>
                            <Text style={styles.sectionTitle}>Select Items from Image</Text>
                             <Button
                                type="clear"
                                title="Back"
                                onPress={() => {
                                     setModalMode('normal'); // Go back to normal mode
                                     // Optionally reset quick add state when going back
                                     setQuickAddItems([]);
                                     setSelectedQuickAddIndices(new Set());
                                }}
                                titleStyle={{ color: theme.colors.primary, fontSize: 14 }}
                                icon={<Icon name="arrow-back" type="ionicon" size={18} color={theme.colors.primary} />}
                                // Disabled handled by isActionDisabled check
                             />
                          </View>
                            {/* List of identified items */}
                            <FlatList
                                data={quickAddItems}
                                keyExtractor={(item, index) => `quickadd-${index}-${item.foodName}`}
                                renderItem={({ item, index }) => {
                                    const isSelected = selectedQuickAddIndices.has(index);
                                    const estimatedCalories = Math.round((item.calories_per_100g / 100) * item.estimatedWeightGrams);
                                    return (
                                         // Use Pressable for the whole row to enable toggling selection easily
                                        <Pressable onPress={() => handleToggleQuickAddItem(index)}>
                                            <ListItem
                                                bottomDivider
                                                containerStyle={[
                                                    styles.quickAddItemContainer,
                                                    isSelected && styles.quickAddItemSelected // Apply highlight style if selected
                                                ]}
                                            >
                                                 {/* Checkbox visual indicator */}
                                                <CheckBox
                                                    checked={isSelected}
                                                    onPress={() => handleToggleQuickAddItem(index)} // Allow direct toggle too
                                                    containerStyle={styles.quickAddCheckbox}
                                                    checkedColor={theme.colors.primary}
                                                    // Disabled handled by isActionDisabled check
                                                />
                                                {/* Item Details */}
                                                <ListItem.Content>
                                                    <ListItem.Title style={styles.quickAddItemTitle}>{item.foodName}</ListItem.Title>
                                                    <ListItem.Subtitle style={styles.quickAddItemSubtitle}>
                                                        {`Est: ${Math.round(item.estimatedWeightGrams)}g • ~${estimatedCalories} kcal`}
                                                    </ListItem.Subtitle>
                                                     {/* Optional: Show more detailed macros per serving if needed */}
                                                     {/*
                                                     <Text style={styles.quickAddMacroDetail}>
                                                         P: {Math.round((item.protein_per_100g / 100) * item.estimatedWeightGrams)}g,
                                                         C: {Math.round((item.carbs_per_100g / 100) * item.estimatedWeightGrams)}g,
                                                         F: {Math.round((item.fat_per_100g / 100) * item.estimatedWeightGrams)}g
                                                     </Text>
                                                     */}
                                                </ListItem.Content>
                                                {/* Optional: Chevron or other visual cue */}
                                            </ListItem>
                                        </Pressable>
                                    );
                                }}
                                ListEmptyComponent={
                                    // Show message if AI returned an empty array initially
                                     <View style={styles.emptyListContainer}>
                                         <Text style={styles.emptyListText}>No identifiable foods found in the image.</Text>
                                         <Text style={styles.emptyListSubText}>Try another image or add manually.</Text>
                                     </View>
                                }
                                style={styles.quickAddList} // Apply specific styles for this list
                            />
                        </>
                    )}

                     {/* Spacer at the bottom for padding */}
                     <View style={{ height: 20 }} />
                </View>
            </KeyboardAvoidingView>
             {/* Toast component for notifications */}
             <Toast />
        </Overlay>
    );
};

// --- Styles ---
const useStyles = makeStyles((theme) => ({
    // --- Existing Styles (Keep ALL of these) ---
    overlayContainer: {
        backgroundColor: 'transparent',
        width: '90%',
        maxWidth: 500,
        padding: 0,
        borderRadius: 15,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 3 },
        shadowOpacity: 0.2,
        shadowRadius: 5,
        elevation: 6,
        overflow: 'hidden', // Changed from 'visible' to 'hidden'
    },
    overlayStyle: {
        width: '100%',
        borderRadius: 15,
        padding: 15,
        paddingBottom: 0, // Reset paddingBottom here, add spacing view instead
        maxHeight: Dimensions.get('window').height * 0.85,
        // backgroundColor applied dynamically using theme
    },
    keyboardAvoidingView: {
         width: "100%",
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 15,
        paddingHorizontal: 5,
    },
     closeIconTouchable: {
        padding: 5, // Make hitbox larger
        zIndex: 1,
    },
    overlayTitle: {
        color: theme.colors.text,
        fontWeight: 'bold',
        fontSize: 20,
        textAlign: 'center',
        flex: 1, // Allow title to take space but shrink if needed
        marginHorizontal: 5,
    },
    editModeTitle: {
        color: theme.colors.warning, // Keep warning color for edit mode title
    },
     headerIcon: { // Style for the quick add icon button in header
        padding: 5,
        marginHorizontal: 5, // Space around the icon
        zIndex: 1,
    },
    addButton: {
        borderRadius: 20,
        paddingHorizontal: 15,
        paddingVertical: 8,
        minWidth: 70, // Ensure button has minimum width
        marginLeft: 5, // Space from title/quick add icon
        backgroundColor: theme.colors.primary, // Default color
        zIndex: 1,
    },
     updateButton: {
        backgroundColor: theme.colors.warning, // Specific color for update
    },
    buttonTitle: {
        color: theme.colors.white,
        fontWeight: '600',
        fontSize: 15,
    },
    searchBarContainer: {
        backgroundColor: "transparent",
        borderBottomColor: "transparent",
        borderTopColor: "transparent",
        paddingHorizontal: 0,
        marginBottom: 10,
    },
    searchBarInputContainer: {
        borderRadius: 25,
        backgroundColor: theme.colors.searchBg || theme.colors.grey5,
        height: 40,
    },
    searchInputStyle: {
        color: theme.colors.text,
        fontSize: 15,
    },
    recentFoodsSection: {
        marginBottom: 15,
    },
    sectionTitle: {
        fontWeight: '600',
        marginBottom: 8,
        color: theme.colors.grey1,
        fontSize: 14,
        marginLeft: 5,
        textTransform: 'uppercase',
    },
     recentFoodsContainer: {
        paddingHorizontal: 5,
        paddingVertical: 2,
    },
    recentFoodItem: {
        paddingHorizontal: 10,
        paddingVertical: 6,
        borderRadius: 16,
        backgroundColor: theme.colors.grey5,
        marginRight: 8,
        flexDirection: 'row',
        alignItems: 'center',
        borderWidth: 1.5,
        borderColor: 'transparent', // Default border
    },
    selectedRecentFoodItem: {
        borderColor: theme.colors.primary, // Highlight selected recent food
    },
    smallRecentFoodItem: { // Adjustments for smaller screens
        paddingHorizontal: 8,
        paddingVertical: 5,
    },
    foodIconSmall: { // Style for small icons (recents)
        width: 20,
        height: 20,
        marginRight: 6,
        borderRadius: 10,
        resizeMode: "contain",
        alignItems: 'center', // Center potential activity indicator
        justifyContent: 'center', // Center potential activity indicator
        backgroundColor: theme.colors.grey4, // Background for loading/placeholder state
    },
     iconPlaceholderSmall: { // Specific style for placeholder background/icon
        backgroundColor: theme.colors.grey4,
        alignItems: 'center',
        justifyContent: 'center',
    },
    recentFoodText: {
        color: theme.colors.text,
        fontSize: 13,
        maxWidth: 80, // Limit text width
    },
    smallRecentFoodText: {
        fontSize: 12,
        maxWidth: 70,
    },
    foodList: { // Style for the search results list
        maxHeight: Dimensions.get('window').height * 0.3,
        minHeight: 60,
        flexGrow: 0, // Prevent infinite growth
        marginBottom: 15,
    },
    listItemContainer: { // Style for search result items
        backgroundColor: 'transparent',
        paddingVertical: 8,
        paddingHorizontal: 5,
        borderBottomColor: theme.colors.divider,
    },
    selectedListItem: { // Highlight selected search result
        backgroundColor: theme.colors.grey5,
        borderRadius: 8,
    },
     defaultIconContainer: { // Placeholder for larger icons (search results)
        width: 35,
        height: 35,
        marginRight: 12,
        borderRadius: 17.5,
        backgroundColor: theme.colors.grey5,
        alignItems: 'center',
        justifyContent: 'center',
    },
    foodIcon: { // Style for larger icons (search results)
        width: 35,
        height: 35,
        marginRight: 12,
        borderRadius: 17.5,
        resizeMode: "contain",
        backgroundColor: theme.colors.grey5, // Background for loading state
        alignItems: 'center', // Center potential activity indicator
        justifyContent: 'center', // Center potential activity indicator
    },
    listItemTitle: {
        color: theme.colors.text,
        fontSize: 16,
        fontWeight: '500',
    },
    noFoodsText: {
        color: theme.colors.grey2,
        fontStyle: 'italic',
        textAlign: 'center',
        marginTop: 20,
        marginBottom: 10,
        paddingHorizontal: 10,
    },
    amountSection: { // Container for amount input (grams/auto)
        marginTop: 10,
        borderTopWidth: 1,
        borderTopColor: theme.colors.divider,
        paddingTop: 15,
    },
    unitSelectorContainer: { // Row for "Amount" label and Unit ButtonGroup
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: 15,
        paddingHorizontal: 5,
    },
    inputLabel: {
        fontWeight: '600',
        color: theme.colors.grey1,
        fontSize: 14,
        marginRight: 10,
        textTransform: 'uppercase',
    },
    buttonGroupContainer: { // Style for the Unit ButtonGroup ('Grams', 'Auto')
        flex: 0.7,
        maxWidth: 220,
        height: 35,
        borderRadius: 8,
        backgroundColor: theme.colors.background, // Match modal background
    },
     buttonGroupText: { // Text style inside the ButtonGroup
        fontSize: 14,
        color: theme.colors.text,
    },
     servingSizeRow: { // Row for "Quick Add:" label and serving size buttons
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 12,
        paddingHorizontal: 5,
    },
    servingSizeLabel: {
        color: theme.colors.grey2,
        fontSize: 13,
        marginRight: 8,
    },
    servingSizeContainer: { // Container for the horizontal scroll of serving sizes
        flexGrow: 0,
    },
    servingSizeButton: { // Style for individual serving size buttons (e.g., "50g")
      backgroundColor: theme.colors.grey4,
      borderRadius: 15,
      marginRight: 8,
      paddingHorizontal: 12,
      paddingVertical: 5,
      justifyContent: 'center',
      alignItems: 'center',
      height: 30,
    },
    servingSizeButtonTitle: {
        color: theme.colors.text,
        fontSize: 13,
    },
    gramInputStyle: { // Style for the text *inside* the Input components
        color: theme.colors.text,
        fontSize: 16,
        paddingVertical: 8,
        height: 40, // Consistent height
    },
    gramInputContainerStyle: { // Style for the container *around* the Input (underline, etc.)
        borderBottomColor: theme.colors.grey3,
        paddingHorizontal: 5,
    },
    unitText: { // Style for the "g" unit text in Grams input
        color: theme.colors.grey2,
        fontSize: 15,
        fontWeight: '500',
        paddingRight: 5,
    },
     autoInputRow: { // Row containing the Auto (AI) input and button
        flexDirection: 'row',
        alignItems: 'center',
    },
    autoInputContainer: { // Container for the Auto input field
       flex: 1, // Take available space
       paddingHorizontal: 0,
       marginRight: 10, // Space before AI button
    },
    autoInputField: { // Specific style adjustments for Auto input text if needed
       height: 40,
    },
    aiButton: { // Style for the AI ('calculator') button
        backgroundColor: theme.colors.secondary,
        borderRadius: 20,
        width: 40,
        height: 40,
        padding: 0,
        justifyContent: 'center',
        alignItems: 'center',
    },

    // --- Loading Indicator Styles ---
    loadingContainer: {
        // Styles for the view containing the ActivityIndicator and text
        position: 'absolute', // Position it over the content
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.1)', // Slight overlay dim
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 10, // Ensure it's above other content
        borderRadius: 15, // Match modal border radius
    },
    loadingText: {
        marginTop: 10,
        color: theme.colors.text, // Use theme text color
        fontSize: 16,
        fontWeight: '500',
    },

     // --- Quick Add Styles ---
     quickAddHeader: { // Container for "Select Items" title and Back button
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 10,
        paddingHorizontal: 5,
        borderBottomWidth: 1, // Add separator
        borderBottomColor: theme.colors.divider,
        paddingBottom: 8,
     },
     quickAddList: { // Style for the FlatList containing selectable items
        maxHeight: Dimensions.get('window').height * 0.5, // Limit height
        flexGrow: 0,
        marginBottom: 10,
     },
     quickAddItemContainer: { // Style for each row (ListItem) in the quick add list
        paddingVertical: 10,
        paddingHorizontal: 5,
        backgroundColor: theme.colors.background,
        borderBottomColor: theme.colors.divider,
     },
     quickAddItemSelected: { // Style applied when a quick add item is selected
        backgroundColor: theme.colors.successLight, // Use a light success color for selection
        // Or use: theme.colors.grey5 if successLight is too strong
     },
      quickAddCheckbox: { // Style for the CheckBox component
        padding: 0,
        margin: 0,
        marginRight: 10,
        backgroundColor: 'transparent',
        borderWidth: 0,
     },
     quickAddItemTitle: { // Title (food name) in the quick add list item
        fontWeight: 'bold',
        color: theme.colors.text,
        fontSize: 16,
     },
     quickAddItemSubtitle: { // Subtitle (estimated grams, calories)
        color: theme.colors.grey1,
        fontSize: 13,
        marginTop: 2,
     },
     quickAddMacroDetail: { // Optional text for detailed macros
        color: theme.colors.grey3,
        fontSize: 11,
        marginTop: 4,
     },
      emptyListContainer: { // Re-using style for empty list messages
        alignItems: 'center',
        paddingVertical: 30,
        paddingHorizontal: 15, // Add horizontal padding
    },
    emptyListText: {
        color: theme.colors.grey2,
        fontSize: 16,
        textAlign: 'center',
    },
    emptyListSubText: { // Added style for sub-text in empty lists
        fontSize: 14,
        color: theme.colors.grey3,
        textAlign: 'center',
        marginTop: 5,
    },
}));

export default AddEntryModal;
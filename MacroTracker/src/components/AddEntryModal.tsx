// AddEntryModal.tsx
import React, { useEffect, useState, useMemo } from "react";
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
} from "@rneui/themed";
import { Food } from "../types/food";
import { isValidNumberInput } from "../utils/validationUtils";
import { loadRecentFoods, saveRecentFoods } from "../services/storageService";
import { getFoodIconUrl } from "../utils/iconUtils";
import { getGramsFromNaturalLanguage } from "../utils/units";
import Toast from "react-native-toast-message";

interface AddEntryModalProps {
    isVisible: boolean;
    toggleOverlay: () => void;
    selectedFood: Food | null;
    grams: string;
    setGrams: (grams: string) => void;
    handleAddEntry: () => void;
    foods: Food[];
    handleSelectFood: (item: Food | null) => void;
    updateSearch: (search: string) => void;
    search: string;
    isEditMode: boolean;
    initialGrams?: string;
}

const KEYBOARD_VERTICAL_OFFSET = Platform.OS === 'ios' ? 80 : 0;

type UnitMode = 'grams' | 'auto';

const AddEntryModal: React.FC<AddEntryModalProps> = ({
    isVisible,
    toggleOverlay,
    selectedFood,
    grams,
    setGrams,
    handleAddEntry,
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
    const [isAiLoading, setIsAiLoading] = useState(false);

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
        } else {
            // Modal is visible or just became visible
            if (!isAiLoading) {
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
            if (unitMode !== targetUnitMode && !isAiLoading) {
                 setUnitMode(targetUnitMode);
            }
        }

    // Dependencies: Trigger when visibility, edit mode, selected food, or initial grams change.
    }, [isVisible, isEditMode, selectedFood, initialGrams, handleSelectFood, updateSearch]);


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
            const relevantFoods = search ? filteredFoods : recentFoods;
            const uniqueFoods = Array.from(new Map(relevantFoods.map(food => [food.id, food])).values());

            let shouldUpdateState = false;
            for (const food of uniqueFoods) {
                if (!(food.name in foodIcons)) {
                    try {
                        const iconUrl = await getFoodIconUrl(food.name);
                        iconsToLoad[food.name] = iconUrl;
                        shouldUpdateState = true;
                    } catch (error) {
                         console.warn(`Failed to load icon for ${food.name}:`, error);
                         iconsToLoad[food.name] = null;
                         shouldUpdateState = true;
                    }
                }
            }

            if (shouldUpdateState) {
                 setFoodIcons(prevIcons => ({ ...prevIcons, ...iconsToLoad }));
            }
        };

        if (isVisible && (foods.length > 0 || recentFoods.length > 0)) {
           loadIcons();
        }
    }, [isVisible, search, filteredFoods, recentFoods, foods]); // Keep foodIcons dependency out to avoid loop


    const addToRecentFoods = async (food: Food) => {
        if (recentFoods.length > 0 && recentFoods[0].id === food.id) return;

        const updatedRecentFoods = recentFoods.filter(recentFood => recentFood.id !== food.id);
        updatedRecentFoods.unshift(food);
        const trimmedRecentFoods = updatedRecentFoods.slice(0, MAX_RECENT_FOODS);
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

    // Handler for AI gram estimation
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
            // Keep autoInput for reference, or clear it:
            // setAutoInput("");
        } catch (error: any) {
            console.error("AI Estimation Error:", error);
            Alert.alert("AI Estimation Failed", error.message || "Could not estimate grams. Please enter manually.");
             // Keep unitMode as 'auto' on failure so user can retry or see input
        } finally {
            setIsAiLoading(false); // Ensure loading state is turned off
        }
    };

    // Handler for adding or updating the entry
    const handleAddOrUpdateEntry = async () => {
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

        // Prevent adding if AI is still loading (belt and suspenders)
        if (isAiLoading) return;

        handleAddEntry(); // Call the prop function
        await addToRecentFoods(selectedFood); // Add to recents
    };

    // Prepare styles and theme
    const combinedOverlayStyle = StyleSheet.flatten([
        styles.overlayStyle,
        { backgroundColor: theme.colors.background }
    ]);

    // Disable Add/Update button logic
    const isAddButtonDisabled = !selectedFood || !isValidNumberInput(grams) || parseFloat(grams) <= 0 || isAiLoading;
    // Disable AI Estimate button logic
    const isAiButtonDisabled = !selectedFood || !autoInput.trim() || isAiLoading;

    // Handler for selecting a food item
    const handleInternalSelectFood = (item: Food | null) => {
        // If the same food is selected again, do nothing
        if (selectedFood?.id === item?.id) return;

        handleSelectFood(item); // Call the prop function to update parent state

        // When a food is selected/changed (and not in edit mode with initial grams):
        if (item && (!isEditMode || !initialGrams)) {
            // Option 1: Clear grams whenever a new food is selected
            // setGrams("");

            // Option 2: Keep existing grams (current behavior implicitly)

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

    return (
        <Overlay
            isVisible={isVisible}
            onBackdropPress={!isAiLoading ? toggleOverlay : undefined} // Prevent closing while AI loading
            animationType="slide"
            overlayStyle={styles.overlayContainer}
        >
            <KeyboardAvoidingView
                behavior={Platform.OS === "ios" ? "padding" : "height"}
                style={styles.keyboardAvoidingView}
                keyboardVerticalOffset={KEYBOARD_VERTICAL_OFFSET}
            >
                <View style={combinedOverlayStyle}>
                    {/* Header */}
                    <View style={styles.header}>
                         <TouchableOpacity onPress={!isAiLoading ? toggleOverlay : undefined} style={styles.closeIconTouchable} disabled={isAiLoading}>
                            <Icon
                                name="close"
                                type="material"
                                size={28}
                                color={isAiLoading ? theme.colors.grey3 : theme.colors.text}
                            />
                        </TouchableOpacity>
                        <Text h4 h4Style={[styles.overlayTitle, isEditMode && styles.editModeTitle]}>
                            {isEditMode ? "Edit Entry" : "Add Entry"}
                        </Text>
                        <Button
                            title={isEditMode ? "Update" : "Add"}
                            onPress={handleAddOrUpdateEntry}
                            disabled={isAddButtonDisabled}
                            buttonStyle={[styles.addButton, isEditMode && styles.updateButton]}
                            titleStyle={styles.buttonTitle}
                            // Loading indicator could be shown here too if needed during add/update action
                            // loading={someOtherLoadingState}
                        />
                    </View>

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
                        disabled={isAiLoading} // Disable search while AI loading?
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
                                        onPress={() => handleInternalSelectFood(item)} // Use internal handler
                                        disabled={isAiLoading}
                                    >
                                        {foodIcons[item.name] ? (
                                            <Image
                                                source={{ uri: foodIcons[item.name] as string }}
                                                style={styles.foodIconSmall}
                                                onError={() => setFoodIcons(prev => ({...prev, [item.name]: null}))}
                                            />
                                        ) : (
                                            <View style={[styles.foodIconSmall, styles.iconPlaceholderSmall]}>
                                                <Icon name="fastfood" type="material" size={12} color={theme.colors.grey2} />
                                            </View>
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
                                <TouchableOpacity onPress={() => handleInternalSelectFood(item)} disabled={isAiLoading}>
                                    <ListItem
                                        bottomDivider
                                        containerStyle={[
                                            styles.listItemContainer,
                                            selectedFood?.id === item.id && styles.selectedListItem,
                                        ]}
                                    >
                                        {foodIcons[item.name] ? (
                                            <Image
                                                source={{ uri: foodIcons[item.name] as string }}
                                                style={styles.foodIcon}
                                                onError={() => setFoodIcons(prev => ({...prev, [item.name]: null}))}
                                            />
                                        ) : (
                                            <View style={styles.defaultIconContainer}>
                                                <Icon name="restaurant" type="material" size={18} color={theme.colors.grey3} />
                                            </View>
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
                                        if (unitMode !== newMode) { // Only update if mode changes
                                             setUnitMode(newMode);
                                             // Optional: Clear auto input when switching to it?
                                             // if (newMode === 'auto') setAutoInput("");
                                        }
                                    }}
                                    containerStyle={styles.buttonGroupContainer}
                                    selectedButtonStyle={{ backgroundColor: theme.colors.primary }}
                                    textStyle={styles.buttonGroupText}
                                    selectedTextStyle={{ color: theme.colors.white }}
                                    disabled={isAiLoading} // Disable switching modes while AI runs
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
                                                            // Only update if value is different
                                                            if (grams !== suggestion.value) {
                                                                setGrams(suggestion.value);
                                                            }
                                                        }}
                                                        disabled={isAiLoading}
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
                                        disabled={isAiLoading} // Disable input while AI processing
                                        containerStyle={{ paddingHorizontal: 0 }}
                                        // Add key to potentially help ensure re-render reflects state
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
                                        disabled={isAiLoading} // Disable while AI processing
                                        onSubmitEditing={handleEstimateGrams} // Trigger estimation on submit
                                        key={`auto-input-${selectedFood?.id}`}
                                    />
                                    <Button
                                        onPress={handleEstimateGrams}
                                        disabled={isAiButtonDisabled}
                                        loading={isAiLoading} // Show loading indicator on the button itself
                                        buttonStyle={styles.aiButton}
                                        // title="" // Icon only
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
                     {/* Spacer at the bottom */}
                     <View style={{ height: 20 }} />
                </View>
            </KeyboardAvoidingView>
             {/* Toast Component */}
             <Toast />
        </Overlay>
    );
};

// --- Styles ---
const useStyles = makeStyles((theme) => ({
    // Paste the full useStyles object here from your original code
    // ... (Styles remain the same as provided in the previous example) ...
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
        overflow: 'visible',
    },
    overlayStyle: {
        width: '100%',
        borderRadius: 15,
        padding: 15,
        paddingBottom: 0,
        maxHeight: Dimensions.get('window').height * 0.85,
        // backgroundColor applied via combinedOverlayStyle using theme.colors.background
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
        padding: 5,
        zIndex: 1, // Ensure it's clickable over title if overlap occurs
    },
    overlayTitle: {
        color: theme.colors.text,
        fontWeight: 'bold',
        fontSize: 20,
        textAlign: 'center',
        flex: 1,
        marginHorizontal: 5, // Reduced margin to give more space
    },
    editModeTitle: {
        color: theme.colors.warning,
    },
    addButton: {
        borderRadius: 20,
        paddingHorizontal: 15,
        paddingVertical: 8,
        minWidth: 70,
        backgroundColor: theme.colors.primary,
        zIndex: 1, // Ensure clickable
    },
     updateButton: {
        backgroundColor: theme.colors.warning,
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
        backgroundColor: theme.colors.searchBg || theme.colors.grey5, // Use theme color with fallback
        height: 40,
    },
    searchInputStyle: {
        color: theme.colors.text,
        fontSize: 15,
        // Adjust if using custom fonts
    },
    // --- Recent Foods ---
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
        paddingVertical: 2, // Small vertical padding for the container
    },
    recentFoodItem: {
        paddingHorizontal: 10,
        paddingVertical: 6,
        borderRadius: 16,
        backgroundColor: theme.colors.grey5,
        marginRight: 8,
        flexDirection: 'row',
        alignItems: 'center',
        borderWidth: 1.5, // Use slightly thicker border for selection
        borderColor: 'transparent',
    },
    selectedRecentFoodItem: {
        // backgroundColor: theme.colors.grey4, // Optional: darker background on select
        borderColor: theme.colors.primary,
    },
    smallRecentFoodItem: {
        paddingHorizontal: 8,
        paddingVertical: 5,
    },
    foodIconSmall: {
        width: 20,
        height: 20,
        marginRight: 6,
        borderRadius: 10,
        resizeMode: "contain",
    },
     iconPlaceholderSmall: {
        backgroundColor: theme.colors.grey4,
        alignItems: 'center',
        justifyContent: 'center',
    },
    recentFoodText: {
        color: theme.colors.text,
        fontSize: 13,
        maxWidth: 80,
    },
    smallRecentFoodText: {
        fontSize: 12,
        maxWidth: 70,
    },
    // --- Food List (Search Results) ---
    foodList: {
        maxHeight: Dimensions.get('window').height * 0.3, // Max height relative to screen
        minHeight: 60, // Ensure it has some minimum height even if few results
        flexGrow: 0,
        marginBottom: 15,
    },
    listItemContainer: {
        backgroundColor: 'transparent',
        paddingVertical: 8,
        paddingHorizontal: 5,
        borderBottomColor: theme.colors.divider,
    },
    selectedListItem: {
        backgroundColor: theme.colors.grey5,
        borderRadius: 8,
    },
     defaultIconContainer: {
        width: 35,
        height: 35,
        marginRight: 12,
        borderRadius: 17.5,
        backgroundColor: theme.colors.grey5,
        alignItems: 'center',
        justifyContent: 'center',
    },
    foodIcon: {
        width: 35,
        height: 35,
        marginRight: 12,
        borderRadius: 17.5,
        resizeMode: "contain",
        // Optional: add a background color if images have transparency
        // backgroundColor: theme.colors.grey5,
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
    // --- Amount Section ---
    amountSection: {
        marginTop: 10,
        borderTopWidth: 1,
        borderTopColor: theme.colors.divider,
        paddingTop: 15,
    },
    unitSelectorContainer: {
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
    buttonGroupContainer: {
        flex: 0.7,
        maxWidth: 220,
        height: 35,
        borderRadius: 8,
        backgroundColor: theme.colors.background // Ensure ButtonGroup background matches modal
    },
     buttonGroupText: {
        fontSize: 14,
        color: theme.colors.text,
    },
     servingSizeRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 12, // Increased margin below suggestions
        paddingHorizontal: 5,
    },
    servingSizeLabel: {
        color: theme.colors.grey2,
        fontSize: 13,
        marginRight: 8,
    },
    servingSizeContainer: {
        flexGrow: 0, // Prevent ScrollView from taking full width
    },
    servingSizeButton: {
      backgroundColor: theme.colors.grey4,
      borderRadius: 15,
      marginRight: 8,
      paddingHorizontal: 12,
      paddingVertical: 5,
      justifyContent: 'center',
      alignItems: 'center',
      height: 30, // Give buttons a consistent height
    },
    servingSizeButtonTitle: {
        color: theme.colors.text,
        fontSize: 13,
    },
    gramInputStyle: {
        color: theme.colors.text,
        fontSize: 16,
        paddingVertical: 8, // Adjust vertical padding if needed
        height: 40, // Ensure consistent height with other inputs/buttons
    },
    gramInputContainerStyle: {
        borderBottomColor: theme.colors.grey3,
        paddingHorizontal: 5, // Consistent padding
    },
    unitText: {
        color: theme.colors.grey2,
        fontSize: 15,
        fontWeight: '500',
        paddingRight: 5, // Add padding so 'g' isn't touching edge
    },
     autoInputRow: {
        flexDirection: 'row',
        alignItems: 'center', // Vertically align input and button
    },
    autoInputContainer: {
       flex: 1, // Take available space
       paddingHorizontal: 0, // Remove default container padding
       marginRight: 10, // Space between input and button
    },
    autoInputField: {
       // Specific styles if needed, matches gramInputStyle height
       height: 40,
    },
    aiButton: {
        // marginLeft: 10, // Removed, using marginRight on autoInputContainer
        backgroundColor: theme.colors.secondary,
        borderRadius: 20, // Make it round
        width: 40, // Fixed width
        height: 40, // Fixed height for circle
        padding: 0, // Remove padding for icon centering
        justifyContent: 'center',
        alignItems: 'center',
    },
    aiButtonText: {
        // Not needed for icon-only button
    }
}));

export default AddEntryModal;
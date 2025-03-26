// AddEntryModal.tsx
// AddEntryModal.tsx
import React, { useEffect, useState, useMemo } from "react";
import {
    View,
    FlatList,
    KeyboardAvoidingView,
    Platform,
    TouchableOpacity,
    ScrollView,
    Dimensions, // Import Dimensions
    Image,
    StyleSheet // Import StyleSheet
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
    Icon
} from "@rneui/themed";
import { Food } from "../types/food";
// Removed inner SafeAreaView import
import { isValidNumberInput } from "../utils/validationUtils";
import { DailyEntryItem } from "../types/dailyEntry";
import { loadRecentFoods, saveRecentFoods } from "../services/storageService"; // Import storage functions
import { getFoodIconUrl } from "../utils/iconUtils"; // Import the icon helper function

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

// Define a keyboard offset (adjust value based on testing, e.g., header height)
const KEYBOARD_VERTICAL_OFFSET = Platform.OS === 'ios' ? 60 : 0;

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
    const styles = useStyles(); // Use generated styles
    const [recentFoods, setRecentFoods] = useState<Food[]>([]);
    const MAX_RECENT_FOODS = 5;
    const [foodIcons, setFoodIcons] = useState<{ [foodName: string]: string | null }>({});

    // Get screen width for responsive adjustments
    const screenWidth = Dimensions.get('window').width;

    useEffect(() => {
        if (isEditMode && initialGrams) {
            setGrams(initialGrams);
        }
    }, [isEditMode, initialGrams, setGrams]);

    const addToRecentFoods = async (food: Food) => {
        const updatedRecentFoods = recentFoods.filter(recentFood => recentFood.id !== food.id);
        updatedRecentFoods.unshift(food);
        const trimmedRecentFoods = updatedRecentFoods.slice(0, MAX_RECENT_FOODS);
        setRecentFoods(trimmedRecentFoods);
        await saveRecentFoods(trimmedRecentFoods);
    };

    useEffect(() => {
        const loadRecents = async () => {
            const loadedRecentFoods = await loadRecentFoods();
            setRecentFoods(loadedRecentFoods);
        };
        if (isVisible) {
            loadRecents()
        }
    }, [isVisible]);

    useEffect(() => {
        if (!isVisible) {
            handleSelectFood(null);
            setGrams("");
            updateSearch("");
        }
    }, [isVisible, handleSelectFood, setGrams, updateSearch]);

    const filteredFoods = useMemo(() => {
        let result = foods;
        if (search) {
            result = result.filter((food) =>
                food.name.toLowerCase().includes(search.toLowerCase())
            );
        }
        return result;
    }, [foods, search]);

    useEffect(() => {
        const loadIcons = async () => {
            const icons: { [foodName: string]: string | null } = {};
            for (const food of foods) {
                const iconUrl = await getFoodIconUrl(food.name);
                icons[food.name] = iconUrl;
            }
            setFoodIcons(icons);
        };

        loadIcons();
    }, [foods]);

    const servingSizeSuggestions = useMemo(() => {
        if (!selectedFood) return [];
        return [
            { label: "50g", value: "50" },
            { label: "100g", value: "100" },
            { label: "150g", value: "150" },
            { label: "200g", value: "200" },
        ];
    }, [selectedFood]);

    const handleAddOrUpdateEntry = async () => {
        handleAddEntry();
        if (selectedFood) {
            await addToRecentFoods(selectedFood);
        }
    };

    // Combine theme-dependent and static styles
    const combinedOverlayStyle = StyleSheet.flatten([
        styles.overlayStyle, // Get base styles from useStyles
        { backgroundColor: theme.colors.background } // Apply theme background color here
    ]);

    return (
        <Overlay
            isVisible={isVisible}
            onBackdropPress={toggleOverlay}
            animationType="slide"
            // statusBarTranslucent={Platform.OS === 'android'} // Consider removing if causing issues
            overlayStyle={styles.overlayContainer} // Use a container style for positioning/sizing
        >
             {/* KeyboardAvoidingView now directly inside Overlay */}
            <KeyboardAvoidingView
                behavior={Platform.OS === "ios" ? "padding" : "height"}
                style={styles.keyboardAvoidingView}
                keyboardVerticalOffset={KEYBOARD_VERTICAL_OFFSET} // Added offset
            >
                {/* This View now acts as the visible modal background and content container */}
                <View style={combinedOverlayStyle}>
                    <View style={styles.header}>
                        <Text style={[styles.overlayTitle, isEditMode && styles.editModeTitle]}>
                            {isEditMode ? "Edit Entry" : "Add Entry"}
                        </Text>

                        <Button
                            title={isEditMode ? "Update" : "Add"}
                            onPress={handleAddOrUpdateEntry}
                            disabled={!selectedFood || !isValidNumberInput(grams) || grams === ""}
                            buttonStyle={[styles.addButton, { backgroundColor: isEditMode ? theme.colors.warning : theme.colors.primary }]}
                            titleStyle={styles.buttonTitle}
                        />
                        <TouchableOpacity onPress={toggleOverlay} style={styles.closeIcon}>
                            <Icon
                                name="close"
                                type="material"
                                size={28}
                                color={theme.colors.text}
                            />
                        </TouchableOpacity>
                    </View>

                    <SearchBar
                        placeholder="Search Foods..."
                        onChangeText={updateSearch}
                        value={search}
                        platform={Platform.OS === "ios" ? "ios" : "android"}
                        containerStyle={styles.searchBarContainer}
                        inputContainerStyle={styles.searchBarInputContainer}
                        inputStyle={styles.searchInputStyle}
                    />

                    {recentFoods.length > 0 && (
                        <View style={styles.recentFoodsContainer}>
                            <Text style={styles.sectionTitle}>Recent Foods</Text>
                            <FlatList
                                data={recentFoods}
                                keyExtractor={(item) => item.id}
                                horizontal
                                showsHorizontalScrollIndicator={false}
                                renderItem={({ item }) => (
                                    <TouchableOpacity
                                        style={[
                                            styles.recentFoodItem,
                                            screenWidth < 350 && styles.smallRecentFoodItem,
                                            selectedFood?.id === item.id && styles.selectedRecentFoodItem, // Apply selected style
                                        ]}
                                        onPress={() => handleSelectFood(item)}>
                                        {foodIcons[item.name] ? (
                                            <Image
                                                source={{ uri: foodIcons[item.name] as string }}
                                                style={styles.foodIcon}
                                            />
                                        ) : (
                                            <Icon
                                                name="fast-food-outline"
                                                type="ionicon"
                                                size={16}
                                                color={theme.colors.text} // Ensure icon color matches theme
                                            />
                                        )}
                                        <Text style={[styles.recentFoodText, screenWidth < 350 && styles.smallRecentFoodText]}>{item.name}</Text>
                                    </TouchableOpacity>
                                )}
                            />
                        </View>
                    )}

                    {filteredFoods.length > 0 ? (
                        <FlatList
                            data={filteredFoods}
                            keyExtractor={(item) => item.id}
                            renderItem={({ item }) => (
                                <TouchableOpacity onPress={() => handleSelectFood(item)}>
                                    <ListItem
                                        bottomDivider
                                        containerStyle={[
                                            styles.listItemContainer,
                                            selectedFood?.id === item.id && styles.selectedListItem, // Apply selected style
                                            { backgroundColor: 'transparent' } // Ensure list item itself is transparent
                                        ]}
                                    >
                                        {foodIcons[item.name] ? (
                                            <Image
                                                source={{ uri: foodIcons[item.name] as string }}
                                                style={styles.foodIcon}
                                            />
                                        ) : (
                                            <Icon
                                                name="fast-food-outline"
                                                type="ionicon"
                                                size={16}
                                                color={theme.colors.text} // Ensure icon color matches theme
                                            />
                                        )}
                                        <ListItem.Content>
                                            <ListItem.Title style={styles.listItemTitle}>{item.name}</ListItem.Title>
                                        </ListItem.Content>
                                    </ListItem>
                                </TouchableOpacity>
                            )}
                            style={styles.foodList} // Keep max height
                            // Add flexShrink to prevent pushing content when keyboard is up
                            contentContainerStyle={{ flexGrow: 0 }} // Prevent internal grow
                        />
                    ) : (
                        <Text style={styles.noFoodsText}>No foods found.</Text>
                    )}

                    {selectedFood && (
                        <View>
                            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.servingSizeContainer}>
                                {servingSizeSuggestions.map((suggestion) => (
                                    <TouchableOpacity
                                        key={suggestion.label}
                                        style={styles.servingSizeButton}
                                        onPress={() => setGrams(suggestion.value)}
                                    >
                                        <Text style={styles.servingSizeButtonTitle}>{suggestion.label}</Text>
                                    </TouchableOpacity>
                                ))}
                            </ScrollView>
                            <Input
                                placeholder="Grams (e.g. 150)"
                                keyboardType="numeric"
                                value={grams}
                                onChangeText={(text) => setGrams(text.replace(/[^0-9]/g, ""))}
                                inputStyle={styles.gramInputStyle} // Use inputStyle directly
                                inputContainerStyle={styles.gramInputContainerStyle}
                                errorMessage={!isValidNumberInput(grams) && grams !== "" ? "Enter a valid number" : ""}
                                errorStyle={{ color: theme.colors.error }} // Explicit error color
                            />
                        </View>
                    )}
                </View>
            </KeyboardAvoidingView>
        </Overlay>
    );
};

// --- Styles ---
const useStyles = makeStyles((theme) => ({
    // Style for the Overlay container itself (positioning, width)
    overlayContainer: {
        backgroundColor: 'transparent', // Make the overlay container transparent
        width: '90%',
        maxWidth: 500, // Max width for larger screens
        padding: 0, // Remove padding from overlay itself
        borderRadius: 20,
        // Remove height and marginVertical
        // Shadow/Elevation is often better on the content view
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2, },
        shadowOpacity: 0.25,
        shadowRadius: 3.84,
        elevation: 5,
        overflow: 'hidden', // Prevent content spilling before borderRadius
    },
    // Style for the main content View inside KeyboardAvoidingView (visuals, padding)
    overlayStyle: {
        width: '100%', // Takes width from overlayContainer
        borderRadius: 20,
        padding: 20,
        maxHeight: '90%', // Limit max height to prevent vertical overflow
        // backgroundColor is applied dynamically based on theme
    },
    keyboardAvoidingView: {
         width: "100%", // Match parent overlay container width
         // flex: 1, // Let KAV manage its size based on content and keyboard
    },
    // overlayContent removed as overlayStyle serves this purpose now
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 20,
    },
    overlayTitle: {
        color: theme.colors.text,
        fontWeight: 'bold',
        fontSize: 24,
        flexShrink: 1, // Allow title to shrink if needed
        marginRight: 10,
    },
    editModeTitle: {
        color: theme.colors.warning,
    },
    searchBarContainer: {
        backgroundColor: "transparent",
        borderBottomColor: "transparent",
        borderTopColor: "transparent",
        marginBottom: 10,
        paddingHorizontal: 0, // No horizontal padding needed here
    },
    searchBarInputContainer: {
        borderRadius: 25,
        backgroundColor: theme.colors.grey5,
        height: 40,
    },
    searchInputStyle: {
        color: theme.colors.text,
        marginLeft: 10,
        fontSize: 16,
    },
    recentFoodsContainer: {
        marginBottom: 15,
    },
    sectionTitle: {
        fontWeight: 'bold',
        marginBottom: 8,
        color: theme.colors.text,
        fontSize: 18,
    },
    recentFoodItem: {
        paddingHorizontal: 15,
        paddingVertical: 10,
        borderRadius: 20,
        backgroundColor: theme.colors.grey5,
        marginRight: 10,
        justifyContent: 'center',
        alignItems: 'center',
        flexDirection: 'row',
    },
    selectedRecentFoodItem: {
        backgroundColor: theme.colors.grey3,
        borderColor: theme.colors.primary,
        borderWidth: 2,
    },
    smallRecentFoodItem: {
        paddingHorizontal: 10,
    },
    recentFoodText: {
        color: theme.colors.text,
        fontSize: 14,
        marginLeft: 5,
    },
    smallRecentFoodText: {
        fontSize: 12,
    },
    foodIcon: {
        width: 30,
        height: 30,
        marginRight: 10,
        borderRadius: 15,
        resizeMode: "contain", // Use contain or cover usually
    },
    foodList: {
        // maxHeight: '48%', // Let flexbox handle sizing, or use flex basis
        flexBasis: '40%', // Give it a basis, but allow shrinking
        flexShrink: 1,     // Allow list to shrink
        marginBottom: 8,
    },
    listItemContainer: {
        backgroundColor: 'transparent', // Handled by parent
        paddingVertical: 12,
        flexDirection: 'row',
        alignItems: 'center', // Align icon and text vertically
    },
    selectedListItem: {
        backgroundColor: theme.colors.grey5,
    },
    listItemTitle: {
        color: theme.colors.text,
        fontSize: 16,
    },
    noFoodsText: {
        color: theme.colors.grey2,
        fontStyle: 'italic',
        textAlign: 'center',
        marginTop: 20,
    },
    servingSizeContainer: {
        marginTop: 15,
        marginBottom: 10,
        flexGrow: 0, // Prevent scrollview from growing excessively
    },
    servingSizeButton: {
      backgroundColor: theme.colors.grey4,
      borderRadius: 20,
      marginRight: 8,
      paddingHorizontal: 15,
      paddingVertical: 8,
      justifyContent: 'center',
      alignItems: 'center',
    },
    servingSizeButtonTitle: {
        color: theme.colors.text,
        fontSize: 14,
    },
    gramInputStyle: { // Apply styles directly to Input's inputStyle prop
        color: theme.colors.text,
        fontSize: 16,
        paddingLeft: 10, // Add padding if needed here
    },
    gramInputContainerStyle: {
        borderBottomWidth: 1,
        borderBottomColor: theme.colors.divider, // Use divider color
        paddingBottom: 0, // Adjust if needed
        marginBottom: 5, // Space before error message
    },
    addButton: {
        borderRadius: 20,
        paddingHorizontal: 20, // Reduced slightly
        paddingVertical: 8, // Reduced slightly
        minWidth: 80, // Reduced slightly
    },
    buttonTitle: {
        color: theme.colors.white,
        fontWeight: '600',
        fontSize: 16,
    },
    closeIcon: {
        padding: 5,
        marginLeft: 10, // Add some space
    },
}));

export default AddEntryModal;
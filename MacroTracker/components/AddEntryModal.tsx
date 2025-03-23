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
import { SafeAreaView } from "react-native-safe-area-context";
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

    return (
        <Overlay
            isVisible={isVisible}
            onBackdropPress={toggleOverlay}
            animationType="slide"
            transparent={true}
            statusBarTranslucent={Platform.OS === 'android'}
            overlayStyle={styles.overlayStyle}
        >
            <SafeAreaView style={styles.modalSafeArea}>
                <KeyboardAvoidingView
                    behavior={Platform.OS === "ios" ? "padding" : "height"}
                    style={styles.keyboardAvoidingView}
                >
                    <View style={styles.overlayContent}>
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
                                                />
                                            )}
                                            <ListItem.Content>
                                                <ListItem.Title style={styles.listItemTitle}>{item.name}</ListItem.Title>
                                            </ListItem.Content>
                                        </ListItem>
                                    </TouchableOpacity>
                                )}
                                style={styles.foodList}
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
                                    style={styles.gramInputStyle}
                                    inputContainerStyle={styles.gramInputContainerStyle}
                                    errorMessage={!isValidNumberInput(grams) && grams !== "" ? "Enter a valid number" : ""}
                                />
                            </View>
                        )}
                    </View>
                </KeyboardAvoidingView>
            </SafeAreaView>
        </Overlay>
    );
};
const useStyles = makeStyles((theme) => ({
    overlayStyle: {
        backgroundColor: 'rgba(255, 255, 255, 00)', // Semi-transparent white
        padding: 20,
        marginVertical: 50,
        width: '90%',
        borderRadius: 20, // More rounded
        height: '100%', //MODIFIED.  Use auto
        shadowColor: "#000", // Add shadow
        shadowOffset: {
            width: 0,
            height: 2,
        },
        shadowOpacity: 0.25,
        shadowRadius: 3.84,
        elevation: 5,
    },
    modalSafeArea: {
        flex: 1,
        justifyContent: "center",
        alignItems: "center",
    },
    keyboardAvoidingView: {
        width: "100%",
        flex: 1,
    },
    overlayContent: {
        backgroundColor: theme.colors.background,
        width: "100%",
        borderRadius: 20, // More rounded
        padding: 20,
        flexGrow: 1, //MODIFIED
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 20,
    },
    overlayTitle: {
        color: theme.colors.text,
        fontWeight: 'bold',
        fontSize: 24, // Larger title
    },
    editModeTitle: {
        color: theme.colors.warning,
    },
    searchBarContainer: {
        backgroundColor: "transparent",
        borderBottomColor: "transparent",
        borderTopColor: "transparent",
        marginBottom: 10,
        padding: 0,
    },
    searchBarInputContainer: {
        borderRadius: 25, // More rounded
        backgroundColor: theme.colors.grey5,
        height: 40, // Consistent height
    },
    searchInputStyle: {
        color: theme.colors.text,
        marginLeft: 10,
        fontSize: 16, // Slightly larger font
    },
    recentFoodsContainer: {
        marginBottom: 15,
    },
    sectionTitle: {
        fontWeight: 'bold',
        marginBottom: 8,
        color: theme.colors.text,
        fontSize: 18, // Larger section title
    },
    recentFoodItem: {
        paddingHorizontal: 15,
        paddingVertical: 10,
        borderRadius: 20, // More rounded
        backgroundColor: theme.colors.grey5,
        marginRight: 10,
        justifyContent: 'center', // Center text
        alignItems: 'center',
        flexDirection: 'row', // Added for icon and text alignment
    },
    selectedRecentFoodItem: {
        backgroundColor: theme.colors.grey3, // Slightly darker background
        borderColor: theme.colors.primary,
        borderWidth: 2,
    },
    smallRecentFoodItem: {
        paddingHorizontal: 10, // Reduce padding on small screens
    },
    recentFoodText: {
        color: theme.colors.text,
        fontSize: 14,
        marginLeft: 5, // Added to separate the icon and text
    },
    smallRecentFoodText: {
        fontSize: 12, // Smaller font on small screens
    },
    foodIcon: {
        width: 30,
        height: 30,
        marginRight: 10,
        borderRadius: 15, // Make it circular
    },
    foodList: {
        maxHeight: 'auto',
    },
    listItemContainer: {
        backgroundColor: 'transparent',
        paddingVertical: 12, // More vertical padding
        flexDirection: 'row', // Added for icon and text alignment
    },
    selectedListItem: {
        backgroundColor: theme.colors.grey5, // Highlight selected item
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
    },
    servingSizeButton: {
      backgroundColor: theme.colors.grey4,
      borderRadius: 20,
      marginRight: 8,
      paddingHorizontal: 15,
      paddingVertical: 8, // Add vertical padding
      justifyContent: 'center', // Center text
      alignItems: 'center', // Center text
  },
    servingSizeButtonTitle: {
        color: theme.colors.text,
        fontSize: 14,
    },
    gramInputStyle: {
        color: theme.colors.text,
        marginLeft: 10,
        fontSize: 16,
    },
    gramInputContainerStyle: {
        borderBottomWidth: 1,
        borderBottomColor: theme.colors.text,
        paddingBottom: 5,
    },
    addButton: {
        borderRadius: 20, // More rounded
        paddingHorizontal: 25,
        paddingVertical: 10, // Add vertical padding
        minWidth: 100, // Set minimum width
    },
    buttonTitle: {
        color: theme.colors.white,
        fontWeight: '600',
        fontSize: 16, // Larger button text
    },
    closeIcon: {
        padding: 5,
    },
}));

export default AddEntryModal;
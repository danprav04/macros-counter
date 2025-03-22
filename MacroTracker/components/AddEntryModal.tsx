// AddEntryModal.tsx
import React, { useEffect, useState, useMemo } from "react";
import {
    View,
    FlatList,
    KeyboardAvoidingView,
    Platform,
    TouchableOpacity,
    ScrollView,
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
    // const [selectedCategory, setSelectedCategory] = useState<string | null>(null); // REMOVED
    const [recentFoods, setRecentFoods] = useState<Food[]>([]); //  state
    const MAX_RECENT_FOODS = 5;

    // Pre-populate grams in edit mode
    useEffect(() => {
        if (isEditMode && initialGrams) {
            setGrams(initialGrams);
        }
    }, [isEditMode, initialGrams, setGrams]);


     const addToRecentFoods = async (food: Food) => {
        // Remove the food if it already exists to avoid duplicates
        const updatedRecentFoods = recentFoods.filter(recentFood => recentFood.id !== food.id);

        // Add the food to the beginning of the array
        updatedRecentFoods.unshift(food);

        // Limit the array to the maximum number of recent foods
        const trimmedRecentFoods = updatedRecentFoods.slice(0, MAX_RECENT_FOODS);

        setRecentFoods(trimmedRecentFoods);
        await saveRecentFoods(trimmedRecentFoods); // Save to storage
    };

    useEffect(() => {
        // Load recent foods from storage when the modal becomes visible
           const loadRecents = async () => {
            const loadedRecentFoods = await loadRecentFoods();
            setRecentFoods(loadedRecentFoods);
        };
        if(isVisible){
             loadRecents()
        }

    }, [isVisible]);


    useEffect(() => {
        if (!isVisible) {
            handleSelectFood(null);
            setGrams(""); // Clear grams when closing
            // setSelectedCategory(null); // Reset category  // REMOVED
            updateSearch("");  //clear the search
        }
    }, [isVisible, handleSelectFood, setGrams]);

    // const categories = useMemo(() => { // REMOVED
    //     // Extract unique categories from your foods (adapt to your data)
    //     const uniqueCategories = [...new Set(foods.map(food => food.category).filter(Boolean))];
    //     return ["All", ...uniqueCategories]; // Add "All" category
    // }, [foods]);

    const filteredFoods = useMemo(() => {
        let result = foods;

        // if (selectedCategory && selectedCategory !== "All") { // REMOVED
        //     result = result.filter((food) => food.category === selectedCategory);
        // }

        if (search) {
            result = result.filter((food) =>
                food.name.toLowerCase().includes(search.toLowerCase())
            );
        }

        return result;
    }, [foods, search, /*selectedCategory*/]); // Removed selectedCategory

    const servingSizeSuggestions = useMemo(() => {
        if (!selectedFood) return [];
        // Example:  Adapt to your data. You might have serving sizes in your Food object.
        return [
            { label: "50g", value: "50" },
            { label: "100g", value: "100" },
            { label: "150g", value: "150" },
            { label: "200g", value: "200" },
        ];
    }, [selectedFood]);


    const handleAddOrUpdateEntry = async () => { // Made asynchronous
        handleAddEntry(); // Keep the logic in the parent component
        // Add to recent foods (example - replace with your logic)
          if (selectedFood) {
              await addToRecentFoods(selectedFood); // Await the addition
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
                            <Text h4 style={[styles.overlayTitle, isEditMode && styles.editModeTitle]}>
                                {isEditMode ? "Edit Entry" : "Add Entry"}
                            </Text>

                            <Button
                                title={isEditMode ? "Update" : "Add"}
                                onPress={handleAddOrUpdateEntry}
                                disabled={!selectedFood || !isValidNumberInput(grams) || grams === ""}
                                buttonStyle={[styles.addButton, { backgroundColor: isEditMode ? theme.colors.warning : theme.colors.primary }]}
                                titleStyle={styles.buttonTitle}
                            />
                            <Icon
                                name="close"
                                type="material"
                                size={28}
                                color={theme.colors.text}
                                onPress={toggleOverlay}
                                containerStyle={styles.closeIcon}
                            />
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

                        {/* <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.categoryContainer}> //REMOVED
                            {categories.map((category) => (
                                <TouchableOpacity
                                    key={category}
                                    style={[
                                        styles.categoryButton,
                                        selectedCategory === category && styles.selectedCategoryButton,
                                    ]}
                                    onPress={() => setSelectedCategory(category)}
                                >
                                    <Text style={[
                                        styles.categoryButtonText,
                                        selectedCategory === category && styles.selectedCategoryButtonText,
                                    ]}>
                                        {category}
                                    </Text>
                                </TouchableOpacity>
                            ))}
                        </ScrollView> */}

                        {recentFoods.length > 0 && (
                            <View>
                                <Text style={styles.sectionTitle}>Recent Foods</Text>
                                <FlatList
                                    data={recentFoods}
                                    keyExtractor={(item) => item.id}
                                    horizontal
                                    showsHorizontalScrollIndicator={false}
                                    renderItem={({ item }) => (
                                        <TouchableOpacity style={styles.recentFoodItem} onPress={() => handleSelectFood(item)}>
                                            <Text style={styles.recentFoodText}>{item.name}</Text>
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
                                    <ListItem
                                        bottomDivider
                                        onPress={() => handleSelectFood(item)}
                                        containerStyle={styles.listItemContainer}
                                    >
                                        <ListItem.Content>
                                            <ListItem.Title style={styles.listItemTitle}>{item.name}</ListItem.Title>
                                        </ListItem.Content>
                                    </ListItem>
                                )}
                                style={styles.foodList}
                            />
                        ) : (
                            <Text style={styles.noFoodsText}>No foods found.</Text>
                        )}

                        {selectedFood && ( // Only show when a food is selected
                            <View>
                                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.servingSizeContainer}>
                                    {servingSizeSuggestions.map((suggestion) => (
                                        <Button
                                            key={suggestion.label}
                                            title={suggestion.label}
                                            onPress={() => setGrams(suggestion.value)}
                                            buttonStyle={styles.servingSizeButton}
                                            titleStyle={styles.servingSizeButtonTitle}
                                        />
                                    ))}
                                </ScrollView>
                                <Input
                                    placeholder="Grams (e.g. 150)"
                                    keyboardType="numeric"
                                    value={grams}
                                    onChangeText={(text) => setGrams(text.replace(/[^0-9]/g, ""))} // Validate numeric input
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
        backgroundColor: 'rgba(255, 255, 255, 0)',
        padding: 20,
        marginVertical: 50,
        width: '90%',
        borderRadius: 15,
        height: '100%', //MODIFIED

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
        borderRadius: 15,
        padding: 20,
        minHeight: '50%', //MODIFIED
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
    },
    editModeTitle: {
        color: theme.colors.warning, // Different color in edit mode
    },
    searchBarContainer: {
        backgroundColor: "transparent",
        borderBottomColor: "transparent",
        borderTopColor: "transparent",
        marginBottom: 10,
        padding: 0,
    },
    searchBarInputContainer: {
        borderRadius: 10,
        backgroundColor: theme.colors.grey5,
    },
    searchInputStyle: {
        color: theme.colors.text,
        marginLeft: 10,
    },
    categoryContainer: { //REMOVED
        marginBottom: 10,
    },
    categoryButton: { //REMOVED
        paddingHorizontal: 15,
        paddingVertical: 8,
        borderRadius: 20,
        backgroundColor: theme.colors.grey5,
        marginRight: 8,
    },
    selectedCategoryButton: { //REMOVED
        backgroundColor: theme.colors.primary,
    },
    categoryButtonText: { //REMOVED
        color: theme.colors.grey2,
    },
    selectedCategoryButtonText: { //REMOVED
        color: theme.colors.white,
    },
    sectionTitle: {
        fontWeight: 'bold',
        marginBottom: 5,
        color: theme.colors.text,
    },
    recentFoodItem: {
        paddingHorizontal: 12,
        paddingVertical: 8,
        borderRadius: 10,
        backgroundColor: theme.colors.grey5,
        marginRight: 8,
    },
    recentFoodText: {
        color: theme.colors.grey2,
    },
    foodList: {
        maxHeight: 200,
        marginBottom: 10,
    },
    listItemContainer: {
        backgroundColor: 'transparent', // Use transparent background
    },
    listItemTitle: {
        color: theme.colors.text,
    },
    noFoodsText: {
        color: theme.colors.grey2,
        fontStyle: 'italic',
        textAlign: 'center',
        marginTop: 20,
    },
    servingSizeContainer: {
        marginTop: 10,
        marginBottom: 5,
    },
    servingSizeButton: {
        backgroundColor: theme.colors.grey4,
        borderRadius: 20,
        marginRight: 8,
        paddingHorizontal: 15,
    },
    servingSizeButtonTitle: {
        color: theme.colors.grey2,
    },
    gramInputStyle: {
        color: theme.colors.text,
        marginLeft: 10
    },
    gramInputContainerStyle: {
        borderBottomWidth: 1,
        borderBottomColor: theme.colors.grey4,
    },
    addButton: {
        // backgroundColor: theme.colors.primary, // Handled in the component
        borderRadius: 8,
        paddingHorizontal: 20,
    },
    buttonTitle: {
        color: theme.colors.white,
        fontWeight: '600',
    },
    closeIcon: {
        padding: 5,
    },
}));

export default AddEntryModal;
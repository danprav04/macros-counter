import React, { useEffect, useState } from "react";
import {
    View,
    FlatList,
    KeyboardAvoidingView,
    Platform,
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
} from "@rneui/themed";
import { Food } from "../types/food";
import { SafeAreaView } from "react-native-safe-area-context";
import { isValidNumberInput } from "../utils/validationUtils";
import { DailyEntryItem } from "../types/dailyEntry";

interface AddEntryModalProps {
    isVisible: boolean;
    toggleOverlay: () => void;
    selectedFood: Food | null; // Corrected prop
    grams: string;
    setGrams: (grams: string) => void;
    handleAddEntry: () => void;
    filteredFoods: Food[]; //Foods to filter
    handleSelectFood: (item:Food) => void; //what happens after food selected
     updateSearch: (search: string) => void; //What happens after search
    search: string; //The searched text
}

const AddEntryModal: React.FC<AddEntryModalProps> = ({
    isVisible,
    toggleOverlay,
    selectedFood,
    grams,
    setGrams,
    handleAddEntry,
    filteredFoods,
    handleSelectFood,
    updateSearch,
    search,
}) => {
    const { theme } = useTheme();
    const styles = useStyles();

    return (
        <Overlay
            isVisible={isVisible}
            onBackdropPress={toggleOverlay}
            animationType="slide"
            transparent={true}
            statusBarTranslucent={true}
            overlayStyle={styles.overlayStyle} // Apply overlayStyle here
        >
            <SafeAreaView style={styles.modalSafeArea}>
                <KeyboardAvoidingView
                    behavior={Platform.OS === "ios" ? "padding" : "height"}
                    style={styles.keyboardAvoidingView}
                >
                    <View style={styles.overlayContent}>
                        <Text h4 style={styles.overlayTitle}>
                            Add Entry
                        </Text>
                        <SearchBar
                            placeholder="Search Foods..."
                            onChangeText={updateSearch}
                            value={search}
                            platform={Platform.OS === "ios" ? "ios" : "android"}
                            containerStyle={styles.searchBarContainer}
                            inputContainerStyle={styles.searchBarInputContainer}
                            inputStyle={{ color: theme.colors.text }} // Ensure text color
                        />
                        <FlatList
                            data={filteredFoods}
                            keyExtractor={(item) => item.id}
                            renderItem={({ item }) => (
                                <ListItem bottomDivider onPress={() => handleSelectFood(item)} containerStyle={styles.listItemContainer}>
                                    <ListItem.Content>
                                        <ListItem.Title style={{ color: theme.colors.text }}>{item.name}</ListItem.Title>
                                    </ListItem.Content>
                                </ListItem>
                            )}
                            style={styles.foodList}
                        />
                         <Input
                            placeholder="Grams (e.g. 150)"
                            placeholderTextColor={theme.colors.text}
                            keyboardType="numeric"
                            value={grams}
                            onChangeText={setGrams}
                            style={{ color: theme.colors.text }} // Correct text color
                            inputContainerStyle={{ borderBottomColor: theme.colors.text }} // Consistent border color
                            errorMessage={!isValidNumberInput(grams) && grams !== "" ? "Enter a valid number" : ""}
                        />
                        <Button
                            title="Add Entry"
                            onPress={handleAddEntry}
                            disabled={!selectedFood || !isValidNumberInput(grams) || grams === ""}
                            buttonStyle={styles.addButton}
                            titleStyle={{color: theme.colors.white}} //add the correct title color
                        />
                    </View>
                </KeyboardAvoidingView>
            </SafeAreaView>
        </Overlay>
    );
};
const useStyles = makeStyles((theme) => ({
  overlayStyle: {
    backgroundColor: 'rgba(0, 0, 0, 0.5)', // Semi-transparent background
    paddingTop: '33%',
    padding: 20,  // Remove padding from the Overlay itself
    width: '100%',
    height: '100%', //  Control width here
    borderRadius: 10,
    // maxHeight: '80%' No longer needed since it is handled by overlayContent
  },
    modalSafeArea: {
      flex: 1,
      justifyContent: "center",
      alignItems: "center",
      // backgroundColor: "rgba(0, 0, 0, 0)", //  Removed -  Let Overlay handle the background
    },
    keyboardAvoidingView: {
      width: "100%",
      flex: 1, // Important: Allow KeyboardAvoidingView to take up all available space
    },
    overlayContent: {
        backgroundColor: theme.colors.background,
        width: "100%",  // Occupy full width *within* the overlay
        height: "80%",
        borderRadius: 10,
        padding: 20,

    },
    overlayTitle: {
        marginBottom: 20,
        textAlign: "center",
        color: theme.colors.text, // Use theme color
    },
    searchBarContainer: {
        backgroundColor: "transparent",
        borderBottomColor: "transparent",
        borderTopColor: "transparent",
        marginBottom: 10,
        padding: 0,
        width: '100%', // Ensure full width
    },
    searchBarInputContainer: {
        borderRadius: 10,
        backgroundColor: theme.colors.grey5, // Use theme color
    },
    foodList: {
        maxHeight: 200, // Limit height for scrollability
        marginBottom: 10,
        width: "100%",
    },
    listItemContainer:{
      backgroundColor: theme.colors.background
    },
    addButton: {
        marginTop: 10,
        backgroundColor: theme.colors.primary, // Or your desired button color

    },
}));
export default AddEntryModal;
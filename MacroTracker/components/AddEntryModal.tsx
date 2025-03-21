// components/AddEntryModal.tsx
import React from "react";
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

interface AddEntryModalProps {
  isVisible: boolean;
  toggleOverlay: () => void;
  search: string;
  updateSearch: (search: string) => void;
  filteredFoods: Food[];
  handleSelectFood: (item: Food) => void;
  grams: string;
  setGrams: (grams: string) => void;
  handleAddEntry: () => void;
  selectedFood: Food | null;
}

const AddEntryModal: React.FC<AddEntryModalProps> = ({
  isVisible,
  toggleOverlay,
  search,
  updateSearch,
  filteredFoods,
  handleSelectFood,
  grams,
  setGrams,
  handleAddEntry,
  selectedFood
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
        >
            <SafeAreaView style={styles.modalSafeArea}>
                <KeyboardAvoidingView
                    behavior={Platform.OS === "ios" ? "padding" : "height"}
                    style={styles.keyboardAvoidingView}
                >
                    <View style={styles.overlayContent}>
                        <Text h4 style={[styles.overlayTitle, { color: theme.colors.text }]}>
                            Add Entry
                        </Text>
                        <SearchBar
                            placeholder="Search Foods..."
                            onChangeText={updateSearch}
                            value={search}
                            platform={Platform.OS === "ios" ? "ios" : "android"}
                            containerStyle={styles.searchBarContainer}
                            inputContainerStyle={[styles.searchBarInputContainer, { backgroundColor: theme.colors.grey5 }]}
                            inputStyle={{ color: theme.colors.text }}
                        />
                        <FlatList
                            data={filteredFoods}
                            keyExtractor={(item) => item.id}
                            renderItem={({ item }) => (
                                <ListItem bottomDivider onPress={() => handleSelectFood(item)} containerStyle={{ backgroundColor: theme.colors.background }}>
                                    <ListItem.Content>
                                        <ListItem.Title style={{ color: theme.colors.text }}>{item.name}</ListItem.Title>
                                    </ListItem.Content>
                                </ListItem>
                            )}
                            style={styles.foodList}
                        />
                        <Input
                            placeholder="Grams (e.g. 150)"
                            keyboardType="numeric"
                            value={grams}
                            onChangeText={setGrams}
                            style={{ color: theme.colors.text }}
                            inputContainerStyle={{ borderBottomColor: theme.colors.text }}
                            errorMessage={!isValidNumberInput(grams) && grams !== "" ? "Enter a valid number" : ""}
                        />
                        <Button
                            title="Add Entry"
                            onPress={handleAddEntry}
                            disabled={!selectedFood || !isValidNumberInput(grams) || grams === ""}
                            buttonStyle={styles.addButton}
                        />
                    </View>
                </KeyboardAvoidingView>
            </SafeAreaView>
        </Overlay>
    );
};
const useStyles = makeStyles((theme) => ({
    modalSafeArea: {
      flex: 1,
      justifyContent: "center",
      alignItems: "center",
      backgroundColor: "rgba(0, 0, 0, 0)",
    },
    keyboardAvoidingView: {
      width: "100%",
      flex: 1, // Important: Allow KeyboardAvoidingView to take up all available space
    },
    overlayContent: {
      backgroundColor: theme.colors.background,
      width: "100%",
      height: "80%",
      borderRadius: 10,
      padding: 20,
      // maxHeight: '80%',  //  Add a maxHeight to prevent overly large modals
    },
    overlayTitle: {
      marginBottom: 20,
      textAlign: "center",
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
    },
    foodList: {
      maxHeight: 200, // Limit height for scrollability *within* the FlatList
      marginBottom: 10,
      width: "100%",
    },
    addButton: {
      marginTop: 10,
    },
  }));
export default AddEntryModal;
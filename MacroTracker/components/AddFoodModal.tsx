// components/AddFoodModal.tsx (Corrected with keyof Omit)
import React from "react";
import { View, KeyboardAvoidingView, Platform } from "react-native";
import { Button, Input, Text, Overlay, makeStyles, useTheme } from "@rneui/themed";
import { Food } from "../types/food";
import { SafeAreaView } from "react-native-safe-area-context";

interface AddFoodModalProps {
    isVisible: boolean;
    toggleOverlay: () => void;
    newFood: Omit<Food, "id">;
    editFood: Food | null;
    errors: { [key: string]: string };
    handleInputChange: (key: keyof Omit<Food, "id">, value: string) => void; // Corrected type
    handleCreateFood: () => void;
    handleUpdateFood: () => void;
    validateFood: (food: Omit<Food, "id">) => { [key: string]: string } | null;
}

const AddFoodModal: React.FC<AddFoodModalProps> = ({
    isVisible,
    toggleOverlay,
    newFood,
    editFood,
    errors,
    handleInputChange,
    handleCreateFood,
    handleUpdateFood,
    validateFood
}) => {
    const { theme } = useTheme();
    const styles = useStyles();

    // Helper function to get the value safely, now using keyof Omit<Food, "id">
    const getValue = (key: keyof Omit<Food, "id">) => {
        if (editFood) {
            return String(editFood[key] ?? "");
        }
        return String(newFood[key] ?? "");
    };

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
                            {editFood ? "Edit Food" : "Add New Food"}
                        </Text>
                        <Input
                            placeholder="Food Name"
                            value={getValue("name")}
                            onChangeText={(text) => handleInputChange("name", text)}
                            errorMessage={errors.name}
                            style={{ color: theme.colors.text }}
                            inputContainerStyle={{ borderBottomColor: theme.colors.text }}
                        />
                        <Input
                            placeholder="Calories (per 100g)"
                            keyboardType="numeric"
                            value={getValue("calories")}
                            onChangeText={(text) => handleInputChange("calories", text)}
                            errorMessage={errors.calories}
                            style={{ color: theme.colors.text }}
                            inputContainerStyle={{ borderBottomColor: theme.colors.text }}
                        />
                      <Input
                            placeholder="Protein (per 100g)"
                            keyboardType="numeric"
                            value={getValue("protein")}
                            onChangeText={(text) => handleInputChange("protein", text)}
                            errorMessage={errors.protein}
                            style={{ color: theme.colors.text }}
                            inputContainerStyle={{ borderBottomColor: theme.colors.text }}
                        />
                        <Input
                            placeholder="Carbs (per 100g)"
                            keyboardType="numeric"
                            value={getValue("carbs")}
                            onChangeText={(text) => handleInputChange("carbs", text)}
                            errorMessage={errors.carbs}
                            style={{ color: theme.colors.text }}
                            inputContainerStyle={{ borderBottomColor: theme.colors.text }}
                        />
                        <Input
                            placeholder="Fat (per 100g)"
                            keyboardType="numeric"
                            value={getValue("fat")}
                            onChangeText={(text) => handleInputChange("fat", text)}
                            errorMessage={errors.fat}
                            style={{ color: theme.colors.text }}
                            inputContainerStyle={{ borderBottomColor: theme.colors.text }}
                        />
                        <Button
                            title={editFood ? "Update Food" : "Add Food"}
                            onPress={editFood ? handleUpdateFood : handleCreateFood}
                            disabled={editFood ? !!validateFood(editFood) : !!validateFood(newFood)}
                            buttonStyle={styles.button}
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
        flex: 1,
    },
    overlayContent: {
        backgroundColor: theme.colors.background,
        width: "100%",
        height: "100%",
        borderRadius: 10,
        padding: 20,
    },
    overlayTitle: {
        marginBottom: 20,
        textAlign: "center",
    },
    button: {
        marginTop: 10,
    },
}));

export default AddFoodModal;
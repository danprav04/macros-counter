// components/AddFoodModal.tsx
import React from "react";
import { View, KeyboardAvoidingView, Platform } from "react-native";
import { Button, Input, Text, Overlay, makeStyles, useTheme, Icon } from "@rneui/themed";
import { Food } from "../types/food";
import { SafeAreaView } from "react-native-safe-area-context";
import { MaterialCommunityIcons } from '@expo/vector-icons';

interface AddFoodModalProps {
    isVisible: boolean;
    toggleOverlay: () => void;
    newFood: Omit<Food, "id">;
    editFood: Food | null;
    errors: { [key: string]: string };
    handleInputChange: (key: keyof Omit<Food, "id">, value: string) => void;
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

    // Helper function to get the value safely
    const getValue = (key: keyof Omit<Food, "id">) => {
        if (editFood) {
            return String(editFood[key] ?? "");
        }
        return String(newFood[key] ?? "");
    };

    // Dynamically determine icon and label color based on theme and errors
    const getIconColor = (error: string | undefined) => {
        return error ? theme.colors.error : theme.colors.grey3;
    };

    const getLabelColor = (error: string | undefined) => {
        return error ? theme.colors.error : theme.colors.grey1;
    };


    return (
        <Overlay
            isVisible={isVisible}
            onBackdropPress={toggleOverlay}
            animationType="slide"
            transparent={true}
            statusBarTranslucent={true}
            overlayStyle={styles.overlayStyle}
        >
            <SafeAreaView style={styles.modalSafeArea}>
                <KeyboardAvoidingView
                    behavior={Platform.OS === "ios" ? "padding" : "height"}
                    style={styles.keyboardAvoidingView}
                >
                    <View style={styles.overlayContent}>
                        <View style={styles.titleContainer}>
                            <Text h4 style={styles.overlayTitle}>
                                {editFood ? "Edit Food" : "Add New Food"}
                            </Text>
                            <Icon
                                name="close"
                                type="material"
                                size={24}
                                color={theme.colors.grey3}
                                onPress={toggleOverlay}
                                containerStyle={styles.closeIcon}
                            />
                        </View>

                        <Input
                            placeholder=""
                            value={getValue("name")}
                            onChangeText={(text) => handleInputChange("name", text)}
                            errorMessage={errors.name}
                            style={styles.input}
                            inputContainerStyle={{ borderBottomColor: theme.colors.text }}
                            placeholderTextColor={theme.colors.grey3}
                            leftIcon={<MaterialCommunityIcons name="food-apple" size={24} color={theme.colors.text} style={styles.inputIcon} />}
                            label="Food Name"
                            labelStyle={[styles.inputLabel, { color: theme.colors.text }]}
                        />
                        <Input
                            placeholder="Calories (per 100g)"
                            keyboardType="numeric"
                            value={getValue("calories")}
                            onChangeText={(text) => handleInputChange("calories", text)}
                            errorMessage={errors.calories}
                            style={styles.input}
                            inputContainerStyle={{ borderBottomColor: theme.colors.text }}
                            placeholderTextColor={theme.colors.grey3}
                            leftIcon={<MaterialCommunityIcons name="fire" size={24} color={theme.colors.text} style={styles.inputIcon} />}
                            label="Calories (per 100g)"
                            labelStyle={[styles.inputLabel, { color: theme.colors.text }]}
                        />
                        <Input
                            placeholder="Protein (per 100g)"
                            keyboardType="numeric"
                            value={getValue("protein")}
                            onChangeText={(text) => handleInputChange("protein", text)}
                            errorMessage={errors.protein}
                            style={styles.input}
                            inputContainerStyle={{ borderBottomColor: theme.colors.text }}
                            placeholderTextColor={theme.colors.grey3}
                            leftIcon={<MaterialCommunityIcons name="food-drumstick" size={24} color={theme.colors.text} style={styles.inputIcon} />}
                            label="Protein (per 100g)"
                            labelStyle={[styles.inputLabel, { color: theme.colors.text }]}
                        />
                        <Input
                            placeholder="Carbs (per 100g)"
                            keyboardType="numeric"
                            value={getValue("carbs")}
                            onChangeText={(text) => handleInputChange("carbs", text)}
                            errorMessage={errors.carbs}
                            style={styles.input}
                            inputContainerStyle={{ borderBottomColor: theme.colors.text }}
                            placeholderTextColor={theme.colors.grey3}
                            leftIcon={<MaterialCommunityIcons name="bread-slice" size={24} color={theme.colors.text} style={styles.inputIcon} />}
                            label="Carbs (per 100g)"
                            labelStyle={[styles.inputLabel, { color: theme.colors.text }]}
                        />
                        <Input
                            placeholder="Fat (per 100g)"
                            keyboardType="numeric"
                            value={getValue("fat")}
                            onChangeText={(text) => handleInputChange("fat", text)}
                            errorMessage={errors.fat}
                            style={styles.input}
                            inputContainerStyle={{ borderBottomColor: theme.colors.text }}
                            placeholderTextColor={theme.colors.grey3}
                            leftIcon={<MaterialCommunityIcons name="bucket" size={24} color={theme.colors.text} style={styles.inputIcon} />}
                            label="Fat (per 100g)"
                            labelStyle={[styles.inputLabel, { color: theme.colors.text }]}
                        />

                        <Button
                            title={editFood ? "Update Food" : "Add Food"}
                            onPress={editFood ? handleUpdateFood : handleCreateFood}
                            disabled={editFood ? (editFood !== null && !!validateFood(editFood)) : !!validateFood(newFood)}
                            buttonStyle={styles.button}
                            titleStyle={{ color: theme.colors.white }}
                        />
                    </View>
                </KeyboardAvoidingView>
            </SafeAreaView>
        </Overlay>
    );
};

const useStyles = makeStyles((theme) => ({
    overlayStyle: {
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        paddingTop: '33%',
        padding: 20,
        width: '100%',
        height: '100%',
        borderRadius: 10,
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
        borderRadius: 10,
        padding: 20,
    },
    titleContainer: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 10,
    },
    overlayTitle: {
        textAlign: "center",
        color: theme.colors.text,
    },
    closeIcon: {
        position: 'absolute',
        top: 0,
        right: 0,
        padding: 5,
    },
    input: {
        color: theme.colors.text,
    },
    inputLabel: {
        color: theme.colors.grey1,  // Default label color
        marginBottom: 5,
        fontSize: 16,
    },
    inputIcon: {
        marginRight: 10,
    },
    button: {
        marginTop: 15,
        backgroundColor: theme.colors.primary,
        borderRadius: 8,
    },
}));

export default AddFoodModal;
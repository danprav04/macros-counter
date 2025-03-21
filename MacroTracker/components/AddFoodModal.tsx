// components/AddFoodModal.tsx
import React, { useState, useEffect } from "react";
import { View, KeyboardAvoidingView, Platform, ActivityIndicator, Alert } from "react-native";
import { Button, Input, Text, Overlay, makeStyles, useTheme, Icon } from "@rneui/themed";
import { Food } from "../types/food";
import { SafeAreaView } from "react-native-safe-area-context";
import { MaterialCommunityIcons } from '@expo/vector-icons';
import Toast from 'react-native-toast-message'; // Import Toast

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
    setErrors: React.Dispatch<React.SetStateAction<{ [key: string]: string }>>; // Add setErrors prop
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
    validateFood,
    setErrors // Receive setErrors
}) => {
    const { theme } = useTheme();
    const styles = useStyles();
    const [loading, setLoading] = useState(false); // Add loading state

    useEffect(() => {
        if (isVisible) {
            setErrors({}); // Clear errors when the modal opens
        }
    }, [isVisible, setErrors]);

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

    const handleCreate = async () => {
        setLoading(true);
        try {
            await handleCreateFood();
            Toast.show({
                type: 'success',
                text1: 'Food Created Successfully!',
                visibilityTime: 3000
            });
        } catch (error: any) {
            Alert.alert("Error", error.message || "Failed to create food.");
        } finally {
            setLoading(false);
        }
    };

    const handleUpdate = async () => {
        setLoading(true);
        try {
            await handleUpdateFood();
            Toast.show({
                type: 'success',
                text1: 'Food Updated Successfully!',
                visibilityTime: 3000
            });
        } catch (error: any) {
            Alert.alert("Error", error.message || "Failed to update food.");
        } finally {
            setLoading(false);
        }
    };

    return (
        <Overlay
            isVisible={isVisible}
            onBackdropPress={toggleOverlay}
            animationType="slide"
            transparent={true}
            statusBarTranslucent={Platform.OS === 'android'} // Fix
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
                                size={28} //increased size
                                color={theme.colors.grey3}
                                onPress={toggleOverlay}
                                containerStyle={styles.closeIcon}
                            />
                        </View>

                        <View style={styles.inputContainer}>
                            <Input
                                placeholder=""
                                value={getValue("name")}
                                onChangeText={(text) => handleInputChange("name", text)}
                                style={styles.input}
                                inputContainerStyle={{ borderBottomColor: errors.name ? theme.colors.error : theme.colors.text }}
                                placeholderTextColor={theme.colors.grey3}
                                leftIcon={<MaterialCommunityIcons name="food-apple" size={24} color={errors.name ? theme.colors.error : theme.colors.text} style={styles.inputIcon} />}
                                label="Food Name"
                                labelStyle={[styles.inputLabel, { color: errors.name ? theme.colors.error : theme.colors.text }]}
                            />
                            {errors.name && <Text style={styles.errorText}>{errors.name}</Text>}
                        </View>

                        <View style={styles.inputContainer}>
                            <Input
                                placeholder="Calories (per 100g)"
                                keyboardType="numeric"
                                value={getValue("calories")}
                                onChangeText={(text) => {
                                    const parsedValue = parseFloat(text);
                                    if ((isNaN(parsedValue) && text !== "") || parsedValue < 0) return;
                                    handleInputChange("calories", text);
                                }}
                                style={styles.input}
                                inputContainerStyle={{ borderBottomColor: errors.calories ? theme.colors.error : theme.colors.text }}
                                placeholderTextColor={theme.colors.grey3}
                                leftIcon={<MaterialCommunityIcons name="fire" size={24} color={errors.calories ? theme.colors.error : theme.colors.text} style={styles.inputIcon} />}
                                label="Calories (per 100g)"
                                labelStyle={[styles.inputLabel, { color: errors.calories ? theme.colors.error : theme.colors.text }]}
                            />
                            {errors.calories && <Text style={styles.errorText}>{errors.calories}</Text>}
                        </View>

                        <View style={styles.inputContainer}>
                            <Input
                                placeholder="Protein (per 100g)"
                                keyboardType="numeric"
                                value={getValue("protein")}
                                onChangeText={(text) => {
                                    const parsedValue = parseFloat(text);
                                    if ((isNaN(parsedValue) && text !== "") || parsedValue < 0) return;
                                    handleInputChange("protein", text);
                                }}
                                style={styles.input}
                                inputContainerStyle={{ borderBottomColor: errors.protein ? theme.colors.error : theme.colors.text }}
                                placeholderTextColor={theme.colors.grey3}
                                leftIcon={<MaterialCommunityIcons name="food-drumstick" size={24} color={errors.protein ? theme.colors.error : theme.colors.text} style={styles.inputIcon} />}
                                label="Protein (per 100g)"
                                labelStyle={[styles.inputLabel, { color: errors.protein ? theme.colors.error : theme.colors.text }]}
                            />
                            {errors.protein && <Text style={styles.errorText}>{errors.protein}</Text>}
                        </View>

                        <View style={styles.inputContainer}>
                            <Input
                                placeholder="Carbs (per 100g)"
                                keyboardType="numeric"
                                value={getValue("carbs")}
                                onChangeText={(text) => {
                                    const parsedValue = parseFloat(text);
                                    if ((isNaN(parsedValue) && text !== "") || parsedValue < 0) return;
                                    handleInputChange("carbs", text);
                                }}
                                style={styles.input}
                                inputContainerStyle={{ borderBottomColor: errors.carbs ? theme.colors.error : theme.colors.text }}
                                placeholderTextColor={theme.colors.grey3}
                                leftIcon={<MaterialCommunityIcons name="bread-slice" size={24} color={errors.carbs ? theme.colors.error : theme.colors.text} style={styles.inputIcon} />}
                                label="Carbs (per 100g)"
                                labelStyle={[styles.inputLabel, { color: errors.carbs ? theme.colors.error : theme.colors.text }]}
                            />
                            {errors.carbs && <Text style={styles.errorText}>{errors.carbs}</Text>}
                        </View>
                        <View style={styles.inputContainer}>
                            <Input
                                placeholder="Fat (per 100g)"
                                keyboardType="numeric"
                                value={getValue("fat")}
                                onChangeText={(text) => {
                                    const parsedValue = parseFloat(text);
                                    if ((isNaN(parsedValue) && text !== "") || parsedValue < 0) return;
                                    handleInputChange("fat", text);
                                }}
                                style={styles.input}
                                inputContainerStyle={{ borderBottomColor: errors.fat ? theme.colors.error : theme.colors.text }}
                                placeholderTextColor={theme.colors.grey3}
                                leftIcon={<MaterialCommunityIcons name="bucket" size={24} color={errors.fat ? theme.colors.error : theme.colors.text} style={styles.inputIcon} />}
                                label="Fat (per 100g)"
                                labelStyle={[styles.inputLabel, { color: errors.fat ? theme.colors.error : theme.colors.text }]}
                            />
                            {errors.fat && <Text style={styles.errorText}>{errors.fat}</Text>}
                        </View>

                        <Button
                            title={editFood ? "Update Food" : "Add Food"}
                            onPress={editFood ? handleUpdate : handleCreate}
                            disabled={(editFood ? (editFood !== null && !!validateFood(editFood)) : !!validateFood(newFood)) || loading}
                            buttonStyle={styles.button}
                            titleStyle={{ color: theme.colors.white }}
                            loading={loading}
                            loadingProps={{ color: theme.colors.white }}

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
    inputContainer: {
        marginBottom: 0, // Reduce spacing
    },
    errorText: {
        color: theme.colors.error,
        marginLeft: 10,
        marginTop: 0,
        marginBottom: 5

    },
    button: {
        marginTop: 15,
        backgroundColor: theme.colors.primary,
        borderRadius: 8,
    },
}));

export default AddFoodModal;
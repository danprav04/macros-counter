// AddFoodModal.tsx
import React, { useState, useEffect } from "react";
import { View, KeyboardAvoidingView, Platform, ActivityIndicator, Alert, ScrollView } from "react-native";
import { Button, Input, Text, Overlay, makeStyles, useTheme, Icon } from "@rneui/themed";
import { Food } from "../types/food";
import { SafeAreaView } from "react-native-safe-area-context";
import { MaterialCommunityIcons } from '@expo/vector-icons';
import Toast from 'react-native-toast-message';

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
    setErrors: React.Dispatch<React.SetStateAction<{ [key: string]: string }>>;
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
    setErrors
}) => {
    const { theme } = useTheme();
    const styles = useStyles();
    const [loading, setLoading] = useState(false);
    const [apiLoading, setApiLoading] = useState(false); // Loading state for API calls

    useEffect(() => {
        if (isVisible) {
            setErrors({});
        }
    }, [isVisible, setErrors]);

    const getValue = (key: keyof Omit<Food, "id">) => {
        return String((editFood && editFood[key]) ?? newFood[key] ?? "");
    };

    const handleCreateOrUpdate = async (isUpdate: boolean) => {
        setLoading(true);
        const validationErrors = validateFood(isUpdate ? (editFood as Omit<Food, "id">) : newFood);

        if (validationErrors) {
            setErrors(validationErrors);
            setLoading(false);
            Toast.show({ //show a toast in case of errors
                type: 'error',
                text1: 'Please fix the errors',
            });
            return;
        }

        try {
            isUpdate ? await handleUpdateFood() : await handleCreateFood();
            Toast.show({
                type: 'success',
                text1: `Food ${isUpdate ? 'Updated' : 'Created'} Successfully!`,
            });
            toggleOverlay();
        } catch (error: any) {
            Alert.alert("Error", error.message || `Failed to ${isUpdate ? 'update' : 'create'} food.`);
        } finally {
            setLoading(false);
        }
    };



    return (
        <Overlay
            isVisible={isVisible}
            onBackdropPress={toggleOverlay}
            animationType="fade" // Changed animation
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
                            <Text h4 style={styles.overlayTitle}>
                                {editFood ? "Edit Food" : "Add New Food"}
                            </Text>
                            <Button
                                title={editFood ? "Update" : "Add"}
                                onPress={() => handleCreateOrUpdate(!!editFood)}
                                buttonStyle={[styles.button, { backgroundColor: editFood ? theme.colors.warning : theme.colors.primary }]}
                                titleStyle={{ color: theme.colors.white, fontWeight: '600' }}
                                loading={loading}
                                containerStyle={styles.buttonContainer}
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
                        <ScrollView>

                            <Input
                                label="Food Name"
                                labelStyle={{ color: theme.colors.text }}
                                value={getValue("name")}
                                onChangeText={(text) => handleInputChange("name", text)}
                                errorMessage={errors.name}
                                inputContainerStyle={styles.inputContainerStyle}
                                inputStyle={styles.inputStyle}
                                leftIcon={<MaterialCommunityIcons name="food-apple" size={24} color={errors.name ? theme.colors.error : theme.colors.text} />}
                            />

                            <Input
                                label="Calories (per 100g)"
                                labelStyle={{ color: theme.colors.text }}
                                keyboardType="numeric"
                                value={getValue("calories")}
                                onChangeText={(text) => handleInputChange("calories", text.replace(/[^0-9]/g, ''))} // Improved validation
                                errorMessage={errors.calories}
                                inputContainerStyle={styles.inputContainerStyle}
                                inputStyle={styles.inputStyle}
                                leftIcon={<MaterialCommunityIcons name="fire" size={24} color={errors.calories ? theme.colors.error : theme.colors.text} />}
                            />

                            <Input
                                label="Protein (per 100g)"
                                labelStyle={{ color: theme.colors.text }}
                                keyboardType="numeric"
                                value={getValue("protein")}
                                onChangeText={(text) => handleInputChange("protein", text.replace(/[^0-9]/g, ''))}
                                errorMessage={errors.protein}
                                inputContainerStyle={styles.inputContainerStyle}
                                inputStyle={styles.inputStyle}
                                leftIcon={<MaterialCommunityIcons name="food-drumstick" size={24} color={errors.protein ? theme.colors.error : theme.colors.text} />}
                            />

                            <Input
                                label="Carbs (per 100g)"
                                labelStyle={{ color: theme.colors.text }}
                                keyboardType="numeric"
                                value={getValue("carbs")}
                                onChangeText={(text) => handleInputChange("carbs", text.replace(/[^0-9]/g, ''))}
                                errorMessage={errors.carbs}
                                inputContainerStyle={styles.inputContainerStyle}
                                inputStyle={styles.inputStyle}
                                leftIcon={<MaterialCommunityIcons name="bread-slice" size={24} color={errors.carbs ? theme.colors.error : theme.colors.text} />}
                            />
                            <Input
                                label="Fat (per 100g)"
                                labelStyle={{ color: theme.colors.text }}
                                keyboardType="numeric"
                                value={getValue("fat")}
                                onChangeText={(text) => handleInputChange("fat", text.replace(/[^0-9]/g, ''))}
                                errorMessage={errors.fat}
                                inputContainerStyle={styles.inputContainerStyle}
                                inputStyle={styles.inputStyle}
                                leftIcon={<MaterialCommunityIcons name="bucket" size={24} color={errors.fat ? theme.colors.error : theme.colors.text} />}
                            />
                            {/* Placeholders for AI and Barcode Input */}
                            <View style={styles.futureInputContainer}>
                                <Text style={styles.futureInputLabel}>AI Input (Coming Soon)</Text>
                            </View>
                            <View style={styles.futureInputContainer}>
                                <Text style={styles.futureInputLabel}>Barcode Input (Coming Soon)</Text>
                            </View>
                        </ScrollView>


                    </View>
                </KeyboardAvoidingView>
                {/* Full-screen Loading Overlay */}
                {apiLoading && (
                    <View style={styles.loadingOverlay}>
                        <ActivityIndicator size="large" color={theme.colors.primary} />
                    </View>
                )}
            </SafeAreaView>
        </Overlay>
    );
};

const useStyles = makeStyles((theme) => ({
    overlayStyle: {
        backgroundColor: 'rgba(150, 150, 150, 0)', // Lighter background
        padding: 20,
        marginVertical: 50,
        width: '90%', // Slightly smaller width
        borderRadius: 15, // More rounded corners
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
    closeIcon: {
        padding: 5,
    },

    inputContainerStyle: {
        borderBottomWidth: 1,
        borderBottomColor: theme.colors.grey4,
        marginBottom: 10, // Reduced margin
    },
    inputStyle: {
        color: theme.colors.text,
        marginLeft: 10,
    },

    futureInputContainer: {
        backgroundColor: theme.colors.grey5,
        padding: 15,
        borderRadius: 10,
        marginTop: 10,
        alignItems: 'center',
    },
    futureInputLabel: {
        color: theme.colors.grey2,
        fontStyle: 'italic',
    },
    buttonContainer: {
        // marginTop: 15,
    },
    button: {
        // backgroundColor: theme.colors.primary, // Handled in component now
        borderRadius: 8,
        paddingHorizontal: 20, // More horizontal padding
    },
    loadingOverlay: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.5)', // Semi-transparent black
        justifyContent: 'center',
        alignItems: 'center',
        zIndex: 10, // Ensure it's on top
    },
}));

export default AddFoodModal;
import React, { useState, useEffect } from "react";
import {
  View,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Alert,
  ScrollView,
} from "react-native";
import {
  Button,
  Input,
  Text,
  Overlay,
  makeStyles,
  useTheme,
  Icon, // Re-using the Icon component from RNEUI
} from "@rneui/themed";
import { Food } from "../types/food";
import { SafeAreaView } from "react-native-safe-area-context";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import Toast from "react-native-toast-message";
import { getMacrosForRecipe } from "../utils/macros";

interface AddFoodModalProps {
  isVisible: boolean;
  toggleOverlay: () => void;
  newFood: Omit<Food, "id">;
  editFood: Food | null;
  errors: { [key: string]: string };
  handleInputChange: (
    key: keyof Omit<Food, "id">,
    value: string,
    isEdit: boolean
  ) => void;
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
  setErrors,
}) => {
  const { theme } = useTheme();
  const styles = useStyles();
  const [loading, setLoading] = useState(false);
  const [apiLoading, setApiLoading] = useState(false);
  const [mode, setMode] = useState<"normal" | "ingredients">("normal");
  const [ingredients, setIngredients] = useState("");
  const [aiButtonLoading, setAiButtonLoading] = useState(false);

  useEffect(() => {
    if (isVisible) {
      setErrors({});
      setMode("normal");
      setIngredients("");
    }
  }, [isVisible, setErrors]);

  const getValue = (key: keyof Omit<Food, "id">) => {
    return String((editFood && editFood[key]) ?? newFood[key] ?? "");
  };

  const handleCreateOrUpdate = async (isUpdate: boolean) => {
    setLoading(true);
    const validationErrors = validateFood(
      isUpdate ? (editFood as Omit<Food, "id">) : newFood
    );

    if (validationErrors) {
      setErrors(validationErrors);
      setLoading(false);
      Toast.show({
        type: "error",
        text1: "Please fix the errors",
      });
      return;
    }

    try {
      isUpdate ? await handleUpdateFood() : await handleCreateFood();
      Toast.show({
        type: "success",
        text1: `Food ${isUpdate ? "Updated" : "Created"} Successfully!`,
      });
      toggleOverlay();
    } catch (error: any) {
      Alert.alert(
        "Error",
        error.message || `Failed to ${isUpdate ? "update" : "create"} food.`
      );
    } finally {
      setLoading(false);
    }
  };

  const handleAiButtonClick = async () => {
    const foodName = getValue("name");

    if (mode === "normal") {
      setMode("ingredients");
      handleInputChange("calories", "", !!editFood);
      handleInputChange("protein", "", !!editFood);
      handleInputChange("carbs", "", !!editFood);
      handleInputChange("fat", "", !!editFood);
    } else if (mode === "ingredients") {
      setAiButtonLoading(true);
      try {
        const macros = await getMacrosForRecipe(foodName, ingredients);
        handleInputChange("calories", String(macros.calories), !!editFood);
        handleInputChange("protein", String(macros.protein), !!editFood);
        handleInputChange("carbs", String(macros.carbs), !!editFood);
        handleInputChange("fat", String(macros.fat), !!editFood);
        setMode("normal");
      } catch (error) {
        Alert.alert(
          "AI Error",
          "Could not calculate macros.  Please check your ingredients and try again."
        );
      } finally {
        setAiButtonLoading(false);
      }
    }
  };

  return (
    <Overlay
      isVisible={isVisible}
      onBackdropPress={toggleOverlay}
      animationType="fade"
      transparent={true}
      statusBarTranslucent={Platform.OS === "android"}
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
                buttonStyle={[
                  styles.button,
                  {
                    backgroundColor: editFood
                      ? theme.colors.warning
                      : theme.colors.primary,
                  },
                ]}
                titleStyle={{ color: theme.colors.white, fontWeight: "600" }}
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
                onChangeText={(text) =>
                  handleInputChange("name", text, !!editFood)
                }
                errorMessage={errors.name}
                inputContainerStyle={styles.inputContainerStyle}
                inputStyle={styles.inputStyle}
                leftIcon={
                  <MaterialCommunityIcons
                    name="food-apple"
                    size={24}
                    color={errors.name ? theme.colors.error : theme.colors.text}
                  />
                }
              />
              {mode === "normal" && (
                <>
                  <Input
                    label="Calories (per 100g)"
                    labelStyle={{ color: theme.colors.text }}
                    keyboardType="numeric"
                    value={getValue("calories")}
                    onChangeText={(text) =>
                      handleInputChange(
                        "calories",
                        text.replace(/[^0-9]/g, ""),
                        !!editFood
                      )
                    }
                    errorMessage={errors.calories}
                    inputContainerStyle={styles.inputContainerStyle}
                    inputStyle={styles.inputStyle}
                    leftIcon={
                      <MaterialCommunityIcons
                        name="fire"
                        size={24}
                        color={
                          errors.calories
                            ? theme.colors.error
                            : theme.colors.text
                        }
                      />
                    }
                  />

                  <Input
                    label="Protein (per 100g)"
                    labelStyle={{ color: theme.colors.text }}
                    keyboardType="numeric"
                    value={getValue("protein")}
                    onChangeText={(text) =>
                      handleInputChange(
                        "protein",
                        text.replace(/[^0-9]/g, ""),
                        !!editFood
                      )
                    }
                    errorMessage={errors.protein}
                    inputContainerStyle={styles.inputContainerStyle}
                    inputStyle={styles.inputStyle}
                    leftIcon={
                      <MaterialCommunityIcons
                        name="food-drumstick"
                        size={24}
                        color={
                          errors.protein
                            ? theme.colors.error
                            : theme.colors.text
                        }
                      />
                    }
                  />

                  <Input
                    label="Carbs (per 100g)"
                    labelStyle={{ color: theme.colors.text }}
                    keyboardType="numeric"
                    value={getValue("carbs")}
                    onChangeText={(text) =>
                      handleInputChange(
                        "carbs",
                        text.replace(/[^0-9]/g, ""),
                        !!editFood
                      )
                    }
                    errorMessage={errors.carbs}
                    inputContainerStyle={styles.inputContainerStyle}
                    inputStyle={styles.inputStyle}
                    leftIcon={
                      <MaterialCommunityIcons
                        name="bread-slice"
                        size={24}
                        color={
                          errors.carbs ? theme.colors.error : theme.colors.text
                        }
                      />
                    }
                  />
                  <Input
                    label="Fat (per 100g)"
                    labelStyle={{ color: theme.colors.text }}
                    keyboardType="numeric"
                    value={getValue("fat")}
                    onChangeText={(text) =>
                      handleInputChange(
                        "fat",
                        text.replace(/[^0-9]/g, ""),
                        !!editFood
                      )
                    }
                    errorMessage={errors.fat}
                    inputContainerStyle={styles.inputContainerStyle}
                    inputStyle={styles.inputStyle}
                    leftIcon={
                      <MaterialCommunityIcons
                        name="bucket"
                        size={24}
                        color={
                          errors.fat ? theme.colors.error : theme.colors.text
                        }
                      />
                    }
                  />
                </>
              )}

              {mode === "ingredients" && (
                <>
                <View style={styles.backButtonContainer}>
                    <Icon
                        name="arrow-left" // Use a clear back arrow icon
                        type="material-community" // From MaterialCommunityIcons
                        size={28}
                        color={theme.colors.primary} // Use a contrasting color
                        onPress={() => setMode("normal")}
                        containerStyle={styles.backIcon} // Added style for positioning
                    />
                    <Text style={styles.backButtonText}>Back to Manual Input</Text>
                </View>

                  <Input
                    label="Ingredients"
                    labelStyle={{ color: theme.colors.text }}
                    value={ingredients}
                    onChangeText={setIngredients}
                    multiline={true}
                    numberOfLines={4}
                    inputContainerStyle={[styles.inputContainerStyle]}
                    inputStyle={styles.inputStyle}
                    leftIcon={
                      <MaterialCommunityIcons
                        name="food-variant"
                        size={24}
                        color={theme.colors.text}
                      />
                    }
                  />
                </>
              )}
                <Button
                    title={mode === "normal" ? "AI Input" : "Get Macros"}
                    onPress={handleAiButtonClick}
                    buttonStyle={[
                    styles.button,
                    { backgroundColor: theme.colors.secondary },
                    ]}
                    titleStyle={{ color: theme.colors.white, fontWeight: "600" }}
                    loading={aiButtonLoading}
                    containerStyle={[styles.buttonContainer, { marginTop: 15 }]}
                />

              <View style={styles.futureInputContainer}>
                <Text style={styles.futureInputLabel}>
                  Barcode Input (Coming Soon)
                </Text>
              </View>
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
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
    backgroundColor: "rgba(150, 150, 150, 0)",
    padding: 20,
    marginVertical: 50,
    width: "90%",
    borderRadius: 15,
    height: "100%",
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
    minHeight: "50%",
    flexGrow: 1,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 20,
  },
  overlayTitle: {
    color: theme.colors.text,
    fontWeight: "bold",
  },
  closeIcon: {
    padding: 5,
  },
  inputContainerStyle: {
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.grey4,
    marginBottom: 10,
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
    alignItems: "center",
  },
  futureInputLabel: {
    color: theme.colors.grey2,
    fontStyle: "italic",
  },
  buttonContainer: {},
  button: {
    borderRadius: 8,
    paddingHorizontal: 20,
  },
  loadingOverlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "center",
    alignItems: "center",
    zIndex: 10,
  },
    backButtonContainer: {
        flexDirection: "row", // Arrange icon and text horizontally
        alignItems: "center", // Vertically center
        marginBottom: 10,
        marginTop: 5,
        marginLeft: 5, // Add left margin

    },
    backIcon: {
        marginRight: 8, // Add space between the icon and text
        padding: 5,

    },
    backButtonText: {
        color: theme.colors.grey2,
        fontSize: 16,
    }
}));

export default AddFoodModal;
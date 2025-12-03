import React, { useMemo, useState } from "react";
import {
  View,
  TouchableOpacity,
  ActivityIndicator,
} from "react-native";
import {
  CheckBox,
  Input,
  Icon,
  Text,
  useTheme,
  makeStyles,
} from "@rneui/themed";
import { EstimatedFoodItem } from "../../types/macros";
import { Food } from "../../types/food";
import { isValidNumberInput } from "../../utils/validationUtils";
import { t } from "../../localization/i18n";
import {
  calculateBaseFoodGrade,
  FoodGradeResult,
} from "../../utils/gradingUtils";
import { getFoodIconUrl } from "../../utils/iconUtils";
import useDelayedLoading from '../../hooks/useDelayedLoading';


interface QuickAddItemProps {
  item: EstimatedFoodItem;
  index: number;
  isSelected: boolean;
  isEditingThisItem: boolean;
  isAnyItemEditing: boolean;
  isLoading?: boolean;
  foodIcons: { [foodName: string]: string | null };
  
  editedName: string;
  editedGrams: string;
  editedCalories: string;
  editedProtein: string;
  editedCarbs: string;
  editedFat: string;

  onToggleItem: (index: number) => void;
  onEditItem: (index: number) => void;
  onSaveEdit: () => void;
  onCancelEdit: () => void;
  
  onNameChange: (name: string) => void;
  onGramsChange: (grams: string) => void;
  onCaloriesChange: (val: string) => void;
  onProteinChange: (val: string) => void;
  onCarbsChange: (val: string) => void;
  onFatChange: (val: string) => void;

  onSaveToLibrary: (
    item: EstimatedFoodItem,
    setSavingState: (isSaving: boolean) => void
  ) => Promise<void>;
  foods: Food[];
}

const QuickAddItem: React.FC<QuickAddItemProps> = ({
  item,
  index,
  isSelected,
  isEditingThisItem,
  isAnyItemEditing,
  isLoading,
  foodIcons,
  
  editedName,
  editedGrams,
  editedCalories,
  editedProtein,
  editedCarbs,
  editedFat,

  onToggleItem,
  onEditItem,
  onSaveEdit,
  onCancelEdit,
  
  onNameChange,
  onGramsChange,
  onCaloriesChange,
  onProteinChange,
  onCarbsChange,
  onFatChange,

  onSaveToLibrary,
  foods,
}) => {
  const { theme } = useTheme();
  const styles = useStyles();
  const [isSavingToLibrary, setIsSavingToLibrary] = useState(false);
  const showIsSavingToLibrary = useDelayedLoading(isSavingToLibrary);

  const estimatedCalories = Math.round(
    (item.calories_per_100g / 100) * item.estimatedWeightGrams
  );

  const tempFoodForGrading: Food = useMemo(
    () => ({
      id: `temp-qa-${index}-${item.foodName}`,
      name: item.foodName,
      calories: item.calories_per_100g,
      protein: item.protein_per_100g,
      carbs: item.carbs_per_100g,
      fat: item.fat_per_100g,
      createdAt: new Date().toISOString(),
    }),
    [
      item.foodName,
      item.calories_per_100g,
      item.protein_per_100g,
      item.carbs_per_100g,
      item.fat_per_100g,
      index,
    ]
  );

  const gradeResult: FoodGradeResult | null = useMemo(
    () => calculateBaseFoodGrade(tempFoodForGrading),
    [tempFoodForGrading]
  );

  const isInLibrary = useMemo(() => {
    return foods.some(food => food.name.toLowerCase() === item.foodName.toLowerCase());
  }, [foods, item.foodName]);

  const handleSaveToLibraryPress = async () => {
    if (isSavingToLibrary || isAnyItemEditing || isLoading) return;
    await onSaveToLibrary(item, setIsSavingToLibrary);
  };

  const renderFoodIcon = (foodName: string) => {
    const iconIdentifier = foodIcons[foodName] ?? getFoodIconUrl(foodName);
    if (iconIdentifier) {
      return <Text style={styles.foodIconEmoji}>{iconIdentifier}</Text>;
    }
    return (
      <View style={[styles.foodIconContainer, styles.iconPlaceholder]}>
        <Icon
          name="help-outline"
          type="material"
          size={22}
          color={theme.colors.grey3}
        />
      </View>
    );
  };

  const canPerformActions =
    !isAnyItemEditing && !isLoading && !isSavingToLibrary;

  if (isEditingThisItem) {
      return (
        <View style={[styles.quickAddItemContainer, styles.quickAddItemEditing]}>
            {/* Top Row: Name */}
            <View style={styles.editRow}>
              {renderFoodIcon(item.foodName)}
              <Input
                value={editedName}
                onChangeText={onNameChange}
                placeholder={t("quickAddList.foodNamePlaceholder")}
                inputContainerStyle={styles.quickEditInputContainer}
                inputStyle={styles.quickEditInput}
                containerStyle={styles.quickEditNameContainer}
                autoFocus
                selectTextOnFocus
              />
            </View>

            {/* Middle Row: Grams & Grade */}
            <View style={[styles.editRow, { marginTop: 8 }]}>
               {gradeResult && (
                <Text style={[styles.gradePill, { backgroundColor: gradeResult.color, marginRight: 8, marginLeft: 2 }]}>
                  {gradeResult.letter}
                </Text>
              )}
              <View style={styles.gramsInputWrapper}>
                  <Input
                    value={editedGrams}
                    onChangeText={onGramsChange}
                    placeholder="Grams"
                    keyboardType="numeric"
                    inputContainerStyle={styles.quickEditInputContainer}
                    inputStyle={styles.quickEditInput}
                    containerStyle={{paddingHorizontal: 0}}
                    rightIcon={<Text style={styles.unitText}>g</Text>}
                    errorMessage={!isValidNumberInput(editedGrams) && editedGrams !== "" ? t("quickAddList.errorInvalidGrams") : ""}
                    errorStyle={styles.inputError}
                  />
              </View>
              <View style={styles.editActions}>
                  <TouchableOpacity onPress={onSaveEdit} style={styles.quickEditActionButton}>
                    <Icon name="checkmark-circle" type="ionicon" color={theme.colors.success} size={34} />
                  </TouchableOpacity>
                  <TouchableOpacity onPress={onCancelEdit} style={styles.quickEditActionButton}>
                    <Icon name="close-circle" type="ionicon" color={theme.colors.error} size={34} />
                  </TouchableOpacity>
              </View>
            </View>

            {/* Bottom Row: Macros Grid */}
            <View style={styles.macrosGrid}>
                <View style={styles.macroInputWrapper}>
                    <Icon name="fire" type="material-community" size={14} color={theme.colors.primary} style={styles.macroIcon}/>
                    <Input
                        value={editedCalories}
                        onChangeText={onCaloriesChange}
                        keyboardType="numeric"
                        inputContainerStyle={styles.macroInputContainer}
                        inputStyle={styles.macroInput}
                        containerStyle={styles.macroContainerStyle}
                        placeholder="Cal"
                    />
                </View>
                <View style={styles.macroInputWrapper}>
                    <Icon name="food-drumstick" type="material-community" size={14} color={theme.colors.success} style={styles.macroIcon}/>
                    <Input
                        value={editedProtein}
                        onChangeText={onProteinChange}
                        keyboardType="numeric"
                        inputContainerStyle={styles.macroInputContainer}
                        inputStyle={styles.macroInput}
                        containerStyle={styles.macroContainerStyle}
                        placeholder="Pro"
                    />
                </View>
                <View style={styles.macroInputWrapper}>
                    <Icon name="bread-slice" type="material-community" size={14} color={theme.colors.warning} style={styles.macroIcon}/>
                    <Input
                        value={editedCarbs}
                        onChangeText={onCarbsChange}
                        keyboardType="numeric"
                        inputContainerStyle={styles.macroInputContainer}
                        inputStyle={styles.macroInput}
                        containerStyle={styles.macroContainerStyle}
                        placeholder="Carb"
                    />
                </View>
                <View style={styles.macroInputWrapper}>
                    <Icon name="oil" type="material-community" size={14} color={theme.colors.error} style={styles.macroIcon}/>
                    <Input
                        value={editedFat}
                        onChangeText={onFatChange}
                        keyboardType="numeric"
                        inputContainerStyle={styles.macroInputContainer}
                        inputStyle={styles.macroInput}
                        containerStyle={styles.macroContainerStyle}
                        placeholder="Fat"
                    />
                </View>
            </View>
        </View>
      )
  }

  return (
    <View style={styles.pressableWrapper}>
        <TouchableOpacity
            onPress={() => onToggleItem(index)}
            disabled={!canPerformActions}
            style={[
                styles.quickAddItemContainer,
                isSelected && styles.quickAddItemSelected,
                ((isAnyItemEditing && !isEditingThisItem) || isLoading || isSavingToLibrary) && styles.disabledItem,
            ]}
            activeOpacity={0.7}
        >
            <View style={styles.leftContent}>
                <CheckBox
                    checked={isSelected}
                    onPress={() => onToggleItem(index)}
                    containerStyle={styles.quickAddCheckbox}
                    checkedColor={theme.colors.primary}
                    uncheckedColor={theme.colors.grey3}
                    disabled={!canPerformActions}
                    size={28}
                />
                
                <View style={styles.iconWrapper}>
                    {renderFoodIcon(item.foodName)}
                </View>

                <View style={styles.textWrapper}>
                    <View style={styles.titleAndGradeContainer}>
                        {gradeResult && (
                        <Text
                            style={[
                            styles.gradePill,
                            { backgroundColor: gradeResult.color },
                            ]}
                        >
                            {gradeResult.letter}
                        </Text>
                        )}
                        <Text style={styles.quickAddItemTitle} numberOfLines={1} ellipsizeMode="tail">
                            {item.foodName}
                        </Text>
                    </View>
                    <Text style={styles.quickAddItemSubtitle}>
                        {`Est: ${Math.round(item.estimatedWeightGrams)}g • ~${estimatedCalories} kcal`}
                    </Text>
                </View>
            </View>

            <View style={styles.actionButtonsContainer}>
              {showIsSavingToLibrary ? (
                <ActivityIndicator
                  size="small"
                  color={theme.colors.primary}
                  style={styles.actionIconPadding}
                />
              ) : (
                <TouchableOpacity
                  onPress={handleSaveToLibraryPress}
                  disabled={!canPerformActions}
                  style={styles.actionIconPadding}
                  hitSlop={{ top: 10, bottom: 10, left: 5, right: 5 }}
                >
                  <Icon
                    name={isInLibrary ? "bookmark" : "bookmark-plus-outline"}
                    type="material-community"
                    size={24}
                    color={
                      canPerformActions
                        ? theme.colors.primary
                        : theme.colors.grey3
                    }
                  />
                </TouchableOpacity>
              )}
              <TouchableOpacity
                onPress={() => onEditItem(index)}
                disabled={!canPerformActions}
                style={styles.actionIconPadding}
                hitSlop={{ top: 10, bottom: 10, left: 5, right: 5 }}
              >
                <Icon
                  name="pencil"
                  type="material-community"
                  size={24}
                  color={
                    canPerformActions ? theme.colors.secondary : theme.colors.grey3
                  }
                />
              </TouchableOpacity>
            </View>
        </TouchableOpacity>
    </View>
  );
};

const useStyles = makeStyles((theme) => ({
  pressableWrapper: {
      marginBottom: 2,
  },
  quickAddItemContainer: {
    paddingVertical: 12,
    paddingHorizontal: 12,
    backgroundColor: theme.colors.background,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.divider,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    minHeight: 70,
  },
  quickAddItemSelected: {
    backgroundColor: theme.colors.primaryLight,
    borderBottomColor: 'transparent',
  },
  quickAddItemEditing: {
    flexDirection: "column",
    alignItems: 'stretch',
    backgroundColor: theme.colors.background,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderWidth: 2,
    borderColor: theme.colors.primary,
    borderRadius: 12,
    marginVertical: 5,
    marginHorizontal: 5,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  disabledItem: {
    opacity: 0.6,
  },
  leftContent: {
      flexDirection: 'row',
      alignItems: 'center',
      flex: 1,
  },
  quickAddCheckbox: {
    padding: 0,
    margin: 0,
    marginRight: 12,
    marginLeft: 0,
    backgroundColor: "transparent",
    borderWidth: 0,
  },
  iconWrapper: {
      marginRight: 14,
      justifyContent: 'center',
      alignItems: 'center',
  },
  foodIconContainer: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
  foodIconEmoji: {
    fontSize: 28,
    width: 36,
    height: 36,
    textAlign: 'center',
    textAlignVertical: 'center',
  },
  iconPlaceholder: {
    backgroundColor: theme.colors.grey5,
  },
  textWrapper: {
      flex: 1,
      justifyContent: 'center',
  },
  titleAndGradeContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 4,
  },
  gradePill: {
    fontSize: 11,
    fontWeight: "bold",
    color: theme.colors.white,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
    marginRight: 8,
    minWidth: 20,
    textAlign: "center",
    overflow: "hidden",
  },
  quickAddItemTitle: {
    fontWeight: "600",
    color: theme.colors.text,
    fontSize: 16,
    textAlign: "left",
    flexShrink: 1,
  },
  quickAddItemSubtitle: {
    color: theme.colors.secondary,
    fontSize: 13,
    textAlign: "left",
  },
  actionButtonsContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginLeft: 10,
  },
  actionIconPadding: {
    padding: 8,
    marginLeft: 4,
  },
  // Edit Mode Styles
  editRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 0,
  },
  quickEditInputContainer: {
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.primary,
    minHeight: 40,
    paddingHorizontal: 0,
    paddingBottom: 4,
  },
  quickEditInput: {
    fontSize: 16,
    color: theme.colors.text,
    paddingVertical: 0,
    textAlign: "left",
    textAlignVertical: 'center',
  },
  quickEditNameContainer: {
    flex: 1,
    paddingHorizontal: 0,
    marginLeft: 8,
  },
  gramsInputWrapper: {
      flex: 1,
      maxWidth: 120,
  },
  unitText: {
    color: theme.colors.grey3,
    fontSize: 14,
    fontWeight: "500",
    paddingRight: 5,
  },
  editActions: {
      flexDirection: 'row',
      marginLeft: 'auto',
      alignItems: 'center',
  },
  quickEditActionButton: {
    padding: 6,
    marginLeft: 12,
  },
  inputError: {
    color: theme.colors.error,
    fontSize: 12,
    marginVertical: 2,
    marginLeft: 0,
  },
  // Macro Grid
  macrosGrid: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      marginTop: 10,
      paddingTop: 10,
      borderTopWidth: 1,
      borderTopColor: theme.colors.divider,
  },
  macroInputWrapper: {
      flex: 1,
      marginHorizontal: 3,
      alignItems: 'center',
      flexDirection: 'row',
      backgroundColor: theme.colors.grey5,
      borderRadius: 8,
      paddingHorizontal: 6,
      height: 36,
  },
  macroIcon: {
      marginRight: 4,
  },
  macroInputContainer: {
      borderBottomWidth: 0,
      height: 36,
  },
  macroInput: {
      fontSize: 14,
      color: theme.colors.text,
      textAlign: 'center',
      paddingBottom: 0,
      marginBottom: 0,
      marginTop: 16,
  },
  macroContainerStyle: {
      flex: 1,
      paddingHorizontal: 0,
  }
}));

export default QuickAddItem;
// src/components/Entry/QuickAddItem.tsx
import React, { useMemo } from 'react';
import { View, TouchableOpacity, Pressable, ActivityIndicator, Image } from 'react-native';
import { ListItem, CheckBox, Input, Icon, Text, useTheme, makeStyles } from '@rneui/themed';
import { EstimatedFoodItem } from '../../types/macros';
import { Food } from '../../types/food';
import { isValidNumberInput } from '../../utils/validationUtils';
import { t } from '../../localization/i18n';
import { calculateBaseFoodGrade, FoodGradeResult } from '../../utils/gradingUtils';

interface QuickAddItemProps {
    item: EstimatedFoodItem;
    index: number;
    isSelected: boolean;
    isEditingThisItem: boolean;
    isAnyItemEditing: boolean;
    isLoading?: boolean;
    foodIcons: { [foodName: string]: string | null | undefined };
    editedName: string;
    editedGrams: string;
    onToggleItem: (index: number) => void;
    onEditItem: (index: number) => void;
    onSaveEdit: () => void;
    onCancelEdit: () => void;
    onNameChange: (name: string) => void;
    onGramsChange: (grams: string) => void;
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
    onToggleItem,
    onEditItem,
    onSaveEdit,
    onCancelEdit,
    onNameChange,
    onGramsChange,
}) => {
    const { theme } = useTheme();
    const styles = useStyles();

    const estimatedCalories = Math.round((item.calories_per_100g / 100) * item.estimatedWeightGrams);

    const tempFoodForGrading: Food = useMemo(() => ({
        id: `temp-qa-${index}-${item.foodName}`, // More unique temporary ID
        name: item.foodName,
        calories: item.calories_per_100g,
        protein: item.protein_per_100g,
        carbs: item.carbs_per_100g,
        fat: item.fat_per_100g,
    }), [item.foodName, item.calories_per_100g, item.protein_per_100g, item.carbs_per_100g, item.fat_per_100g, index]);

    const gradeResult: FoodGradeResult | null = useMemo(() => calculateBaseFoodGrade(tempFoodForGrading), [tempFoodForGrading]);

    const renderFoodIcon = (foodName: string) => {
        const iconStatus = foodIcons[foodName];
        if (iconStatus === undefined) {
            return (
                <View style={[styles.foodIconContainer, styles.iconPlaceholder]}>
                    <ActivityIndicator size="small" color={theme.colors.grey3} />
                </View>
            );
        } else if (iconStatus) {
            return <Image source={{ uri: iconStatus }} style={styles.foodIconImage} resizeMode="contain" />;
        } else {
            return (
                <View style={[styles.foodIconContainer, styles.iconPlaceholder]}>
                    <Icon name="image-off-outline" type="material-community" size={18} color={theme.colors.grey3} />
                </View>
            );
        }
    };

    return (
        <Pressable
            onPress={() => !isEditingThisItem && onToggleItem(index)}
            disabled={(isAnyItemEditing && !isEditingThisItem) || isLoading}
        >
            <ListItem
                bottomDivider
                containerStyle={[
                    styles.quickAddItemContainer,
                    isEditingThisItem && styles.quickAddItemEditing,
                    isSelected && !isEditingThisItem && styles.quickAddItemSelected,
                    (isAnyItemEditing && !isEditingThisItem && styles.disabledItem),
                    isLoading && styles.disabledItem,
                ]}
            >
                {isEditingThisItem ? (
                    <View style={styles.quickAddEditView}>
                        <View style={styles.editIconAndNameRow}>
                            {renderFoodIcon(item.foodName)}
                            {gradeResult && (
                                <Text style={[styles.gradePill, { backgroundColor: gradeResult.color, marginLeft: 0, marginRight: 8 }]}>
                                    {gradeResult.letter}
                                </Text>
                            )}
                            <Input
                                value={editedName}
                                onChangeText={onNameChange}
                                placeholder={t('quickAddList.foodNamePlaceholder')}
                                inputContainerStyle={styles.quickEditInputContainer}
                                inputStyle={styles.quickEditInput}
                                containerStyle={styles.quickEditNameContainer}
                                autoFocus
                                selectTextOnFocus
                            />
                        </View>
                        <View style={styles.quickEditGramsRow}>
                            <Input
                                value={editedGrams}
                                onChangeText={onGramsChange}
                                placeholder={t('quickAddList.gramsPlaceholder')}
                                keyboardType="numeric"
                                inputContainerStyle={styles.quickEditInputContainer}
                                inputStyle={styles.quickEditInput}
                                containerStyle={styles.quickEditGramsContainer}
                                rightIcon={<Text style={styles.quickEditUnitText}>g</Text>}
                                errorMessage={!isValidNumberInput(editedGrams) && editedGrams !== "" ? t('quickAddList.errorInvalidGrams') : ""}
                                errorStyle={styles.inputError}
                            />
                            <TouchableOpacity onPress={onSaveEdit} style={styles.quickEditActionButton}>
                                <Icon name="checkmark-circle" type="ionicon" color={theme.colors.success} size={28} />
                            </TouchableOpacity>
                            <TouchableOpacity onPress={onCancelEdit} style={styles.quickEditActionButton}>
                                <Icon name="close-circle" type="ionicon" color={theme.colors.error} size={28} />
                            </TouchableOpacity>
                        </View>
                    </View>
                ) : (
                    <>
                        <CheckBox
                            checked={isSelected}
                            onPress={() => onToggleItem(index)}
                            containerStyle={styles.quickAddCheckbox}
                            checkedColor={theme.colors.primary}
                            disabled={isAnyItemEditing || isLoading}
                            size={22}
                        />
                        {renderFoodIcon(item.foodName)}
                        <ListItem.Content>
                            <View style={styles.titleAndGradeContainer}>
                                {gradeResult && (
                                    <Text style={[styles.gradePill, { backgroundColor: gradeResult.color }]}>
                                        {gradeResult.letter}
                                    </Text>
                                )}
                                <ListItem.Title style={styles.quickAddItemTitle} numberOfLines={1} ellipsizeMode="tail">
                                    {item.foodName}
                                </ListItem.Title>
                            </View>
                            <ListItem.Subtitle style={styles.quickAddItemSubtitle}>
                                {`Est: ${Math.round(item.estimatedWeightGrams)}g • ~${estimatedCalories} kcal`}
                            </ListItem.Subtitle>
                        </ListItem.Content>
                        {!isAnyItemEditing && !isLoading && (
                            <TouchableOpacity onPress={() => onEditItem(index)} style={styles.quickEditIconButton}>
                                <Icon name="pencil-outline" type="ionicon" size={22} color={theme.colors.grey1} />
                            </TouchableOpacity>
                        )}
                    </>
                )}
            </ListItem>
        </Pressable>
    );
};

// Styles are identical to the ones in QuickAddList.tsx, so they are copied here.
// In a larger project, you might centralize these styles or use a theming solution more extensively.
const useStyles = makeStyles((theme) => ({
    quickAddItemContainer: {
        paddingVertical: 8,
        paddingHorizontal: 8,
        backgroundColor: theme.colors.background,
        borderBottomColor: theme.colors.divider,
        flexDirection: "row",
        alignItems: "center",
        minHeight: 65,
    },
    quickAddItemSelected: {
        backgroundColor: theme.colors.successLight,
        borderLeftWidth: 4,
        borderLeftColor: theme.colors.success,
    },
    quickAddItemEditing: {
        backgroundColor: theme.colors.background,
        paddingVertical: 12,
        paddingHorizontal: 10,
        borderWidth: 1.5,
        borderColor: theme.colors.primary,
        borderRadius: 8,
        marginVertical: 6,
        marginHorizontal: 2,
        shadowColor: theme.colors.black,
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.15,
        shadowRadius: 2.5,
        elevation: 4,
    },
    disabledItem: {
        opacity: 0.6,
    },
    quickAddCheckbox: {
        padding: 0,
        margin: 0,
        marginRight: 10,
        marginLeft: 0,
        backgroundColor: "transparent",
        borderWidth: 0,
    },
    foodIconContainer: {
        width: 38,
        height: 38,
        marginRight: 10,
        borderRadius: 6,
        alignItems: 'center',
        justifyContent: 'center',
        overflow: 'hidden',
    },
    foodIconImage: {
        width: 38,
        height: 38,
        marginRight: 10,
        borderRadius: 6,
    },
    iconPlaceholder: {
        backgroundColor: theme.colors.grey5,
    },
    titleAndGradeContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 2,
    },
    gradePill: {
        fontSize: 11,
        fontWeight: 'bold',
        color: theme.colors.white,
        paddingHorizontal: 5,
        paddingVertical: 1,
        borderRadius: 6,
        marginRight: 6,
        minWidth: 18,
        textAlign: 'center',
        overflow: 'hidden',
    },
    quickAddItemTitle: {
        fontWeight: "600",
        color: theme.colors.text,
        fontSize: 15,
        textAlign: 'left',
        flexShrink: 1,
    },
    quickAddItemSubtitle: {
        color: theme.colors.secondary,
        fontSize: 12.5,
        textAlign: 'left',
    },
    quickEditIconButton: {
        paddingVertical: 8,
        paddingHorizontal: 10,
        marginLeft: 8,
    },
    quickAddEditView: {
        flex: 1,
    },
    editIconAndNameRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 8,
    },
    quickEditInputContainer: {
        borderBottomWidth: 1,
        borderBottomColor: theme.colors.primary,
        height: 38,
        paddingHorizontal: 0,
    },
    quickEditInput: {
        fontSize: 15,
        color: theme.colors.text,
        paddingVertical: 0,
        textAlign: 'left',
    },
    quickEditNameContainer: {
        flex: 1,
        paddingHorizontal: 0,
    },
    quickEditGramsRow: {
        flexDirection: "row",
        alignItems: "center",
        marginTop: 5,
    },
    quickEditGramsContainer: {
        flex: 1,
        paddingHorizontal: 0,
        marginRight: 10,
    },
    quickEditUnitText: {
        color: theme.colors.grey2,
        fontSize: 14,
        fontWeight: "500",
        paddingRight: 5
    },
    quickEditActionButton: {
        paddingHorizontal: 8,
        paddingVertical: 5,
    },
    inputError: {
        color: theme.colors.error,
        fontSize: 11,
        marginVertical: 0,
        marginLeft: 2,
        height: 14,
        textAlign: 'left'
    },
    // Add any other styles that were in QuickAddList.tsx and are specific to the item
}));

export default QuickAddItem;
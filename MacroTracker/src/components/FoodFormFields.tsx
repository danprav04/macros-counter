// src/components/FoodFormFields.tsx
import React from 'react';
import { View } from 'react-native';
import { Input, makeStyles, useTheme, Text } from '@rneui/themed';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Food } from '../types/food';
import { t } from '../localization/i18n';

// The form deals with data that doesn't include id or createdAt
type FoodFormData = Omit<Food, 'id' | 'createdAt'>;
type FoodFormValues = Partial<FoodFormData>;

interface FoodFormFieldsProps {
    values: FoodFormValues;
    errors: { [key: string]: string };
    onInputChange: (key: keyof FoodFormData, value: string, isEdit: boolean) => void;
    isEditing: boolean;
    disabled: boolean;
}

const FoodFormFields: React.FC<FoodFormFieldsProps> = ({
    values,
    errors,
    onInputChange,
    isEditing,
    disabled,
}) => {
    const { theme } = useTheme();
    const styles = useStyles();

    const getValue = (key: keyof FoodFormData): string => {
         const val = values[key];
         if (typeof val === 'number') {
              if (val === 0 && !isEditing) return "";
              return String(val);
         }
         return String(val ?? "");
    };

    const getErrorText = (fieldKey: keyof FoodFormData) => {
        const errorKey = errors[fieldKey];
        if (!errorKey) return "";
        if (fieldKey === 'name' && errorKey === 'Name is required') return t('foodFormFields.errorNameRequired');
        if (['calories', 'protein', 'carbs', 'fat'].includes(fieldKey) && errorKey === 'Must be a non-negative number') {
            return t('foodFormFields.errorNonNegative');
        }
        return errorKey;
    };

    return (
        <>
            {/* Food Name */}
            <View style={styles.fieldContainer}>
                <View style={styles.labelContainer}>
                    <MaterialCommunityIcons 
                        name="food-apple" 
                        size={20} 
                        color={theme.colors.grey3} 
                        style={styles.labelIcon}
                    />
                    <Text style={styles.label}>{t('foodFormFields.foodName')}</Text>
                </View>
                <Input
                    value={getValue("name")}
                    onChangeText={(text) => onInputChange("name", text, isEditing)}
                    errorMessage={getErrorText("name")}
                    errorStyle={styles.errorStyle}
                    inputContainerStyle={styles.inputContainerStyle}
                    inputStyle={styles.inputStyle}
                    containerStyle={styles.inputWrapper}
                    disabled={disabled}
                    autoCapitalize="words"
                    placeholder="Enter food name"
                    placeholderTextColor={theme.colors.grey3}
                />
            </View>

            {/* Calories */}
            <View style={styles.fieldContainer}>
                <View style={styles.labelContainer}>
                    <MaterialCommunityIcons 
                        name="fire" 
                        size={20} 
                        color={theme.colors.grey3} 
                        style={styles.labelIcon}
                    />
                    <Text style={styles.label}>{t('foodFormFields.calories')}</Text>
                </View>
                <Input
                    keyboardType="numeric" 
                    value={getValue("calories")}
                    onChangeText={(text) => onInputChange("calories", text, isEditing)}
                    errorMessage={getErrorText("calories")}
                    errorStyle={styles.errorStyle}
                    inputContainerStyle={styles.inputContainerStyle}
                    inputStyle={styles.inputStyle}
                    containerStyle={styles.inputWrapper}
                    disabled={disabled}
                    placeholder="0"
                    placeholderTextColor={theme.colors.grey3}
                />
            </View>

            {/* Protein */}
            <View style={styles.fieldContainer}>
                <View style={styles.labelContainer}>
                    <MaterialCommunityIcons 
                        name="food-drumstick" 
                        size={20} 
                        color={theme.colors.grey3} 
                        style={styles.labelIcon}
                    />
                    <Text style={styles.label}>{t('foodFormFields.protein')}</Text>
                </View>
                <Input
                    keyboardType="numeric" 
                    value={getValue("protein")}
                    onChangeText={(text) => onInputChange("protein", text, isEditing)}
                    errorMessage={getErrorText("protein")}
                    errorStyle={styles.errorStyle}
                    inputContainerStyle={styles.inputContainerStyle}
                    inputStyle={styles.inputStyle}
                    containerStyle={styles.inputWrapper}
                    disabled={disabled}
                    placeholder="0"
                    placeholderTextColor={theme.colors.grey3}
                />
            </View>

            {/* Carbs */}
            <View style={styles.fieldContainer}>
                <View style={styles.labelContainer}>
                    <MaterialCommunityIcons 
                        name="bread-slice" 
                        size={20} 
                        color={theme.colors.grey3} 
                        style={styles.labelIcon}
                    />
                    <Text style={styles.label}>{t('foodFormFields.carbs')}</Text>
                </View>
                <Input
                    keyboardType="numeric" 
                    value={getValue("carbs")}
                    onChangeText={(text) => onInputChange("carbs", text, isEditing)}
                    errorMessage={getErrorText("carbs")}
                    errorStyle={styles.errorStyle}
                    inputContainerStyle={styles.inputContainerStyle}
                    inputStyle={styles.inputStyle}
                    containerStyle={styles.inputWrapper}
                    disabled={disabled}
                    placeholder="0"
                    placeholderTextColor={theme.colors.grey3}
                />
            </View>

            {/* Fat */}
            <View style={styles.fieldContainer}>
                <View style={styles.labelContainer}>
                    <MaterialCommunityIcons 
                        name="oil" 
                        size={20} 
                        color={theme.colors.grey3} 
                        style={styles.labelIcon}
                    />
                    <Text style={styles.label}>{t('foodFormFields.fat')}</Text>
                </View>
                <Input
                    keyboardType="numeric" 
                    value={getValue("fat")}
                    onChangeText={(text) => onInputChange("fat", text, isEditing)}
                    errorMessage={getErrorText("fat")}
                    errorStyle={styles.errorStyle}
                    inputContainerStyle={styles.inputContainerStyle}
                    inputStyle={styles.inputStyle}
                    containerStyle={styles.inputWrapper}
                    disabled={disabled}
                    placeholder="0"
                    placeholderTextColor={theme.colors.grey3}
                />
            </View>
        </>
    );
};

const useStyles = makeStyles((theme) => ({
    fieldContainer: {
        marginBottom: 6,
    },
    labelContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 6,
    },
    labelIcon: {
        marginRight: 8,
    },
    label: {
        fontSize: 15,
        color: theme.colors.text,
        fontWeight: '500',
    },
    unitText: {
        fontSize: 13,
        color: theme.colors.grey3,
        marginLeft: 4,
    },
    inputWrapper: {
        paddingHorizontal: 0,
    },
    inputContainerStyle: {
        backgroundColor: theme.colors.card,
        borderWidth: 1,
        borderColor: theme.colors.divider,
        borderRadius: 10,
        paddingHorizontal: 14,
        paddingVertical: 8,
        height: 48,
    },
    inputStyle: {
        color: theme.colors.text,
        fontSize: 16,
        textAlign: 'left',
    },
    errorStyle: { 
        color: theme.colors.error, 
        textAlign: 'left',
        marginTop: 5,
        fontSize: 12,
    }
}));

export default FoodFormFields;
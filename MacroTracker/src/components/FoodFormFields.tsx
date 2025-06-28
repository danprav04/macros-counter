// src/components/FoodFormFields.tsx
import React from 'react';
import { Input, makeStyles, useTheme, Text } from '@rneui/themed'; // Add Text
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
        // Assuming error keys in en.json map to field names + specific error type
        // e.g., foodFormFields.errorNameRequired, foodFormFields.errorNonNegative
        // This might need adjustment based on how specific your error keys are.
        if (fieldKey === 'name' && errorKey === 'Name is required') return t('foodFormFields.errorNameRequired');
        if (['calories', 'protein', 'carbs', 'fat'].includes(fieldKey) && errorKey === 'Must be a non-negative number') {
            return t('foodFormFields.errorNonNegative');
        }
        return errorKey; // Fallback to the raw error key if no specific translation found
    };

    return (
        <>
            <Input
                label={<Text style={styles.labelStyle}>{t('foodFormFields.foodName')}</Text>}
                value={getValue("name")}
                onChangeText={(text) => onInputChange("name", text, isEditing)}
                errorMessage={getErrorText("name")}
                errorStyle={styles.errorStyle}
                inputContainerStyle={styles.inputContainerStyle}
                inputStyle={styles.inputStyle}
                leftIcon={<MaterialCommunityIcons name="food-apple" size={24} color={errors.name ? theme.colors.error : theme.colors.grey1} />}
                disabled={disabled}
                autoCapitalize="words"
            />
            <Input
                label={<Text style={styles.labelStyle}>{t('foodFormFields.calories')}</Text>}
                keyboardType="numeric" value={getValue("calories")}
                onChangeText={(text) => onInputChange("calories", text, isEditing)}
                errorMessage={getErrorText("calories")}
                errorStyle={styles.errorStyle}
                inputContainerStyle={styles.inputContainerStyle}
                inputStyle={styles.inputStyle}
                leftIcon={<MaterialCommunityIcons name="fire" size={24} color={errors.calories ? theme.colors.error : theme.colors.grey1} />}
                disabled={disabled}
            />
            <Input
                label={<Text style={styles.labelStyle}>{t('foodFormFields.protein')}</Text>}
                keyboardType="numeric" value={getValue("protein")}
                onChangeText={(text) => onInputChange("protein", text, isEditing)}
                errorMessage={getErrorText("protein")}
                errorStyle={styles.errorStyle}
                inputContainerStyle={styles.inputContainerStyle}
                inputStyle={styles.inputStyle}
                leftIcon={<MaterialCommunityIcons name="food-drumstick" size={24} color={errors.protein ? theme.colors.error : theme.colors.grey1} />}
                disabled={disabled}
            />
            <Input
                label={<Text style={styles.labelStyle}>{t('foodFormFields.carbs')}</Text>}
                keyboardType="numeric" value={getValue("carbs")}
                onChangeText={(text) => onInputChange("carbs", text, isEditing)}
                errorMessage={getErrorText("carbs")}
                errorStyle={styles.errorStyle}
                inputContainerStyle={styles.inputContainerStyle}
                inputStyle={styles.inputStyle}
                leftIcon={<MaterialCommunityIcons name="bread-slice" size={24} color={errors.carbs ? theme.colors.error : theme.colors.grey1} />}
                disabled={disabled}
            />
            <Input
                label={<Text style={styles.labelStyle}>{t('foodFormFields.fat')}</Text>}
                keyboardType="numeric" value={getValue("fat")}
                onChangeText={(text) => onInputChange("fat", text, isEditing)}
                errorMessage={getErrorText("fat")}
                errorStyle={styles.errorStyle}
                inputContainerStyle={styles.inputContainerStyle}
                inputStyle={styles.inputStyle}
                leftIcon={<MaterialCommunityIcons name="oil" size={24} color={errors.fat ? theme.colors.error : theme.colors.grey1} />}
                disabled={disabled}
            />
        </>
    );
};

const useStyles = makeStyles((theme) => ({
    labelStyle: { color: theme.colors.text, fontWeight: '500', marginBottom: 2, fontSize: 14, textAlign: 'left' },
    inputContainerStyle: { borderBottomWidth: 1, borderBottomColor: theme.colors.grey4, marginBottom: 5, paddingBottom: 2, },
    inputStyle: { color: theme.colors.text, marginLeft: 10, fontSize: 16, textAlign: 'left' },
    errorStyle: { color: theme.colors.error, textAlign: 'left' }
}));

export default FoodFormFields;
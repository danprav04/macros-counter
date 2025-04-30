import React from 'react';
import { Input, makeStyles, useTheme } from '@rneui/themed';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Food } from '../types/food';

// Define the shape of the values prop (can be partial for newFood)
type FoodFormValues = Partial<Omit<Food, 'id'>>;

interface FoodFormFieldsProps {
    values: FoodFormValues; // Use partial type
    errors: { [key: string]: string };
    onInputChange: (key: keyof Omit<Food, 'id'>, value: string, isEdit: boolean) => void;
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

    // Helper to get string value, handling initial undefined/0 for newFood
    const getValue = (key: keyof Omit<Food, 'id'>): string => {
         const val = values[key];
         if (typeof val === 'number') {
              // Show empty string for 0 when NOT editing (initial state)
              if (val === 0 && !isEditing) return "";
              return String(val);
         }
         return String(val ?? ""); // Default to empty string for name if null/undefined
    };

    return (
        <>
            {/* Food Name Input */}
            <Input
                label="Food Name" labelStyle={styles.inputLabel}
                value={getValue("name")}
                onChangeText={(text) => onInputChange("name", text, isEditing)}
                errorMessage={errors.name}
                inputContainerStyle={styles.inputContainerStyle}
                inputStyle={styles.inputStyle}
                leftIcon={<MaterialCommunityIcons name="food-apple" size={24} color={errors.name ? theme.colors.error : theme.colors.grey1} />}
                disabled={disabled}
                autoCapitalize="words"
            />
            {/* Macro Inputs */}
            <Input
                label="Calories (per 100g)" labelStyle={styles.inputLabel}
                keyboardType="numeric" value={getValue("calories")}
                onChangeText={(text) => onInputChange("calories", text, isEditing)}
                errorMessage={errors.calories} inputContainerStyle={styles.inputContainerStyle}
                inputStyle={styles.inputStyle}
                leftIcon={<MaterialCommunityIcons name="fire" size={24} color={errors.calories ? theme.colors.error : theme.colors.grey1} />}
                disabled={disabled}
            />
            <Input
                label="Protein (per 100g)" labelStyle={styles.inputLabel}
                keyboardType="numeric" value={getValue("protein")}
                onChangeText={(text) => onInputChange("protein", text, isEditing)}
                errorMessage={errors.protein} inputContainerStyle={styles.inputContainerStyle}
                inputStyle={styles.inputStyle}
                leftIcon={<MaterialCommunityIcons name="food-drumstick" size={24} color={errors.protein ? theme.colors.error : theme.colors.grey1} />}
                disabled={disabled}
            />
            <Input
                label="Carbs (per 100g)" labelStyle={styles.inputLabel}
                keyboardType="numeric" value={getValue("carbs")}
                onChangeText={(text) => onInputChange("carbs", text, isEditing)}
                errorMessage={errors.carbs} inputContainerStyle={styles.inputContainerStyle}
                inputStyle={styles.inputStyle}
                leftIcon={<MaterialCommunityIcons name="bread-slice" size={24} color={errors.carbs ? theme.colors.error : theme.colors.grey1} />}
                disabled={disabled}
            />
            <Input
                label="Fat (per 100g)" labelStyle={styles.inputLabel}
                keyboardType="numeric" value={getValue("fat")}
                onChangeText={(text) => onInputChange("fat", text, isEditing)}
                errorMessage={errors.fat} inputContainerStyle={styles.inputContainerStyle}
                inputStyle={styles.inputStyle}
                leftIcon={<MaterialCommunityIcons name="oil" size={24} color={errors.fat ? theme.colors.error : theme.colors.grey1} />}
                disabled={disabled}
            />
        </>
    );
};

// Reusing styles from AddFoodModal for consistency
const useStyles = makeStyles((theme) => ({
    inputLabel: { color: theme.colors.text, fontWeight: '500', marginBottom: 2, fontSize: 14 },
    inputContainerStyle: { borderBottomWidth: 1, borderBottomColor: theme.colors.grey4, marginBottom: 5, paddingBottom: 2, },
    inputStyle: { color: theme.colors.text, marginLeft: 10, fontSize: 16, },
}));

export default FoodFormFields;
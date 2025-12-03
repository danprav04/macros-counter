// src/components/DailyGoalsInput.tsx
import React from "react";
import { View } from "react-native";
import { Input, Text, useTheme, makeStyles, Icon } from "@rneui/themed";
import { MacroType } from "../types/settings";
import { t } from '../localization/i18n';

interface DailyGoalsInputProps {
    dailyGoals: { [key in MacroType]: number };
    onGoalChange: (goalType: MacroType, value: string) => void;
}

const DailyGoalsInput: React.FC<DailyGoalsInputProps> = ({
  dailyGoals,
  onGoalChange,
}) => {
  const { theme } = useTheme();
  const styles = useStyles();

  const getMacroDetails = (macro: MacroType) => {
    switch(macro) {
        case 'calories': return { label: t('dailyGoalsInput.caloriesGoal'), icon: 'fire', color: theme.colors.primary, unit: 'kcal' };
        case 'protein': return { label: t('dailyGoalsInput.proteinGoal'), icon: 'food-drumstick', color: theme.colors.success, unit: 'g' };
        case 'carbs': return { label: t('dailyGoalsInput.carbsGoal'), icon: 'bread-slice', color: theme.colors.warning, unit: 'g' };
        case 'fat': return { label: t('dailyGoalsInput.fatGoal'), icon: 'oil', color: theme.colors.error, unit: 'g' };
        default: return { label: macro, icon: 'help', color: theme.colors.grey3, unit: '' };
    }
  }

  const renderInput = (macro: MacroType) => {
      const { label, icon, color, unit } = getMacroDetails(macro);
      return (
        <View style={styles.inputWrapper} key={macro}>
            <Input
                label={
                    <View style={styles.labelContainer}>
                        <Icon name={icon} type="material-community" size={16} color={color} style={styles.icon} />
                        <Text style={[styles.labelText, { color: theme.colors.secondary }]}>{label}</Text>
                    </View>
                }
                keyboardType="numeric"
                value={dailyGoals?.[macro]?.toString() || ""}
                onChangeText={(value) => onGoalChange(macro, value)}
                inputStyle={[styles.inputField, { color: theme.colors.text }]}
                inputContainerStyle={[styles.inputContainer, { backgroundColor: theme.colors.card }]}
                containerStyle={styles.containerStyle}
                rightIcon={<Text style={styles.unitText}>{unit}</Text>}
                placeholder="0"
                placeholderTextColor={theme.colors.grey3}
            />
        </View>
      );
  }

  return (
    <View style={styles.gridContainer}>
        <View style={styles.row}>
            {renderInput('calories')}
            {renderInput('protein')}
        </View>
        <View style={styles.row}>
            {renderInput('carbs')}
            {renderInput('fat')}
        </View>
    </View>
  );
};

const useStyles = makeStyles((theme) => ({
    gridContainer: {
        paddingVertical: 5,
    },
    row: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: 0, 
    },
    inputWrapper: {
        flex: 1,
    },
    containerStyle: {
        paddingHorizontal: 6,
        height: 78,
    },
    labelContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 6,
        marginLeft: 2,
    },
    icon: {
        marginRight: 6,
    },
    labelText: {
        fontSize: 13,
        fontWeight: '600',
    },
    inputContainer: {
        borderWidth: 1,
        borderColor: theme.colors.divider,
        borderRadius: 10,
        paddingHorizontal: 10,
        height: 45,
        borderBottomWidth: 1, // Ensure border on all sides for the box look
    },
    inputField: {
        fontSize: 15,
        textAlign: 'left',
    },
    unitText: {
        color: theme.colors.grey3,
        fontSize: 12,
        fontWeight: '500',
    }
}));

export default DailyGoalsInput;
// src/components/DailyGoalsInput.tsx
// components/DailyGoalsInput.tsx
import React from "react";
import { Input, Text } from "@rneui/themed";
import { MacroType } from "../types/settings";
import { useTheme, makeStyles } from "@rneui/themed"; // Import makeStyles
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
  const styles = useStyles(); // Use styles

  const getLabel = (macro: MacroType) => {
    switch(macro) {
        case 'calories': return t('dailyGoalsInput.caloriesGoal');
        case 'protein': return t('dailyGoalsInput.proteinGoal');
        case 'carbs': return t('dailyGoalsInput.carbsGoal');
        case 'fat': return t('dailyGoalsInput.fatGoal');
        default: return macro;
    }
  }

  return (
    <>
      {(["calories", "protein", "carbs", "fat"] as MacroType[]).map((macro) => (
        <Input
          key={macro}
          label={<Text style={[styles.labelStyle, { color: theme.colors.text }]}>{getLabel(macro)}</Text>}
          keyboardType="numeric"
          value={dailyGoals?.[macro]?.toString() || ""}
          onChangeText={(value) => onGoalChange(macro, value)}
          style={[styles.inputStyle, { color: theme.colors.text }]} // Apply inputStyle
          inputContainerStyle={{ borderBottomColor: theme.colors.text }}
        />
      ))}
    </>
  );
};

// Add useStyles
const useStyles = makeStyles((theme) => ({
    labelStyle: {
        color: theme.colors.text,
        fontWeight: 'normal', // RNEUI default is bold, make it normal if needed
        textAlign: 'left',
    },
    inputStyle: {
        textAlign: 'left',
    },
}));

export default DailyGoalsInput;
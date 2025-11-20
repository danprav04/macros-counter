// src/components/DailyGoalsInput.tsx
import React from "react";
import { View } from "react-native";
import { Input, Text } from "@rneui/themed";
import { MacroType } from "../types/settings";
import { useTheme, makeStyles } from "@rneui/themed";
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

  const getLabel = (macro: MacroType) => {
    switch(macro) {
        case 'calories': return t('dailyGoalsInput.caloriesGoal');
        case 'protein': return t('dailyGoalsInput.proteinGoal');
        case 'carbs': return t('dailyGoalsInput.carbsGoal');
        case 'fat': return t('dailyGoalsInput.fatGoal');
        default: return macro;
    }
  }

  // Ensure we return a View instead of a Fragment to avoid issues with key handling 
  // when rendered inside other Views in some React Native versions/layouts.
  return (
    <View>
      {(["calories", "protein", "carbs", "fat"] as MacroType[]).map((macro) => (
        <Input
          key={macro}
          label={<Text style={[styles.labelStyle, { color: theme.colors.text }]}>{getLabel(macro)}</Text>}
          keyboardType="numeric"
          value={dailyGoals?.[macro]?.toString() || ""}
          onChangeText={(value) => onGoalChange(macro, value)}
          style={[styles.inputStyle, { color: theme.colors.text }]}
          inputContainerStyle={{ borderBottomColor: theme.colors.text }}
        />
      ))}
    </View>
  );
};

const useStyles = makeStyles((theme) => ({
    labelStyle: {
        color: theme.colors.text,
        fontWeight: 'normal',
        textAlign: 'left',
    },
    inputStyle: {
        textAlign: 'left',
    },
}));

export default DailyGoalsInput;
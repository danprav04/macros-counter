// components/DailyGoalsInput.tsx
import React from "react";
import { Input } from "@rneui/themed";
import { MacroType } from "../types/settings";
import { useTheme } from "@rneui/themed";


interface DailyGoalsInputProps {
  dailyGoals: { [key in MacroType]: number };
  onGoalChange: (goalType: MacroType, value: string) => void;
}

const DailyGoalsInput: React.FC<DailyGoalsInputProps> = ({
  dailyGoals,
  onGoalChange,
}) => {

    const { theme } = useTheme();

  return (
    <>
      {["calories", "protein", "carbs", "fat"].map((macro) => (
        <Input
          key={macro}
          label={`${macro.charAt(0).toUpperCase() + macro.slice(1)} Goal`}
          keyboardType="numeric"
          value={dailyGoals?.[macro as MacroType]?.toString() || ""}
          onChangeText={(value) => onGoalChange(macro as MacroType, value)}
          style={{ color: theme.colors.text }}
          inputContainerStyle={{ borderBottomColor: theme.colors.text }}
          labelStyle={{ color: theme.colors.text }}
        />
      ))}
    </>
  );
};

export default DailyGoalsInput;
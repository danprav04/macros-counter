// src/components/DailyProgress.tsx
// components/DailyProgress.tsx
import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Text, useTheme, makeStyles } from '@rneui/themed'; // Import makeStyles
import { t } from '../localization/i18n';

interface DailyProgressProps {
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  goals: {
    calories?: number;
    protein?: number;
    carbs?: number;
    fat?: number;
  };
}

const DailyProgress: React.FC<DailyProgressProps> = ({
  calories,
  protein,
  carbs,
  fat,
  goals,
}) => {
  const { theme } = useTheme();
  const styles = useStyles(); // Use styles

  const calculateProgress = (current: number, goal?: number) => {
    if (!goal || goal <= 0) return 0;
    return Math.min(current / goal, 1);
  };

  const renderProgressBar = (labelKey: 'calories' | 'protein' | 'carbs' | 'fat', current: number, goal: number | undefined, color: string) => {
      const progress = calculateProgress(current, goal);
      const labelText = t(`dailyProgress.${labelKey}`);
      return (
          <View style={styles.macroContainer} key={labelKey}>
              <View style={styles.labelContainer}>
                    <Text style={[styles.macroLabel, {color: theme.colors.text}]}>{labelText}:</Text>
                    <Text style={[styles.macroValue, {color: theme.colors.text}]}>
                        {`${Math.round(current)} / ${goal || 0}`}
                    </Text>
              </View>
              <View style={styles.progressBarContainer}>
                  <View style={[styles.progressBar, { width: `${progress * 100}%`, backgroundColor: color }]} />
              </View>
          </View>
      )
  }

  return (
    <View style={styles.container}>
        {renderProgressBar('calories', calories, goals.calories, theme.colors.primary)}
        {renderProgressBar('protein', protein, goals.protein, theme.colors.success)}
        {renderProgressBar('carbs', carbs, goals.carbs, theme.colors.warning)}
        {renderProgressBar('fat', fat, goals.fat, theme.colors.error)}
    </View>
  );
};

// Update useStyles for text alignment
const useStyles = makeStyles((theme) => ({
  container: {
    marginBottom: 20,
    padding: 10,
    borderRadius: 8,
  },
  macroContainer: {
    marginBottom: 10,
  },
  labelContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 5,
  },
  macroLabel: {
    fontWeight: 'bold',
    textAlign: 'left',
  },
  macroValue: {
    textAlign: 'right',
  },
  progressBarContainer: {
      backgroundColor: theme.colors.grey5,
      borderRadius: 5,
      height: 10
  },
  progressBar: {
    height: 10,
    borderRadius: 5,
  },
}));

export default DailyProgress;
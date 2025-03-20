// components/DailyProgress.tsx
import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Text, useTheme } from '@rneui/themed';

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

const DailyProgress: React.FC<DailyProgressProps> = ({ calories, protein, carbs, fat, goals }) => {
  const { theme } = useTheme();

  const calorieProgress = goals.calories ? Math.min(calories / goals.calories, 1) : 0;
  const proteinProgress = goals.protein ? Math.min(protein / goals.protein, 1) : 0;
  const carbsProgress = goals.carbs ? Math.min(carbs / goals.carbs, 1) : 0;
  const fatProgress = goals.fat ? Math.min(fat / goals.fat, 1) : 0;

  return (
    <View style={styles.container}>
      <View style={styles.macroContainer}>
        <Text style={styles.macroLabel}>Calories: {Math.round(calories)} / {goals.calories || 0}</Text>
        <View style={[styles.progressBar, { width: `${calorieProgress * 100}%`, backgroundColor: theme.colors.primary }]} />
      </View>
      <View style={styles.macroContainer}>
        <Text style={styles.macroLabel}>Protein: {Math.round(protein)}g / {goals.protein || 0}g</Text>
        <View style={[styles.progressBar, { width: `${proteinProgress * 100}%`, backgroundColor: 'green' }]} />
      </View>
      <View style={styles.macroContainer}>
        <Text style={styles.macroLabel}>Carbs: {Math.round(carbs)}g / {goals.carbs || 0}g</Text>
        <View style={[styles.progressBar, { width: `${carbsProgress * 100}%`, backgroundColor: 'orange' }]} />
      </View>
      <View style={styles.macroContainer}>
        <Text style={styles.macroLabel}>Fat: {Math.round(fat)}g / {goals.fat || 0}g</Text>
        <View style={[styles.progressBar, { width: `${fatProgress * 100}%`, backgroundColor: 'blue' }]} />
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginBottom: 20,
  },
  macroContainer: {
    marginBottom: 10,
  },
  macroLabel: {
    marginBottom: 5,
  },
  progressBar: {
    height: 10,
    borderRadius: 5,
  },
});

export default DailyProgress;
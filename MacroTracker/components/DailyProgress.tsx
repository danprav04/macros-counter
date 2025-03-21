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

const DailyProgress: React.FC<DailyProgressProps> = ({
  calories,
  protein,
  carbs,
  fat,
  goals,
}) => {
  const { theme } = useTheme();

  const calculateProgress = (current: number, goal?: number) => {
    if (!goal || goal <= 0) return 0; // Avoid division by zero and handle undefined goals
    return Math.min(current / goal, 1); // Cap at 100%
  };

  const renderProgressBar = (label: string, current: number, goal: number | undefined, color: string) => {
      const progress = calculateProgress(current, goal);
      return (
          <View style={styles.macroContainer} key={label}>
              <View style={styles.labelContainer}>
                    <Text style={[styles.macroLabel, {color: theme.colors.text}]}>{label}:</Text>
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
        {renderProgressBar('Calories', calories, goals.calories, theme.colors.primary)}
        {renderProgressBar('Protein', protein, goals.protein, 'green')}
        {renderProgressBar('Carbs', carbs, goals.carbs, 'orange')}
        {renderProgressBar('Fat', fat, goals.fat, 'blue')}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginBottom: 20,
    padding: 10,
    borderRadius: 8, // Rounded corners for the container
    //backgroundColor: '#f0f0f0', // Light background for contrast Removed for theme consistency
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
  },
  macroValue: {},
  progressBarContainer: {
      backgroundColor: '#e0e0e0', //Light grey for track
      borderRadius: 5,
      height: 10
  },
  progressBar: {
    height: 10,
    borderRadius: 5,
  },
});

export default DailyProgress;
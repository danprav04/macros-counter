// __tests__/components/DailyProgress.test.tsx
import React from 'react';
import { render, screen } from '@testing-library/react-native';
import DailyProgress from '../../src/components/DailyProgress';
import { ThemeProvider, createTheme } from '@rneui/themed';

const theme = createTheme({
  lightColors: {
    primary: '#2e86de',
    success: '#28a745',
    warning: '#ffc107',
    error: '#dc3545',
    text: '#000',
    grey5: '#eee',
  },
});

const mockGoals = {
  calories: 2000,
  protein: 150,
  carbs: 250,
  fat: 70,
};

const renderWithTheme = (component: React.ReactElement) => {
  return render(<ThemeProvider theme={theme}>{component}</ThemeProvider>);
};

describe('<DailyProgress />', () => {
  it('renders all macro progress bars', () => {
    renderWithTheme(
      <DailyProgress calories={0} protein={0} carbs={0} fat={0} goals={mockGoals} />
    );
    expect(screen.getByText('Calories:')).toBeTruthy();
    expect(screen.getByText('Protein:')).toBeTruthy();
    expect(screen.getByText('Carbs:')).toBeTruthy();
    expect(screen.getByText('Fat:')).toBeTruthy();
  });

  it('displays the correct current and goal values', () => {
    renderWithTheme(
      <DailyProgress calories={500} protein={75} carbs={125} fat={35} goals={mockGoals} />
    );
    expect(screen.getByText('500 / 2000')).toBeTruthy();
    expect(screen.getByText('75 / 150')).toBeTruthy();
    expect(screen.getByText('125 / 250')).toBeTruthy();
    expect(screen.getByText('35 / 70')).toBeTruthy();
  });

  it('calculates and applies the correct progress bar width', () => {
    const { rerender } = renderWithTheme(
      <DailyProgress calories={1000} protein={0} carbs={0} fat={0} goals={mockGoals} />
    );

    // Calories progress bar is the first one, its style contains the width
    const progressBarContainers = screen.getAllByTestId('progress-bar-container'); // Assuming you add a testID
    // This is a more abstract way to test style without depending on implementation details
    // but for this example, we'll check the style directly if possible
    // Note: Checking style directly can be brittle. In a real app, prefer visual regression.
    
    // Test 50% progress
    let calorieProgressBar = progressBarContainers[0].children[0] as React.ReactElement;
    expect(calorieProgressBar.props.style).toEqual(expect.arrayContaining([expect.objectContaining({ width: '50%' })]));

    // Test 100% progress
    rerender(
      <DailyProgress calories={2000} protein={0} carbs={0} fat={0} goals={mockGoals} />
    );
    calorieProgressBar = screen.getAllByTestId('progress-bar-container')[0].children[0] as React.ReactElement;
    expect(calorieProgressBar.props.style).toEqual(expect.arrayContaining([expect.objectContaining({ width: '100%' })]));
    
    // Test over 100% progress (should cap at 100%)
    rerender(
      <DailyProgress calories={3000} protein={0} carbs={0} fat={0} goals={mockGoals} />
    );
    calorieProgressBar = screen.getAllByTestId('progress-bar-container')[0].children[0] as React.ReactElement;
    expect(calorieProgressBar.props.style).toEqual(expect.arrayContaining([expect.objectContaining({ width: '100%' })]));
  });

  it('handles zero or missing goals gracefully', () => {
     renderWithTheme(
      <DailyProgress calories={500} protein={75} carbs={125} fat={35} goals={{ calories: 0, protein: undefined }} />
    );
    
    expect(screen.getByText('500 / 0')).toBeTruthy();
    expect(screen.getByText('75 / 0')).toBeTruthy();
    
    // Check that progress bars are at 0% width
    const progressBarContainers = screen.getAllByTestId('progress-bar-container');
    const calorieProgressBar = progressBarContainers[0].children[0] as React.ReactElement;
    const proteinProgressBar = progressBarContainers[1].children[0] as React.ReactElement;

    expect(calorieProgressBar.props.style).toEqual(expect.arrayContaining([expect.objectContaining({ width: '0%' })]));
    expect(proteinProgressBar.props.style).toEqual(expect.arrayContaining([expect.objectContaining({ width: '0%' })]));
  });
});

// To make this fully testable, you might need to add a `testID` to the progress bar container, e.g.:
// In DailyProgress.tsx:
// <View testID="progress-bar-container" style={styles.progressBarContainer}>
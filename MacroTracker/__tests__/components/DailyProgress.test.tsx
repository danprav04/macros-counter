// __tests__/components/DailyProgress.test.tsx
import React from 'react';
import { render, screen } from '@testing-library/react-native';
import { ThemeProvider, createTheme } from '@rneui/themed';
import DailyProgress from '../../src/components/DailyProgress';

// A minimal theme is provided to satisfy the useTheme hook during tests.
const theme = createTheme({
  lightColors: {
    primary: '#2e86de',
    success: '#28a745',
    warning: '#ffc107',
    error: '#dc3545',
    grey5: '#e9ecef',
    text: '#212529',
  },
});

describe('<DailyProgress />', () => {
  const mockGoals = {
    calories: 2000,
    protein: 150,
    carbs: 250,
    fat: 70,
  };

  // Helper function to render the component with the theme provider
  const renderComponent = (props: any) => {
    return render(
      <ThemeProvider theme={theme}>
        <DailyProgress {...props} />
      </ThemeProvider>
    );
  };

  it('calculates and applies the correct progress bar width', () => {
    const { rerender } = renderComponent({
      calories: 1000, protein: 75, carbs: 125, fat: 35, goals: mockGoals
    });

    // Test 50% progress
    const progressBars = screen.getAllByTestId('progress-bar-container');
    expect(progressBars[0].children[0]).toHaveStyle({ width: '50%' });
    expect(progressBars[1].children[0]).toHaveStyle({ width: '50%' });
    expect(progressBars[2].children[0]).toHaveStyle({ width: '50%' });
    expect(progressBars[3].children[0]).toHaveStyle({ width: '50%' });

    // Test 100% progress by rerendering with new props
    rerender(
      <ThemeProvider theme={theme}>
        <DailyProgress calories={2000} protein={150} carbs={250} fat={70} goals={mockGoals} />
      </ThemeProvider>
    );
    const fullProgressBars = screen.getAllByTestId('progress-bar-container');
    expect(fullProgressBars[0].children[0]).toHaveStyle({ width: '100%' });

    // Test over 100% progress (should be capped at 100%)
     rerender(
      <ThemeProvider theme={theme}>
        <DailyProgress calories={3000} protein={200} carbs={300} fat={100} goals={mockGoals} />
      </ThemeProvider>
    );
    const overProgressBars = screen.getAllByTestId('progress-bar-container');
    expect(overProgressBars[0].children[0]).toHaveStyle({ width: '100%' });
  });

  it('handles zero or undefined goals gracefully without crashing', () => {
    renderComponent({
      calories: 1000, protein: 75,
      goals: { calories: 0, protein: undefined, carbs: 250, fat: 70 }
    });
    const progressBars = screen.getAllByTestId('progress-bar-container');
    expect(progressBars[0].children[0]).toHaveStyle({ width: '0%' }); // Calories goal is 0
    expect(progressBars[1].children[0]).toHaveStyle({ width: '0%' }); // Protein goal is undefined
  });
});
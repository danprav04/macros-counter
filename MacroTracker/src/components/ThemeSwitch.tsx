// components/ThemeSwitch.tsx (Corrected)
import React from "react";
import { ListItem, Switch } from "@rneui/themed";
import { useTheme } from "@rneui/themed";

interface ThemeSwitchProps {
  currentTheme: 'light' | 'dark' | 'system'; // Use theme string
  onToggle: (theme: 'light' | 'dark' | 'system') => void; // Pass the theme string
}

const ThemeSwitch: React.FC<ThemeSwitchProps> = ({ currentTheme, onToggle }) => {
  const { theme } = useTheme();

  return (
    <ListItem
      bottomDivider
      containerStyle={{ backgroundColor: theme.colors.background }}
    >
      <ListItem.Content>
        <ListItem.Title style={{ color: theme.colors.text }}>
          Dark Mode
        </ListItem.Title>
      </ListItem.Content>
      <Switch
        value={currentTheme === 'dark'} // Correctly reflect theme
        onValueChange={(newValue) => {
          onToggle(newValue ? 'dark' : 'light'); // Toggle between 'light' and 'dark'
        }}
      />
    </ListItem>
  );
};

export default ThemeSwitch;
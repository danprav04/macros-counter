// components/ThemeSwitch.tsx
import React from "react";
import { ListItem, Switch } from "@rneui/themed";
import { useTheme } from "@rneui/themed";

interface ThemeSwitchProps {
  isDarkMode: boolean;
  onToggle: () => void;
}

const ThemeSwitch: React.FC<ThemeSwitchProps> = ({ isDarkMode, onToggle }) => {

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
      <Switch value={isDarkMode} onValueChange={onToggle} />
    </ListItem>
  );
};

export default ThemeSwitch;
// src/components/ThemeSwitch.tsx
import React from "react";
import { ListItem, Switch, useTheme } from "@rneui/themed";
import { t } from '../localization/i18n';

interface ThemeSwitchProps {
  currentTheme: 'light' | 'dark' | 'system';
  onToggle: (theme: 'light' | 'dark' | 'system') => void;
}

const ThemeSwitch: React.FC<ThemeSwitchProps> = ({ currentTheme, onToggle }) => {
  const { theme } = useTheme();

  return (
    <ListItem
      bottomDivider
      containerStyle={{ backgroundColor: theme.colors.background }}
    >
      <ListItem.Content key="content">
        <ListItem.Title style={{ color: theme.colors.text, textAlign: 'left' }}>
          {t('themeSwitch.darkMode')}
        </ListItem.Title>
      </ListItem.Content>
      <Switch
        key="switch"
        value={currentTheme === 'dark'}
        onValueChange={(newValue) => {
          onToggle(newValue ? 'dark' : 'light');
        }}
      />
    </ListItem>
  );
};

export default ThemeSwitch;
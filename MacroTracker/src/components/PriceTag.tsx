// src/components/PriceTag.tsx
import React from 'react';
import { View, StyleSheet, ViewStyle } from 'react-native';
import { Text, Icon, useTheme, makeStyles } from '@rneui/themed';

interface PriceTagProps {
  amount: number;
  type: 'cost' | 'reward';
  style?: ViewStyle;
  size?: 'default' | 'small';
}

const PriceTag: React.FC<PriceTagProps> = ({ amount, type, style, size = 'default' }) => {
  const { theme } = useTheme();
  const styles = useStyles();
  const isCost = type === 'cost';
  const isSmall = size === 'small';

  return (
    <View style={[
        styles.container, 
        { 
            paddingHorizontal: isSmall ? 5 : 6,
            paddingVertical: isSmall ? 2 : 3,
            backgroundColor: isCost ? theme.colors.grey5 : theme.colors.successLight 
        },
        style
    ]}>
      <Icon
        name="database"
        type="material-community"
        size={isSmall ? 12 : 14}
        color={isCost ? theme.colors.secondary : theme.colors.success}
      />
      <Text style={[
          styles.text,
          {
              fontSize: isSmall ? 11 : 12,
              color: isCost ? theme.colors.secondary : theme.colors.success,
              marginLeft: isSmall ? 3 : 4,
          }
      ]}>
        {isCost ? `-${amount}` : `+${amount}`}
      </Text>
    </View>
  );
};

const useStyles = makeStyles((theme) => ({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 10,
  },
  text: {
    fontWeight: 'bold',
  },
}));

export default PriceTag;
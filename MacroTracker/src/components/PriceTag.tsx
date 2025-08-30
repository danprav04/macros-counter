// src/components/PriceTag.tsx
import React from 'react';
import { View, StyleSheet, ViewStyle } from 'react-native';
import { Text, Icon, useTheme } from '@rneui/themed';

interface PriceTagProps {
  amount: number;
  type: 'cost' | 'reward';
  style?: ViewStyle;
  size?: 'default' | 'small';
}

const PriceTag: React.FC<PriceTagProps> = ({ amount, type, style, size = 'default' }) => {
  const { theme } = useTheme();
  const isCost = type === 'cost';
  const isSmall = size === 'small';

  const styles = StyleSheet.create({
    container: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: isSmall ? 5 : 6,
      paddingVertical: isSmall ? 2 : 3,
      borderRadius: 10,
      backgroundColor: isCost ? theme.colors.grey5 : theme.colors.successLight,
      ...style,
    },
    text: {
      fontWeight: 'bold',
      fontSize: isSmall ? 11 : 12,
      color: isCost ? theme.colors.secondary : theme.colors.success,
      marginLeft: isSmall ? 3 : 4,
    },
  });

  return (
    <View style={styles.container}>
      <Icon
        name="database"
        type="material-community"
        size={isSmall ? 12 : 14}
        color={isCost ? theme.colors.secondary : theme.colors.success}
      />
      <Text style={styles.text}>
        {isCost ? `-${amount}` : `+${amount}`}
      </Text>
    </View>
  );
};

export default PriceTag;
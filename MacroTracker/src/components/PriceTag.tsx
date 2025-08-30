// src/components/PriceTag.tsx
import React from 'react';
import { View, StyleSheet, ViewStyle } from 'react-native';
import { Text, Icon, useTheme } from '@rneui/themed';

interface PriceTagProps {
  amount: number;
  type: 'cost' | 'reward';
  containerStyle?: ViewStyle;
}

const PriceTag: React.FC<PriceTagProps> = ({ amount, type, containerStyle }) => {
  const { theme } = useTheme();
  const isCost = type === 'cost';

  const styles = StyleSheet.create({
    container: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: 6,
      paddingVertical: 3,
      borderRadius: 10,
      backgroundColor: isCost ? theme.colors.grey5 : theme.colors.successLight,
      ...containerStyle,
    },
    text: {
      fontWeight: 'bold',
      fontSize: 12,
      color: isCost ? theme.colors.secondary : theme.colors.success,
      marginLeft: 4,
    },
  });

  return (
    <View style={styles.container}>
      <Icon
        name="database"
        type="material-community"
        size={14}
        color={isCost ? theme.colors.secondary : theme.colors.success}
      />
      <Text style={styles.text}>
        {isCost ? `-${amount}` : `+${amount}`}
      </Text>
    </View>
  );
};

export default PriceTag;
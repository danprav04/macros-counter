import React from 'react';
import { View } from 'react-native';
import Toast, { BaseToast, ErrorToast } from 'react-native-toast-message';
import { useTheme, Icon } from '@rneui/themed';

export const CustomToast = () => {
  const { theme } = useTheme();

  const toastConfig = {
    success: (props: any) => (
      <BaseToast
        {...props}
        style={{ borderLeftColor: theme.colors.success, backgroundColor: theme.colors.card, borderRadius: 10, shadowColor: '#000', elevation: 5 }}
        contentContainerStyle={{ paddingHorizontal: 15 }}
        text1Style={{
          fontSize: 16,
          fontWeight: 'bold',
          color: theme.colors.text
        }}
        text2Style={{
          fontSize: 14,
          color: theme.colors.grey3
        }}
        renderLeadingIcon={() => <Icon name="checkmark-circle" type="ionicon" color={theme.colors.success} size={28} containerStyle={{ justifyContent: 'center', marginLeft: 15 }} />}
      />
    ),
    error: (props: any) => (
      <ErrorToast
        {...props}
        style={{ borderLeftColor: theme.colors.error, backgroundColor: theme.colors.card, borderRadius: 10, shadowColor: '#000', elevation: 5 }}
        contentContainerStyle={{ paddingHorizontal: 15 }}
        text1Style={{
          fontSize: 16,
          fontWeight: 'bold',
          color: theme.colors.text
        }}
        text2Style={{
          fontSize: 14,
          color: theme.colors.grey3
        }}
        renderLeadingIcon={() => <Icon name="alert-circle" type="ionicon" color={theme.colors.error} size={28} containerStyle={{ justifyContent: 'center', marginLeft: 15 }} />}
      />
    ),
    info: (props: any) => (
      <BaseToast
        {...props}
        style={{ borderLeftColor: theme.colors.primary, backgroundColor: theme.colors.card, borderRadius: 10, shadowColor: '#000', elevation: 5 }}
        contentContainerStyle={{ paddingHorizontal: 15 }}
        text1Style={{
          fontSize: 16,
          fontWeight: 'bold',
          color: theme.colors.text
        }}
        text2Style={{
          fontSize: 14,
          color: theme.colors.grey3
        }}
        renderLeadingIcon={() => <Icon name="information-circle" type="ionicon" color={theme.colors.primary} size={28} containerStyle={{ justifyContent: 'center', marginLeft: 15 }} />}
      />
    )
  };

  return (
    <View style={{ zIndex: 9999, elevation: 9999 }} pointerEvents="box-none">
      <Toast config={toastConfig} bottomOffset={80} topOffset={60} position="bottom" visibilityTime={3000} autoHide={true} keyboardOffset={10} />
    </View>
  );
};

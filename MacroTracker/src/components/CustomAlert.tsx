import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, Modal, TouchableWithoutFeedback, DeviceEventEmitter } from 'react-native';
import { useTheme, Button } from '@rneui/themed';

export interface AlertButton {
  text?: string;
  onPress?: () => void;
  style?: 'default' | 'cancel' | 'destructive';
}

export interface AlertOptions {
  cancelable?: boolean;
  onDismiss?: () => void;
}

interface AlertParams {
  title?: string;
  message?: string;
  buttons?: AlertButton[];
  options?: AlertOptions;
}

const SHOW_ALERT_EVENT = 'SHOW_CUSTOM_ALERT';
const HIDE_ALERT_EVENT = 'HIDE_CUSTOM_ALERT';

export const Alert = {
  alert: (title?: string, message?: string, buttons?: AlertButton[], options?: AlertOptions) => {
    DeviceEventEmitter.emit(SHOW_ALERT_EVENT, { title, message, buttons, options });
  }
};

export const CustomAlertComponent = () => {
  const [isVisible, setIsVisible] = useState(false);
  const [alertData, setAlertData] = useState<AlertParams | null>(null);
  const { theme } = useTheme();

  useEffect(() => {
    const showSubscription = DeviceEventEmitter.addListener(SHOW_ALERT_EVENT, (data: AlertParams) => {
      setAlertData(data);
      setIsVisible(true);
    });

    const hideSubscription = DeviceEventEmitter.addListener(HIDE_ALERT_EVENT, () => {
      setIsVisible(false);
      setAlertData(null);
    });

    return () => {
      showSubscription.remove();
      hideSubscription.remove();
    };
  }, []);

  if (!alertData) return null;

  const { title, message, buttons, options } = alertData;

  const handleCancel = () => {
    if (options?.cancelable !== false) {
      options?.onDismiss?.();
      setIsVisible(false);
    }
  };
  
  const handleButtonPress = (button: AlertButton) => {
    setIsVisible(false);
    if (button.onPress) {
      setTimeout(() => button.onPress!(), 100);
    }
  };

  const alertButtons = buttons && buttons.length > 0 ? buttons : [{ text: 'OK', onPress: () => {} }];

  return (
    <Modal
      visible={isVisible}
      transparent
      animationType="fade"
      onRequestClose={handleCancel}
    >
      <TouchableWithoutFeedback onPress={handleCancel}>
        <View style={styles.backdrop}>
          <TouchableWithoutFeedback>
            <View style={[styles.dialog, { backgroundColor: theme.colors.card }]}>
              {!!title && <Text style={[styles.title, { color: theme.colors.text }]}>{title}</Text>}
              {!!message && <Text style={[styles.message, { color: theme.colors.text }]}>{message}</Text>}
              
              <View style={styles.buttonContainer}>
                {alertButtons.map((btn, index) => {
                  let titleStyle: any = { color: theme.colors.primary };
                  
                  if (btn.style === 'cancel') {
                    titleStyle = { color: theme.colors.grey3, fontWeight: 'normal' };
                  } else if (btn.style === 'destructive') {
                    titleStyle = { color: theme.colors.error };
                  } else {
                    titleStyle = { color: theme.colors.primary, fontWeight: 'bold' };
                  }

                  return (
                    <Button
                      key={index}
                      title={btn.text || 'OK'}
                      type="clear"
                      titleStyle={[styles.buttonTitle, titleStyle]}
                      containerStyle={styles.buttonWrapper}
                      onPress={() => handleButtonPress(btn)}
                    />
                  );
                })}
              </View>
            </View>
          </TouchableWithoutFeedback>
        </View>
      </TouchableWithoutFeedback>
    </Modal>
  );
};

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  dialog: {
    width: '85%',
    borderRadius: 12,
    paddingTop: 24,
    paddingHorizontal: 20,
    paddingBottom: 8,
    elevation: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 10,
  },
  message: {
    fontSize: 16,
    marginBottom: 24,
    lineHeight: 22,
  },
  buttonContainer: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    flexWrap: 'wrap',
    marginTop: 10,
  },
  buttonWrapper: {
    marginLeft: 8,
    marginBottom: 8,
  },
  buttonTitle: {
    fontSize: 16,
    letterSpacing: 0.5,
  },
});

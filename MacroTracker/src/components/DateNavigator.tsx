// src/components/DateNavigator.tsx
import React from 'react';
import { View, TouchableOpacity, StyleSheet } from 'react-native';
import { Button, Text, Icon as RNEIcon, useTheme, makeStyles } from '@rneui/themed';
import { parseISO, isValid } from 'date-fns';
import { formatDateReadableAsync } from '../utils/dateUtils'; // Import async version
import { t } from '../localization/i18n';
import i18n from '../localization/i18n';

interface DateNavigatorProps {
    selectedDate: string;
    onPreviousDay: () => void;
    onNextDay: () => void;
    onShowDatePicker: () => void;
    isSaving: boolean;
    isLoadingData: boolean;
}

const DateNavigator: React.FC<DateNavigatorProps> = ({
    selectedDate,
    onPreviousDay,
    onNextDay,
    onShowDatePicker,
    isSaving,
    isLoadingData,
}) => {
    const { theme } = useTheme();
    const styles = useStyles();
    const [displayDate, setDisplayDate] = React.useState<string>(t('dateNavigator.invalidDate'));

    React.useEffect(() => {
        const updateDisplayDate = async () => {
            const parsedDate = parseISO(selectedDate);
            if (isValid(parsedDate)) {
                const formatted = await formatDateReadableAsync(parsedDate);
                setDisplayDate(formatted);
            } else {
                setDisplayDate(t('dateNavigator.invalidDate'));
            }
        };
        updateDisplayDate();
    }, [selectedDate, i18n.locale]); // Re-run when selectedDate or locale changes

    const isDisabled = isSaving || isLoadingData;

    return (
        <View style={styles.dateNavigation}>
            <Button
                type="clear"
                onPress={onPreviousDay}
                icon={<RNEIcon name="chevron-back-outline" type="ionicon" color={theme.colors.primary} size={28} />}
                buttonStyle={styles.navButton}
                disabled={isDisabled}
                disabledStyle={styles.disabledButton}
            />
            <TouchableOpacity onPress={onShowDatePicker} disabled={isDisabled} accessibilityState={{ disabled: isDisabled }}>
                <Text h4 h4Style={[styles.dateText, isDisabled && styles.disabledText]}>
                    {displayDate}
                </Text>
            </TouchableOpacity>
            <Button
                type="clear"
                onPress={onNextDay}
                icon={<RNEIcon name="chevron-forward-outline" type="ionicon" color={theme.colors.primary} size={28} />}
                buttonStyle={styles.navButton}
                disabled={isDisabled}
                disabledStyle={styles.disabledButton}
            />
        </View>
    );
};

const useStyles = makeStyles((theme) => ({
    dateNavigation: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingVertical: 10,
        paddingHorizontal: 10,
        backgroundColor: theme.colors.background,
    },
    navButton: {
        paddingHorizontal: 8,
    },
    dateText: {
        fontSize: 18,
        fontWeight: 'bold',
        color: theme.colors.text,
        textAlign: 'center',
        paddingVertical: 5,
    },
    disabledButton: {
        opacity: 0.5,
    },
    disabledText: {
        color: theme.colors.grey3,
    },
}));

export default DateNavigator;
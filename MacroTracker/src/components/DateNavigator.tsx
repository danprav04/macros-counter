import React from 'react';
import { View, TouchableOpacity, StyleSheet } from 'react-native';
import { Button, Text, Icon as RNEIcon, useTheme, makeStyles } from '@rneui/themed';
import { parseISO, isValid } from 'date-fns';
import { formatDateReadable } from '../utils/dateUtils'; // Ensure correct path

interface DateNavigatorProps {
    selectedDate: string; // ISO String 'YYYY-MM-DD'
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

    const parsedDate = parseISO(selectedDate);
    const displayDate = isValid(parsedDate) ? formatDateReadable(parsedDate) : 'Invalid Date';
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
            <TouchableOpacity onPress={onShowDatePicker} disabled={isDisabled}>
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
        // Optional: add subtle shadow or border if needed
        // borderBottomWidth: StyleSheet.hairlineWidth,
        // borderBottomColor: theme.colors.divider,
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
        // backgroundColor: 'transparent', // Keep background transparent
        opacity: 0.5, // Reduce opacity for visual feedback
    },
    disabledText: {
        color: theme.colors.grey3, // Use a grey color for disabled text
    },
}));

export default DateNavigator;
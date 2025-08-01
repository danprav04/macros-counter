// src/components/AccountSettings.tsx
import React from 'react';
import { View, ActivityIndicator } from 'react-native';
import { Text, makeStyles, Button, Icon, ListItem, useTheme } from '@rneui/themed';
import { t } from '../localization/i18n';

interface AccountSettingsProps {
    userCoins: number | null;
    isLoadingCoins: boolean;
    isAddingCoins: boolean;
    onAddTestCoins: () => void;
}

const AccountSettings: React.FC<AccountSettingsProps> = ({
    userCoins,
    isLoadingCoins,
    isAddingCoins,
    onAddTestCoins,
}) => {
    const { theme } = useTheme();
    const styles = useStyles();

    return (
        <View>
            <ListItem bottomDivider containerStyle={styles.listItem}>
                <Icon name="database" type="material-community" color={theme.colors.warning} />
                <ListItem.Content>
                    <ListItem.Title style={styles.listItemTitle}>{t('accountSettings.coinBalance')}</ListItem.Title>
                </ListItem.Content>
                {isLoadingCoins ? (
                    <ActivityIndicator size="small" color={theme.colors.primary} />
                ) : (
                    <Text style={styles.coinValue}>{userCoins !== null ? userCoins : t('accountSettings.notApplicable')}</Text>
                )}
            </ListItem>

            {/* This button and its warning are only available in development builds */}
            {__DEV__ && (
                <>
                    <Button
                        title={t('accountSettings.addTestCoins')}
                        onPress={onAddTestCoins}
                        buttonStyle={[styles.button, { backgroundColor: theme.colors.success, marginTop: 10 }]}
                        disabled={isAddingCoins || isLoadingCoins}
                        icon={isAddingCoins ? <ActivityIndicator color="white" /> : <Icon name="plus-circle-outline" type="material-community" color="white" size={20} style={{ marginRight: 8 }} />}
                    />
                    <Text style={styles.testButtonWarning}>
                        {t('accountSettings.testButtonWarning')}
                    </Text>
                </>
            )}
        </View>
    );
};

const useStyles = makeStyles((theme) => ({
    listItem: {
        backgroundColor: theme.colors.background,
        paddingVertical: 15,
    },
    listItemTitle: {
        color: theme.colors.text,
        fontWeight: '500',
        textAlign: 'left',
    },
    coinValue: {
        color: theme.colors.primary,
        fontWeight: 'bold',
        fontSize: 16,
    },
    button: {
        marginBottom: 10,
        borderRadius: 8,
    },
    testButtonWarning: {
        fontSize: 12,
        color: theme.colors.grey3,
        fontStyle: 'italic',
        textAlign: 'center',
        marginTop: 0,
        marginBottom: 15,
        marginHorizontal: 10,
    },
}));

export default AccountSettings;
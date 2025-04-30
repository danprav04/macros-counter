import React from 'react';
import { View, ActivityIndicator } from 'react-native';
import { Text, makeStyles, Button, Icon, ListItem, useTheme } from '@rneui/themed';

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
                    <ListItem.Title style={styles.listItemTitle}>Coin Balance</ListItem.Title>
                </ListItem.Content>
                {isLoadingCoins ? (
                    <ActivityIndicator size="small" color={theme.colors.primary} />
                ) : (
                    <Text style={styles.coinValue}>{userCoins !== null ? userCoins : 'N/A'}</Text>
                )}
            </ListItem>

            {/* REMOVE OR PROTECT THIS BUTTON IN PRODUCTION */}
            <Button
                title="Add 10 Coins (Test)"
                onPress={onAddTestCoins}
                buttonStyle={[styles.button, { backgroundColor: theme.colors.success, marginTop: 10 }]}
                icon={<Icon name="plus-circle-outline" type="material-community" color="white" size={20} style={{ marginRight: 8 }} />}
                loading={isAddingCoins}
                disabled={isAddingCoins || isLoadingCoins}
            />
            <Text style={styles.testButtonWarning}>
                Note: The "Add Coins" button is for testing/development only and should be removed or secured for production releases.
            </Text>
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
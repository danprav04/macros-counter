// src/components/AccountSettings.tsx
import React from 'react';
import { View, ActivityIndicator } from 'react-native';
import { Text, makeStyles, Button, Icon, ListItem, useTheme } from '@rneui/themed';
import { t } from '../localization/i18n';
import { User } from '../types/user';
import UserBadge from './UserBadge';

interface AccountSettingsProps {
    user: User | null;
    isLoading: boolean;
    isAddingCoins: boolean;
    onAddTestCoins: () => void;
}

const AccountSettings: React.FC<AccountSettingsProps> = ({
    user,
    isLoading,
    isAddingCoins,
    onAddTestCoins,
}) => {
    const { theme } = useTheme();
    const styles = useStyles();

    return (
        <View>
            <ListItem bottomDivider containerStyle={styles.listItem}>
                <Icon name="email-outline" type="material-community" color={theme.colors.secondary} />
                <ListItem.Content>
                    <ListItem.Title style={styles.listItemTitle}>{t('accountSettings.email')}</ListItem.Title>
                </ListItem.Content>
                {isLoading ? (
                    <ActivityIndicator size="small" color={theme.colors.primary} />
                ) : (
                    <Text style={styles.valueText}>{user?.email || t('accountSettings.notApplicable')}</Text>
                )}
            </ListItem>

            <ListItem bottomDivider containerStyle={styles.listItem}>
                <Icon name="database" type="material-community" color={theme.colors.warning} />
                <ListItem.Content>
                    <ListItem.Title style={styles.listItemTitle}>{t('accountSettings.coinBalance')}</ListItem.Title>
                </ListItem.Content>
                {isLoading ? (
                    <ActivityIndicator size="small" color={theme.colors.primary} />
                ) : (
                    <Text style={[styles.valueText, styles.coinValue]}>{user?.coins ?? t('accountSettings.notApplicable')}</Text>
                )}
            </ListItem>

            {user?.badges && user.badges.length > 0 && (
                 <ListItem bottomDivider containerStyle={styles.listItem}>
                    <Icon name="shield-star-outline" type="material-community" color={theme.colors.success} />
                    <ListItem.Content>
                        <ListItem.Title style={styles.listItemTitle}>{t('accountSettings.badges')}</ListItem.Title>
                    </ListItem.Content>
                     <View style={styles.badgesContainer}>
                         {user.badges.map(badge => <UserBadge key={badge.id} badge={badge} />)}
                     </View>
                 </ListItem>
            )}

            {__DEV__ && (
                <>
                    <Button
                        title={t('accountSettings.addTestCoins')}
                        onPress={onAddTestCoins}
                        buttonStyle={[styles.button, { backgroundColor: theme.colors.success, marginTop: 10 }]}
                        disabled={isAddingCoins || isLoading}
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
    valueText: {
        color: theme.colors.text,
        fontSize: 14,
    },
    coinValue: {
        color: theme.colors.primary,
        fontWeight: 'bold',
        fontSize: 16,
    },
    badgesContainer: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        justifyContent: 'flex-end',
        flex: 1,
        marginLeft: 10,
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
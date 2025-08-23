// src/components/AccountSettings.tsx
import React, { useState, useEffect } from 'react';
import { View, ActivityIndicator, TouchableOpacity } from 'react-native';
import { Text, makeStyles, Icon, ListItem, useTheme, Button } from '@rneui/themed';
import { t } from '../localization/i18n';
import { User } from '../types/user';
import UserBadge from './UserBadge';

interface AccountSettingsProps {
    user: User | null;
    isLoading: boolean;
    isAdLoading: boolean;
    onWatchAd: () => void;
    onResendVerification: () => void;
}

const AccountSettings: React.FC<AccountSettingsProps> = ({
    user,
    isLoading,
    isAdLoading,
    onWatchAd,
    onResendVerification,
}) => {
    const { theme } = useTheme();
    const styles = useStyles();
    const [cooldown, setCooldown] = useState(0);

    useEffect(() => {
        let interval: NodeJS.Timeout | undefined = undefined;
        if (user && !user.is_verified && user.verification_email_sent_at) {
            const sentAt = new Date(user.verification_email_sent_at).getTime();
            const COOLDOWN_SECONDS = 60; // This should ideally come from a shared config
            const now = Date.now();
            const diffSeconds = Math.round((now - sentAt) / 1000);
            const remaining = COOLDOWN_SECONDS - diffSeconds;

            if (remaining > 0) {
                setCooldown(remaining);
                interval = setInterval(() => {
                    setCooldown(prev => {
                        if (prev <= 1) {
                            if (interval) clearInterval(interval);
                            return 0;
                        }
                        return prev - 1;
                    });
                }, 1000);
            } else {
                setCooldown(0);
            }
        }
        return () => {
            if (interval) {
                clearInterval(interval);
            }
        };
    }, [user]);


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

            {!user?.is_verified && (
                <ListItem bottomDivider containerStyle={[styles.listItem, styles.warningItem]}>
                    <Icon name="email-alert-outline" type="material-community" color={theme.colors.warning} />
                    <ListItem.Content>
                        <ListItem.Title style={[styles.listItemTitle, {color: theme.colors.warning}]}>Account Verification</ListItem.Title>
                        <ListItem.Subtitle style={styles.listItemSubtitle}>Your account is not verified.</ListItem.Subtitle>
                    </ListItem.Content>
                    <Button
                        title={cooldown > 0 ? `Resend in ${cooldown}s` : 'Resend Email'}
                        onPress={onResendVerification}
                        disabled={cooldown > 0 || isLoading}
                        type="outline"
                        buttonStyle={{borderColor: theme.colors.warning}}
                        titleStyle={{color: theme.colors.warning, fontSize: 14}}
                    />
                </ListItem>
            )}

            <ListItem bottomDivider containerStyle={styles.listItem}>
                <Icon name="database" type="material-community" color={theme.colors.primary} />
                <ListItem.Content>
                    <ListItem.Title style={styles.listItemTitle}>{t('accountSettings.coinBalance')}</ListItem.Title>
                </ListItem.Content>
                {isLoading ? (
                    <ActivityIndicator size="small" color={theme.colors.primary} />
                ) : (
                    <View style={styles.coinContainer}>
                        <Text style={[styles.valueText, styles.coinValue]}>{user?.coins ?? t('accountSettings.notApplicable')}</Text>
                        <TouchableOpacity onPress={onWatchAd} disabled={isAdLoading} style={styles.adButton}>
                            {isAdLoading ? (
                                <ActivityIndicator size="small" color={theme.colors.primary} />
                            ) : (
                                <Icon name="movie-play-outline" type="material-community" color={theme.colors.primary} size={26} />
                            )}
                        </TouchableOpacity>
                    </View>
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
        </View>
    );
};

const useStyles = makeStyles((theme) => ({
    listItem: {
        backgroundColor: theme.colors.background,
        paddingVertical: 15,
    },
    warningItem: {
        backgroundColor: theme.mode === 'light' ? '#fffbeb' : '#2c1d02',
    },
    listItemTitle: {
        color: theme.colors.text,
        fontWeight: '500',
        textAlign: 'left',
    },
    listItemSubtitle: {
        color: theme.colors.grey2,
        fontSize: 12,
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
    coinContainer: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    adButton: {
        marginLeft: 15,
        padding: 5,
    },
    badgesContainer: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        justifyContent: 'flex-end',
        flex: 1,
        marginLeft: 10,
    },
}));

export default AccountSettings;
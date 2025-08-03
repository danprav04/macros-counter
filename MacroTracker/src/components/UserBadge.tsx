// src/components/UserBadge.tsx
import React from 'react';
import { View } from 'react-native';
import { Text, Icon, useTheme, makeStyles } from '@rneui/themed';
import { Badge } from '../types/user';
import { t } from '../localization/i18n';

interface UserBadgeProps {
  badge: Badge;
}

const UserBadge: React.FC<UserBadgeProps> = ({ badge }) => {
  const styles = useStyles();
  const { theme } = useTheme();

  const getIconName = (icon?: string) => {
    switch (icon) {
      case 'science':
        return 'flask-outline';
      default:
        return 'shield-star-outline';
    }
  };
  
  const getBadgeDisplayName = (name: string) => {
    // Simple mapping for display purposes. Can be moved to i18n later.
    return name.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
  }

  return (
    <View style={styles.badgeContainer}>
      <Icon name={getIconName(badge.icon)} type="material-community" size={16} color={theme.colors.primary} />
      <Text style={styles.badgeText}>{getBadgeDisplayName(badge.name)}</Text>
    </View>
  );
};

const useStyles = makeStyles((theme) => ({
  badgeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.primaryLight,
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 12,
    marginRight: 6,
    marginBottom: 6,
  },
  badgeText: {
    color: theme.colors.primary,
    fontWeight: '600',
    fontSize: 12,
    marginLeft: 5,
  },
}));

export default UserBadge;
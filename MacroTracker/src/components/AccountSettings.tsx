// src/components/AccountSettings.tsx
import React, { useState, useEffect, useCallback, useMemo } from "react";
import { View, ActivityIndicator, TouchableOpacity } from "react-native";
import {
  Text,
  makeStyles,
  Icon,
  ListItem,
  useTheme,
  Button,
} from "@rneui/themed";
import { t } from "../localization/i18n";
import { User } from "../types/user";
import UserBadge from "./UserBadge";
import { useCosts } from "../context/CostsContext";
import PriceTag from "./PriceTag";

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
  const { costs } = useCosts();

  useEffect(() => {
    let interval: NodeJS.Timeout | undefined = undefined;
    if (user && !user.is_verified && user.verification_email_sent_at) {
      const sentAt = new Date(user.verification_email_sent_at).getTime();
      const COOLDOWN_SECONDS = 60;
      const now = Date.now();
      const diffSeconds = Math.round((now - sentAt) / 1000);
      const remaining = COOLDOWN_SECONDS - diffSeconds;

      if (remaining > 0) {
        setCooldown(remaining);
        interval = setInterval(() => {
          setCooldown((prev) => {
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
      if (interval) clearInterval(interval);
    };
  }, [user]);

  const calculateRewardForStreak = useCallback(
    (streak: number) => {
      if (!costs) return 0;
      let reward: number;
      if (costs.ad_streak_formula === "exponential") {
        reward =
          costs.ad_streak_start_reward *
          costs.ad_streak_exponential_base ** streak;
      } else {
        // default to linear
        reward =
          costs.ad_streak_start_reward + costs.ad_streak_linear_step * streak;
      }
      return Math.min(Math.round(reward), costs.ad_streak_max_reward);
    },
    [costs]
  );

  const adsPerDayCap = costs?.ad_streak_ads_per_day ?? 10;

  const currentStreak = user?.ad_streak_count ?? 0;
  const adsWatchedToday = user?.ads_watched_today ?? 0;

  const rewardNow = calculateRewardForStreak(currentStreak);

  const futureRewards = useMemo(() => {
    if (!costs || !user) return [];

    // Explicitly type the array as number[]
    const rewards: number[] = [];

    const maxFutureAdsToShow = 3; // Calculate a reasonable number of future rewards
    const adsLeftToday = Math.max(0, adsPerDayCap - adsWatchedToday);

    for (let i = 1; i <= maxFutureAdsToShow; i++) {
      // The streak only increases for ads watched today within the daily cap.
      // After the cap is hit, the reward for subsequent ads (hypothetically) would be the same.
      const effectiveStreakIncrease = Math.min(i, adsLeftToday);
      const futureStreak = currentStreak + effectiveStreakIncrease;
      const futureReward = calculateRewardForStreak(futureStreak);

      if (rewards.at(-1) === futureReward) continue;

      // We know the array contains numbers because this function returns a number
      rewards.push(futureReward);
    }
    return rewards;
  }, [
    user,
    costs,
    adsPerDayCap,
    currentStreak,
    adsWatchedToday,
    calculateRewardForStreak,
  ]);

  return (
    <View>
      <ListItem bottomDivider containerStyle={styles.listItem}>
        <Icon
          name="email-outline"
          type="material-community"
          color={theme.colors.secondary}
        />
        <ListItem.Content>
          <ListItem.Title style={styles.listItemTitle}>
            {t("accountSettings.email")}
          </ListItem.Title>
        </ListItem.Content>
        {isLoading ? (
          <ActivityIndicator size="small" color={theme.colors.primary} />
        ) : (
          <Text style={styles.valueText}>
            {user?.email || t("accountSettings.notApplicable")}
          </Text>
        )}
      </ListItem>

      {!user?.is_verified && (
        <ListItem
          bottomDivider
          containerStyle={[styles.listItem, styles.warningItem]}
        >
          <Icon
            name="email-alert-outline"
            type="material-community"
            color={theme.colors.warning}
          />
          <ListItem.Content>
            <ListItem.Title
              style={[styles.listItemTitle, { color: theme.colors.warning }]}
            >
              {t("accountSettings.verificationTitle")}
            </ListItem.Title>
            <ListItem.Subtitle style={styles.listItemSubtitle}>
              {t("accountSettings.verificationMessage")}
            </ListItem.Subtitle>
          </ListItem.Content>
          <Button
            title={
              cooldown > 0
                ? t("accountSettings.resendInSeconds", { cooldown })
                : t("accountSettings.resendEmailButton")
            }
            onPress={onResendVerification}
            disabled={cooldown > 0 || isLoading}
            type="outline"
            buttonStyle={{ borderColor: theme.colors.warning }}
            titleStyle={{ color: theme.colors.warning, fontSize: 14 }}
          />
        </ListItem>
      )}

      <ListItem bottomDivider containerStyle={styles.listItem}>
        <Icon
          name="database"
          type="material-community"
          color={theme.colors.primary}
        />
        <ListItem.Content>
          <ListItem.Title style={styles.listItemTitle}>
            {t("accountSettings.coinBalance")}
          </ListItem.Title>
        </ListItem.Content>
        {isLoading ? (
          <ActivityIndicator size="small" color={theme.colors.primary} />
        ) : (
          <View style={styles.coinContainer}>
            <Text style={[styles.valueText, styles.coinValue]}>
              {user?.coins ?? t("accountSettings.notApplicable")}
            </Text>
            <TouchableOpacity
              onPress={onWatchAd}
              disabled={isAdLoading}
              style={styles.adButton}
            >
              {isAdLoading ? (
                <ActivityIndicator size="small" color={theme.colors.primary} />
              ) : (
                <View style={styles.adButtonContent}>
                  <Icon
                    name="movie-play-outline"
                    type="material-community"
                    color={theme.colors.primary}
                    size={26}
                  />
                  <PriceTag
                    amount={rewardNow}
                    type="reward"
                    style={{ marginLeft: 8 }}
                  />
                </View>
              )}
            </TouchableOpacity>
          </View>
        )}
      </ListItem>

      {user && costs && (
        <ListItem
          bottomDivider
          containerStyle={
            currentStreak > 0 ? styles.streakItem : styles.streakItemZero
          }
        >
          <Icon
            name="fire"
            type="material-community"
            color={currentStreak > 0 ? "#FF9800" : theme.colors.grey3}
          />
          <ListItem.Content>
            <ListItem.Title
              style={
                currentStreak > 0 ? styles.streakTitle : styles.streakTitleZero
              }
            >
              {t("accountSettings.streakTitle")}
            </ListItem.Title>
            <ListItem.Subtitle
              style={
                currentStreak > 0
                  ? styles.streakSubtitle
                  : styles.streakSubtitleZero
              }
            >
              {t("accountSettings.streakSubtitle", {
                cap: adsPerDayCap,
                watched: adsWatchedToday,
              })}
            </ListItem.Subtitle>
            <View style={styles.futureRewardsContainer}>
              <Text style={styles.futureRewardsTitle}>
                {t("accountSettings.nextRewards")}
              </Text>
              {futureRewards.map((reward, index) => (
                <PriceTag
                  key={index}
                  amount={reward}
                  type="reward"
                  size="small"
                />
              ))}
            </View>
          </ListItem.Content>
          <Text
            style={
              currentStreak > 0 ? styles.streakValue : styles.streakValueZero
            }
          >
            {currentStreak}
          </Text>
        </ListItem>
      )}

      {user?.badges && user.badges.length > 0 && (
        <ListItem bottomDivider containerStyle={styles.listItem}>
          <Icon
            name="shield-star-outline"
            type="material-community"
            color={theme.colors.success}
          />
          <ListItem.Content>
            <ListItem.Title style={styles.listItemTitle}>
              {t("accountSettings.badges")}
            </ListItem.Title>
          </ListItem.Content>
          <View style={styles.badgesContainer}>
            {user.badges.map((badge) => (
              <UserBadge key={badge.id} badge={badge} />
            ))}
          </View>
        </ListItem>
      )}
    </View>
  );
};

const useStyles = makeStyles((theme) => ({
  listItem: { backgroundColor: theme.colors.background, paddingVertical: 15 },
  warningItem: {
    backgroundColor: theme.mode === "light" ? "#fffbeb" : "#2c1d02",
  },
  listItemTitle: {
    color: theme.colors.text,
    fontWeight: "500",
    textAlign: "left",
  },
  listItemSubtitle: {
    color: theme.colors.secondary,
    fontSize: 12,
    textAlign: "left",
  },
  valueText: { color: theme.colors.text, fontSize: 14 },
  coinValue: { color: theme.colors.primary, fontWeight: "bold", fontSize: 16 },
  coinContainer: { flexDirection: "row", alignItems: "center" },
  adButton: { marginLeft: 15, padding: 5 },
  adButtonContent: { flexDirection: "row", alignItems: "center" },
  badgesContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "flex-end",
    flex: 1,
    marginLeft: 10,
  },
  streakItem: {
    backgroundColor: theme.mode === "light" ? "#fff3e0" : "#3e2723",
    paddingVertical: 15,
  },
  streakTitle: { color: "#FF9800", fontWeight: "bold", textAlign: "left" },
  streakSubtitle: {
    color: theme.mode === "light" ? "#e65100" : "#ffcc80",
    fontSize: 12,
    textAlign: "left",
  },
  streakValue: { color: "#FF9800", fontSize: 24, fontWeight: "bold" },
  streakItemZero: { backgroundColor: theme.colors.grey5, paddingVertical: 15 },
  streakTitleZero: {
    color: theme.colors.grey3,
    fontWeight: "bold",
    textAlign: "left",
  },
  streakSubtitleZero: {
    color: theme.colors.grey3,
    fontSize: 12,
    textAlign: "left",
  },
  streakValueZero: {
    color: theme.colors.grey3,
    fontSize: 24,
    fontWeight: "bold",
  },
  futureRewardsContainer: {
    flexDirection: "row",
    alignItems: "center",
    flexWrap: "wrap",
    marginTop: 8,
    gap: 6,
  },
  futureRewardsTitle: {
    color: theme.mode === "light" ? theme.colors.grey3 : theme.colors.secondary,
    fontSize: 12,
    fontWeight: "600",
    marginRight: 4,
  },
}));

export default AccountSettings;

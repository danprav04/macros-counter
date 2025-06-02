// src/components/DailyEntryListItem.tsx
import React, {
  useState,
  useEffect,
  useCallback,
  memo,
  useMemo,
  useRef,
} from "react";
import {
  View,
  Image,
  ActivityIndicator,
  StyleSheet,
  Animated,
  Easing,
  Platform,
  Text as NativeText, // Renamed to avoid conflict
} from "react-native";
import {
  ListItem,
  Button,
  Icon as RNEIcon,
  useTheme,
  makeStyles,
  Text,
} from "@rneui/themed";
import { DailyEntryItem } from "../types/dailyEntry";
import { t } from "../localization/i18n";
import {
  calculateDailyEntryGrade,
  FoodGradeResult,
} from "../utils/gradingUtils";
import { Settings } from "../types/settings";

interface DailyEntryListItemProps {
  item: DailyEntryItem;
  reversedIndex: number;
  foodIcons: { [foodName: string]: string | null | undefined };
  setFoodIcons: React.Dispatch<
    React.SetStateAction<{ [foodName: string]: string | null | undefined }>
  >;
  onEdit: (item: DailyEntryItem, reversedIndex: number) => void;
  onRemove: (reversedIndex: number) => void;
  isSaving: boolean;
  dailyGoals: Settings["dailyGoals"];
}

const DailyEntryListItem = memo<DailyEntryListItemProps>(
  ({
    item,
    reversedIndex,
    foodIcons,
    setFoodIcons,
    onEdit,
    onRemove,
    isSaving,
    dailyGoals,
  }) => {
    const { theme } = useTheme();
    const styles = useStyles();
    const [iconLoadError, setIconLoadError] = useState(false);

    const [textWidth, setTextWidth] = useState(0);
    const [containerWidth, setContainerWidth] = useState(0);
    const animatedValue = useRef(new Animated.Value(0)).current;
    const animationRef = useRef<Animated.CompositeAnimation | null>(null);
    const shouldAnimate = textWidth > containerWidth && containerWidth > 0;

    const iconStatus = item?.food?.name ? foodIcons[item.food.name] : undefined;
    const isLoadingIcon = iconStatus === undefined;

    const gradeResult: FoodGradeResult | null = useMemo(() => {
      if (!item || !item.food || !dailyGoals) return null;
      return calculateDailyEntryGrade(item.food, item.grams, dailyGoals);
    }, [item, dailyGoals]);

    useEffect(() => {
      // Reset animation and re-evaluate when item or its name changes
      if (shouldAnimate) {
        if (animationRef.current) {
          animationRef.current.stop();
        }
        animatedValue.setValue(0);
        animationRef.current = Animated.loop(
          Animated.sequence([
            Animated.delay(1200), // Initial delay
            Animated.timing(animatedValue, {
              toValue: 1,
              duration: ((textWidth + containerWidth) / 35) * 1000, // Speed: 35px/sec
              easing: Easing.linear,
              useNativeDriver: Platform.OS !== "web",
            }),
            Animated.delay(1200), // Pause at end
          ])
        );
        animationRef.current.start();
      } else {
        if (animationRef.current) {
          animationRef.current.stop();
          animationRef.current = null;
        }
        animatedValue.setValue(0);
      }

      return () => {
        if (animationRef.current) {
          animationRef.current.stop();
        }
      };
    }, [shouldAnimate, textWidth, containerWidth, animatedValue, item?.food?.name]); // Added item.food.name

    const translateX = animatedValue.interpolate({
      inputRange: [0, 1],
      outputRange: [0, -(textWidth - containerWidth + (textWidth > containerWidth ? 20 : 0) )],
    });


    const handleImageError = useCallback(() => {
      console.warn(
        `Image component failed to load icon for ${item.food.name}: ${iconStatus}`
      );
      setIconLoadError(true);
      if (item?.food?.name && foodIcons[item.food.name] !== null) {
        setFoodIcons((prev) => ({ ...prev, [item.food.name]: null }));
      }
    }, [item.food.name, iconStatus, foodIcons, setFoodIcons]);

    useEffect(() => {
      setIconLoadError(false);
    }, [iconStatus]);

    const renderListItemIcon = () => {
      if (!item?.food) {
        return (
          <View style={[styles.foodIcon, styles.iconPlaceholder]}>
            <RNEIcon
              name="help-circle-outline"
              type="ionicon"
              size={20}
              color={theme.colors.grey3}
            />
          </View>
        );
      }
      if (isLoadingIcon) {
        return (
          <View style={[styles.foodIcon, styles.iconPlaceholder]}>
            <ActivityIndicator size="small" color={theme.colors.grey3} />
          </View>
        );
      } else if (iconStatus && !iconLoadError) {
        return (
          <Image
            source={{ uri: iconStatus }}
            style={styles.foodIconImage}
            onError={handleImageError}
            resizeMode="contain"
          />
        );
      } else {
        return (
          <View style={[styles.foodIcon, styles.iconPlaceholder]}>
            <RNEIcon
              name="fast-food-outline"
              type="ionicon"
              size={20}
              color={theme.colors.grey3}
            />
          </View>
        );
      }
    };

    if (!item || !item.food) {
      return (
        <ListItem containerStyle={styles.listItemContainer}>
          <ListItem.Content>
            <ListItem.Title
              style={[{ color: theme.colors.error }, styles.textLeft]}
            >
              {t("dailyEntryScreen.invalidEntryData")}
            </ListItem.Title>
          </ListItem.Content>
        </ListItem>
      );
    }

    const handleEditPress = () => {
      if (!isSaving) onEdit(item, reversedIndex);
    };
    const handleDeletePress = () => {
      if (!isSaving) onRemove(reversedIndex);
    };

    const calculatedCalories = Math.round(
      (item.food.calories / 100) * item.grams
    );
    const calculatedProtein = Math.round(
      (item.food.protein / 100) * item.grams
    );
    const calculatedCarbs = Math.round(
      (item.food.carbs / 100) * item.grams
    );
    const calculatedFat = Math.round((item.food.fat / 100) * item.grams);

    return (
      <ListItem.Swipeable
        bottomDivider
        leftContent={(reset) => (
          <Button
            title={t("dailyEntryScreen.edit")}
            onPress={() => {
              handleEditPress();
              reset();
            }}
            icon={{ name: "edit", color: theme.colors.white }}
            buttonStyle={styles.swipeButtonEdit}
            titleStyle={styles.swipeButtonTitle}
            disabled={isSaving}
          />
        )}
        rightContent={(reset) => (
          <Button
            title={t("dailyEntryScreen.delete")}
            onPress={() => {
              handleDeletePress();
              reset();
            }}
            icon={{ name: "delete", color: theme.colors.white }}
            buttonStyle={styles.swipeButtonDelete}
            titleStyle={styles.swipeButtonTitle}
            disabled={isSaving}
          />
        )}
        containerStyle={styles.listItemContainer}
      >
        {renderListItemIcon()}
        <ListItem.Content>
          <View style={styles.titleContainer}>
            {gradeResult && (
              <Text
                style={[styles.gradePill, { backgroundColor: gradeResult.color }]}
              >
                {gradeResult.letter}
              </Text>
            )}
            <View
              style={styles.titleTextContainer}
              onLayout={(event) => {
                const { width } = event.nativeEvent.layout;
                setContainerWidth(width);
              }}
            >
              <Animated.Text
                style={[
                  styles.listItemTitle,
                  {
                    transform: [{ translateX: translateX }],
                  },
                ]}
                onTextLayout={(event) => {
                  const { lines } = event.nativeEvent;
                  if (lines && lines.length > 0) {
                    if (textWidth !== lines[0].width) setTextWidth(lines[0].width);
                  }
                }}
                numberOfLines={1}
              >
                {item.food.name}
                {shouldAnimate ? "      " : ""} {/* Suffix space for marquee */}
              </Animated.Text>
            </View>
          </View>
          <ListItem.Subtitle style={styles.listItemSubtitle}>
            {`${item.grams}g • Cal: ${calculatedCalories} P: ${calculatedProtein} C: ${calculatedCarbs} F: ${calculatedFat}`}
          </ListItem.Subtitle>
        </ListItem.Content>
        <ListItem.Chevron color={theme.colors.grey3} />
      </ListItem.Swipeable>
    );
  }
);

const useStyles = makeStyles((theme) => ({
  foodIcon: {
    width: 40,
    height: 40,
    marginRight: 15,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
  },
  foodIconImage: { width: 40, height: 40, marginRight: 15, borderRadius: 8 },
  iconPlaceholder: { backgroundColor: theme.colors.grey5 },
  listItemContainer: {
    backgroundColor: theme.colors.background,
    paddingVertical: 12,
    paddingHorizontal: 15,
    borderBottomColor: theme.colors.divider,
  },
  titleContainer: { flexDirection: "row", alignItems: "center", marginBottom: 3 },
  titleTextContainer: {
    flexShrink: 1,
    overflow: "hidden",
    justifyContent: 'center',
    // marginRight: 5,
  },
  gradePill: {
    fontSize: 12,
    fontWeight: "bold",
    color: theme.colors.white,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
    marginRight: 8,
    minWidth: 20,
    textAlign: "center",
    overflow: "hidden",
  },
  listItemTitle: {
    color: theme.colors.text,
    fontWeight: "600",
    fontSize: 16,
    textAlign: "left",
    // width: 'auto' // Allow text to define its own width for measurement
  },
  listItemSubtitle: {
    color: theme.colors.secondary,
    fontSize: 14,
    textAlign: "left",
  },
  swipeButtonEdit: {
    minHeight: "100%",
    backgroundColor: theme.colors.warning,
    justifyContent: "center",
    alignItems: "center",
  },
  swipeButtonDelete: {
    minHeight: "100%",
    backgroundColor: theme.colors.error,
    justifyContent: "center",
    alignItems: "center",
  },
  swipeButtonTitle: {
    color: theme.colors.white,
    fontWeight: "bold",
    fontSize: 15,
  },
  textLeft: { textAlign: "left" },
}));

export default DailyEntryListItem;
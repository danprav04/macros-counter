// src/components/FoodDetailsModal.tsx
import React, { useMemo } from 'react';
import { View } from 'react-native';
import { Overlay, Text, Icon, useTheme, makeStyles, Divider, ListItem } from '@rneui/themed';
import { Food } from '../types/food';
import { t } from '../localization/i18n';
import { getFoodIconUrl } from '../utils/iconUtils';
import { calculateBaseFoodGrade, FoodGradeResult } from '../utils/gradingUtils';

interface FoodDetailsModalProps {
  isVisible: boolean;
  onClose: () => void;
  food: Food | null;
}

const FoodDetailsModal: React.FC<FoodDetailsModalProps> = ({ isVisible, onClose, food }) => {
  const { theme } = useTheme();
  const styles = useStyles();

  const iconIdentifier = useMemo(() => {
    if (!food?.name) return null;
    return getFoodIconUrl(food.name);
  }, [food]);

  const gradeResult: FoodGradeResult | null = useMemo(() => {
    if (!food) return null;
    return calculateBaseFoodGrade(food);
  }, [food]);

  if (!food) {
    return null;
  }

  const renderMacroItem = (label: string, value: number, unit: string, iconName: string, iconType: string) => (
    <ListItem bottomDivider containerStyle={styles.macroItem}>
      <Icon name={iconName} type={iconType} color={theme.colors.secondary} />
      <ListItem.Content>
        <ListItem.Title style={styles.macroLabel}>{label}</ListItem.Title>
      </ListItem.Content>
      <Text style={styles.macroValue}>{`${Math.round(value)} ${unit}`}</Text>
    </ListItem>
  );

  return (
    <Overlay isVisible={isVisible} onBackdropPress={onClose} overlayStyle={styles.overlay}>
      <View style={styles.header}>
        <View style={styles.titleContainer}>
          {iconIdentifier ? (
            <Text style={styles.iconEmoji}>{iconIdentifier}</Text>
          ) : (
            <Icon name="fast-food-outline" type="ionicon" size={32} color={theme.colors.text} />
          )}
          <Text h4 h4Style={styles.title}>
            {food.name}
          </Text>
          {gradeResult && (
            <View style={[styles.gradePill, { backgroundColor: gradeResult.color }]}>
              <Text style={styles.gradeText}>{gradeResult.letter}</Text>
            </View>
          )}
        </View>
        <Icon name="close" type="material" size={28} color={theme.colors.grey3} onPress={onClose} containerStyle={styles.closeIcon} />
      </View>

      <Divider style={styles.divider} />

      <Text style={styles.subHeader}>{t('foodFormFields.calories')}</Text>
      
      <View style={styles.macroList}>
        {renderMacroItem(t('dailyProgress.calories'), food.calories, 'kcal', 'fire', 'material-community')}
        {renderMacroItem(t('dailyProgress.protein'), food.protein, 'g', 'food-drumstick', 'material-community')}
        {renderMacroItem(t('dailyProgress.carbs'), food.carbs, 'g', 'bread-slice', 'material-community')}
        {renderMacroItem(t('dailyProgress.fat'), food.fat, 'g', 'oil', 'material-community')}
      </View>
    </Overlay>
  );
};

const useStyles = makeStyles((theme) => ({
  overlay: {
    width: '90%',
    maxWidth: 400,
    borderRadius: 15,
    padding: 20,
    backgroundColor: theme.colors.card,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 15,
  },
  titleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginRight: 10,
  },
  iconEmoji: {
    fontSize: 32,
    marginRight: 12,
  },
  title: {
    color: theme.colors.text,
    fontWeight: 'bold',
    flexShrink: 1,
    textAlign: 'left',
  },
  gradePill: {
    marginLeft: 10,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 15,
    justifyContent: 'center',
    alignItems: 'center',
  },
  gradeText: {
    color: theme.colors.white,
    fontWeight: 'bold',
    fontSize: 16,
  },
  closeIcon: {
    marginLeft: 10,
  },
  divider: {
    marginBottom: 15,
  },
  subHeader: {
    fontSize: 16,
    fontWeight: '600',
    color: theme.colors.secondary,
    marginBottom: 10,
    textAlign: 'left',
  },
  macroList: {
    // No specific styles needed if using ListItems
  },
  macroItem: {
    paddingVertical: 12,
    paddingHorizontal: 0,
    backgroundColor: 'transparent',
    borderBottomColor: theme.colors.divider,
  },
  macroLabel: {
    color: theme.colors.text,
    fontSize: 16,
    fontWeight: '500',
    textAlign: 'left',
  },
  macroValue: {
    color: theme.colors.primary,
    fontSize: 16,
    fontWeight: 'bold',
  },
}));

export default FoodDetailsModal;
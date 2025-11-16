// src/components/DailyEntryDetailsModal.tsx
import React, { useState, useEffect, useMemo } from 'react';
import { View, ScrollView } from 'react-native';
import { Overlay, Text, Icon, useTheme, makeStyles, Divider, ListItem, Input, Button } from '@rneui/themed';
import { DailyEntryItem } from '../types/dailyEntry';
import { t } from '../localization/i18n';
import { getFoodIconUrl } from '../utils/iconUtils';
import { calculateDailyEntryGrade, FoodGradeResult } from '../utils/gradingUtils';
import { isValidNumberInput } from '../utils/validationUtils';
import { Settings } from '../types/settings';

interface DailyEntryDetailsModalProps {
  isVisible: boolean;
  onClose: () => void;
  onSave: (newGrams: number) => void;
  onDelete: () => void;
  item: DailyEntryItem | null;
  dailyGoals: Settings['dailyGoals'];
}

const DailyEntryDetailsModal: React.FC<DailyEntryDetailsModalProps> = ({ isVisible, onClose, onSave, onDelete, item, dailyGoals }) => {
  const { theme } = useTheme();
  const styles = useStyles();
  const [grams, setGrams] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (item) {
      setGrams(String(item.grams));
    } else {
      setGrams('');
    }
    setIsSaving(false); // Reset saving state when item changes or modal closes
  }, [item]);

  const food = item?.food;

  const iconIdentifier = useMemo(() => {
    if (!food?.name) return null;
    return getFoodIconUrl(food.name);
  }, [food]);
  
  const numericGramsValue = useMemo(() => parseFloat(grams) || 0, [grams]);

  const gradeResult: FoodGradeResult | null = useMemo(() => {
    if (!food || !dailyGoals || !isValidNumberInput(grams) || numericGramsValue <= 0) return null;
    return calculateDailyEntryGrade(food, numericGramsValue, dailyGoals);
  }, [food, dailyGoals, grams, numericGramsValue]);

  const handleSave = () => {
    if (!isValidNumberInput(grams) || numericGramsValue <= 0) {
      return;
    }
    setIsSaving(true);
    onSave(numericGramsValue);
  };
  
  const handleDelete = () => {
    onDelete();
  };

  if (!item || !food) {
    return null;
  }
  
  const factor = isValidNumberInput(grams) && numericGramsValue > 0 ? numericGramsValue / 100 : 0;
  
  const calculatedMacros = {
      calories: food.calories * factor,
      protein: food.protein * factor,
      carbs: food.carbs * factor,
      fat: food.fat * factor,
  };

  const renderMacroItem = (label: string, value: number, unit: string, iconName: string, iconType: string) => (
    <ListItem bottomDivider containerStyle={styles.macroItem}>
      <Icon name={iconName} type={iconType} color={theme.colors.secondary} size={20}/>
      <ListItem.Content>
        <ListItem.Title style={styles.macroLabel}>{label}</ListItem.Title>
        <ListItem.Subtitle style={styles.macroSubtitle}>{`${Math.round(food[label.toLowerCase() as keyof typeof food] as number)} ${unit}/100g`}</ListItem.Subtitle>
      </ListItem.Content>
      <Text style={styles.macroValue}>{`${Math.round(value)} ${unit}`}</Text>
    </ListItem>
  );
  
  const isSaveDisabled = !isValidNumberInput(grams) || numericGramsValue <= 0 || numericGramsValue === item.grams || isSaving;

  return (
    <Overlay isVisible={isVisible} onBackdropPress={onClose} overlayStyle={styles.overlay}>
      <ScrollView>
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
        
        <Input
            label={t('addEntryModal.amount')}
            keyboardType="numeric"
            value={grams}
            onChangeText={setGrams}
            inputStyle={styles.inputStyle}
            labelStyle={styles.labelStyle}
            inputContainerStyle={styles.inputContainerStyle}
            rightIcon={<Text style={styles.unitText}>g</Text>}
            containerStyle={{ paddingHorizontal: 0 }}
            autoFocus={true}
            selectTextOnFocus={true}
            errorMessage={!isValidNumberInput(grams) && grams !== "" && grams !== "." ? t('addEntryModal.gramsError') : ""}
            errorStyle={{ color: theme.colors.error }}
        />

        <Text style={styles.subHeader}>{t('foodFormFields.calories')}</Text>
        
        <View style={styles.macroList}>
          {renderMacroItem(t('dailyProgress.calories'), calculatedMacros.calories, 'kcal', 'fire', 'material-community')}
          {renderMacroItem(t('dailyProgress.protein'), calculatedMacros.protein, 'g', 'food-drumstick', 'material-community')}
          {renderMacroItem(t('dailyProgress.carbs'), calculatedMacros.carbs, 'g', 'bread-slice', 'material-community')}
          {renderMacroItem(t('dailyProgress.fat'), calculatedMacros.fat, 'g', 'oil', 'material-community')}
        </View>

        <View style={styles.buttonContainer}>
             <Button
                title={t('dailyEntryScreen.delete')}
                onPress={handleDelete}
                buttonStyle={[styles.button, styles.deleteButton]}
                titleStyle={styles.deleteButtonTitle}
                type="outline"
             />
             <Button
                title={t('addEntryModal.buttonUpdate')}
                onPress={handleSave}
                buttonStyle={styles.button}
                disabled={isSaveDisabled}
                loading={isSaving}
             />
        </View>
      </ScrollView>
    </Overlay>
  );
};

const useStyles = makeStyles((theme) => ({
  overlay: {
    width: '90%',
    maxWidth: 450,
    maxHeight: '85%',
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
  inputStyle: { color: theme.colors.text, fontSize: 18, textAlign: 'left'},
  inputContainerStyle: { borderBottomColor: theme.colors.grey3, paddingHorizontal: 5, },
  labelStyle: { color: theme.colors.secondary, fontWeight: '600', fontSize: 14, textTransform: 'uppercase', textAlign: 'left',},
  unitText: { color: theme.colors.secondary, fontSize: 16, fontWeight: '500' },
  subHeader: {
    fontSize: 16,
    fontWeight: '600',
    color: theme.colors.secondary,
    marginTop: 20,
    marginBottom: 10,
    textAlign: 'left',
  },
  macroList: {},
  macroItem: {
    paddingVertical: 10,
    paddingHorizontal: 5,
    backgroundColor: 'transparent',
    borderBottomColor: theme.colors.divider,
  },
  macroLabel: {
    color: theme.colors.text,
    fontSize: 16,
    fontWeight: '500',
    textAlign: 'left',
  },
  macroSubtitle: {
    color: theme.colors.grey3,
    fontSize: 12,
    textAlign: 'left',
  },
  macroValue: {
    color: theme.colors.primary,
    fontSize: 16,
    fontWeight: 'bold',
  },
  buttonContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 25,
  },
  button: {
    borderRadius: 8,
    paddingVertical: 10,
    paddingHorizontal: 20,
    flex: 1,
    marginHorizontal: 5,
  },
  deleteButton: {
    borderColor: theme.colors.error,
    flex: 0.8,
  },
  deleteButtonTitle: {
    color: theme.colors.error,
  }
}));

export default DailyEntryDetailsModal;
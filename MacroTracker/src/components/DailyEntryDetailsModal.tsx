// src/components/DailyEntryDetailsModal.tsx
import React, { useState, useEffect, useMemo } from 'react';
import { View, ScrollView, TouchableOpacity, ActivityIndicator } from 'react-native';
import { Overlay, Text, Icon, useTheme, makeStyles, Divider, ListItem, Input, Button } from '@rneui/themed';
import { DailyEntryItem } from '../types/dailyEntry';
import { Food } from '../types/food';
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
  onSaveToLibrary: (food: Food) => void;
  isFoodSaved: boolean;
  item: DailyEntryItem | null;
  dailyGoals: Settings['dailyGoals'];
}

const DailyEntryDetailsModal: React.FC<DailyEntryDetailsModalProps> = ({ 
  isVisible, 
  onClose, 
  onSave, 
  onDelete, 
  onSaveToLibrary,
  isFoodSaved,
  item, 
  dailyGoals 
}) => {
  const { theme } = useTheme();
  const styles = useStyles();
  const [grams, setGrams] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [isLibraryActionLoading, setIsLibraryActionLoading] = useState(false);

  useEffect(() => {
    if (item) {
      setGrams(String(item.grams));
    } else {
      setGrams('');
    }
    setIsSaving(false);
    setIsLibraryActionLoading(false);
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

  const handleLibraryAction = async () => {
      if (!food) return;
      setIsLibraryActionLoading(true);
      await onSaveToLibrary(food);
      setIsLibraryActionLoading(false);
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
      <Icon key="icon" name={iconName} type={iconType} color={theme.colors.secondary} size={20}/>
      <ListItem.Content key="content">
        <ListItem.Title style={styles.macroLabel}>{label}</ListItem.Title>
        <ListItem.Subtitle style={styles.macroSubtitle}>{`${Math.round(food[label.toLowerCase() as keyof typeof food] as number)} ${unit}/100g`}</ListItem.Subtitle>
      </ListItem.Content>
      <Text key="text" style={styles.macroValue}>{`${Math.round(value)} ${unit}`}</Text>
    </ListItem>
  );
  
  const isSaveDisabled = !isValidNumberInput(grams) || numericGramsValue <= 0 || numericGramsValue === item.grams || isSaving;

  return (
    <Overlay isVisible={isVisible} onBackdropPress={onClose} overlayStyle={styles.overlay}>
      <ScrollView contentContainerStyle={{ paddingBottom: 20 }}>
        <View style={styles.header}>
          <View style={styles.titleContainer}>
            {iconIdentifier ? (
              <Text style={styles.iconEmoji}>{iconIdentifier}</Text>
            ) : (
              <Icon name="fast-food-outline" type="ionicon" size={32} color={theme.colors.text} />
            )}
            <View style={styles.textContainer}>
                <Text h4 h4Style={styles.title}>
                {food.name}
                </Text>
            </View>
            {gradeResult && (
              <View style={[styles.gradePill, { backgroundColor: gradeResult.color }]}>
                <Text style={styles.gradeText}>{gradeResult.letter}</Text>
              </View>
            )}
          </View>
          
          <View style={styles.headerActions}>
              <TouchableOpacity 
                onPress={handleLibraryAction} 
                style={styles.actionIcon}
                disabled={isLibraryActionLoading || isFoodSaved}
              >
                {isLibraryActionLoading ? (
                    <ActivityIndicator size="small" color={theme.colors.primary} />
                ) : (
                    <Icon 
                        name={isFoodSaved ? "bookmark" : "bookmark-plus-outline"} 
                        type="material-community" 
                        size={28} 
                        color={isFoodSaved ? theme.colors.primary : theme.colors.grey3} 
                    />
                )}
              </TouchableOpacity>
              <TouchableOpacity onPress={onClose} style={styles.actionIcon}>
                <Icon name="close" type="material" size={28} color={theme.colors.grey3} />
              </TouchableOpacity>
          </View>
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

        <View style={styles.disclaimerContainer}>
            <View style={styles.disclaimerRow}>
                <Icon name="auto-awesome" type="material" color={theme.colors.grey3} size={14} style={styles.disclaimerIcon} />
                <Text style={styles.disclaimerText}>{t('disclaimers.aiWarning')}</Text>
            </View>
            <View style={styles.disclaimerRow}>
                <Icon name="alert-circle-outline" type="material-community" color={theme.colors.grey3} size={14} style={styles.disclaimerIcon} />
                <Text style={styles.disclaimerText}>{t('disclaimers.medicalDisclaimer')}</Text>
            </View>
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
    marginRight: 5,
  },
  textContainer: {
      flexShrink: 1,
  },
  iconEmoji: {
    fontSize: 32,
    marginRight: 12,
  },
  title: {
    color: theme.colors.text,
    fontWeight: 'bold',
    textAlign: 'left',
  },
  gradePill: {
    marginLeft: 8,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 12,
    minWidth: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  gradeText: {
    color: theme.colors.white,
    fontWeight: 'bold',
    fontSize: 14,
  },
  headerActions: {
      flexDirection: 'row',
      alignItems: 'center',
  },
  actionIcon: {
      marginLeft: 15,
      padding: 4,
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
  disclaimerContainer: {
    marginTop: 20,
    paddingHorizontal: 10,
    opacity: 0.8,
  },
  disclaimerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  disclaimerIcon: {
    marginRight: 6,
  },
  disclaimerText: {
    fontSize: 12,
    color: theme.colors.grey3,
    fontStyle: 'italic',
    textAlign: 'center',
  },
  buttonContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 15,
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
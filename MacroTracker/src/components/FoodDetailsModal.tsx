// src/components/FoodDetailsModal.tsx
import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { View, ScrollView, Alert } from 'react-native';
import { Overlay, Text, Icon, useTheme, makeStyles, Divider, Button } from '@rneui/themed';
import { Food } from '../types/food';
import { t } from '../localization/i18n';
import { getFoodIconUrl } from '../utils/iconUtils';
import { calculateBaseFoodGrade, FoodGradeResult } from '../utils/gradingUtils';
import FoodFormFields from './FoodFormFields';
import { isNotEmpty } from '../utils/validationUtils';

type FoodFormData = Omit<Food, 'id' | 'createdAt'>;

interface FoodDetailsModalProps {
  isVisible: boolean;
  onClose: () => void;
  onSave: (food: Food) => Promise<void>;
  onDelete: (foodId: string) => void;
  food: Food | null;
}

const FoodDetailsModal: React.FC<FoodDetailsModalProps> = ({ isVisible, onClose, onSave, onDelete, food }) => {
  const { theme } = useTheme();
  const styles = useStyles();

  const [formState, setFormState] = useState<FoodFormData>({ name: '', calories: 0, protein: 0, carbs: 0, fat: 0 });
  const [errors, setErrors] = useState<{ [key: string]: string }>({});
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (food) {
      setFormState({
        name: food.name,
        calories: food.calories,
        protein: food.protein,
        carbs: food.carbs,
        fat: food.fat,
      });
      setErrors({});
    }
  }, [food]);

  const handleInputChange = useCallback((key: keyof FoodFormData, value: string, isEdit: boolean) => {
    const numericKeys: (keyof FoodFormData)[] = ['calories', 'protein', 'carbs', 'fat'];
    let processedValue: string | number = value;

    if (numericKeys.includes(key)) {
      if (value === "" || value === ".") {
        processedValue = 0;
      } else {
        const cleaned = value.replace(/[^0-9.]/g, "").replace(/(\..*)\./g, "$1");
        processedValue = parseFloat(cleaned) || 0;
      }
    }
    setFormState(prevState => ({ ...prevState, [key]: processedValue }));
  }, []);

  const gradeResult: FoodGradeResult | null = useMemo(() => {
    const tempFoodForGrading: Food = { ...formState, id: '', createdAt: '' };
    return calculateBaseFoodGrade(tempFoodForGrading);
  }, [formState]);

  const iconIdentifier = useMemo(() => {
    if (!formState.name) return null;
    return getFoodIconUrl(formState.name);
  }, [formState.name]);

  const validate = () => {
    const newErrors: { [key: string]: string } = {};
    if (!isNotEmpty(formState.name)) newErrors.name = t('foodFormFields.errorNameRequired');
    if (formState.calories < 0) newErrors.calories = t('foodFormFields.errorNonNegative');
    if (formState.protein < 0) newErrors.protein = t('foodFormFields.errorNonNegative');
    if (formState.carbs < 0) newErrors.carbs = t('foodFormFields.errorNonNegative');
    if (formState.fat < 0) newErrors.fat = t('foodFormFields.errorNonNegative');
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSave = async () => {
    if (!food || !validate()) {
      return;
    }
    setIsSaving(true);
    await onSave({ ...food, ...formState });
    setIsSaving(false);
  };
  
  const handleDelete = () => {
      if (!food) return;
      Alert.alert(
          `${t('foodListScreen.delete')} ${food.name}?`,
          t('dataManagement.confirmClearMessage'),
          [
              { text: t('confirmationModal.cancel'), style: 'cancel' },
              { text: t('foodListScreen.delete'), style: 'destructive', onPress: () => onDelete(food.id) },
          ],
          { cancelable: true }
      );
  };

  if (!food) return null;

  const hasChanges = JSON.stringify(formState) !== JSON.stringify({
    name: food.name, calories: food.calories, protein: food.protein, carbs: food.carbs, fat: food.fat
  });

  return (
    <Overlay isVisible={isVisible} onBackdropPress={onClose} overlayStyle={styles.overlay}>
      <ScrollView keyboardShouldPersistTaps="handled">
        <View style={styles.header}>
            <View style={styles.titleContainer}>
                {iconIdentifier ? <Text style={styles.iconEmoji}>{iconIdentifier}</Text> : <Icon name="fast-food-outline" type="ionicon" size={32} color={theme.colors.text} />}
                <Text h4 h4Style={styles.title}>{formState.name || t('addFoodModal.titleAdd')}</Text>
                {gradeResult && <View style={[styles.gradePill, { backgroundColor: gradeResult.color }]}><Text style={styles.gradeText}>{gradeResult.letter}</Text></View>}
            </View>
            <Icon name="close" type="material" size={28} color={theme.colors.grey3} onPress={onClose} containerStyle={styles.closeIcon} />
        </View>

        <Divider style={styles.divider} />

        <FoodFormFields
            values={formState}
            errors={errors}
            onInputChange={handleInputChange}
            isEditing={true}
            disabled={isSaving}
        />

        <View style={styles.buttonContainer}>
            <Button
                title={t('foodListScreen.delete')}
                onPress={handleDelete}
                buttonStyle={[styles.button, styles.deleteButton]}
                titleStyle={styles.deleteButtonTitle}
                type="outline"
                disabled={isSaving}
            />
            <Button
                title={t('addFoodModal.buttonUpdate')}
                onPress={handleSave}
                buttonStyle={styles.button}
                disabled={!hasChanges || isSaving}
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
    maxWidth: 500,
    maxHeight: '85%',
    borderRadius: 15,
    padding: 20,
    backgroundColor: theme.colors.card,
  },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 15, },
  titleContainer: { flexDirection: 'row', alignItems: 'center', flex: 1, marginRight: 10, },
  iconEmoji: { fontSize: 32, marginRight: 12, },
  title: { color: theme.colors.text, fontWeight: 'bold', flexShrink: 1, textAlign: 'left', },
  gradePill: { marginLeft: 10, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 15, },
  gradeText: { color: theme.colors.white, fontWeight: 'bold', fontSize: 16, },
  closeIcon: { marginLeft: 10, },
  divider: { marginBottom: 15, },
  buttonContainer: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 25, },
  button: { borderRadius: 8, paddingVertical: 10, paddingHorizontal: 20, flex: 1, marginHorizontal: 5, },
  deleteButton: { borderColor: theme.colors.error, flex: 0.8, },
  deleteButtonTitle: { color: theme.colors.error, },
}));

export default FoodDetailsModal;
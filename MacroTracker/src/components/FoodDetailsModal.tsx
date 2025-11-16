// src/components/FoodDetailsModal.tsx
import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { View, ScrollView, Alert, I18nManager } from 'react-native';
import { Overlay, Text, Icon, useTheme, makeStyles, Divider, Button, Input, ListItem } from '@rneui/themed';
import Toast from 'react-native-toast-message';
import { Food } from '../types/food';
import { t } from '../localization/i18n';
import { getFoodIconUrl } from '../utils/iconUtils';
import { calculateBaseFoodGrade, FoodGradeResult } from '../utils/gradingUtils';
import { isNotEmpty, isValidNumberInput } from '../utils/validationUtils';
import { MaterialCommunityIcons } from '@expo/vector-icons';

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

  const [formState, setFormState] = useState<Partial<FoodFormData>>({ name: '', calories: 0, protein: 0, carbs: 0, fat: 0 });
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

  const handleInputChange = useCallback((key: keyof FoodFormData, value: string) => {
    setFormState(prevState => ({ ...prevState, [key]: value }));
  }, []);

  const gradeResult: FoodGradeResult | null = useMemo(() => {
      const parsedState: FoodFormData = {
        name: String(formState.name),
        calories: parseFloat(String(formState.calories)) || 0,
        protein: parseFloat(String(formState.protein)) || 0,
        carbs: parseFloat(String(formState.carbs)) || 0,
        fat: parseFloat(String(formState.fat)) || 0,
      };
    const tempFoodForGrading: Food = { ...parsedState, id: '', createdAt: '' };
    return calculateBaseFoodGrade(tempFoodForGrading);
  }, [formState]);

  const iconIdentifier = useMemo(() => {
    if (!formState.name) return null;
    return getFoodIconUrl(String(formState.name));
  }, [formState.name]);

  const validate = () => {
    const newErrors: { [key: string]: string } = {};
    if (!isNotEmpty(String(formState.name))) newErrors.name = t('foodFormFields.errorNameRequired');
    
    const fields: (keyof FoodFormData)[] = ['calories', 'protein', 'carbs', 'fat'];
    fields.forEach(field => {
        const value = String(formState[field]);
        if (value.trim() === '' || !isValidNumberInput(value) || parseFloat(value) < 0) {
            newErrors[field] = t('foodFormFields.errorNonNegative');
        }
    });

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };
  
  const handleSave = async () => {
    if (!food || !validate()) {
      Toast.show({ type: 'error', text1: t('foodListScreen.fixErrors'), position: 'bottom' });
      return;
    }
    const finalFormState: FoodFormData = {
        name: String(formState.name).trim(),
        calories: parseFloat(String(formState.calories)) || 0,
        protein: parseFloat(String(formState.protein)) || 0,
        carbs: parseFloat(String(formState.carbs)) || 0,
        fat: parseFloat(String(formState.fat)) || 0,
    };
    setIsSaving(true);
    await onSave({ ...food, ...finalFormState });
    setIsSaving(false);
  };
  
  const handleDelete = () => {
      if (!food) return;
      Alert.alert(
          `${t('foodListScreen.delete')} ${food.name}?`,
          // This confirmation message from dataManagement is more generic and fits here
          "This action is irreversible.",
          [
              { text: t('confirmationModal.cancel'), style: 'cancel' },
              { text: t('foodListScreen.delete'), style: 'destructive', onPress: () => onDelete(food.id) },
          ],
          { cancelable: true }
      );
  };

  const renderEditableMacroItem = (
    label: string,
    key: keyof FoodFormData,
    iconName: any,
  ) => (
    <ListItem containerStyle={styles.macroItem} bottomDivider>
      <MaterialCommunityIcons name={iconName} size={24} color={theme.colors.secondary} />
      <ListItem.Content>
        <ListItem.Title style={styles.macroLabel}>{label}</ListItem.Title>
      </ListItem.Content>
      <Input
        value={String(formState[key])}
        onChangeText={(text) => handleInputChange(key, text)}
        keyboardType="numeric"
        containerStyle={styles.inputOuterContainer}
        inputContainerStyle={styles.inputContainer}
        inputStyle={styles.inputValue}
        rightIcon={<Text style={styles.unitText}>/ 100g</Text>}
        errorMessage={errors[key]}
        errorStyle={styles.errorText}
        disabled={isSaving}
      />
    </ListItem>
  );

  if (!food) return null;

  const originalData = { name: food.name, calories: food.calories, protein: food.protein, carbs: food.carbs, fat: food.fat };
  const currentState = { ...formState, calories: parseFloat(String(formState.calories)) || 0, protein: parseFloat(String(formState.protein)) || 0, carbs: parseFloat(String(formState.carbs)) || 0, fat: parseFloat(String(formState.fat)) || 0 };
  const hasChanges = JSON.stringify(originalData) !== JSON.stringify(currentState);

  return (
    <Overlay isVisible={isVisible} onBackdropPress={onClose} overlayStyle={styles.overlay}>
      <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={{ paddingBottom: 20 }}>
        <View style={styles.header}>
            <View style={styles.titleContainer}>
                {iconIdentifier ? <Text style={styles.iconEmoji}>{iconIdentifier}</Text> : <Icon name="fast-food-outline" type="ionicon" size={32} color={theme.colors.text} />}
                <Text h4 h4Style={styles.title}>{String(formState.name) || t('addFoodModal.titleAdd')}</Text>
                {gradeResult && <View style={[styles.gradePill, { backgroundColor: gradeResult.color }]}><Text style={styles.gradeText}>{gradeResult.letter}</Text></View>}
            </View>
            <Icon name="close" type="material" size={28} color={theme.colors.grey3} onPress={onClose} containerStyle={styles.closeIcon} />
        </View>

        <Divider style={styles.divider} />

        <ListItem containerStyle={styles.macroItem} bottomDivider>
            <MaterialCommunityIcons name="form-textbox" size={24} color={theme.colors.secondary} />
            <ListItem.Content>
                <ListItem.Title style={styles.macroLabel}>{t('foodFormFields.foodName')}</ListItem.Title>
            </ListItem.Content>
            <Input
                value={String(formState.name)}
                onChangeText={(text) => handleInputChange('name', text)}
                autoCapitalize="words"
                containerStyle={styles.inputOuterContainer}
                inputContainerStyle={styles.inputContainer}
                inputStyle={styles.nameInputValue}
                errorMessage={errors.name}
                errorStyle={styles.errorText}
                disabled={isSaving}
            />
        </ListItem>

        {renderEditableMacroItem(t('dailyProgress.calories'), 'calories', 'fire')}
        {renderEditableMacroItem(t('dailyProgress.protein'), 'protein', 'food-drumstick')}
        {renderEditableMacroItem(t('dailyProgress.carbs'), 'carbs', 'bread-slice')}
        {renderEditableMacroItem(t('dailyProgress.fat'), 'fat', 'oil')}

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
  overlay: { width: '90%', maxWidth: 500, maxHeight: '85%', borderRadius: 15, padding: 20, backgroundColor: theme.colors.card, },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 15, },
  titleContainer: { flexDirection: 'row', alignItems: 'center', flex: 1, marginRight: 10, },
  iconEmoji: { fontSize: 32, marginRight: 12, },
  title: { color: theme.colors.text, fontWeight: 'bold', flexShrink: 1, textAlign: 'left', },
  gradePill: { marginLeft: 10, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 15, },
  gradeText: { color: theme.colors.white, fontWeight: 'bold', fontSize: 16, },
  closeIcon: { marginLeft: 10, },
  divider: { marginBottom: 15, },
  macroItem: { paddingVertical: 4, paddingHorizontal: 5, backgroundColor: 'transparent', alignItems: 'center' },
  macroLabel: { color: theme.colors.text, fontSize: 16, fontWeight: '500', textAlign: 'left', },
  inputOuterContainer: { flex: 0.6, paddingHorizontal: 0 },
  inputContainer: { borderBottomWidth: 0, paddingHorizontal: 8, backgroundColor: theme.colors.grey5, borderRadius: 8, },
  inputValue: { color: theme.colors.text, fontSize: 16, textAlign: 'right', paddingVertical: 10 },
  nameInputValue: { color: theme.colors.text, fontSize: 16, textAlign: I18nManager.isRTL ? 'right' : 'left', paddingVertical: 10 },
  unitText: { color: theme.colors.grey3, fontSize: 13, fontWeight: '500' },
  errorText: { color: theme.colors.error, textAlign: 'left', marginLeft: 0, marginTop: 2, marginBottom: 2 },
  buttonContainer: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 25, },
  button: { borderRadius: 8, paddingVertical: 10, paddingHorizontal: 20, flex: 1, marginHorizontal: 5, },
  deleteButton: { borderColor: theme.colors.error, flex: 0.8, },
  deleteButtonTitle: { color: theme.colors.error, },
}));

export default FoodDetailsModal;
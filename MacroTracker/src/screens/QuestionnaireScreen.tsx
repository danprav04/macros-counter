// src/screens/QuestionnaireScreen.tsx
import React, { useState, useCallback, useMemo } from 'react';
import { View, ScrollView, Alert, StyleSheet, I18nManager, Platform } from 'react-native';
import { Input, Button, Text, useTheme, makeStyles, CheckBox, Icon } from '@rneui/themed';
import { Picker } from '@react-native-picker/picker';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { QuestionnaireFormData, Sex, ActivityLevel, PrimaryGoal, GoalIntensity, CalculatedGoals } from '../types/questionnaire';
import { MacroType, Settings } from '../types/settings';
import { loadSettings, saveSettings } from '../services/storageService';
import i18n, { t } from '../localization/i18n';
import Toast from 'react-native-toast-message';

type SettingsStackParamList = {
  SettingsScreen: undefined;
  QuestionnaireScreen: undefined;
};

type QuestionnaireNavigationProp = NativeStackNavigationProp<SettingsStackParamList, 'QuestionnaireScreen'>;

const QuestionnaireScreen: React.FC = () => {
  const { theme } = useTheme();
  const styles = useStyles();
  const navigation = useNavigation<QuestionnaireNavigationProp>();

  const [formData, setFormData] = useState<QuestionnaireFormData>({
    age: '',
    sex: '',
    height: '',
    weight: '',
    activityLevel: '',
    primaryGoal: '',
    goalIntensity: GoalIntensity.MODERATE, // Default intensity
  });

  const [errors, setErrors] = useState<Partial<Record<keyof QuestionnaireFormData, string>>>({});
  const [isCalculating, setIsCalculating] = useState(false);

  const activityLevelOptions = useMemo(() => [
    { label: t('questionnaireScreen.activityLevel.select'), value: '' },
    { label: t('questionnaireScreen.activityLevel.sedentary'), value: ActivityLevel.SEDENTARY },
    { label: t('questionnaireScreen.activityLevel.light'), value: ActivityLevel.LIGHT },
    { label: t('questionnaireScreen.activityLevel.moderate'), value: ActivityLevel.MODERATE },
    { label: t('questionnaireScreen.activityLevel.active'), value: ActivityLevel.ACTIVE },
    { label: t('questionnaireScreen.activityLevel.veryActive'), value: ActivityLevel.VERY_ACTIVE },
  ], [i18n.locale]);

  const sexOptions = useMemo(() => [
    { label: t('questionnaireScreen.sex.select'), value: '' },
    { label: t('questionnaireScreen.sex.male'), value: Sex.MALE },
    { label: t('questionnaireScreen.sex.female'), value: Sex.FEMALE },
  ], [i18n.locale]);

  const primaryGoalOptions = useMemo(() => [
    { label: t('questionnaireScreen.primaryGoal.select'), value: '' },
    { label: t('questionnaireScreen.primaryGoal.loseWeight'), value: PrimaryGoal.LOSE_WEIGHT },
    { label: t('questionnaireScreen.primaryGoal.maintainWeight'), value: PrimaryGoal.MAINTAIN_WEIGHT },
    { label: t('questionnaireScreen.primaryGoal.gainMuscle'), value: PrimaryGoal.GAIN_MUSCLE },
  ], [i18n.locale]);

  const goalIntensityOptions = useMemo(() => [
    { label: t('questionnaireScreen.goalIntensity.mild'), value: GoalIntensity.MILD },
    { label: t('questionnaireScreen.goalIntensity.moderate'), value: GoalIntensity.MODERATE },
    { label: t('questionnaireScreen.goalIntensity.aggressive'), value: GoalIntensity.AGGRESSIVE },
  ], [i18n.locale]);


  const handleInputChange = (field: keyof QuestionnaireFormData, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: undefined }));
    }
  };

  const validateForm = (): boolean => {
    const newErrors: Partial<Record<keyof QuestionnaireFormData, string>> = {};
    const ageNum = parseFloat(formData.age);
    const heightNum = parseFloat(formData.height);
    const weightNum = parseFloat(formData.weight);

    if (!formData.age.trim() || isNaN(ageNum) || ageNum <= 0 || ageNum > 120) {
      newErrors.age = t('questionnaireScreen.validation.invalidAge');
    }
    if (formData.sex === '') {
      newErrors.sex = t('questionnaireScreen.validation.selectSex');
    }
    if (!formData.height.trim() || isNaN(heightNum) || heightNum <= 50 || heightNum > 250) {
      newErrors.height = t('questionnaireScreen.validation.invalidHeight');
    }
    if (!formData.weight.trim() || isNaN(weightNum) || weightNum <= 20 || weightNum > 300) {
      newErrors.weight = t('questionnaireScreen.validation.invalidWeight');
    }
    if (formData.activityLevel === '') {
      newErrors.activityLevel = t('questionnaireScreen.validation.selectActivityLevel');
    }
    if (formData.primaryGoal === '') {
      newErrors.primaryGoal = t('questionnaireScreen.validation.selectPrimaryGoal');
    }
    if (formData.primaryGoal !== PrimaryGoal.MAINTAIN_WEIGHT && !formData.goalIntensity) {
        newErrors.goalIntensity = t('questionnaireScreen.validation.selectGoalIntensity');
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const calculateGoals = (): CalculatedGoals | null => {
    const age = parseFloat(formData.age);
    const height = parseFloat(formData.height);
    const weight = parseFloat(formData.weight);

    // BMR (Mifflin-St Jeor)
    let bmr: number;
    if (formData.sex === Sex.MALE) {
      bmr = 10 * weight + 6.25 * height - 5 * age + 5;
    } else {
      bmr = 10 * weight + 6.25 * height - 5 * age - 161;
    }

    // TDEE
    let activityMultiplier = 1.2;
    switch (formData.activityLevel) {
      case ActivityLevel.SEDENTARY: activityMultiplier = 1.2; break;
      case ActivityLevel.LIGHT: activityMultiplier = 1.375; break;
      case ActivityLevel.MODERATE: activityMultiplier = 1.55; break;
      case ActivityLevel.ACTIVE: activityMultiplier = 1.725; break;
      case ActivityLevel.VERY_ACTIVE: activityMultiplier = 1.9; break;
    }
    const tdee = bmr * activityMultiplier;

    // Calorie Goal
    let calorieAdjustment = 0;
    if (formData.primaryGoal !== PrimaryGoal.MAINTAIN_WEIGHT) {
      switch (formData.goalIntensity) {
        case GoalIntensity.MILD: calorieAdjustment = (formData.primaryGoal === PrimaryGoal.LOSE_WEIGHT ? -300 : 250); break;
        case GoalIntensity.MODERATE: calorieAdjustment = (formData.primaryGoal === PrimaryGoal.LOSE_WEIGHT ? -500 : 400); break;
        case GoalIntensity.AGGRESSIVE: calorieAdjustment = (formData.primaryGoal === PrimaryGoal.LOSE_WEIGHT ? -700 : 600); break;
      }
    }
    let calorieGoal = tdee + calorieAdjustment;

    // Ensure calorie goal is not below minimums
    const minCalories = formData.sex === Sex.FEMALE ? 1200 : 1500;
    if (calorieGoal < minCalories) {
        calorieGoal = minCalories;
        Toast.show({ type: 'info', text1: t('questionnaireScreen.toast.minCaloriesAdjustedTitle'), text2: t('questionnaireScreen.toast.minCaloriesAdjustedMessage', { calories: minCalories }), position: 'bottom' });
    }
    if (formData.primaryGoal === PrimaryGoal.LOSE_WEIGHT && calorieGoal >= tdee) {
        calorieGoal = tdee - 100; // Ensure at least a small deficit
    }
    if (formData.primaryGoal === PrimaryGoal.GAIN_MUSCLE && calorieGoal <= tdee) {
        calorieGoal = tdee + 100; // Ensure at least a small surplus
    }


    // Macros
    let proteinPerKg = 1.8;
    if (formData.primaryGoal === PrimaryGoal.GAIN_MUSCLE) proteinPerKg = 2.0;
    if (age > 65) proteinPerKg = Math.max(1.2, proteinPerKg - 0.4); // Adjust for older adults

    const proteinGrams = proteinPerKg * weight;
    const proteinCalories = proteinGrams * 4;

    const fatPercentage = 0.25; // 25% of calories from fat
    const fatCalories = calorieGoal * fatPercentage;
    const fatGrams = fatCalories / 9;

    const carbCalories = calorieGoal - proteinCalories - fatCalories;
    const carbGrams = carbCalories / 4;

    return {
      calories: Math.round(calorieGoal),
      protein: Math.round(proteinGrams),
      carbs: Math.round(carbGrams),
      fat: Math.round(fatGrams),
    };
  };

  const handleSubmit = async () => {
    if (!validateForm()) {
      Toast.show({ type: 'error', text1: t('questionnaireScreen.validation.fixErrors'), position: 'bottom' });
      return;
    }
    setIsCalculating(true);
    try {
      const calculated = calculateGoals();
      if (calculated) {
        const currentSettings = await loadSettings();
        const updatedSettings: Settings = {
          ...currentSettings,
          dailyGoals: calculated,
        };
        await saveSettings(updatedSettings);
        Toast.show({ type: 'success', text1: t('questionnaireScreen.toast.goalsCalculated'), position: 'bottom' });
        navigation.goBack();
      } else {
        Alert.alert(t('questionnaireScreen.error.calculationFailedTitle'), t('questionnaireScreen.error.calculationFailedMessage'));
      }
    } catch (error) {
      console.error("Error saving estimated goals:", error);
      Alert.alert(t('questionnaireScreen.error.genericSaveTitle'), t('questionnaireScreen.error.genericSaveMessage'));
    } finally {
      setIsCalculating(false);
    }
  };

  const renderPicker = (
    label: string,
    selectedValue: string | number,
    onValueChange: (itemValue: any, itemIndex: number) => void,
    items: { label: string, value: string | number }[],
    error?: string
  ) => (
    <View style={styles.inputContainer}>
      <Text style={styles.label}>{label}</Text>
      <View style={[styles.pickerWrapper, error ? styles.errorBorder : {}]}>
        <Picker
          selectedValue={selectedValue}
          onValueChange={onValueChange}
          style={[styles.picker, Platform.OS === 'android' ? { color: theme.colors.text, backgroundColor: theme.colors.background } : {}]}
          itemStyle={[styles.pickerItem, Platform.OS === 'ios' ? {color: theme.colors.text} : {}]}
          dropdownIconColor={theme.colors.text}
        >
          {items.map(item => <Picker.Item key={item.value.toString()} label={item.label} value={item.value} />)}
        </Picker>
      </View>
      {error && <Text style={styles.errorText}>{error}</Text>}
    </View>
  );

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.scrollContentContainer} keyboardShouldPersistTaps="handled">
      <Input
        label={t('questionnaireScreen.ageLabel')}
        placeholder={t('questionnaireScreen.agePlaceholder')}
        keyboardType="numeric"
        value={formData.age}
        onChangeText={val => handleInputChange('age', val)}
        errorMessage={errors.age}
        inputStyle={{ textAlign: I18nManager.isRTL ? 'right' : 'left', color: theme.colors.text}}
        labelStyle={styles.label}
        errorStyle={styles.errorText}
        containerStyle={styles.inputContainer}
      />

      {renderPicker(t('questionnaireScreen.sexLabel'), formData.sex, (val) => handleInputChange('sex', val), sexOptions, errors.sex)}

      <Input
        label={t('questionnaireScreen.heightLabel')}
        placeholder={t('questionnaireScreen.heightPlaceholder')}
        keyboardType="numeric"
        value={formData.height}
        onChangeText={val => handleInputChange('height', val)}
        errorMessage={errors.height}
        rightIcon={<Text style={styles.unitText}>cm</Text>}
        inputStyle={{ textAlign: I18nManager.isRTL ? 'right' : 'left', color: theme.colors.text}}
        labelStyle={styles.label}
        errorStyle={styles.errorText}
        containerStyle={styles.inputContainer}
      />

      <Input
        label={t('questionnaireScreen.weightLabel')}
        placeholder={t('questionnaireScreen.weightPlaceholder')}
        keyboardType="numeric"
        value={formData.weight}
        onChangeText={val => handleInputChange('weight', val)}
        errorMessage={errors.weight}
        rightIcon={<Text style={styles.unitText}>kg</Text>}
        inputStyle={{ textAlign: I18nManager.isRTL ? 'right' : 'left', color: theme.colors.text}}
        labelStyle={styles.label}
        errorStyle={styles.errorText}
        containerStyle={styles.inputContainer}
      />

      {renderPicker(t('questionnaireScreen.activityLevelLabel'), formData.activityLevel, (val) => handleInputChange('activityLevel', val), activityLevelOptions, errors.activityLevel)}
      {renderPicker(t('questionnaireScreen.primaryGoalLabel'), formData.primaryGoal, (val) => handleInputChange('primaryGoal', val), primaryGoalOptions, errors.primaryGoal)}

      {formData.primaryGoal && formData.primaryGoal !== PrimaryGoal.MAINTAIN_WEIGHT && (
        renderPicker(t('questionnaireScreen.goalIntensityLabel'), formData.goalIntensity || '', (val) => handleInputChange('goalIntensity', val), goalIntensityOptions, errors.goalIntensity)
      )}

      <Button
        title={t('questionnaireScreen.calculateButton')}
        onPress={handleSubmit}
        buttonStyle={styles.button}
        loading={isCalculating}
        disabled={isCalculating}
      />
       <View style={styles.disclaimerContainer}>
          <Icon name="alert-circle-outline" type="material-community" color={theme.colors.grey2} size={16} />
          <Text style={styles.disclaimerText}>{t('disclaimers.medicalDisclaimer')}</Text>
      </View>
    </ScrollView>
  );
};

const useStyles = makeStyles((theme) => ({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  scrollContentContainer: {
    padding: 20,
  },
  title: {
    marginBottom: 20,
    textAlign: 'center',
    color: theme.colors.text,
  },
  inputContainer: {
    marginBottom: 15,
  },
  label: {
    color: theme.colors.secondary,
    fontWeight: 'bold',
    marginBottom: 5,
    fontSize: 16,
    textAlign: I18nManager.isRTL ? 'right' : 'left',
  },
  unitText: {
    color: theme.colors.secondary,
    fontSize: 16,
  },
  pickerWrapper: {
    borderColor: theme.colors.grey3,
    borderWidth: 1,
    borderRadius: 5,
    paddingBottom: 8,
    paddingTop: 2,
    backgroundColor: theme.colors.background, // Ensure picker background matches
  },
  picker: {
    height: Platform.OS === 'ios' ? 120 : 50,
    width: '100%',
  },
  pickerItem: {
     // For iOS, text color is set here. Android uses picker's color prop.
     textAlign: I18nManager.isRTL ? 'right' : 'left',
  },
  errorText: {
    color: theme.colors.error,
    marginTop: 3,
    fontSize: 12,
    textAlign: I18nManager.isRTL ? 'right' : 'left',
  },
  errorBorder: {
    borderColor: theme.colors.error,
  },
  button: {
    marginTop: 20,
    backgroundColor: theme.colors.primary,
    borderRadius: 8,
  },
  disclaimerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 10,
    marginTop: 25,
    opacity: 0.8,
  },
  disclaimerText: {
      marginLeft: 8,
      fontSize: 12,
      color: theme.colors.grey2,
      fontStyle: 'italic',
      textAlign: 'center',
  },
}));

export default QuestionnaireScreen;
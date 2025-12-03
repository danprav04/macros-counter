// src/screens/QuestionnaireScreen.tsx
import React, { useState, useMemo, useEffect, useRef } from 'react';
import { View, ScrollView, Alert, StyleSheet, I18nManager, Platform, LayoutAnimation } from 'react-native';
import { Input, Button, Text, useTheme, makeStyles, ButtonGroup, Icon } from '@rneui/themed';
import { Picker } from '@react-native-picker/picker';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { 
  QuestionnaireFormData, 
  Sex, 
  ActivityLevel, 
  PrimaryGoal, 
  GoalIntensity, 
  CalculatedGoals, 
  CalculationMethod, 
  JobActivity, 
  ExerciseIntensity 
} from '../types/questionnaire';
import { Settings } from '../types/settings';
import { loadSettings, saveSettings } from '../services/storageService';
import i18n, { t } from '../localization/i18n';
import Toast from 'react-native-toast-message';
import { useAuth, AuthContextType } from '../context/AuthContext';

type SettingsStackParamList = {
  SettingsScreen: undefined;
  QuestionnaireScreen: undefined;
};

type QuestionnaireNavigationProp = NativeStackNavigationProp<SettingsStackParamList, 'QuestionnaireScreen'>;

// MET Values from 2024 Compendium
const METS = {
  SLEEP: 0.95,
  SITTING: 1.3,
  STANDING: 2.5,
  MANUAL: 3.5,
  HEAVY: 5.0,
  RESISTANCE_LIGHT: 3.5,
  RESISTANCE_MODERATE: 5.0,
  RESISTANCE_VIGOROUS: 6.0,
  CARDIO_LIGHT: 5.0,
  CARDIO_MODERATE: 7.0, // e.g. Jogging
  CARDIO_VIGOROUS: 9.8, // e.g. Running 6mph
  RESIDUAL: 1.3
};

const QuestionnaireScreen: React.FC = () => {
  const { theme } = useTheme();
  const styles = useStyles();
  const navigation = useNavigation<QuestionnaireNavigationProp>();
  const { settings } = useAuth() as AuthContextType;

  // Default Initial State
  const defaultFormData: QuestionnaireFormData = {
    method: CalculationMethod.BASIC,
    age: '',
    sex: '',
    height: '',
    weight: '',
    activityLevel: '', // Basic only
    primaryGoal: '',
    goalIntensity: GoalIntensity.MODERATE,
    bodyFat: '',
    sleepHours: '7.5',
    jobActivity: '',
    resistanceHours: '0',
    resistanceIntensity: ExerciseIntensity.MODERATE,
    cardioHours: '0',
    cardioIntensity: ExerciseIntensity.MODERATE,
  };

  // Initialize state with draft from settings if available, otherwise default
  const [formData, setFormData] = useState<QuestionnaireFormData>(() => {
    if (settings?.questionnaireDraft) {
        return { ...defaultFormData, ...settings.questionnaireDraft };
    }
    return defaultFormData;
  });

  // Local state for method selector (derived from formData to keep in sync)
  const [method, setMethod] = useState<CalculationMethod>(formData.method);

  const [errors, setErrors] = useState<Partial<Record<keyof QuestionnaireFormData, string>>>({});
  const [isCalculating, setIsCalculating] = useState(false);

  // Auto-save draft effect
  useEffect(() => {
    const saveDraft = async () => {
        if (!settings) return;
        try {
            const updatedSettings: Settings = {
                ...settings,
                questionnaireDraft: formData
            };
            await saveSettings(updatedSettings);
        } catch (error) {
            console.warn("Failed to save questionnaire draft", error);
        }
    };

    const timeoutId = setTimeout(saveDraft, 500); // Debounce save by 500ms
    return () => clearTimeout(timeoutId);
  }, [formData, settings]);

  // Options
  const methodButtons = [t('questionnaireScreen.methodBasic'), t('questionnaireScreen.methodAdvanced')];
  
  const sexOptions = useMemo(() => [
    { label: t('questionnaireScreen.sex.select'), value: '' },
    { label: t('questionnaireScreen.sex.male'), value: Sex.MALE },
    { label: t('questionnaireScreen.sex.female'), value: Sex.FEMALE },
  ], [i18n.locale]);

  const activityLevelOptions = useMemo(() => [
    { label: t('questionnaireScreen.activityLevel.select'), value: '' },
    { label: t('questionnaireScreen.activityLevel.sedentary'), value: ActivityLevel.SEDENTARY },
    { label: t('questionnaireScreen.activityLevel.light'), value: ActivityLevel.LIGHT },
    { label: t('questionnaireScreen.activityLevel.moderate'), value: ActivityLevel.MODERATE },
    { label: t('questionnaireScreen.activityLevel.active'), value: ActivityLevel.ACTIVE },
    { label: t('questionnaireScreen.activityLevel.veryActive'), value: ActivityLevel.VERY_ACTIVE },
  ], [i18n.locale]);

  const jobOptions = useMemo(() => [
    { label: t('questionnaireScreen.jobActivity.select'), value: '' },
    { label: t('questionnaireScreen.jobActivity.sitting'), value: JobActivity.SITTING },
    { label: t('questionnaireScreen.jobActivity.standing'), value: JobActivity.STANDING },
    { label: t('questionnaireScreen.jobActivity.manual'), value: JobActivity.MANUAL },
    { label: t('questionnaireScreen.jobActivity.heavy'), value: JobActivity.HEAVY },
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

  const toggleMethod = (index: number) => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    const newMethod = index === 0 ? CalculationMethod.BASIC : CalculationMethod.ADVANCED;
    setMethod(newMethod);
    handleInputChange('method', newMethod);
  };

  const validateForm = (): boolean => {
    const newErrors: Partial<Record<keyof QuestionnaireFormData, string>> = {};
    const ageNum = parseFloat(formData.age);
    const heightNum = parseFloat(formData.height);
    const weightNum = parseFloat(formData.weight);

    if (!formData.age.trim() || isNaN(ageNum) || ageNum <= 0 || ageNum > 120) newErrors.age = t('questionnaireScreen.validation.invalidAge');
    if (formData.sex === '') newErrors.sex = t('questionnaireScreen.validation.selectSex');
    if (!formData.height.trim() || isNaN(heightNum) || heightNum <= 50 || heightNum > 250) newErrors.height = t('questionnaireScreen.validation.invalidHeight');
    if (!formData.weight.trim() || isNaN(weightNum) || weightNum <= 20 || weightNum > 300) newErrors.weight = t('questionnaireScreen.validation.invalidWeight');
    if (formData.primaryGoal === '') newErrors.primaryGoal = t('questionnaireScreen.validation.selectPrimaryGoal');
    if (formData.primaryGoal !== PrimaryGoal.MAINTAIN_WEIGHT && !formData.goalIntensity) newErrors.goalIntensity = t('questionnaireScreen.validation.selectGoalIntensity');

    if (method === CalculationMethod.BASIC) {
      if (formData.activityLevel === '') newErrors.activityLevel = t('questionnaireScreen.validation.selectActivityLevel');
    } else {
      if (formData.jobActivity === '') newErrors.jobActivity = t('questionnaireScreen.validation.selectJobActivity');
      if (isNaN(parseFloat(formData.sleepHours || '0'))) newErrors.sleepHours = "Invalid sleep hours";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const calculateGoals = (): CalculatedGoals | null => {
    const age = parseFloat(formData.age);
    const height = parseFloat(formData.height);
    const weight = parseFloat(formData.weight);
    const bodyFat = formData.bodyFat ? parseFloat(formData.bodyFat) : 0;
    const hasBodyFat = !isNaN(bodyFat) && bodyFat > 0;

    let bmr: number;
    if (hasBodyFat && method === CalculationMethod.ADVANCED) {
      const lbm = weight * (1 - bodyFat / 100);
      bmr = 370 + (21.6 * lbm);
    } else {
      if (formData.sex === Sex.MALE) {
        bmr = 10 * weight + 6.25 * height - 5 * age + 5;
      } else {
        bmr = 10 * weight + 6.25 * height - 5 * age - 161;
      }
    }

    let tdee: number;

    if (method === CalculationMethod.BASIC) {
      let activityMultiplier = 1.2;
      switch (formData.activityLevel) {
        case ActivityLevel.SEDENTARY: activityMultiplier = 1.2; break;
        case ActivityLevel.LIGHT: activityMultiplier = 1.375; break;
        case ActivityLevel.MODERATE: activityMultiplier = 1.55; break;
        case ActivityLevel.ACTIVE: activityMultiplier = 1.725; break;
        case ActivityLevel.VERY_ACTIVE: activityMultiplier = 1.9; break;
      }
      tdee = bmr * activityMultiplier;
    } else {
      const sleepHrs = parseFloat(formData.sleepHours || '7.5');
      const workHrs = 8;
      const resHrsWeek = parseFloat(formData.resistanceHours || '0');
      const cardioHrsWeek = parseFloat(formData.cardioHours || '0');
      
      const resDailyAvg = resHrsWeek / 7;
      const cardioDailyAvg = cardioHrsWeek / 7;
      
      let workMet = METS.SITTING;
      switch (formData.jobActivity) {
        case JobActivity.STANDING: workMet = METS.STANDING; break;
        case JobActivity.MANUAL: workMet = METS.MANUAL; break;
        case JobActivity.HEAVY: workMet = METS.HEAVY; break;
      }

      let resMet = METS.RESISTANCE_MODERATE;
      if (formData.resistanceIntensity === ExerciseIntensity.LIGHT) resMet = METS.RESISTANCE_LIGHT;
      if (formData.resistanceIntensity === ExerciseIntensity.VIGOROUS) resMet = METS.RESISTANCE_VIGOROUS;

      let cardioMet = METS.CARDIO_MODERATE;
      if (formData.cardioIntensity === ExerciseIntensity.LIGHT) cardioMet = METS.CARDIO_LIGHT;
      if (formData.cardioIntensity === ExerciseIntensity.VIGOROUS) cardioMet = METS.CARDIO_VIGOROUS;

      const residualHrs = Math.max(0, 24 - sleepHrs - workHrs - resDailyAvg - cardioDailyAvg);

      const totalMetHours = 
        (sleepHrs * METS.SLEEP) + 
        (workHrs * workMet) + 
        (resDailyAvg * resMet) + 
        (cardioDailyAvg * cardioMet) + 
        (residualHrs * METS.RESIDUAL);
      
      const customPAL = totalMetHours / 24;
      tdee = bmr * customPAL;
    }

    let calorieAdjustment = 0;
    if (formData.primaryGoal !== PrimaryGoal.MAINTAIN_WEIGHT) {
      const isCutting = formData.primaryGoal === PrimaryGoal.LOSE_WEIGHT;
      const mild = isCutting ? -300 : 200;
      const moderate = isCutting ? -500 : 350;
      const aggressive = isCutting ? -750 : 500;

      switch (formData.goalIntensity) {
        case GoalIntensity.MILD: calorieAdjustment = mild; break;
        case GoalIntensity.MODERATE: calorieAdjustment = moderate; break;
        case GoalIntensity.AGGRESSIVE: calorieAdjustment = aggressive; break;
        default: calorieAdjustment = moderate;
      }
    }
    let calorieGoal = tdee + calorieAdjustment;

    const minCalories = formData.sex === Sex.FEMALE ? 1200 : 1500;
    if (calorieGoal < minCalories) {
      calorieGoal = minCalories;
      Toast.show({ type: 'info', text1: t('questionnaireScreen.toast.minCaloriesAdjustedTitle'), text2: t('questionnaireScreen.toast.minCaloriesAdjustedMessage', { calories: minCalories }), position: 'bottom' });
    }

    let proteinPerKg = 1.6;
    if (method === CalculationMethod.ADVANCED && formData.primaryGoal === PrimaryGoal.LOSE_WEIGHT) {
        proteinPerKg = 2.2;
    } else if (formData.primaryGoal === PrimaryGoal.GAIN_MUSCLE) {
        proteinPerKg = 2.0;
    } else if (formData.activityLevel === ActivityLevel.SEDENTARY && method === CalculationMethod.BASIC) {
        proteinPerKg = 1.2;
    }

    const weightBasis = (hasBodyFat && method === CalculationMethod.ADVANCED) ? (weight * (1 - bodyFat / 100)) : weight;
    const effectiveProteinGrams = Math.round(proteinPerKg * weightBasis);
    const proteinCalories = effectiveProteinGrams * 4;

    let fatPerKg = 0.9;
    if (formData.primaryGoal === PrimaryGoal.LOSE_WEIGHT && formData.goalIntensity === GoalIntensity.AGGRESSIVE) {
        fatPerKg = 0.7;
    }
    const fatGrams = Math.round(fatPerKg * weight);
    const fatCalories = fatGrams * 9;

    const remainingCalories = Math.max(0, calorieGoal - proteinCalories - fatCalories);
    const carbGrams = Math.round(remainingCalories / 4);

    return {
      calories: Math.round(calorieGoal),
      protein: effectiveProteinGrams,
      carbs: carbGrams,
      fat: fatGrams,
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
          hasCompletedEstimation: true,
          questionnaireDraft: formData 
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
      <View style={styles.header}>
        {/* Title Removed to avoid duplication with Header */}
        <ButtonGroup
          onPress={toggleMethod}
          selectedIndex={method === CalculationMethod.BASIC ? 0 : 1}
          buttons={methodButtons}
          containerStyle={styles.methodGroup}
          buttonContainerStyle={{ backgroundColor: 'transparent' }}
          buttonStyle={{ backgroundColor: 'transparent' }}
          selectedButtonStyle={{ backgroundColor: theme.colors.primary }}
          textStyle={{ color: theme.colors.grey3, fontSize: 13, textAlign: 'center' }}
          selectedTextStyle={{ color: 'white', fontWeight: 'bold' }}
          innerBorderStyle={{ color: theme.colors.primary }}
        />
        <Text style={styles.methodDescription}>
            {method === CalculationMethod.BASIC ? 
                "Standard equation (Mifflin-St Jeor). Fast and reliable for general population." : 
                "Precise modeling (Katch-McArdle + Factorial). Uses body fat and activity breakdown for high accuracy."}
        </Text>
        <View style={styles.disclaimerContainer}>
          <Icon name="alert-circle-outline" type="material-community" color={theme.colors.grey3} size={16} />
          <Text style={styles.disclaimerText}>{t('disclaimers.medicalDisclaimer')}</Text>
        </View>
      </View>

      <Text style={styles.sectionHeader}>{t('questionnaireScreen.sectionBiometrics')}</Text>
      <Input
        label={t('questionnaireScreen.ageLabel')}
        placeholder={t('questionnaireScreen.agePlaceholder')}
        keyboardType="numeric"
        value={formData.age}
        onChangeText={val => handleInputChange('age', val)}
        errorMessage={errors.age}
        inputStyle={styles.input}
        labelStyle={styles.label}
        errorStyle={styles.errorText}
        containerStyle={styles.inputContainer}
      />

      {renderPicker(t('questionnaireScreen.sexLabel'), formData.sex, (val) => handleInputChange('sex', val), sexOptions, errors.sex)}

      <View style={styles.row}>
        <View style={{flex: 1}}>
            <Input
                label={t('questionnaireScreen.heightLabel')}
                placeholder={t('questionnaireScreen.heightPlaceholder')}
                keyboardType="numeric"
                value={formData.height}
                onChangeText={val => handleInputChange('height', val)}
                errorMessage={errors.height}
                rightIcon={<Text style={styles.unitText}>cm</Text>}
                inputStyle={styles.input}
                labelStyle={styles.label}
                errorStyle={styles.errorText}
                containerStyle={styles.inputContainer}
            />
        </View>
        <View style={{flex: 1}}>
            <Input
                label={t('questionnaireScreen.weightLabel')}
                placeholder={t('questionnaireScreen.weightPlaceholder')}
                keyboardType="numeric"
                value={formData.weight}
                onChangeText={val => handleInputChange('weight', val)}
                errorMessage={errors.weight}
                rightIcon={<Text style={styles.unitText}>kg</Text>}
                inputStyle={styles.input}
                labelStyle={styles.label}
                errorStyle={styles.errorText}
                containerStyle={styles.inputContainer}
            />
        </View>
      </View>

      {method === CalculationMethod.ADVANCED && (
        <Input
            label={t('questionnaireScreen.bodyFatLabel')}
            placeholder={t('questionnaireScreen.bodyFatPlaceholder')}
            keyboardType="numeric"
            value={formData.bodyFat}
            onChangeText={val => handleInputChange('bodyFat', val)}
            rightIcon={<Text style={styles.unitText}>%</Text>}
            inputStyle={styles.input}
            labelStyle={styles.label}
            containerStyle={styles.inputContainer}
        />
      )}

      <Text style={styles.sectionHeader}>{t('questionnaireScreen.sectionActivity')}</Text>
      
      {method === CalculationMethod.BASIC ? (
        renderPicker(t('questionnaireScreen.activityLevelLabel'), formData.activityLevel, (val) => handleInputChange('activityLevel', val), activityLevelOptions, errors.activityLevel)
      ) : (
        <>
            {renderPicker(t('questionnaireScreen.jobActivityLabel'), formData.jobActivity || '', (val) => handleInputChange('jobActivity', val), jobOptions, errors.jobActivity)}
            
            <Input
                label={t('questionnaireScreen.sleepLabel')}
                placeholder={t('questionnaireScreen.sleepPlaceholder')}
                keyboardType="numeric"
                value={formData.sleepHours}
                onChangeText={val => handleInputChange('sleepHours', val)}
                inputStyle={styles.input}
                labelStyle={styles.label}
                containerStyle={styles.inputContainer}
            />

            <Input
                label={t('questionnaireScreen.resistanceHoursLabel')}
                placeholder={t('questionnaireScreen.resistanceHoursPlaceholder')}
                keyboardType="numeric"
                value={formData.resistanceHours}
                onChangeText={val => handleInputChange('resistanceHours', val)}
                inputStyle={styles.input}
                labelStyle={styles.label}
                containerStyle={styles.inputContainer}
            />
            
            <Input
                label={t('questionnaireScreen.cardioHoursLabel')}
                placeholder={t('questionnaireScreen.cardioHoursPlaceholder')}
                keyboardType="numeric"
                value={formData.cardioHours}
                onChangeText={val => handleInputChange('cardioHours', val)}
                inputStyle={styles.input}
                labelStyle={styles.label}
                containerStyle={styles.inputContainer}
            />
        </>
      )}

      <Text style={styles.sectionHeader}>{t('questionnaireScreen.sectionGoal')}</Text>
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
        icon={<Icon name="calculator" type="material-community" color="white" style={{marginRight: 10}}/>}
      />
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
    paddingBottom: 50,
  },
  header: {
    marginBottom: 20,
    alignItems: 'center',
  },
  title: {
    marginBottom: 15,
    textAlign: 'center',
    color: theme.colors.text,
  },
  methodGroup: {
    height: 48,
    borderRadius: 8,
    marginBottom: 10,
    width: '100%',
    borderColor: theme.colors.primary,
    backgroundColor: theme.colors.background, // Ensure background matches theme to avoid transparent white-on-white
  },
  methodDescription: {
    textAlign: 'center',
    fontSize: 12,
    color: theme.colors.grey3,
    paddingHorizontal: 10,
  },
  sectionHeader: {
    fontSize: 18,
    fontWeight: 'bold',
    color: theme.colors.primary,
    marginTop: 15,
    marginBottom: 15,
    borderLeftWidth: 3,
    borderLeftColor: theme.colors.primary,
    paddingLeft: 10,
    textAlign: I18nManager.isRTL ? 'right' : 'left',
  },
  inputContainer: {
    marginBottom: 5,
  },
  input: {
    textAlign: I18nManager.isRTL ? 'right' : 'left', 
    color: theme.colors.text
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  label: {
    color: theme.colors.secondary,
    fontWeight: '600',
    marginBottom: 5,
    fontSize: 15,
    textAlign: I18nManager.isRTL ? 'right' : 'left',
  },
  unitText: {
    color: theme.colors.secondary,
    fontSize: 16,
  },
  pickerWrapper: {
    borderColor: theme.colors.grey3,
    borderWidth: 1, // Added border for visibility
    borderRadius: 8,
    backgroundColor: theme.colors.background,
    justifyContent: 'center',
    marginBottom: 15,
    overflow: 'hidden', // iOS
  },
  picker: {
    height: Platform.OS === 'ios' ? 120 : 55,
    width: '100%',
  },
  pickerItem: {
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
    marginTop: 30,
    backgroundColor: theme.colors.primary,
    borderRadius: 8,
    paddingVertical: 12,
  },
  disclaimerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 10,
    marginTop: 10,
    opacity: 0.8,
  },
  disclaimerText: {
      marginLeft: 8,
      fontSize: 12,
      color: theme.colors.grey3,
      fontStyle: 'italic',
      textAlign: 'center',
  },
}));

export default QuestionnaireScreen;
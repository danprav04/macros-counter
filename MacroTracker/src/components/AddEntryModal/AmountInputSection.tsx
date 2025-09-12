// src/components/AddEntryModal/AmountInputSection.tsx
import React, { useRef, useEffect } from 'react';
import { View, ScrollView, TouchableOpacity, Keyboard } from 'react-native';
import { Text, Input, Icon, ButtonGroup, Button, useTheme, makeStyles } from '@rneui/themed';
import { Food } from '../../types/food';
import { FoodGradeResult } from '../../utils/gradingUtils';
import { isValidNumberInput } from '../../utils/validationUtils';
import { t } from '../../localization/i18n';
import { useCosts } from '../../context/CostsContext';
import PriceTag from '../PriceTag';

type UnitMode = "grams" | "auto";

interface AmountInputSectionProps {
    selectedFood: Food;
    grams: string;
    setGrams: (grams: string) => void;
    unitMode: UnitMode;
    setUnitMode: (mode: UnitMode) => void;
    autoInput: string;
    setAutoInput: (input: string) => void;
    handleEstimateGrams: () => void;
    isAiLoading: boolean;
    isAiButtonDisabled: boolean;
    isEditMode: boolean;
    servingSizeSuggestions: { label: string; value: string }[];
    isActionDisabled: boolean;
    foodGradeResult: FoodGradeResult | null;
}

const AmountInputSection: React.FC<AmountInputSectionProps> = ({
    selectedFood,
    grams,
    setGrams,
    unitMode,
    setUnitMode,
    autoInput,
    setAutoInput,
    handleEstimateGrams,
    isAiLoading,
    isAiButtonDisabled,
    isEditMode,
    servingSizeSuggestions,
    isActionDisabled,
    foodGradeResult,
}) => {
    const { theme } = useTheme();
    const styles = useStyles();
    const gramsInputRef = useRef<any>(null);
    const { costs } = useCosts();

    useEffect(() => {
        if (isEditMode && unitMode === "grams") {
            const timer = setTimeout(() => {
                gramsInputRef.current?.focus();
            }, 150);
            return () => clearTimeout(timer);
        }
    }, [isEditMode, unitMode]);


    const handleGramsChange = (text: string) => {
        const cleanedText = text.replace(/[^0-9.]/g, "").replace(/(\..*?)\./g, "$1");
        setGrams(cleanedText);
    };

    return (
        <View style={styles.amountSection}>
            <View style={styles.unitSelectorContainer}>
                <View style={styles.amountLabelContainer}>
                    <Text style={styles.inputLabel}>{t('addEntryModal.amount')}</Text>
                    {foodGradeResult && (
                        <Text style={[styles.gradePill, { backgroundColor: foodGradeResult.color }]}>
                            {foodGradeResult.letter}
                        </Text>
                    )}
                </View>
                {!isEditMode && (
                    <View style={styles.buttonGroupWrapper}>
                        <ButtonGroup
                            buttons={[t('addEntryModal.grams'), t('addEntryModal.autoAi')]}
                            selectedIndex={unitMode === "grams" ? 0 : 1}
                            onPress={(index) => {
                                if (!isActionDisabled) {
                                    setUnitMode(index === 0 ? "grams" : "auto");
                                    Keyboard.dismiss();
                                }
                            }}
                            containerStyle={styles.buttonGroupContainer}
                            selectedButtonStyle={{ backgroundColor: theme.colors.primary }}
                            textStyle={styles.buttonGroupText}
                            selectedTextStyle={{ color: theme.colors.white }}
                            disabled={isActionDisabled ? [0, 1] : []}
                            disabledStyle={styles.disabledButtonGroup}
                            disabledTextStyle={{ color: theme.colors.grey3 }}
                        />
                        {unitMode === 'auto' && costs?.cost_grams_natural_language != null && (
                            <PriceTag amount={costs.cost_grams_natural_language} type="cost" style={{ marginLeft: 8 }} />
                        )}
                    </View>
                )}
            </View>
            {unitMode === 'auto' && !isEditMode && (
                 <View style={styles.aiDisclaimerContainer}>
                    <Icon name="information-outline" type="material-community" color={theme.colors.grey2} size={16} />
                    <Text style={styles.aiDisclaimerText}>{t('disclaimers.aiWarning')}</Text>
                </View>
            )}
            {unitMode === "grams" && (
                <>
                    {!isEditMode && servingSizeSuggestions.length > 0 && (
                        <View style={styles.servingSizeRow}>
                            <Text style={styles.servingSizeLabel}>{t('addEntryModal.quickAddServing')}</Text>
                            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.servingSizeContainer} keyboardShouldPersistTaps="handled">
                                {servingSizeSuggestions.map((suggestion) => (
                                    <TouchableOpacity
                                        key={suggestion.label}
                                        style={[styles.servingSizeButton, isActionDisabled && styles.disabledOverlay]}
                                        onPress={() => {
                                            if (!isActionDisabled) {
                                                setGrams(suggestion.value);
                                                Keyboard.dismiss();
                                            }
                                        }}
                                        disabled={isActionDisabled}
                                    >
                                        <Text style={styles.servingSizeButtonTitle}>{suggestion.label}</Text>
                                    </TouchableOpacity>
                                ))}
                            </ScrollView>
                        </View>
                    )}
                    <Input
                        ref={gramsInputRef}
                        placeholder={isEditMode ? t('addEntryModal.gramsPlaceholderEdit') : t('addEntryModal.gramsPlaceholder')}
                        keyboardType="numeric"
                        value={grams}
                        onChangeText={handleGramsChange}
                        inputStyle={styles.gramInputStyle}
                        inputContainerStyle={styles.gramInputContainerStyle}
                        errorMessage={!isValidNumberInput(grams) && grams !== "" && grams !== "." ? t('addEntryModal.gramsError') : ""}
                        errorStyle={{ color: theme.colors.error }}
                        rightIcon={<Text style={styles.unitText}>g</Text>}
                        containerStyle={{ paddingHorizontal: 0 }}
                        key={`grams-input-${selectedFood.id}-${isEditMode}`}
                        disabled={isActionDisabled}
                        autoFocus={!isEditMode}
                        selectTextOnFocus={true}
                    />
                </>
            )}
            {unitMode === "auto" && !isEditMode && (
                <View style={styles.autoInputRow}>
                    <Input
                        placeholder={t('addEntryModal.autoPlaceholder')}
                        value={autoInput}
                        onChangeText={setAutoInput}
                        inputStyle={[styles.gramInputStyle, styles.autoInputField]}
                        inputContainerStyle={styles.gramInputContainerStyle}
                        containerStyle={styles.autoInputContainer}
                        multiline={false}
                        onSubmitEditing={handleEstimateGrams}
                        key={`auto-input-${selectedFood.id}`}
                        disabled={isActionDisabled}
                        autoFocus
                    />
                    <Button
                        onPress={() => { Keyboard.dismiss(); handleEstimateGrams(); }}
                        disabled={isAiButtonDisabled || isActionDisabled}
                        loading={isAiLoading}
                        buttonStyle={styles.aiButton}
                        icon={isAiLoading ? undefined : (
                            <Icon name="calculator-variant" type="material-community" size={20} color={theme.colors.white} />
                        )}
                        title={isAiLoading ? "" : ""}
                    />
                </View>
            )}
        </View>
    );
};

const useStyles = makeStyles((theme) => ({
    amountSection: {
        marginTop: 10,
        borderTopWidth: 1,
        borderTopColor: theme.colors.divider,
        paddingTop: 15,
        paddingHorizontal: 0,
    },
    unitSelectorContainer: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        marginBottom: 15,
        paddingHorizontal: 5,
    },
    amountLabelContainer: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    gradePill: {
        fontSize: 11,
        fontWeight: 'bold',
        color: theme.colors.white,
        paddingHorizontal: 5,
        paddingVertical: 1.5,
        borderRadius: 7,
        marginLeft: 8,
        minWidth: 18,
        textAlign: 'center',
        overflow: 'hidden',
    },
    inputLabel: {
        fontWeight: "600",
        color: theme.colors.secondary,
        fontSize: 14,
        marginRight: 0,
        textTransform: "uppercase",
        textAlign: 'left',
    },
    buttonGroupWrapper: {
        flexDirection: 'row',
        alignItems: 'center',
        flex: 0.7,
        justifyContent: 'flex-end',
    },
    buttonGroupContainer: {
        flex: 1,
        maxWidth: 220,
        height: 35,
        borderRadius: 8,
        borderColor: theme.colors.primary,
        borderWidth: 1,
        backgroundColor: theme.colors.background,
    },
    buttonGroupText: {
        fontSize: 14,
        color: theme.colors.text,
    },
    disabledButtonGroup: {
        backgroundColor: theme.colors.grey5,
    },
    aiDisclaimerContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 5,
        marginBottom: 12,
        opacity: 0.8,
    },
    aiDisclaimerText: {
        marginLeft: 5,
        fontSize: 12,
        color: theme.colors.grey2,
        fontStyle: 'italic',
        flexShrink: 1,
    },
    servingSizeRow: {
        flexDirection: "row",
        alignItems: "center",
        marginBottom: 12,
        paddingHorizontal: 5,
    },
    servingSizeLabel: {
        color: theme.colors.secondary,
        fontSize: 13,
        marginRight: 8,
        textAlign: 'left',
    },
    servingSizeContainer: {
        flexGrow: 0,
    },
    servingSizeButton: {
        backgroundColor: theme.colors.primaryLight,
        borderRadius: 15,
        marginRight: 8,
        paddingHorizontal: 12,
        paddingVertical: 5,
        justifyContent: "center",
        alignItems: "center",
        height: 30,
    },
    servingSizeButtonTitle: {
        color: theme.colors.primary,
        fontSize: 13,
        fontWeight: '500',
    },
    gramInputStyle: {
        color: theme.colors.text,
        fontSize: 16,
        paddingVertical: 8,
        height: 40,
        textAlign: 'left',
    },
    gramInputContainerStyle: {
        borderBottomColor: theme.colors.grey3,
        paddingHorizontal: 5,
    },
    unitText: {
        color: theme.colors.secondary,
        fontSize: 15,
        fontWeight: "500",
        paddingRight: 5,
    },
    autoInputRow: {
        flexDirection: "row",
        alignItems: "center",
        paddingHorizontal: 0,
    },
    autoInputContainer: {
        flex: 1,
        paddingHorizontal: 0,
        marginRight: 10,
    },
    autoInputField: {
        height: 40,
    },
    aiButton: {
        backgroundColor: theme.colors.secondary,
        borderRadius: 20,
        width: 40,
        height: 40,
        padding: 0,
        justifyContent: "center",
        alignItems: "center",
        minWidth: 40,
    },
    disabledOverlay: {
        opacity: 0.6,
    },
}));

export default AmountInputSection;
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
            <View style={styles.headerRow}>
                <View style={styles.labelContainer}>
                    <Text style={styles.sectionLabel}>{t('addEntryModal.amount')}</Text>
                    {foodGradeResult && (
                        <View style={[styles.gradeBadge, { backgroundColor: foodGradeResult.color }]}>
                            <Text style={styles.gradeText}>{foodGradeResult.letter}</Text>
                        </View>
                    )}
                </View>
                
                {!isEditMode && (
                    <View style={styles.controlsRight}>
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
                            innerBorderStyle={{ color: theme.colors.primary }}
                            disabled={isActionDisabled ? [0, 1] : []}
                            disabledStyle={styles.disabledButtonGroup}
                        />
                        {unitMode === 'auto' && costs?.cost_grams_natural_language != null && (
                            <PriceTag amount={costs.cost_grams_natural_language} type="cost" size="small" style={{ marginLeft: 6 }} />
                        )}
                    </View>
                )}
            </View>

            {unitMode === "grams" && (
                <View style={styles.inputWrapper}>
                    <Input
                        ref={gramsInputRef}
                        placeholder={isEditMode ? t('addEntryModal.gramsPlaceholderEdit') : t('addEntryModal.gramsPlaceholder')}
                        keyboardType="numeric"
                        value={grams}
                        onChangeText={handleGramsChange}
                        inputStyle={styles.textInput}
                        inputContainerStyle={styles.inputFieldContainer}
                        containerStyle={styles.containerPadding}
                        errorMessage={!isValidNumberInput(grams) && grams !== "" && grams !== "." ? t('addEntryModal.gramsError') : ""}
                        errorStyle={styles.errorText}
                        rightIcon={<Text style={styles.unitSuffix}>g</Text>}
                        disabled={isActionDisabled}
                        autoFocus={!isEditMode}
                        selectTextOnFocus={true}
                    />
                    
                    {!isEditMode && servingSizeSuggestions.length > 0 && (
                        <ScrollView 
                            horizontal 
                            showsHorizontalScrollIndicator={false} 
                            contentContainerStyle={styles.suggestionsScroll}
                            keyboardShouldPersistTaps="handled"
                        >
                            {servingSizeSuggestions.map((suggestion) => (
                                <TouchableOpacity
                                    key={suggestion.label}
                                    style={[styles.suggestionChip, isActionDisabled && styles.disabledOpacity]}
                                    onPress={() => {
                                        if (!isActionDisabled) {
                                            setGrams(suggestion.value);
                                            Keyboard.dismiss();
                                        }
                                    }}
                                    disabled={isActionDisabled}
                                >
                                    <Text style={styles.suggestionText}>{suggestion.label}</Text>
                                </TouchableOpacity>
                            ))}
                        </ScrollView>
                    )}
                </View>
            )}

            {unitMode === "auto" && !isEditMode && (
                <View style={styles.autoInputWrapper}>
                    <View style={styles.autoInputRow}>
                        <Input
                            placeholder={t('addEntryModal.autoPlaceholder')}
                            value={autoInput}
                            onChangeText={setAutoInput}
                            inputStyle={styles.textInput}
                            inputContainerStyle={styles.inputFieldContainer}
                            containerStyle={[styles.containerPadding, { flex: 1 }]}
                            onSubmitEditing={handleEstimateGrams}
                            disabled={isActionDisabled}
                            autoFocus
                        />
                        <Button
                            onPress={() => { Keyboard.dismiss(); handleEstimateGrams(); }}
                            disabled={isAiButtonDisabled || isActionDisabled}
                            loading={isAiLoading}
                            buttonStyle={styles.aiButton}
                            icon={isAiLoading ? undefined : (
                                <Icon name="calculator-variant" type="material-community" size={22} color={theme.colors.white} />
                            )}
                        />
                    </View>
                </View>
            )}
        </View>
    );
};

const useStyles = makeStyles((theme) => ({
    amountSection: {
        marginTop: 12,
        paddingTop: 16,
        borderTopWidth: 1,
        borderTopColor: theme.colors.divider,
    },
    headerRow: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        marginBottom: 12,
        paddingHorizontal: 4,
    },
    labelContainer: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    sectionLabel: {
        fontSize: 14,
        fontWeight: "600",
        color: theme.colors.text,
        textTransform: "uppercase",
        letterSpacing: 0.5,
    },
    gradeBadge: {
        marginLeft: 8,
        paddingHorizontal: 6,
        paddingVertical: 1,
        borderRadius: 4,
        justifyContent: 'center',
    },
    gradeText: {
        fontSize: 11,
        fontWeight: 'bold',
        color: theme.colors.white,
    },
    controlsRight: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    buttonGroupContainer: {
        height: 32,
        borderRadius: 8,
        borderColor: theme.colors.primary,
        borderWidth: 1,
        backgroundColor: theme.colors.background,
        marginLeft: 0,
        marginRight: 0,
        marginTop: 0,
        marginBottom: 0,
        width: 140,
    },
    buttonGroupText: {
        fontSize: 13,
        color: theme.colors.text,
    },
    disabledButtonGroup: {
        backgroundColor: theme.colors.grey5,
        opacity: 0.5,
    },
    inputWrapper: {
        marginBottom: 8,
    },
    textInput: {
        color: theme.colors.text,
        fontSize: 16,
        paddingLeft: 10,
    },
    inputFieldContainer: {
        borderWidth: 1,
        borderColor: theme.colors.grey3,
        borderRadius: 8,
        paddingHorizontal: 5,
        height: 48,
        backgroundColor: theme.colors.background,
        borderBottomWidth: 1, // Override RNE default
    },
    containerPadding: {
        paddingHorizontal: 0,
    },
    unitSuffix: {
        color: theme.colors.grey3,
        fontSize: 16,
        fontWeight: "600",
        paddingRight: 10,
    },
    errorText: {
        color: theme.colors.error,
        fontSize: 12,
        margin: 4,
    },
    suggestionsScroll: {
        paddingVertical: 8,
        paddingHorizontal: 2,
        alignItems: 'center',
    },
    suggestionChip: {
        backgroundColor: theme.colors.grey5,
        borderRadius: 16,
        paddingHorizontal: 12,
        paddingVertical: 6,
        marginRight: 8,
        borderWidth: 1,
        borderColor: theme.colors.divider,
    },
    suggestionText: {
        color: theme.colors.text,
        fontSize: 13,
        fontWeight: '500',
    },
    disabledOpacity: {
        opacity: 0.5,
    },
    autoInputWrapper: {
        marginBottom: 8,
    },
    autoInputRow: {
        flexDirection: "row",
        alignItems: "flex-start",
    },
    aiButton: {
        backgroundColor: theme.colors.primary,
        borderRadius: 8,
        width: 48,
        height: 48,
        marginLeft: 10,
        padding: 0,
        justifyContent: "center",
        alignItems: "center",
    },
}));

export default AmountInputSection;
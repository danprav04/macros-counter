// src/components/AddEntryModal/ModalHeader.tsx
import React, { useCallback } from 'react';
import { View, TouchableOpacity, ActivityIndicator, StyleSheet, Keyboard } from 'react-native';
import { Text, Icon, Button, useTheme, makeStyles } from '@rneui/themed';
import { Food } from '../../types/food';
import { t } from '../../localization/i18n';
import { useCosts } from '../../context/CostsContext';
import PriceTag from '../PriceTag';

type ModalMode = 'normal' | 'quickAddSelect' | 'quickAddText';

interface ModalHeaderProps {
    title: string;
    isEditMode: boolean;
    modalMode: ModalMode;
    quickAddLoading: boolean;
    textQuickAddLoading: boolean;
    selectedFood: Food | null;
    selectedMultipleFoodsSize: number;
    selectedQuickAddIndicesSize: number;
    editingQuickAddItemIndex: number | null;
    isActionDisabled: boolean;
    isSingleAddButtonDisabled: boolean;
    isMultiAddButtonDisabled: boolean;
    isQuickAddConfirmDisabled: boolean;
    isQuickAddImageButtonDisabled: boolean;
    isQuickAddTextButtonDisabled: boolean;
    isAiLoading: boolean;
    toggleOverlay: () => void;
    onAddOrUpdateSingleEntry: () => void;
    onConfirmAddMultipleSelected: () => void;
    onConfirmQuickAdd: () => void;
    onQuickAddImage: () => void;
    onQuickAddText: () => void;
    onBackFromQuickAdd: () => void;
}

const ModalHeader: React.FC<ModalHeaderProps> = ({
    title, isEditMode, modalMode, quickAddLoading, textQuickAddLoading, selectedFood, selectedMultipleFoodsSize,
    selectedQuickAddIndicesSize, editingQuickAddItemIndex, isActionDisabled, isSingleAddButtonDisabled,
    isMultiAddButtonDisabled, isQuickAddConfirmDisabled, isQuickAddImageButtonDisabled, isQuickAddTextButtonDisabled,
    isAiLoading, toggleOverlay, onAddOrUpdateSingleEntry, onConfirmAddMultipleSelected,
    onConfirmQuickAdd, onQuickAddImage, onQuickAddText, onBackFromQuickAdd,
}) => {
    const { theme } = useTheme();
    const styles = useStyles();
    const { costs } = useCosts();

    const handleClose = () => {
        Keyboard.dismiss();
        toggleOverlay();
    };
    
    const handleBackPress = useCallback(() => {
        if (isActionDisabled) return;
        Keyboard.dismiss();
        onBackFromQuickAdd();
    }, [isActionDisabled, onBackFromQuickAdd]);

    const isBackButtonVisible = (modalMode === 'quickAddSelect' || modalMode === 'quickAddText') && editingQuickAddItemIndex === null;

    return (
        <View style={styles.header}>
            <View style={styles.leftContainer}>
                {isBackButtonVisible ? (
                    <TouchableOpacity 
                        onPress={handleBackPress} 
                        style={styles.iconButton} 
                        disabled={isActionDisabled}
                        hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                    >
                        <Icon name="arrow-back" type="ionicon" size={24} color={isActionDisabled ? theme.colors.grey3 : theme.colors.text} />
                    </TouchableOpacity>
                ) : (
                    <TouchableOpacity 
                        onPress={handleClose} 
                        style={styles.iconButton} 
                        disabled={isActionDisabled} 
                        hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                    >
                        <Icon name="close" type="material" size={24} color={isActionDisabled ? theme.colors.grey3 : theme.colors.text} />
                    </TouchableOpacity>
                )}
            </View>

            <View style={styles.titleContainer}>
                <Text style={[styles.overlayTitle, isEditMode && modalMode === 'normal' && styles.editModeTitle]} numberOfLines={1}>
                    {title}
                </Text>
            </View>

            <View style={styles.rightContainer}>
                {modalMode === 'normal' && (
                    <>
                        {!isEditMode && !selectedFood && (
                            <View style={styles.quickAddGroup}>
                                <View style={styles.actionWrapper}>
                                    <TouchableOpacity 
                                        onPress={onQuickAddText} 
                                        disabled={isQuickAddTextButtonDisabled} 
                                        style={[styles.quickActionButton, isQuickAddTextButtonDisabled && styles.disabledButton]}
                                    >
                                        {quickAddLoading && textQuickAddLoading ? (
                                            <ActivityIndicator size="small" color={theme.colors.primary} />
                                        ) : (
                                            <Icon name="text-box-search-outline" type="material-community" size={20} color={theme.colors.primary} />
                                        )}
                                    </TouchableOpacity>
                                    {costs?.cost_macros_text_multiple != null && (
                                        <PriceTag amount={costs.cost_macros_text_multiple} type="cost" size="small" style={styles.priceTag} />
                                    )}
                                </View>
                                <View style={styles.actionWrapper}>
                                    <TouchableOpacity 
                                        onPress={onQuickAddImage} 
                                        disabled={isQuickAddImageButtonDisabled} 
                                        style={[styles.quickActionButton, isQuickAddImageButtonDisabled && styles.disabledButton]}
                                    >
                                        {quickAddLoading && !textQuickAddLoading ? (
                                            <ActivityIndicator size="small" color={theme.colors.primary} />
                                        ) : (
                                            <Icon name="camera-outline" type="material-community" size={20} color={theme.colors.primary} />
                                        )}
                                    </TouchableOpacity>
                                    {costs?.cost_macros_image_multiple != null && (
                                        <PriceTag amount={costs.cost_macros_image_multiple} type="cost" size="small" style={styles.priceTag} />
                                    )}
                                </View>
                            </View>
                        )}
                        {isEditMode ? (
                            <Button 
                                title={t('addEntryModal.buttonUpdate')} 
                                onPress={onAddOrUpdateSingleEntry} 
                                disabled={isSingleAddButtonDisabled} 
                                buttonStyle={[styles.mainActionButton, styles.updateButton]} 
                                titleStyle={styles.buttonTitle} 
                                loading={isAiLoading && !!selectedFood} 
                            />
                        ) : selectedFood ? (
                            <Button 
                                title={t('addEntryModal.buttonAdd')} 
                                onPress={onAddOrUpdateSingleEntry} 
                                disabled={isSingleAddButtonDisabled} 
                                buttonStyle={styles.mainActionButton} 
                                titleStyle={styles.buttonTitle} 
                                loading={isAiLoading} 
                            />
                        ) : (
                            <Button 
                                title={selectedMultipleFoodsSize > 0 ? t('addEntryModal.buttonAddSelected', { count: selectedMultipleFoodsSize }) : t('addEntryModal.buttonAdd') + " 0"}
                                onPress={onConfirmAddMultipleSelected} 
                                disabled={isMultiAddButtonDisabled} 
                                buttonStyle={[
                                    styles.mainActionButton, 
                                    selectedMultipleFoodsSize > 0 ? { backgroundColor: theme.colors.success } : { backgroundColor: theme.colors.grey3 }
                                ]} 
                                titleStyle={styles.buttonTitle} 
                            />
                        )}
                    </>
                )}
                {modalMode === 'quickAddSelect' && editingQuickAddItemIndex === null && (
                    <Button 
                        title={quickAddLoading ? t('addEntryModal.buttonLoading') : t('addEntryModal.buttonAddSelected', { count: selectedQuickAddIndicesSize })} 
                        onPress={onConfirmQuickAdd} 
                        disabled={isQuickAddConfirmDisabled} 
                        buttonStyle={[styles.mainActionButton, { backgroundColor: theme.colors.success }]} 
                        titleStyle={styles.buttonTitle} 
                        loading={quickAddLoading} 
                    />
                )}
            </View>
        </View>
    );
};

const useStyles = makeStyles((theme) => ({
    header: { 
        flexDirection: 'row', 
        alignItems: 'center', 
        justifyContent: 'space-between', 
        marginBottom: 16, 
        paddingHorizontal: 0,
        height: 44,
    },
    leftContainer: {
        width: 40,
        alignItems: 'flex-start',
    },
    iconButton: {
        padding: 4,
    },
    titleContainer: {
        flex: 1,
        alignItems: 'center',
    },
    overlayTitle: { 
        color: theme.colors.text, 
        fontWeight: '700', 
        fontSize: 18, 
        textAlign: 'center',
    },
    editModeTitle: { 
        color: theme.colors.warning 
    },
    rightContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'flex-end',
        minWidth: 40,
    },
    quickAddGroup: {
        flexDirection: 'row',
        alignItems: 'center',
        marginRight: 8,
    },
    actionWrapper: {
        alignItems: 'center',
        marginHorizontal: 4,
        position: 'relative',
    },
    quickActionButton: {
        width: 36,
        height: 36,
        borderRadius: 18,
        backgroundColor: theme.colors.background,
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 1,
        borderColor: theme.colors.divider,
    },
    disabledButton: {
        opacity: 0.5,
        borderColor: theme.colors.grey1,
    },
    priceTag: {
        position: 'absolute',
        bottom: -8,
        zIndex: 1,
        backgroundColor: theme.colors.card,
        borderWidth: 1,
        borderColor: theme.colors.divider,
        paddingHorizontal: 3,
        paddingVertical: 1,
        borderRadius: 4,
    },
    mainActionButton: { 
        borderRadius: 20, 
        paddingHorizontal: 16, 
        paddingVertical: 8, 
        minWidth: 80, 
        height: 36,
        backgroundColor: theme.colors.primary 
    },
    updateButton: { 
        backgroundColor: theme.colors.warning 
    },
    buttonTitle: { 
        color: theme.colors.white, 
        fontWeight: '600', 
        fontSize: 14 
    },
}));

export default ModalHeader;
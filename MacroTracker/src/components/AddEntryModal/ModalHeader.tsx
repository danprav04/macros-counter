// src/components/AddEntryModal/ModalHeader.tsx
import React from 'react';
import { View, TouchableOpacity, ActivityIndicator, StyleSheet, Keyboard } from 'react-native';
import { Text, Icon, Button, useTheme, makeStyles } from '@rneui/themed';
import { Food } from '../../types/food';
import { t } from '../../localization/i18n';

type ModalMode = 'normal' | 'quickAddSelect';

interface ModalHeaderProps {
    title: string;
    isEditMode: boolean;
    modalMode: ModalMode;
    quickAddLoading: boolean;
    selectedFood: Food | null;
    selectedMultipleFoodsSize: number;
    selectedQuickAddIndicesSize: number;
    editingQuickAddItemIndex: number | null;
    isActionDisabled: boolean;
    isSingleAddButtonDisabled: boolean;
    isMultiAddButtonDisabled: boolean;
    isQuickAddConfirmDisabled: boolean;
    isQuickAddImageButtonDisabled: boolean;
    isAiLoading: boolean; // For loading state on single add/update
    toggleOverlay: () => void;
    onAddOrUpdateSingleEntry: () => void;
    onConfirmAddMultipleSelected: () => void;
    onConfirmQuickAdd: () => void;
    onQuickAddImage: () => void;
    onBackFromQuickAdd: () => void;
}

const ModalHeader: React.FC<ModalHeaderProps> = ({
    title,
    isEditMode,
    modalMode,
    quickAddLoading,
    selectedFood,
    selectedMultipleFoodsSize,
    selectedQuickAddIndicesSize,
    editingQuickAddItemIndex,
    isActionDisabled,
    isSingleAddButtonDisabled,
    isMultiAddButtonDisabled,
    isQuickAddConfirmDisabled,
    isQuickAddImageButtonDisabled,
    isAiLoading,
    toggleOverlay,
    onAddOrUpdateSingleEntry,
    onConfirmAddMultipleSelected,
    onConfirmQuickAdd,
    onQuickAddImage,
    onBackFromQuickAdd,
}) => {
    const { theme } = useTheme();
    const styles = useStyles();

    const handleClose = () => {
        Keyboard.dismiss();
        toggleOverlay();
    };

    return (
        <View style={styles.header}>
            {modalMode === 'quickAddSelect' && editingQuickAddItemIndex === null ? (
                <Button
                    type="clear"
                    onPress={() => { if (isActionDisabled) return; Keyboard.dismiss(); onBackFromQuickAdd(); }}
                    icon={<Icon name="arrow-back" type="ionicon" size={24} color={isActionDisabled ? theme.colors.grey3 : theme.colors.primary} />}
                    containerStyle={styles.closeIconContainer}
                    disabled={isActionDisabled}
                />
            ) : (
                <TouchableOpacity
                    onPress={handleClose}
                    style={styles.closeIconContainer}
                    disabled={isActionDisabled}
                    hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                >
                    <Icon name="close" type="material" size={28} color={isActionDisabled ? theme.colors.grey3 : theme.colors.text} />
                </TouchableOpacity>
            )}

            <Text h4 h4Style={[styles.overlayTitle, isEditMode && modalMode === 'normal' && styles.editModeTitle]} numberOfLines={1} ellipsizeMode="tail">
                {title}
            </Text>

            <View style={styles.headerActionsContainer}>
                {modalMode === 'normal' && (
                    <>
                        {!isEditMode && !selectedFood && (
                            <TouchableOpacity onPress={onQuickAddImage} disabled={isQuickAddImageButtonDisabled} style={styles.headerIcon} hitSlop={{ top: 10, bottom: 10, left: 5, right: 5 }}>
                                {quickAddLoading ? (
                                    <ActivityIndicator size="small" color={theme.colors.primary} />
                                ) : (
                                    <Icon name="camera-burst" type="material-community" size={26} color={isQuickAddImageButtonDisabled ? theme.colors.grey3 : theme.colors.primary} />
                                )}
                            </TouchableOpacity>
                        )}
                        {isEditMode ? (
                            <Button title={t('addEntryModal.buttonUpdate')} onPress={onAddOrUpdateSingleEntry} disabled={isSingleAddButtonDisabled} buttonStyle={[styles.actionButton, styles.updateButton]} titleStyle={styles.buttonTitle} loading={isAiLoading && !!selectedFood} />
                        ) : selectedFood ? (
                            <Button title={t('addEntryModal.buttonAdd')} onPress={onAddOrUpdateSingleEntry} disabled={isSingleAddButtonDisabled} buttonStyle={styles.actionButton} titleStyle={styles.buttonTitle} loading={isAiLoading} />
                        ) : (
                            <Button title={t('addEntryModal.buttonAddSelected', { count: selectedMultipleFoodsSize })} onPress={onConfirmAddMultipleSelected} disabled={isMultiAddButtonDisabled} buttonStyle={[styles.actionButton, { backgroundColor: theme.colors.success }]} titleStyle={styles.buttonTitle} />
                        )}
                    </>
                )}
                {modalMode === 'quickAddSelect' && editingQuickAddItemIndex === null && (
                    <Button title={quickAddLoading ? t('addEntryModal.buttonLoading') : t('addEntryModal.buttonAddSelected', { count: selectedQuickAddIndicesSize })} onPress={onConfirmQuickAdd} disabled={isQuickAddConfirmDisabled} buttonStyle={[styles.actionButton, { backgroundColor: theme.colors.success }]} titleStyle={styles.buttonTitle} loading={quickAddLoading} />
                )}
                {modalMode === 'quickAddSelect' && editingQuickAddItemIndex !== null && (
                     <View style={styles.placeholderActionView} /> // Keep layout consistent when editing in quick add
                )}
            </View>
        </View>
    );
};

const useStyles = makeStyles((theme) => ({
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 15,
        paddingHorizontal: 0,
    },
    closeIconContainer: {
        padding: 5,
        minWidth: 40, // Ensure touchable area
        alignItems: 'flex-start',
    },
    overlayTitle: {
        color: theme.colors.text,
        fontWeight: 'bold',
        fontSize: 20,
        textAlign: 'center',
        flex: 1,
        marginHorizontal: 5,
    },
    editModeTitle: {
        color: theme.colors.warning,
    },
    headerActionsContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        minWidth: 80, // Ensure space for buttons or icons
        justifyContent: 'flex-end',
    },
    headerIcon: {
        paddingHorizontal: 8, // Combined padding for the icon itself
        marginRight: 5,
    },
    actionButton: {
        borderRadius: 20,
        paddingHorizontal: 12,
        paddingVertical: 8,
        minWidth: 70,
        marginLeft: 5, // Spacing between icon and button if both present
        backgroundColor: theme.colors.primary,
    },
    updateButton: {
        backgroundColor: theme.colors.warning,
    },
    buttonTitle: {
        color: theme.colors.white,
        fontWeight: '600',
        fontSize: 14,
    },
    placeholderActionView: { // Used to balance header when no action button is on the right in quick add edit
        width: 70,
        marginLeft: 5,
    },
}));

export default ModalHeader;
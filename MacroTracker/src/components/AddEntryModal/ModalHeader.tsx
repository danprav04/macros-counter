// src/components/AddEntryModal/ModalHeader.tsx
import React, { useCallback } from 'react';
import { View, TouchableOpacity, ActivityIndicator, Keyboard } from 'react-native';
import { Text, Icon, useTheme, makeStyles } from '@rneui/themed';
import { useCosts } from '../../context/CostsContext';
import PriceTag from '../PriceTag';

import { t } from '../../localization/i18n';

type ModalMode = 'normal' | 'quickAddSelect' | 'quickAddText';

interface ModalHeaderProps {
    title: string;
    isEditMode: boolean;
    modalMode: ModalMode;
    quickAddLoading: boolean;
    textQuickAddLoading: boolean;
    editingQuickAddItemIndex: number | null;
    isActionDisabled: boolean;
    isQuickAddImageButtonDisabled: boolean;
    isQuickAddTextButtonDisabled: boolean;
    toggleOverlay: () => void;
    onQuickAddImage: () => void;
    onQuickAddText: () => void;
    onBackFromQuickAdd: () => void;
    selectedFoodId: string | undefined;
    onBackFromFoodSelection: () => void;
    isBackgroundOptionAvailable?: boolean;
    onBackground?: () => void;
}

const ModalHeader: React.FC<ModalHeaderProps> = ({
    title, isEditMode, modalMode, quickAddLoading, textQuickAddLoading,
    editingQuickAddItemIndex, isActionDisabled,
    isQuickAddImageButtonDisabled, isQuickAddTextButtonDisabled,
    toggleOverlay, onQuickAddImage, onQuickAddText, onBackFromQuickAdd,
    selectedFoodId, onBackFromFoodSelection, isBackgroundOptionAvailable, onBackground
}) => {
    const { theme } = useTheme();
    const styles = useStyles();
    const { costs } = useCosts();

    const handleClose = () => {
        Keyboard.dismiss();
        toggleOverlay();
    };

    // Logic for showing back button
    const isQuickAddBack = (modalMode === 'quickAddSelect' || modalMode === 'quickAddText') && editingQuickAddItemIndex === null;
    const isFoodSelectionBack = modalMode === 'normal' && !isEditMode && !!selectedFoodId;

    const isBackButtonVisible = isQuickAddBack || isFoodSelectionBack;

    const handleBackPress = useCallback(() => {
        if (isActionDisabled) return;
        Keyboard.dismiss();
        if (isQuickAddBack) {
            onBackFromQuickAdd();
        } else if (isFoodSelectionBack && onBackFromFoodSelection) {
            onBackFromFoodSelection();
        }
    }, [isActionDisabled, onBackFromQuickAdd, onBackFromFoodSelection, isQuickAddBack, isFoodSelectionBack]);

    return (
        <View style={styles.header}>
            <View style={styles.leftContainer}>
                {isBackButtonVisible ? (
                    <TouchableOpacity
                        onPress={handleBackPress}
                        style={styles.iconButton}
                        disabled={isActionDisabled}
                        hitSlop={{ top: 15, bottom: 15, left: 15, right: 15 }}
                    >
                        <Icon name="arrow-back" type="ionicon" size={30} color={isActionDisabled ? theme.colors.grey3 : theme.colors.text} />
                    </TouchableOpacity>
                ) : (
                    <TouchableOpacity
                        onPress={handleClose}
                        style={styles.iconButton}
                        disabled={isActionDisabled}
                        hitSlop={{ top: 15, bottom: 15, left: 15, right: 15 }}
                    >
                        <Icon name="close" type="material" size={30} color={isActionDisabled ? theme.colors.grey3 : theme.colors.text} />
                    </TouchableOpacity>
                )}
            </View>

            <View style={styles.titleContainer}>
                <Text
                    style={[styles.overlayTitle, isEditMode && modalMode === 'normal' && styles.editModeTitle]}
                    numberOfLines={2}
                    adjustsFontSizeToFit
                    minimumFontScale={0.8}
                >
                    {title}
                </Text>
            </View>

            <View style={styles.rightContainer}>
                {isBackgroundOptionAvailable && (
                    <TouchableOpacity onPress={onBackground} style={styles.backgroundButton} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
                        <Icon name="content-save-move-outline" type="material-community" size={16} color={theme.colors.white} style={{ marginRight: 4 }} />
                        <Text style={styles.backgroundButtonText}>{t('common.runInBackground')}</Text>
                    </TouchableOpacity>
                )}
                {modalMode === 'normal' && !isEditMode && !selectedFoodId && !isBackgroundOptionAvailable && (
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
                                    <Icon name="text-box-search-outline" type="material-community" size={26} color={theme.colors.primary} />
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
                                    <Icon name="camera-outline" type="material-community" size={26} color={theme.colors.primary} />
                                )}
                            </TouchableOpacity>
                            {costs?.cost_macros_image_multiple != null && (
                                <PriceTag amount={costs.cost_macros_image_multiple} type="cost" size="small" style={styles.priceTag} />
                            )}
                        </View>
                    </View>
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
        marginBottom: 10,
        paddingHorizontal: 0,
        minHeight: 56,
        borderBottomWidth: 1,
        borderBottomColor: theme.colors.divider,
        paddingBottom: 8,
    },
    leftContainer: {
        width: 60,
        alignItems: 'flex-start',
        justifyContent: 'center',
    },
    iconButton: {
        padding: 8,
    },
    titleContainer: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
    },
    overlayTitle: {
        color: theme.colors.text,
        fontWeight: '800',
        fontSize: 22,
        textAlign: 'center',
    },
    editModeTitle: {
        color: theme.colors.warning
    },
    rightContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'flex-end',
        minWidth: 60,
    },
    quickAddGroup: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    actionWrapper: {
        alignItems: 'center',
        marginLeft: 12,
        position: 'relative',
    },
    quickActionButton: {
        width: 46,
        height: 46,
        borderRadius: 23,
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
        paddingHorizontal: 4,
        paddingVertical: 1,
        borderRadius: 6,
        elevation: 2,
    },
    backgroundButton: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: theme.colors.primary,
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 20,
        marginRight: 10,
    },
    backgroundButtonText: {
        fontSize: 12,
        fontWeight: 'bold',
        color: theme.colors.white,
    },
}));

export default ModalHeader;
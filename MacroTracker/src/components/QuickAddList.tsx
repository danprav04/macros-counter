// src/components/QuickAddList.tsx
// ---------- src/components/QuickAddList.tsx ----------
import React from 'react';
import {
    View,
    FlatList,
    TouchableOpacity,
    Pressable,
    ActivityIndicator,
    Image,
} from 'react-native';
import {
    ListItem,
    CheckBox,
    Input,
    Icon,
    Text,
    useTheme,
    makeStyles,
} from '@rneui/themed';
import { EstimatedFoodItem } from '../types/macros';
import { isValidNumberInput } from '../utils/validationUtils';
import { t } from '../localization/i18n';

interface QuickAddListProps {
    items: EstimatedFoodItem[];
    selectedIndices: Set<number>;
    editingIndex: number | null;
    editedName: string;
    editedGrams: string;
    onToggleItem: (index: number) => void;
    onEditItem: (index: number) => void;
    onSaveEdit: () => void;
    onCancelEdit: () => void;
    onNameChange: (name: string) => void;
    onGramsChange: (grams: string) => void;
    style?: object;
    isLoading?: boolean;
    foodIcons: { [foodName: string]: string | null | undefined };
}

const QuickAddList: React.FC<QuickAddListProps> = ({
    items,
    selectedIndices,
    editingIndex,
    editedName,
    editedGrams,
    onToggleItem,
    onEditItem,
    onSaveEdit,
    onCancelEdit,
    onNameChange,
    onGramsChange,
    style,
    isLoading,
    foodIcons,
}) => {
    const { theme } = useTheme();
    const styles = useStyles();

    const renderFoodIcon = (foodName: string) => {
        const iconStatus = foodIcons[foodName];
        if (iconStatus === undefined) { // Loading
            return (
                <View style={[styles.foodIconContainer, styles.iconPlaceholder]}>
                    <ActivityIndicator size="small" color={theme.colors.grey3} />
                </View>
            );
        } else if (iconStatus) { // Icon URL available
            return <Image source={{ uri: iconStatus }} style={styles.foodIconImage} resizeMode="contain" />;
        } else { // Null (error or no icon found) or explicit placeholder
            return (
                <View style={[styles.foodIconContainer, styles.iconPlaceholder]}>
                    <Icon name="image-off-outline" type="material-community" size={18} color={theme.colors.grey3} />
                </View>
            );
        }
    };


    const renderItem = ({ item, index }: { item: EstimatedFoodItem; index: number }) => {
        const isSelected = selectedIndices.has(index);
        const isEditingThisItem = editingIndex === index;
        const isAnyItemEditing = editingIndex !== null;
        const estimatedCalories = Math.round(
            (item.calories_per_100g / 100) * item.estimatedWeightGrams
        );

        return (
            <Pressable
                onPress={() => !isEditingThisItem && onToggleItem(index)}
                disabled={(isAnyItemEditing && !isEditingThisItem) || isLoading}
            >
                <ListItem
                    bottomDivider
                    containerStyle={[
                        styles.quickAddItemContainer,
                        isEditingThisItem && styles.quickAddItemEditing,
                        isSelected && !isEditingThisItem && styles.quickAddItemSelected, // Don't apply selected style if editing
                        (isAnyItemEditing && !isEditingThisItem && styles.disabledItem),
                        isLoading && styles.disabledItem,
                    ]}
                >
                    {isEditingThisItem ? (
                        <View style={styles.quickAddEditView}>
                             <View style={styles.editIconAndNameRow}>
                                {renderFoodIcon(item.foodName)}
                                <Input
                                    value={editedName}
                                    onChangeText={onNameChange}
                                    placeholder={t('quickAddList.foodNamePlaceholder')}
                                    inputContainerStyle={styles.quickEditInputContainer}
                                    inputStyle={styles.quickEditInput}
                                    containerStyle={styles.quickEditNameContainer}
                                    autoFocus
                                    selectTextOnFocus
                                />
                            </View>
                            <View style={styles.quickEditGramsRow}>
                                <Input
                                    value={editedGrams}
                                    onChangeText={onGramsChange}
                                    placeholder={t('quickAddList.gramsPlaceholder')}
                                    keyboardType="numeric"
                                    inputContainerStyle={styles.quickEditInputContainer}
                                    inputStyle={styles.quickEditInput}
                                    containerStyle={styles.quickEditGramsContainer}
                                    rightIcon={<Text style={styles.quickEditUnitText}>g</Text>}
                                    errorMessage={ !isValidNumberInput(editedGrams) && editedGrams !== "" ? t('quickAddList.errorInvalidGrams') : "" }
                                    errorStyle={styles.inputError}
                                />
                                <TouchableOpacity onPress={onSaveEdit} style={styles.quickEditActionButton}>
                                    <Icon name="checkmark-circle" type="ionicon" color={theme.colors.success} size={28} />
                                </TouchableOpacity>
                                <TouchableOpacity onPress={onCancelEdit} style={styles.quickEditActionButton}>
                                    <Icon name="close-circle" type="ionicon" color={theme.colors.error} size={28} />
                                </TouchableOpacity>
                            </View>
                        </View>
                    ) : (
                        <>
                            <CheckBox
                                checked={isSelected}
                                onPress={() => onToggleItem(index)}
                                containerStyle={styles.quickAddCheckbox}
                                checkedColor={theme.colors.primary}
                                disabled={isAnyItemEditing || isLoading}
                                size={22}
                            />
                             {renderFoodIcon(item.foodName)}
                            <ListItem.Content>
                                <ListItem.Title style={styles.quickAddItemTitle} numberOfLines={1} ellipsizeMode="tail">
                                    {item.foodName}
                                </ListItem.Title>
                                <ListItem.Subtitle style={styles.quickAddItemSubtitle}>
                                    {`Est: ${Math.round(item.estimatedWeightGrams)}g • ~${estimatedCalories} kcal`}
                                </ListItem.Subtitle>
                            </ListItem.Content>
                            {!isAnyItemEditing && !isLoading && (
                                <TouchableOpacity onPress={() => onEditItem(index)} style={styles.quickEditIconButton}>
                                    <Icon name="pencil-outline" type="ionicon" size={22} color={theme.colors.grey1} />
                                </TouchableOpacity>
                            )}
                        </>
                    )}
                </ListItem>
            </Pressable>
        );
    };

    if (isLoading && items.length === 0) {
         return (
             <View style={styles.centeredContent}>
                 <ActivityIndicator size="large" color={theme.colors.primary} />
                 <Text style={styles.loadingText}>{t('quickAddList.analyzing')}</Text>
             </View>
         );
    }

    return (
        <FlatList
            data={items}
            keyExtractor={(item, index) => `quickadd-${index}-${item.foodName}-${item.estimatedWeightGrams}`}
            renderItem={renderItem}
            ListEmptyComponent={
                !isLoading ? (
                    <View style={styles.emptyListContainer}>
                        <Icon name="image-search-outline" type="material-community" size={48} color={theme.colors.grey3} />
                        <Text style={styles.emptyListText}>{t('quickAddList.emptyMessage')}</Text>
                        <Text style={styles.emptyListSubText}>{t('quickAddList.emptyHint')}</Text>
                    </View>
                ) : null
            }
            style={[styles.listDefaults, style]}
            extraData={{ selectedIndices, editingIndex, foodIcons, isLoading }}
            keyboardShouldPersistTaps="handled"
            contentContainerStyle={items.length === 0 && !isLoading ? styles.listContentContainerEmpty : {paddingBottom: 10}}
        />
    );
};

const useStyles = makeStyles((theme) => ({
    listDefaults: {},
    listContentContainerEmpty: { flexGrow: 1, justifyContent: 'center', },
    quickAddItemContainer: {
        paddingVertical: 8,
        paddingHorizontal: 8,
        backgroundColor: theme.colors.background,
        borderBottomColor: theme.colors.divider,
        flexDirection: "row",
        alignItems: "center",
        minHeight: 65,
    },
    quickAddItemSelected: {
        backgroundColor: theme.colors.successLight,
        borderLeftWidth: 4,
        borderLeftColor: theme.colors.success,
    },
    quickAddItemEditing: {
        backgroundColor: theme.colors.background,
        paddingVertical: 12,
        paddingHorizontal: 10,
        borderWidth: 1.5,
        borderColor: theme.colors.primary,
        borderRadius: 8,
        marginVertical: 6,
        marginHorizontal: 2, // Ensure it doesn't touch edges
        shadowColor: theme.colors.black,
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.15,
        shadowRadius: 2.5,
        elevation: 4,
    },
    disabledItem: {
        opacity: 0.6,
    },
    quickAddCheckbox: {
        padding: 0,
        margin: 0,
        marginRight: 10,
        marginLeft: 0, // For RTL, RNE might handle it but good to be explicit
        backgroundColor: "transparent",
        borderWidth: 0,
    },
    foodIconContainer: {
        width: 38,
        height: 38,
        marginRight: 10,
        borderRadius: 6,
        alignItems: 'center',
        justifyContent: 'center',
        overflow: 'hidden',
    },
    foodIconImage: {
        width: 38,
        height: 38,
        marginRight: 10,
        borderRadius: 6,
    },
    iconPlaceholder: {
        backgroundColor: theme.colors.grey5,
    },
    quickAddItemTitle: {
        fontWeight: "600",
        color: theme.colors.text,
        fontSize: 15, // Slightly smaller to accommodate icon
        textAlign: 'left',
        marginBottom: 2,
    },
    quickAddItemSubtitle: {
        color: theme.colors.secondary,
        fontSize: 12.5,
        textAlign: 'left',
    },
    quickEditIconButton: {
        paddingVertical: 8,
        paddingHorizontal: 10, // Increase touch area
        marginLeft: 8,
    },
    quickAddEditView: {
        flex: 1,
    },
    editIconAndNameRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 8,
    },
    quickEditInputContainer: {
        borderBottomWidth: 1,
        borderBottomColor: theme.colors.primary,
        height: 38, // Slightly taller for better touch
        paddingHorizontal: 0,
    },
    quickEditInput: {
        fontSize: 15,
        color: theme.colors.text,
        paddingVertical: 0,
        textAlign: 'left',
    },
    quickEditNameContainer: {
        flex: 1, // Allow name input to take available space
        paddingHorizontal: 0,
    },
    quickEditGramsRow: {
        flexDirection: "row",
        alignItems: "center",
        marginTop: 5,
    },
    quickEditGramsContainer: {
        flex: 1,
        paddingHorizontal: 0,
        marginRight: 10,
    },
    quickEditUnitText: {
        color: theme.colors.grey2,
        fontSize: 14,
        fontWeight: "500",
        paddingRight: 5
    },
    quickEditActionButton: {
        paddingHorizontal: 8,
        paddingVertical: 5,
    },
    emptyListContainer: {
        alignItems: "center",
        justifyContent: 'center',
        paddingVertical: 40,
        paddingHorizontal: 20,
        flexGrow: 1,
    },
    emptyListText: {
        color: theme.colors.grey2,
        fontSize: 16,
        textAlign: "center",
        marginTop: 15,
        fontWeight: '500',
    },
    emptyListSubText: {
        fontSize: 14,
        color: theme.colors.grey3,
        textAlign: "center",
        marginTop: 8,
    },
    inputError: {
        color: theme.colors.error,
        fontSize: 11,
        marginVertical: 0,
        marginLeft: 2, // Align with input field
        height: 14,
        textAlign: 'left'
    },
    centeredContent: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        padding: 20,
        minHeight: 200,
    },
    loadingText: {
        marginTop: 12,
        color: theme.colors.text,
        fontSize: 16,
        fontWeight: "500",
    },
}));

export default QuickAddList;
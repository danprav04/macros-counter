// src/components/QuickAddList.tsx
// ---------- src/components/QuickAddList.tsx ----------
import React from 'react';
import {
    View,
    FlatList,
    ActivityIndicator,
} from 'react-native';
import {
    Icon,
    Text,
    useTheme,
    makeStyles,
} from '@rneui/themed';
import { EstimatedFoodItem } from '../types/macros';
import { t } from '../localization/i18n';
import QuickAddItem from './Entry/QuickAddItem'; // Import the new component

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

    const renderItem = ({ item, index }: { item: EstimatedFoodItem; index: number }) => {
        const isSelected = selectedIndices.has(index);
        const isEditingThisItem = editingIndex === index;
        const isAnyItemEditing = editingIndex !== null;

        return (
            <QuickAddItem
                item={item}
                index={index}
                isSelected={isSelected}
                isEditingThisItem={isEditingThisItem}
                isAnyItemEditing={isAnyItemEditing}
                isLoading={isLoading}
                foodIcons={foodIcons}
                editedName={isEditingThisItem ? editedName : ''}
                editedGrams={isEditingThisItem ? editedGrams : ''}
                onToggleItem={onToggleItem}
                onEditItem={onEditItem}
                onSaveEdit={onSaveEdit}
                onCancelEdit={onCancelEdit}
                onNameChange={onNameChange}
                onGramsChange={onGramsChange}
            />
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
            // Pass all props that affect item rendering to extraData
            extraData={{ selectedIndices, editingIndex, foodIcons, isLoading, editedName, editedGrams }}
            keyboardShouldPersistTaps="handled"
            contentContainerStyle={items.length === 0 && !isLoading ? styles.listContentContainerEmpty : {paddingBottom: 10}}
        />
    );
};

// Styles that are specific to the list container itself, not the items.
const useStyles = makeStyles((theme) => ({
    listDefaults: {},
    listContentContainerEmpty: { flexGrow: 1, justifyContent: 'center', },
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
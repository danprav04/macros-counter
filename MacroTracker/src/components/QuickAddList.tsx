// src/components/QuickAddList.tsx
// ---------- Corrected File ----------
import React from 'react';
import {
    View,
    FlatList,
    StyleSheet,
    TouchableOpacity,
    Pressable,
    Dimensions,
    ActivityIndicator,
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
    style?: object; // Optional style prop for the FlatList container
    isLoading?: boolean; // Optional loading state for the list itself
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
}) => {
    const { theme } = useTheme();
    const styles = useStyles();

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
                disabled={(isAnyItemEditing && !isEditingThisItem)}
            >
                <ListItem
                    bottomDivider
                    containerStyle={[
                        styles.quickAddItemContainer,
                        isEditingThisItem && styles.quickAddItemEditing,
                        isSelected && styles.quickAddItemSelected,
                        isAnyItemEditing && !isEditingThisItem && { opacity: 0.6 },
                    ]}
                >
                    {isEditingThisItem ? (
                        // --- EDIT VIEW for Quick Add Item ---
                        <View style={styles.quickAddEditView}>
                            <Input
                                value={editedName}
                                onChangeText={onNameChange}
                                placeholder="Food Name"
                                inputContainerStyle={styles.quickEditInputContainer}
                                inputStyle={styles.quickEditInput}
                                containerStyle={styles.quickEditNameContainer}
                                autoFocus
                                selectTextOnFocus
                            />
                            <View style={styles.quickEditGramsRow}>
                                <Input
                                    value={editedGrams}
                                    onChangeText={onGramsChange} // Use the specific handler for cleaning
                                    placeholder="Grams"
                                    keyboardType="numeric"
                                    inputContainerStyle={styles.quickEditInputContainer}
                                    inputStyle={styles.quickEditInput}
                                    containerStyle={styles.quickEditGramsContainer}
                                    // *** CORRECTED THIS LINE ***
                                    rightIcon={<Text style={styles.quickEditUnitText}>g</Text>}
                                    errorMessage={ !isValidNumberInput(editedGrams) && editedGrams !== "" ? "Invalid" : "" }
                                    errorStyle={styles.inputError}
                                />
                                {/* Save/Cancel Edit Buttons */}
                                <TouchableOpacity onPress={onSaveEdit} style={styles.quickEditButton}>
                                    <Icon name="checkmark" type="ionicon" color={theme.colors.success} size={26} />
                                </TouchableOpacity>
                                <TouchableOpacity onPress={onCancelEdit} style={styles.quickEditButton}>
                                    <Icon name="close-circle-outline" type="ionicon" color={theme.colors.error} size={26} />
                                </TouchableOpacity>
                            </View>
                        </View>
                    ) : (
                        // --- DISPLAY VIEW for Quick Add Item ---
                        <>
                            <CheckBox
                                checked={isSelected}
                                onPress={() => onToggleItem(index)}
                                containerStyle={styles.quickAddCheckbox}
                                checkedColor={theme.colors.primary}
                                disabled={isAnyItemEditing}
                            />
                            <ListItem.Content>
                                <ListItem.Title style={styles.quickAddItemTitle}>
                                    <Text>{item.foodName}</Text>
                                </ListItem.Title>
                                <ListItem.Subtitle style={styles.quickAddItemSubtitle}>
                                    <Text>{`Est: ${Math.round(item.estimatedWeightGrams)}g • ~${estimatedCalories} kcal`}</Text>
                                </ListItem.Subtitle>
                            </ListItem.Content>
                            {/* Edit Icon */}
                            {!isAnyItemEditing && (
                                <TouchableOpacity onPress={() => onEditItem(index)} style={styles.quickEditIconButton}>
                                    <Icon name="pencil" type="material-community" size={20} color={theme.colors.grey1} />
                                </TouchableOpacity>
                            )}
                        </>
                    )}
                </ListItem>
            </Pressable>
        );
    };

    if (isLoading) {
         return (
             <View style={styles.centeredContent}>
                 <ActivityIndicator size="large" color={theme.colors.primary} />
                 <Text style={styles.loadingText}>Analyzing...</Text>
             </View>
         );
    }

    return (
        <FlatList
            data={items}
            keyExtractor={(item, index) => `quickadd-${index}-${item.foodName}`}
            renderItem={renderItem}
            ListEmptyComponent={ // Show if API returned no items initially
                <View style={styles.emptyListContainer}>
                    <Icon name="image-off-outline" type="material-community" size={40} color={theme.colors.grey3} />
                    <Text style={styles.emptyListText}> No identifiable foods found in the image. </Text>
                    <Text style={styles.emptyListSubText}> Try a different image or add manually. </Text>
                </View>
            }
            style={[styles.listDefaults, style]} // Combine default styles with passed styles
            extraData={{ selectedIndices, editingIndex }} // Ensure re-render on state change
            keyboardShouldPersistTaps="handled"
            contentContainerStyle={items.length === 0 ? styles.listContentContainerEmpty : {}}
        />
    );
};

const useStyles = makeStyles((theme) => ({
    listDefaults: { // Default styles for the FlatList itself
        // maxHeight: Dimensions.get("window").height * 0.55, // Moved to parent or style prop
        // flexGrow: 0, // Moved to parent or style prop
        // marginBottom: 10, // Moved to parent or style prop
    },
    listContentContainerEmpty: {
        flexGrow: 1,
        justifyContent: 'center',
    },
    quickAddItemContainer: {
        paddingVertical: 6, paddingHorizontal: 5, backgroundColor: theme.colors.background,
        borderBottomColor: theme.colors.divider, flexDirection: "row", alignItems: "center",
        minHeight: 60, // Ensure consistent item height
    },
    quickAddItemSelected: { backgroundColor: theme.colors.successLight || '#d4edda' },
    quickAddItemEditing: { backgroundColor: theme.colors.grey5, paddingVertical: 8, },
    quickAddCheckbox: { padding: 0, margin: 0, marginRight: 10, backgroundColor: "transparent", borderWidth: 0, },
    quickAddItemTitle: { fontWeight: "bold", color: theme.colors.text, fontSize: 16, },
    quickAddItemSubtitle: { color: theme.colors.grey1, fontSize: 13, marginTop: 2, },
    quickEditIconButton: { padding: 8, marginLeft: 8, },
    quickAddEditView: { flex: 1, paddingLeft: 10, },
    quickEditInputContainer: {
        borderBottomWidth: 1, borderBottomColor: theme.colors.primary, height: 35, paddingHorizontal: 0,
        // paddingBottom: 0, // Reduce bottom padding to avoid height issues
        // marginBottom: 0, // Reduce margin
    },
    quickEditInput: {
        fontSize: 15, color: theme.colors.text, paddingVertical: 0, // Remove vertical padding
        // lineHeight: 18, // Control line height if needed
        // height: 'auto', // Auto height? Test this carefully
    },
    quickEditNameContainer: { paddingHorizontal: 0, marginBottom: 5, },
    quickEditGramsRow: { flexDirection: "row", alignItems: "center", },
    quickEditGramsContainer: { flex: 1, paddingHorizontal: 0, },
    quickEditUnitText: { color: theme.colors.grey2, fontSize: 14, fontWeight: "500", paddingRight: 5 /* Add padding if needed */ },
    quickEditButton: { paddingLeft: 10, paddingVertical: 5, },
    emptyListContainer: {
        alignItems: "center", paddingVertical: 30, paddingHorizontal: 15,
    },
    emptyListText: { color: theme.colors.grey2, fontSize: 16, textAlign: "center", marginTop: 10 },
    emptyListSubText: { fontSize: 14, color: theme.colors.grey3, textAlign: "center", marginTop: 5, },
    inputError: { color: theme.colors.error, fontSize: 10, marginVertical: 0, height: 12 }, // Compact error message
     centeredContent: { // Centered loading/empty states within main area
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      padding: 20,
      minHeight: 150, // Ensure it takes some space
   },
    loadingText: { marginTop: 10, color: theme.colors.text, fontSize: 16, fontWeight: "500", },
}));

export default QuickAddList;
import React from 'react';
import { View, FlatList, TouchableOpacity, ActivityIndicator, StyleSheet } from 'react-native';
import { Overlay, Text, Icon, useTheme, makeStyles } from '@rneui/themed';
import { useBackgroundTaskContext, BackgroundTask } from '../context/BackgroundTaskContext';
import { t } from '../localization/i18n';
import { useNavigation } from '@react-navigation/native';
import { formatDistanceToNow } from 'date-fns';
import { Alert } from 'react-native';

interface TaskListModalProps {
    isVisible: boolean;
    onClose: () => void;
}

const TaskListModal: React.FC<TaskListModalProps> = ({ isVisible, onClose }) => {
    const { theme } = useTheme();
    const styles = useStyles();
    const { tasks, dismissTask, markAllAsRead } = useBackgroundTaskContext();
    const navigation = useNavigation<any>();

    React.useEffect(() => {
        if (isVisible) {
            markAllAsRead();
        }
    }, [isVisible, markAllAsRead]);

    const handleTaskAction = (task: BackgroundTask) => {
        if (task.status === 'success' && task.result?.data) {
            if (task.type === 'ai_text' || task.type === 'ai_image') {
                const targetScreen = task.metadata?.targetScreen;

                if (targetScreen === 'FoodListRoute') {
                    navigation.navigate('FoodListRoute', {
                        backgroundFoodResult: task.result.data
                    });
                } else {
                    navigation.navigate('DailyEntryRoute', {
                        backgroundResults: {
                            type: task.type,
                            items: Array.isArray(task.result.data) ? task.result.data : [task.result.data]
                        }
                    });
                }

                onClose();
            } else if (task.type === 'ai_grams') {
                Alert.alert(t('taskList.result'), t('taskList.gramsResult', { grams: task.result.data }));
            }
        }
    };

    const getStatusIcon = (status: string) => {
        switch (status) {
            case 'loading':
                return <ActivityIndicator size="small" color={theme.colors.primary} />;
            case 'success':
                return <Icon name="check-circle" type="material" size={20} color={theme.colors.success} />;
            case 'error':
                return <Icon name="error" type="material" size={20} color={theme.colors.error} />;
            default:
                return null;
        }
    };

    const renderItem = ({ item }: { item: BackgroundTask }) => {
        const isSuccess = item.status === 'success';

        return (
            <View style={styles.taskRow}>
                <TouchableOpacity 
                    style={styles.taskContentValues} 
                    onPress={() => isSuccess && handleTaskAction(item)}
                    disabled={!isSuccess}
                >
                    <View style={styles.taskStatusIcon}>
                        {getStatusIcon(item.status)}
                    </View>
                    <View style={styles.taskInfo}>
                        <Text style={styles.taskTitle} numberOfLines={1}>{item.title}</Text>
                        <Text style={styles.taskMeta}>
                            {item.status === 'success' ? t('common.completed') : item.status === 'error' ? t('common.error') : t('common.processing')}
                            {' · '}
                            {formatDistanceToNow(item.startTime, { addSuffix: true })}
                        </Text>
                        {item.error && <Text style={styles.errorText} numberOfLines={1}>{item.error}</Text>}
                    </View>
                    {isSuccess && (
                        <View style={styles.actionButton}>
                            <Icon name="open-in-new" type="material" size={18} color={theme.colors.primary} />
                        </View>
                    )}
                </TouchableOpacity>
                <TouchableOpacity onPress={() => dismissTask(item.id)} style={styles.dismissButton} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                    <Icon name="close" type="material" size={18} color={theme.colors.grey3} />
                </TouchableOpacity>
            </View>
        );
    };

    return (
        <Overlay
            isVisible={isVisible}
            onBackdropPress={onClose}
            overlayStyle={styles.overlay}
            animationType="fade"
        >
            <View style={styles.header}>
                <Text style={styles.title}>{t('taskList.title')}</Text>
                <TouchableOpacity onPress={onClose} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
                    <Icon name="close" size={20} color={theme.colors.grey3} />
                </TouchableOpacity>
            </View>

            {tasks.length === 0 ? (
                <View style={styles.emptyContainer}>
                    <Icon name="check-circle-outline" type="material" size={32} color={theme.colors.grey4} />
                    <Text style={styles.emptyText}>{t('taskList.noActiveTasks')}</Text>
                </View>
            ) : (
                <FlatList
                    data={[...tasks].reverse()}
                    keyExtractor={item => item.id}
                    renderItem={renderItem}
                    contentContainerStyle={styles.listContent}
                    ItemSeparatorComponent={() => <View style={styles.separator} />}
                />
            )}
        </Overlay>
    );
};

const useStyles = makeStyles((theme) => ({
    overlay: {
        width: '80%',
        maxWidth: 360,
        maxHeight: '50%',
        borderRadius: 14,
        padding: 0,
        backgroundColor: theme.colors.background,
        elevation: 6,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.15,
        shadowRadius: 6,
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 16,
        paddingVertical: 12,
        borderBottomWidth: StyleSheet.hairlineWidth,
        borderBottomColor: theme.colors.divider,
    },
    title: {
        fontSize: 16,
        fontWeight: '700',
        color: theme.colors.text,
    },
    listContent: {
        paddingVertical: 4,
    },
    taskRow: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 0, // Padding moved to inner touchable
        paddingVertical: 0,
    },
    taskContentValues: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 10,
        paddingLeft: 14,
    },
    taskStatusIcon: {
        width: 24,
        alignItems: 'center',
        marginRight: 10,
    },
    taskInfo: {
        flex: 1,
        marginRight: 8,
    },
    taskTitle: {
        fontSize: 14,
        fontWeight: '600',
        color: theme.colors.text,
    },
    taskMeta: {
        fontSize: 11,
        color: theme.colors.grey3,
        marginTop: 2,
    },
    errorText: {
        fontSize: 11,
        color: theme.colors.error,
        marginTop: 2,
    },
    actionButton: {
        padding: 4,
        marginRight: 4,
    },
    dismissButton: {
        padding: 10,
        paddingRight: 14,
    },
    separator: {
        height: StyleSheet.hairlineWidth,
        backgroundColor: theme.colors.divider,
        marginHorizontal: 14,
    },
    emptyContainer: {
        padding: 30,
        alignItems: 'center',
        justifyContent: 'center',
    },
    emptyText: {
        marginTop: 8,
        color: theme.colors.grey3,
        fontSize: 14,
    },
}));

export default TaskListModal;

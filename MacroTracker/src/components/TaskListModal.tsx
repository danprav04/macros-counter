import React from 'react';
import { View, FlatList, TouchableOpacity, ActivityIndicator, StyleSheet, Linking, Alert } from 'react-native';
import { Overlay, Text, Icon, Button, useTheme, makeStyles, Badge, ListItem } from '@rneui/themed';
import { useBackgroundTaskContext, BackgroundTask } from '../context/BackgroundTaskContext';
import { t } from '../localization/i18n';
import { useNavigation } from '@react-navigation/native';
import { formatDistanceToNow } from 'date-fns';
import { EstimatedFoodItem } from '../types/macros';

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
            // Handle navigation based on task type
            if (task.type === 'ai_text' || task.type === 'ai_image') {
                const targetScreen = task.metadata?.targetScreen;

                if (targetScreen === 'FoodListRoute') {
                    navigation.navigate('FoodListRoute', {
                        backgroundFoodResult: task.result.data
                    });
                } else {
                    // Default to DailyEntryRoute if not specified or specified as such
                    navigation.navigate('DailyEntryRoute', {
                        backgroundResults: {
                            type: task.type,
                            items: Array.isArray(task.result.data) ? task.result.data : [task.result.data]
                        }
                    });
                }

                onClose();
            } else if (task.type === 'ai_grams') {
                // For grams, it's usually tied to a specific food edit session. 
                // Restoring that session is hard. 
                // Maybe just show an alert with the result?
                Alert.alert(t('taskList.result'), t('taskList.gramsResult', { grams: task.result.data }));
            }
        }
    };

    const renderItem = ({ item }: { item: BackgroundTask }) => {
        const isFinished = item.status !== 'loading';
        const isSuccess = item.status === 'success';

        return (
            <ListItem.Swipeable
                rightContent={(reset) => (
                    <Button
                        title={t('common.dismiss')}
                        onPress={() => { dismissTask(item.id); reset(); }}
                        icon={{ name: 'delete', color: 'white' }}
                        buttonStyle={{ minHeight: '100%', backgroundColor: 'red' }}
                    />
                )}
                containerStyle={styles.itemContainer}
            >
                <View style={styles.iconContainer}>
                    {item.status === 'loading' && <ActivityIndicator size="small" color={theme.colors.primary} />}
                    {item.status === 'success' && <Icon name="check-circle" color={theme.colors.success} />}
                    {item.status === 'error' && <Icon name="error" color={theme.colors.error} />}
                </View>
                <ListItem.Content>
                    <ListItem.Title style={styles.itemTitle}>{item.title}</ListItem.Title>
                    <ListItem.Subtitle style={styles.itemSubtitle}>
                        {isFinished
                            ? (item.status === 'success' ? t('common.completed') : t('common.error'))
                            : t('common.processing')}
                        {' • '}
                        {formatDistanceToNow(item.startTime, { addSuffix: true })}
                    </ListItem.Subtitle>
                    {item.error && <Text style={styles.errorText}>{item.error}</Text>}
                </ListItem.Content>
                {isSuccess && (
                    <Button
                        title={t('common.view')}
                        type="clear"
                        onPress={() => handleTaskAction(item)}
                    />
                )}
            </ListItem.Swipeable>
        );
    };

    return (
        <Overlay
            isVisible={isVisible}
            onBackdropPress={onClose}
            overlayStyle={styles.overlay}
            animationType="slide"
        >
            <View style={styles.header}>
                <Text h4 style={styles.title}>{t('taskList.title')}</Text>
                <TouchableOpacity onPress={onClose}>
                    <Icon name="close" size={24} color={theme.colors.grey3} />
                </TouchableOpacity>
            </View>

            {tasks.length === 0 ? (
                <View style={styles.emptyContainer}>
                    <Icon name="playlist-remove" type="material-community" size={48} color={theme.colors.grey4} />
                    <Text style={styles.emptyText}>{t('taskList.noActiveTasks')}</Text>
                </View>
            ) : (
                <FlatList
                    data={[...tasks].reverse()}
                    keyExtractor={item => item.id}
                    renderItem={renderItem}
                    contentContainerStyle={styles.listContent}
                />
            )}
        </Overlay>
    );
};

const useStyles = makeStyles((theme) => ({
    overlay: {
        width: '90%',
        maxHeight: '80%',
        borderRadius: 16,
        padding: 0,
        backgroundColor: theme.colors.background,
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: 16,
        borderBottomWidth: StyleSheet.hairlineWidth,
        borderBottomColor: theme.colors.divider,
    },
    title: {
        color: theme.colors.text,
    },
    listContent: {
        paddingBottom: 20,
    },
    itemContainer: {
        backgroundColor: theme.colors.background,
    },
    iconContainer: {
        marginRight: 12,
        justifyContent: 'center',
    },
    itemTitle: {
        fontWeight: '600',
        color: theme.colors.text,
    },
    itemSubtitle: {
        fontSize: 12,
        color: theme.colors.grey3,
        marginTop: 2,
    },
    errorText: {
        fontSize: 12,
        color: theme.colors.error,
        marginTop: 2,
    },
    emptyContainer: {
        padding: 40,
        alignItems: 'center',
        justifyContent: 'center',
    },
    emptyText: {
        marginTop: 10,
        color: theme.colors.grey3,
        fontSize: 16,
    },
}));

export default TaskListModal;

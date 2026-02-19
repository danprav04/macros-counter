import React, { useState, useEffect } from 'react';
import { TouchableOpacity, View, StyleSheet, Animated } from 'react-native';
import { Icon, useTheme, makeStyles, Badge } from '@rneui/themed';
import { useBackgroundTaskContext } from '../context/BackgroundTaskContext';
import TaskListModal from './TaskListModal';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export const BackgroundTaskBubble: React.FC = () => {
    const { theme } = useTheme();
    const styles = useStyles();

    const insets = useSafeAreaInsets();
    const { hasActiveBackgroundTasks, hasUnreadCompletedTasks, activeBackgroundTasksCount, tasks } = useBackgroundTaskContext();
    const [isModalVisible, setIsModalVisible] = useState(false);

    // Simple entry animation
    const [scale] = useState(new Animated.Value(0));

    const shouldShow = hasActiveBackgroundTasks || hasUnreadCompletedTasks || (tasks.length > 0);

    const [animationFinished, setAnimationFinished] = useState(true);

    useEffect(() => {
        if (!shouldShow) {
            setAnimationFinished(false);
        }
        Animated.spring(scale, {
            toValue: shouldShow ? 1 : 0,
            useNativeDriver: true,
            friction: 6,
        }).start(({ finished }) => {
            if (finished && !shouldShow) {
                setAnimationFinished(true);
            }
        });
    }, [shouldShow]);

    if (!shouldShow && !isModalVisible && animationFinished) return null;

    return (
        <>
            <Animated.View style={[
                styles.container,
                {
                    bottom: 80 + insets.bottom, // Above tab bar
                    transform: [{ scale }]
                }
            ]}>
                <TouchableOpacity
                    style={styles.bubble}
                    onPress={() => setIsModalVisible(true)}
                    activeOpacity={0.8}
                >
                    {hasActiveBackgroundTasks ? (
                        <ActivityIndicatorBubble color={theme.colors.white} />
                    ) : (
                        <Icon name="layers" type="material" color={theme.colors.white} size={28} />
                    )}

                    {hasUnreadCompletedTasks && (
                        <View style={styles.badge} />
                    )}
                </TouchableOpacity>
            </Animated.View>

            <TaskListModal
                isVisible={isModalVisible}
                onClose={() => setIsModalVisible(false)}
            />
        </>
    );
};

// Custom small spinner
const ActivityIndicatorBubble = ({ color }: { color: string }) => {
    // We could use react-native ActivityIndicator but maybe a custom icon is better for "processing"
    // Let's just use the standard one for now
    return <Icon name="hourglass-empty" type="material" color={color} size={28} />;
};

const useStyles = makeStyles((theme) => ({
    container: {
        position: 'absolute',
        left: 20,
        zIndex: 1000,
        elevation: 10,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 4,
    },
    bubble: {
        width: 56,
        height: 56,
        borderRadius: 28,
        backgroundColor: theme.colors.primary,
        justifyContent: 'center',
        alignItems: 'center',
    },
    badge: {
        position: 'absolute',
        top: 12,
        right: 12,
        width: 10,
        height: 10,
        borderRadius: 5,
        backgroundColor: theme.colors.error,
        borderWidth: 1.5,
        borderColor: theme.colors.primary,
    }
}));



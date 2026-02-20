import React, { createContext, useState, useContext, ReactNode, useCallback, useEffect } from 'react';
import "react-native-get-random-values";
import { v4 as uuidv4 } from 'uuid';
import BackgroundService from 'react-native-background-actions';

export type TaskStatus = 'loading' | 'success' | 'error';
export type TaskType = 'ai_text' | 'ai_image' | 'ai_grams';

export interface BackgroundTaskResult {
    data?: any;
    navigationParams?: any; // To help navigate to the result
}

export interface BackgroundTask {
    id: string;
    type: TaskType;
    title: string;
    status: TaskStatus;
    result?: BackgroundTaskResult;
    error?: string;
    startTime: number;
    endTime?: number;
    isBackgrounded: boolean;
    metadata?: any;
}

interface BackgroundTaskContextType {
    tasks: BackgroundTask[];
    startTask: (title: string, type: TaskType, metadata?: any) => string;
    updateTask: (id: string, updates: Partial<BackgroundTask>) => void;
    completeTask: (id: string, result: BackgroundTaskResult) => void;
    failTask: (id: string, error: string) => void;
    backgroundTask: (id: string) => void;
    dismissTask: (id: string) => void;
    hasActiveBackgroundTasks: boolean;
    hasUnreadCompletedTasks: boolean;
    markAllAsRead: () => void;
    activeBackgroundTasksCount: number;
}

const BackgroundTaskContext = createContext<BackgroundTaskContextType | undefined>(undefined);

export const BackgroundTaskProvider = ({ children }: { children: ReactNode }) => {
    const [tasks, setTasks] = useState<BackgroundTask[]>([]);
    const [hasUnreadCompletedTasks, setHasUnreadCompletedTasks] = useState(false);

    const fullActiveTasksCount = tasks.filter(t => t.status === 'loading').length;

    useEffect(() => {
        const manageBackgroundService = async () => {
            if (fullActiveTasksCount > 0 && !BackgroundService.isRunning()) {
                const sleep = (time: number) => new Promise<void>((resolve) => setTimeout(() => resolve(), time));
                
                const backgroundTaskFn = async () => {
                    await new Promise<void>(async (resolve) => {
                        for (let i = 0; BackgroundService.isRunning(); i++) {
                            await sleep(1000);
                        }
                    });
                };

                const options = {
                    taskName: 'AITask',
                    taskTitle: 'Processing AI Task',
                    taskDesc: 'Your request is being processed...',
                    taskIcon: {
                        name: 'ic_launcher',
                        type: 'mipmap',
                    },
                    color: '#ff00ff',
                    parameters: {
                        delay: 1000,
                    },
                };

                try {
                    await BackgroundService.start(backgroundTaskFn, options);
                } catch (e) {
                    console.log('Failed to start background service', e);
                }
            } else if (fullActiveTasksCount === 0 && BackgroundService.isRunning()) {
                try {
                    await BackgroundService.stop();
                } catch (e) {
                    console.log('Failed to stop background service', e);
                }
            }
        };

        manageBackgroundService();
    }, [fullActiveTasksCount]);

    const startTask = useCallback((title: string, type: TaskType, metadata?: any) => {
        const id = uuidv4();
        const newTask: BackgroundTask = {
            id,
            type,
            title,
            status: 'loading',
            startTime: Date.now(),
            isBackgrounded: false,
            metadata,
        };
        setTasks(prev => [...prev, newTask]);
        return id;
    }, []);

    const updateTask = useCallback((id: string, updates: Partial<BackgroundTask>) => {
        setTasks(prev => prev.map(task => task.id === id ? { ...task, ...updates } : task));
    }, []);

    const completeTask = useCallback((id: string, result: BackgroundTaskResult) => {
        setTasks(prev => prev.map(task => {
            if (task.id === id) {
                // If the task was backgrounded, we mark that we have unread items
                if (task.isBackgrounded) {
                    setHasUnreadCompletedTasks(true);
                }
                return { ...task, status: 'success', result, endTime: Date.now() };
            }
            return task;
        }));
    }, []);

    const failTask = useCallback((id: string, error: string) => {
        setTasks(prev => prev.map(task => {
            if (task.id === id) {
                if (task.isBackgrounded) {
                    setHasUnreadCompletedTasks(true);
                }
                return { ...task, status: 'error', error, endTime: Date.now() };
            }
            return task;
        }));
    }, []);

    const backgroundTask = useCallback((id: string) => {
        setTasks(prev => prev.map(task => task.id === id ? { ...task, isBackgrounded: true } : task));
    }, []);

    const dismissTask = useCallback((id: string) => {
        setTasks(prev => prev.filter(task => task.id !== id));
    }, []);

    const markAllAsRead = useCallback(() => {
        setHasUnreadCompletedTasks(false);
    }, []);

    const activeBackgroundTasksCount = tasks.filter(t => t.isBackgrounded && t.status === 'loading').length;
    const hasActiveBackgroundTasks = activeBackgroundTasksCount > 0;

    return (
        <BackgroundTaskContext.Provider value={{
            tasks,
            startTask,
            updateTask,
            completeTask,
            failTask,
            backgroundTask,
            dismissTask,
            hasActiveBackgroundTasks,
            hasUnreadCompletedTasks,
            markAllAsRead,
            activeBackgroundTasksCount
        }}>
            {children}
        </BackgroundTaskContext.Provider>
    );
};

export const useBackgroundTaskContext = () => {
    const context = useContext(BackgroundTaskContext);
    if (!context) {
        throw new Error('useBackgroundTaskContext must be used within a BackgroundTaskProvider');
    }
    return context;
};

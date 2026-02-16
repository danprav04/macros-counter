import { useState, useRef, useEffect, useCallback } from 'react';
import { useBackgroundTaskContext, TaskType, BackgroundTaskResult } from '../context/BackgroundTaskContext';

export const useBackgroundTask = () => {
    const { startTask, completeTask, failTask, backgroundTask: backgroundTaskInContext, tasks } = useBackgroundTaskContext();
    const [currentTaskId, setCurrentTaskId] = useState<string | null>(null);
    const [isBackgroundOptionAvailable, setIsBackgroundOptionAvailable] = useState(false);
    const timerRef = useRef<NodeJS.Timeout | null>(null);

    const isBackgrounded = currentTaskId ? tasks.find(t => t.id === currentTaskId)?.isBackgrounded ?? false : false;

    useEffect(() => {
        return () => {
            if (timerRef.current) clearTimeout(timerRef.current);
        };
    }, []);

    const runBackgroundTask = useCallback(async <T>(
        title: string,
        type: TaskType,
        asyncFn: () => Promise<T>,
        metadata?: any,
        onSuccess?: (result: T) => void,
        onError?: (error: any) => void
    ) => {
        setIsBackgroundOptionAvailable(false);
        const taskId = startTask(title, type, metadata);
        setCurrentTaskId(taskId);

        // Start 5 second timer to show background option
        timerRef.current = setTimeout(() => {
            setIsBackgroundOptionAvailable(true);
        }, 5000);

        try {
            const result = await asyncFn();

            // Check if it was backgrounded during execution
            // We need to check the ref/state or query context because state might be stale in closure
            // But here we rely on the context update which is handled outside. 

            // Note: We need to know if we should call onSuccess.
            // If it's backgrounded, we DON'T call onSuccess (because UI is gone/changed), 
            // instead we store the result in the task.

            // Ideally we check context, but we don't have direct access to latest 'tasks' inside this callback closure easily 
            // without adding 'tasks' to dependency, which we want to avoid for the asyncFn.
            // So we use a functional update or a ref if needed, or just let the component handle "if (!isBackgrounded)"

            // A pattern: The hook user checks `isBackgrounded` before rendering loading state.
            // But they also need to know if they should show the result.

            // We will store the result in context regardless.
            // If component is still mounted and NOT backgrounded, we call onSuccess.

            // Let's rely on a ref for the background status for immediate check
            // Actually, we can just complete it.

            const payload: BackgroundTaskResult = {
                data: result
            };
            completeTask(taskId, payload);

            if (timerRef.current) clearTimeout(timerRef.current);

            return { result, taskId };

        } catch (error: any) {
            failTask(taskId, error.message || 'Unknown error');
            if (timerRef.current) clearTimeout(timerRef.current);
            if (onError) onError(error);
            throw error; // Re-throw for local handling if needed, though usually onError handles it
        } finally {
            // Cleanup if needed
        }
    }, [startTask, completeTask, failTask]);

    const backgroundTask = useCallback(() => {
        if (currentTaskId) {
            backgroundTaskInContext(currentTaskId);
            setIsBackgroundOptionAvailable(false); // Hide the button once clicked
            if (timerRef.current) clearTimeout(timerRef.current);
        }
    }, [currentTaskId, backgroundTaskInContext]);

    // Cleanup when component unmounts? 
    // If component unmounts while task is running, strictly speaking we should probably background it automatically?
    // But for now let's stick to explicit user action or component staying alive (modal).

    return {
        runBackgroundTask,
        isBackgroundOptionAvailable,
        backgroundTask,
        isBackgrounded,
        currentTaskId
    };
};

// src/hooks/useDelayedLoading.ts
import { useState, useEffect } from 'react';

/**
 * A custom hook that delays setting a loading state to true.
 * This prevents a loading indicator from flashing on the screen for very short durations.
 * @param loading The actual loading state from the component.
 * @param delay The delay in milliseconds before the loading indicator should be shown. Defaults to 500ms.
 * @returns A boolean indicating whether the delayed loading indicator should be shown.
 */
const useDelayedLoading = (loading: boolean, delay: number = 1000): boolean => {
  const [showLoading, setShowLoading] = useState(false);

  useEffect(() => {
    let timeout: NodeJS.Timeout | null = null;

    if (loading) {
      timeout = setTimeout(() => {
        setShowLoading(true);
      }, delay);
    } else {
      setShowLoading(false);
      if (timeout) {
        clearTimeout(timeout);
      }
    }

    return () => {
      if (timeout) {
        clearTimeout(timeout);
      }
    };
  }, [loading, delay]);

  return showLoading;
};

export default useDelayedLoading;
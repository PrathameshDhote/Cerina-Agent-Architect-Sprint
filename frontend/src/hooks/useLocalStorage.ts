import { useState, useEffect, useCallback } from 'react';

export const useLocalStorage = <T>(key: string, initialValue: T) => {
  // Get initial value from localStorage or use provided initial value
  const readValue = useCallback((): T => {
    if (typeof window === 'undefined') {
      return initialValue;
    }

    try {
      const item = window.localStorage.getItem(key);
      return item ? JSON.parse(item) : initialValue;
    } catch (error) {
      console.warn(`Error reading localStorage key "${key}":`, error);
      return initialValue;
    }
  }, [initialValue, key]);

  const [storedValue, setStoredValue] = useState<T>(readValue);

  // Set value in state and localStorage
  const setValue = useCallback(
    (value: T | ((val: T) => T)) => {
      try {
        const valueToStore = value instanceof Function ? value(storedValue) : value;
        
        setStoredValue(valueToStore);

        if (typeof window !== 'undefined') {
          window.localStorage.setItem(key, JSON.stringify(valueToStore));
        }
      } catch (error) {
        console.warn(`Error setting localStorage key "${key}":`, error);
      }
    },
    [key, storedValue]
  );

  // Remove value from localStorage
  const removeValue = useCallback(() => {
    try {
      if (typeof window !== 'undefined') {
        window.localStorage.removeItem(key);
        setStoredValue(initialValue);
      }
    } catch (error) {
      console.warn(`Error removing localStorage key "${key}":`, error);
    }
  }, [key, initialValue]);

  // Listen for storage changes from other tabs/windows
  useEffect(() => {
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === key && e.newValue !== null) {
        try {
          setStoredValue(JSON.parse(e.newValue));
        } catch (error) {
          console.warn(`Error parsing storage event for key "${key}":`, error);
        }
      }
    };

    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, [key]);

  return [storedValue, setValue, removeValue] as const;
};

// Hook to store protocol history
export const useProtocolHistory = () => {
  const [history, setHistory, clearHistory] = useLocalStorage<string[]>(
    'cerina-protocol-history',
    []
  );

  const addToHistory = useCallback(
    (threadId: string) => {
      setHistory((prev) => {
        const filtered = prev.filter((id) => id !== threadId);
        return [threadId, ...filtered].slice(0, 10); // Keep last 10
      });
    },
    [setHistory]
  );

  const removeFromHistory = useCallback(
    (threadId: string) => {
      setHistory((prev) => prev.filter((id) => id !== threadId));
    },
    [setHistory]
  );

  return {
    history,
    addToHistory,
    removeFromHistory,
    clearHistory,
  };
};

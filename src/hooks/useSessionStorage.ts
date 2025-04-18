import { useState } from "react";

/**
 * Custom React Hook: useSessionStorage
 *
 * Provides a stateful value synchronized with sessionStorage.
 * @param key - sessionStorage key
 * @param defaultValue - default value if not found
 */
export function useSessionStorage<T>(key: string, defaultValue: T) {
  const getStoredValue = () => {
    if (typeof window === "undefined") return defaultValue;
    try {
      const item = window.sessionStorage.getItem(key);
      return item ? (JSON.parse(item) as T) : defaultValue;
    } catch {
      return defaultValue;
    }
  };

  const [value, setValue] = useState<T>(getStoredValue);

  const setSessionValue = (val: T) => {
    setValue(val);
    if (typeof window !== "undefined") {
      window.sessionStorage.setItem(key, JSON.stringify(val));
    }
  };

  return [value, setSessionValue] as const;
}

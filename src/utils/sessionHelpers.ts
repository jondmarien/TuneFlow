// Utility functions for sessionStorage interaction

/**
 * Gets a value from sessionStorage and parses it as JSON.
 * @param key - sessionStorage key
 * @param defaultValue - value to return if not found or parse error
 */
export function getSessionItem<T>(key: string, defaultValue: T): T {
  if (typeof window === "undefined") return defaultValue;
  try {
    const item = window.sessionStorage.getItem(key);
    return item ? (JSON.parse(item) as T) : defaultValue;
  } catch {
    return defaultValue;
  }
}

/**
 * Sets a value in sessionStorage as JSON.
 * @param key - sessionStorage key
 * @param value - value to store
 */
export function setSessionItem<T>(key: string, value: T) {
  if (typeof window !== "undefined") {
    window.sessionStorage.setItem(key, JSON.stringify(value));
  }
}

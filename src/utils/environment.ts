/**
 * Checks if the code is running in a browser environment.
 * @returns {boolean} True if running in browser, false otherwise.
 */
export const isBrowser = (): boolean => {
  return typeof window !== 'undefined' && typeof document !== 'undefined';
};

/**
 * Checks if the code is running in a server environment.
 * @returns {boolean} True if running on server, false otherwise.
 */
const isServer = (): boolean => {
  return typeof window === 'undefined' || typeof document === 'undefined';
};

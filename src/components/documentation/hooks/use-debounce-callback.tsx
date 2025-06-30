import debounce from 'lodash/debounce';
import { useCallback, useEffect, useRef } from 'react';

export function useDebounceCallback<T extends (...args: any[]) => void>(
  callback: T,
  delay: number,
  dependencies: any[]
): (...args: Parameters<T>) => void {
  const debouncedRef = useRef(debounce(callback, delay));

  useEffect(() => {
    debouncedRef.current = debounce(callback, delay);
    return () => {
      debouncedRef.current.cancel();
    };
  }, [callback, delay, dependencies]);

  return useCallback((...args: Parameters<T>) => {
    debouncedRef.current(...args);
  }, []);
}

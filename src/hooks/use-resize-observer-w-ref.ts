import { type RefObject, useEffect, useRef } from 'react';

/**
 * Hook to observe resize events on a DOM element
 * @param elementRef React ref to the element to observe
 * @param callback Function to call when resize is detected
 * @returns void
 */

export default function useResizeObserver<T extends Element>(
  elementRef: RefObject<T | null>,
  callback: ResizeObserverCallback
): void {
  const observerRef = useRef<ResizeObserver | null>(null);

  useEffect(() => {
    // Check if the element is defined
    if (!elementRef || !elementRef.current) {
      return;
    }

    // Create the observer if it doesn't exist yet
    if (!observerRef.current) {
      observerRef.current = new ResizeObserver(callback);
    }

    // Get the current element from the ref
    const element = elementRef.current;
    const observer = observerRef.current;

    // Start observing the element if it exists
    if (element) {
      observer.observe(element);
    }

    // Cleanup function to disconnect the observer when component unmounts
    return () => {
      if (element) {
        observer.unobserve(element);
      }
    };
  }, [elementRef, callback]);
}

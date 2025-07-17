import { useEffect } from 'react';

/**
 * A custom React hook that uses the scroll event to detect when an element has reached the end of its scrollable area.
 * It invokes a callback function with a boolean value indicating whether the element has scrolled to the bottom or not.
 * @param {HTMLElement | null | undefined} element - The element to listen for scroll events.
 * @param {(value: boolean) => void} callback - The function to call when the element scrolls to the bottom or not.
 * @returns {null} - not return anything.
 * @example
 * function Component() {
 *   const ref = useRef(null);
 *   const handleScrollComplete = (value) => {
 *     console.log(value ? "Scrolled to the bottom" : "Keep scrolling");
 *   };
 *   useScrollComplete(ref.current, handleScrollComplete);
 *   return <div ref={ref} style={{height: 1600, overflowY: "scroll"}}>long content</div>;
 * }
 */

export default function useScrollComplete({
  element,
  callback,
}: {
  element: HTMLElement | null | undefined;
  callback?: (value: boolean) => void;
}) {
  useEffect(() => {
    const checkScrollState = (target: HTMLElement) => {
      const { scrollHeight, clientHeight, scrollTop } = target;

      // check if content is actually scrollable
      const isScrollable = scrollHeight > clientHeight;

      // if not scrollable, never show load more
      if (!isScrollable) {
        callback?.(false);
        return;
      }

      // firefox-specific: use a larger threshold for scroll detection
      const isFirefox = navigator.userAgent.toLowerCase().includes('firefox');
      const threshold = isFirefox ? 3 : 1;

      // check if scrolled to bottom with browser-specific threshold
      const isAtBottom = Math.abs(scrollHeight - clientHeight - scrollTop) <= threshold;

      callback?.(isAtBottom);
    };

    const onScroll = ({ currentTarget }: Event) => {
      checkScrollState(currentTarget as HTMLElement);
    };

    if (element) {
      // initial check when element becomes available
      checkScrollState(element);

      element.addEventListener('scroll', onScroll);

      // check on resize/mutation in case content changes
      let rafId: number | null = null;

      const debouncedCheck = () => {
        if (rafId) {
          cancelAnimationFrame(rafId);
        }
        rafId = requestAnimationFrame(() => {
          checkScrollState(element);
        });
      };

      const resizeObserver = new ResizeObserver(debouncedCheck);
      const mutationObserver = new MutationObserver(debouncedCheck);

      resizeObserver.observe(element);
      mutationObserver.observe(element, { childList: true, subtree: true });

      return () => {
        element.removeEventListener('scroll', onScroll);
        resizeObserver.unobserve(element);
        mutationObserver.disconnect();
        if (rafId) {
          cancelAnimationFrame(rafId);
        }
      };
    }
  }, [callback, element]);

  return null;
}

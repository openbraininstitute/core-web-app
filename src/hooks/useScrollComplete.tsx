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
    const checkScrollPosition = (target: HTMLElement) => {
      const { scrollHeight, clientHeight, scrollTop } = target;
      const isAtBottom = Math.abs(scrollHeight - clientHeight - scrollTop) < 1;

      const isScrollable = scrollHeight > clientHeight;

      // only trigger callback with true if scrollable and at bottom
      // if not scrollable, always call with false to hide load more
      callback?.(isScrollable && isAtBottom);
    };

    const onScroll = ({ currentTarget }: Event) => {
      checkScrollPosition(currentTarget as HTMLElement);
    };

    if (element) {
      // check initial state when element mounts
      checkScrollPosition(element);

      element.addEventListener('scroll', onScroll);

      //  check on resize in case content changes
      const resizeObserver = new ResizeObserver(() => {
        checkScrollPosition(element);
      });
      resizeObserver.observe(element);

      return () => {
        element.removeEventListener('scroll', onScroll);
        resizeObserver.unobserve(element);
      };
    }
  }, [callback, element]);

  return null;
}

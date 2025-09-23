import { useLayoutEffect } from 'react';

/**
 * A custom React hook that disables vertical scrolling (overflow) on the  element.
 *
 * This hook targets the DOM element with the ID default ('workspace-body'), removes the 'overflow-y-auto' class,
 * and adds the 'overflow-hidden' class to prevent vertical scrolling when the hook is mounted.
 * When the component using this hook unmounts, it restores the original overflow behavior by
 * removing 'overflow-hidden' and re-adding 'overflow-y-auto'.
 *
 * @remarks
 * - It relies on the presence of an element with the ID  in the DOM.
 *
 */
export function useDisableElementOverflow({ id = 'workspace-body' }: { id?: string }) {
  useLayoutEffect(() => {
    const element: HTMLElement | null = document.getElementById(id);

    if (!element) return;

    element.classList.remove('overflow-y-auto');
    element.classList.add('overflow-hidden');

    return () => {
      element.classList.remove('overflow-hidden');
      element.classList.add('overflow-y-auto');
    };
  }, [id]);
}

export default useDisableElementOverflow;

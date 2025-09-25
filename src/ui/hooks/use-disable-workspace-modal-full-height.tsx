import { useLayoutEffect } from 'react';

/**
 * A custom React hook that conditionally adds a CSS class to add/remove an element class
 * as disable its full height.
 *
 * This hook targets a any element by Id and adds the specified CSS class (default: `'h-max'`)
 * The class is added only if the provided `condition` is met. The class is removed
 * when the component unmounts or dependencies change.
 *
 * @param params - The parameters for the hook.
 * @param params.modalId - The DOM element ID of the modal to target.
 * @param params.className - The CSS class to add to the  element. Defaults to `'h-max'`.
 * @param params.condition - A boolean or function returning a boolean to determine whether to apply the class.
 *   - If `condition` is a function, it is called and the class is added only if it returns `true`.
 *   - If `condition` is `false`, the class is not added.
 *   - If `condition` is `null` or `true`, the class is added.
 *
 * @remarks
 * This hook uses `useLayoutEffect` to ensure the class is applied before the browser paints.
 *
 * @example
 * ```tsx
 * useDisableWorkspaceModalFullHeight({
 *   modalId: 'my-modal',
 *   className: 'h-max',
 *   condition: () => isSmallScreen,
 * });
 * ```
 */
export function useDisableWorkspaceModalFullHeight({
  modalId,
  className = ['h-max'],
  condition = null,
  classNameToRemove,
}: {
  modalId: string;
  className?: string | string[];
  classNameToRemove?: string[];
  condition?: (() => boolean) | boolean | null;
}) {
  useLayoutEffect(() => {
    const modalElement: HTMLElement | null = document.getElementById(modalId);
    if (!modalElement) return;
    if (typeof condition === 'function' && !condition()) return;
    if (condition === false) return;

    modalElement.classList.add(...className);
    modalElement.classList.remove(...(classNameToRemove ?? []));

    return () => {
      modalElement.classList.remove(...className);
      modalElement.classList.add(...(classNameToRemove ?? []));
    };
  }, [condition, modalId, className, classNameToRemove]);
}

export default useDisableWorkspaceModalFullHeight;

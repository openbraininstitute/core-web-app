import { useCallback, useEffect, useRef } from 'react';

import { useOnClickOutside } from '@/hooks/useOnClickOutside';

// Overlays rendered outside the dismissable element: interacting with them is not "outside".
const OVERLAY_IGNORED_SELECTOR = [
  '.ant-modal-root',
  '.ant-dropdown',
  '.ant-select-dropdown',
  '.ant-popover',
  '.ant-notification',
  '[role="dialog"]',
  '[role="menu"]',
  '[role="listbox"]',
  '[data-radix-popper-content-wrapper]',
  // onboarding tour, minus the wrappers it puts around the whole app
  '[data-name^="nextstep-"]:not([data-name="nextstep-site"]):not([data-name="nextstep-wrapper"])',
].join(',');

// An open overlay owns Esc: its first press closes the overlay, not the element behind it.
const OVERLAY_SELECTOR = [
  '.ant-modal-root',
  '[role="dialog"]',
  '[role="menu"]',
  '[role="listbox"]',
  '[data-name="nextstep-overlay"]',
].join(',');

const FORM_FIELD_SELECTOR =
  'input, textarea, select, [contenteditable]:not([contenteditable="false"])';

// Marks a dismissable element (or a wrapper or launcher of it), so several can be open together
// without dismissing each other.
export const DISMISSABLE_ATTRIBUTE = 'data-dismissable';
const DISMISSABLE_SELECTOR = `[${DISMISSABLE_ATTRIBUTE}]`;

// The marker may sit on a wrapper of the element (e.g. a panel's launcher and its body), so
// "another" element is one that neither contains this one nor is contained by it.
function belongsToAnotherDismissable(node: Element, self: HTMLElement | null) {
  const owner = node.closest(DISMISSABLE_SELECTOR);
  if (!owner || !self) return false;
  return !owner.contains(self) && !self.contains(owner);
}

type EscapeEntry = { element: () => HTMLElement | null; onEscape: () => void };

// Elements handling Esc, in the order they opened. One shared listener picks a single one per press.
const escapeStack: EscapeEntry[] = [];

function pickEscapeEntry(focused: Element | null) {
  if (focused) {
    for (let i = escapeStack.length - 1; i >= 0; i -= 1) {
      if (escapeStack[i].element()?.contains(focused)) return escapeStack[i];
    }
    // a field on the page itself (e.g. a grid search) keeps Esc to itself
    if (focused.matches(FORM_FIELD_SELECTOR) && !focused.closest(DISMISSABLE_SELECTOR)) return;
  }
  return escapeStack.at(-1);
}

function handleEscape(event: KeyboardEvent) {
  if (event.key !== 'Escape' || event.defaultPrevented) return;
  const hasVisibleOverlay = Array.from(document.querySelectorAll(OVERLAY_SELECTOR)).some(
    (el) => el.getClientRects().length > 0
  );
  if (hasVisibleOverlay) return;
  pickEscapeEntry(document.activeElement)?.onEscape();
}

function registerEscapeEntry(entry: EscapeEntry) {
  if (escapeStack.length === 0) document.addEventListener('keydown', handleEscape);
  escapeStack.push(entry);
  return () => {
    escapeStack.splice(escapeStack.indexOf(entry), 1);
    if (escapeStack.length === 0) document.removeEventListener('keydown', handleEscape);
  };
}

type Options = {
  enabled: boolean;
  /** Omit to react to Esc only. */
  onDismiss?: () => void;
  /** Overrides `onDismiss` for Esc, e.g. to close an inner view before the whole element. */
  onEscape?: () => void;
  /** Extra CSS selector whose matches never count as an outside click. */
  ignoreSelector?: string;
};

export function useDismissOnOutsideInteraction<T extends HTMLElement>({
  enabled,
  onDismiss,
  onEscape,
  ignoreSelector,
}: Options) {
  const ref = useRef<T>(null);
  const selector = ignoreSelector
    ? `${OVERLAY_IGNORED_SELECTOR},${ignoreSelector}`
    : OVERLAY_IGNORED_SELECTOR;

  const canDismiss = enabled && Boolean(onDismiss);
  const shouldIgnorePointer = useCallback(
    (event: Event) => {
      if (!canDismiss) return true;
      const target = event.target;
      if (!(target instanceof Element)) return true;
      if (belongsToAnotherDismissable(target, ref.current)) return true;
      return target.closest(selector) !== null;
    },
    [canDismiss, selector]
  );

  useOnClickOutside(ref, () => onDismiss?.(), undefined, shouldIgnorePointer);

  const onEsc = onEscape ?? onDismiss;
  const onEscRef = useRef(onEsc);
  useEffect(() => {
    onEscRef.current = onEsc;
  }, [onEsc]);

  const handlesEscape = enabled && Boolean(onEsc);
  useEffect(() => {
    if (!handlesEscape) return;
    return registerEscapeEntry({
      element: () => ref.current,
      onEscape: () => onEscRef.current?.(),
    });
  }, [handlesEscape]);

  return ref;
}

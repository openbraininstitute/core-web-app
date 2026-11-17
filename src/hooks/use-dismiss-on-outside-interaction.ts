import { useCallback, useEffect, useRef } from 'react';

import { APP_ROOT_ATTRIBUTE } from '@/hooks/app-root-attribute';
import { useOnClickOutside } from '@/hooks/useOnClickOutside';

const APP_ROOT_SELECTOR = `[${APP_ROOT_ATTRIBUTE}]`;

// Popups (modals, dropdowns, tours) are portaled to <body>, outside the app root: they never
// count as "outside" and an Esc pressed while focus is in one belongs to them.
function isInsideAppRoot(node: Element | null) {
  return node?.closest(APP_ROOT_SELECTOR) != null;
}

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
  const focused = document.activeElement;
  if (focused && focused !== document.body && !isInsideAppRoot(focused)) return;
  pickEscapeEntry(focused)?.onEscape();
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
  const canDismiss = enabled && Boolean(onDismiss);
  const shouldIgnorePointer = useCallback(
    (event: Event) => {
      if (!canDismiss) return true;
      const target = event.target;
      if (!(target instanceof Element)) return true;
      if (!isInsideAppRoot(target)) return true;
      if (belongsToAnotherDismissable(target, ref.current)) return true;
      return ignoreSelector ? target.closest(ignoreSelector) !== null : false;
    },
    [canDismiss, ignoreSelector]
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

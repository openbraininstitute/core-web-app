// Whether an element is on screen. One IntersectionObserver per margin for the whole page, not
// one per element (observer pattern, shared subject): the browser works out every watched element
// in one pass, and a list of 100 cards costs one observer. The viewport is the root, so a card
// scrolled out of its own list (the rail, the grid) counts as hidden too.
import { isNil } from 'es-toolkit';
import { useEffect, useState } from 'react';

import type { RefObject } from 'react';

type TListener = (visible: boolean) => void;

interface IShared {
  readonly observer: IntersectionObserver;
  readonly listeners: Map<Element, TListener>;
}

const shared = new Map<string, IShared>();

function watch(element: Element, margin: string, listener: TListener): () => void {
  let entry = shared.get(margin);
  if (isNil(entry)) {
    const listeners = new Map<Element, TListener>();
    const observer = new IntersectionObserver(
      (changes) => {
        for (const change of changes) listeners.get(change.target)?.(change.isIntersecting);
      },
      { rootMargin: margin }
    );
    entry = { observer, listeners };
    shared.set(margin, entry);
  }
  const { observer, listeners } = entry;
  listeners.set(element, listener);
  observer.observe(element);
  return () => {
    observer.unobserve(element);
    listeners.delete(element);
  };
}

export interface IInViewOptions {
  // How far outside the screen an element already counts as on it ("200px": fetch a bit ahead).
  readonly margin?: string;
  // Stay true once seen: for a fetch that should happen once, not on every scroll past.
  readonly once?: boolean;
}

export function useInView(
  ref: RefObject<Element | null>,
  { margin = '0px', once = false }: IInViewOptions = {}
): boolean {
  const [inView, setInView] = useState(false);
  useEffect(() => {
    const element = ref.current;
    if (isNil(element)) return;
    // No observer (an old browser, a test): treat as shown, so nothing stays unloaded.
    if (typeof IntersectionObserver === 'undefined') return setInView(true);
    const stop = watch(element, margin, (visible) => {
      setInView((was) => (once && was) || visible);
      if (visible && once) stop();
    });
    return stop;
  }, [ref, margin, once]);
  return inView;
}

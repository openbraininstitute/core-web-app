// One shared IntersectionObserver per margin, not one per element; the viewport is the root.
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
  // e.g. "200px" to fetch a bit ahead.
  readonly margin?: string;
  // Stay true once seen.
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
    // No observer (old browser, test): treat as shown.
    if (typeof IntersectionObserver === 'undefined') return setInView(true);
    const stop = watch(element, margin, (visible) => {
      setInView((was) => (once && was) || visible);
      if (visible && once) stop();
    });
    return stop;
  }, [ref, margin, once]);
  return inView;
}

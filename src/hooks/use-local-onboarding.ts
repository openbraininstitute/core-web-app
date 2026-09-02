'use client';

import { useEffect, useState } from 'react';

import { isBrowser } from '@/utils/environment';

/**
 * Progress for a tour whose state is not yet in the backend onboarding table.
 * Same shape as the API's per-tour record, so moving a tour over later is a swap
 * of the read/write pair rather than a change of meaning.
 */
export type TLocalTourStatus = {
  currentStep?: number;
  completed?: boolean;
  dismissed?: boolean;
};

const STORAGE_KEY = 'obi:onboarding:local-tours';

/** Reading is best effort: private mode and blocked site data both throw. */
function readAll(): Record<string, TLocalTourStatus> {
  if (!isBrowser()) return {};
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return {};
    const parsed: unknown = JSON.parse(raw);
    return parsed && typeof parsed === 'object' ? (parsed as Record<string, TLocalTourStatus>) : {};
  } catch {
    return {};
  }
}

export function readLocalTourStatus(tour: string): TLocalTourStatus | undefined {
  return readAll()[tour];
}

/** Merges into the tour's record; a failed write only costs the user a repeat tour. */
export function writeLocalTourStatus(tour: string, patch: TLocalTourStatus): void {
  if (!isBrowser()) return;
  try {
    const all = readAll();
    window.localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({ ...all, [tour]: { ...all[tour], ...patch } })
    );
  } catch {
    // storage unavailable — the tour simply shows again next time
  }
}

export function isLocalTourDone(tour: string): boolean {
  const status = readLocalTourStatus(tour);
  return Boolean(status?.completed || status?.dismissed);
}

/**
 * Waits for `selector` to exist, so a tour cannot open against a missing anchor. Observes
 * the tree rather than polling to a deadline — a grid that takes its time still gets the tour.
 */
function useSelectorPresent(selector: string | undefined): boolean {
  const [present, setPresent] = useState(() =>
    selector ? isBrowser() && Boolean(document.querySelector(selector)) : true
  );

  useEffect(() => {
    if (!selector || present || !isBrowser()) return;

    if (document.querySelector(selector)) {
      setPresent(true);
      return;
    }

    const observer = new MutationObserver(() => {
      if (document.querySelector(selector)) setPresent(true);
    });
    observer.observe(document.body, { childList: true, subtree: true });

    return () => observer.disconnect();
  }, [selector, present]);

  return present;
}

/**
 * Starts a tour whose completion lives in localStorage rather than the onboarding API.
 * For features shipped ahead of their backend flag — the tour runs once per browser.
 */
export function useLocalOnboardingTour({
  tour,
  enabled = true,
  selector,
  startTour,
}: {
  tour: string;
  enabled?: boolean;
  /** anchor the first step points at; the tour waits for it to mount */
  selector?: string;
  startTour: (tour: string) => void;
}): void {
  const anchorReady = useSelectorPresent(enabled ? selector : undefined);

  useEffect(() => {
    if (!enabled || !anchorReady || isLocalTourDone(tour)) return;
    startTour(tour);
  }, [enabled, anchorReady, tour, startTour]);
}

// Notification settings, per viewer, for every log. Set from the list's
// settings button or from an agent message; both read this one store (observer pattern), so a
// change shows at once in the open log. A convenience kept in this browser only: every read and
// write is guarded, the defaults stand when storage is blocked.
import { isNil, isNotNil } from 'es-toolkit';
import { useSyncExternalStore } from 'react';

import type { TValueOf } from '@/api/logbook/types';

export const ToastSource = { All: 'all', Mine: 'mine' } as const;
export type TToastSource = TValueOf<typeof ToastSource>;

export interface INotifySettings {
  readonly toasts: boolean;
  readonly from: TToastSource;
  readonly highlights: boolean;
  readonly flags: boolean;
}

const DEFAULTS: INotifySettings = {
  toasts: true,
  from: ToastSource.All,
  highlights: true,
  flags: true,
};

const KEY = 'rl-notify';

function read(): INotifySettings {
  try {
    const raw = localStorage.getItem(KEY);
    if (isNil(raw)) return DEFAULTS;
    const saved: unknown = JSON.parse(raw);
    return typeof saved === 'object' && isNotNil(saved) ? { ...DEFAULTS, ...saved } : DEFAULTS;
  } catch {
    return DEFAULTS;
  }
}

let current: INotifySettings | null = null; // read on first use, not at import
const listeners = new Set<() => void>();

const snapshot = (): INotifySettings => (current ??= read());

const subscribe = (listener: () => void): (() => void) => {
  listeners.add(listener);
  return () => listeners.delete(listener);
};

export function updateNotifySettings(patch: Partial<INotifySettings>): void {
  current = { ...snapshot(), ...patch };
  try {
    localStorage.setItem(KEY, JSON.stringify(current));
  } catch {
    // storage blocked: the setting holds for this visit
  }
  for (const listener of listeners) listener();
}

export const useNotifySettings = () =>
  [useSyncExternalStore(subscribe, snapshot), updateNotifySettings] as const;

import { isNil, isNotNil } from 'es-toolkit';
import { useSyncExternalStore } from 'react';

import { storageKeyOf } from '@/features/logbook/helpers';
import { ToastSource } from '@/features/logbook/types';

import type { INotifySettings } from '@/features/logbook/types';

const DEFAULTS: INotifySettings = {
  toasts: true,
  from: ToastSource.All,
  highlights: true,
  flags: true,
};

const KEY = storageKeyOf('notify', 'settings');

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

let current: INotifySettings | null = null;
const listeners = new Set<() => void>();

const snapshot = (): INotifySettings => (current ??= read());

const subscribe = (listener: () => void): (() => void) => {
  listeners.add(listener);
  return () => listeners.delete(listener);
};

function updateNotifySettings(patch: Partial<INotifySettings>): void {
  current = { ...snapshot(), ...patch };
  try {
    localStorage.setItem(KEY, JSON.stringify(current));
  } catch {}
  for (const listener of listeners) listener();
}

export const useNotifySettings = () =>
  [useSyncExternalStore(subscribe, snapshot), updateNotifySettings] as const;

'use client';

import { createContext, type ReactNode, useCallback, useContext, useEffect, useState } from 'react';

import {
  DEFAULT_LEARN_SETTINGS,
  LEARN_SETTINGS_COOKIE,
  type LearnSettings,
  serializeLearnSettings,
} from '@/features/learn/learn-settings';

type SetLearnSetting = <K extends keyof LearnSettings>(key: K, value: LearnSettings[K]) => void;

const LearnSettingsContext = createContext<LearnSettings>(DEFAULT_LEARN_SETTINGS);
const SetLearnSettingContext = createContext<SetLearnSetting>(() => {});

/**
 * Learn's settings, as the server read them from their cookie — and, once changed here, as changed:
 * at once, everywhere they are used, with the cookie written from the browser for the server's next
 * render. Nothing is asked of the server, which would draw the whole app again for a switch.
 */
export function LearnSettingsProvider({
  settings: initial,
  children,
}: {
  settings: LearnSettings;
  children: ReactNode;
}) {
  const [settings, setSettings] = useState(initial);
  // drawn again by the server, which reads the same cookie: what it read wins
  const [served, setServed] = useState(initial);
  if (serializeLearnSettings(initial) !== serializeLearnSettings(served)) {
    setServed(initial);
    setSettings(initial);
  }

  useEffect(() => {
    const secure = window.location.protocol === 'https:' ? '; secure' : '';
    // biome-ignore lint/suspicious/noDocumentCookie: written here so a change needs no round trip to the server
    document.cookie = `${LEARN_SETTINGS_COOKIE}=${encodeURIComponent(
      serializeLearnSettings(settings)
    )}; path=/; max-age=${60 * 60 * 24 * 365}; samesite=lax${secure}`;
  }, [settings]);

  const set = useCallback<SetLearnSetting>(
    (key, value) => setSettings((current) => ({ ...current, [key]: value })),
    []
  );

  return (
    <LearnSettingsContext value={settings}>
      <SetLearnSettingContext value={set}>{children}</SetLearnSettingContext>
    </LearnSettingsContext>
  );
}

/** Learn's settings, as they stand: the defaults outside the provider. */
export function useLearnSettings(): LearnSettings {
  return useContext(LearnSettingsContext);
}

export function useLearnSetting<K extends keyof LearnSettings>(key: K): LearnSettings[K] {
  return useLearnSettings()[key];
}

/** Changes one of Learn's settings, at once. */
export function useSetLearnSetting(): SetLearnSetting {
  return useContext(SetLearnSettingContext);
}

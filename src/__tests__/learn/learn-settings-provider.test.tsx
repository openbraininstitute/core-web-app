import { fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';

import { DEFAULT_LEARN_SETTINGS, LEARN_SETTINGS_COOKIE } from '@/features/learn/learn-settings';
import {
  LearnSettingsProvider,
  useLearnSetting,
  useSetLearnSetting,
} from '@/features/learn/learn-settings-provider';

/** Help's lean switch, as the Learn page's Dev settings have it. */
function LeanSwitch() {
  const lean = useLearnSetting('leanHelp');
  const set = useSetLearnSetting();
  return (
    <button type="button" onClick={() => set('leanHelp', !lean)}>
      {lean ? 'lean' : 'full'}
    </button>
  );
}

/** What the browser holds in Learn's settings cookie, if anything. */
function saved() {
  const prefix = `${LEARN_SETTINGS_COOKIE}=`;
  const found = document.cookie.split('; ').find((cookie) => cookie.startsWith(prefix));
  return found && decodeURIComponent(found.slice(prefix.length));
}

afterEach(() => {
  // biome-ignore lint/suspicious/noDocumentCookie: clears the cookie the way the provider writes it
  document.cookie = `${LEARN_SETTINGS_COOKIE}=; path=/; max-age=0`;
});

describe('LearnSettingsProvider', () => {
  it('writes no cookie for someone who never changes a setting', () => {
    render(
      <LearnSettingsProvider settings={DEFAULT_LEARN_SETTINGS}>
        <LeanSwitch />
      </LearnSettingsProvider>
    );
    expect(screen.getByRole('button')).toHaveTextContent('full');
    expect(saved()).toBeUndefined();
  });

  it('writes the cookie when a setting is changed, and shows the change at once', () => {
    render(
      <LearnSettingsProvider settings={DEFAULT_LEARN_SETTINGS}>
        <LeanSwitch />
      </LearnSettingsProvider>
    );
    fireEvent.click(screen.getByRole('button'));
    expect(screen.getByRole('button')).toHaveTextContent('lean');
    expect(saved()).toBe('{"v":2,"leanHelp":true}');

    fireEvent.click(screen.getByRole('button'));
    expect(screen.getByRole('button')).toHaveTextContent('full');
    expect(saved()).toBe('{"v":2}');
  });
});

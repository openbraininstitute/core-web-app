import { render, screen, waitFor } from '@testing-library/react';
import { NuqsTestingAdapter, type OnUrlUpdateFunction } from 'nuqs/adapters/testing';
import { describe, expect, it, vi } from 'vitest';

import { FlagsProvider } from '@/features/feature-flags';
import { defaultFlags } from '@/features/feature-flags/config';
import { DEFAULT_LEARN_SETTINGS } from '@/features/learn/learn-settings';
import { LearnSettingsProvider } from '@/features/learn/learn-settings-provider';
import { HelpHeader } from '@/ui/segments/help/header';

vi.mock('next/navigation', () => ({
  usePathname: () => '/app/virtual-lab/lab/project/help',
  useRouter: () => ({ replace: vi.fn() }),
}));

/** Help's tabs, with "Remove unneeded features" saved in Learn's settings. */
function renderTabs(learn: boolean, section?: string, onUrlUpdate?: OnUrlUpdateFunction) {
  render(
    <NuqsTestingAdapter searchParams={section ? { section } : {}} onUrlUpdate={onUrlUpdate}>
      <FlagsProvider flags={{ ...defaultFlags, learn }}>
        <LearnSettingsProvider settings={{ ...DEFAULT_LEARN_SETTINGS, leanHelp: true }}>
          <HelpHeader />
        </LearnSettingsProvider>
      </FlagsProvider>
    </NuqsTestingAdapter>
  );
  return screen.getAllByRole('tab').map((tab) => tab.textContent);
}

describe('HelpHeader with Help made lean', () => {
  it('shows only the lean sections while Learn is on', () => {
    expect(renderTabs(true)).toEqual(['Guides', 'Features', 'About']);
    expect(screen.getByRole('tab', { name: 'Guides' })).toHaveAttribute('data-state', 'active');
  });

  it('lands a link to a section it leaves off on Guides, and puts the address right', async () => {
    const onUrlUpdate = vi.fn<OnUrlUpdateFunction>();
    renderTabs(true, 'tutorials', onUrlUpdate);
    expect(screen.getByRole('tab', { name: 'Guides' })).toHaveAttribute('data-state', 'active');
    await waitFor(() => expect(onUrlUpdate).toHaveBeenCalled());
    expect(onUrlUpdate.mock.calls.at(-1)?.[0].searchParams.get('section')).toBe('guides');
  });

  it('is ignored while Learn is off, which leaves Help as on main', () => {
    expect(renderTabs(false, 'ai-tools')).toEqual([
      'Overview',
      'Tutorials',
      'Glossary',
      'Guides',
      'Features',
      'AI Chat Tools',
      'About',
    ]);
    expect(screen.getByRole('tab', { name: 'AI Chat Tools' })).toHaveAttribute(
      'data-state',
      'active'
    );
  });
});

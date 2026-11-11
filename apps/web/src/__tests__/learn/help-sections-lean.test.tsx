import { describe, expect, it, vi } from 'vitest';

import { getAllFlags } from '@/features/feature-flags';
import HelpSectionContent from '@/ui/segments/help/sections';

// "Remove unneeded features" saved in Learn's settings
vi.mock('@/features/learn/learn-settings-server', () => ({
  getLearnSettings: async () => ({ hiddenCourses: [], leanHelp: true }),
}));
vi.mock('@/features/feature-flags', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/features/feature-flags')>()),
  getAllFlags: vi.fn(),
}));
// the sections themselves, which read Sanity, stood in for by name
vi.mock('@/ui/segments/help/overview', () => ({ default: function Overview() {} }));
vi.mock('@/ui/segments/help/tutorials', () => ({ default: function Tutorials() {} }));
vi.mock('@/ui/segments/help/glossary', () => ({ default: function Glossary() {} }));
vi.mock('@/ui/segments/help/guides', () => ({ default: function Guides() {} }));
vi.mock('@/ui/segments/help/features', () => ({ default: function Features() {} }));
vi.mock('@/ui/segments/help/ai-chat-tools', () => ({ default: function AiChatTools() {} }));
vi.mock('@/ui/segments/help/about', () => ({ default: function About() {} }));

/** The section the Help page draws for `?section=`, with the `learn` flag on or off. */
async function shown(learn: boolean, section: string) {
  vi.mocked(getAllFlags).mockResolvedValue({ learn } as never);
  const el = (await HelpSectionContent({ searchParams: { section } })) as {
    type: { name: string };
  };
  return el.type.name;
}

describe('Help sections with Help made lean', () => {
  it('land one it leaves off on Guides while Learn is on', async () => {
    expect(await shown(true, 'ai-tools')).toBe('Guides');
    expect(await shown(true, 'about')).toBe('About');
  });

  it('ignore the setting while Learn is off, as only its page can switch it back', async () => {
    expect(await shown(false, 'ai-tools')).toBe('AiChatTools');
    expect(await shown(false, 'tutorials')).toBe('Tutorials');
  });
});

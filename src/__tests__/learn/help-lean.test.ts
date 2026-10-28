import { describe, expect, it } from 'vitest';

import { helpSectionShown, LEAN_HELP_SECTIONS } from '@/ui/segments/help/lean';

describe('helpSectionShown', () => {
  it('shows every section as asked, opening on Overview, while Help is as it is', () => {
    expect(helpSectionShown(null, false)).toBe('overview');
    for (const section of ['overview', 'tutorials', 'glossary', 'guides', 'ai-tools', 'about'])
      expect(helpSectionShown(section, false)).toBe(section);
  });

  it('keeps only Guides, Features and About when Help is lean, landing anything else on Guides', () => {
    expect(LEAN_HELP_SECTIONS).toEqual(['guides', 'features', 'about']);
    expect(helpSectionShown(null, true)).toBe('guides');
    for (const section of ['overview', 'tutorials', 'glossary', 'ai-tools', 'nonsense'])
      expect(helpSectionShown(section, true)).toBe('guides');
    expect(helpSectionShown('features', true)).toBe('features');
    expect(helpSectionShown('about', true)).toBe('about');
  });
});

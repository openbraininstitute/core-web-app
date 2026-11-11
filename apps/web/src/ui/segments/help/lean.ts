/**
 * Help without what Learn now covers - its overview, tutorials and glossary - or does without, the AI
 * chat tools: the sections left while Learn's "remove unneeded features" setting is on.
 */
export const LEAN_HELP_SECTIONS: readonly string[] = ['guides', 'features', 'about'];

/** The Help section to show for `?section=`: as asked, or, with Help made lean, Guides for one left off. */
export function helpSectionShown(section: string | null, lean: boolean): string {
  if (lean) return section !== null && LEAN_HELP_SECTIONS.includes(section) ? section : 'guides';
  return section ?? 'overview';
}

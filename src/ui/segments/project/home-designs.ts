'use client';

import { usePathname, useSearchParams } from 'next/navigation';

/**
 * The project home's designs: the home as on main, the first and so the one without a design in its
 * address, then the alternatives: the Figma rows of tutorials and examples, the scrolling walkthrough,
 * the models home the walkthroughs end on, and the walkthrough of the course's three brains, its landing
 * with the fly walking in or with the fly's nervous system alone.
 */
export const HOME_DESIGNS = ['main', 'rows', 'walkthrough', 'models', 'brains', 'fly-brain'] as const;
export type THomeDesign = (typeof HOME_DESIGNS)[number];

/** The designs Home's menu offers; the rest open only by their address. */
export const HOME_MENU: readonly THomeDesign[] = ['main', 'brains', 'fly-brain'];

/** What each design is called in Home's menu, and a line on what it shows. */
export const HOME_DESIGN_CHOICES: Record<THomeDesign, { name: string; note: string }> = {
  rows: { name: 'Start', note: 'Tutorials and examples, as in the design' },
  walkthrough: { name: 'Walkthrough', note: 'The platform, a screen at a time' },
  models: { name: 'Models home', note: 'Shortcuts, the featured video and models' },
  brains: { name: 'Walking Fly (demo)', note: 'The brains walkthrough, a fly walking in with its brain' },
  'fly-brain': { name: 'Fly brain (demo)', note: 'The brains walkthrough, the fly’s brain and nerve cord turning' },
  main: { name: 'Home', note: 'The project home the platform has now' },
};

/** The design in the address, the first without one; `query: { design }` in links. */
export const HOME_DESIGN_PARAM = 'design';

export function homeDesignOf(value: string | null): THomeDesign {
  return HOME_DESIGNS.find((design) => design === value) ?? HOME_DESIGNS[0];
}

/** A design's address: the home, with the design named unless it is the first. */
export function homeDesignHref(
  homePath: string,
  design: THomeDesign
): { pathname: string; query?: { design: string } } {
  return design === HOME_DESIGNS[0]
    ? { pathname: homePath }
    : { pathname: homePath, query: { design } };
}

/** The design on show, on the home page; null anywhere else. */
export function useHomeDesignOnShow(homePath: string): THomeDesign | null {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const trim = (path: string) => path.replace(/\/+$/, '');
  return trim(pathname) === trim(homePath)
    ? homeDesignOf(searchParams.get(HOME_DESIGN_PARAM))
    : null;
}

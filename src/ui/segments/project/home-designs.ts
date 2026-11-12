'use client';

import { usePathname, useSearchParams } from 'next/navigation';

/**
 * The project home's designs: the home as on main, the first and so the one without a design in its
 * address, then the scrolling walkthrough and the two brains landings.
 */
export const HOME_DESIGNS = ['main', 'walkthrough', 'brains', 'fly-brain'] as const;
export type THomeDesign = (typeof HOME_DESIGNS)[number];

/** The designs Home's menu offers; the two walkthroughs, the plain home staying off the menu. */
export const HOME_MENU: readonly THomeDesign[] = ['walkthrough', 'brains', 'fly-brain'];

/** What each design is called in Home's menu, and a line on what it shows. */
export const HOME_DESIGN_CHOICES: Record<THomeDesign, { name: string; note: string }> = {
  walkthrough: { name: 'Walkthrough', note: 'The platform, a screen at a time' },
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

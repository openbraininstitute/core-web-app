'use client';

import { useState } from 'react';

import {
  type BuildSettings,
  DARK_PALETTE,
  DEFAULT_BUILD,
  DEFAULT_BUMPS,
  LIGHT_PALETTE,
  MIN_WIDTH,
} from './constants';
import { DEFAULT_LOOK } from './engine/looks';

import type { Palette } from './engine/colors';
import type { BumpParams, Look } from './engine/looks';
import type { Projection, SkeletonKind } from './engine/viewer';

export type ColorBy = 'section' | 'distance';

export interface ViewerSettings {
  dark: boolean;
  /** One palette per theme: Dark mode swaps them, and a colour picked in one theme stays in it. */
  palettes: { light: Palette; dark: Palette };
  /** SWC types left out of the mesh and the skeletons. */
  hiddenTypes: number[];
  colorBy: ColorBy;
  look: string;
  typeTint: boolean;
  ao: boolean;
  bumps: boolean;
  bump: BumpParams;
  /** CSS pixels; 0 is off. */
  minWidth: number;
  showMesh: boolean;
  wireframe: boolean;
  /** Takes over from the traced skeleton, which shows until the first mesh. */
  skeleton: SkeletonKind | null;
  spin: boolean;
  projection: Projection;
  /** In the orthographic view: a perspective one has no single scale. */
  scalebar: boolean;
  build: BuildSettings;
  /** The bumps and the occlusion before the look turned its own on, to be put back when another is chosen. */
  beforeLook: Pick<ViewerSettings, 'bumps' | 'bump' | 'ao'> | null;
}

const DEFAULT_SETTINGS: ViewerSettings = {
  dark: false,
  palettes: { light: LIGHT_PALETTE, dark: DARK_PALETTE },
  hiddenTypes: [],
  colorBy: 'section',
  look: DEFAULT_LOOK,
  typeTint: false,
  ao: false,
  bumps: true,
  bump: DEFAULT_BUMPS,
  minWidth: MIN_WIDTH.initial,
  showMesh: true,
  wireframe: false,
  skeleton: null,
  spin: false,
  projection: 'orthographic',
  scalebar: true,
  build: DEFAULT_BUILD,
  beforeLook: null,
};

export function currentPalette(settings: ViewerSettings): Palette {
  return settings.palettes[settings.dark ? 'dark' : 'light'];
}

export type UpdateSettings = (patch: Partial<ViewerSettings>) => void;

export function useViewerSettings() {
  const [settings, setSettings] = useState(DEFAULT_SETTINGS);
  const update: UpdateSettings = (patch) => setSettings((s) => ({ ...s, ...patch }));
  const setColor = (key: keyof Palette, color: string) =>
    setSettings((s) => {
      const theme = s.dark ? 'dark' : 'light';
      // A picker sends the colour it already has while dragged past its edge: each would repaint the mesh.
      if (s.palettes[theme][key] === color) return s;
      return {
        ...s,
        palettes: { ...s.palettes, [theme]: { ...s.palettes[theme], [key]: color } },
      };
    });
  // As before the port: the colours, the hidden types and Colour by go back to their defaults.
  const resetColors = () =>
    setSettings((s) => ({
      ...s,
      palettes: DEFAULT_SETTINGS.palettes,
      // The same array while nothing is hidden, so that the skeletons are not built again.
      hiddenTypes: s.hiddenTypes.length === 0 ? s.hiddenTypes : [],
      colorBy: 'section',
    }));
  const chooseLook = (look: Look) =>
    setSettings((s) => {
      const before = s.beforeLook ?? { bumps: s.bumps, bump: s.bump, ao: s.ao };
      return {
        ...s,
        ...before,
        look: look.id,
        ...(look.bumps && { bumps: true, bump: look.bumps }),
        ...(look.ao && { ao: true }),
        beforeLook: look.bumps || look.ao ? before : null,
      };
    });
  return { settings, update, setColor, resetColors, chooseLook };
}

/** What the chrome can do with the settings. */
export type ViewerActions = Omit<ReturnType<typeof useViewerSettings>, 'settings'>;

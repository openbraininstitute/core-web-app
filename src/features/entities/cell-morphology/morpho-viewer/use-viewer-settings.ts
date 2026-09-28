'use client';

import { useState } from 'react';

import { DARK_PALETTE, DEFAULT_BUMPS, LIGHT_PALETTE, MIN_WIDTH } from './constants';
import { DEFAULT_LOOK } from './engine/looks';

import type { Palette } from './engine/colors';
import type { BumpParams } from './engine/looks';
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
}

const DEFAULT_SETTINGS: ViewerSettings = {
  dark: false,
  palettes: { light: LIGHT_PALETTE, dark: DARK_PALETTE },
  hiddenTypes: [],
  colorBy: 'section',
  look: DEFAULT_LOOK,
  typeTint: false,
  ao: false,
  bumps: false,
  bump: DEFAULT_BUMPS,
  minWidth: MIN_WIDTH.initial,
  showMesh: true,
  wireframe: false,
  skeleton: null,
  spin: false,
  projection: 'orthographic',
  scalebar: true,
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
  return { settings, update, setColor, resetColors };
}

/** What the chrome can do with the settings. */
export type ViewerActions = Omit<ReturnType<typeof useViewerSettings>, 'settings'>;

import { PLAIN, type ThemeColors } from '@/features/viewer-3d/engine/looks';

interface MeshColor {
  id: string;
  label: string;
  colors: ThemeColors;
}

/**
 * The colours to choose from, besides the picker's. Slate is each look's own (`Look.plain`). The others are as light as
 * Studio allows for a median 4:1 against its light background, and over the dark one as colourful, at an OKLCH
 * lightness of 0.72: about the most at which sRGB holds cobalt's chroma. Lighter, they fade to pastels.
 */
export const MESH_COLORS: readonly MeshColor[] = [
  { id: 'slate', label: 'Slate', colors: PLAIN },
  { id: 'warm-grey', label: 'Warm grey', colors: { light: '#7a746b', dark: '#aaa49a' } },
  { id: 'coral', label: 'Coral', colors: { light: '#c2513b', dark: '#f37d65' } },
  { id: 'sage', label: 'Sage', colors: { light: '#428252', dark: '#75b683' } },
  { id: 'teal', label: 'Teal', colors: { light: '#148282', dark: '#57b6b6' } },
  { id: 'cobalt', label: 'Cobalt', colors: { light: '#3f77c9', dark: '#6ba5fb' } },
  { id: 'violet', label: 'Violet', colors: { light: '#8665ba', dark: '#b291ea' } },
];

const DEFAULT_MESH_COLOR = 'cobalt';
const STORAGE_KEY = 'em-mesh-color';
const HEX = /^#[0-9a-f]{6}$/i;

export function surfaceColor(choice: string): ThemeColors {
  return MESH_COLORS.find((c) => c.id === choice)?.colors ?? { light: choice, dark: choice };
}

export function storedMeshColor(): string {
  try {
    const value = localStorage.getItem(STORAGE_KEY);
    if (value && (HEX.test(value) || MESH_COLORS.some((c) => c.id === value))) return value;
  } catch {
    // Storage blocked: the default.
  }
  return DEFAULT_MESH_COLOR;
}

export function storeMeshColor(choice: string): void {
  try {
    localStorage.setItem(STORAGE_KEY, choice);
  } catch {
    // Storage blocked or full: the colour holds for this visit only.
  }
}

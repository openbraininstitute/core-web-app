import { PLAIN, type ThemeColors } from '@/features/viewer-3d/engine/looks';

interface MeshColor {
  id: string;
  label: string;
  colors: ThemeColors;
}

/**
 * The colours to choose from, besides the picker's. Slate is each look's own (`Look.plain`). The others are as light as
 * Studio allows for a median 4:1 against its light background, and lighter over the dark one by as much as slate's
 * grey is.
 */
export const MESH_COLORS: readonly MeshColor[] = [
  { id: 'slate', label: 'Slate', colors: PLAIN },
  { id: 'warm-grey', label: 'Warm grey', colors: { light: '#7a746b', dark: '#dad3c9' } },
  { id: 'coral', label: 'Coral', colors: { light: '#c2513b', dark: '#feccc0' } },
  { id: 'sage', label: 'Sage', colors: { light: '#428252', dark: '#a1e3ae' } },
  { id: 'teal', label: 'Teal', colors: { light: '#148282', dark: '#85e3e3' } },
  { id: 'cobalt', label: 'Cobalt', colors: { light: '#3f77c9', dark: '#c1d9fc' } },
  { id: 'violet', label: 'Violet', colors: { light: '#8665ba', dark: '#dfd0fe' } },
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

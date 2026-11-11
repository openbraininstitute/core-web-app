import type { ReactNode } from 'react';

/** What surrounds the Debug menus, for `vi.mock(path, () => import('@/__tests__/viewer-3d/debug-menus-stubs'))`. */
export function ViewerChrome({ menus, children }: { menus: ReactNode; children: ReactNode }) {
  return (
    <div>
      {menus}
      {children}
    </div>
  );
}

export const SettingsMenu = () => <button type="button">Viewer settings</button>;
export const MeshColorMenu = () => null;
export const ColorByMenu = () => null;
export const NeuritesKey = () => null;
export const LoadStatus = () => null;
export const BuildStatus = () => null;
export const lookTheme = () => ({});

const never = () => new Promise(() => {});
export const loadCrowding = never;
export const loadMortonSorted = never;

/** Answers every method with nothing to undo: nothing here looks at what the engine draws. */
export class CircuitMorphologyViewer {
  constructor(readonly host: HTMLElement) {
    const nothing = () => () => {};
    // biome-ignore lint/correctness/noConstructorReturn: every method, without listing them
    return new Proxy(this, {
      get: (viewer, key) => (key in viewer ? viewer[key as keyof typeof viewer] : nothing),
    });
  }
}

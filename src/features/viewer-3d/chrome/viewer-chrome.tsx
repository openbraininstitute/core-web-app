import { RiFocus3Line } from '@remixicon/react';

import {
  ChromeButton,
  FullscreenButton,
} from '@/features/scan-config/components/color-by/chrome-button';

import { AxesGizmo } from './axes-gizmo';
import { Scalebar } from './scalebar';
import { WheelHint } from './status';

import type { ReactNode } from 'react';
import type { ViewerTheme } from '@/features/scan-config/components/color-by/contrast';
import type { Projection, SceneViewer } from '../engine/scene-viewer';

/**
 * The control layer over a view, laid out as the circuit viewer's: fullscreen and the viewer's menus (top-left),
 * re-centre under them, what else the viewer shows (`children`), the ruler (bottom-left) and the axes (bottom-right).
 */
export function ViewerChrome({
  viewer,
  root,
  theme,
  settings,
  wheelHint,
  menus,
  children,
}: {
  viewer: SceneViewer;
  /** What the fullscreen button blows up. */
  root: HTMLElement | null;
  theme: ViewerTheme;
  settings: { scalebar: boolean; projection: Projection };
  wheelHint: boolean;
  menus: ReactNode;
  children: ReactNode;
}) {
  return (
    <div className="pointer-events-none absolute inset-0 z-20">
      <div className="pointer-events-auto absolute top-3 left-3 flex flex-col items-start gap-2">
        <div className="flex items-center gap-2">
          <FullscreenButton target={root} />
          {menus}
        </div>
        <ChromeButton
          label="Re-centre view"
          testId="viewer-reset-view"
          onClick={() => viewer.resetView()}
        >
          <RiFocus3Line className="size-4" />
        </ChromeButton>
      </div>
      {children}
      {settings.scalebar && settings.projection === 'orthographic' && (
        <Scalebar viewer={viewer} color={theme.foreground} />
      )}
      <AxesGizmo viewer={viewer} ring={theme.foreground} />
      <WheelHint visible={wheelHint} theme={theme} />
    </div>
  );
}

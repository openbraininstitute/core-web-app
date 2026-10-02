import { RiFocus3Line } from '@remixicon/react';

import { emMeshDebugFlag, useFlag } from '@/features/feature-flags';
import {
  ChromeButton,
  FullscreenButton,
} from '@/features/scan-config/components/color-by/chrome-button';
import { AxesGizmo } from '@/features/viewer-3d/chrome/axes-gizmo';
import { lookTheme } from '@/features/viewer-3d/chrome/look-theme';
import { Scalebar } from '@/features/viewer-3d/chrome/scalebar';
import { WheelHint } from '@/features/viewer-3d/chrome/status';

import { DebugMenu } from './debug-menu';
import { FrameTimes } from './frame-times';
import { LoadStatus } from './load-status';
import { SettingsMenu } from './settings-menu';

import type { Look } from '@/features/viewer-3d/engine/looks';
import type { EmMeshViewer } from '../engine/em-mesh-viewer';
import type { EmMeshLoad } from '../use-em-mesh';
import type { EmViewerSettings, UpdateEmSettings } from '../use-em-viewer-settings';

interface EmViewerChromeProps {
  viewer: EmMeshViewer;
  /** What the fullscreen button blows up. */
  root: HTMLElement | null;
  settings: EmViewerSettings;
  update: UpdateEmSettings;
  chooseLook(look: Look): void;
  load: EmMeshLoad;
  /** The mesh's name, for the Debug menu and the GLB's file. */
  name: string;
  wheelHint: boolean;
}

/**
 * The control layer over the mesh, laid out as the morphology viewer's: fullscreen, settings and, where its flag is
 * on, debug (top-left), re-centre under them, the load's status (top-centre), the ruler (bottom-left) and the axes
 * (bottom-right).
 */
export function EmViewerChrome({
  viewer,
  root,
  settings,
  update,
  chooseLook,
  load,
  name,
  wheelHint,
}: EmViewerChromeProps) {
  const debug = useFlag(emMeshDebugFlag.key);
  const look = viewer.looks.find((l) => l.id === settings.look) ?? viewer.looks[0];
  const theme = lookTheme(look, settings.dark);

  return (
    <div className="pointer-events-none absolute inset-0 z-20">
      <div className="pointer-events-auto absolute top-3 left-3 flex flex-col items-start gap-2">
        <div className="flex items-center gap-2">
          <FullscreenButton target={root} />
          <SettingsMenu
            settings={settings}
            update={update}
            looks={viewer.looks}
            look={look}
            onLook={chooseLook}
          />
          {debug && (
            <DebugMenu
              viewer={viewer}
              load={load}
              name={name}
              settings={settings}
              update={update}
            />
          )}
        </div>
        <ChromeButton
          label="Re-centre view"
          testId="viewer-reset-view"
          onClick={() => viewer.resetView()}
        >
          <RiFocus3Line className="size-4" />
        </ChromeButton>
      </div>

      <LoadStatus load={load} name={name} theme={theme} />
      {debug && settings.frameTimes && <FrameTimes viewer={viewer} />}
      {settings.scalebar && settings.projection === 'orthographic' && (
        <Scalebar viewer={viewer} color={theme.foreground} />
      )}
      <AxesGizmo viewer={viewer} ring={theme.foreground} />
      <WheelHint visible={wheelHint} theme={theme} />
    </div>
  );
}

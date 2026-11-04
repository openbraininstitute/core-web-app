import dynamic from 'next/dynamic';
import { ErrorBoundary } from 'react-error-boundary';

import { debugFlag, useFlag } from '@/features/feature-flags';
import { lookTheme } from '@/features/viewer-3d/chrome/look-theme';
import { ViewerChrome } from '@/features/viewer-3d/chrome/viewer-chrome';

import { LoadStatus } from './load-status';
import { MeshColorMenu } from './mesh-color-menu';
import { SettingsMenu } from './settings-menu';

import type { Look } from '@/features/viewer-3d/engine/looks';
import type { EmMeshViewer } from '../engine/em-mesh-viewer';
import type { EmMeshLoad } from '../use-em-mesh';
import type { EmViewerSettings, UpdateEmSettings } from '../use-em-viewer-settings';

const DebugMenu = dynamic(() => import('./debug-menu').then((m) => m.DebugMenu), { ssr: false });
const FrameTimes = dynamic(() => import('./frame-times').then((m) => m.FrameTimes), { ssr: false });

interface EmViewerChromeProps {
  viewer: EmMeshViewer;
  /** What the fullscreen button blows up. */
  root: HTMLElement | null;
  settings: EmViewerSettings;
  update: UpdateEmSettings;
  chooseLook(look: Look): void;
  chooseColor(color: string): void;
  load: EmMeshLoad;
  /** The mesh's name, for the Debug menu and the GLB's file. */
  name: string;
  wheelHint: boolean;
}

/**
 * The control layer over the mesh: settings and, where its flag is on, debug (top-left), the colour (top-right) and
 * the load's status (top-centre).
 */
export function EmViewerChrome({
  viewer,
  root,
  settings,
  update,
  chooseLook,
  chooseColor,
  load,
  name,
  wheelHint,
}: EmViewerChromeProps) {
  const debug = useFlag(debugFlag.key);
  const look = viewer.looks.find((l) => l.id === settings.look) ?? viewer.looks[0];
  const theme = lookTheme(look, settings.dark);

  return (
    <ViewerChrome
      viewer={viewer}
      root={root}
      theme={theme}
      settings={settings}
      wheelHint={wheelHint}
      menus={
        <>
          <SettingsMenu
            settings={settings}
            update={update}
            looks={viewer.looks}
            look={look}
            onLook={chooseLook}
          />
          {debug && (
            <ErrorBoundary fallback={null}>
              <DebugMenu
                viewer={viewer}
                load={load}
                name={name}
                settings={settings}
                update={update}
              />
            </ErrorBoundary>
          )}
        </>
      }
    >
      <div className="absolute top-3 right-3 flex flex-col items-end gap-2">
        <div className="pointer-events-auto">
          <MeshColorMenu
            value={settings.color}
            onChange={chooseColor}
            dark={settings.dark}
            reason={look.plain ? null : `${look.label} draws in colours of its own.`}
            theme={theme}
          />
        </div>
        {debug && settings.frameTimes && (
          <ErrorBoundary fallback={null}>
            <FrameTimes viewer={viewer} />
          </ErrorBoundary>
        )}
      </div>
      <LoadStatus load={load} name={name} theme={theme} />
    </ViewerChrome>
  );
}

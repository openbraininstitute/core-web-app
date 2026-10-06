import { RiArrowDownSLine } from '@remixicon/react';
import { useState } from 'react';

import { morphologyDebugFlag, useFlag } from '@/features/feature-flags';
import { panelStyle } from '@/features/scan-config/components/color-by/contrast';
import { GIZMO_SIZE } from '@/features/viewer-3d/chrome/axes-gizmo';
import { lookTheme } from '@/features/viewer-3d/chrome/look-theme';
import { ViewerChrome } from '@/features/viewer-3d/chrome/viewer-chrome';
import { cn } from '@/utils/css-class';

import { ColorByMenu } from './color-by-menu';
import { DebugMenu } from './debug-menu';
import { NeuritesKey } from './neurites-key';
import { SettingsMenu } from './settings-menu';
import { BuildStatus } from './status';

import type { Look } from '@/features/viewer-3d/engine/looks';
import type { Viewer } from '../engine/viewer';
import type { MorphologyMeshState } from '../use-morphology-mesh';
import type { ViewerActions, ViewerSettings } from '../use-viewer-settings';

import styles from '@/features/scan-config/components/color-by/chrome-animations.module.css';

interface MorphoViewerChromeProps {
  viewer: Viewer;
  /** What the fullscreen button blows up. */
  root: HTMLElement | null;
  settings: ViewerSettings;
  actions: ViewerActions;
  mesh: MorphologyMeshState;
  /** The morphology's name, for the Debug menu. */
  name: string;
  wheelHint: boolean;
  /** The farthest path distance from the soma, once the workers have measured it. */
  maxDistance: number | null;
  /** Why the path distances could not be measured. */
  distanceError: string | null;
}

/**
 * The control layer over the morphology: settings and, where its flag is on, debug (top-left), the colours and their
 * key (top-right) and the build's status (top-centre).
 */
export function MorphoViewerChrome({
  viewer,
  root,
  settings,
  actions,
  mesh,
  name,
  wheelHint,
  maxDistance,
  distanceError,
}: MorphoViewerChromeProps) {
  const [keyOpen, setKeyOpen] = useState(true);
  const debug = useFlag(morphologyDebugFlag.key);
  const { update } = actions;
  const look = viewer.looks.find((l) => l.id === settings.look) ?? viewer.looks[0];
  const theme = lookTheme(look, settings.dark);
  const reason = colorsReason(look, settings.typeTint);
  const types = new Set(mesh.summary?.types.map((t) => t.type));

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
            onLook={actions.chooseLook}
            hasMesh={mesh.layers.mesh !== null}
          />
          {debug && (
            <DebugMenu name={name} state={mesh} settings={settings} update={update} look={look} />
          )}
        </>
      }
    >
      {/* Down to the axes at most: in a short view the key scrolls rather than run under them. */}
      <div
        className="pointer-events-auto absolute top-3 right-3 flex flex-col items-end gap-2"
        style={{ maxHeight: `calc(100% - ${GIZMO_SIZE}px - 2rem)` }}
      >
        <div className="flex items-center gap-1">
          <ColorByMenu
            value={settings.colorBy}
            onChange={(colorBy) => update({ colorBy })}
            theme={theme}
            reason={reason}
          />
          <button
            type="button"
            aria-label={keyOpen ? 'Hide neurite colours' : 'Show neurite colours'}
            aria-expanded={keyOpen}
            onClick={() => setKeyOpen((open) => !open)}
            style={panelStyle(theme)}
            className={cn(
              styles.legendToggle,
              'ml-1 inline-flex size-8 shrink-0 items-center justify-center rounded-full backdrop-blur-sm transition-colors hover:brightness-110 focus-visible:outline-none'
            )}
          >
            <RiArrowDownSLine
              className={cn(styles.chevronIcon, 'size-4', keyOpen && styles.chevronIconOpen)}
            />
          </button>
        </div>
        {keyOpen && (
          <div className={cn(styles.panelReveal, 'min-h-0 overflow-y-auto rounded-xl')}>
            <NeuritesKey
              settings={settings}
              actions={actions}
              types={types}
              look={look}
              theme={theme}
              reason={reason}
              maxDistance={maxDistance}
              distanceError={distanceError}
            />
          </div>
        )}
      </div>

      <BuildStatus mesh={mesh} theme={theme} />
    </ViewerChrome>
  );
}

function colorsReason(look: Look, typeTint: boolean): string | null {
  if (look.colors === 'own') return `${look.label} draws in colours of its own.`;
  if (look.colors === 'tint' && !typeTint) {
    return 'Turn on Type tint in the settings to use the neurite colours.';
  }
  return null;
}

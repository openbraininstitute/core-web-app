import { RiBugLine, RiDownload2Line, RiLoader4Line } from '@remixicon/react';
import { saveAs } from 'file-saver';
import { useState } from 'react';

import { ChromeMenu } from '@/features/scan-config/components/color-by/chrome-menu';
import { logError } from '@/utils/logger';

import { errorMessage } from '../engine/protocol';
import { currentPalette, type UpdateSettings, type ViewerSettings } from '../use-viewer-settings';
import { DebugControls } from './debug-controls';
import { Note, SectionTitle } from './menu-rows';
import { Stats } from './stats';

import type { Palette } from '../engine/colors';
import type { Look } from '../engine/looks';
import type { MeshResult } from '../engine/mesher';
import type { ExportFormat } from '../export';
import type { MorphologyMeshState } from '../use-morphology-mesh';

interface Format {
  format: ExportFormat;
  label: string;
  detail: string;
  extension: string;
  /** In place of the label while the file is written. */
  busy: string;
}

const FORMATS: Format[] = [
  {
    format: 'glb',
    label: 'GLB',
    detail: 'glTF with normals and colours',
    extension: '.glb',
    busy: 'Preparing…',
  },
  {
    format: 'draco',
    label: 'Draco GLB',
    detail: 'The same, 15 to 25 times smaller',
    extension: '.draco.glb',
    busy: 'Compressing…',
  },
  {
    format: 'stl',
    label: 'STL',
    detail: 'Triangles only, for printing and CAD',
    extension: '.stl',
    busy: 'Preparing…',
  },
];

interface DebugMenuProps {
  /** The morphology's name, for the statistics and the files. */
  name: string;
  /** The mesh on show, and the build under way. */
  state: MorphologyMeshState;
  settings: ViewerSettings;
  update: UpdateSettings;
  look: Look;
}

/** Why nothing can be exported now, or null: during a rebuild the mesh on show is not the one the key describes. */
function unavailable({ summary, progress, loadError, buildError, layers }: MorphologyMeshState) {
  if (loadError) return 'The file could not be read.';
  if (buildError) return 'The mesh could not be built.';
  if (!summary || progress !== null) {
    return layers.mesh ? 'The mesh is being built again.' : 'The mesh is still being built.';
  }
  if (!layers.mesh) return 'There is no mesh: every type is hidden.';
  return null;
}

/**
 * The statistics of the file and of the last build, the controls of the build, and below them the mesh on show to
 * download. The exporter loads on the first download and writes the file in a worker of its own.
 */
export function DebugMenu({ name, state, settings, update, look }: DebugMenuProps) {
  const palette = currentPalette(settings);
  // Here and not in the menu's content, so that an export survives the menu closing.
  const [running, setRunning] = useState<ExportFormat | null>(null);
  const [error, setError] = useState<string | null>(null);
  const reason = unavailable(state);
  const { mesh } = state.layers;

  const save = (format: Format, close: () => void) => {
    if (!mesh || reason) return;
    setRunning(format.format);
    setError(null);
    saveMesh(format, mesh, palette, name)
      .then(close, (e: unknown) => {
        logError('Could not export the morphology mesh', e);
        setError(errorMessage(e));
      })
      .finally(() => setRunning(null));
  };

  return (
    <ChromeMenu
      label="Debug"
      openLabel="Close debug"
      testId="morphology-debug"
      icon={<RiBugLine className="size-4 shrink-0" />}
      contentClassName="w-80 p-0"
    >
      {(close) => (
        // The statistics and the controls scroll, and the downloads stay in view under them.
        <div className="flex max-h-[min(50rem,calc(100vh-6rem))] flex-col">
          <div className="min-h-0 overflow-y-auto">
            <div className="p-3">
              <Stats name={name} state={state} palette={palette} />
            </div>
            <div className="border-t border-neutral-200 p-1 pb-2">
              <DebugControls settings={settings} update={update} look={look} gpu={state.gpu} />
            </div>
          </div>
          <div className="flex shrink-0 flex-col gap-1 border-t border-neutral-200 p-2 text-neutral-700">
            <SectionTitle title="Export mesh" topic="export" className="px-1 pb-1" />
            {FORMATS.map((f) => (
              <button
                key={f.format}
                type="button"
                aria-label={f.label}
                aria-description={f.detail}
                disabled={reason !== null || running !== null}
                onClick={() => save(f, close)}
                className="flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-left hover:bg-neutral-100 disabled:cursor-default disabled:opacity-50 disabled:hover:bg-transparent"
              >
                {running === f.format ? (
                  <RiLoader4Line aria-hidden className="size-4 shrink-0 animate-spin" />
                ) : (
                  <RiDownload2Line aria-hidden className="size-4 shrink-0" />
                )}
                <span className="flex flex-col">
                  <span className="text-sm">{running === f.format ? f.busy : f.label}</span>
                  <span className="text-xs text-neutral-500">{f.detail}</span>
                </span>
              </button>
            ))}
            {reason && <Note>{reason}</Note>}
            {error && (
              <p role="alert" className="m-0 px-2 text-xs text-error">
                The export failed: {error}
              </p>
            )}
          </div>
        </div>
      )}
    </ChromeMenu>
  );
}

/** The mesh as a file of the format, saved under the morphology's name. */
async function saveMesh(format: Format, mesh: MeshResult, palette: Palette, name: string) {
  const { exportMesh } = await import('../export');
  saveAs(await exportMesh(format.format, mesh, palette), `${fileName(name)}${format.extension}`);
}

/** The morphology's name, without what a file name cannot hold. */
function fileName(name: string): string {
  return name.replace(/[\\/:*?"<>|]+/g, '_').trim() || 'morphology';
}

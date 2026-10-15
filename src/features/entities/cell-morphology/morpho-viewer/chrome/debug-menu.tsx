import { saveAs } from 'file-saver';
import { useState } from 'react';

import {
  DebugMenuShell,
  DownloadRow,
  FailedNote,
  fileName,
} from '@/features/viewer-3d/chrome/debug-rows';
import { errorMessage } from '@/utils/error';
import { logError } from '@/utils/logger';

import { currentPalette, type UpdateSettings, type ViewerSettings } from '../use-viewer-settings';
import { DebugControls } from './debug-controls';
import { Note, SectionTitle } from './menu-rows';
import { Stats } from './stats';

import type { Look } from '@/features/viewer-3d/engine/looks';
import type { Palette } from '../engine/colors';
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
  // With the mesh it is about: a mesh built since was never exported.
  const [failed, setFailed] = useState<{ mesh: MeshResult; error: string } | null>(null);
  const reason = unavailable(state);
  const { mesh } = state.layers;
  const error = failed?.mesh === mesh ? failed.error : null;

  const save = (format: Format, close: () => void) => {
    if (!mesh || reason) return;
    setRunning(format.format);
    setFailed(null);
    saveMesh(format, mesh, palette, name)
      .then(close, (e: unknown) => {
        logError('Could not export the morphology mesh', e);
        setFailed({ mesh, error: errorMessage(e) });
      })
      .finally(() => setRunning(null));
  };

  return (
    <DebugMenuShell
      testId="morphology-debug"
      body={
        <>
          <div className="p-3">
            <Stats name={name} state={state} palette={palette} />
          </div>
          <div className="border-t border-neutral-200 p-1 pb-2">
            <DebugControls settings={settings} update={update} look={look} gpu={state.gpu} />
          </div>
        </>
      }
      footer={(close) => (
        <>
          <SectionTitle title="Export mesh" topic="export" className="px-1 pb-1" />
          {FORMATS.map((f) => (
            <DownloadRow
              key={f.format}
              label={f.label}
              detail={f.detail}
              busy={running === f.format ? f.busy : null}
              disabled={reason !== null || running !== null}
              onClick={() => save(f, close)}
            />
          ))}
          {reason && <Note>{reason}</Note>}
          {error && <FailedNote>The export failed: {error}</FailedNote>}
        </>
      )}
    />
  );
}

/** The mesh as a file of the format, saved under the morphology's name. */
async function saveMesh(format: Format, mesh: MeshResult, palette: Palette, name: string) {
  const { exportMesh } = await import('../export');
  saveAs(
    await exportMesh(format.format, mesh, palette),
    `${fileName(name, 'morphology')}${format.extension}`
  );
}

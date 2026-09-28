import { RiDownload2Line, RiLoader4Line } from '@remixicon/react';
import { saveAs } from 'file-saver';
import { useState } from 'react';

import { ChromeMenu } from '@/features/scan-config/components/color-by/chrome-menu';
import { logError } from '@/utils/logger';

import { errorMessage } from '../engine/protocol';
import { HelpButton } from '../help/help-button';

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

interface ExportMenuProps {
  /** The morphology's name, for the file's. */
  name: string;
  /** The mesh on show, and the build under way. */
  state: MorphologyMeshState;
  palette: Palette;
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
 * Downloads the mesh on show. The exporter loads on the first click and writes the file in a worker of its own. One
 * component, for a feature flag to wrap.
 */
export function ExportMenu({ name, state, palette }: ExportMenuProps) {
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
      label="Export mesh"
      openLabel="Close export"
      testId="morphology-export"
      icon={<RiDownload2Line className="size-4 shrink-0" />}
      contentClassName="w-64 p-2"
    >
      {(close) => (
        <div className="flex flex-col gap-1 text-neutral-700">
          <div
            className="flex items-center px-1 pb-1 text-sm font-semibold text-primary-9"
            data-help-anchor
          >
            Export mesh
            <HelpButton topic="export" title="Export mesh" />
          </div>
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
          {reason && <p className="m-0 px-2 text-xs italic">{reason}</p>}
          {error && (
            <p role="alert" className="m-0 px-2 text-xs text-error">
              The export failed: {error}
            </p>
          )}
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

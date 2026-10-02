import { RiBox3Line, RiBugLine, RiContrast2Line, RiStackLine } from '@remixicon/react';
import { Fragment, type ReactNode, useEffect, useState } from 'react';

import {
  ChromeMenu,
  SegmentedToggle,
} from '@/features/scan-config/components/color-by/chrome-menu';
import { DownloadRow, fmt, Lines } from '@/features/viewer-3d/chrome/debug-rows';

import { FRAMEBUFFER_BYTES_PER_PIXEL } from '../engine/budget';
import { useSaveGlb } from '../save-glb';
import { HelpRow, ICON, Note, SectionTitle, ToggleRow } from './menu-rows';

import type { AODepth } from '@/features/viewer-3d/engine/scene-viewer';
import type { EmMeshViewer, ViewStatus } from '../engine/em-mesh-viewer';
import type { ForcedMesh, Reason } from '../engine/mesh-choice';
import type { Timing } from '../engine/types';
import type { EmMeshLoad, MeshSummary } from '../use-em-mesh';
import type { EmViewerSettings, UpdateEmSettings } from '../use-em-viewer-settings';

const REASONS: Record<Reason, string> = {
  whole: 'the stand-in is the whole mesh',
  loading: 'the full mesh is not in yet',
  wireframe: 'wireframe draws the stand-in',
  forced: 'chosen below',
  moving: 'the view moves, and full frames are slow',
  error: 'by its error on screen',
};

interface DebugMenuProps {
  viewer: EmMeshViewer;
  load: EmMeshLoad;
  name: string;
  settings: EmViewerSettings;
  update: UpdateEmSettings;
}

/** How the mesh was loaded, what it takes, which of its two meshes is on show and why, and switches to compare. */
export function DebugMenu({ viewer, load, name, settings, update }: DebugMenuProps) {
  // Here and not in the menu's content, so that a download survives the menu closing.
  const { save, saving, error: failed } = useSaveGlb(load.request, name);

  return (
    <ChromeMenu
      label="Debug"
      openLabel="Close debug"
      testId="em-mesh-debug"
      icon={<RiBugLine className="size-4 shrink-0" />}
      contentClassName="w-80 p-0"
    >
      <div className="flex max-h-[min(50rem,calc(100vh-6rem))] flex-col">
        <div className="min-h-0 overflow-y-auto">
          <div className="flex select-text flex-col gap-3 p-3 text-neutral-700">
            <SectionTitle title="Load" topic="load" />
            <Lines lines={loadLines(load, name)} />
            <SectionTitle title="Memory" topic="memory" />
            <LiveLines viewer={viewer} lines={(status) => memoryLines(load, status)} />
            <SectionTitle title="View" topic="view-status" />
            <LiveLines viewer={viewer} lines={(status) => viewLines(load, status)} />
          </div>
          <div className="flex flex-col border-t border-neutral-200 p-1 pb-2 text-neutral-700">
            <HelpRow
              title="AO depth"
              topic="ao-depth"
              icon={<RiContrast2Line className={ICON} />}
              className="flex-wrap"
            >
              <SegmentedToggle<AODepth>
                value={settings.aoDepth}
                onChange={(aoDepth) => update({ aoDepth })}
                options={[
                  { value: 'main-pass', label: "The main pass's depth", text: 'Main pass' },
                  { value: 'own-pass', label: 'A pass of its own', text: 'Own pass' },
                ]}
              />
            </HelpRow>
            <HelpRow
              title="Mesh"
              topic="force-mesh"
              icon={<RiStackLine className={ICON} />}
              className="flex-wrap"
            >
              <SegmentedToggle<ForcedMesh>
                value={settings.mesh}
                onChange={(mesh) => update({ mesh })}
                options={[
                  { value: 'auto', label: 'Chosen by the view', text: 'Auto' },
                  { value: 'stand-in', label: 'Always the stand-in', text: 'Stand-in' },
                  { value: 'full', label: 'Always the full mesh', text: 'Full' },
                ]}
              />
            </HelpRow>
            <ToggleRow
              title="Chunk boxes"
              topic="chunk-boxes"
              icon={<RiBox3Line className={ICON} />}
              checked={settings.chunkBoxes}
              onChange={(chunkBoxes) => update({ chunkBoxes })}
            />
          </div>
        </div>
        <div className="flex shrink-0 flex-col gap-1 border-t border-neutral-200 p-2 text-neutral-700">
          <SectionTitle title="Download" topic="download" className="px-1 pb-1" />
          <DownloadRow
            label="GLB"
            detail="As stored, Draco-compressed"
            busy={saving ? 'Downloading…' : null}
            disabled={!load.request || saving}
            onClick={save}
          />
          {!load.request && <Note>The download is being prepared.</Note>}
          {failed && (
            <p role="alert" className="m-0 px-2 text-xs text-error">
              The download failed: {failed}
            </p>
          )}
        </div>
      </div>
    </ChromeMenu>
  );
}

/** Lines that follow the view, while the menu is open. */
function LiveLines({
  viewer,
  lines,
}: {
  viewer: EmMeshViewer;
  lines(status: ViewStatus): ReactNode[];
}) {
  const [status, setStatus] = useState<ViewStatus | null>(null);
  useEffect(() => viewer.onStatus(setStatus), [viewer]);
  return status ? <Lines lines={lines(status)} /> : null;
}

const MB = (bytes: number) => `${fmt(bytes / 2 ** 20)} MB`;
const ms = (t: number | null | undefined) => (t == null ? '–' : `${fmt(t)} ms`);

/** The time of each step named, summed. */
function took(timings: Timing[], ...steps: string[]): number | null {
  const found = timings.filter((t) => steps.includes(t.step));
  return found.length === 0 ? null : found.reduce((n, t) => n + t.ms, 0);
}

function meshLine(label: string, m: MeshSummary): ReactNode {
  return (
    <Fragment key={label}>
      {label}: <b>{fmt(m.triangles)}</b> triangles, {fmt(m.vertices)} vertices in{' '}
      {m.chunks === 1 ? 'one chunk' : `${fmt(m.chunks)} chunks`}
      {m.errorUm !== undefined && `, error ${fmt(m.errorUm, 2)} µm`}
    </Fragment>
  );
}

function glbSource({ report, meshes }: EmMeshLoad): string {
  if (report?.glbFrom) return report.glbFrom === 'cache' ? 'from the cache' : 'downloaded';
  if (report?.standInFrom === 'cache' && meshes.standIn?.errorUm === 0)
    return 'not needed: the cached stand-in is the whole mesh';
  if (report?.fullFrom === 'cache') return 'not needed: the meshes came from their caches';
  return 'not loaded';
}

function loadLines(load: EmMeshLoad, name: string): ReactNode[] {
  const { report, meshes, times } = load;
  const header = report?.header;
  const t = report?.timings ?? [];
  const lines: ReactNode[] = [<b key="name">{name}</b>];
  lines.push(
    `GLB ${fmt(load.total / 1e6, 1)} MB, ${glbSource(load)}` +
      (header ? `: ${fmt(header.triangles)} triangles, ${fmt(header.vertices)} vertices` : '')
  );
  const grid = meshes.full?.grid ?? meshes.standIn?.grid;
  if (grid) {
    lines.push(
      (report?.dracoBits ? `Draco's grid, ${report.dracoBits} bits` : 'a grid of its own') +
        `: ${fmt(grid.step * 1000, 1)} nm a step`
    );
  }
  if (meshes.standIn) {
    lines.push(meshLine(`stand-in, from the ${report?.standInFrom ?? '…'}`, meshes.standIn));
  }
  if (meshes.full) {
    lines.push(meshLine(`full, from the ${report?.fullFrom ?? '…'}`, meshes.full));
    const { vertices, distinctVertices } = meshes.full;
    if (distinctVertices) {
      lines.push(
        `${fmt(100 * (vertices / distinctVertices - 1), 1)}% of vertices on chunk borders, twice`
      );
    }
  }
  lines.push(
    <Fragment key="times">
      picture after <b>{ms(times.standIn)}</b>, full mesh after {ms(times.full)}, drawn after{' '}
      <b>{ms(times.ready)}</b>
    </Fragment>,
    `download ${ms(took(t, 'download'))}, ` +
      // A tab opened in the background waits to be shown before it decodes, which the times above include.
      ((took(t, 'unseen') ?? 0) >= 100 ? `waited ${ms(took(t, 'unseen'))} to be seen, ` : '') +
      `decode ${ms(took(t, 'decode'))}`
  );
  if (report?.standInFrom === 'build') {
    lines.push(
      `stand-in ${ms(took(t, 'stand-in'))}: simplify ${ms(took(t, 'simplify'))}, ` +
        `pack ${ms(took(t, 'stand-in normals', 'stand-in split', 'stand-in pack'))}`
    );
  }
  lines.push(
    report?.fullFrom === 'cache'
      ? `full ${ms(took(t, 'full'))}, read and decoded`
      : `full ${ms(took(t, 'full'))}: normals ${ms(took(t, 'normals'))}, split ${ms(took(t, 'split'))}, pack ${ms(took(t, 'pack'))}`
  );
  return lines;
}

function memoryLines(load: EmMeshLoad, status: ViewStatus): ReactNode[] {
  const { report } = load;
  const budget = report?.budget;
  const deviceMemory = (navigator as { deviceMemory?: number }).deviceMemory;
  // Moving frames under full resolution have frame buffers of their own.
  const scale = status.movingScale ?? 1;
  const framebuffers =
    status.pixels * FRAMEBUFFER_BYTES_PER_PIXEL * (1 + (scale < 1 ? scale * scale : 0));
  const lines: ReactNode[] = [
    `WASM at its peak: Draco ${report?.dracoHeapBytes ? MB(report.dracoHeapBytes) : '–'}, ` +
      `meshoptimizer ${report?.meshoptHeapBytes ? MB(report.meshoptHeapBytes) : '–'}`,
  ];
  if (budget && budget.kind !== 'too-large') {
    lines.push(
      `budget: ${fmt(budget.peakBytes / 2 ** 30, 2)} GB at the peak, of ${fmt(budget.allowedBytes / 2 ** 30, 1)} GB allowed ` +
        (deviceMemory ? `(${deviceMemory} GB device)` : '(device memory assumed)')
    );
  }
  lines.push(
    <Fragment key="gpu">
      GPU: <b>{MB(status.gpuBytes + framebuffers)}</b>, meshes {MB(status.gpuBytes)} and frame
      buffers {MB(framebuffers)} ({fmt(status.pixels / 1e6, 1)} M pixels)
    </Fragment>
  );
  return lines;
}

function movingLine({ movingMs, movingScale }: ViewStatus): string {
  const cost = movingMs === null ? 'not measured' : `${fmt(movingMs, 1)} ms`;
  if (movingScale === null) return `${cost}, drawn as still ones`;
  return (
    `${cost}, without the occlusion` +
    (movingScale < 1 ? ` at ${fmt(100 * movingScale)}% of the resolution` : '')
  );
}

function viewLines(load: EmMeshLoad, status: ViewStatus): ReactNode[] {
  const lines: ReactNode[] = [
    status.shown ? (
      <Fragment key="shown">
        on show: <b>{status.shown === 'full' ? 'the full mesh' : 'the stand-in'}</b>
        {status.reason && `, ${REASONS[status.reason]}`}
      </Fragment>
    ) : (
      'nothing on show yet'
    ),
  ];
  const errorUm = load.meshes.standIn?.errorUm;
  if (errorUm !== undefined && status.errorPx !== null) {
    lines.push(`stand-in's error: ${fmt(errorUm, 2)} µm, ${fmt(status.errorPx, 2)} device px here`);
  }
  lines.push(
    `full frame: ${status.frameMs === null ? 'not measured' : `${fmt(status.frameMs, 1)} ms`}` +
      (status.timer ? ` (${status.timer === 'timer-query' ? 'timer query' : 'fence'})` : '') +
      (status.slow ? ', slow' : status.slowMoving ? ', slow while moving' : '')
  );
  lines.push(`moving frames: ${movingLine(status)}`);
  if (status.upload) {
    lines.push(
      `upload: ${fmt(status.upload.done)} of ${fmt(status.upload.total)} chunks in ${ms(status.upload.ms)}`
    );
  }
  return lines;
}

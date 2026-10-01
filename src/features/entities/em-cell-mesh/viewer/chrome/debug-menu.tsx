import {
  RiBox3Line,
  RiBugLine,
  RiContrast2Line,
  RiDownload2Line,
  RiLoader4Line,
  RiStackLine,
} from '@remixicon/react';
import { Fragment, type ReactNode, useEffect, useState } from 'react';

import {
  ChromeMenu,
  SegmentedToggle,
} from '@/features/scan-config/components/color-by/chrome-menu';
import { logError } from '@/utils/logger';

import { FRAMEBUFFER_BYTES_PER_PIXEL } from '../engine/budget';
import { saveGlb } from '../save-glb';
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
  const [saving, setSaving] = useState(false);
  const [failed, setFailed] = useState<string | null>(null);

  const save = () => {
    if (!load.request) return;
    setSaving(true);
    setFailed(null);
    saveGlb(load.request, name)
      .catch((e: unknown) => {
        logError('Could not download the EM cell mesh', e);
        setFailed(e instanceof Error ? e.message : String(e));
      })
      .finally(() => setSaving(false));
  };

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
          <button
            type="button"
            aria-label="GLB"
            disabled={!load.request || saving}
            onClick={save}
            className="flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-left hover:bg-neutral-100 disabled:cursor-default disabled:opacity-50 disabled:hover:bg-transparent"
          >
            {saving ? (
              <RiLoader4Line aria-hidden className="size-4 shrink-0 animate-spin" />
            ) : (
              <RiDownload2Line aria-hidden className="size-4 shrink-0" />
            )}
            <span className="flex flex-col">
              <span className="text-sm">{saving ? 'Downloading…' : 'GLB'}</span>
              <span className="text-xs text-neutral-500">As stored, Draco-compressed</span>
            </span>
          </button>
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

function Lines({ lines }: { lines: ReactNode[] }) {
  return (
    <div className="flex flex-col gap-0.5 text-xs leading-snug tabular-nums [overflow-wrap:anywhere] [&_b]:font-semibold [&_b]:text-neutral-900">
      {lines.map((line, i) => (
        // biome-ignore lint/suspicious/noArrayIndexKey: the lines are rebuilt as a whole
        <div key={i}>{line}</div>
      ))}
    </div>
  );
}

function fmt(n: number, digits = 0): string {
  return n.toLocaleString(undefined, {
    maximumFractionDigits: digits,
    minimumFractionDigits: digits,
  });
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

function loadLines(load: EmMeshLoad, name: string): ReactNode[] {
  const { report, meshes, times } = load;
  const header = report?.header;
  const t = report?.timings ?? [];
  const lines: ReactNode[] = [<b key="name">{name}</b>];
  lines.push(
    `GLB ${fmt(load.total / 1e6, 1)} MB, ${report?.glbFromCache ? 'from the cache' : 'downloaded'}` +
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
    lines.push(meshLine('full', meshes.full));
    if (header) {
      lines.push(
        `${fmt(100 * (meshes.full.vertices / header.vertices - 1), 1)}% of vertices on chunk borders, twice`
      );
    }
  }
  lines.push(
    <Fragment key="times">
      picture after <b>{ms(times.standIn)}</b>, full mesh after {ms(times.full)}, drawn after{' '}
      <b>{ms(times.ready)}</b>
    </Fragment>,
    `download ${ms(took(t, 'download'))}, decode ${ms(took(t, 'decode'))}`
  );
  if (report?.standInFrom === 'build') {
    lines.push(
      `stand-in ${ms(took(t, 'stand-in'))}: simplify ${ms(took(t, 'simplify'))}, compact ${ms(took(t, 'compact'))}, ` +
        `pack ${ms(took(t, 'stand-in normals', 'stand-in split', 'stand-in pack'))}`
    );
  }
  lines.push(
    `full ${ms(took(t, 'full'))}: normals ${ms(took(t, 'normals'))}, split ${ms(took(t, 'split'))}, pack ${ms(took(t, 'pack'))}`
  );
  return lines;
}

function memoryLines(load: EmMeshLoad, status: ViewStatus): ReactNode[] {
  const { report } = load;
  const budget = report?.budget;
  const deviceMemory = (navigator as { deviceMemory?: number }).deviceMemory;
  const framebuffers = status.pixels * FRAMEBUFFER_BYTES_PER_PIXEL;
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
      (status.slow ? ', slow' : '')
  );
  if (status.upload) {
    lines.push(
      `upload: ${fmt(status.upload.done)} of ${fmt(status.upload.total)} chunks in ${ms(status.upload.ms)}`
    );
  }
  return lines;
}

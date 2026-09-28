import { RiBarChartBoxLine } from '@remixicon/react';
import { Fragment, type ReactNode } from 'react';

import { ChromeMenu } from '@/features/scan-config/components/color-by/chrome-menu';

import { PALETTE_KEYS } from '../engine/colors';
import {
  BASE_RADIUS_FRACTION,
  SOMA_MIN_RADIUS,
  type SomaStems,
  STEM_FAR_DISTANCE,
  STEM_MIN_DISTANCE,
} from '../engine/soma';
import { SWC_SOMA, typeName } from '../engine/swc';
import { HelpButton } from '../help/help-button';

import type { Palette } from '../engine/colors';
import type { MeshStats } from '../engine/mesher';
import type { MorphologySummary } from '../engine/protocol';

interface StatsProps {
  name: string;
  summary: MorphologySummary | null;
  mesh: MeshStats | null;
  /** Why the last build failed, if it did. */
  buildError: string | null;
  /** Where the mesh was built, and why there. */
  backend: string | null;
  palette: Palette;
}

/**
 * What the file holds and what the last build made: the POC's lines, behind a chrome button of
 * their own. One component, for a feature flag to wrap.
 */
export function StatsMenu(props: StatsProps) {
  return (
    <ChromeMenu
      label="Statistics"
      openLabel="Close statistics"
      testId="morphology-stats"
      icon={<RiBarChartBoxLine className="size-4 shrink-0" />}
      contentClassName="w-80 max-h-[min(36rem,calc(100vh-6rem))] overflow-y-auto p-3"
    >
      <Stats {...props} />
    </ChromeMenu>
  );
}

/** A component of its own, so that the lines are only made while the menu is open. */
function Stats({ name, summary, mesh, buildError, backend, palette }: StatsProps) {
  return (
    <div className="flex flex-col gap-3 text-neutral-700">
      <div className="flex items-center text-sm font-semibold text-primary-9" data-help-anchor>
        Statistics
        <HelpButton topic="stats" title="Statistics" />
      </div>
      <div className="flex flex-col gap-1">
        <div
          className="flex items-center text-xs uppercase tracking-wide text-neutral-400"
          data-help-anchor
        >
          Morphology
          <HelpButton topic="morphology" title="Morphology" />
        </div>
        <Lines lines={summary ? morphologyLines(name, summary, palette) : ['Reading the file…']} />
      </div>
      <div className="flex flex-col gap-1">
        <div className="text-xs uppercase tracking-wide text-neutral-400">Mesh</div>
        <Lines
          lines={
            mesh
              ? meshLines(mesh, backend)
              : [buildError ? `Could not be built: ${buildError}` : 'Not built yet']
          }
        />
      </div>
    </div>
  );
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

/** "1 neck", "3 necks"; "1 batch", "2 batches" given the plural. */
const plural = (n: number, what: string, many = `${what}s`): string =>
  `${fmt(n)} ${n === 1 ? what : many}`;

function morphologyLines(name: string, s: MorphologySummary, palette: Palette): ReactNode[] {
  const hasSoma = s.soma.model !== 'none';
  const lines: ReactNode[] = [
    <b key="name">{name}</b>,
    `${fmt(s.nodeCount)} points, ${fmt(s.sectionCount)} sections`,
    `extent ${fmt(s.size[0])} × ${fmt(s.size[1])} × ${fmt(s.size[2])} µm`,
    `soma: ${s.soma.model}${hasSoma ? `, r = ${s.soma.radius.toFixed(2)} µm` : ''}`,
    ...(hasSoma ? somaStemLines(s.somaStems) : []),
    `origin: ${hasSoma ? 'soma' : 'bbox centre'} (${s.center.map((v) => v.toFixed(1)).join(', ')}) µm`,
  ];
  for (const t of s.types) {
    if (t.type === SWC_SOMA) continue;
    const key = PALETTE_KEYS[t.type];
    lines.push(
      <Fragment key={t.type}>
        {key && (
          <span
            className="mr-1 inline-block size-2.5 rounded-xs align-[-1px]"
            style={{ background: palette[key] }}
          />
        )}
        {`${typeName(t.type)}: ${fmt(t.cableLength / 1000, 2)} mm, `}
        {`r ${t.minRadius.toFixed(2)}–${t.medianRadius.toFixed(2)} µm (min–median)`}
      </Fragment>
    );
  }
  return lines;
}

/** The soma sized from its stems (soma.ts), against the fitted sphere: what the mesh's soma is built from. */
function somaStemLines(st: SomaStems): ReactNode[] {
  const c = st.stats;
  const counts =
    `${plural(c.arbors, 'arbor')}: ${c.valid} valid (${STEM_MIN_DISTANCE} µm out or more` +
    (c.far > 0 ? `, ${c.far} past ${STEM_FAR_DISTANCE} µm with a sample added there` : '') +
    `), ${c.tooClose} within ${STEM_MIN_DISTANCE} µm` +
    (c.detached > 0 ? `, ${plural(c.detached, 'detached neurite')}` : '');
  const base = <b>{st.baseRadius.toFixed(2)} µm</b>;
  if (st.source === 'stems') {
    return [
      `stems: ${counts}`,
      <Fragment key="base">
        {`d ${c.minD.toFixed(2)} / ${c.maxD.toFixed(2)} / ${c.meanD.toFixed(2)} µm (min / max / mean over the valid arbors) → `}
        base r = {BASE_RADIUS_FRACTION} × min = {base}
      </Fragment>,
    ];
  }
  const cut =
    c.arbors > 0
      ? `; necks to ${c.cut} of ${c.arbors}, where they first get ${st.neckDistance.toFixed(2)} µm out`
      : '';
  return [
    `stems: ${counts}`,
    st.source === 'fitted' ? (
      <Fragment key="base">
        none valid: base r = fitted {base}
        {cut}
      </Fragment>
    ) : (
      <Fragment key="base">
        none valid, and the fitted r is below the {SOMA_MIN_RADIUS} µm minimum: base r = {base}
        {st.baseRadius < SOMA_MIN_RADIUS ? ', where the nearest arbor forks' : ''}
        {cut}
      </Fragment>
    ),
  ];
}

function meshLines(st: MeshStats, backend: string | null): ReactNode[] {
  const reduced = st.rawTriangles > st.triangles;
  const h = st.hybrid;
  return [
    <Fragment key="size">
      <b>{fmt(st.triangles)}</b> triangles, <b>{fmt(st.vertices)}</b> vertices
      {reduced &&
        ` (from ${fmt(st.rawTriangles)}, −${fmt((100 * (st.rawTriangles - st.triangles)) / st.rawTriangles)}%)`}
    </Fragment>,
    `voxel ${st.voxel.toFixed(3)} µm` +
      (h && h.finestVoxel < st.voxel
        ? `, down to ${h.finestVoxel.toFixed(3)} µm around thin fibres`
        : '') +
      `, ${fmt(st.blocks)} blocks (${st.fieldMB.toFixed(0)} MB field)`,
    `skeleton: ${fmt(st.points)} of ${fmt(st.rawPoints)} points` +
      (st.points < st.rawPoints
        ? ` (−${fmt((100 * (st.rawPoints - st.points)) / st.rawPoints)}%)`
        : ''),
    ...(st.untangle ? [untangleLine(st.untangle)] : []),
    `${fmt(st.sections)} sections, ${fmt(st.segments)} segments, ~${fmt(st.bandVoxels / 1e6, 1)} M band voxels`,
    ...(st.soma
      ? [
          `soma: base r ${st.soma.radius.toFixed(2)} µm, ${st.soma.necks === 0 ? 'no neck' : plural(st.soma.necks, 'neck')}`,
        ]
      : []),
    ...(h
      ? [
          `${fmt(h.tubes)} tubes over ${fmt(100 * h.plainFraction, 1)}% of the cable (${fmt(h.tubeTriangles)} triangles), ` +
            `${fmt(h.patches)} voxel patches (${fmt(h.patchTriangles)}), ${fmt(h.interfaces)} collars (${fmt(h.collarTriangles)})`,
          h.flooredFraction > 0
            ? `traced calibre except on ${fmt(100 * h.flooredFraction, 2)}% of the cable, in patches too coarse for it`
            : 'traced calibre throughout',
          ...(h.contacts > 0
            ? [`fibres that do not belong together touch in ${plural(h.contacts, 'place')}`]
            : []),
        ]
      : []),
    ...(st.fallback
      ? [
          <Fragment key="fallback">
            <b>voxel mesh</b>: the tubes failed ({st.fallback})
          </Fragment>,
        ]
      : []),
    ...(backend ? [`built on the ${backend}`] : []),
    <Fragment key="time">
      <b>{fmt(st.totalMs)} ms</b> on {plural(st.workers, 'worker')},{' '}
      {h ? plural(st.slabs, 'batch', 'batches') : plural(st.slabs, 'slab')}
    </Fragment>,
    ...(h
      ? [
          `CPU: plan ${fmt(h.planMs)} + tubes ${fmt(h.tubeMs)} + clip ${fmt(h.clipMs)} ms, and for the patches:`,
        ]
      : []),
    `CPU: field ${fmt(st.fieldMs)} + extract ${fmt(st.extractMs)}` +
      (st.simplifyMs > 0
        ? ` + simplify ${fmt(st.simplifyMs)} (${plural(st.simplifyPasses, 'round')})`
        : '') +
      ` + merge ${fmt(st.mergeMs)} ms`,
    ...(st.gpu
      ? [
          `GPU: ${fmt(st.gpu.waitMs)} ms of the above waiting for it, ${fmt(st.gpu.blocks)} blocks, ` +
            (st.gpu.slabsExtracted === st.slabs
              ? `mesh read back (${fmt(st.gpu.readMB)} MB)`
              : `${fmt(st.gpu.blocksRead)} blocks read back (${fmt(st.gpu.readMB)} MB)`),
        ]
      : []),
    surfaceLine(st),
  ];
}

function untangleLine(u: NonNullable<MeshStats['untangle']>): ReactNode {
  if (u.contacts === 0) return 'untangled: nothing touched';
  return (
    <Fragment key="untangle">
      {`untangled: ${plural(u.contacts, 'pair')} of sections touched, `}
      {`${fmt(u.movedLength)} µm of path moved by up to ${fmt(u.maxShift, 2)} µm`}
      {u.left > 0 && (
        <>
          , <b>{fmt(u.left)} could not be parted</b>
        </>
      )}
    </Fragment>
  );
}

function surfaceLine(st: MeshStats): ReactNode {
  if (st.defects === 0 && st.nonManifoldEdges === 0) return 'closed surface ✓';
  return (
    <Fragment key="surface">
      {st.defects > 0 ? <b>{fmt(st.defects)} open quads</b> : 'closed surface'}
      {st.nonManifoldEdges > 0 && (
        <>
          , <b>{plural(st.nonManifoldEdges, 'edge')} with more than two triangles</b>
        </>
      )}
    </Fragment>
  );
}

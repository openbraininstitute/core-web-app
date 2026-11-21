'use client';

/**
 * The skeleton figure's panels on what is inside the files, every value read from the example file
 * by scripts/learn/skeletonization_data.py (`files.ts`): the skeleton's first lines as SWC; the
 * spiny H5's groups and datasets, each part lighting what it draws in the 3D view; the spine table,
 * a row per spine, a row picked to go to its spine; and the parts the format has room for that this
 * file does not have. With the captions of the 3D steps between them.
 */

import { useEffect, useRef } from 'react';

import { SERIF } from '@/features/learn/components/heuristics/shared';
import { cn } from '@/utils/css-class';

import { CodeBlock, INK, Panel } from '../ui/Code';
import { Card, Mono, Note, Tag } from './bits';
import { TYPE_COLOURS, TYPE_NAMES } from './engine/colours';
import { CELL, H5_TREE, type H5Node, SPINE_TABLE, SWC_HEAD } from './files';

import type { H5Part } from './engine/view';

// -----------------------------------------------------------------------------
// SWC

/** SWC's seven columns, in order. */
const SWC_COLUMNS: [string, string][] = [
  ['index', 'the sample'],
  ['type', 'its type code'],
  ['x', 'µm'],
  ['y', 'µm'],
  ['z', 'µm'],
  ['radius', 'µm'],
  ['parent', 'its parent; −1 for none'],
];

/** The SWC type codes, those in this file marked. */
const SWC_TYPES = [1, 2, 3, 4] as const;

/** The skeleton's first lines as SWC, under its columns, and the type codes. */
export function SwcPanel() {
  const types = new Set(
    SWC_HEAD.filter((l) => !l.startsWith('#')).map((l) => Number(l.trim().split(/\s+/)[1]))
  );
  return (
    <div className="flex w-full flex-col gap-3">
      <div className="grid grid-cols-4 gap-x-3 gap-y-1.5 sm:grid-cols-7">
        {SWC_COLUMNS.map(([name, what]) => (
          <div key={name} className="flex flex-col">
            <span className="font-mono text-[12.5px] text-sky-400">{name}</span>
            <Note className="text-[11.5px]">{what}</Note>
          </div>
        ))}
      </div>
      <CodeBlock
        small
        lang="text"
        label="skeleton.swc"
        right={<span style={{ color: INK.faint }}>its first {SWC_HEAD.length} lines</span>}
        code={SWC_HEAD.join('\n')}
        lit={[3]}
      />
      <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 text-[12.5px] text-slate-300">
        {SWC_TYPES.map((t) => (
          <span
            key={t}
            className={cn('flex items-center gap-1.5', !types.has(t) && 'text-slate-500')}
          >
            <span className="font-mono">{t}</span>
            <span className="size-2.5 rounded-sm" style={{ background: TYPE_COLOURS[t] }} />
            {TYPE_NAMES[t].toLowerCase()}
          </span>
        ))}
      </div>
      <Note>
        The course&apos;s skeleton, written as SWC with MorphIO and morph-tool: the H5&apos;s soma,
        a contour of {CELL.soma.contourPoints} points, became the one sample of type 1, of radius{' '}
        {CELL.soma.swcRadius} µm. This file has types 1 and 3 only.
      </Note>
    </div>
  );
}

/** Under the 3D view of the sections. */
export function SectionsCaption() {
  return (
    <>
      A section is an unbranched run of the skeleton, from the soma or a branch point to the next
      branch point or an end. The spine table&apos;s <Mono>afferent_section_id</Mono> counts the
      soma as section 0, so MorphIO&apos;s and NeuroM&apos;s section <i>i</i> is its <i>i</i> +{' '}
      {CELL.sectionIdOffset}.
    </>
  );
}

// -----------------------------------------------------------------------------
// The spiny H5

interface Part {
  part: H5Part;
  /** The top group, as the file lists it. */
  top: string;
  /** The neuron's group under it. */
  group: string;
  datasets: H5Node[];
  metadata?: H5Node;
  note: string;
}

const PARTS: { part: H5Part; top: string; under: string; note: string }[] = [
  {
    part: 'edges',
    top: '/edges',
    under: '/edges/',
    note: 'The spine table: a dataset per column, a row per spine.',
  },
  {
    part: 'morphology',
    top: '/morphology',
    under: '/morphology/',
    note: 'The skeleton: its points (x, y, z, diameter) and structure, as in H5 v1.',
  },
  {
    part: 'soma',
    top: '/soma',
    under: '/soma/meshes/',
    note: "The soma's mesh: its vertices and triangles.",
  },
  {
    part: 'spine-meshes',
    top: '/spines',
    under: '/spines/meshes/',
    note: "All the spines' meshes, compressed: vertices and triangles, and offsets marking where each spine starts.",
  },
  {
    part: 'spine-skeletons',
    top: '/spines',
    under: '/spines/skeletons/',
    note: "Each spine's own small skeleton, as in H5 v1, stored centred in the spine's own frame.",
  },
];

/** The file's parts: for each, the neuron's group, its datasets in file order, and its metadata. */
export function h5Parts(tree: readonly H5Node[]): Part[] {
  return PARTS.map(({ part, top, under, note }) => {
    const inside = tree.filter((n) => n.path.startsWith(under));
    const depth = under.split('/').length;
    const group = inside.find((n) => n.kind === 'group' && n.path.split('/').length === depth);
    const own = group ? `${group.path}/` : under;
    return {
      part,
      top,
      group: group?.path ?? under,
      datasets: inside.filter((n) => n.kind === 'dataset' && n.path.startsWith(own)),
      metadata: inside.find((n) => n.kind === 'group' && n.path === `${own}metadata`),
      note,
    };
  });
}

const leaf = (path: string) => path.slice(path.lastIndexOf('/') + 1);
const shapeOf = (n: H5Node) => `(${n.shape?.join(', ')}${n.shape?.length === 1 ? ',' : ''})`;

/**
 * The spiny H5 as a tree, its parts in the file's order, each with a short note; pointing at a part
 * (or focusing it, or tapping it) lights what it draws in the 3D view.
 */
export function H5Tree({
  focus,
  onFocus,
}: {
  focus: H5Part | null;
  onFocus: (part: H5Part | null) => void;
}) {
  const parts = h5Parts(H5_TREE);
  return (
    <Panel
      small
      label={CELL.files.h5}
      right={<span style={{ color: INK.faint }}>point at a part, or tap it</span>}
    >
      {/* leaving the list lights nothing; each part lights itself */}
      <div className="flex flex-col py-1.5" onMouseLeave={() => onFocus(null)}>
        {parts.map((p, k) => {
          const first = k === 0 || parts[k - 1].top !== p.top;
          const lit = focus === p.part;
          const sameShape =
            p.datasets.length > 4 && p.datasets.every((d) => shapeOf(d) === shapeOf(p.datasets[0]));
          return (
            <div key={p.part}>
              {first && (
                <div className="px-4 pt-1.5" style={{ color: INK.keyword }}>
                  {p.top}
                </div>
              )}
              <button
                type="button"
                aria-pressed={lit}
                onMouseEnter={() => onFocus(p.part)}
                onFocus={() => onFocus(p.part)}
                onBlur={() => onFocus(null)}
                onClick={() => onFocus(p.part)}
                className="block w-full px-4 py-1 text-left transition-colors focus-visible:outline-none"
                style={{ background: lit ? INK.line : undefined }}
              >
                <div className="flex flex-wrap items-baseline gap-x-3 pl-3">
                  <span style={{ color: INK.text }}>{p.group.slice(p.top.length)}</span>
                  <span
                    className="text-[12px] italic"
                    style={{ color: lit ? INK.text : INK.dim, fontFamily: SERIF }}
                  >
                    {p.note}
                  </span>
                </div>
                {sameShape ? (
                  <div className="pl-6">
                    <div style={{ color: INK.faint }}>
                      {p.datasets.length} datasets, each {shapeOf(p.datasets[0])}
                    </div>
                    <div className="grid grid-cols-1 gap-x-4 sm:grid-cols-2">
                      {p.datasets.map((d) => (
                        <span key={d.path} className="flex justify-between gap-2">
                          <span style={{ color: INK.fn }}>{leaf(d.path)}</span>
                          <span style={{ color: INK.faint }}>{d.dtype}</span>
                        </span>
                      ))}
                    </div>
                  </div>
                ) : (
                  <div className="flex flex-col pl-6">
                    {p.datasets.map((d) => (
                      <span key={d.path} className="flex flex-wrap gap-x-3">
                        <span className="min-w-[9ch]" style={{ color: INK.fn }}>
                          {leaf(d.path)}
                        </span>
                        <span style={{ color: INK.number }}>{shapeOf(d)}</span>
                        <span style={{ color: INK.faint }}>{d.dtype}</span>
                        {d.compression && (
                          <span style={{ color: INK.string }}>{d.compression}</span>
                        )}
                      </span>
                    ))}
                  </div>
                )}
                {p.metadata && (
                  <div className="pl-6">
                    <span style={{ color: INK.builtin }}>metadata/</span>{' '}
                    <span style={{ color: INK.faint }}>
                      {Object.entries(p.metadata.attrs ?? {})
                        .map(([k, v]) => `${k} = [${[v].flat().join(', ')}]`)
                        .join(', ')}
                    </span>
                  </div>
                )}
              </button>
            </div>
          );
        })}
      </div>
    </Panel>
  );
}

// -----------------------------------------------------------------------------
// The spine table

/** The table's columns by what they say of a spine: a field and its x, y, z (and w), or a field alone. */
const COLUMN_GROUPS: { name: string; fields: [string, string[]?][] }[] = [
  {
    name: 'where',
    fields: [
      ['afferent_surface', ['x', 'y', 'z']],
      ['afferent_center', ['x', 'y', 'z']],
    ],
  },
  {
    name: 'which way',
    fields: [
      ['spine_orientation_vector', ['x', 'y', 'z']],
      ['spine_rotation', ['x', 'y', 'z', 'w']],
    ],
  },
  {
    name: 'on which section',
    fields: [
      ['afferent_section_id'],
      ['afferent_segment_id'],
      ['afferent_segment_offset'],
      ['afferent_section_pos'],
    ],
  },
  { name: 'size', fields: [['spine_length']] },
  { name: 'its mesh and skeleton', fields: [['spine_morphology'], ['spine_id']] },
];

interface Column {
  index: number;
  label: string;
  width: number;
}

/** The table's columns in the groups' order, each found in the file's own; any others after them. */
function tableLayout() {
  const columns: readonly string[] = SPINE_TABLE.columns;
  const used = new Set<string>();
  const groups: { name: string; fields: { name: string; columns: Column[] }[] }[] = [];
  const valueWidth = (index: number) =>
    Math.max(...SPINE_TABLE.rows.map((r) => cellText(r[index], index).length));
  for (const g of COLUMN_GROUPS) {
    const fields = g.fields.flatMap(([field, axes]) => {
      const names = axes ? axes.map((a) => `${field}_${a}`) : [field];
      const found = names.filter((n) => columns.includes(n));
      if (found.length === 0) return [];
      for (const n of found) used.add(n);
      const share = Math.ceil((0.86 * field.length) / found.length);
      return [
        {
          name: field,
          columns: found.map((n) => {
            const index = columns.indexOf(n);
            const label = axes ? n.slice(field.length + 1) : '';
            return { index, label, width: Math.max(valueWidth(index), share, label.length) + 2 };
          }),
        },
      ];
    });
    if (fields.length) groups.push({ name: g.name, fields });
  }
  const rest = columns.filter((c) => !used.has(c));
  if (rest.length)
    groups.push({
      name: 'more',
      fields: rest.map((c) => {
        const index = columns.indexOf(c);
        return {
          name: c,
          columns: [
            {
              index,
              label: '',
              width: Math.max(valueWidth(index), Math.ceil(0.86 * c.length)) + 2,
            },
          ],
        };
      }),
    });
  return groups;
}

function cellText(v: string | number, index: number): string {
  if (typeof v === 'string') return v;
  return SPINE_TABLE.dtypes[index].startsWith('float') ? v.toFixed(3) : String(v);
}

const REVERSED = new Set<number>(CELL.reversedRows);

/**
 * The spine table, a row per spine, its columns under what they say; the picked row lit. Picking a
 * row takes the 3D view to its spine. It scrolls inside itself, both ways, and a drag across it
 * scrolls rather than swiping to another slide.
 */
export function SpineTable({ pick, onPick }: { pick: number; onPick: (row: number) => void }) {
  const groups = tableLayout();
  const all = groups.flatMap((g) => g.fields.flatMap((f) => f.columns));
  const template = ['5ch', ...all.map((c) => `${c.width}ch`)].join(' ');
  const box = useRef<HTMLDivElement | null>(null);
  const rows = useRef<(HTMLButtonElement | null)[]>([]);

  // show the picked row at first, without moving the page
  // biome-ignore lint/correctness/useExhaustiveDependencies: only on first showing
  useEffect(() => {
    const el = box.current,
      row = rows.current[pick];
    if (el && row) el.scrollTop = Math.max(0, row.offsetTop - el.clientHeight / 2);
  }, []);

  const head = 'px-1 text-left';
  return (
    <div className="flex w-full flex-col gap-2">
      <Panel
        small
        label={`/edges/${CELL.name}`}
        right={
          <span style={{ color: INK.faint }}>
            {SPINE_TABLE.rowCount} rows · {SPINE_TABLE.columns.length} columns
          </span>
        }
      >
        <div
          ref={box}
          className="max-h-[330px] overflow-auto overscroll-contain"
          onTouchStart={(e) => e.stopPropagation()}
          onTouchEnd={(e) => e.stopPropagation()}
        >
          <div className="w-max min-w-full pb-1 text-[11.5px]">
            <div
              className="sticky top-0 z-10 grid"
              style={{ gridTemplateColumns: template, background: 'var(--screen)' }}
            >
              <span />
              {groups.map((g) => (
                <span
                  key={g.name}
                  className={cn(head, 'pt-1.5 text-[12px] italic')}
                  style={{
                    gridColumn: `span ${g.fields.reduce((n, f) => n + f.columns.length, 0)}`,
                    color: INK.dim,
                    fontFamily: SERIF,
                    borderLeft: `1px solid ${INK.rule}`,
                  }}
                >
                  {g.name}
                </span>
              ))}
              <span />
              {groups.flatMap((g) =>
                g.fields.map((f, k) => (
                  <span
                    key={f.name}
                    className={cn(head, 'truncate text-[10.5px]')}
                    title={f.name}
                    style={{
                      gridColumn: `span ${f.columns.length}`,
                      color: INK.keyword,
                      borderLeft: k === 0 ? `1px solid ${INK.rule}` : undefined,
                    }}
                  >
                    {f.name}
                  </span>
                ))
              )}
              <span
                className={cn(head, 'pb-1')}
                style={{ color: INK.faint, borderBottom: `1px solid ${INK.rule}` }}
              >
                row
              </span>
              {all.map((c) => (
                <span
                  key={c.index}
                  className={cn(head, 'pb-1 text-right')}
                  style={{
                    color: INK.faint,
                    borderBottom: `1px solid ${INK.rule}`,
                  }}
                >
                  {c.label}
                </span>
              ))}
            </div>
            {SPINE_TABLE.rows.map((r, i) => {
              const lit = i === pick;
              return (
                <button
                  // biome-ignore lint/suspicious/noArrayIndexKey: a row's place is its id
                  key={i}
                  ref={(el) => {
                    rows.current[i] = el;
                  }}
                  type="button"
                  aria-pressed={lit}
                  onClick={() => onPick(i)}
                  className="grid w-full text-left transition-colors hover:bg-white/5"
                  style={{ gridTemplateColumns: template, background: lit ? INK.line : undefined }}
                >
                  <span
                    className="px-1"
                    style={{ color: lit ? INK.keyword : INK.faint }}
                    title={REVERSED.has(i) ? 'its frame is turned round' : undefined}
                  >
                    {i}
                    {REVERSED.has(i) && <span style={{ color: INK.string }}> ↺</span>}
                  </span>
                  {all.map((c) => (
                    <span
                      key={c.index}
                      className="truncate px-1 text-right"
                      style={{ color: lit ? INK.text : INK.dim }}
                    >
                      {cellText(r[c.index], c.index)}
                    </span>
                  ))}
                </button>
              );
            })}
          </div>
        </div>
      </Panel>
      <Note>
        Pick a row to see its spine. The table stores one dataset per column, in the order of their
        names; here they are grouped by what they say. In {CELL.reversedSpines} of the{' '}
        {CELL.counts.spines} rows (<span style={{ color: INK.string }}>↺</span>) the frame is turned
        round: its direction points into the dendrite, and <Mono>afferent_surface</Mono>, the
        frame&apos;s origin, is nearer the spine&apos;s free end.
      </Note>
    </div>
  );
}

// -----------------------------------------------------------------------------
// Each spine's own frame, and lengths

export function FrameCaption() {
  return (
    <>
      Each spine&apos;s mesh and skeleton are stored in a frame of its own: the origin near its root
      and +y towards its tip, at y = <Mono>spine_length</Mono>. The table&apos;s{' '}
      <Mono>spine_rotation</Mono>, a quaternion (x, y, z, w), turns it, and{' '}
      <Mono>afferent_surface</Mono> moves it onto its dendrite.
    </>
  );
}

export function LengthCaption() {
  const [lo, hi] = CELL.spineLengthRange;
  return (
    <>
      Coloured by <Mono>spine_length</Mono>, from {lo} to {hi} µm. Any column of the table can
      colour the spines the same way.
    </>
  );
}

// -----------------------------------------------------------------------------
// What the format can hold, and this file does not

/** The format's optional parts, as morph-spines' README lists them. */
const OPTIONAL = [
  {
    name: 'Head and neck',
    path: 'head_neck_values',
    text: (
      <>
        A dataset beside the meshes and a third column in <Mono>offsets</Mono>: each spine&apos;s
        triangles sorted into undefined, neck and one or more heads.
      </>
    ),
  },
  {
    name: 'spine_type',
    path: 'spine_type',
    text: (
      <>
        One of <Mono>undefined</Mono>, <Mono>thin</Mono>, <Mono>long_thin</Mono>,{' '}
        <Mono>mushroom</Mono>, <Mono>stubby</Mono>, <Mono>filopodium</Mono> or <Mono>branched</Mono>
        .
      </>
    ),
  },
  { name: 'spine_volume', path: 'spine_volume', text: "The spine's head volume." },
  {
    name: 'spine_neck_diameter',
    path: 'spine_neck_diameter',
    text: "The spine's neck diameter.",
  },
] as const;

/** The format's optional parts, each marked as in this file or not, from what the file has. */
export function Parts() {
  const offsets = H5_TREE.find((n) => n.path === `/spines/meshes/${CELL.name}/offsets`);
  const columns: readonly string[] = CELL.optionalColumns;
  const has = (path: string) =>
    path === 'head_neck_values' ? CELL.headNeck : columns.includes(path);
  return (
    <div className="flex w-full flex-col gap-3">
      <ul className="grid gap-2 sm:grid-cols-2">
        {OPTIONAL.map((o) => (
          <li key={o.name}>
            <Card className="flex h-full flex-col gap-1 py-2.5">
              <div className="flex items-center justify-between gap-2">
                <span className="font-mono text-[13px] text-slate-100">{o.name}</span>
                <Tag className={has(o.path) ? 'border-emerald-200 text-emerald-200' : undefined}>
                  {has(o.path) ? 'in this file' : 'not in this file'}
                </Tag>
              </div>
              <div className="text-[12.5px] leading-snug text-slate-400">{o.text}</div>
            </Card>
          </li>
        ))}
      </ul>
      <Note>
        All four are optional, and this file has none of them. Its <Mono>offsets</Mono>
        {offsets ? `, ${shapeOf(offsets)},` : ''} have two columns, which morph-spines reads as an
        old file with no head and neck: every triangle is undefined, and <Mono>spine_type(i)</Mono>{' '}
        gives undefined for every spine. The colours here are each spine&apos;s distance from its
        dendrite, along its own axis.
      </Note>
    </div>
  );
}

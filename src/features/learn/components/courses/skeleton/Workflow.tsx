'use client';

/**
 * The skeleton figure's panels on how the platform's skeletonization runs, each kept to the code it
 * describes: the workflow from an EM mesh to a registered morphology, in the platform's own words
 * (core-web-app's workflow config) and obi-one's; the campaign's form, field by field, from obi-one's config.py,
 * with the two fields obi-one PR #1141 proposes; the REST calls that launch it, from the
 * skeletonization-api skill; the files a run writes and how each is registered; and the entities
 * that come of it.
 */

import { SERIF } from '@/features/learn/components/heuristics/shared';
import { cn } from '@/utils/css-class';

import { CodeBlock, INK, Panel } from '../ui/Code';
import { Card, Mono, Note, Tag } from './bits';
import { TYPE_COLOURS } from './engine/colours';
import { CELL } from './files';

import type { ReactNode } from 'react';

// -----------------------------------------------------------------------------
// The workflow

interface Stage {
  where: string;
  name: string;
  /** The name is the code's own, set in mono. */
  code?: boolean;
  text: ReactNode;
}

/** From an EM mesh to a morphology: the platform's names, obi-one's, Ultraliser's and EntityCore's. */
const FLOW: Stage[] = [
  {
    where: 'EntityCore',
    name: 'EMCellMesh',
    code: true,
    text: (
      <>
        An EM mesh. Its asset labelled <Mono>cell_surface_mesh</Mono>, a GLB, is what is
        skeletonized.
      </>
    ),
  },
  {
    where: 'The platform',
    name: 'EM mesh skeletonization',
    text: (
      <>
        In Workflows, under Process data. Its one step: <em>Select EM meshes</em>.
      </>
    ),
  },
  {
    where: 'obi-one',
    name: 'Skeletonization Campaign',
    text: (
      <>
        The form, <Mono>SkeletonizationScanConfig</Mono>, kept as a task config of type{' '}
        <Mono>skeletonization__campaign</Mono>.
      </>
    ),
  },
  {
    where: 'obi-one',
    name: 'A task config per mesh and setting',
    text: (
      <>
        Each a <Mono>skeletonization__config</Mono>: one mesh, one value of each setting, a{' '}
        <Mono>SkeletonizationSingleConfig</Mono>.
      </>
    ),
  },
  {
    where: 'obi-one',
    name: 'morphology_skeletonization',
    code: true,
    text: (
      <>
        A job launched on one task config, its run a <Mono>TaskActivity</Mono> of type{' '}
        <Mono>skeletonization__execution</Mono>: 16 cores, 32 GB, up to 2 hours.
      </>
    ),
  },
  {
    where: 'Ultraliser',
    name: 'skeletonize_neuron_mesh',
    code: true,
    text: 'Called on the mesh with the settings: it makes the skeleton and the spines.',
  },
  {
    where: 'obi-one',
    name: 'The output files',
    text: (
      <>
        The spiny H5, renamed <Mono>&lt;stem&gt;_with_spines.h5</Mono>; the skeleton as SWC and H5;
        and an ASC that obi-one writes with MorphIO.
      </>
    ),
  },
  {
    where: 'EntityCore',
    name: 'CellMorphology',
    code: true,
    text: (
      <>
        Registered with its files and <Mono>has_segmented_spines</Mono> set, if the run is tracked.
      </>
    ),
  },
];

/** The workflow, step by step, in the platform's words and obi-one's. */
export function Workflow() {
  return (
    <div className="flex w-full flex-col gap-3">
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[12.5px] text-slate-400">
        <Tag>The platform</Tag>
        <span>
          Workflows <span className="text-slate-600">›</span> Process data{' '}
          <span className="text-slate-600">›</span>{' '}
          <span className="text-slate-200">EM mesh skeletonization data processing</span>{' '}
          <span className="text-slate-600">›</span> Select EM meshes
        </span>
      </div>
      <ol className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {FLOW.map((s, k) => (
          <li key={s.name} className="relative">
            <Card className="flex h-full flex-col gap-1.5">
              <div className="flex items-center justify-between gap-2">
                <Tag>{s.where}</Tag>
                <span className="font-mono text-[11px] text-slate-600">{k + 1}</span>
              </div>
              <div
                className={cn(
                  'text-[14px] leading-tight font-semibold text-slate-100',
                  s.code && 'font-mono text-[13px]'
                )}
              >
                {s.name}
              </div>
              <div className="text-[12.5px] leading-snug text-slate-400">{s.text}</div>
            </Card>
            {k % 4 !== 3 && k < FLOW.length - 1 && (
              <span
                aria-hidden="true"
                className="absolute top-1/2 -right-3 z-10 hidden -translate-y-1/2 text-[15px] text-slate-500 lg:block"
              >
                →
              </span>
            )}
          </li>
        ))}
      </ol>
      <Note>
        The names are the code&apos;s: the platform&apos;s workflow config (process.ts and
        entity-types.ts, where the campaign is shown as &lsquo;Skeletonization campaign&rsquo;),
        obi-one&apos;s skeletonization task, and its task definition for the job.
      </Note>
    </div>
  );
}

// -----------------------------------------------------------------------------
// The campaign's form

interface Field {
  title: string;
  name: string;
  value: string;
  units?: string;
  range?: string;
  sweep?: boolean;
  toggle?: boolean;
  description: string;
  /** Proposed in obi-one PR #1141, not yet on main. */
  proposed?: boolean;
}

/** The Initialization block's fields, as obi-one's config.py has them; the last two from PR #1141's branch. */
const FIELDS: Field[] = [
  {
    title: 'EM Cell Mesh',
    name: 'cell_mesh',
    value: 'an EMCellMeshFromID, or a list',
    description: 'EM cell mesh to use for skeletonization.',
  },
  {
    title: 'Neuron Voxel Size',
    name: 'neuron_voxel_size',
    value: '0.1',
    units: 'µm',
    range: '0.005 to 0.1',
    sweep: true,
    description: 'Neuron reconstruction resolution in micrometers.',
  },
  {
    title: 'Spine Voxel Size',
    name: 'spines_voxel_size',
    value: '0.1',
    units: 'µm',
    range: '0.1 to 0.5',
    sweep: true,
    description: 'Spine reconstruction resolution in micrometers.',
  },
  {
    title: 'Include Full Resolution Spines',
    name: 'write_raw_spines',
    value: 'on',
    toggle: true,
    description:
      'By default a morphology h5 file is created with reconstructed spines. Set this parameter to True to additionally include the initially extracted full resolution segmented spine meshes in the h5 file. This may be useful for use cases which require the full resolution spine data.',
  },
  {
    title: 'Remove Spines From Skeleton',
    name: 'remove_spines_from_skeleton',
    value: 'on',
    toggle: true,
    proposed: true,
    description:
      'Remove the spines from the skeleton and segment them. Disable this option to keep the small branches in the skeleton, e.g. for retinal neurons, whose small branches are not spines. No spines are segmented then.',
  },
  {
    title: 'Repair Slicing Artifacts',
    name: 'repair_slicing_artifacts',
    value: 'off',
    toggle: true,
    proposed: true,
    description:
      'Enable this option if you suspect that the neuronal mesh might have slicing artifacts due to issues imposed during the EM reconstruction stage.',
  },
];

function Value({ field }: { field: Field }) {
  if (field.toggle) {
    const on = field.value === 'on';
    return (
      <span className="flex items-center gap-2 text-[12.5px] text-slate-300">
        <span
          className={cn(
            'relative inline-block h-[18px] w-8 rounded-full border',
            on ? 'border-sky-500 bg-sky-500/80' : 'border-slate-700 bg-slate-800'
          )}
        >
          <span
            className={cn(
              'absolute top-[2px] size-3 rounded-full bg-white shadow',
              on ? 'left-[15px]' : 'left-[2px]'
            )}
          />
        </span>
        {on ? 'True' : 'False'}
      </span>
    );
  }
  return (
    <span className="flex items-center gap-2">
      <span className="rounded-md border border-slate-700 bg-slate-950/40 px-2 py-0.5 font-mono text-[12.5px] text-slate-200">
        {field.value}
      </span>
      {field.units && <span className="text-[12.5px] text-slate-400">{field.units}</span>}
    </span>
  );
}

/** The campaign's form as fields: title, default, units, range, and the field's own description. */
export function CampaignForm() {
  return (
    <div className="flex w-full flex-col gap-3">
      <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
        <span className="text-[15px] font-semibold text-slate-100">Skeletonization Campaign</span>
        <span className="text-[12.5px] text-slate-400">
          Setup <span className="text-slate-600">›</span> Initialization, after Info (the
          campaign&apos;s name and description)
        </span>
      </div>
      <ul className="grid gap-2 md:grid-cols-2">
        {FIELDS.map((f) => (
          <li key={f.name}>
            <Card
              className={cn(
                'flex h-full flex-col gap-1.5 py-2.5',
                f.proposed && 'border-dashed bg-transparent'
              )}
            >
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="text-[13.5px] font-semibold text-slate-100">{f.title}</span>
                {f.proposed ? (
                  <Tag className="border-amber-300/60 text-amber-300">
                    proposed in obi-one PR #1141
                  </Tag>
                ) : (
                  f.sweep && <Tag>a list sweeps it</Tag>
                )}
              </div>
              <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                <Value field={f} />
                {f.range && (
                  <span className="text-[12px] text-slate-500">
                    from {f.range} {f.units}
                  </span>
                )}
                <Mono className="text-[11.5px] text-slate-500">{f.name}</Mono>
              </div>
              <Note className="text-[12px]">{f.description}</Note>
            </Card>
          </li>
        ))}
      </ul>
    </div>
  );
}

// -----------------------------------------------------------------------------
// Launching it through the REST API

const LAUNCH = `import os
import requests
from obi_auth import get_token

API = "https://cell-a.openbraininstitute.org/api"      # production
headers = {
    "Authorization": f"Bearer {get_token(environment='production', auth_mode='daf')}",
    "virtual-lab-id": os.environ["OBI_VLAB_ID"],          # your virtual lab
    "project-id": os.environ["OBI_PROJECT_ID"],           # and project
}

mesh_id = "<em-cell-mesh-uuid>"                          # an EMCellMesh's id

# 1. the campaign: one EM mesh, the default settings
form = {
    "type": "SkeletonizationScanConfig",
    "info": {"type": "Info", "campaign_name": "Spiny skeleton",
             "campaign_description": "One EM mesh, default settings"},
    "initialize": {
        "type": "SkeletonizationScanConfig.Initialize",
        "cell_mesh": {"type": "EMCellMeshFromID", "id_str": mesh_id},
        "neuron_voxel_size": 0.1,       # a list, e.g. [0.05, 0.1], sweeps it
        "spines_voxel_size": 0.1,
        "write_raw_spines": True,
    },
}
campaign_id = requests.post(
    f"{API}/obi-one/generated/skeletonization-scan-config-generate-grid",
    json=form, headers=headers,
).json()

# 2. its task configs, one per mesh and setting: these are what launch
configs = requests.get(
    f"{API}/entitycore/task-config",
    params={"task_config_type": "skeletonization__config",
            "task_config_generator_id": campaign_id},
    headers=headers,
).json()["data"]
task = {"task_type": "morphology_skeletonization", "config_id": configs[0]["id"]}

# 3. its cost, 4. launch it, 5. ask how it is going
estimate = requests.post(f"{API}/obi-one/declared/task/estimate", json=task, headers=headers).json()
job = requests.post(f"{API}/obi-one/declared/task/launch", json=task, headers=headers).json()
status = requests.get(f"{API}/obi-one/declared/task/{job['job_id']}", headers=headers).json()`;

/** The REST flow, as the skeletonization-api skill gives it: needs a login, so shown, not run. */
export function Launch() {
  return (
    <div className="grid w-full items-start gap-4 md:grid-cols-[3fr_2fr]">
      <CodeBlock
        small
        label="launch.py"
        right={<span style={{ color: INK.faint }}>needs a login: not run here</span>}
        code={LAUNCH}
        lit={[27, 36, 39, 43]}
      />
      <div className="flex flex-col gap-3">
        <Card>
          <div className="text-[14px] font-semibold text-slate-100">
            The campaign is not what you launch
          </div>
          <div className="mt-1 text-[13px] leading-snug text-slate-400">
            Generating the grid returns the campaign&apos;s id. Estimate and launch take a child
            task config&apos;s id, found in EntityCore by <Mono>task_config_generator_id</Mono>.
            Passing the campaign&apos;s id fails: its grid is not a single config.
          </div>
        </Card>
        <Card>
          <div className="text-[14px] font-semibold text-slate-100">What it costs</div>
          <div className="mt-1 text-[13px] leading-snug text-slate-400">
            obi-one counts the mesh&apos;s surface area in µm², rounded up and at least 1.
          </div>
        </Card>
        <Note>
          From the skeletonization-api skill. Every call needs a Keycloak token and the virtual lab
          and project; <Mono>/task/&lt;job_id&gt;/stream</Mono> streams the job&apos;s output.
        </Note>
      </div>
    </div>
  );
}

// -----------------------------------------------------------------------------
// The files a run writes, and how they are registered

const OUTPUTS: { file: string; holds: ReactNode; label: string; type: string }[] = [
  {
    file: '<stem>_with_spines.h5',
    holds:
      "Ultraliser's <stem>.h5, renamed by obi-one: the skeleton, the soma's mesh, the spine table, and each spine's skeleton and mesh.",
    label: 'morphology_with_spines',
    type: 'application/x-hdf5',
  },
  {
    file: '<stem>-morphology.swc',
    holds: 'The skeleton as SWC, from Ultraliser.',
    label: 'morphology',
    type: 'application/swc',
  },
  {
    file: '<stem>-morphology.h5',
    holds:
      'The skeleton as an H5 morphology, from Ultraliser. The morphometrics are worked out from it.',
    label: 'morphology',
    type: 'application/x-hdf5',
  },
  {
    file: '<stem>-morphology.asc',
    holds: 'The skeleton as Neurolucida ASC, written by obi-one with MorphIO from the .h5.',
    label: 'morphology',
    type: 'application/asc',
  },
  {
    file: 'a surface mesh, .glb',
    holds: 'Made from the SWC at registration, where obi-one has its meshing tools.',
    label: 'cell_surface_mesh',
    type: 'model/gltf-binary',
  },
];

/** What a run writes, what each file holds, and the asset label and content type it is registered with. */
export function Outputs() {
  return (
    <div className="flex w-full flex-col gap-3">
      <Panel
        small
        label="outputs/"
        right={<span style={{ color: INK.faint }}>asset label · content type</span>}
      >
        <ul className="flex flex-col">
          {OUTPUTS.map((o) => (
            <li
              key={o.file}
              className="grid gap-x-4 gap-y-1 px-4 py-2.5 sm:grid-cols-[minmax(0,1fr)_auto]"
              style={{ borderTop: `1px solid ${INK.rule}` }}
            >
              <div className="flex flex-col gap-0.5">
                <span style={{ color: INK.string }}>{o.file}</span>
                <span
                  className="text-[12.5px] leading-snug italic"
                  style={{ color: INK.dim, fontFamily: SERIF }}
                >
                  {o.holds}
                </span>
              </div>
              <div className="flex flex-col sm:items-end">
                <span style={{ color: INK.fn }}>{o.label}</span>
                <span style={{ color: INK.faint }}>{o.type}</span>
              </div>
            </li>
          ))}
        </ul>
      </Panel>
      <Note>
        <Mono>&lt;stem&gt;</Mono> is the mesh&apos;s GLB file name without its extension. With{' '}
        <em>Include Full Resolution Spines</em> on, the spiny H5 also holds the full-resolution
        spine meshes. The course&apos;s example, {CELL.files.h5} from morph-spines, is a file of the
        same kind.
      </Note>
    </div>
  );
}

// -----------------------------------------------------------------------------
// What is registered

/** The licence the morphology is registered under, by its label in EntityCore. */
const CC_BY_NC = 'CC BY-NC 4.0';

/** The entities a tracked run makes, and how they point to each other and to the mesh's. */
export function Registered() {
  type Node = { id: string; x: number; y: number; sub?: string; lit?: boolean; w?: number };
  const nodes: Node[] = [
    { id: 'EMCellMesh', x: 115, y: 45, sub: 'the mesh skeletonized' },
    { id: 'TaskConfig', x: 115, y: 165, sub: 'skeletonization__config' },
    { id: 'TaskActivity', x: 115, y: 285, sub: 'skeletonization__execution' },
    { id: 'EMDenseReconstructionDataset', x: 430, y: 45, w: 230 },
    { id: 'CellMorphology', x: 430, y: 165, sub: 'has_segmented_spines = True', lit: true, w: 230 },
    { id: 'Subject', x: 745, y: 35, sub: "the mesh's" },
    { id: 'BrainRegion', x: 745, y: 100, sub: "the mesh's" },
    { id: 'CellMorphologyProtocol', x: 745, y: 165, sub: "'Ultraliser skeletonization'", w: 200 },
    { id: 'License', x: 745, y: 230, sub: CC_BY_NC },
    { id: 'MeasurementAnnotation', x: 745, y: 295, sub: 'its morphometrics', w: 200 },
  ];
  const edges: [string, string, string?][] = [
    ['TaskConfig', 'EMCellMesh', 'inputs'],
    ['TaskActivity', 'TaskConfig', 'used'],
    ['TaskActivity', 'CellMorphology', 'generated'],
    ['EMCellMesh', 'EMDenseReconstructionDataset', 'its dataset'],
    ['CellMorphology', 'EMDenseReconstructionDataset', 'Derivation'],
    ['CellMorphology', 'Subject'],
    ['CellMorphology', 'BrainRegion'],
    ['CellMorphology', 'CellMorphologyProtocol'],
    ['CellMorphology', 'License'],
    ['MeasurementAnnotation', 'CellMorphology'],
  ];
  const at = (id: string) => nodes.find((n) => n.id === id) ?? nodes[0];
  const half = (n: Node) => (n.w ?? 172) / 2;
  /** Where the line from p towards q leaves p's box. */
  const exit = (p: Node, q: Node): [number, number] => {
    const [dx, dy] = [q.x - p.x, q.y - p.y];
    const s = Math.min(half(p) / Math.abs(dx || 1e-9), 21 / Math.abs(dy || 1e-9));
    return [p.x + dx * s, p.y + dy * s];
  };
  return (
    <div className="flex w-full flex-col items-center gap-3">
      <svg
        viewBox="0 0 860 400"
        className="w-full max-w-5xl text-slate-300"
        role="img"
        aria-label="What a tracked skeletonization run registers: a CellMorphology with has_segmented_spines set, derived from the mesh's EM dense reconstruction dataset, with the mesh's subject and brain region, the Ultraliser skeletonization protocol, a CC BY-NC 4.0 licence, its morphometrics and its files; and the TaskActivity that used the mesh's task config and generated it."
      >
        <defs>
          <marker
            id="skeleton-head"
            viewBox="0 0 10 10"
            refX="9"
            refY="5"
            markerWidth="7"
            markerHeight="7"
            orient="auto"
          >
            <path d="M0 0 L10 5 L0 10 z" fill="currentColor" opacity="0.5" />
          </marker>
        </defs>
        {edges.map(([a, b, label]) => {
          const [p, q] = [at(a), at(b)];
          const [x1, y1] = exit(p, q);
          const [x2, y2] = exit(q, p);
          return (
            <g key={a + b}>
              <line
                x1={x1}
                y1={y1}
                x2={x2}
                y2={y2}
                stroke="currentColor"
                strokeOpacity="0.35"
                strokeWidth="1.2"
                markerEnd="url(#skeleton-head)"
              />
              {label && (
                <text
                  x={(x1 + x2) / 2 + (x1 === x2 ? 8 : 0)}
                  y={(y1 + y2) / 2 - (x1 === x2 ? 0 : 6)}
                  textAnchor={x1 === x2 ? 'start' : 'middle'}
                  className="fill-slate-400"
                  fontSize="11"
                  fontStyle="italic"
                  fontFamily={SERIF}
                >
                  {label}
                </text>
              )}
            </g>
          );
        })}
        {nodes.map((n) => (
          <g key={n.id} transform={`translate(${n.x} ${n.y})`}>
            <rect
              x={-half(n)}
              y="-21"
              width={2 * half(n)}
              height="42"
              rx="8"
              className={
                n.lit ? 'fill-sky-500/10 stroke-sky-500' : 'fill-slate-900 stroke-slate-700'
              }
              strokeWidth="1.2"
            />
            <text
              textAnchor="middle"
              y={n.sub ? -2 : 4.5}
              className="fill-slate-100 font-mono"
              fontSize="11.5"
            >
              {n.id}
            </text>
            {n.sub && (
              <text textAnchor="middle" y="13" className="fill-slate-400 font-mono" fontSize="10">
                {n.sub}
              </text>
            )}
          </g>
        ))}
        <g transform="translate(430 320)">
          <rect
            x="-160"
            y="-50"
            width="320"
            height="104"
            rx="8"
            className="fill-slate-900/60 stroke-slate-700"
            strokeDasharray="4 3"
          />
          <text
            y="-30"
            textAnchor="middle"
            className="fill-slate-400"
            fontSize="11"
            fontStyle="italic"
            fontFamily={SERIF}
          >
            its assets
          </text>
          {[
            ['morphology', '.swc · .h5 · .asc'],
            ['morphology_with_spines', '_with_spines.h5'],
            ['cell_surface_mesh', '.glb, from the SWC'],
          ].map(([label, files], k) => (
            <text key={label} y={-8 + 20 * k} fontSize="11" className="font-mono">
              <tspan x="-145" className="fill-slate-100">
                {label}
              </tspan>
              <tspan x="30" className="fill-slate-400">
                {files}
              </tspan>
            </text>
          ))}
          <line
            x1="0"
            y1="-50"
            x2="0"
            y2="-134"
            stroke="currentColor"
            strokeOpacity="0.35"
            strokeWidth="1.2"
          />
        </g>
      </svg>
      <Note className="max-w-3xl text-center">
        Registered only if the run is tracked, as a launched job is: a run without an execution
        activity leaves its files on disk. The morphology is named after the mesh&apos;s id, and
        obi-one&apos;s <Mono>CellMorphologyFromID.source_mesh_entity</Mono> finds the mesh again
        through the activity and its task config.
      </Note>
    </div>
  );
}

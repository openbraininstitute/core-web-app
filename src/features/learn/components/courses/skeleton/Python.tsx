'use client';

/**
 * The skeleton figure's panels on using the files in Python: fetching a spiny morphology with
 * entitysdk, or obi-one's shortcut, shown as code since it needs a login; the cells that read it
 * with morph-spines, NeuroM, MorphIO and morph-tool, each as it ran on the course's example cell,
 * with what it printed; what in obi-one reads these files; and the things to remember.
 */

import { CodeBlock, Highlighted, INK, OutputView, Panel, parseOutput } from '../ui/Code';
import { Card, Mono, Note, Tag } from './bits';
import {
  CELLS,
  MORPH_SPINES_VERSION,
  MORPH_TOOL_VERSION,
  MORPHIO_VERSION,
  NEUROM_VERSION,
} from './cells';
import { CELL } from './files';
import { CODE_CELLS, type CodeStep } from './views';

import type { ReactNode } from 'react';

// -----------------------------------------------------------------------------
// Fetching it

const FETCH = `from pathlib import Path

from entitysdk import Client, models
from entitysdk.types import AssetLabel, ContentType
from obi_auth import get_token
from obi_notebook import get_projects

token = get_token(environment="production", auth_mode="daf")
project = get_projects.get_projects(token)
client = Client(
    environment="production", project_context=project, token_manager=token
)

# morphologies made by skeletonization, with their spines
spiny = client.search_entity(
    entity_type=models.CellMorphology,
    query={"has_segmented_spines": True},
    limit=10,
).all()
morph = spiny[0]

# of its files, the spiny H5
Path("morphs").mkdir(exist_ok=True)
asset = client.fetch_assets(
    morph,
    selection={
        "label": AssetLabel.morphology_with_spines,
        "content_type": ContentType.application_x_hdf5,
    },
    output_path=Path("morphs"),
).one()
path = asset.path`;

const SHORTCUT = `from obi_one import CellMorphologyFromID

m = CellMorphologyFromID(id_str=str(morph.id)).spiny_morphology(
    db_client=client, path="morphs"
)`;

/** entitysdk's search and fetch, and obi-one's shortcut: they need a login, so shown, not run. */
export function Fetch() {
  return (
    <div className="grid w-full items-start gap-4 md:grid-cols-[3fr_2fr]">
      <CodeBlock
        small
        label="fetch.py"
        right={<span style={{ color: INK.faint }}>needs a login: not run here</span>}
        code={FETCH}
        lit={[17, 24, 27, 28, 32]}
      />
      <div className="flex flex-col gap-3">
        <Card>
          <div className="text-[14px] font-semibold text-slate-100">Find them</div>
          <div className="mt-1 text-[13px] leading-snug text-slate-400">
            <Mono>has_segmented_spines</Mono> is one of EntityCore&apos;s filters on{' '}
            <Mono>CellMorphology</Mono>. Skeletonization registers its morphologies with it set to
            true.
          </div>
        </Card>
        <Card>
          <div className="text-[14px] font-semibold text-slate-100">Pick the spiny H5</div>
          <div className="mt-1 text-[13px] leading-snug text-slate-400">
            Of a skeletonized morphology&apos;s files, the spiny H5 is labelled{' '}
            <Mono>morphology_with_spines</Mono>. The SWC, H5 and ASC of its skeleton are labelled{' '}
            <Mono>morphology</Mono>.
          </div>
        </Card>
        <CodeBlock small label="or, with obi-one" code={SHORTCUT} lit={[3]} />
        <Note>
          <Mono>fetch_assets</Mono> links the file from a local store when the client has one, and
          downloads it otherwise. obi-one&apos;s <Mono>spiny_morphology</Mono> downloads it into the
          folder, named after the morphology, and loads it with morph-spines.
        </Note>
      </div>
    </div>
  );
}

// -----------------------------------------------------------------------------
// The cells, as they ran

/** A cell as it ran on the course's example cell: its code, its new lines lit, and what it printed. */
export function Ran({ step }: { step: CodeStep }) {
  const cell = CELLS[CODE_CELLS[step]];
  const out = parseOutput(cell.output);
  return (
    <Panel
      small
      label={cell.label}
      right={
        <span
          style={{ color: INK.faint }}
          title={`morph-spines ${MORPH_SPINES_VERSION}, NeuroM ${NEUROM_VERSION}, MorphIO ${MORPHIO_VERSION}, morph-tool ${MORPH_TOOL_VERSION}`}
        >
          ran on the example cell · morph-spines {MORPH_SPINES_VERSION}
        </span>
      }
    >
      <pre className="overflow-x-auto px-4 py-3">
        <Highlighted code={cell.code} lit={cell.lit} />
      </pre>
      <OutputView text={out.text} plots={out.plots} />
    </Panel>
  );
}

// -----------------------------------------------------------------------------
// What reads them

interface Use {
  file: string;
  text: ReactNode;
}

/** EM synapse mapping, as obi-one's code does it. */
const MAPPING: Use[] = [
  {
    file: 'em_synapse_mapping/resolve_neuron.py',
    text: (
      <>
        Fetches each neuron&apos;s spiny H5 (<Mono>write_spiny_neuron_h5</Mono>) and loads it with{' '}
        <Mono>load_morphology_with_spines</Mono>. It writes the skeleton into the circuit as SWC and
        H5, and follows the morphology back to its EM mesh for the cell&apos;s id in the EM dataset.
      </>
    ),
  },
  {
    file: 'map_em_synapses/map_synapse_locations.py',
    text: (
      <>
        The cell&apos;s synapses come from the EM dataset. CAVE stores their positions in voxels:
        obi-one multiplies them by the dataset&apos;s voxel size in nm,{' '}
        <Mono>viewer_resolution</Mono>, then divides by 1000 into µm. For each, it finds the nearest
        dendrite segment, less its radius, and the nearest vertex of a spine&apos;s mesh or the
        soma&apos;s. Nearer a spine, the synapse goes on it and takes its row of the spine table:
        section, position, spine id. On the soma it gets section 0; otherwise its section, segment
        and offset on the dendrite.
      </>
    ),
  },
  {
    file: 'em_synapse_mapping/task.py',
    text: (
      <>
        Writes a SONATA circuit and registers it as a <Mono>Circuit</Mono>: the neurons, the cells
        that synapse onto them as virtual nodes, and the synapses as edges. With{' '}
        <i>Include spiny morphologies</i>, on by default, the spiny H5s go with it, merged into one
        file.
      </>
    ),
  },
];

/** What in obi-one reads spiny morphologies: EM synapse mapping, step by step. */
export function Downstream() {
  return (
    <div className="flex w-full flex-col gap-3">
      <Card>
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <div className="text-[14px] font-semibold text-slate-100">EM synapse mapping</div>
          <Tag>obi-one</Tag>
        </div>
        <div className="mt-1 text-[13px] leading-snug text-slate-400">
          &ldquo;Map location of afferent synapses from EM onto one or more spiny
          morphologies.&rdquo; On the platform: Workflows, Build, Electron microscopy circuit. Its
          neurons are morphologies or ME-models, whose morphology is used.
        </div>
      </Card>
      <ol className="flex flex-col gap-2">
        {MAPPING.map((use, k) => (
          <li key={use.file} className="flex gap-3">
            <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full border border-slate-700 text-[11px] text-slate-400">
              {k + 1}
            </span>
            <div className="min-w-0">
              <Mono className="text-[12px] break-all">{use.file}</Mono>
              <div className="mt-0.5 text-[13px] leading-snug text-slate-400">{use.text}</div>
            </div>
          </li>
        ))}
      </ol>
      <Note>
        So the spines&apos; meshes decide which synapses are on spines, and the spine table, with
        its section ids counted as in the file, says where each one is.
      </Note>
    </div>
  );
}

// -----------------------------------------------------------------------------
// What to remember

const GOTCHAS: [string, ReactNode][] = [
  [
    'Nanometres, voxels and micrometres',
    <>
      EM meshes are in nm, and EM synapse positions in voxels: multiply them by the dataset&apos;s
      voxel size in nm (CAVE&apos;s <Mono>viewer_resolution</Mono>), as obi-one does. Morphologies,
      spines and the spine table are in µm: divide nm by 1000.
    </>,
  ],
  [
    'Spines are stored centred',
    <>
      Each spine&apos;s mesh and skeleton sit in a frame of their own; the table&apos;s rotation and
      translation place them. <Mono>spine_mesh</Mono> gives it placed,{' '}
      <Mono>centered_spine_mesh</Mono> in its frame, where it runs up to y ={' '}
      <Mono>spine_length</Mono> and below 0. In {CELL.reversedSpines} of this file&apos;s{' '}
      {CELL.counts.spines} rows the frame is turned round: its origin is nearer the spine&apos;s
      free end, and +y points into the dendrite.
    </>,
  ],
  [
    'Section 0 is the soma',
    <>
      <Mono>afferent_section_id</Mono> counts the soma as section 0, so a spine&apos;s section is{' '}
      <Mono>morphology.sections[id - {CELL.sectionIdOffset}]</Mono>.
    </>,
  ],
  [
    'A spiny H5 is not a morphology H5',
    <>
      Its skeleton is under <Mono>/morphology/&lt;name&gt;</Mono>: read it with morph-spines or{' '}
      <Mono>morphio.Collection</Mono>. <Mono>morphio.Morphology</Mono> and morph-tool cannot open
      it. The run&apos;s <Mono>-morphology.swc</Mono>, <Mono>.h5</Mono> and <Mono>.asc</Mono> are
      plain morphologies.
    </>,
  ],
  [
    'SWC has no soma contour',
    <>
      Written straight to SWC by MorphIO, the soma has no width. morph-tool&apos;s{' '}
      <Mono>convert</Mono> makes it cylinders as NEURON does, or one sphere.
    </>,
  ],
  [
    'Heads, necks and types are optional',
    <>
      A file may not mark them, as this one does not: then every spine&apos;s type is undefined and{' '}
      <Mono>include_neck=False</Mono> leaves out nothing.
    </>,
  ],
  [
    'Find them with has_segmented_spines',
    'Skeletonization registers its morphologies with it set to true, and EntityCore can filter on it.',
  ],
  [
    'The campaign is not what you launch',
    "Generating the grid returns the campaign's id; estimate and launch take one of its task configs' ids.",
  ],
  [
    'Registered only when tracked',
    'A run with an execution activity, as a launched job has, registers the morphology and its files. Without one, they stay on disk.',
  ],
];

/** What to remember, each with what showed it in this course. */
export function Gotchas() {
  return (
    <div className="grid w-full gap-3 sm:grid-cols-2 lg:grid-cols-3">
      {GOTCHAS.map(([title, body]) => (
        <Card key={title}>
          <div className="text-[14px] font-semibold text-slate-100">{title}</div>
          <div className="mt-1 text-[13px] leading-snug text-slate-400">{body}</div>
        </Card>
      ))}
    </div>
  );
}

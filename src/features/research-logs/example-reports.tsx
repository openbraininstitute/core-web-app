'use client';

import { ArrowLeftOutlined, GlobalOutlined } from '@ant-design/icons';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

import { BOX_CLASS } from '@/features/scan-config/components/shared/box-class';
import { cn } from '@/utils/css-class';

import { useResearchLogHref } from './hooks';
import { ResearchLogMarkdown } from './markdown';

/**
 * Made-up public reports for the prototype, so the public side of the Reports page has something to show: white
 * cards with a picture at their top right, each opening a report of its own (read only) at `example-<slug>`.
 */
interface IExampleReport {
  slug: string;
  title: string;
  summary: string;
  author: string;
  date: string;
  image: string;
  body: string;
}

const EXAMPLE_REPORTS: IExampleReport[] = [
  {
    slug: 'thalamocortical-bursts',
    title: 'Thalamocortical bursts in a MICrONS-derived circuit',
    summary:
      'Burst firing in the reticular nucleus drives spindle-like oscillations in a biophysically-detailed thalamocortical model.',
    author: 'Elena Rossi',
    date: '8 Nov 2026',
    image: '/images/thalamus-project-card.png',
    body: `## Aim
Find out whether the reconstructed thalamocortical circuit produces spindle-like oscillations when the reticular nucleus is hyperpolarised.

## Method
- Circuit: 4,812 neurons reconstructed from MICrONS EM data, with fitted e-models.
- Stimulus: a 200 ms hyperpolarising step into the reticular nucleus, then release.
- Recorded: spikes from every cell and the membrane potential of 50 relay cells.

## Results
Released from hyperpolarisation, reticular cells fire low-threshold bursts that recruit relay cells within 30 ms. The population oscillates at **11.8 Hz** for about 1.2 s before damping.

| Measure | Value |
| --- | --- |
| Oscillation frequency | 11.8 Hz |
| Spindle duration | 1.2 s |
| Relay cells recruited | 64 % |

## Next steps
Sweep the T-type calcium conductance in the reticular nucleus to see where the spindles stop.`,
  },
  {
    slug: 'fly-sugar-to-proboscis',
    title: 'From sugar sensing to proboscis extension in the whole fly brain',
    summary:
      'A FlyWire leaky integrate-and-fire simulation follows the pathway from gustatory receptor neurons to the MN9 motor neuron.',
    author: 'Marcus Chen',
    date: '5 Nov 2026',
    image: '/images/scales/whole-brain.webp',
    body: `## Aim
Trace how activity in sugar-sensing gustatory receptor neurons reaches the motor neurons of the proboscis.

## Method
The whole-brain FlyWire connectome as a leaky integrate-and-fire circuit, with 21 sugar GRNs driven by Poisson input at 100 Hz for one second.

## Results
- MN9 fires at 43 Hz under drive and is silent without it.
- The shortest path crosses three synapses, through the G2N and Rattle interneurons.
- Silencing the 12 strongest second-order neurons drops MN9's rate by 80 %.

## Next steps
Compare with the bitter pathway, which should suppress the same motor neurons.`,
  },
  {
    slug: 'whisker-deflection',
    title: 'Whisker deflection responses in a somatosensory microcircuit',
    summary:
      'Thalamic input to a rat barrel-cortex column, and how the layers answer it: latencies, firing rates and the spread of activity.',
    author: 'Priya Ananth',
    date: '2 Nov 2026',
    image: '/images/scales/microcircuit.webp',
    body: `## Aim
Measure the layer-by-layer response of a barrel-cortex column to a single whisker deflection.

## Method
A 31,000-neuron column, with VPM thalamic fibres driven in a 5 ms volley that stands in for the deflection. The volley was repeated 40 times.

## Results
Layer 4 answers first, at 8 ms, then layers 2/3 at 12 ms and layer 5 at 14 ms. Layer 6 stays quiet unless the volley is doubled.

## Next steps
Add the POm pathway and compare with paired-whisker stimulation.`,
  },
  {
    slug: 'l5-ttpc-emodel',
    title: 'An e-model for layer 5 thick-tufted pyramidal cells',
    summary:
      'Fitting ion channel densities to current-clamp recordings, then validating back-propagating action potentials and bursting.',
    author: 'Lukas Keller',
    date: '29 Oct 2026',
    image: '/images/scales/single-neuron.webp',
    body: `## Aim
Build an e-model for layer 5 thick-tufted pyramidal cells that reproduces their firing and their dendritic calcium spikes.

## Method
Ion channel densities on soma, axon and apical dendrite fitted to 14 e-features from 23 current-clamp recordings, using an evolutionary optimiser.

## Results
- Every e-feature lands within two standard deviations of the recordings.
- Back-propagating action potentials attenuate to 35 % at 600 µm.
- Paired somatic and dendritic input triggers bursts, as the cells do.

## Next steps
Generalise the model across 40 reconstructed morphologies.`,
  },
  {
    slug: 'kv13-kinetics',
    title: 'Fitting Kv1.3 kinetics from patch-clamp recordings',
    summary:
      'Activation and inactivation of a voltage-gated potassium channel, fitted across temperatures from whole-cell recordings.',
    author: 'Jia Wen',
    date: '24 Oct 2026',
    image: '/images/scales/ion-channel.webp',
    body: `## Aim
A Hodgkin–Huxley model of Kv1.3 that holds from room temperature to 37 °C.

## Method
Activation, deactivation and inactivation protocols at 22, 30 and 37 °C, fitted together with a Q10 on each rate.

## Results
| Gate | Q10 |
| --- | --- |
| Activation | 2.8 |
| Inactivation | 3.1 |

The fitted model matches the recorded currents with r² = 0.97.

## Next steps
Put the channel into the e-models of T lymphocyte–like cells.`,
  },
  {
    slug: 'ca1-synaptome',
    title: 'Placing synapses on a reconstructed CA1 pyramidal cell',
    summary:
      'A synaptome built from connectivity rules and the cell’s morphology, then driven with Schaffer collateral input.',
    author: 'Sofia Moreau',
    date: '19 Oct 2026',
    image: '/images/scales/synaptome.webp',
    body: `## Aim
Place realistic afferent synapses on a CA1 pyramidal cell and check its response to Schaffer collateral drive.

## Method
12,400 excitatory and 1,700 inhibitory synapses placed by the connectivity rules for each input pathway, with short-term plasticity per synapse type.

## Results
Somatic EPSPs from single Schaffer fibres average 0.24 mV, within the recorded range. Theta-burst drive brings the cell to firing after the third burst.

## Next steps
Add NMDA spikes in the oblique dendrites and test pattern separation.`,
  },
  {
    slug: 'ngv-coupling',
    title: 'Neuro-glia-vasculature coupling during sustained activity',
    summary:
      'How astrocytes and blood flow follow minutes of high firing in a cortical neuro-glia-vasculature circuit.',
    author: 'Daniel Okafor',
    date: '14 Oct 2026',
    image: '/images/scales/neuron-glia-vasculature-circuit.webp',
    body: `## Aim
Follow energy supply through astrocytes and the vasculature during two minutes of sustained firing.

## Method
A neuro-glia-vasculature circuit of 88,000 neurons, 14,000 astrocytes and the vessels between them, driven at twice its resting rate.

## Results
- Astrocytic lactate output peaks at 40 s.
- Arteriole diameter rises by 9 % and settles by 90 s.
- Neuronal ATP dips by 6 % and recovers as flow catches up.

## Next steps
Repeat with an aged metabolic profile.`,
  },
  {
    slug: 'spine-density-em',
    title: 'Spine density along dendrites from EM meshes',
    summary:
      'Skeletonizing MICrONS cell meshes, extracting their spines, and comparing densities by distance from the soma.',
    author: 'Hannah Lindqvist',
    date: '9 Oct 2026',
    image: '/images/landing-science/em-cell-mesh-poster.png',
    body: `## Aim
Measure spine density by distance from the soma across excitatory cells of the MICrONS volume.

## Method
120 cell meshes, skeletonized and their spines extracted, each spine binned by its path distance to the soma.

## Results
Density rises to 1.9 spines per µm at 100–150 µm, then falls off along the apical tuft. Basal dendrites are flatter, at a little over 1 spine per µm.

## Next steps
Split by cell type, and compare with the synapse counts in the connectome.`,
  },
];

export const EXAMPLE_PREFIX = 'example-';
export const exampleReport = (id: string) =>
  id.startsWith(EXAMPLE_PREFIX) ? EXAMPLE_REPORTS.find((r) => r.slug === id.slice(EXAMPLE_PREFIX.length)) : undefined;

/** The made-up public reports, as white cards for the Reports page's grid, each with its picture at the top right. */
export function ExampleReportCards() {
  const href = useResearchLogHref();
  return (
    <>
      {EXAMPLE_REPORTS.map((report) => (
        <Link
          key={report.slug}
          href={href(EXAMPLE_PREFIX + report.slug)}
          className="border-neutral-2 hover:border-primary-5 flex h-full items-start gap-4 rounded-xl border bg-white p-5 transition-colors hover:shadow-md"
        >
          <span className="flex min-w-0 flex-1 flex-col gap-2 self-stretch">
            <span className="text-primary-9 text-lg font-bold">{report.title}</span>
            <span className="text-neutral-6 line-clamp-3 text-sm">{report.summary}</span>
            <span className="text-neutral-4 mt-auto flex flex-col gap-0.5 pt-2 text-xs">
              <span className="flex items-center gap-1.5">
                <GlobalOutlined className="text-green-600" /> {report.author}
              </span>
              <span>Last edited {report.date}</span>
            </span>
          </span>
          <img
            src={report.image}
            alt=""
            className="bg-primary-9 size-[88px] shrink-0 rounded-lg object-cover"
            draggable={false}
          />
        </Link>
      ))}
    </>
  );
}

/** A made-up report, read only, in the same frame as a real one. */
export function ExampleReportView({ report }: { report: IExampleReport }) {
  const router = useRouter();
  const href = useResearchLogHref();
  return (
    <div className={cn(BOX_CLASS, 'flex h-full min-h-0 flex-col overflow-hidden')}>
      <header className="border-neutral-2 flex shrink-0 items-center gap-3 border-b px-6 pt-3 pb-3">
        <button
          type="button"
          aria-label="All research logs"
          onClick={() => router.push(href())}
          className="text-primary-9 hover:bg-neutral-1 flex size-10 items-center justify-center rounded-full bg-white text-base shadow-md transition-colors"
        >
          <ArrowLeftOutlined />
        </button>
        <h1 className="text-primary-9 min-w-0 flex-1 truncate text-2xl font-bold" title={report.title}>
          {report.title}
        </h1>
        <span className="flex items-center gap-1.5 rounded-full bg-green-50 px-3 py-1 text-xs font-semibold text-green-700">
          <GlobalOutlined /> Public
        </span>
      </header>
      <div className="no-scrollbar min-h-0 flex-1 overflow-y-auto px-8 pt-4 pb-8">
        <article className="mx-auto max-w-3xl">
          <div className="flex items-start gap-6">
            <div className="flex min-w-0 flex-1 flex-col">
              <p className="text-primary-9 text-lg">{report.summary}</p>
              <p className="text-neutral-4 mt-1 text-xs">
                {report.author} · updated {report.date}
              </p>
            </div>
            <img
              src={report.image}
              alt=""
              className="bg-primary-9 size-[140px] shrink-0 rounded-xl object-cover"
              draggable={false}
            />
          </div>
          <div className="border-neutral-2 mt-4 border-t pt-4">
            <ResearchLogMarkdown markdown={report.body} />
          </div>
        </article>
      </div>
    </div>
  );
}

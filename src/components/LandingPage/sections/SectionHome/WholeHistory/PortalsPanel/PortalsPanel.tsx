import React from 'react';

import { StaticImageData } from 'next/image';
import AtlasURL from './atlas.jpg';
import ChannelURL from './channel.jpg';
import HippocampusURL from './hippocampus.jpg';
import NeocorticalURL from './neocortical.jpg';
import NgvURL from './ngv.jpg';
import SscxURL from './sscx.jpg';
import ThalamusURL from './thalamus.jpg';
import TopologicalURL from './topological.jpg';
import PortalCard from './card/PortalCard';
import { classNames } from '@/util/utils';

import styles from './PortalsPanel.module.css';

export interface PortalsPanelProps {
  className?: string;
}

export default function PortalsPanel({ className }: PortalsPanelProps) {
  return (
    <>
      <h1>Browse through the portals built by the Blue Brain Project</h1>
      <div className={classNames(className, styles.portalsPanel)}>
        {PORTALS.map(({ title, content, image, href }) => (
          <PortalCard key={title} title={title} content={content} image={image} href={href} />
        ))}
      </div>
    </>
  );
}

const PORTALS: Array<{
  title: string;
  content: string;
  href: string;
  image: StaticImageData;
}> = [
  {
    title: 'The Neocortical Microcircuit Collaboration Portal',
    content:
      "An online public resource of the Blue Brain Project's first release of a digital reconstruction of the microcircuitry of juvenile Rat somatosensory cortex",
    image: NeocorticalURL,
    href: 'https://bbp.epfl.ch/nmc-portal/welcome.html',
  },
  {
    title: 'The Neuro-Glia-Vasculature Portal',
    content:
      'Come and explore the various datasets and visuals made available to understand how we reconstruct in silico the Neuro-Glia-Vasculature ensemble architecture of the rat brain.',
    image: NgvURL,
    href: 'https://bbp.epfl.ch/ngv-portal/',
  },
  {
    title: 'The hippocampus hub',
    content: 'Explore the existing Hippocampus model and all its parts!',
    image: HippocampusURL,
    href: 'https://www.hippocampushub.eu/model/',
  },
  {
    title: 'The Blue Brain Cell Atlas',
    content:
      'The Blue Brain Cell Atlas is a comprehensive online resource that describes the number, types, and positions of cells in all areas of the mouse brain.',
    image: AtlasURL,
    href: 'https://bbp.epfl.ch/nexus/cell-atlas/',
  },
  {
    title: 'Channelpedia',
    content:
      'Web-based freely-accessible information management network and electrophysiology data repository for comprehensive ion channel research.',
    image: ChannelURL,
    href: 'https://channelpedia.epfl.ch',
  },
  {
    title: 'The SSCx portal',
    content: "Discover a tissue-level model of the rodent somatosensory cortex 'in silico'",
    image: SscxURL,
    href: 'https://bbp.epfl.ch/sscx-portal/',
  },
  {
    title: 'The Thalamus studio',
    content:
      'Thalamic control of sensory processing and spindles in a biophysical somatosensory thalamoreticular circuit model of wakefulness and sleep.',
    image: ThalamusURL,
    href: 'https://bbp.epfl.ch/thalamus-studio',
  },
  {
    title: 'The topological sampling data studio',
    content:
      "Input data and analysis results of our manuscript 'Topology of synaptic connectivity constrains neuronal stimulus representation, predicting two complementary coding strategies'.",
    image: TopologicalURL,
    href: 'https://bbp.epfl.ch/topological-sampling-portal',
  },
];

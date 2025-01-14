import React from 'react';

import Link from 'next/link';
import AtlasURL from './atlas.jpg';
import ChannelURL from './channel.jpg';
import HippocampusURL from './hippocampus.jpg';
import NeocorticalURL from './neocortical.jpg';
import NgvURL from './ngv.jpg';
import SscxURL from './sscx.jpg';
import ThalamusURL from './thalamus.jpg';
import TopologicalURL from './topological.jpg';
import { classNames } from '@/util/utils';

import CenteredColumn from '@/components/LandingPage/CenteredColumn';
import styles from './PortalsPanel.module.css';

export interface PortalsPanelProps {
  className?: string;
}

export default function PortalsPanel({ className }: PortalsPanelProps) {
  return (
    <>
      <h1>Browse through the portals built by the Blue Brain Project</h1>
      <CenteredColumn>
        <div className={classNames(className, styles.portalsPanel)}>
          {PORTALS.map(({ title, content, image, href }) => (
            <Link key={title} href={href} className={styles.center}>
              <div className={styles.button}>
                <div className={styles.text}>
                  <div>Portal</div>
                  <h2>{title}</h2>
                  <div>{content}</div>
                </div>
                <div className={styles.image} style={{ backgroundImage: `url(${image})` }} />
              </div>
            </Link>
          ))}
        </div>
      </CenteredColumn>
    </>
  );
}

const PORTALS: Array<{
  title: string;
  content: string;
  href: string;
  image: string;
}> = [
  {
    title: 'The Neocortical Microcircuit Collaboration Portal',
    content:
      "An online public resource of the Blue Brain Project's first release of a digital reconstruction of the microcircuitry of juvenile Rat somatosensory cortex",
    image: NeocorticalURL.src,
    href: 'https://bbp.epfl.ch/nmc-portal/welcome.html',
  },
  {
    title: 'The Neuro-Glia-Vasculature Portal',
    content:
      'Come and explore the various datasets and visuals made available to understand how we reconstruct in silico the Neuro-Glia-Vasculature ensemble architecture of the rat brain.',
    image: NgvURL.src,
    href: 'https://bbp.epfl.ch/ngv-portal/',
  },
  {
    title: 'The hippocampus hub',
    content: 'Explore the existing Hippocampus model and all its parts!',
    image: HippocampusURL.src,
    href: 'https://www.hippocampushub.eu/model/',
  },
  {
    title: 'The Blue Brain Cell Atlas',
    content:
      'The Blue Brain Cell Atlas is a comprehensive online resource that describes the number, types, and positions of cells in all areas of the mouse brain.',
    image: AtlasURL.src,
    href: 'https://bbp.epfl.ch/nexus/cell-atlas/',
  },
  {
    title: 'Channelpedia',
    content:
      'Web-based freely-accessible information management network and electrophysiology data repository for comprehensive ion channel research.',
    image: ChannelURL.src,
    href: 'https://channelpedia.epfl.ch',
  },
  {
    title: 'The SSCx portal',
    content: "Discover a tissue-level model of the rodent somatosensory cortex 'in silico'",
    image: SscxURL.src,
    href: 'https://bbp.epfl.ch/sscx-portal/',
  },
  {
    title: 'The Thalamus studio',
    content:
      'Thalamic control of sensory processing and spindles in a biophysical somatosensory thalamoreticular circuit model of wakefulness and sleep.',
    image: ThalamusURL.src,
    href: 'https://bbp.epfl.ch/nexus/web/studios/public/thalamus/studios/e9ceee28-b2c2-4c4d-bff9-d16f43c3eb0f',
  },
  {
    title: 'The topological sampling data studio',
    content:
      "Input data and analysis results of our manuscript 'Topology of synaptic connectivity constrains neuronal stimulus representation, predicting two complementary coding strategies'.",
    image: TopologicalURL.src,
    href: 'https://bbp.epfl.ch/nexus/web/studios/public/topological-sampling/studios/data:a7cc7e9f-53c5-4940-929c-95f4c4f57728?workspaceId=https%3A%2F%2Fbbp.epfl.ch%2Fneurosciencegraph%2Fdata%2F165e54c5-e8f6-4d85-ac94-53bc3dfe5cd4&dashboardId=https%3A%2F%2Fbbp.epfl.ch%2Fneurosciencegraph%2Fdata%2Ff7f58b8a-fe14-4956-9c20-44a60729893a',
  },
];

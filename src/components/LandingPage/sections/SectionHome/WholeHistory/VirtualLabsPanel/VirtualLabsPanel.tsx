import React from 'react';

import exploreImgUrl from './explore.webp';
import buildImgUrl from './build.webp';
import simulateImgUrl from './simulate.webp';
import { SingleSectionCard, SingleSectionCardProps } from './card/card';

import styles from './VirtualLabsPanel.module.css';

const SECTION_CONTENT: Omit<SingleSectionCardProps, 'index'>[] = [
  {
    title: 'Explore',
    description: 'Configure and build digital brain models',
    image: exploreImgUrl,
  },
  {
    title: 'Build',
    description: 'Configure and build multiscale models',
    image: buildImgUrl,
  },
  {
    title: 'Simulate',
    description: 'Set up virtual experiments and run simulations ',
    image: simulateImgUrl,
  },
];

export default function VirtualLabsPanel() {
  return (
    <>
      <h1>Virtual labs to explore, build, and simulate the brain</h1>
      <div className={styles.triBlocks}>
        {SECTION_CONTENT.map(({ title, description, image }, index) => (
          <SingleSectionCard
            key={`card_${title}_${index + 1}}`}
            index={index}
            title={title}
            description={description}
            image={image}
          />
        ))}
      </div>
    </>
  );
}

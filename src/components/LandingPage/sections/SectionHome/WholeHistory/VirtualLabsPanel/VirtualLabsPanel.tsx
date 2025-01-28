import React from 'react';

import exploreImgUrl from './explore.webp';
import buildImgUrl from './build.webp';
import simulateImgUrl from './simulate.webp';
import SingleSectionCard, { SingleSectionCardProps } from './card';
import styles from './VirtualLabsPanel.module.css';



export default function VirtualLabsPanel() {

  const SECTION_CONTENT = [
    {
      title: 'Explore',
      description: 'Configure and build digital brain models',
      image: exploreImgUrl,
    },
    {
      title: 'Build',
      description: 'Configure and build multiscale models',
      image: buildImgUrl
    },
    {
      title: 'Simulate',
      description: 'Set up virtual experiments and run simulations ',
      image: simulateImgUrl
    }
  ]

  return (
    <>
      <h1>Virtual labs to explore, build, and simulate the brain</h1>
      <div className={styles.triBlocks}>
        {
          SECTION_CONTENT.map((section: SingleSectionCardProps, index: number) => (
            <SingleSectionCard
              key={`card_${section.title}_${index + 1}}`}
              content={section}
              index={index}
              />
          ))
        }
      </div>
    </>
  );
}

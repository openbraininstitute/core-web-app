import React from 'react';

import exploreUrl from './explore.mp4';
import buildUrl from './build.mp4';
import experimentUrl from './experiment.mp4';
import { SingleSectionCard, SingleSectionCardProps } from './card/card';

import styles from './VirtualLabsPanel.module.css';

const SECTION_CONTENT: Omit<SingleSectionCardProps, 'index'>[] = [
  {
    title: 'Explore',
    description: 'Browse Search and Query Data and Models',
    video: exploreUrl,
  },
  {
    title: 'Build',
    description: 'Use, configure and build digital brain models',
    video: buildUrl,
  },
  {
    title: 'Experiment',
    description: 'Design, run and analyse virtual simulation experiments',
    video: experimentUrl,
  },
];

export default function VirtualLabsPanel() {
  return (
    <>
      <h1>Virtual labs to explore, build, and experiment digital brain models</h1>
      <div className={styles.triBlocks}>
        {SECTION_CONTENT.map(({ title, description, video }, index) => (
          <SingleSectionCard
            key={`card_${title}_${index + 1}}`}
            index={index}
            title={title}
            description={description}
            video={video}
          />
        ))}
      </div>
    </>
  );
}

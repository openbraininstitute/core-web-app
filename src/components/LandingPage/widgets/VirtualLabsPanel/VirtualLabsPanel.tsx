import React from 'react';

import { styleBlockLarge } from '../../styles';
import { SingleSectionCard } from './card/card';
import { useSanityContentForVirtualLabsBlocks } from '@/components/LandingPage/content/virtualLabs';
import { classNames } from '@/util/utils';

import styles from './VirtualLabsPanel.module.css';

export function WidgetVirtualLabsPanel() {
  // const sectionTitle = useSanityContentForVirtualLabsTitle();
  const blocks = useSanityContentForVirtualLabsBlocks();

  return (
    <>
      {/* <h1 className={styleBlockSmall}>{sectionTitle}</h1> */}
      <div className={classNames(styles.triBlocks, styleBlockLarge)}>
        {blocks.map(({ title, description, videoURL }, index) => (
          <SingleSectionCard
            key={`card_${title}_${index + 1}}`}
            index={index}
            title={title}
            description={description}
            video={videoURL}
          />
        ))}
      </div>
    </>
  );
}

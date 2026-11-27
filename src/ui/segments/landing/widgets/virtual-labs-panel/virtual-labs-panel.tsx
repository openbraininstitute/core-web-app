import React from 'react';

import { styleBlockLarge } from '@/ui/segments/landing/styles';
import { classNames } from '@/util/utils';

import { SingleSectionCard } from './card/card';

import type { ContentForVirtualLabsBlock } from '@/services/sanity/api/get-virtual-labs-content';

import styles from './virtual-labs-panel.module.css';

interface WidgetVirtualLabsPanelProps {
  data: ContentForVirtualLabsBlock[];
  compact?: boolean;
}

export function WidgetVirtualLabsPanel({ data, compact = false }: WidgetVirtualLabsPanelProps) {
  return (
    <>
      <div className={classNames(styles.triBlocks, compact && styles.compact, styleBlockLarge)}>
        {data.map(({ title, description, videoURL }, index) => (
          <SingleSectionCard
            key={`card_${title}_${index + 1}}`}
            index={index}
            compact={compact}
            title={title}
            description={description}
            video={videoURL}
          />
        ))}
      </div>
    </>
  );
}

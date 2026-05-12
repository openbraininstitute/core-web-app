import React from 'react';

import { styleBlockFullWidthPadded } from '@/ui/segments/landing/styles';
import { classNames } from '@/util/utils';

import PortalCard from './portal-card';

import type { ContentForPortalsListItem } from '@/services/sanity/api/get-portals-content';

import styles from './portals-panel.module.css';

interface WidgetPortalsPanelProps {
  className?: string;
  title: string;
  list: ContentForPortalsListItem[];
}

export function WidgetPortalsPanel({ className, title, list }: WidgetPortalsPanelProps) {
  return (
    <>
      <h1>{title}</h1>
      <div className={classNames(className, styles.portalsPanel, styleBlockFullWidthPadded)}>
        {list.map((portal) => (
          <PortalCard key={portal.link} value={portal} />
        ))}
      </div>
    </>
  );
}

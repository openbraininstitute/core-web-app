import Link from 'next/link';
import React from 'react';

import ProgressiveImage from '@/ui/segments/landing/components/progressive-image/progressive-image';
import { IconDownloadFile } from '@/ui/segments/landing/icons/icon-download-file';
import { styleBlockSmall } from '@/ui/segments/landing/styles';
import { classNames } from '@/util/utils';

import type { ContentForMissionDownload } from '@/services/sanity/api/get-mission-download';

import styles from './mission-statement.module.css';

interface WidgetMissionStatementProps {
  className?: string;
  data: ContentForMissionDownload;
}

export function WidgetMissionStatement({ className, data }: WidgetMissionStatementProps) {
  const { title, documentURL, imageURL, imageWidth, imageHeight } = data;

  return (
    <Link
      href={documentURL}
      target="_blank"
      rel="noopener noreferrer"
      className={classNames(className, styles.missionStatement, styleBlockSmall)}
    >
      <div className={styles.text}>
        <h2>{title}</h2>
        {/* <Text raw value={description} /> */}
      </div>
      <div className={styles.background}>
        <ProgressiveImage
          className={styles.image}
          src={imageURL}
          width={imageWidth}
          height={imageHeight}
          alt={title}
        />
        <div className={styles.icon}>
          <IconDownloadFile />
        </div>
      </div>
    </Link>
  );
}

import React from 'react';

import { classNames } from '@/util/utils';

import styles from './Video.module.css';

export interface ProgressiveVideoProps {
  className?: string;
  src: string;
}

export default function ProgressiveVideo({ className, src }: ProgressiveVideoProps) {
  return (
    <div className={classNames(className, styles.video)}>
      <video src={src} muted autoPlay loop disablePictureInPicture playsInline />
    </div>
  );
}

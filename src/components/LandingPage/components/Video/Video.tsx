import React from 'react';

import { classNames } from '@/util/utils';

import styles from './Video.module.css';

export interface VideoProps {
  className?: string;
  src: string;
}

export default function Video({ className, src }: VideoProps) {
  return (
    <div className={classNames(className, styles.video)}>
      <video src={src} muted autoPlay loop disablePictureInPicture />
    </div>
  );
}

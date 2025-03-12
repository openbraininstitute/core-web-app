import React, { CSSProperties } from 'react';

import { classNames } from '@/util/utils';

import styles from './Video.module.css';

export interface ProgressiveVideoProps {
  className?: string;
  src: string;
  autosize?: boolean;
}

export default function ProgressiveVideo({ className, src, autosize }: ProgressiveVideoProps) {
  const [style, setStyle] = React.useState<CSSProperties>({});
  const handleReady = (evt: React.SyntheticEvent<HTMLVideoElement>) => {
    const video = evt.target as HTMLVideoElement;
    if (!autosize || !video) return;

    setStyle({
      width: '100%',
      height: 'auto',
      aspectRatio: `${video.videoWidth}/${video.videoHeight}`,
    });
  };
  return (
    <div className={classNames(className, styles.video)} style={style}>
      <video
        src={src}
        muted
        autoPlay
        loop
        disablePictureInPicture
        playsInline
        onCanPlay={handleReady}
      />
    </div>
  );
}

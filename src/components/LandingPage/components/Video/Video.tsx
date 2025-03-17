import React, { CSSProperties } from 'react';

import { classNames } from '@/util/utils';
import { isNumber } from '@/util/type-guards';

import styles from './Video.module.css';

export interface ProgressiveVideoProps {
  className?: string;
  src: string;
  autosize?: boolean;
  currentTime?: number;
  onCurrentTimeChange?(currentTime?: number): void;
}

export default function ProgressiveVideo({
  className,
  src,
  autosize,
  currentTime,
  onCurrentTimeChange,
}: ProgressiveVideoProps) {
  const refVideo = React.useRef<HTMLVideoElement | null>(null);
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
  React.useEffect(() => {
    const video = refVideo.current;
    if (!isNumber(currentTime) || !video) return;

    video.currentTime = currentTime;
  }, [currentTime]);
  const handleTimeUpdate = () => {
    const video = refVideo.current;
    if (!video || !onCurrentTimeChange) return;

    onCurrentTimeChange(video.currentTime);
  };

  return (
    <div className={classNames(className, styles.video)} style={style}>
      <video
        src={src}
        ref={refVideo}
        muted
        autoPlay
        loop
        disablePictureInPicture
        playsInline
        onCanPlay={handleReady}
        onTimeUpdate={handleTimeUpdate}
      />
    </div>
  );
}

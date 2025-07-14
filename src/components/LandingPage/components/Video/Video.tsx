/* eslint-disable jsx-a11y/media-has-caption */
import { usePathname } from 'next/navigation';
import React, { CSSProperties, SyntheticEvent, useRef, useState } from 'react';

import { isNumber } from '@/util/type-guards';
import { classNames } from '@/util/utils';

import { PauseIcon } from '@/components/icons';
import { PlayIcon } from '@/components/tutorials-carrousel/tutorial-card/play-icon';

import styles from './Video.module.css';

interface ProgressiveVideoProps {
  className?: string;
  src: string;
  autosize?: boolean;
  controls?: boolean;
  currentTime?: number;
  onCurrentTimeChange?(currentTime?: number): void;
}

export default function ProgressiveVideo({
  className,
  src,
  controls = false,
  autosize,
  currentTime,
  onCurrentTimeChange,
}: ProgressiveVideoProps) {
  const pathname = usePathname();
  const isHomepage = pathname === '/';

  const [isHovered, setIsHovered] = useState<boolean>(false);
  const [videoPlaying, setVideoPlaying] = useState<boolean>(false);
  const refVideo = useRef<HTMLVideoElement | null>(null);
  const [style, setStyle] = useState<CSSProperties>({});
  const handleReady = (evt: SyntheticEvent<HTMLVideoElement>) => {
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

  const handlePlay = () => {
    const video = refVideo.current;
    if (!video || !onCurrentTimeChange) return;

    setVideoPlaying(true);
    video.play();
  };

  const handlePause = () => {
    const video = refVideo.current;
    if (!video || !onCurrentTimeChange) return;
    setVideoPlaying(false);
    video.pause();
  };

  React.useEffect(() => {
    const video = refVideo.current;
    if (!video) return;

    video.muted = !isHovered;
  }, [isHovered]);

  return (
    <div
      onMouseOver={() => setIsHovered(true)}
      onFocus={() => setIsHovered(true)}
      onMouseOut={() => setIsHovered(false)}
      onBlur={() => setIsHovered(false)}
      className={classNames(className, styles.video)}
      aria-label="Click to play"
      style={style}
    >
      {isHomepage && (
        <>
          {videoPlaying ? (
            <button
              type="button"
              aria-label="pause video"
              onClick={handlePause}
              className={styles.playButton}
              style={{
                opacity: isHovered ? 1 : 0,
              }}
            >
              <PauseIcon className="h-16 w-auto" />
            </button>
          ) : (
            <button
              type="button"
              aria-label="play video"
              onClick={handlePlay}
              className={styles.playButton}
            >
              <PlayIcon className="h-32 w-auto" />
            </button>
          )}
        </>
      )}
      <video
        className={classNames(controls && styles.pointer)}
        src={src}
        ref={refVideo}
        controls={controls}
        muted
        loop={!controls}
        disablePictureInPicture
        playsInline
        autoPlay={!controls && !isHomepage}
        onPlay={handlePlay}
        onCanPlay={handleReady}
        onTimeUpdate={handleTimeUpdate}
      />
    </div>
  );
}

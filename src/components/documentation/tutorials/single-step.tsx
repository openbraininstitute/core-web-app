import { PortableText } from 'next-sanity';
import { useState } from 'react';
import { StepProps } from '../type';

import playVideoAtTime from '@/util/play-video-at-time';

import secondsToMMSS from '@/util/convert-seconds-to-minutes';
import { classNames } from '@/util/utils';
import styles from './text-content-bloc.module.css';

export default function SingleStep({
  content,
  videoTime,
  setVideoTime,
  videoRef,
  index,
}: {
  content: StepProps;
  videoTime: number;
  setVideoTime: (time: number) => void;
  videoRef: React.RefObject<HTMLVideoElement>;
  index: number;
}) {
  const [mouseHover, setMouseHover] = useState<boolean>(false);

  const handlePlayAtTime = () => {
    if (content.time != null) {
      playVideoAtTime(content.time, videoRef);
      setVideoTime(content.time);
    } else {
      throw new Error('Content time is not defined');
    }
  };

  return (
    <button
      type="button"
      aria-label="Show step"
      onClick={handlePlayAtTime}
      className={classNames(
        'rounded-xl border border-solid  text-white transition-all duration-500 ease-in-out',
        videoTime === content.time ? 'bg-primary-7' : 'bg-primary-9',

        mouseHover ? 'border-primary-6' : 'border-primary-9'
      )}
      onMouseOver={() => setMouseHover(true)}
      onFocus={() => setMouseHover(true)}
      onMouseOut={() => setMouseHover(false)}
      onBlur={() => setMouseHover(false)}
    >
      <div
        className={classNames(
          'flex origin-center flex-col items-start transition-all duration-500 ease-in-out',
          mouseHover ? 'scale-90' : 'scale-100'
        )}
      >
        <div className="text-base font-normal">
          Step {index + 1} - <span className="text-primary-4">{secondsToMMSS(content.time)}</span>
        </div>
        <h4 className="mb-2 text-2xl font-bold ">{content.title}</h4>
        <div className={styles['small-transcript']}>
          <PortableText value={content.content ?? []} />
        </div>
      </div>
    </button>
  );
}

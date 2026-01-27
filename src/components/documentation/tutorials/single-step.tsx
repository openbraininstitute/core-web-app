import { PortableText } from 'next-sanity';
import type { RefObject } from 'react';
import useMouseHover from '@/hooks/useMouveHover';
import secondsToMMSS from '@/util/convert-seconds-to-minutes';
import playVideoAtTime from '@/util/play-video-at-time';
import { classNames } from '@/util/utils';
import type { StepProps } from '../type';
import styles from './text-content-bloc.module.css';

export default function SingleStep({
  content,
  videoTime,
  setVideoTime,
  videoRef,
  nextStepTime,
  index,
}: {
  content: StepProps;
  videoTime: number;
  setVideoTime: (time: number) => void;
  videoRef: RefObject<HTMLVideoElement>;
  nextStepTime?: number;
  index: number;
}) {
  const [mouseHover, mouseHoverProps] = useMouseHover();

  const handlePlayAtTime = () => {
    if (content.time != null) {
      playVideoAtTime(content.time, videoRef);
      setVideoTime(content.time);
    } else {
      throw new Error('Content time is not defined');
    }
  };

  if (nextStepTime === undefined) {
    throw new Error('Next step time is not defined');
  }

  const isActive = content.time !== null && videoTime >= content.time && videoTime < nextStepTime;

  let backgroundClass = 'bg-primary-9';
  if (isActive) {
    backgroundClass = 'bg-white/10';
  } else if (videoTime === content.time) {
    backgroundClass = 'bg-primary-7';
  }

  return (
    <button
      type="button"
      aria-label={`Show step ${index + 1}`}
      onClick={handlePlayAtTime}
      className={classNames(
        'rounded-xl border border-solid text-white transition-all duration-500 ease-in-out',
        backgroundClass,
        mouseHover ? 'border-primary-6' : 'border-primary-9'
      )}
      // eslint-disable-next-line react/jsx-props-no-spreading
      {...mouseHoverProps}
    >
      <div
        className={classNames(
          'flex origin-center flex-col items-start transition-all duration-500 ease-in-out',
          mouseHover || isActive ? 'scale-90' : 'scale-100'
        )}
      >
        <div className="text-base font-normal">
          Step {index + 1} -{' '}
          <span className="text-primary-4">
            {content.time != null ? secondsToMMSS(content.time) : '--:--'}
          </span>
        </div>
        <h4 className="mb-2 text-2xl font-bold">{content.title}</h4>
        <div className={styles['small-transcript']}>
          <PortableText value={content.content ?? []} />
        </div>
      </div>
    </button>
  );
}

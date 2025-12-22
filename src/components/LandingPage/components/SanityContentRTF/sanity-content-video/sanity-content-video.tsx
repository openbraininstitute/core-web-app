/* eslint-disable react/no-array-index-key */
import React from 'react';

import ProgressiveVideo from '../../Video';
import { classNames } from '@/util/utils';
import { ContentForRichTextVideo } from '@/components/LandingPage/content';
import { styleBlockMedium } from '@/components/LandingPage/styles';

import styles from './sanity-content-video.module.css';

interface SanityContentVideoProps {
  className?: string;
  value: ContentForRichTextVideo;
}

export default function SanityContentVideo({ className, value }: SanityContentVideoProps) {
  const [stepIndex, setStepIndex] = React.useState(0);
  const timestamps = value.timestamps ?? [];
  const [currentTime, setCurrentTime] = React.useState(0);
  const jumpTo = (index: number) => {
    const step = timestamps[index];
    if (!step) return;

    setStepIndex(index);
    setCurrentTime(step.timestamp);
  };
  const handleCurrentTimeChange = (time: number) => {
    for (const [index, { timestamp }] of timestamps.entries()) {
      if (index > 0 && timestamp > time) {
        setStepIndex(index - 1);
        return;
      }
    }
  };

  return (
    <div className={classNames(className, styles.sanityContentVideo, styleBlockMedium)}>
      <ProgressiveVideo
        src={value.url}
        controls
        autosize
        currentTime={currentTime}
        onCurrentTimeChange={handleCurrentTimeChange}
      />
      {timestamps.length > 0 && (
        <>
          <nav style={{ '--custom-columns': `${timestamps.length}` }}>
            {timestamps.map(({ label }, index) =>
              index === stepIndex ? (
                <div className={styles.currentStep} key={index} />
              ) : (
                <button
                  key={index}
                  type="button"
                  className={styles.step}
                  onClick={() => jumpTo(index)}
                >
                  {index === 0 ? label : `${index}`.padStart(2, '0') + '. ' + label}
                </button>
              )
            )}
          </nav>
          {/* Removed for the time being, until they found a better way. */}
          {/* <article>
            <div>
              {`${stepIndex + 1}`.padStart(2, '0')}.<br />
              {timestamps[stepIndex].label}
            </div>
            <div>{timestamps[stepIndex].description}</div>
          </article> */}
        </>
      )}
    </div>
  );
}

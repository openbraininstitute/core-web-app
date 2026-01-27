'use client';

import { type RefObject, useEffect, useState } from 'react';
import type { StepProps } from '@/components/documentation/type';
import HeaderSliderTimestamps from './header-slider-timestamps';
import SingleStep from './single-step';

type ActiveSteps = {
  first: number;
  last: number;
};

export default function SliderTimestamps({
  content,
  videoTime,
  setVideoTime,
  videoRef,
}: {
  content: StepProps[];
  videoTime: number;
  setVideoTime: (time: number) => void;
  videoRef: RefObject<HTMLVideoElement>;
}) {
  const [activeSteps, setActiveSteps] = useState<ActiveSteps>({
    first: 0,
    last: Math.min(2, content.length - 1),
  });

  useEffect(() => {
    const getActiveStepIndex = () => {
      for (let i = 0; i < content.length; i++) {
        const step = content[i];
        const nextStepTime = i < content.length - 1 ? (content[i + 1].time ?? Infinity) : Infinity;
        if (step.time != null && videoTime >= step.time && videoTime < nextStepTime) {
          return i;
        }
      }
      return -1;
    };

    const activeIndex = getActiveStepIndex();
    if (activeIndex === -1) return;

    if (activeIndex < activeSteps.first || activeIndex > activeSteps.last) {
      let newFirst = activeIndex - 1;
      let newLast = activeIndex + 1;

      if (newFirst < 0) {
        newFirst = 0;
        newLast = Math.min(2, content.length - 1);
      } else if (newLast >= content.length) {
        newLast = content.length - 1;
        newFirst = Math.max(0, newLast - 2);
      }

      setActiveSteps({ first: newFirst, last: newLast });
    }
  }, [videoTime, content, activeSteps.first, activeSteps.last]);

  const handleNextStep = () => {
    if (activeSteps.last < content.length - 1) {
      setActiveSteps({
        first: activeSteps.first + 1,
        last: activeSteps.last + 1,
      });
    }
  };

  const handlePreviousStep = () => {
    if (activeSteps.first > 0) {
      setActiveSteps({
        first: activeSteps.first - 1,
        last: activeSteps.last - 1,
      });
    }
  };

  const translateX = `-${activeSteps.first * (100 / 3)}%`;

  return (
    <div className="relative mb-12 w-full">
      <HeaderSliderTimestamps
        content={content}
        handleNextStep={handleNextStep}
        handlePreviousStep={handlePreviousStep}
        activeSteps={activeSteps}
      />
      <div className="relative w-full overflow-x-hidden">
        <div
          className="flex transition-transform duration-500 ease-in-out"
          style={{ transform: `translateX(${translateX})` }}
        >
          {content.map((step: StepProps, index: number) => {
            const nextStepTime =
              index < content.length - 1 ? (content[index + 1].time ?? Infinity) : Infinity;
            return (
              <div key={step.title || index} className="w-1/3 min-w-[33.333%] px-2">
                <SingleStep
                  content={step}
                  videoTime={videoTime}
                  setVideoTime={setVideoTime}
                  videoRef={videoRef}
                  index={index}
                  nextStepTime={nextStepTime}
                />
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

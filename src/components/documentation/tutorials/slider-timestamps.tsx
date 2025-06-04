'use client';

import { useState } from 'react';
import { StepProps } from '../type';
import SingleStep from './single-step';

import HeaderSliderTimestamps from './header-slider-timestamps';

export type ActiveSteps = {
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
  videoRef: React.RefObject<HTMLVideoElement>;
}) {
  const [activeSteps, setActiveSteps] = useState<ActiveSteps>({ first: 0, last: 2 });

  const handleNextStep = () => {
    if (activeSteps.last < content.length) {
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
          {content.map((step: StepProps, index: number) => (
            <div key={step.title || index} className="w-1/3 min-w-[33.33%] pr-4">
              <SingleStep
                content={step}
                videoTime={videoTime}
                setVideoTime={setVideoTime}
                videoRef={videoRef}
                index={index}
              />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

import React from 'react';
import Image from 'next/image';
import { StaticImport } from 'next/dist/shared/lib/get-img-props';

import Milestone01URL from './milestone-01.jpg';
import Milestone02URL from './milestone-02.jpg';
import Milestone03URL from './milestone-03.jpg';
import Milestone04URL from './milestone-04.jpg';
import Milestone05URL from './milestone-05.jpg';
import Milestone06URL from './milestone-06.jpg';
import Milestone07URL from './milestone-07.jpg';
import Milestone08URL from './milestone-08.jpg';
import Milestone09URL from './milestone-09.jpg';
import Milestone10URL from './milestone-10.jpg';
import { IconChevronLeft } from '@/components/LandingPage/icons/IconChevronLeft';
import { IconChevronRight } from '@/components/LandingPage/icons/IconChevronRight';
import HorizontalRuler from '@/components/LandingPage/HorizontalRuler';
import { IconBoxFilled } from '@/components/LandingPage/icons/IconBoxFilled';
import { IconBoxEmpty } from '@/components/LandingPage/icons/IconBoxEmpty';
import { classNames } from '@/util/utils';

import styles from './Milestones.module.css';

export interface MilestonesProps {
  className?: string;
}

export default function Milestones({ className }: MilestonesProps) {
  const [stepIndex, setStepIndex] = React.useState(0);
  const step = STEPS[stepIndex];
  return (
    <>
      <h1>Milestones</h1>
      <div className={classNames(className, styles.milestones)}>
        <header>
          <button
            type="button"
            aria-label="Previous milestone"
            onClick={() => setStepIndex(stepIndex - 1)}
            disabled={stepIndex < 1}
          >
            <IconChevronLeft />
          </button>
          <HorizontalRuler />
          {STEPS.map((_, index) => (
            <>
              <button type="button" onClick={() => setStepIndex(index)}>
                {index === stepIndex ? <IconBoxFilled /> : <IconBoxEmpty />}
              </button>
              <HorizontalRuler />
            </>
          ))}
          <button
            type="button"
            aria-label="Next milestone"
            onClick={() => setStepIndex(stepIndex + 1)}
            disabled={stepIndex >= STEPS.length - 1}
          >
            <IconChevronRight />
          </button>
        </header>
        <div className={styles.step}>
          <Image src={step.image} alt={step.title} />
          <div>
            <div>{step.year}</div>
            <h2>{step.title}</h2>
            <div>{step.content}</div>
          </div>
        </div>
      </div>
    </>
  );
}

const STEPS: Array<{
  image: StaticImport;
  year: number;
  title: string;
  content: React.ReactNode;
}> = [
  {
    image: Milestone01URL,
    year: 2020,
    title: 'Whole brain',
    content:
      'This extremely large model combines the neocortex model with models for the various other parts of the brain. The model for the olfactory bulb and cerebellum were constructed in collaboration with experts from the community to accurately capture their specific anatomy and their physiology.',
  },
  {
    image: Milestone02URL,
    year: 2020,
    title: 'Whole brain',
    content:
      'This extremely large model combines the neocortex model with models for the various other parts of the brain. The model for the olfactory bulb and cerebellum were constructed in collaboration with experts from the community to accurately capture their specific anatomy and their physiology.',
  },
  {
    image: Milestone03URL,
    year: 2020,
    title: 'Whole brain',
    content:
      'This extremely large model combines the neocortex model with models for the various other parts of the brain. The model for the olfactory bulb and cerebellum were constructed in collaboration with experts from the community to accurately capture their specific anatomy and their physiology.',
  },
  {
    image: Milestone04URL,
    year: 2020,
    title: 'Whole brain',
    content:
      'This extremely large model combines the neocortex model with models for the various other parts of the brain. The model for the olfactory bulb and cerebellum were constructed in collaboration with experts from the community to accurately capture their specific anatomy and their physiology.',
  },
  {
    image: Milestone05URL,
    year: 2020,
    title: 'Whole brain',
    content:
      'This extremely large model combines the neocortex model with models for the various other parts of the brain. The model for the olfactory bulb and cerebellum were constructed in collaboration with experts from the community to accurately capture their specific anatomy and their physiology.',
  },
  {
    image: Milestone06URL,
    year: 2020,
    title: 'Whole brain',
    content:
      'This extremely large model combines the neocortex model with models for the various other parts of the brain. The model for the olfactory bulb and cerebellum were constructed in collaboration with experts from the community to accurately capture their specific anatomy and their physiology.',
  },
  {
    image: Milestone07URL,
    year: 2020,
    title: 'Whole brain',
    content:
      'This extremely large model combines the neocortex model with models for the various other parts of the brain. The model for the olfactory bulb and cerebellum were constructed in collaboration with experts from the community to accurately capture their specific anatomy and their physiology.',
  },
  {
    image: Milestone08URL,
    year: 2020,
    title: 'Whole brain',
    content:
      'This extremely large model combines the neocortex model with models for the various other parts of the brain. The model for the olfactory bulb and cerebellum were constructed in collaboration with experts from the community to accurately capture their specific anatomy and their physiology.',
  },
  {
    image: Milestone09URL,
    year: 2020,
    title: 'Whole brain',
    content:
      'This extremely large model combines the neocortex model with models for the various other parts of the brain. The model for the olfactory bulb and cerebellum were constructed in collaboration with experts from the community to accurately capture their specific anatomy and their physiology.',
  },
  {
    image: Milestone10URL,
    year: 2020,
    title: 'Whole brain',
    content:
      'This extremely large model combines the neocortex model with models for the various other parts of the brain. The model for the olfactory bulb and cerebellum were constructed in collaboration with experts from the community to accurately capture their specific anatomy and their physiology.',
  },
];

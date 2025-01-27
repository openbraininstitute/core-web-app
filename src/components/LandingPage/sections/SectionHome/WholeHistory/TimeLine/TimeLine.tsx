import React from 'react';

import { classNames } from '@/util/utils';

import styles from './TimeLine.module.css';

export interface TimeLineProps {
  className?: string;
}

export default function TimeLine({ className }: TimeLineProps) {
  const [currentStepIndex, setCurrentStepIndex] = React.useState(0);
  const currentStep = STEPS[currentStepIndex];

  return (
    <div className={classNames(className, styles.timeLine)}>
      <div>
        <header>
          <div>2025</div>
          {[0, 1, 2, 3, 4].map((stepIndex) => (
            <button
              type="button"
              className={currentStepIndex === stepIndex ? styles.on : styles.off}
              onClick={() => setCurrentStepIndex(stepIndex)}
              key={`step-${stepIndex}`}
              aria-label={currentStep.title}
            />
          ))}
        </header>
        <main>
          <h3>{(currentStepIndex + 1).toFixed(0).padStart(2, '0')}.</h3>
          <h2>{currentStep.title}</h2>
          <div>{currentStep.body}</div>
        </main>
      </div>
      {/* <footer>
                <div className="font-dm">
                    Tell me when the Single Cell is ready
                </div>
                <div>
                    <input placeholder="Enter your email here..."></input>
                    <button>Get update</button>
                </div>
            </footer> */}
    </div>
  );
}

const STEPS: Array<{
  year: number;
  title: string;
  body: React.ReactNode;
  image?: string;
}> = [
  {
    year: 2025,
    title: 'Single cell',
    body: 'The single cell feature on the Open Brain Platform enabled researchers to create neuron models amd run simulations to explore cellular dynamics. It streamlines workflows and enhances the study of neuronal function and mechanisms.',
  },
];

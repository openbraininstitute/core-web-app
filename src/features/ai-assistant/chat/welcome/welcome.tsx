import React from 'react';

import { AiSparkles } from '@/ui/segments/project/brains-walkthrough/agent-ready';
import { classNames } from '@/util/utils';

import styles from './welcome.module.css';

interface WelcomeProps {
  className?: string;
}

export default function Welcome({ className }: WelcomeProps) {
  return (
    <div className={classNames(styles.welcome, className)}>
      <div>
        {/* five hexagons interlocked, the middle one the assistant's (the user asked for the home's hexagons) */}
        <div className={styles.hexes} aria-hidden>
          {[
            [0, 0, 0],
            [53, 0, 1.4],
            [106, 0, 2.8],
            [26.5, 41, 4.2],
            [79.5, 41, 5.6],
          ].map(([x, y, delay], i) => (
            <span
              key={`${x}-${y}`}
              className={classNames(styles.hex, i === 1 && styles.on)}
              style={{ left: x, top: y, animationDelay: `-${delay}s` }}
            >
              {i === 1 && <AiSparkles />}
            </span>
          ))}
        </div>
        <p>Welcome to the OBI platform! </p>
        <p>
          I&apos;m here to help you search the literature, explore our database, and set up your own
          simulations.
        </p>
      </div>
    </div>
  );
}

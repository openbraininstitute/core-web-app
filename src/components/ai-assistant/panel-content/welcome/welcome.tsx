import React from 'react';

import { classNames } from '@/util/utils';

import styles from './welcome.module.css';

interface WelcomeProps {
  className?: string;
}

export default function Welcome({ className }: WelcomeProps) {
  return (
    <div className={classNames(styles.welcome, className)}>
      <div>
        <p>Welcome to the OBI platform! </p>
        <p>
          I&apos;m here to help you search the literature, explore our database, and set up your own
          simulations.
        </p>
      </div>
    </div>
  );
}

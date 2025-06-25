import React from 'react';

import { classNames } from '@/util/utils';

import styles from './welcome.module.css';

export interface WelcomeProps {
  className?: string;
}

export default function Welcome({ className }: WelcomeProps) {
  return (
    <div className={classNames(styles.welcome, className)}>
      <div>
        <p>Welcome to the OBI platform! </p>
        <p>
          I&apos;m here to help with your literature searches, and soon, I&apos;ll assist you in
          exploring our database and setting up your own simulations.
        </p>
      </div>
    </div>
  );
}

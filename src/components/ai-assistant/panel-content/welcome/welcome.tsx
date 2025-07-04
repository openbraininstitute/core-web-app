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
          I&apos;m here to help with your literature searches, exploring our database and soon
          I&apos;ll assist you in setting up your own simulations.
        </p>
      </div>
    </div>
  );
}

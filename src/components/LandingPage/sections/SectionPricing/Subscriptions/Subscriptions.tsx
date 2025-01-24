import React from 'react';

import Price from './Price';
import { classNames } from '@/util/utils';

import styles from './Subscriptions.module.css';

export interface SubscriptionsProps {
  className?: string;
}

export default function Subscriptions({ className }: SubscriptionsProps) {
  return (
    <div className={classNames(className, styles.subscriptions)}>
      <Margin />
      <Entry />
      <Beginner />
      <Intermediate />
      <Advanced />
      <Margin />
    </div>
  );
}

/**
 * This is an empty div uised as a margin for the grid.
 */
function Margin() {
  return <div />;
}

function Entry() {
  return (
    <div>
      <h2>Demo</h2>
      <em>Registration gives access to</em>
      <ul>
        <li>Explore</li>
        <li>Download</li>
        <li>Knowledge discovery</li>
      </ul>
      <div className={styles.free}>Free</div>
    </div>
  );
}

function Beginner() {
  return (
    <div>
      <h2>Cellular</h2>
      <em>Build and simulate</em>
      <ul>
        <li>Single neuron</li>
        <li>Paired neuron</li>
        <li>Synaptome</li>
      </ul>
      <Price price={39.99} discount={19.99}>
        Include 1 time option of 8 free beginner lab-simulation
      </Price>
    </div>
  );
}

function Intermediate() {
  return (
    <div className={styles.intermediate}>
      <h2>Circuit</h2>
      <em>Build and simulate</em>
      <ul>
        <li>Single neuron</li>
        <li>Paired neuron</li>
        <li>Synaptome</li>
        <li>Microcircuit</li>
        <li>Brain areas</li>
        <li>Neuro-glia-vascular models</li>
      </ul>
      <Price price={99.99} discount={49.99}>
        Include 1 time option of 8 free beginner lab-simulation and 2 free intermediate lab
        simulations
      </Price>
    </div>
  );
}

function Advanced() {
  return (
    <div>
      <h2>Systems</h2>
      <em>Build and simulate</em>
      <ul>
        <li>Single neuron</li>
        <li>Paired neuron</li>
        <li>Synaptome</li>
        <li>Microcircuit</li>
        <li>Brain areas</li>
        <li>Neuro-glia-vascular models</li>
        <li>Brain regions</li>
        <li>Brain systems</li>
        <li>Whole mouse brain</li>
      </ul>
      <Price price={999.9} discount={499.9}>
        Include 1 time option of 8 free beginner lab-simulation and 2 free intermediate lab
        simulations
      </Price>
    </div>
  );
}

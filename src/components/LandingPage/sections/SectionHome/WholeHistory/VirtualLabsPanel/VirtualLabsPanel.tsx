import React from 'react';

import Link from 'next/link';
import { classNames } from '@/util/utils';
import styles from './VirtualLabsPanel.module.css';

export default function VirtualLabsPanel() {
  return (
    <>
      <h1>Virtual labs to explore, build, and simulate the brain</h1>
      <div className={styles.triBlocks}>
        <Link className={styles.block} href="/explore">
          <div className={classNames(styles.background, styles.explore)} />
          <h3>01</h3>
          <h2>Explore</h2>
          <div>Explore resources with the Blue Brain Atlas</div>
        </Link>
        <Link className={styles.block} href="/build">
          <div className={classNames(styles.background, styles.build)} />
          <h3>02</h3>
          <h2>Build</h2>
          <div>Configure and build multiscale models</div>
        </Link>
        <Link className={styles.block} href="/simulate">
          <div className={classNames(styles.background, styles.simulate)} />
          <h3>03</h3>
          <h2>Simulate</h2>
          <div>Run simulations of your own models</div>
        </Link>
      </div>
    </>
  );
}

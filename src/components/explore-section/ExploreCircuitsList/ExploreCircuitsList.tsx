import React from 'react';

import Link from 'next/link';
import { classNames, formatDate } from '@/util/utils';
import { useCircuitsForSelectedRegion } from '@/services/circuits-per-region';

import styles from './ExploreCircuitsList.module.css';

export interface ExploreCircuitsListProps {
  className?: string;
}

export default function ExploreCircuitsList({ className }: ExploreCircuitsListProps) {
  const circuits = useCircuitsForSelectedRegion();

  return (
    <div className={classNames(className, styles.exploreCircuitsList)}>
      {circuits.length === 0 && <div className={styles.nodata}>No data</div>}
      <ul>
        {circuits.map((circuit) => (
          <li key={circuit.url}>
            <Link href={circuit.url} target="_BLANK">
              <div className={styles.item}>
                <div className={styles.name}>{circuit.name}</div>
                <div>{formatDate(circuit.registrationDate)}</div>
                <div>{circuit.description}</div>
              </div>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}

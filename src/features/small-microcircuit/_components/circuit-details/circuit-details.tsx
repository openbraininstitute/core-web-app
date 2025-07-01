import React from 'react';
import { Input } from 'antd';

import Tooltip from '../tooltip';

import { classNames } from '@/util/utils';
import { ICircuit } from '@/api/entitycore/types/entities/circuit';

import styles from './circuit-details.module.css';

export interface CircuitDetailsProps {
  className?: string;
  circuit: ICircuit;
}

export default function CircuitDetails({ className, circuit }: CircuitDetailsProps) {
  return (
    <div className={classNames(className, styles.circuitDetails)}>
      <Tooltip value={circuit.description}>
        <Input value={circuit.id} disabled />
        <Input value={circuit.name} disabled />
      </Tooltip>
    </div>
  );
}

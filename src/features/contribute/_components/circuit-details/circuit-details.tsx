import React from 'react';
import { Input } from 'antd';

import Tooltip from '../tooltip';

import { ICircuit } from '@/api/entitycore/types/entities/circuit';

interface CircuitDetailsProps {
  className?: string;
  circuit: ICircuit;
}

export default function CircuitDetails({ className, circuit }: CircuitDetailsProps) {
  return (
    <div className={className}>
      <Tooltip value={circuit.description}>
        <Input value={circuit.id} disabled />
        <Input value={circuit.name} disabled />
      </Tooltip>
    </div>
  );
}

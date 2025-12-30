import React from 'react';
import { Input } from 'antd';

import Tooltip from '../tooltip';

import { ICircuit } from '@/api/entitycore/types/entities/circuit';
import { IMEModel } from '@/api/entitycore/types';

interface ModelDetailsProps {
  className?: string;
  model: ICircuit | IMEModel;
}

export default function ModelDetails({ className, model }: ModelDetailsProps) {
  return (
    <div className={className}>
      <Tooltip value={model.description}>
        <Input value={model.id} disabled />
        <Input value={model.name} disabled />
      </Tooltip>
    </div>
  );
}

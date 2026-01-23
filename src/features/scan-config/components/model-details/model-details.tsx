import { Input } from 'antd';
import type { IMEModel } from '@/api/entitycore/types';

import type { ICircuit } from '@/api/entitycore/types/entities/circuit';
import Tooltip from '../tooltip';

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

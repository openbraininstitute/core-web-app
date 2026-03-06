import { Input } from 'antd';

import { ScanConfigUIElementDict } from '@/features/scan-config/types';

import type { IMEModel } from '@/api/entitycore/types';
import type { ICircuit } from '@/api/entitycore/types/entities/circuit';

interface ModelDetailsProps {
  className?: string;
  model: ICircuit | IMEModel;
}

export default function ModelDetails({ className, model }: ModelDetailsProps) {
  return (
    <div
      className={className}
      data-scan-config-block-element={ScanConfigUIElementDict.ModelIdentifier}
    >
      <Input value={model.id} disabled />
      <Input value={model.name} disabled />
    </div>
  );
}

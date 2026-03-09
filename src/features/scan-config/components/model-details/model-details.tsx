import { Input } from 'antd';

import { ScanConfigUIElementDict } from '@/features/scan-config/types';

import type { IMEModel } from '@/api/entitycore/types';
import type { ICircuit } from '@/api/entitycore/types/entities/circuit';

interface ModelDetailsProps {
  className?: string;
  entity: ICircuit | IMEModel;
}

export default function ModelDetails({ className, entity }: ModelDetailsProps) {
  return (
    <div
      className={className}
      data-scan-config-block-element={ScanConfigUIElementDict.ModelIdentifier}
    >
      <Input value={entity.id} disabled />
      <Input value={entity.name} disabled />
    </div>
  );
}

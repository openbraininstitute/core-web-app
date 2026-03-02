import { Input } from 'antd';

import {
  ScanConfigUIElementDict,
  type TSupportedScanConfigurationForEntityType,
} from '@/features/scan-config/types';

interface ModelDetailsProps {
  className?: string;
  entity: TSupportedScanConfigurationForEntityType;
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

import { Input } from 'antd';

import {
  ScanConfigUIElementDict,
  type TSupportedEntitiesForScanConfiguration,
} from '@/features/scan-config/types';
import { cn } from '@/utils/css-class';

interface ModelIdentifierProps {
  className?: string;
  entity: TSupportedEntitiesForScanConfiguration;
}

export default function ModelIdentifier({ className, entity }: ModelIdentifierProps) {
  return (
    <div
      className={cn('flex flex-col gap-1', className)}
      data-scan-config-block-element={ScanConfigUIElementDict.ModelIdentifier}
    >
      <Input value={entity.id} disabled />
      <Input value={entity.name} disabled />
    </div>
  );
}

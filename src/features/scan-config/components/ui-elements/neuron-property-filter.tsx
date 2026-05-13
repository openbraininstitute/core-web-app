import { Select } from 'antd';
import { get } from 'es-toolkit/compat';

import { ScanConfigUIElementDict } from '@/features/scan-config/types';

import type { TSchemaMappingConfiguration } from '@/features/scan-config/components/hooks/schema';

export default function NeuronPropertyFilter({
  properties,
}: {
  properties: Record<string, string[]>;
}) {
  console.log(properties);

  return 'property filter';
}

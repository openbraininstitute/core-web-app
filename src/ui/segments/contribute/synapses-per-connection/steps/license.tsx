'use client';

import { LicenseSelector } from '@/ui/segments/contribute/shared/components/license-selector';
import { ExperimentalSynapsesPerConnectionSchema } from '@/ui/segments/contribute/synapses-per-connection/schema';

export function License() {
  return <LicenseSelector schema={ExperimentalSynapsesPerConnectionSchema} />;
}

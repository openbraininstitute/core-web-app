'use client';

import { ExperimentalSynapsesPerConnectionSchema } from '@/ui/segments/contribute/synapses-per-connection/schema';
import { LicenseSelector } from '@/ui/segments/contribute/shared/components/license-selector';

export function License() {
  return <LicenseSelector schema={ExperimentalSynapsesPerConnectionSchema} />;
}

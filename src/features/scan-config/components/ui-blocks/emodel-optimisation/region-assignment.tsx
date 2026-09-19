'use client';

import type { ConfigValue } from '@/features/scan-config/types';

type Props = {
  /** value of the `emodel_optimisation_parameters` config key */
  value: ConfigValue;
  /** writes the next value back to the `emodel_optimisation_parameters` config key */
  onChange: (next: ConfigValue) => void;
};

/** "Region Assignment" tab of the E-Model optimisation parameters. Empty for now. */
export function RegionAssignment(_props: Props) {
  return <div className="flex h-full w-full flex-col gap-2 p-4" />;
}

import { ELECTRODE_LOCATIONS_CONFIG_KEY } from '@/features/scan-config/components/model-preview/electrode-locations-overlay';
import { MORPHOLOGY_LOCATIONS_CONFIG_KEY } from '@/features/scan-config/components/model-preview/morphology-locations-block';
import { selectReferencedArrayRefs } from '@/features/scan-config/components/model-preview/referenced-arrays';
import { useConfigValue } from '@/features/scan-config/use-config-store';

import type { Config } from '@/features/scan-config/types';

const VIEWER_SECTIONS: readonly string[] = [
  MORPHOLOGY_LOCATIONS_CONFIG_KEY,
  ELECTRODE_LOCATIONS_CONFIG_KEY,
];

/**
 * The part of the config the 3D viewer reads: its own sections, and any section with a block that
 * references a stored recording array. A section the viewer starts to read must be added here.
 */
export function viewerConfigOf(config: Config): Config {
  const sections = new Set(VIEWER_SECTIONS);
  for (const ref of selectReferencedArrayRefs(config)) sections.add(ref.root);

  return Object.fromEntries(Object.entries(config).filter(([section]) => sections.has(section)));
}

function sameSections(previous: Config, next: Config): boolean {
  const sections = Object.keys(next);
  return (
    sections.length === Object.keys(previous).length &&
    sections.every((section) => previous[section] === next[section])
  );
}

/** `viewerConfigOf` the live config; the same object while those sections are unchanged. */
export function useViewerConfig(): Config {
  return useConfigValue(viewerConfigOf, sameSections);
}

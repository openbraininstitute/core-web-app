import { SPECIES_ICON_PATHS } from '@/features/brain-region-hierarchy/components/species-icon-paths';
import { SPECIES_TAXONOMY_IDS } from '@/features/brain-region-hierarchy/types';
import { cn } from '@/utils/css-class';

/** A species' brain in the current text colour; nothing for a species without one. */
export function SpeciesIcon({
  taxonomyId,
  className,
}: {
  taxonomyId?: string;
  className?: string;
}) {
  const d = taxonomyId ? SPECIES_ICON_PATHS[taxonomyId] : undefined;
  if (!d) return null;
  return (
    <svg
      viewBox="0 0 24 24"
      fill="currentColor"
      aria-hidden="true"
      data-testid={`species-icon-${taxonomyId}`}
      className={cn('size-5 shrink-0', className)}
    >
      <path fillRule="evenodd" d={d} />
    </svg>
  );
}

/** Four of the species' brains, one per corner, for "All species". */
const ALL_SPECIES_ICON = [
  { taxonomyId: SPECIES_TAXONOMY_IDS.MUS_MUSCULUS, x: 0, y: 0 },
  { taxonomyId: SPECIES_TAXONOMY_IDS.LOLIGO_PEALEII, x: 12, y: 0 },
  { taxonomyId: SPECIES_TAXONOMY_IDS.FELIS_CATUS, x: 0, y: 12 },
  { taxonomyId: SPECIES_TAXONOMY_IDS.CRICETULUS_GRISEUS, x: 12, y: 12 },
];

export function AllSpeciesIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="currentColor"
      aria-hidden="true"
      data-testid="species-icon-all"
      className={cn('size-5 shrink-0', className)}
    >
      {ALL_SPECIES_ICON.map(({ taxonomyId, x, y }) => (
        <path
          key={taxonomyId}
          fillRule="evenodd"
          transform={`translate(${x} ${y}) scale(0.5)`}
          d={SPECIES_ICON_PATHS[taxonomyId]}
        />
      ))}
    </svg>
  );
}

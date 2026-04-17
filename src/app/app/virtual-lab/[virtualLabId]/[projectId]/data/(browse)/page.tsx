import { DisallowAllSpecies } from '@/features/brain-region-hierarchy/components/disallow-all-species';
import { CellCompositionExplorer } from '@/features/cell-composition/elements/cell-composition-explorer';
import { Atlas } from '@/ui/segments/explore/atlas';

export default async function Page() {
  return (
    <Atlas>
      <DisallowAllSpecies />
      <CellCompositionExplorer />
    </Atlas>
  );
}

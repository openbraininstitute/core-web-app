import { CellCompositionExplorer } from '@/features/cell-composition/elements/cell-composition-explorer';
import { Atlas } from '@/ui/segments/explore/atlas';

export default async function Page() {
  return (
    <Atlas>
      <CellCompositionExplorer />
    </Atlas>
  );
}

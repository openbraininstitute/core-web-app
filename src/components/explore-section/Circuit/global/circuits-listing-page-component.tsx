'use client';

import ExploreCircuitTable, {
  useFilteredCircuits,
} from '@/components/explore-section/Circuit/ListView/ExploreCircuitTable';

export type ColumnType = {
  name: string;
  description: string;
  brainRegion: string;
  createdBy: string;
  creationDate: string;
  hasSubcircuits: boolean;
};

export default function CircuitsListingPageComponent() {
  const { filteredCircuits, loading, error } = useFilteredCircuits();

  if (loading) {
    return (
      <div className="text-primary-9 relative flex h-[50vh] w-full items-center justify-center text-lg font-normal">
        Loading...
      </div>
    );
  }

  if (error) {
    return (
      <div className="relative flex h-[50vh] w-full items-center justify-center text-lg font-normal text-red-600">
        An error occurred: {error}
      </div>
    );
  }

  return <ExploreCircuitTable data={filteredCircuits.filteredTree} />;
}

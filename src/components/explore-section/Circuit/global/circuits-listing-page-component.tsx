'use client';

import { useParams } from 'next/navigation';

import ExploreCircuitTable, {
  useFilteredCircuits,
} from '@/components/explore-section/Circuit/ListView/ExploreCircuitTable';
import { resolveDataKey } from '@/utils/key-builder';

import type { WorkspaceContext } from '@/types/common';

export type ColumnType = {
  name: string;
  description: string;
  brainRegion: string;
  createdBy: string;
  creationDate: string;
  hasSubcircuits: boolean;
};

export default function CircuitsListingPageComponent() {
  const { projectId } = useParams<WorkspaceContext>();
  const dataKey = resolveDataKey({ projectId, section: 'explore' });
  const { filteredCircuits, loading, error } = useFilteredCircuits({ dataKey });

  if (loading) {
    return (
      <div className="relative flex h-[50vh] w-full items-center justify-center text-lg font-normal text-primary-9">
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

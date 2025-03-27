import ExploreCircuitTable from '@/components/explore-section/Circuit/ListView/ExploreCircuitTable';

export type ColumnType = {
  name: string;
  description: string;
  brainRegion: string;
  createdBy: string;
  creationDate: string;
  hasSubcircuits: boolean;
};

export default function ExploreModelCircuitListingPage() {
  return <ExploreCircuitTable />;
}

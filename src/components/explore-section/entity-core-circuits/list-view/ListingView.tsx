import { WorkspaceContext } from '@/types/common';

export default function ListingView({ virtualLabId, projectId }: WorkspaceContext) {
  return (
    <div className="relative w-full">
      <div>{virtualLabId}</div>
      <div>{projectId}</div>
    </div>
  );
}

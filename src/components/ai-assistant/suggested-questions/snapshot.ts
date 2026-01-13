import { usePathname, useSearchParams } from "next/navigation";
import { useAiContext } from "@/components/ai-assistant/hooks";
import { useWorkspace } from "@/ui/hooks/use-workspace";
import {
  MOUSE_PRIMARY__DIVISION_ANNOTATION_VALUE,
  usePrimaryHierarchySpeciesQuery,
} from "@/features/brain-region-hierarchy/context";
import { useWorkspaceHierarchyTracker } from "@/features/brain-region-hierarchy/hooks";
import { useCurrentExplorerArtifactValue } from "@/state/explore-section/artifact";

export interface Snapshot {
  isRootRegion: boolean;
  regionId: string;
  regionTitle: string;
  artifact: string;
  frontendUrl: string;
}

export function useSnapshot(): Snapshot {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { selectedBrainRegion } = useWorkspaceHierarchyTracker();
  const isRootRegion =
    `${selectedBrainRegion?.annotation_value}` ===
    MOUSE_PRIMARY__DIVISION_ANNOTATION_VALUE;

  const { result } = usePrimaryHierarchySpeciesQuery();

  const regionId = selectedBrainRegion?.id ?? "";
  const node = (result?.options ?? []).find(
    (o) => o.data.id === selectedBrainRegion?.id,
  );
  const regionTitle = node?.label ?? "";
  const artifact = useCurrentExplorerArtifactValue();
  const search = searchParams.toString();
  const frontendUrl = search ? `${pathname}?${search}` : pathname;

  return {
    isRootRegion,
    regionId,
    regionTitle,
    artifact,
    frontendUrl,
  };
}

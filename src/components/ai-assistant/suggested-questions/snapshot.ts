import { usePathname, useSearchParams } from "next/navigation";

import { useAiContext } from "@/components/ai-assistant/hooks";

import {
  MOUSE_PRIMARY__DIVISION_ANNOTATION_VALUE,
  usePrimaryHierarchyQuery,
} from "@/features/brain-region-hierarchy/context";

import { useCurrentExplorerArtifactValue } from "@/state/explore-section/artifact";
import { useWorkspace } from "@/ui/hooks/use-workspace";
import { resolveDataKey } from "@/utils/key-builder";
import { useWorkspaceSpeciesBrainRegion } from "@/features/brain-region-hierarchy/hooks";

export interface Snapshot {
  isRootRegion: boolean;
  regionId: string;
  regionTitle: string;
  artifact: string;
  frontendUrl: string;
}

export function useSnapshot(): Snapshot {
  const { projectId } = useWorkspace();
  const { section } = useAiContext();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const dataKey = resolveDataKey({ projectId, section });
  const { selectedBrainRegion } = useWorkspaceSpeciesBrainRegion({ dataKey });
  const isRootRegion =
    `${selectedBrainRegion?.annotation_value}` ===
    MOUSE_PRIMARY__DIVISION_ANNOTATION_VALUE;

  const { result } = usePrimaryHierarchyQuery();

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

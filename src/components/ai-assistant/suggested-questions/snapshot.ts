import { useParams, usePathname, useSearchParams } from "next/navigation";

import { useAiContext } from "@/components/ai-assistant/hooks";

import {
  MOUSE_PRIMARY_ANATOMICAL_DIVISIONS_ANNOTATION_VALUE,
  useBrainRegionHierarchy,
  usePrimaryHierarchyQuery,
} from "@/features/brain-region-hierarchy/context";

import { useCurrentExplorerArtifactValue } from "@/state/explore-section/artifact";
import { resolveDataKey } from "@/utils/key-builder";

export interface Snapshot {
  isRootRegion: boolean;
  regionId: string;
  regionTitle: string;
  artifact: string;
  frontendUrl: string;
}

export function useSnapshot(): Snapshot {
  const params = useParams<{ projectId: string }>();
  const { projectId } = params;
  const { section } = useAiContext();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const dataKey = resolveDataKey({ projectId, section });
  const { node: selectedBrainRegion } = useBrainRegionHierarchy({ dataKey });
  const isRootRegion =
    `${selectedBrainRegion.annotation_value}` ===
    MOUSE_PRIMARY_ANATOMICAL_DIVISIONS_ANNOTATION_VALUE;

  const { result } = usePrimaryHierarchyQuery();

  /* const result = useAtomValue(
    React.useMemo(() => unwrap(PrimaryAnatomicalDivisionsHierarchyAtom), [])
  ); */
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

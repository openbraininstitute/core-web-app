"use client";

import { useAtomValue, useSetAtom } from "jotai";
import type { ReactNode } from "react";
import type { IBrainRegionHierarchy } from "@/api/entitycore/types/entities/brain-region";
import { userJourneyTracker } from "@/components/explore-section/Literature/user-journey";
import { Tree } from "@/components/tree";
import { scrollToNode } from "@/components/tree/elements/helpers";
import { TreeSearch } from "@/components/tree/elements/search";
import type { RenderNodeProps, TTreeNode } from "@/components/tree/types";
import { DEFAULT_PAGE_NUMBER } from "@/constants";
import {
  brainRegionSidebarAtom,
  MOUSE_DEFAULT_SELECTED_BRAIN_REGION_ANNOTATION_VALUE,
  usePrimaryExtendedHierarchyQuery,
} from "@/features/brain-region-hierarchy/context";
import { makeBrainRegionClickEvent } from "@/features/brain-region-hierarchy/event";
import { useWorkspaceAtlasHierarchy } from "@/features/brain-region-hierarchy/hooks";
import { BrainRegionHierarchyNodeRender } from "@/features/brain-region-hierarchy/node-render";
import { corePageNumberAtom } from "@/ui/segments/data-table/elements/context";
import { classNames } from "@/util/utils";
import { HydrateWrapper } from "@/wrappers/hydrate-wrapper";

export function BrainRegionHierarchy({
  dataKey,
  onClickCallback,
}: {
  dataKey: string;
  onClickCallback?: (node: TTreeNode) => void;
}) {
  const isCollapsed = useAtomValue(brainRegionSidebarAtom);
  const { result: brainRegionHierarchyResult } =
    usePrimaryExtendedHierarchyQuery();
  const { changeBrainRegion, selectedBrainRegion } = useWorkspaceAtlasHierarchy(
    {
      dataKey,
    },
  );
  const setPageNumber = useSetAtom(corePageNumberAtom(dataKey));

  if (!brainRegionHierarchyResult) {
    return (
      <div className="p-4 text-center text-yellow-600">
        <p className="text-lg font-semibold">
          Brain region data processed, but the target node was not found or
          result is null.
        </p>
      </div>
    );
  }

  const defaultBrainRegion = brainRegionHierarchyResult.options.find(
    (o) =>
      o.data.annotation_value ===
      MOUSE_DEFAULT_SELECTED_BRAIN_REGION_ANNOTATION_VALUE,
  )?.value;

  const onClick = (clickedNode: TTreeNode) => {
    changeBrainRegion(clickedNode as IBrainRegionHierarchy);
    scrollToNode(clickedNode as IBrainRegionHierarchy, "center");
    setPageNumber(DEFAULT_PAGE_NUMBER);
    makeBrainRegionClickEvent({
      dataKey,
      node: clickedNode as IBrainRegionHierarchy,
    });
    onClickCallback?.(clickedNode);
    userJourneyTracker.registerBrainRegionClick(clickedNode.name);
  };

  return (
    <div
      className={classNames(
        "group flex h-full min-h-0 flex-col rounded-xl transition-all duration-300 ease-in-out",
        isCollapsed ? "collapsed w-full" : "w-full",
      )}
    >
      <div className="flex h-full min-h-0 w-full flex-col gap-4 overflow-hidden p-4 pt-0">
        <div className="flex h-full min-h-0 flex-col items-center justify-start">
          <div
            className={classNames(
              "flex min-h-0 w-full flex-col gap-4 overflow-hidden transition-all duration-300 ease-in-out",
              isCollapsed
                ? "invisible max-h-0 opacity-0"
                : "visible h-full opacity-100",
            )}
          >
            <HydrateWrapper>
              <TreeSearch
                options={brainRegionHierarchyResult.options}
                onSelect={onClick}
              />
            </HydrateWrapper>
            {brainRegionHierarchyResult.nodes && (
              <HydrateWrapper>
                <Tree
                  dataKey={dataKey}
                  data={brainRegionHierarchyResult.nodes}
                  height="100%"
                  defaultExpandedNodes={
                    defaultBrainRegion ? [defaultBrainRegion] : []
                  }
                  indentation={{
                    v: true,
                    h: false,
                  }}
                  selectedNode={
                    (selectedBrainRegion as unknown as TTreeNode) ?? null
                  }
                  onClick={onClick}
                  renderNode={
                    BrainRegionHierarchyNodeRender as (
                      props: RenderNodeProps<TTreeNode>,
                    ) => ReactNode
                  }
                />
              </HydrateWrapper>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default BrainRegionHierarchy;

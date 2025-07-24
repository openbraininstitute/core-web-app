'use client';

import { useAtomValue, useSetAtom } from 'jotai';
import omit from 'lodash/omit';

import TreeSideMenu from '@/features/brain-region-hierarchy/side-menu';
import TreeSearch from '@/components/tree/elements/search';
import Tree from '@/components/tree';

import { userJourneyTracker } from '@/components/explore-section/Literature/user-journey';
import { makeBrainRegionClickEvent } from '@/features/brain-region-hierarchy/event';
import { pageNumberAtom } from '@/state/explore-section/list-view-atoms';
import { PAGE_NUMBER } from '@/constants/explore-section/list-views';
import { scrollToNode } from '@/components/tree/elements/helpers';
import {
  DEFAULT_SELECTED_BRAIN_REGION_ANNOTATION_VALUE,
  brainRegionBasicCellGroupsRegionsHierarchyAtom,
  brainRegionSidebarAtom,
  useBrainRegionHierarchy,
  useSetSelectedBrainRegion,
} from '@/features/brain-region-hierarchy/context';
import { classNames } from '@/util/utils';

import type {
  BrainRegionHierarchyBase,
  IBrainRegionHierarchy,
} from '@/api/entitycore/types/entities/brain-region';
import type { TTreeNode } from '@/components/tree/types';

export default function BrainRegionHierarchy({ dataKey }: { dataKey: string }) {
  const isCollapsed = useAtomValue(brainRegionSidebarAtom);
  const brainRegionHierarchyResult = useAtomValue(brainRegionBasicCellGroupsRegionsHierarchyAtom);
  const { updateSelectedBrainRegion } = useSetSelectedBrainRegion();
  const { node, updateHierarchyConfig } = useBrainRegionHierarchy({
    dataKey,
  });
  const setPageNumber = useSetAtom(pageNumberAtom(dataKey));

  if (!brainRegionHierarchyResult) {
    return (
      <div className="p-4 text-center text-yellow-600">
        <p className="text-lg font-semibold">
          Brain region data processed, but the target node was not found or result is null.
        </p>
      </div>
    );
  }

  const defaultBrainRegion = brainRegionHierarchyResult.options.find(
    (o) => o.data.annotation_value === DEFAULT_SELECTED_BRAIN_REGION_ANNOTATION_VALUE
  )?.value;

  const onClick = (clickedNode: TTreeNode) => {
    updateHierarchyConfig(clickedNode as IBrainRegionHierarchy);
    scrollToNode(clickedNode as IBrainRegionHierarchy, 'center');
    setPageNumber(PAGE_NUMBER);
    makeBrainRegionClickEvent({ dataKey, node: clickedNode as IBrainRegionHierarchy });
    updateSelectedBrainRegion(omit(clickedNode, 'children') as BrainRegionHierarchyBase);
    userJourneyTracker.registerBrainRegionClick(clickedNode.name);
  };

  return (
    <div
      className={classNames(
        'bg-primary-8 group flex h-screen flex-col transition-all duration-300 ease-in-out',
        isCollapsed ? 'collapsed w-[40px]' : 'w-[340px]'
      )}
    >
      <div className="flex w-full flex-col gap-4 overflow-hidden p-4 pt-3">
        <div className="flex flex-col items-center justify-center">
          <TreeSideMenu dataKey={dataKey} />
          <div
            className={classNames(
              'flex w-full flex-col gap-4 overflow-hidden transition-all duration-300 ease-in-out',
              isCollapsed ? 'invisible max-h-0 opacity-0' : 'visible max-h-[100vh] opacity-100'
            )}
          >
            <TreeSearch options={brainRegionHierarchyResult.options} onSelect={onClick} />
            {brainRegionHierarchyResult.nodes && (
              <Tree
                dataKey={dataKey}
                data={brainRegionHierarchyResult.nodes}
                height="calc(100vh - 146px)" // 130px for header and search
                defaultExpandedNodes={defaultBrainRegion ? [defaultBrainRegion] : []}
                indentation={{
                  v: true,
                  h: false,
                }}
                selectedNode={node as unknown as TTreeNode}
                onClick={onClick}
              />
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

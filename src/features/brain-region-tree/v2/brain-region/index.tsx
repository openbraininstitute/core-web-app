'use client';

import { useAtomValue } from 'jotai';

import TreeSideMenu from '@/features/brain-region-tree/v2/brain-region/side-menu';
import TreeSearch from '@/components/tree/elements/search';
import Tree from '@/components/tree';

import { scrollToNode } from '@/components/tree/elements/helpers';
import {
  DEFAULT_SELECTED_BRAIN_REGION_ANNOTATION_VALUE,
  brainRegionHierarchyAtom,
  brainRegionSidebarAtom,
  useBrainRegionHierarchy,
} from '@/features/brain-region-tree/v2/brain-region/context';
import { getSectionFromDataKey } from '@/utils/key-builder';
import { classNames } from '@/util/utils';

import type { IBrainRegionHierarchy } from '@/api/entitycore/types/entities/brain-region';

export default function BrainRegionHierarchy({ dataKey }: { dataKey: string }) {
  const isCollapsed = useAtomValue(brainRegionSidebarAtom);
  const brainRegionHierarchyResult = useAtomValue(brainRegionHierarchyAtom);
  const { node, updateHierarchyConfig } = useBrainRegionHierarchy({
    dataKey: getSectionFromDataKey(dataKey),
  });

  if (!brainRegionHierarchyResult) {
    return (
      <div className="p-4 text-center text-yellow-600">
        <p className="text-lg font-semibold">
          Brain region data processed, but the target node was not found or resulted in null.
        </p>
      </div>
    );
  }

  const defaultBrainRegion = brainRegionHierarchyResult.options.find(
    (o) => o.data.annotation_value === DEFAULT_SELECTED_BRAIN_REGION_ANNOTATION_VALUE
  )?.value;

  return (
    <div
      className={classNames(
        'bg-primary-8 group flex h-screen flex-col transition-all duration-300 ease-in-out',
        isCollapsed ? 'collapsed w-[40px]' : 'w-[340px]'
      )}
    >
      <div className="flex w-full flex-col gap-4 overflow-hidden p-4">
        <div className="flex flex-col items-center justify-center">
          <TreeSideMenu dataKey={dataKey} />
          <div
            className={classNames(
              'flex w-full flex-col gap-4 overflow-hidden transition-all duration-300 ease-in-out',
              isCollapsed ? 'invisible max-h-0 opacity-0' : 'visible max-h-[100vh] opacity-100'
            )}
          >
            <TreeSearch
              options={brainRegionHierarchyResult.options}
              onSelect={(node) => {
                updateHierarchyConfig(node as unknown as IBrainRegionHierarchy);
              }}
            />
            {brainRegionHierarchyResult.nodes && (
              <Tree
                dataKey={dataKey}
                data={brainRegionHierarchyResult.nodes}
                height="calc(100vh - 130px)"
                defaultExpandedNodes={defaultBrainRegion ? [defaultBrainRegion] : []}
                indentation={{
                  v: true,
                  h: false,
                }}
                selectedNode={node as unknown as IBrainRegionHierarchy}
                onClick={(node) => {
                  updateHierarchyConfig(node as unknown as IBrainRegionHierarchy);
                  scrollToNode(node as unknown as IBrainRegionHierarchy, 'center');
                }}
              />
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

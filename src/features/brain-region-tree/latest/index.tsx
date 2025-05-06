'use client';

import { useMemo } from 'react';
import { useAtomValue } from 'jotai';
import { unwrap } from 'jotai/utils';
import Tree from './com';
import BrainRegionSearch, { brainRegionsAtom } from './elements/search';
import { brainRegionSidebarIsCollapsedAtom } from '@/state/brain-regions';
import { classNames } from '@/util/utils';
import TreeSideMenu from './elements/side-menu';

export default function BrainRegionTree() {
  const brainRegions = useAtomValue(useMemo(() => unwrap(brainRegionsAtom), []));

  console.log("ᦨ #  index.tsx:15 #  BrainRegionTree #  brainRegions:", brainRegions);

  const isCollapsed = useAtomValue(brainRegionSidebarIsCollapsedAtom);

  return (
    <div
      className={classNames(
        'bg-primary-8 group flex h-screen flex-col transition-all duration-300 ease-in-out',
        isCollapsed ? 'collapsed w-[40px]' : 'w-[340px]'
      )}
    >
      <div className="flex w-full flex-col gap-4 overflow-hidden p-4">
        <div className="flex flex-col items-center justify-center">
          <TreeSideMenu dataKey="explore" />
          <div
            className={classNames(
              'flex w-full flex-col gap-4 overflow-hidden transition-all duration-300 ease-in-out',
              isCollapsed ? 'invisible max-h-0 opacity-0' : 'visible max-h-[100vh] opacity-100'
            )}
          >
            <BrainRegionSearch dataKey="explore" />
            {brainRegions && (
              <Tree
                dataKey="explore"
                data={brainRegions}
                height="calc(100vh - 130px)"
                defaultExpandedNodes={[567]}
                indentation={{
                  v: true,
                  h: false,
                }}
              />
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

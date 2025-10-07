import { MinusOutlined, PlusOutlined } from '@ant-design/icons';
import { useAtom, useAtomValue } from 'jotai';
import { unwrap } from 'jotai/utils';
import { Button } from 'antd';
import { useMemo } from 'react';
import find from 'es-toolkit/compat/find';

import {
  brainRegionBasicCellGroupsRegionsHierarchyAtom,
  brainRegionSidebarAtom,
  useBrainRegionHierarchy,
} from '@/features/brain-region-hierarchy/context';
import { BrainIcon } from '@/components/icons';
import { classNames } from '@/util/utils';

type Props = {
  dataKey: string;
};

export default function TreeSideMenu({ dataKey }: Props) {
  const [isCollapsed, setIsCollapsed] = useAtom(brainRegionSidebarAtom);
  const onToggleCollapse = () => setIsCollapsed((prev) => !prev);
  const { node } = useBrainRegionHierarchy({ dataKey });
  const result = useAtomValue(
    useMemo(() => unwrap(brainRegionBasicCellGroupsRegionsHierarchyAtom), [])
  );
  const nodeLabel = find(result?.options, (o) => o.data.id === node.id)?.label;

  return (
    <>
      <div className={isCollapsed ? 'mb-2' : 'mb-8 flex w-full items-center justify-between'}>
        <div
          className={classNames(
            'items-center justify-start space-x-2 text-2xl font-bold text-white transition-opacity duration-300',
            isCollapsed ? 'absolute hidden opacity-0' : 'flex opacity-100'
          )}
        >
          <BrainIcon style={{ height: '1em' }} />
          <span className="text-neutral-3">Brain region</span>
        </div>
        <Button
          type="text"
          size="small"
          icon={
            isCollapsed ? (
              <PlusOutlined style={{ color: 'white' }} />
            ) : (
              <MinusOutlined style={{ color: 'white' }} />
            )
          }
          onClick={onToggleCollapse}
          className="hover:bg-primary-1/20 z-10 transition-transform duration-200 ease-in-out"
          style={{
            transform: isCollapsed ? 'translateX(0)' : 'translateX(-6px)',
          }}
        />
      </div>
      <div
        className={classNames(
          'flex flex-col transition-all duration-300 ease-in-out',
          isCollapsed ? 'max-h-[90vh] opacity-100' : 'pointer-events-none max-h-0 opacity-0'
        )}
      >
        <div
          className={classNames(
            'flex max-h-[90vh] items-center gap-x-3.5 text-white opacity-0',
            'transition-opacity duration-300 ease-in-out group-[.collapsed]:opacity-100'
          )}
          style={{
            writingMode: 'vertical-rl',
            transform: 'rotate(180deg)',
            cursor: 'e-resize',
          }}
          role="presentation"
          onClick={() => setIsCollapsed(false)}
        >
          <div className="text-secondary-4 text-sm whitespace-nowrap">{nodeLabel}</div>
          <div className="text-lg font-bold whitespace-nowrap">Brain region</div>
        </div>
      </div>
    </>
  );
}

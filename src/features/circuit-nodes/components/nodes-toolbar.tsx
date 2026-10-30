import { RiArrowDownSLine } from '@remixicon/react';

import { PopulationSelect } from '@/features/circuit-nodes/components/population-select';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/ui/molecules/select';
import { cn } from '@/utils/css-class';

import type { ViewMode } from '@/features/circuit-nodes/types';

import styles from '@/features/circuit-nodes/circuit-nodes-table.module.css';

const triggerCls = cn(
  'h-auto rounded-full border-0 bg-white px-5 py-1',
  'text-primary-9 text-sm font-bold',
  'shadow-[6px_6px_14px_0_#0000000f,-8px_-8px_20px_0_#ffffffd1]',
  'focus-visible:ring-0 focus-visible:border-0'
);

const contentCls = 'bg-white border-gray-200';

const itemCls = 'text-primary-9 text-sm data-[state=checked]:font-bold';

type Props = {
  view: ViewMode;
  onViewChange: (view: ViewMode) => void;
  /** Whether the circuit has a connectivity matrix to show. */
  connectivity?: boolean;
  /** The node populations, or the matrices' edge populations while connectivity is on show. */
  populations: readonly { name: string; type?: string }[];
  populationName: string | undefined;
  onPopulationChange: (name: string) => void;
  /** Its right end, for what a table beside it puts there: its count and its buttons. */
  slotRef?: (element: HTMLDivElement | null) => void;
};

export function NodesToolbar({
  view,
  onViewChange,
  connectivity = false,
  populations,
  populationName,
  onPopulationChange,
  slotRef,
}: Props) {
  return (
    <div className={styles.toolbar}>
      <div className={styles.toolbarGroup}>
        <Select value={view} onValueChange={(v) => onViewChange(v as ViewMode)}>
          <SelectTrigger
            className={cn(triggerCls, styles.viewSelect, 'px-3')}
            icon={<RiArrowDownSLine className="text-primary-9 size-4 opacity-100" />}
          >
            <SelectValue />
          </SelectTrigger>
          <SelectContent className={contentCls}>
            <SelectItem value="nodes" className={itemCls}>
              Nodes
            </SelectItem>
            <SelectItem value="connectivity" disabled={!connectivity} className={itemCls}>
              {connectivity ? 'Connectivity' : 'Connectivity (no matrix)'}
            </SelectItem>
            <SelectItem value="edges" disabled className={itemCls}>
              Edges (coming soon)
            </SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className={cn(styles.toolbarGroup, styles.toolbarGroupGrow)}>
        <span className={styles.toolbarLabel}>Population</span>
        <PopulationSelect
          populations={populations}
          value={populationName}
          onChange={onPopulationChange}
        />
      </div>
      {slotRef && <div ref={slotRef} className={styles.toolbarSlot} />}
    </div>
  );
}

import { RiArrowDownSLine } from '@remixicon/react';
import { Tooltip } from 'antd';

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/ui/molecules/select';
import { cn } from '@/utils/css-class';

import ModeIcon from './mode-icon';

import type { DisplayMode, NodePopulation, ViewMode } from '@/features/circuit-nodes/types';

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
  populations: NodePopulation[];
  populationName: string | undefined;
  onPopulationChange: (name: string) => void;
  mode: DisplayMode;
  onModeChange: (mode: DisplayMode) => void;
};

export function NodesToolbar({
  view,
  onViewChange,
  populations,
  populationName,
  onPopulationChange,
  mode,
  onModeChange,
}: Props) {
  return (
    <div className={styles.toolbar}>
      <div className={styles.toolbarGroup}>
        <span className={styles.toolbarLabel}>View</span>
        <Select value={view} onValueChange={(v) => onViewChange(v as ViewMode)}>
          <SelectTrigger
            className={cn(triggerCls, styles.viewSelect)}
            icon={<RiArrowDownSLine className="text-primary-9 size-4 opacity-100" />}
          >
            <SelectValue />
          </SelectTrigger>
          <SelectContent className={contentCls}>
            <SelectItem value="nodes" className={itemCls}>
              Nodes
            </SelectItem>
            <SelectItem value="edges" disabled className={itemCls}>
              Edges (coming soon)
            </SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className={styles.toolbarGroup}>
        <span className={styles.toolbarLabel}>Population</span>
        <Select
          value={populationName}
          onValueChange={onPopulationChange}
          disabled={populations.length === 0}
        >
          <SelectTrigger
            className={cn(triggerCls, styles.populationSelect)}
            icon={<RiArrowDownSLine className="text-primary-9 size-4 opacity-100" />}
          >
            <SelectValue />
          </SelectTrigger>
          <SelectContent className={contentCls}>
            {populations.map((p) => (
              <SelectItem key={p.name} value={p.name} className={itemCls}>
                {`${p.name} (${p.type})`}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className={styles.toolbarSpacer} />

      <div className={styles.modeButtons}>
        <ModeButton
          active={mode === 'collapsed'}
          onClick={() => onModeChange('collapsed')}
          label="Collapse"
        >
          <ModeIcon mode="collapsed" />
        </ModeButton>
        <ModeButton
          active={mode === 'half'}
          onClick={() => onModeChange('half')}
          label="Half height"
        >
          <ModeIcon mode="half" />
        </ModeButton>
        <ModeButton
          active={mode === 'full'}
          onClick={() => onModeChange('full')}
          label="Full height"
        >
          <ModeIcon mode="full" />
        </ModeButton>
      </div>
    </div>
  );
}

function ModeButton({
  active,
  onClick,
  label,
  children,
}: {
  active: boolean;
  onClick: () => void;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <Tooltip title={label}>
      <button
        type="button"
        className={cn(styles.modeButton, active && styles.modeButtonActive)}
        onClick={onClick}
        aria-pressed={active}
        aria-label={label}
      >
        {children}
      </button>
    </Tooltip>
  );
}

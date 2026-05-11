import { RiArrowDownSLine, RiContractUpDownLine, RiFullscreenLine } from '@remixicon/react';
import { Select, Tooltip } from 'antd';

import { classNames } from '@/util/utils';

import type { DisplayMode, NodePopulation, ViewMode } from '@/features/circuit-nodes/types';

import styles from '@/features/circuit-nodes/circuit-nodes-table.module.css';

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
        <div className={styles.viewSwitch}>
          <button
            type="button"
            className={classNames(
              styles.viewSwitchOption,
              view === 'nodes' && styles.viewSwitchOptionActive
            )}
            onClick={() => onViewChange('nodes')}
            aria-pressed={view === 'nodes'}
          >
            Nodes
          </button>
          <Tooltip title="Coming soon">
            <button
              type="button"
              className={classNames(styles.viewSwitchOption, styles.viewSwitchOptionDisabled)}
              disabled
              aria-pressed={false}
            >
              Edges
            </button>
          </Tooltip>
        </div>
      </div>

      <div className={styles.toolbarGroup}>
        <span className={styles.toolbarLabel}>Population</span>
        <Select
          value={populationName}
          onChange={onPopulationChange}
          size="small"
          className={styles.populationSelect}
          options={populations.map((p) => ({
            value: p.name,
            label: `${p.name} (${p.type})`,
          }))}
          disabled={populations.length === 0}
        />
      </div>

      <div className={styles.toolbarSpacer} />

      <div className={styles.modeButtons}>
        <ModeButton
          active={mode === 'collapsed'}
          onClick={() => onModeChange('collapsed')}
          label="Collapse"
        >
          <RiArrowDownSLine size={16} />
        </ModeButton>
        <ModeButton
          active={mode === 'half'}
          onClick={() => onModeChange('half')}
          label="Half height"
        >
          <RiContractUpDownLine size={16} />
        </ModeButton>
        <ModeButton
          active={mode === 'full'}
          onClick={() => onModeChange('full')}
          label="Full height"
        >
          <RiFullscreenLine size={16} />
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
        className={classNames(styles.modeButton, active && styles.modeButtonActive)}
        onClick={onClick}
        aria-pressed={active}
        aria-label={label}
      >
        {children}
      </button>
    </Tooltip>
  );
}

import {
  RiArrowDownSLine,
  RiArrowUpSLine,
  RiFilter3Fill,
  RiFilter3Line,
  RiMore2Fill,
} from '@remixicon/react';
import { Dropdown } from 'antd';
import { useEffect, useRef, useState } from 'react';

import { cn } from '@/utils/css-class';

import type { CustomHeaderProps } from 'ag-grid-react';
import type { MenuProps } from 'antd';

import styles from './column-header.module.css';

type Props = CustomHeaderProps & {
  onReset?: () => void;
  isNumeric?: boolean;
  onOpenChooser?: () => void;
};

export function ColumnHeader(props: Props) {
  const {
    displayName,
    column,
    api,
    enableSorting,
    progressSort,
    setSort,
    showFilter,
    onReset,
    isNumeric,
    onOpenChooser,
  } = props;

  const [sort, setSortState] = useState(column.getSort());
  const [sortIndex, setSortIndex] = useState<number | null | undefined>(column.getSortIndex());
  const [multiSortActive, setMultiSortActive] = useState(false);
  const [filterActive, setFilterActive] = useState(column.isFilterActive());
  const filterBtnRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    const onSort = () => {
      setSortState(column.getSort());
      setSortIndex(column.getSortIndex());
      const sortedCount = api.getColumnState().filter((c) => c.sort != null).length;
      setMultiSortActive(sortedCount > 1);
    };
    const onFilter = () => setFilterActive(column.isFilterActive());
    api.addEventListener('sortChanged', onSort);
    column.addEventListener('filterChanged', onFilter);
    onSort();
    return () => {
      api.removeEventListener('sortChanged', onSort);
      column.removeEventListener('filterChanged', onFilter);
    };
  }, [column, api]);

  const colId = column.getColId();
  const applyPin = (pinned: 'left' | 'right' | null) =>
    api.applyColumnState({ state: [{ colId, pinned }], defaultState: {} });

  const items: MenuProps['items'] = [
    {
      key: 'sort-asc',
      label: 'Sort Ascending',
      onClick: () => setSort('asc'),
      disabled: !enableSorting,
    },
    {
      key: 'sort-desc',
      label: 'Sort Descending',
      onClick: () => setSort('desc'),
      disabled: !enableSorting,
    },
    {
      key: 'sort-clear',
      label: 'Clear Sort',
      onClick: () => setSort(null),
      disabled: !enableSorting || sort === null,
    },
    { type: 'divider' },
    { key: 'pin-left', label: 'Pin Left', onClick: () => applyPin('left') },
    { key: 'pin-right', label: 'Pin Right', onClick: () => applyPin('right') },
    { key: 'pin-none', label: 'No Pin', onClick: () => applyPin(null) },
    { type: 'divider' },
    {
      key: 'autosize-this',
      label: 'Autosize This Column',
      onClick: () => api.autoSizeColumns([colId]),
    },
    { key: 'autosize-all', label: 'Autosize All Columns', onClick: () => api.autoSizeAllColumns() },
    { type: 'divider' },
    {
      key: 'choose-columns',
      label: 'Choose Columns',
      onClick: () => onOpenChooser?.(),
      disabled: !onOpenChooser,
    },
    { key: 'reset', label: 'Reset Columns', onClick: () => onReset?.() },
    { type: 'divider' },
    { key: 'reset-filters', label: 'Reset Filters', onClick: () => api.setFilterModel(null) },
  ];

  const onLabelClick = (e: React.MouseEvent) => {
    if (!enableSorting) return;
    progressSort(e.shiftKey);
  };

  const sortBadge =
    multiSortActive && sortIndex != null ? (
      <span className={styles.sortIndex} aria-hidden>
        {sortIndex + 1}
      </span>
    ) : null;

  const sortArrow =
    sort === 'asc' ? (
      <span className={styles.sortIconWrap}>
        <RiArrowUpSLine size={14} className={styles.sortIcon} />
        {sortBadge}
      </span>
    ) : sort === 'desc' ? (
      <span className={styles.sortIconWrap}>
        <RiArrowDownSLine size={14} className={styles.sortIcon} />
        {sortBadge}
      </span>
    ) : null;

  const labelBtn = (
    <button
      type="button"
      className={styles.label}
      onClick={onLabelClick}
      title={displayName}
      disabled={!enableSorting}
    >
      {isNumeric && sortArrow}
      <span className={styles.labelText}>{displayName}</span>
      {!isNumeric && sortArrow}
    </button>
  );

  const filterBtn = (
    <button
      ref={filterBtnRef}
      type="button"
      className={cn(styles.iconButton, filterActive && styles.active)}
      aria-label="Filter"
      onClick={() => filterBtnRef.current && showFilter(filterBtnRef.current)}
    >
      {filterActive ? <RiFilter3Fill size={14} /> : <RiFilter3Line size={14} />}
      {filterActive && <span className={styles.activeDot} aria-hidden />}
    </button>
  );

  const menuBtn = (
    <Dropdown
      menu={{ items }}
      trigger={['click']}
      placement="bottomRight"
      overlayClassName={styles.columnMenu}
    >
      <button type="button" className={styles.iconButton} aria-label="Column menu">
        <RiMore2Fill size={14} />
      </button>
    </Dropdown>
  );

  return (
    <div className={cn(styles.header, isNumeric && styles.headerRight)}>
      <div className={styles.actions}>
        {filterBtn}
        {menuBtn}
      </div>
      {labelBtn}
    </div>
  );
}

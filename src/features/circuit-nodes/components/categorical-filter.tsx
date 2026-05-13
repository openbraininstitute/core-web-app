import { RiSearchLine } from '@remixicon/react';
import { useGridFilter } from 'ag-grid-react';
import { Checkbox, Input } from 'antd';
import { useEffect, useMemo, useRef, useState } from 'react';

import { useDebouncedCallback } from '@/hooks/hooks';

import type { CustomFilterProps } from 'ag-grid-react';
import type { InputRef } from 'antd';
import type { SetFilter } from '@/features/circuit-nodes/types';

import styles from './categorical-filter.module.css';

const APPLY_DEBOUNCE_MS = 150;

type Params = CustomFilterProps<unknown, unknown, SetFilter | null> & {
  library: string[];
};

export function CategoricalFilter({ model, onModelChange, library }: Params) {
  const [query, setQuery] = useState('');
  const [selected, setSelected] = useState<Set<string>>(() => new Set(model?.values ?? library));

  useEffect(() => {
    setSelected(new Set(model?.values ?? library));
  }, [model, library]);

  const hidePopupRef = useRef<(() => void) | null>(null);
  const inputRef = useRef<InputRef>(null);
  useGridFilter({
    // Required by BaseFilter type; never called in infinite row model (server-side filtering).
    doesFilterPass: () => true,
    afterGuiAttached: (params) => {
      hidePopupRef.current = params?.hidePopup ?? null;
      inputRef.current?.focus({ cursor: 'end' });
    },
  });

  const emit = (next: Set<string>) => {
    if (next.size === library.length) onModelChange(null);
    else onModelChange({ filterType: 'set', values: Array.from(next) });
  };

  const commit = useDebouncedCallback(emit, [library, onModelChange], APPLY_DEBOUNCE_MS);

  useEffect(() => () => commit.cancel(), [commit]);

  const applyImmediate = (next: Set<string>) => {
    commit.cancel();
    emit(next);
  };

  const update = (next: Set<string>) => {
    setSelected(next);
    commit(next);
  };

  const tokens = useMemo(
    () =>
      query
        .toLowerCase()
        .split(/\s+/)
        .filter((t) => t.length > 0),
    [query]
  );
  const visible = useMemo(
    () =>
      tokens.length === 0
        ? library
        : library.filter((v) => {
            const lower = v.toLowerCase();
            return tokens.every((t) => lower.includes(t));
          }),
    [library, tokens]
  );

  const scope = tokens.length > 0 ? visible : library;
  const selectAll = () => {
    const next = new Set(selected);
    for (const v of scope) next.add(v);
    update(next);
  };
  const clear = () => {
    const next = new Set(selected);
    for (const v of scope) next.delete(v);
    update(next);
  };

  return (
    <div className={styles.filterPopover}>
      <Input
        ref={inputRef}
        prefix={<RiSearchLine size={14} />}
        placeholder="Search…"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        onPressEnter={() => {
          if (visible.length === 0) return;
          const next = new Set(visible);
          setSelected(next);
          applyImmediate(next);
          hidePopupRef.current?.();
        }}
        allowClear
        size="small"
      />
      <div className={styles.filterActions}>
        <button type="button" onClick={selectAll} className={styles.actionButton}>
          Select all
        </button>
        <button type="button" onClick={clear} className={styles.actionButton}>
          Clear
        </button>
      </div>
      <div className={styles.filterList}>
        {visible.length === 0 ? (
          <div className={styles.filterEmpty}>No matches</div>
        ) : (
          visible.map((v) => (
            <Checkbox
              key={v}
              checked={selected.has(v)}
              onChange={(e) => {
                const next = new Set(selected);
                if (e.target.checked) next.add(v);
                else next.delete(v);
                update(next);
              }}
              title={v}
            >
              <span className={styles.filterLabel}>{v}</span>
            </Checkbox>
          ))
        )}
      </div>
    </div>
  );
}

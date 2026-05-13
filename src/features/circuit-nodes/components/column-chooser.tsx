import { RiDraggable } from '@remixicon/react';
import { Checkbox } from 'antd';
import capitalize from 'es-toolkit/compat/capitalize';
import { useMemo, useRef, useState } from 'react';

import { cn } from '@/utils/css-class';

import type { ColumnMeta } from '@/features/circuit-nodes/types';

import styles from './column-chooser.module.css';

type Props = {
  columns: ColumnMeta[];
  orderedNames: string[];
  visibleColumns: Set<string>;
  onVisibleColumnsChange: (next: Set<string>) => void;
  onOrderedNamesChange: (next: string[]) => void;
};

export function ColumnChooser({
  columns,
  orderedNames,
  visibleColumns,
  onVisibleColumnsChange,
  onOrderedNamesChange,
}: Props) {
  const items = useMemo(() => {
    const known = new Set(columns.map((c) => c.name));
    const seen = new Set<string>();
    const ordered: string[] = [];
    for (const n of orderedNames) {
      if (known.has(n) && !seen.has(n)) {
        ordered.push(n);
        seen.add(n);
      }
    }
    for (const c of columns) {
      if (!seen.has(c.name)) ordered.push(c.name);
    }
    return ordered;
  }, [columns, orderedNames]);

  const dragIndexRef = useRef<number | null>(null);
  const [draggingIndex, setDraggingIndex] = useState<number | null>(null);
  const [dropIndex, setDropIndex] = useState<number | null>(null);

  const onDragStart = (e: React.DragEvent, index: number) => {
    dragIndexRef.current = index;
    setDraggingIndex(index);
    e.dataTransfer.effectAllowed = 'move';
    // Required by Firefox to actually start the drag.
    e.dataTransfer.setData('text/plain', String(index));
  };

  const onDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    const rect = e.currentTarget.getBoundingClientRect();
    const before = e.clientY < rect.top + rect.height / 2;
    const target = before ? index : index + 1;
    if (dropIndex !== target) setDropIndex(target);
  };

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const from = dragIndexRef.current;
    const target = dropIndex;
    dragIndexRef.current = null;
    setDraggingIndex(null);
    setDropIndex(null);
    if (from === null || target === null) return;
    // Adjust target when removing the dragged item shifts indices.
    const insertAt = target > from ? target - 1 : target;
    if (insertAt === from) return;
    const next = items.slice();
    const [moved] = next.splice(from, 1);
    next.splice(insertAt, 0, moved);
    onOrderedNamesChange(next);
  };

  const onDragEnd = () => {
    dragIndexRef.current = null;
    setDraggingIndex(null);
    setDropIndex(null);
  };

  const toggle = (name: string, checked: boolean) => {
    const next = new Set(visibleColumns);
    if (checked) next.add(name);
    else next.delete(name);
    onVisibleColumnsChange(next);
  };

  return (
    <ul className={styles.list}>
      {items.map((name, index) => {
        const isDragging = draggingIndex === index;
        const dragActive = draggingIndex !== null;
        const showLineAbove = dragActive && dropIndex === index;
        const showLineBelow = dragActive && dropIndex === index + 1;
        const cls = cn(
          styles.row,
          isDragging && styles.rowDragging,
          showLineAbove && styles.rowDropAbove,
          showLineBelow && styles.rowDropBelow
        );
        const label = capitalize(name.replace(/_/g, ' '));
        return (
          <li
            key={name}
            className={cls}
            draggable
            onDragStart={(e) => onDragStart(e, index)}
            onDragOver={(e) => onDragOver(e, index)}
            onDrop={onDrop}
            onDragEnd={onDragEnd}
          >
            <span className={styles.handle}>
              <RiDraggable size={16} />
            </span>
            <Checkbox
              checked={visibleColumns.has(name)}
              onChange={(ev) => toggle(name, ev.target.checked)}
            />
            <span className={styles.label} title={label}>
              {label}
            </span>
          </li>
        );
      })}
    </ul>
  );
}

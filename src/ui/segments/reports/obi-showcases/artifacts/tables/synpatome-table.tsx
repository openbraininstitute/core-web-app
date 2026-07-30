'use client';

import { useState } from 'react';

import { SimpleGrid } from '@/features/data-grid/presets/simple-grid';
import columns from '@/ui/segments/reports/obi-showcases/artifacts/columns/synaptome-column';
import { classNames } from '@/util/utils';

import type { SynaptomeProps } from '@/ui/segments/reports/obi-showcases/showcase-type';

import styles from '@/ui/segments/reports/obi-showcases/artifacts/styles/synaptome.module.css';

export default function SynaptomeTable({ content }: { content: SynaptomeProps[] }) {
  const [selectedRow, setSelectedRow] = useState<SynaptomeProps | null>(null);

  return (
    <div>
      <SimpleGrid
        className={styles.circuitTable}
        rows={content}
        columns={columns()}
        getRowId={(record) => record.name}
        rowSelection={{
          mode: 'single',
          onSelectionChange: (_ids, selectedRows) => setSelectedRow(selectedRows[0] ?? null),
        }}
      />

      <button
        className={classNames(
          'bg-primary-9 fixed right-4 px-10 py-3 text-lg text-white transition-all duration-500 ease-in-out',
          selectedRow ? 'bottom-4' : 'bottom-[-100px]'
        )}
        type="button"
        aria-label="Download selected model"
      >
        Download Model
      </button>
    </div>
  );
}

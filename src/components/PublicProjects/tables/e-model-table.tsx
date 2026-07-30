'use client';

import { useState } from 'react';

import { SimpleGrid } from '@/features/data-grid/presets/simple-grid';
import { classNames } from '@/util/utils';

import columns from './columns/e-model-columns';

import type { EModelsProps } from '../type/artifactsType';

import styles from './tables.module.scss';

export default function EModelTable({ content }: { content: EModelsProps[] }) {
  const [selectedRow, setSelectedRow] = useState<EModelsProps | null>(null);

  const getRowId = (record: EModelsProps) => `${record.name}_${content.indexOf(record)}`;

  const handleDownload = () => {
    if (selectedRow?.downloadLink) {
      window.open(selectedRow.downloadLink, '_blank');
    }
  };

  return (
    <div>
      <SimpleGrid
        className={styles.circuitTable}
        rows={content}
        columns={columns()}
        getRowId={getRowId}
        rowSelection={{
          mode: 'single',
          onSelectionChange: (_ids, selectedRows) => setSelectedRow(selectedRows[0] ?? null),
        }}
      />

      <button
        className={classNames(
          'fixed right-4 bg-green-600 px-10 py-3 text-lg text-white transition-all duration-500 ease-in-out',
          selectedRow ? 'bottom-4' : 'bottom-[-100px]'
        )}
        type="button"
        onClick={handleDownload}
        aria-label="Download selected model"
      >
        Download Model
      </button>
    </div>
  );
}

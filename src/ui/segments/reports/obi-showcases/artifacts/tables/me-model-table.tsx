'use client';

import { useState } from 'react';

import { SimpleGrid } from '@/features/data-grid/presets/simple-grid';
import columns from '@/ui/segments/reports/obi-showcases/artifacts/columns/me-model-column';
import { classNames } from '@/util/utils';

import type { MEModelsProps } from '@/ui/segments/reports/obi-showcases/showcase-type';

import styles from '@/ui/segments/reports/obi-showcases/artifacts/styles/me-model.module.css';

export default function MEModelTable({ content }: { content: MEModelsProps[] }) {
  const [selectedRow, setSelectedRow] = useState<MEModelsProps | null>(null);

  const getRowId = (record: MEModelsProps) => `${record.name}_${content.indexOf(record)}`;

  const handleDownload = () => {
    if (selectedRow?.download) {
      window.open(selectedRow.download, '_blank');
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
          'fixed right-8 bg-green-600 px-10 py-4 text-lg font-normal text-white transition-all duration-500 ease-in-out',
          selectedRow ? 'bottom-8' : 'bottom-[-100px]'
        )}
        type="button"
        name="download-model"
        onClick={handleDownload}
        aria-label="Download selected model"
      >
        Download Model
      </button>
    </div>
  );
}

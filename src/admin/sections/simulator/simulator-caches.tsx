'use client';

import { useState } from 'react';

import { SimpleGrid } from '@/features/data-grid/presets/simple-grid';
import { Button } from '@/ui/molecules/button';

import { FormModal } from '../../shared/form-modal';
import { PageHeader } from '../../shared/page-header';
import { useAdminWrite } from '../../shared/use-admin-write';
import { clearSimulatorCache, SIMULATOR_CACHES, SimulatorCache } from './cache';

import type { ISimpleColumn } from '@/features/data-grid/presets/simple-grid';
import type { TSimulatorCache } from './cache';

type TCacheRow = { cache: TSimulatorCache; label: string; holds: string };

const ROWS: TCacheRow[] = Object.values(SimulatorCache).map((cache) => ({
  cache,
  ...SIMULATOR_CACHES[cache],
}));

function ClearCache({ row }: { row: TCacheRow }) {
  const [open, setOpen] = useState(false);
  const close = () => setOpen(false);
  const write = useAdminWrite({
    write: () => clearSimulatorCache(row.cache),
    done: `${row.label} cache cleared`,
    failed: `Couldn't clear the ${row.label.toLowerCase()} cache`,
    onSuccess: close,
  });

  return (
    <>
      <Button rounded variant="outline" size="sm" onClick={() => setOpen(true)}>
        Clear
      </Button>
      {open && (
        <FormModal
          title={`Clear the ${row.label.toLowerCase()} cache?`}
          description="Every user's runs rebuild what they need from it, which makes the next ones slower."
          fields={[]}
          okText="Clear"
          danger
          pending={write.isPending}
          onSubmit={() => write.mutate(undefined)}
          onClose={close}
        />
      )}
    </>
  );
}

const COLUMNS: Array<ISimpleColumn<TCacheRow>> = [
  {
    id: 'cache',
    header: 'Cache',
    width: { flex: 1, minWidth: 180 },
    renderCell: ({ label, cache }) => (
      <div className="flex flex-col leading-tight">
        <span className="text-primary-9 font-semibold">{label}</span>
        <code className="text-neutral-4 text-sm">{cache}</code>
      </div>
    ),
  },
  {
    id: 'holds',
    header: 'Holds',
    width: { flex: 3, minWidth: 320 },
    renderCell: ({ holds }) => <span className="truncate">{holds}</span>,
  },
  {
    id: 'clear',
    header: '',
    width: { width: 110 },
    renderCell: (row) => <ClearCache row={row} />,
  },
];

export function SimulatorCaches() {
  return (
    <div className="flex flex-col gap-4">
      <PageHeader title="Simulator caches">
        The small-scale simulator keeps these on disk. A clear takes effect for runs that start
        after it. Runs already going keep the old files, which are deleted once they finish. The
        service gives no progress for that deletion.
      </PageHeader>
      <div className="border-neutral-2 rounded-lg border bg-white">
        <SimpleGrid<TCacheRow>
          columns={COLUMNS}
          rows={ROWS}
          getRowId={({ cache }) => cache}
          rowHeight={56}
          loadingLabel="caches"
        />
      </div>
    </div>
  );
}

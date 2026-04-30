'use client';

import { RiUploadCloud2Line } from '@remixicon/react';
import { useState } from 'react';

import { Button } from '@/ui/molecules/button';

import { ImportConfigModal } from './import-config-modal';

import type { AtomsMap, ConfigSchema } from '@/features/scan-config/types';

interface ImportConfigButtonProps {
  schema: ConfigSchema;
  setAtomsMap: React.Dispatch<React.SetStateAction<AtomsMap>>;
  disabled?: boolean;
}

export function ImportConfigButton({ schema, setAtomsMap, disabled }: ImportConfigButtonProps) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <Button
        rounded
        variant="ghost"
        type="button"
        aria-label="Import configuration"
        className="pr-1"
        size="md"
        disabled={disabled}
        onClick={() => setOpen(true)}
      >
        <span className="text-primary-9 text-base">Import</span>
        <div className="flex size-8 items-center justify-center border rounded-full border-neutral-2 border-solid hover:bg-gray-100 transition-colors">
          <RiUploadCloud2Line className="text-primary-8 text-sm" />
        </div>
      </Button>
      <ImportConfigModal
        open={open}
        onClose={() => setOpen(false)}
        schema={schema}
        setAtomsMap={setAtomsMap}
      />
    </>
  );
}

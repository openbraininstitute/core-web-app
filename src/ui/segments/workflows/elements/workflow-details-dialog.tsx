'use client';

import { useMutation } from '@tanstack/react-query';
import { useCallback, useId, useRef, useState } from 'react';

import { updateEntityDetails } from '@/api/entitycore/queries/general/entity';
import { Input } from '@/ui/molecules/input';
import { Textarea } from '@/ui/molecules/input/text-area';
import { Modal } from '@/ui/molecules/modal';

import type { EntityCoreObjectTypes } from '@/api/entitycore/types';
import type { WorkspaceContext } from '@/types/common';

const labelClass = 'text-primary-9 text-sm font-bold';

/** The row's own description, which not every entity type carries. */
function descriptionOf(row: EntityCoreObjectTypes): string {
  return 'description' in row && typeof row.description === 'string' ? row.description : '';
}

/**
 * Renames a workflow-table row and rewrites its description. Saves to the row's entity, so
 * every listing showing it follows once `onSaved` has refreshed them.
 */
export function WorkflowDetailsDialog({
  row,
  workspace,
  onClose,
  onSaved,
}: {
  row: EntityCoreObjectTypes;
  workspace: WorkspaceContext;
  onClose: () => void;
  onSaved: () => Promise<unknown>;
}) {
  const [name, setName] = useState(row.name ?? '');
  const [description, setDescription] = useState(descriptionOf(row));
  const formId = useId();
  const nameId = useId();
  const descriptionId = useId();
  const nameRef = useRef<HTMLInputElement>(null);
  // after the modal's focus trap, which takes its close button; stable, as the modal's
  // open effect runs again whenever this changes
  const focusName = useCallback(() => nameRef.current?.select(), []);

  const save = useMutation({
    mutationFn: () =>
      updateEntityDetails({
        type: row.type,
        id: row.id,
        data: { name: name.trim(), description: description.trim() },
        context: workspace,
      }),
    onSuccess: async () => {
      await onSaved();
      onClose();
    },
  });

  const changed = name.trim() !== (row.name ?? '') || description.trim() !== descriptionOf(row);
  const canSave = name.trim().length > 0 && changed && !save.isPending;

  const footer = (
    <div className="flex items-center justify-end gap-4">
      <button
        type="button"
        data-testid="workflow-details-cancel"
        className="text-primary-9 cursor-pointer px-4 py-2 text-base transition-colors hover:opacity-80"
        onClick={onClose}
      >
        Cancel
      </button>
      <button
        type="submit"
        // the footer sits outside the form, so it names it
        form={formId}
        data-testid="workflow-details-save"
        className="bg-primary-9 hover:bg-primary-8 cursor-pointer rounded-full px-8 py-2 text-base text-white transition-colors disabled:cursor-not-allowed disabled:opacity-50"
        disabled={!canSave}
      >
        {save.isPending ? 'Saving…' : 'Save'}
      </button>
    </div>
  );

  return (
    <Modal
      open
      onClose={onClose}
      afterOpen={focusName}
      size="md"
      title="Edit name and description"
      footer={footer}
      headerClassName="[&_#modal-title]:text-primary-9 border-b-0 px-8 pt-6 pb-0"
      bodyClassName="px-8 py-4"
      footerClassName="border-t-0 px-8 pb-6 pt-2"
    >
      <form
        id={formId}
        className="flex flex-col gap-4"
        onSubmit={(event) => {
          event.preventDefault();
          if (canSave) save.mutate();
        }}
      >
        <div className="flex flex-col gap-1.5">
          <label htmlFor={nameId} className={labelClass}>
            Name
          </label>
          <Input
            ref={nameRef}
            id={nameId}
            value={name}
            onChange={(event) => setName(event.target.value)}
            aria-invalid={name.trim().length === 0}
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <label htmlFor={descriptionId} className={labelClass}>
            Description
          </label>
          <Textarea
            id={descriptionId}
            value={description}
            onChange={(event) => setDescription(event.target.value)}
            rows={4}
          />
        </div>
        {save.isError && (
          <p className="text-sm text-red-600" role="alert">
            Could not save: {save.error instanceof Error ? save.error.message : 'unknown error'}
          </p>
        )}
      </form>
    </Modal>
  );
}

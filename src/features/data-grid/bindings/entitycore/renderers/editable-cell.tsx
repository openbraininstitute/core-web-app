'use client';

import { LockOutlined } from '@ant-design/icons';

import { LightTooltip } from '@/features/data-grid/bindings/entitycore/renderers/light-tooltip';
import { EMPTY_PLACEHOLDER } from '@/features/data-grid/renderers/aggrid/empty-cell';
import { useWorkspace } from '@/ui/hooks/use-workspace';
import { cn } from '@/utils/css-class';

import type { ReactNode } from 'react';
import type { ICellRendererProps } from '@/features/data-grid/react';

/** Cell-renderer registry key for the editable / read-only icon. */
export const EDITABLE_RENDERER = 'editable';

interface IEditableRow {
  authorized_project_id?: string | null;
}

/** A record can be edited when it belongs to the current project, public or not. */
export function isEditableRecord(row: IEditableRow | undefined, projectId?: string): boolean {
  return !!projectId && row?.authorized_project_id === projectId;
}

/** A person with a pencil (Streamline, CC BY 4.0). */
function EditIcon() {
  return (
    <svg
      role="img"
      aria-label="Editable"
      xmlns="http://www.w3.org/2000/svg"
      width="1em"
      height="1em"
      viewBox="0 0 14 14"
    >
      <g fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="5" cy="2.75" r="2.25" />
        <path d="M3.5 12.5h-3V11A4.51 4.51 0 0 1 7 7m6.5 1.5l-4.71 4.71l-2.13.29l.3-2.13l4.7-4.71L13.5 8.5z" />
      </g>
    </svg>
  );
}

/** A person with a pencil for a record of this project, a lock for one it can only read. */
export function EditableCell({ row }: ICellRendererProps<IEditableRow>): ReactNode | null {
  const { projectId } = useWorkspace();
  if (!row) return EMPTY_PLACEHOLDER;
  const editable = isEditableRecord(row, projectId);
  return (
    <span className="flex h-full items-center justify-center text-lg">
      {/* the icon is the trigger, so the card hangs from it and not from the cell's edge */}
      <LightTooltip
        label={
          editable
            ? 'Editable: owned by this project'
            : 'Read-only: owned by another project, you can view it but not change it'
        }
      >
        <span
          data-testid={`editable-cell-${editable ? 'editable' : 'read-only'}`}
          className={cn('inline-flex', editable ? 'text-primary-4' : 'text-gray-400')}
        >
          {editable ? <EditIcon /> : <LockOutlined aria-label="Read-only" />}
        </span>
      </LightTooltip>
    </span>
  );
}

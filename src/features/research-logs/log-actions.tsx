'use client';

import { DeleteOutlined, EditOutlined } from '@ant-design/icons';
import { App, Input } from 'antd';
import { useParams, useRouter } from 'next/navigation';

import { useWorkspace } from '@/ui/hooks/use-workspace';
import { cn } from '@/utils/css-class';

import { useDeleteResearchLog, useResearchLogHref, useUpdateResearchLog } from './hooks';

import type { ReactNode } from 'react';
import type { IResearchLog } from '@/api/entitycore/types/entities/research-log';

const iconButton =
  'text-primary-9 hover:bg-neutral-1 flex size-7 items-center justify-center rounded-full bg-white text-sm shadow-sm ring-1 ring-black/5 transition-colors';

function IconButton({
  label,
  onClick,
  className,
  children,
}: {
  label: string;
  onClick: () => void;
  className?: string;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      onClick={onClick}
      className={cn(iconButton, className)}
    >
      {children}
    </button>
  );
}

/** Whether this project may change the log: it belongs to the project that wrote it. */
export function useCanEditLog(log: IResearchLog) {
  const { projectId } = useWorkspace();
  return log.authorized_project_id === projectId;
}

/**
 * Opens the window for a log's name and description, which are the log's own and apart from its
 * document. The rail's pills, the grid's cards and the report's header all open this one.
 */
export function useEditLogDetails() {
  const { modal, notification } = App.useApp();
  const update = useUpdateResearchLog();
  return (log: IResearchLog) => {
    let name = log.name;
    let description = log.description ?? '';
    modal.confirm({
      title: 'Name and description',
      icon: null,
      okText: 'Save',
      width: 560,
      // the name field takes the focus, not the button
      autoFocusButton: null,
      content: (
        <div className="mt-3 flex flex-col gap-3">
          <div className="flex flex-col gap-1">
            <span className="text-neutral-5 text-xs font-medium">Name</span>
            <Input
              autoFocus
              defaultValue={log.name}
              aria-label="Name"
              onChange={(e) => {
                name = e.target.value;
              }}
            />
          </div>
          <div className="flex flex-col gap-1">
            <span className="text-neutral-5 text-xs font-medium">Description</span>
            <Input.TextArea
              defaultValue={log.description ?? ''}
              aria-label="Description"
              placeholder="What this log is about, in a line or two"
              autoSize={{ minRows: 3, maxRows: 8 }}
              onChange={(e) => {
                description = e.target.value;
              }}
            />
          </div>
        </div>
      ),
      onOk: async () => {
        const nextName = name.trim();
        const nextDescription = description.trim();
        const meta = {
          ...(nextName && nextName !== log.name ? { name: nextName } : {}),
          ...(nextDescription !== (log.description ?? '') ? { description: nextDescription } : {}),
        };
        if (Object.keys(meta).length === 0) return;
        try {
          await update.mutateAsync({ id: log.id, meta });
        } catch (e) {
          notification.error({ message: 'Could not save', description: String(e) });
        }
      },
    });
  };
}

/**
 * Edit and delete icons for a log, over its card or pill, for whoever may use them. They show
 * while the pointer is on the card or pill, which is the `group/log` they are placed in.
 *
 * A log belongs to the project that wrote it, so a public log of another project is read-only,
 * and a public log cannot be deleted at all.
 */
export function LogActions({ log, className }: { log: IResearchLog; className?: string }) {
  const { modal } = App.useApp();
  const router = useRouter();
  const { logId } = useParams<{ logId?: string }>();
  const href = useResearchLogHref();
  const remove = useDeleteResearchLog();
  const editDetails = useEditLogDetails();

  const canRename = useCanEditLog(log);
  const canDelete = canRename && !log.authorized_public;
  if (!canRename && !canDelete) return null;

  const confirmDelete = () =>
    modal.confirm({
      title: 'Delete this research log?',
      content: 'The log and its document are deleted. Entities it links to are not touched.',
      okText: 'Delete',
      okButtonProps: { danger: true },
      onOk: async () => {
        await remove.mutateAsync(log.id);
        // the log being read is the one gone
        if (logId === log.id) router.push(href());
      },
    });

  return (
    <div
      className={cn(
        'flex gap-1 opacity-0 transition-opacity group-focus-within/log:opacity-100 group-hover/log:opacity-100',
        className
      )}
    >
      {canRename && (
        <IconButton label="Edit name and description" onClick={() => editDetails(log)}>
          <EditOutlined />
        </IconButton>
      )}
      {canDelete && (
        <IconButton label="Delete" onClick={confirmDelete} className="hover:text-destructive">
          <DeleteOutlined />
        </IconButton>
      )}
    </div>
  );
}

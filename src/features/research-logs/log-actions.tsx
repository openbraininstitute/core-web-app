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

/**
 * Rename and delete icons for a log, over its card or pill, for whoever may use them. They show
 * while the pointer is on the card or pill, which is the `group/log` they are placed in.
 *
 * A log belongs to the project that wrote it, so a public log of another project is read-only,
 * and a public log cannot be deleted at all.
 */
export function LogActions({ log, className }: { log: IResearchLog; className?: string }) {
  const { projectId } = useWorkspace();
  const { modal, notification } = App.useApp();
  const router = useRouter();
  const { logId } = useParams<{ logId?: string }>();
  const href = useResearchLogHref();
  const remove = useDeleteResearchLog();
  const update = useUpdateResearchLog();

  const canRename = log.authorized_project_id === projectId;
  const canDelete = canRename && !log.authorized_public;
  if (!canRename && !canDelete) return null;

  const rename = () => {
    let next = log.name;
    modal.confirm({
      title: 'Rename this research log',
      icon: null,
      okText: 'Rename',
      // the name field takes the focus, not the button
      autoFocusButton: null,
      content: (
        <Input
          autoFocus
          defaultValue={log.name}
          aria-label="Name"
          onChange={(e) => {
            next = e.target.value;
          }}
        />
      ),
      onOk: async () => {
        const name = next.trim();
        if (!name || name === log.name) return;
        try {
          await update.mutateAsync({ id: log.id, meta: { name } });
        } catch (e) {
          notification.error({ message: 'Could not rename', description: String(e) });
        }
      },
    });
  };

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
        <IconButton label="Rename" onClick={rename}>
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

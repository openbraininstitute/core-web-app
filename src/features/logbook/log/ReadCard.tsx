// Read mode: title, Edit and Delete, the description and byline, where the page sits in the log,
// the page through the same editor (not editable), then the previous and next pages (PageNav).
import { EditorContent } from '@tiptap/react';
import { isNil, isNotNil } from 'es-toolkit';
import { useState } from 'react';

import { useDeleteLog, useUpdateLog } from '@/features/logbook/api/research-logs';
import { Layout } from '@/features/logbook/app/layout';
import { DeleteLogDialog } from '@/features/logbook/log/DeleteLogDialog';
import { LogDetailsDialog } from '@/features/logbook/log/LogDetailsDialog';
import { PagePlace, PageSteps } from '@/features/logbook/log/PageNav';
import { ViewMode } from '@/features/logbook/log/view-mode';
import { navigate, pathOf } from '@/features/logbook/router';
import { Icon } from '@/features/logbook/ui/icons';

import type { ILogShared } from '@/features/logbook/log/LogPage';

const dateOf = (iso: string): string =>
  new Date(iso).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' });

export function ReadCard(props: ILogShared) {
  const { log, project, editor } = props;
  const narrow = props.layout === Layout.Narrow;
  const remove = useDeleteLog(project);
  const update = useUpdateLog(project);
  const [editingName, setEditingName] = useState(false);
  const title = log?.name ?? 'Research log';
  // A log is a record other people and agents use: its delete asks first (DeleteLogDialog).
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const deleteLog = (): void => {
    if (isNotNil(log)) setConfirmingDelete(true);
  };
  return (
    <section
      className="logbook-card relative flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden"
      aria-label={title}
    >
      <header
        className="flex items-center gap-3 border-b border-rule px-6 py-3 data-[narrow=true]:px-2.5 data-[narrow=true]:py-2"
        data-narrow={narrow}
      >
        <button
          type="button"
          className="grid size-10 flex-none place-items-center rounded-full bg-white text-primary-9 shadow-back-btn"
          aria-label="All research logs"
          title="All research logs"
          onClick={props.onBack}
        >
          <Icon name="arrowLeft" size={16} />
        </button>
        <div className="flex min-w-0 flex-1 items-center gap-1.5">
          <h1 className="m-0 min-w-0 truncate text-[24px] font-bold">{title}</h1>
          <button
            type="button"
            className="icon-btn size-8 flex-none"
            aria-label="Edit name and description"
            title="Edit name and description"
            disabled={isNil(log)}
            onClick={() => setEditingName(true)}
          >
            <Icon name="pencil" size={15} />
          </button>
        </div>
        <button
          type="button"
          className="grid size-10 flex-none place-items-center rounded-full text-white disabled:opacity-50 bg-primary-9 shadow-navy-btn"
          aria-label="Edit"
          title="Edit"
          onClick={() => props.onMode(ViewMode.Edit)}
        >
          <Icon name="pencil" size={16} />
        </button>
        <button
          type="button"
          className="grid size-10 flex-none place-items-center rounded-full text-white disabled:opacity-50 bg-red shadow-red-btn"
          aria-label="Delete"
          title="Delete"
          disabled={isNil(log) || remove.isPending}
          onClick={deleteLog}
        >
          <Icon name="trash" size={16} />
        </button>
      </header>
      <div className="scroll-thin min-h-0 flex-1 overflow-y-auto">
        <article
          className="mx-auto max-w-[760px] px-8 pt-4 pb-[72px] data-[narrow=true]:px-4 data-[narrow=true]:pt-3"
          data-narrow={narrow}
        >
          <p className="m-0 text-[18px] leading-normal">{log?.description}</p>
          <p className="mt-1 mb-4 border-b border-rule pb-4 text-[12px] text-neutral-4">
            {log?.created_by.pref_label ?? ''}
            {isNil(log) ? '' : ` · updated ${dateOf(log.update_date)}`}
          </p>
          <PagePlace pages={props.pages} page={props.page} />
          {props.deleted ? (
            <p
              className="mt-0 mb-4 rounded-xl bg-[#fdf3e1] px-4 py-2.5 text-[13px] text-[#854d0e]"
              role="status"
            >
              This section was deleted. What it held stays shown here until you leave it.
            </p>
          ) : null}
          <EditorContent editor={editor} className="rl-editor rl-editor-read" />
          {props.deleted ? null : (
            <PageSteps pages={props.pages} page={props.page} onOpen={props.onOpenPage} />
          )}
        </article>
      </div>
      <LogDetailsDialog
        open={editingName}
        name={log?.name ?? ''}
        description={log?.description ?? ''}
        saving={update.isPending}
        onSave={(draft) =>
          isNil(log) ? Promise.resolve() : update.mutateAsync({ id: log.id, ...draft })
        }
        onClose={() => setEditingName(false)}
      />
      {confirmingDelete && isNotNil(log) ? (
        <DeleteLogDialog
          log={log}
          project={project}
          onDelete={() => remove.mutateAsync(log.id).then(() => navigate(pathOf(project), true))}
          onClose={() => setConfirmingDelete(false)}
        />
      ) : null}
    </section>
  );
}

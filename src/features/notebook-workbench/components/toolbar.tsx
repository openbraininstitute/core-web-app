'use client';

import {
  RiAddLine,
  RiArrowDownSLine,
  RiDeleteBin6Line,
  RiEraserLine,
  RiFileCopyLine,
  RiPlayFill,
  RiPlayList2Line,
  RiRefreshLine,
  RiSave3Line,
  RiScissorsCutLine,
  RiSkipForwardFill,
  RiStopFill,
} from '@remixicon/react';

import { Menu } from '@/features/notebook-workbench/ui/menu';
import { Tooltip } from '@/features/notebook-workbench/ui/tooltip';
import { cn } from '@/utils/css-class';

import type { KernelStatus } from '@/features/notebook-workbench/jupyter/use-session';
import type { CellType } from '@/features/notebook-workbench/notebook/model';
import type { NotebookController } from '@/features/notebook-workbench/notebook/use-notebook';

const STATUS_META: Record<KernelStatus, { label: string; dot: string; pulse?: boolean }> = {
  idle: { label: 'Idle', dot: 'bg-accent-dark' },
  busy: { label: 'Busy', dot: 'bg-primary-5', pulse: true },
  starting: { label: 'Starting', dot: 'bg-warning', pulse: true },
  restarting: { label: 'Restarting', dot: 'bg-warning', pulse: true },
  autorestarting: { label: 'Restarting', dot: 'bg-warning', pulse: true },
  terminating: { label: 'Terminating', dot: 'bg-warning' },
  dead: { label: 'Dead', dot: 'bg-destructive' },
  unknown: { label: 'Unknown', dot: 'bg-neutral-3' },
  disconnected: { label: 'Disconnected', dot: 'bg-destructive', pulse: true },
  'no-kernel': { label: 'No kernel', dot: 'bg-neutral-3' },
};

export function KernelIndicator({ controller }: { controller: NotebookController }) {
  const { session } = controller;
  const meta = STATUS_META[session.status] ?? STATUS_META.unknown;
  const specs = session.specs?.kernelspecs ?? {};

  const items = [
    ...Object.entries(specs).map(([name, spec]) => ({
      key: name,
      label: spec?.display_name ?? name,
      onSelect: () => void session.changeKernel(name),
    })),
    {
      key: 'restart',
      label: 'Restart kernel',
      separatorBefore: true,
      onSelect: () => void session.restart(),
    },
    {
      key: 'shutdown',
      label: 'Shut down kernel',
      danger: true,
      onSelect: () => void session.shutdown(),
    },
  ];

  return (
    <Menu
      items={items}
      align="right"
      width="w-60"
      trigger={({ toggle, open }) => (
        <button
          type="button"
          onClick={toggle}
          className={cn(
            'border-neutral-2 flex h-8 items-center gap-2 rounded-full border bg-white pr-2.5 pl-3',
            'text-xs font-semibold transition-all hover:shadow-xs',
            open && 'border-primary-9 shadow-xs'
          )}
        >
          <span className="relative flex size-2">
            <span className={cn('size-2 rounded-full', meta.dot)} />
            {meta.pulse ? (
              <span
                className={cn('absolute inset-0 animate-ping rounded-full opacity-60', meta.dot)}
              />
            ) : null}
          </span>
          <span className="text-primary-9 max-w-40 truncate">{session.displayName}</span>
          <span className="text-neutral-3 font-light">{meta.label}</span>
          <RiArrowDownSLine className="text-neutral-3 size-3.5" />
        </button>
      )}
    />
  );
}

const CELL_TYPES: { value: CellType; label: string }[] = [
  { value: 'code', label: 'Code' },
  { value: 'markdown', label: 'Markdown' },
  { value: 'raw', label: 'Raw' },
];

export function NotebookToolbar({ controller }: { controller: NotebookController }) {
  const { model, activeId, selectedIds, session, dirty, saving } = controller;
  const activeCell = model.cells.find((c) => c.id === activeId);
  const running = session.status === 'busy' || controller.busy;

  const iconButton =
    'text-neutral-4 hover:text-primary-9 hover:bg-neutral-1 flex size-8 items-center justify-center rounded-md transition-colors disabled:opacity-30 disabled:pointer-events-none';

  return (
    <div className="border-neutral-2 flex items-center gap-1 border-b bg-white px-3 py-2">
      <Tooltip label={dirty ? 'Save notebook (⌘S)' : 'Saved'} side="bottom">
        <button
          type="button"
          onClick={() => void controller.save()}
          disabled={saving}
          aria-label="Save notebook"
          className={cn(iconButton, dirty && 'text-primary-6')}
        >
          <RiSave3Line className={cn('size-4', saving && 'animate-pulse')} />
        </button>
      </Tooltip>

      <div className="bg-neutral-2 mx-1 h-5 w-px" />

      <Tooltip label="Insert cell below (B)" side="bottom">
        <button
          type="button"
          onClick={() => controller.insertCell('below')}
          aria-label="Insert cell below"
          className={iconButton}
        >
          <RiAddLine className="size-4" />
        </button>
      </Tooltip>
      <Tooltip label="Cut cells (X)" side="bottom">
        <button
          type="button"
          onClick={() => controller.cutCells()}
          aria-label="Cut cells"
          className={iconButton}
        >
          <RiScissorsCutLine className="size-4" />
        </button>
      </Tooltip>
      <Tooltip label="Copy cells (C)" side="bottom">
        <button
          type="button"
          onClick={() => controller.copyCells()}
          aria-label="Copy cells"
          className={iconButton}
        >
          <RiFileCopyLine className="size-4" />
        </button>
      </Tooltip>
      <Tooltip label="Delete cells (DD)" side="bottom">
        <button
          type="button"
          onClick={() => controller.deleteCells()}
          aria-label="Delete cells"
          className={cn(iconButton, 'hover:text-destructive hover:bg-destructive/10')}
        >
          <RiDeleteBin6Line className="size-4" />
        </button>
      </Tooltip>

      <div className="bg-neutral-2 mx-1 h-5 w-px" />

      <Tooltip label="Run selected cells (⇧↵)" side="bottom">
        <button
          type="button"
          onClick={() => controller.runCells(selectedIds)}
          aria-label="Run cells"
          className={iconButton}
        >
          <RiPlayFill className="size-4" />
        </button>
      </Tooltip>
      <Tooltip label={running ? 'Interrupt kernel (II)' : 'Kernel idle'} side="bottom">
        <button
          type="button"
          onClick={() => void session.interrupt()}
          disabled={!running}
          aria-label="Interrupt kernel"
          className={cn(iconButton, running && 'text-destructive')}
        >
          <RiStopFill className="size-4" />
        </button>
      </Tooltip>
      <Tooltip label="Restart kernel (00)" side="bottom">
        <button
          type="button"
          onClick={() => void session.restart()}
          aria-label="Restart kernel"
          className={iconButton}
        >
          <RiRefreshLine className="size-4" />
        </button>
      </Tooltip>
      <Tooltip label="Restart kernel and run all cells" side="bottom">
        <button
          type="button"
          onClick={() => void controller.restartAndRunAll()}
          aria-label="Restart and run all"
          className={iconButton}
        >
          <RiSkipForwardFill className="size-4" />
        </button>
      </Tooltip>

      <Menu
        width="w-64"
        items={[
          { key: 'all', label: 'Run all cells', onSelect: controller.runAll },
          {
            key: 'above',
            label: 'Run all above selected',
            disabled: !activeId,
            onSelect: () => activeId && controller.runAllAbove(activeId),
          },
          {
            key: 'below',
            label: 'Run selected and all below',
            disabled: !activeId,
            onSelect: () => activeId && controller.runAllBelow(activeId),
          },
          {
            key: 'clear',
            label: 'Clear all outputs',
            separatorBefore: true,
            icon: <RiEraserLine className="size-3.5" />,
            onSelect: controller.clearAllOutputs,
          },
        ]}
        trigger={({ toggle }) => (
          <Tooltip label="Run options" side="bottom">
            <button type="button" onClick={toggle} aria-label="Run options" className={iconButton}>
              <RiPlayList2Line className="size-4" />
            </button>
          </Tooltip>
        )}
      />

      <div className="bg-neutral-2 mx-1 h-5 w-px" />

      <Menu
        width="w-40"
        items={CELL_TYPES.map((type) => ({
          key: type.value,
          label: type.label,
          onSelect: () => controller.setCellType(type.value),
        }))}
        trigger={({ toggle, open }) => (
          <button
            type="button"
            onClick={toggle}
            className={cn(
              'border-neutral-2 text-primary-9 flex h-8 min-w-28 items-center justify-between gap-2 rounded-md border',
              'bg-white px-2.5 text-xs font-medium transition-colors hover:border-neutral-3',
              open && 'border-primary-9'
            )}
          >
            {CELL_TYPES.find((t) => t.value === activeCell?.type)?.label ?? 'Code'}
            <RiArrowDownSLine className="text-neutral-3 size-3.5" />
          </button>
        )}
      />

      <div className="flex-1" />

      <KernelIndicator controller={controller} />
    </div>
  );
}

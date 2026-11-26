import { isNil, isNotNil } from 'es-toolkit';
import { Fragment, useEffect, useRef, useState } from 'react';
import { match } from 'ts-pattern';

import { DROPDOWN_ITEM, POPOVER_PANEL } from '@/features/logbook/constants';
import { tabKey } from '@/features/logbook/log/open-tabs';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/ui/molecules/dropdown-menu';
import { Icon } from '@/ui/molecules/icon';
import { cn } from '@/utils/css-class';

import type { KeyboardEvent as ReactKeyboardEvent, WheelEvent } from 'react';
import type { IEditorTab, IEditorTabsProps, ITabRef } from '@/features/logbook/types';

const TAB =
  'group relative flex h-10 cursor-pointer items-center gap-2 rounded-t-[12px] border border-b-0 border-transparent pr-1.5 pl-3 text-[13px] font-semibold text-neutral-4 outline-none transition-colors duration-150 ease-[ease] hover:bg-white/70 hover:text-primary-9 focus-visible:ring-2 focus-visible:ring-primary-4 focus-visible:ring-inset aria-selected:z-1 aria-selected:border-rule aria-selected:bg-white aria-selected:text-primary-9';
const CLOSE =
  'grid size-6 flex-none place-items-center rounded-full text-neutral-4 hover:bg-fill-2 hover:text-primary-9';

function TitleField({
  title,
  label,
  focus,
  onRename,
  onDone,
}: {
  readonly title: string;
  readonly label: string;
  readonly focus: boolean;
  readonly onRename: (name: string) => Promise<unknown>;
  readonly onDone: () => void;
}) {
  const field = useRef<HTMLInputElement>(null);
  const [value, setValue] = useState(title);
  const [seen, setSeen] = useState(title);
  if (seen !== title) {
    setSeen(title);
    setValue(title);
  }
  // `focus` is fixed for the field's life, so this runs once, when the field opens.
  useEffect(() => {
    if (!focus) return;
    field.current?.focus();
    field.current?.select();
  }, [focus]);
  const save = (): void => {
    onDone();
    const name = value.trim();
    if (name.length === 0 || name === title) {
      setValue(title);
      return;
    }
    onRename(name).catch(() => setValue(title));
  };
  const backToTab = (input: HTMLInputElement): void =>
    input.closest<HTMLElement>('[role="tab"]')?.focus();
  return (
    <input
      ref={field}
      className="w-full min-w-0 truncate rounded-[6px] border-0 bg-transparent p-0 text-[13px] font-bold text-primary-9 outline-none focus:bg-soft"
      aria-label={label}
      title={label}
      value={value}
      maxLength={300}
      onChange={(event) => setValue(event.target.value)}
      onBlur={save}
      onKeyDown={(event) => {
        if (event.key === 'Enter') backToTab(event.currentTarget);
        if (event.key === 'Escape') {
          const input = event.currentTarget;
          setValue(title);
          requestAnimationFrame(() => backToTab(input));
        }
      }}
    />
  );
}

function TabList({
  tabs,
  active,
  onSelect,
  onClose,
}: {
  readonly tabs: readonly IEditorTab[];
  readonly active: string;
  readonly onSelect: (tab: ITabRef) => void;
  readonly onClose: (tab: ITabRef) => void;
}) {
  return (
    <DropdownMenuContent
      align="end"
      sideOffset={8}
      collisionPadding={8}
      className={cn(POPOVER_PANEL, 'z-71 flex max-h-[min(420px,70vh)] w-[280px] flex-col p-1.5')}
      aria-label="Open tabs"
    >
      {tabs.map((item) => (
        <div
          key={tabKey(item.tab)}
          className="flex items-center gap-1 rounded-[10px] pr-1 hover:bg-fill-item-hover data-[on=true]:bg-fill-2"
          data-on={tabKey(item.tab) === active}
        >
          <DropdownMenuItem
            className={cn(
              DROPDOWN_ITEM,
              'min-w-0 flex-1 gap-2.5 rounded-[10px] px-2.5 py-2 text-[13px] font-semibold text-primary-9'
            )}
            onSelect={() => onSelect(item.tab)}
            onKeyDown={(event) => {
              if ((event.key === 'Delete' || event.key === 'Backspace') && !item.pinned)
                onClose(item.tab);
            }}
          >
            <span className="flex flex-none">{item.icon}</span>
            <span className="truncate">{item.label}</span>
          </DropdownMenuItem>
          {item.pinned ? null : (
            <button
              type="button"
              className={CLOSE}
              aria-label={`Close ${item.label}`}
              onClick={() => onClose(item.tab)}
            >
              <Icon name="close" size={11} stroke={2.6} />
            </button>
          )}
        </div>
      ))}
    </DropdownMenuContent>
  );
}

const wheel = (event: WheelEvent<HTMLDivElement>): void => {
  if (Math.abs(event.deltaY) > Math.abs(event.deltaX))
    event.currentTarget.scrollLeft += event.deltaY;
};

export function EditorTabs(props: IEditorTabsProps) {
  const { tabs } = props;
  const active = tabKey(props.active);
  const page = tabKey(props.page);
  const activeAt = tabs.findIndex((item) => tabKey(item.tab) === active);
  const strip = useRef<HTMLDivElement>(null);
  const [overflow, setOverflow] = useState(false);
  const [editing, setEditing] = useState<string | null>(null);

  // biome-ignore lint/correctness/useExhaustiveDependencies: re-run when tabs open or close
  useEffect(() => {
    const el = strip.current;
    if (isNil(el)) return;
    const check = (): void => setOverflow(el.scrollWidth > el.clientWidth + 1);
    check();
    const observer = new ResizeObserver(check);
    observer.observe(el);
    return () => observer.disconnect();
  }, [tabs.length]);
  // biome-ignore lint/correctness/useExhaustiveDependencies: re-run when the selected tab or the tabs change
  useEffect(() => {
    strip.current
      ?.querySelector('[aria-selected="true"]')
      ?.scrollIntoView({ block: 'nearest', inline: 'nearest' });
  }, [active, tabs.length]);

  const moveFocus = (from: HTMLElement, key: string): boolean => {
    const all = [...(strip.current?.querySelectorAll<HTMLElement>('[role="tab"]') ?? [])];
    const at = all.indexOf(from);
    const to = match(key)
      .with('ArrowRight', () => (at + 1) % all.length)
      .with('ArrowLeft', () => (at - 1 + all.length) % all.length)
      .with('Home', () => 0)
      .with('End', () => all.length - 1)
      .otherwise(() => null);
    if (isNil(to) || at < 0) return false;
    all[to]?.focus();
    return true;
  };

  const startRename = (item: IEditorTab): void => {
    if (!item.pinned && isNotNil(item.onRename)) setEditing(tabKey(item.tab));
  };

  const keys = (item: IEditorTab) => (event: ReactKeyboardEvent<HTMLDivElement>) => {
    if (event.target !== event.currentTarget) return;
    if (moveFocus(event.currentTarget, event.key)) {
      event.preventDefault();
      return;
    }
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      props.onSelect(item.tab);
    }
    if (event.key === 'F2') startRename(item);
    if ((event.key === 'Delete' || event.key === 'Backspace') && !item.pinned)
      props.onClose(item.tab);
  };

  return (
    <div className="relative flex min-w-0 flex-1 items-end gap-1">
      <div
        ref={strip}
        className="flex min-w-0 flex-1 items-end overflow-x-auto overflow-y-hidden [scrollbar-width:none]"
        role="tablist"
        aria-label="Open in the editor"
        onWheel={wheel}
      >
        {tabs.map((item, index) => {
          const key = tabKey(item.tab);
          const selected = index === activeAt;
          return (
            <Fragment key={key}>
              {index > 0 ? (
                <span
                  className="mb-3 h-4 w-px flex-none bg-neutral-3 data-[hidden=true]:bg-transparent"
                  data-hidden={selected || index - 1 === activeAt}
                  aria-hidden="true"
                />
              ) : null}
              <div
                role="tab"
                aria-selected={selected}
                tabIndex={selected ? 0 : -1}
                className={cn(
                  TAB,
                  item.pinned ? 'min-w-[150px] flex-[0_1_280px]' : 'min-w-[124px] flex-[0_1_200px]'
                )}
                title={item.hint}
                data-testid="logbook-tab"
                onClick={() => props.onSelect(item.tab)}
                onDoubleClick={(event) => {
                  if (event.target instanceof Element && isNotNil(event.target.closest('button')))
                    return;
                  startRename(item);
                }}
                onKeyDown={keys(item)}
              >
                <span className="flex flex-none">{item.icon}</span>
                <span className="flex min-w-0 flex-1">
                  {isNotNil(item.onRename) && (item.pinned ? selected : editing === key) ? (
                    <TitleField
                      title={item.label}
                      label={item.pinned ? 'Name of the log' : 'Name of the page'}
                      focus={!item.pinned}
                      onRename={item.onRename}
                      onDone={() => setEditing(null)}
                    />
                  ) : (
                    <span className="truncate">{item.label}</span>
                  )}
                </span>
                {key === page ? (
                  <span className="flex flex-none pr-1.5 pl-1">{props.status}</span>
                ) : null}
                {item.pinned ? null : (
                  <button
                    type="button"
                    className={cn(
                      CLOSE,
                      'opacity-0 transition-opacity group-hover:opacity-100 group-aria-selected:opacity-100 focus-visible:opacity-100 pointer-coarse:opacity-100'
                    )}
                    aria-label={`Close ${item.label}`}
                    onClick={(event) => {
                      event.stopPropagation();
                      props.onClose(item.tab);
                    }}
                  >
                    <Icon name="close" size={11} stroke={2.6} />
                  </button>
                )}
              </div>
            </Fragment>
          );
        })}
      </div>
      {overflow ? (
        <div className="relative mb-1.5 flex-none">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                type="button"
                className="inline-flex h-9 items-center gap-1 rounded-full px-2.5 text-[12px] font-bold text-primary-9 hover:bg-white aria-expanded:bg-white"
                aria-label={`All ${tabs.length} open tabs`}
                title="All open tabs"
              >
                {tabs.length}
                <Icon name="chevronDown" size={14} stroke={2.4} />
              </button>
            </DropdownMenuTrigger>
            <TabList
              tabs={tabs}
              active={active}
              onSelect={props.onSelect}
              onClose={props.onClose}
            />
          </DropdownMenu>
        </div>
      ) : null}
    </div>
  );
}

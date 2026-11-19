// The editor card's tabs, browser style: the log first, its title edited in place, then each
// artifact opened from the Artifacts pane, read-only, with its close button. The selected tab is
// white and joins the content below; the others sit on the strip. Tabs shrink to a floor, then
// the strip scrolls sideways (wheel too), and a button lists every open tab.
import { isNil, isNotNil } from 'es-toolkit';
import { Fragment, useEffect, useRef, useState } from 'react';

import { ArtifactIcon } from '@/features/logbook/log/ArtifactIcon';
import { Icon } from '@/features/logbook/ui/icons';

import type { KeyboardEvent as ReactKeyboardEvent, ReactNode, WheelEvent } from 'react';
import type { IArtifact } from '@/features/logbook/api/log-files';

const TAB =
  'group relative flex h-10 cursor-pointer items-center gap-2 rounded-t-[12px] border border-b-0 border-transparent pr-1.5 pl-3 text-[13px] font-semibold text-neutral-4 outline-none transition-colors duration-150 ease-[ease] hover:bg-white/70 hover:text-primary-9 focus-visible:ring-2 focus-visible:ring-primary-4 focus-visible:ring-inset aria-selected:z-1 aria-selected:border-rule aria-selected:bg-white aria-selected:text-primary-9';
const CLOSE =
  'grid size-6 flex-none place-items-center rounded-full text-neutral-4 hover:bg-fill-2 hover:text-primary-9';

export interface IEditorTabsProps {
  readonly title: string;
  readonly pageTitle: string | null; // the section shown, after the log's name; null: the main page
  readonly status: ReactNode; // the page's save status, at the end of its tab (SaveStatus)
  readonly canRename: boolean;
  readonly onRename: (name: string) => Promise<unknown>;
  readonly artifacts: readonly IArtifact[];
  readonly active: string | null; // an artifact id; null: the log
  readonly onSelect: (id: string | null) => void;
  readonly onClose: (id: string) => void;
}

// The title as a field: Enter or leaving it saves, Escape undoes.
function TitleField({
  title,
  onRename,
}: {
  readonly title: string;
  readonly onRename: (name: string) => Promise<unknown>;
}) {
  const [value, setValue] = useState(title);
  useEffect(() => setValue(title), [title]);
  const save = (): void => {
    const name = value.trim();
    if (name.length === 0 || name === title) {
      setValue(title);
      return;
    }
    onRename(name).catch(() => setValue(title));
  };
  return (
    <input
      className="w-full min-w-0 truncate rounded-[6px] border-0 bg-transparent p-0 text-[13px] font-bold text-primary-9 outline-none focus:bg-soft"
      aria-label="Name of the log"
      title="Rename the log"
      value={value}
      maxLength={300}
      onChange={(event) => setValue(event.target.value)}
      onBlur={save}
      onKeyDown={(event) => {
        if (event.key === 'Enter') event.currentTarget.blur();
        if (event.key === 'Escape') {
          const field = event.currentTarget;
          setValue(title);
          requestAnimationFrame(() => field.blur());
        }
      }}
    />
  );
}

interface ITab {
  readonly id: string | null;
  readonly label: string;
  readonly icon: ReactNode;
}

// Every open tab in a list, for when they do not all fit.
function TabList({
  tabs,
  active,
  onSelect,
  onClose,
  onDone,
}: {
  readonly tabs: readonly ITab[];
  readonly active: string | null;
  readonly onSelect: (id: string | null) => void;
  readonly onClose: (id: string) => void;
  readonly onDone: () => void;
}) {
  return (
    <>
      <button
        type="button"
        className="fixed inset-0 z-40 cursor-default border-0 bg-transparent"
        aria-label="Close the list of tabs"
        onClick={onDone}
      />
      <div
        className="pop absolute top-11 right-0 z-41 flex max-h-[min(420px,70vh)] w-[280px] flex-col overflow-y-auto p-1.5"
        role="menu"
        aria-label="Open tabs"
        onKeyDown={(event) => event.key === 'Escape' && onDone()}
      >
        {tabs.map((tab) => (
          <div
            key={tab.id ?? 'log'}
            className="flex items-center gap-1 rounded-[10px] pr-1 hover:bg-fill-item-hover data-[on=true]:bg-fill-2"
            data-on={tab.id === active}
          >
            <button
              type="button"
              role="menuitem"
              className="flex min-w-0 flex-1 items-center gap-2.5 px-2.5 py-2 text-left text-[13px] font-semibold text-primary-9"
              onClick={() => {
                onSelect(tab.id);
                onDone();
              }}
            >
              <span className="flex flex-none">{tab.icon}</span>
              <span className="truncate">{tab.label}</span>
            </button>
            {isNil(tab.id) ? null : (
              <button
                type="button"
                className={CLOSE}
                aria-label={`Close ${tab.label}`}
                onClick={() => isNotNil(tab.id) && onClose(tab.id)}
              >
                <Icon name="close" size={11} stroke={2.6} />
              </button>
            )}
          </div>
        ))}
      </div>
    </>
  );
}

// A vertical wheel scrolls the strip sideways, as browser tab strips do.
const wheel = (event: WheelEvent<HTMLDivElement>): void => {
  if (Math.abs(event.deltaY) > Math.abs(event.deltaX))
    event.currentTarget.scrollLeft += event.deltaY;
};

export function EditorTabs(props: IEditorTabsProps) {
  const tabs: ITab[] = [
    { id: null, label: props.title, icon: <Icon name="notebook" size={15} /> },
    ...props.artifacts.map((artifact) => ({
      id: artifact.id,
      label: artifact.name,
      icon: <ArtifactIcon artifact={artifact} size={20} />,
    })),
  ];
  const activeAt = tabs.findIndex((tab) => tab.id === props.active);
  const strip = useRef<HTMLDivElement>(null);
  const [overflow, setOverflow] = useState(false);
  const [listOpen, setListOpen] = useState(false);

  // Whether the tabs fit: on a resize of the strip (ResizeObserver) and when tabs open or close.
  // biome-ignore lint/correctness/useExhaustiveDependencies: runs again on purpose when tabs open or close
  useEffect(() => {
    const el = strip.current;
    if (isNil(el)) return;
    const check = (): void => setOverflow(el.scrollWidth > el.clientWidth + 1);
    check();
    const observer = new ResizeObserver(check);
    observer.observe(el);
    return () => observer.disconnect();
  }, [tabs.length]);
  // The selected tab always shows.
  // biome-ignore lint/correctness/useExhaustiveDependencies: runs again on purpose when the selected tab or the tabs change
  useEffect(() => {
    strip.current
      ?.querySelector('[aria-selected="true"]')
      ?.scrollIntoView({ block: 'nearest', inline: 'nearest' });
  }, [props.active, tabs.length]);

  const keys = (id: string | null) => (event: ReactKeyboardEvent<HTMLDivElement>) => {
    if (event.target !== event.currentTarget) return;
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      props.onSelect(id);
    }
    if ((event.key === 'Delete' || event.key === 'Backspace') && isNotNil(id)) props.onClose(id);
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
        {tabs.map((tab, index) => {
          const selected = index === activeAt;
          const isLog = isNil(tab.id);
          return (
            <Fragment key={tab.id ?? 'log'}>
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
                className={`${TAB} ${isLog ? 'min-w-[150px] flex-[0_1_280px]' : 'min-w-[124px] flex-[0_1_200px]'}`}
                title={
                  isLog
                    ? `${props.title}${isNil(props.pageTitle) ? '' : ` / ${props.pageTitle}`}`
                    : `${tab.label} (read-only)`
                }
                onClick={() => props.onSelect(tab.id)}
                onKeyDown={keys(tab.id)}
              >
                <span className="flex flex-none">{tab.icon}</span>
                <span className="flex min-w-0 flex-1">
                  {isLog && selected && props.canRename ? (
                    <TitleField title={props.title} onRename={props.onRename} />
                  ) : (
                    <span className="truncate">{tab.label}</span>
                  )}
                  {isLog && isNotNil(props.pageTitle) ? (
                    <span className="flex min-w-0 flex-[0_1_auto] items-center gap-1 pl-1">
                      <span className="flex-none font-normal text-neutral-4">/</span>
                      <span className="truncate text-blue">{props.pageTitle}</span>
                    </span>
                  ) : null}
                </span>
                {isLog ? <span className="flex flex-none pr-1.5 pl-1">{props.status}</span> : null}
                {isNil(tab.id) ? null : (
                  <button
                    type="button"
                    className={`${CLOSE} opacity-0 transition-opacity group-hover:opacity-100 group-aria-selected:opacity-100 focus-visible:opacity-100 pointer-coarse:opacity-100`}
                    aria-label={`Close ${tab.label}`}
                    onClick={(event) => {
                      event.stopPropagation();
                      if (isNotNil(tab.id)) props.onClose(tab.id);
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
          <button
            type="button"
            className="inline-flex h-9 items-center gap-1 rounded-full px-2.5 text-[12px] font-bold text-primary-9 hover:bg-white aria-expanded:bg-white"
            aria-label={`All ${tabs.length} open tabs`}
            aria-haspopup="menu"
            aria-expanded={listOpen}
            title="All open tabs"
            onClick={() => setListOpen((open) => !open)}
          >
            {tabs.length}
            <Icon name="chevronDown" size={14} stroke={2.4} />
          </button>
          {listOpen ? (
            <TabList
              tabs={tabs}
              active={props.active}
              onSelect={props.onSelect}
              onClose={props.onClose}
              onDone={() => setListOpen(false)}
            />
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

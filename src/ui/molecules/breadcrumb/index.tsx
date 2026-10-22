/* eslint-disable react/jsx-props-no-spreading */

import { MoreOutlined, RightOutlined } from '@ant-design/icons';
import { Slot } from '@radix-ui/react-slot';
import { RiArrowDownSLine } from '@remixicon/react';
import Link from 'next/link';
import { Fragment } from 'react';

import { ChevronRightStroke } from '@/components/icons';
import { ButtonCopyId } from '@/ui/molecules/button-copy-id';
import { MiddleEllipsis } from '@/ui/molecules/middle-ellipsis';
import { Popover, PopoverContent, PopoverTrigger } from '@/ui/molecules/popover';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/ui/molecules/tooltip';
import { cn } from '@/utils/css-class';

import type * as React from 'react';

function Breadcrumb({ ...props }: React.ComponentProps<'nav'>) {
  return <nav aria-label="Breadcrumb" data-slot="breadcrumb" {...props} />;
}

function BreadcrumbList({ className, ...props }: React.ComponentProps<'ol'>) {
  return (
    <ol
      data-slot="breadcrumb-list"
      className={cn(
        'text-muted-foreground flex flex-wrap items-center gap-0.5 text-base break-words',
        className
      )}
      {...props}
    />
  );
}

function BreadcrumbItem({ className, ...props }: React.ComponentProps<'li'>) {
  return (
    <li
      data-slot="breadcrumb-item"
      className={cn('inline-flex min-w-0 items-center gap-1.5', className)}
      {...props}
    />
  );
}

function BreadcrumbLink({
  asChild,
  className,
  ...props
}: React.ComponentProps<'a'> & {
  asChild?: boolean;
}) {
  const Comp = asChild ? Slot : 'a';

  return (
    <Comp
      data-slot="breadcrumb-link"
      className={cn('hover:text-foreground transition-colors', className)}
      {...props}
    />
  );
}

function BreadcrumbPage({ className, ...props }: React.ComponentProps<'span'>) {
  return (
    <span
      data-slot="breadcrumb-page"
      aria-current="page"
      className={cn('text-foreground font-normal', className)}
      {...props}
    />
  );
}

function BreadcrumbSeparator({ children, className, ...props }: React.ComponentProps<'li'>) {
  return (
    <li
      data-slot="breadcrumb-separator"
      role="presentation"
      aria-hidden="true"
      className={cn('[&>svg]:size-3.5', className)}
      {...props}
    >
      {children ?? <RightOutlined />}
    </li>
  );
}

function BreadcrumbEllipsis({ className, ...props }: React.ComponentProps<'span'>) {
  return (
    <span
      data-slot="breadcrumb-ellipsis"
      role="presentation"
      aria-hidden="true"
      className={cn('flex size-9 items-center justify-center', className)}
      {...props}
    >
      <MoreOutlined className="size-4 rotate-90" />
      <span className="sr-only">More</span>
    </span>
  );
}

/** The row the trail sits in (no background of its own); children after the trail are trailing actions (copy, close…). */
function BreadcrumbChip({ className, ...props }: React.ComponentProps<'div'>) {
  return (
    <div
      data-slot="breadcrumb-chip"
      className={cn(
        'flex h-10 min-w-0 items-center gap-1 empty:hidden [&_nav]:min-w-0 [&_ol]:flex-nowrap',
        className
      )}
      {...props}
    />
  );
}

/** What a copy button puts on the clipboard, and how it is announced (`aria-label`, tooltip). */
export type BreadcrumbCopy = { value: string; label: string };

/** One entry of a menu crumb: its name, an optional kind label, and its own copy button. */
export type BreadcrumbMenuEntry = {
  key: string;
  label: string;
  hint?: string;
  copy: BreadcrumbCopy;
};

export type BreadcrumbTrailItem = {
  key: string;
  label: React.ReactNode;
  /** Renders a link. Without it, `onClick` renders a button and neither renders plain text. */
  href?: string;
  onClick?: () => void;
  /** Defaults to true for the last item. Sets `aria-current="page"` and the bold weight. */
  current?: boolean;
  title?: string;
  /**
   * The crumb's full text when it may be too long for the room it gets: shown middle-ellipsized
   * (the end stays readable), with the full text in a white tooltip on hover and keyboard focus.
   * Replaces `label`.
   */
  ellipsis?: string;
  className?: string;
  /** A copy icon button right after the crumb (e.g. the entity's id). */
  copy?: BreadcrumbCopy;
  /**
   * The crumb stands for several things: it becomes a dropdown trigger listing them, each with
   * its own copy button. Wins over `href` / `onClick`.
   */
  menu?: BreadcrumbMenuEntry[];
};

const CRUMB =
  'text-primary-9 focus-visible:ring-primary-9 rounded-full px-2 py-1 text-base outline-none transition-colors focus-visible:ring-2';

/** Bare glyph at rest; the round chip only materialises under the pointer. */
function BreadcrumbCopyButton({
  copy,
  tooltip = true,
}: {
  copy: BreadcrumbCopy;
  /** Off where the copy button sits in a list of long names (a popover): `aria-label` only. */
  tooltip?: boolean;
}) {
  return (
    <ButtonCopyId
      iconOnly
      value={copy.value}
      label={copy.label}
      // "Copy <name>": the verb stays regular, the entity name is bold
      tooltip={
        tooltip && (
          <>
            {copy.label.split(' ')[0]} <b>{copy.label.split(' ').slice(1).join(' ')}</b>
          </>
        )
      }
      classNames={{
        button: 'size-6 shrink-0 p-0',
        icon: cn(
          'size-6 rounded-full border-transparent bg-transparent transition-colors',
          'hover:border-primary-8 hover:bg-primary-8 hover:[&_svg]:text-white'
        ),
        glyph: 'size-3.5 text-primary-9',
        tooltip: 'max-w-72 bg-white text-primary-9 text-wrap break-words shadow-lg',
        tooltipArrow: 'bg-white!',
      }}
    />
  );
}

function BreadcrumbMenu({
  entries,
  label,
  className,
  ariaCurrent,
}: {
  entries: BreadcrumbMenuEntry[];
  label: React.ReactNode;
  className: string;
  ariaCurrent?: 'page';
}) {
  return (
    <Popover>
      <PopoverTrigger asChild>
        <button
          type="button"
          aria-current={ariaCurrent}
          className={cn(
            className,
            'hover:bg-gray-200 hover:text-primary-7 inline-flex items-center gap-0.5'
          )}
        >
          {label}
          <RiArrowDownSLine aria-hidden className="size-4 shrink-0" />
        </button>
      </PopoverTrigger>
      <PopoverContent
        align="start"
        sideOffset={8}
        className="max-h-96 w-96 overflow-y-auto rounded-2xl border border-[oklch(0.968_0.007_247.896)] bg-white p-2 shadow-lg"
      >
        <ul className="flex flex-col gap-1">
          {entries.map((entry) => (
            <li
              key={entry.key}
              className="flex items-center gap-3 rounded-xl px-3 py-2 transition-colors hover:bg-[oklch(0.968_0.007_247.896)]"
            >
              <div className="min-w-0 flex-1">
                {entry.hint ? (
                  <div className="text-xs font-bold text-[oklch(0.704_0.04_256.788)] uppercase">
                    {entry.hint}
                  </div>
                ) : null}
                <div className="text-primary-9 text-sm font-medium break-words">{entry.label}</div>
              </div>
              <BreadcrumbCopyButton copy={entry.copy} tooltip={false} />
            </li>
          ))}
        </ul>
      </PopoverContent>
    </Popover>
  );
}

function BreadcrumbTrailCrumb({ item, current }: { item: BreadcrumbTrailItem; current: boolean }) {
  const crumb = <BreadcrumbTrailLabel item={item} current={current} />;
  return item.copy ? (
    <>
      {crumb}
      <BreadcrumbCopyButton copy={item.copy} />
    </>
  ) : (
    crumb
  );
}

function BreadcrumbTrailLabel({ item, current }: { item: BreadcrumbTrailItem; current: boolean }) {
  if (!item.ellipsis) {
    return <BreadcrumbTrailLink item={item} label={item.label} current={current} />;
  }
  // white tooltip (the repo's light variant) with the full text, on hover and keyboard focus
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <BreadcrumbTrailLink
          item={item}
          label={<MiddleEllipsis text={item.ellipsis} />}
          current={current}
        />
      </TooltipTrigger>
      <TooltipContent
        avoidCollisions
        side="bottom"
        sideOffset={4}
        className="text-primary-9 z-999 max-w-72 bg-white text-sm text-wrap break-words shadow-lg"
        arrowClassName="bg-white! z-9999"
      >
        {item.ellipsis}
      </TooltipContent>
    </Tooltip>
  );
}

/** The crumb element; `rest` carries the tooltip trigger's handlers and ref onto it. */
function BreadcrumbTrailLink({
  item,
  label,
  current,
  ...rest
}: {
  item: BreadcrumbTrailItem;
  label: React.ReactNode;
  current: boolean;
} & React.HTMLAttributes<HTMLElement>) {
  const className = cn(
    CRUMB,
    // entity crumbs (they carry a copy button or a menu) are always bold
    current || item.copy || item.menu ? 'font-bold' : 'font-light',
    // a shrinkable crumb lets its text shrink with it (middle ellipsis) instead of overflowing
    item.ellipsis && 'flex min-w-0',
    item.className
  );
  const ariaCurrent = current ? 'page' : undefined;

  if (item.menu) {
    return (
      <BreadcrumbMenu
        entries={item.menu}
        label={label}
        className={className}
        ariaCurrent={ariaCurrent}
      />
    );
  }
  if (item.href) {
    return (
      <BreadcrumbLink asChild className={cn(className, 'hover:bg-gray-200 hover:text-primary-7')}>
        <Link
          {...rest}
          href={item.href}
          onClick={item.onClick}
          title={item.title}
          aria-current={ariaCurrent}
        >
          {label}
        </Link>
      </BreadcrumbLink>
    );
  }
  if (item.onClick) {
    return (
      <button
        {...rest}
        type="button"
        onClick={item.onClick}
        title={item.title}
        aria-current={ariaCurrent}
        className={cn(className, 'hover:bg-gray-200 hover:text-primary-7')}
      >
        {label}
      </button>
    );
  }
  return (
    // BreadcrumbPage defaults to "page"; the trail decides which crumb is current
    <BreadcrumbPage
      {...rest}
      title={item.title}
      className={className}
      aria-current={ariaCurrent}
      // reachable by keyboard so the full-text tooltip can open on focus
      tabIndex={item.ellipsis ? 0 : undefined}
    >
      {label}
    </BreadcrumbPage>
  );
}

/** Data-driven trail: items in, `nav > ol > li` out. Customise with `className` and `separator`. */
function BreadcrumbTrail({
  items,
  separator = <ChevronRightStroke className="size-4" />,
  ...props
}: Omit<React.ComponentProps<typeof Breadcrumb>, 'children'> & {
  items: BreadcrumbTrailItem[];
  separator?: React.ReactNode;
}) {
  return (
    <Breadcrumb {...props}>
      <BreadcrumbList>
        {items.map((item, index) => (
          <Fragment key={item.key}>
            {index > 0 && (
              <BreadcrumbSeparator className="text-primary-9 shrink-0">
                {separator}
              </BreadcrumbSeparator>
            )}
            {/* a menu crumb is a short fixed title (`Multiple entities (3)`): it never shrinks */}
            <BreadcrumbItem
              className={
                index < items.length - 1 || item.menu ? 'shrink-0 whitespace-nowrap' : undefined
              }
            >
              <BreadcrumbTrailCrumb
                item={item}
                current={item.current ?? index === items.length - 1}
              />
            </BreadcrumbItem>
          </Fragment>
        ))}
      </BreadcrumbList>
    </Breadcrumb>
  );
}

export {
  Breadcrumb,
  BreadcrumbChip,
  BreadcrumbEllipsis,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
  BreadcrumbTrail,
};

/* eslint-disable react/jsx-props-no-spreading */

import { forwardRef, ForwardedRef } from 'react';
import { Slot } from '@radix-ui/react-slot';
import { CaretRightOutlined, MoreOutlined } from '@ant-design/icons';
import { classNames } from '@/util/utils';

function BreadcrumbInner(
  props: React.ComponentPropsWithoutRef<'nav'>,
  ref: ForwardedRef<HTMLElement>
) {
  return <nav ref={ref} aria-label="breadcrumb" {...props} />;
}

function BreadcrumbListInner(
  { className, ...props }: React.ComponentPropsWithoutRef<'ol'>,
  ref: ForwardedRef<HTMLOListElement>
) {
  return (
    <ol
      ref={ref}
      className={classNames(
        'text-muted-foreground flex flex-wrap items-center gap-1.5 break-words text-sm',
        className
      )}
      {...props}
    />
  );
}

function BreadcrumbItemInner(
  { className, ...props }: React.ComponentPropsWithoutRef<'li'>,
  ref: ForwardedRef<HTMLLIElement>
) {
  return (
    <li
      ref={ref}
      className={classNames('inline-flex items-center gap-1.5', className)}
      {...props}
    />
  );
}

function BreadcrumbLinkInner(
  { asChild, className, ...props }: React.ComponentPropsWithoutRef<'a'> & { asChild?: boolean },
  ref: ForwardedRef<HTMLAnchorElement>
) {
  const Comp = asChild ? Slot : 'a';
  return (
    <Comp
      ref={ref}
      className={classNames('hover:text-foreground transition-colors', className)}
      {...props}
    />
  );
}

function BreadcrumbPageInner(
  { className, ...props }: React.ComponentPropsWithoutRef<'span'>,
  ref: ForwardedRef<HTMLSpanElement>
) {
  return (
    <span
      ref={ref}
      role="link"
      aria-disabled="true"
      aria-current="page"
      className={classNames('text-foreground font-normal', className)}
      {...props}
    />
  );
}

function BreadcrumbSeparator({
  children,
  className,
  ...props
}: React.ComponentPropsWithoutRef<'li'>) {
  return (
    <li
      role="presentation"
      aria-hidden="true"
      className={classNames('[&>svg]:h-3.5 [&>svg]:w-3.5', className)}
      {...props}
    >
      {children ?? <CaretRightOutlined />}
    </li>
  );
}

function BreadcrumbEllipsisInner({ className, ...props }: React.ComponentPropsWithoutRef<'span'>) {
  return (
    <span
      role="presentation"
      aria-hidden="true"
      className={classNames('flex h-9 w-9 items-center justify-center', className)}
      {...props}
    >
      <MoreOutlined className="h-4 w-4" />
      <span className="sr-only">More</span>
    </span>
  );
}

const Breadcrumb = forwardRef(BreadcrumbInner);
const BreadcrumbList = forwardRef(BreadcrumbListInner);
const BreadcrumbItem = forwardRef(BreadcrumbItemInner);
const BreadcrumbLink = forwardRef(BreadcrumbLinkInner);
const BreadcrumbPage = forwardRef(BreadcrumbPageInner);

export {
  Breadcrumb,
  BreadcrumbSeparator,
  BreadcrumbEllipsisInner,
  BreadcrumbList,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbPage,
};

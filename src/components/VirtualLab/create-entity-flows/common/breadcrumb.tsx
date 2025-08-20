import { forwardRef, ForwardedRef } from 'react';
import { CaretRightOutlined } from '@ant-design/icons';
import { classNames } from '@/util/utils';

function BreadcrumbInner(
  props: React.ComponentPropsWithoutRef<'nav'>,
  ref: ForwardedRef<HTMLElement>
) {
  return <nav ref={ref} aria-label="breadcrumb" {...props} />;
}

function BreadcrumbListBase(
  { className, ...props }: React.ComponentPropsWithoutRef<'ol'>,
  ref: ForwardedRef<HTMLOListElement>
) {
  return (
    <ol
      ref={ref}
      className={classNames(
        'text-muted-foreground flex flex-wrap items-center gap-1.5 text-sm break-words',
        className
      )}
      {...props}
    />
  );
}

function BreadcrumbItemBase(
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

const Breadcrumb = forwardRef(BreadcrumbInner);
const BreadcrumbList = forwardRef(BreadcrumbListBase);
const BreadcrumbItem = forwardRef(BreadcrumbItemBase);

export { Breadcrumb, BreadcrumbSeparator, BreadcrumbList, BreadcrumbItem };

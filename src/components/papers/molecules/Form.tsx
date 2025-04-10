import { HTMLProps } from 'react';
import kebabCase from 'lodash/kebabCase';

import { classNames } from '@/util/utils';

export function FormActiveLabel({
  title,
  className,
}: {
  title: string;
  className?: HTMLProps<HTMLElement>['className'];
}) {
  return (
    <span className={classNames('text-primary-8 mb-1 text-base font-bold', className)}>
      {title}
    </span>
  );
}

export function FormStaleLabel({
  title,
  className,
}: {
  title: string;
  className?: HTMLProps<HTMLElement>['className'];
}) {
  return (
    <h3 className={classNames('text-neutral-4 mb-2 text-base font-bold', className)}>{title}</h3>
  );
}

export function FormError({ errors }: { errors: string[] }) {
  return errors.map((err) => (
    <div key={`error-paper-${kebabCase(err)}`} className="flex py-1 text-sm text-rose-600">
      {err}
    </div>
  ));
}

import { get } from 'es-toolkit/compat';
import ReactMarkdown from 'react-markdown';

import { Explanation } from '@/components/explanation';
import { type TViewVariant, ViewVariant } from '@/constants';
import { getEntityByCoreType } from '@/entity-configuration/domain/helpers';
import { detailViewLinkClass } from '@/ui/segments/detail-view/variant-styles';
import { classNames } from '@/util/utils';
import { cn } from '@/utils/css-class';

import { validationDescription } from '../hooks/dictionary';

import type { TRetrieveEntityOutput } from '@/entity-configuration/domain/requests';

import styles from './validation-explanation.module.css';

export interface ValidationExplanationProps {
  className?: string;
  passed: boolean;
  entity: TRetrieveEntityOutput;
  variant?: TViewVariant;
}

export function ValidationExplanation({
  className,
  passed,
  entity,
  variant = ViewVariant.Light,
}: ValidationExplanationProps) {
  const entityConfig = getEntityByCoreType({ type: entity.type });
  const title = entityConfig?.title;
  const text = get(validationDescription, entity.type, null);
  if (!text) return null;

  return (
    <Explanation
      hasDescription
      variant={variant}
      title={
        <>
          <div className={cn({ 'text-white': variant === ViewVariant.Default })}>
            {title} Validation
          </div>
          <div className={passed ? styles.passed : styles.failed}>
            {passed ? 'passed' : 'failed'}
          </div>
        </>
      }
      className={classNames(styles.validationDescription, className)}
    >
      <ReactMarkdown
        components={{
          a: ({ children, href }) => (
            <a
              href={href}
              target="_blank"
              rel="noreferrer"
              className={cn('underline', detailViewLinkClass(variant))}
            >
              {children}
            </a>
          ),
          p: ({ children }) => <div>{children}</div>,
          h2: ({ children }) => <h3 className="font-bold text-base mt-4 mb-2">{children}</h3>,
          h3: ({ children }) => <h3 className="font-bold text-lg mt-4 mb-2">{children}</h3>,
          ul: ({ children }) => (
            <div className="mb-0.5">
              <ul className="list-disc pl-5">{children}</ul>
            </div>
          ),
          ol: ({ children }) => (
            <div className="my-2">
              <ul className="list-decimal pl-5">{children}</ul>
            </div>
          ),
        }}
      >
        {text}
      </ReactMarkdown>
    </Explanation>
  );
}

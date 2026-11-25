import { useId } from 'react';

import { type TViewVariant, ViewVariant } from '@/constants';
import { TextPatternTransformer } from '@/ui/molecules/text-pattern-transformer';
import {
  detailViewHeadingClass,
  detailViewLinkClass,
  detailViewValueClass,
} from '@/ui/segments/detail-view/variant-styles';
import { classNames } from '@/util/utils';
import { cn } from '@/utils/css-class';

import type { FlatValidationResult } from '@/features/model-analysis/viewer/container/hooks';
import type { IValidationDocumentation } from '@/features/model-analysis/viewer/container/hooks/dictionary';

import styles from './documentation.module.css';

export function TransformedLink({
  url,
  className,
}: {
  url: string;
  className?: React.ComponentProps<'a'>['className'];
}) {
  const markdownMatch = url.match(markdownLinkRegex);

  const href = markdownMatch?.[2] ?? (url.startsWith('www.') ? `https://${url}` : url);
  const label = markdownMatch?.[1] ?? url;

  const id = useId();
  return (
    <a key={id} href={href} target="_blank" rel="noopener noreferrer" className={className}>
      {label}
    </a>
  );
}
export interface DocumentationProps {
  className?: string;
  value: FlatValidationResult;
}
const markdownLinkRegex = /\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)/;

export default function Documentation({
  className,
  value,
  variant = ViewVariant.Light,
}: DocumentationProps & { variant?: TViewVariant }) {
  const { documentation, resultDescription } = value;

  if (!documentation && !resultDescription) return null;

  return (
    <div
      id={`${documentation}_${value.assetId}`}
      className={classNames(
        className,
        styles.documentation,
        variant === ViewVariant.Default && detailViewValueClass(variant)
      )}
    >
      {value.extraVariables && (
        <>
          <ul>
            {Object.keys(value.extraVariables).map((key) => (
              <li key={key}>
                <span>{key}: </span>
                <strong>{value.extraVariables?.[key].value}</strong>{' '}
                <span>{value.extraVariables?.[key].unit}</span>
              </li>
            ))}
          </ul>
          <hr />
        </>
      )}
      {resultDescription ? (
        <div>{resultDescription}</div>
      ) : (
        documentation && <DictionaryDocumentation documentation={documentation} variant={variant} />
      )}
    </div>
  );
}

function DictionaryDocumentation({
  documentation,
  variant,
}: {
  documentation: IValidationDocumentation;
  variant: TViewVariant;
}) {
  const { protocol } = documentation;
  return (
    <>
      <TextPatternTransformer
        regex={markdownLinkRegex}
        component={(match) => (
          <TransformedLink url={match} className={cn('underline', detailViewLinkClass(variant))} />
        )}
      >
        {documentation.description}
      </TextPatternTransformer>
      <div className={styles.grid}>
        {protocol?.type && (
          <>
            <div>Type:</div>
            <div>{protocol.type}</div>
          </>
        )}
        {protocol?.delay && (
          <>
            <div>Delay:</div>
            <div>{protocol.delay}</div>
          </>
        )}
        {protocol?.duration && (
          <>
            <div>Duration:</div>
            <div>{protocol?.duration}</div>
          </>
        )}
        {protocol?.amplitude && (
          <>
            <div>Amplitude:</div>
            <div>{protocol.amplitude}</div>
          </>
        )}
        {protocol?.totalDuration && (
          <>
            <div>Total duration:</div>
            <div>{protocol.totalDuration}</div>
          </>
        )}
      </div>
      {documentation.validation_condition && (
        <div className="py-5">
          <h4 className={cn('font-black', detailViewHeadingClass(variant, 'xl'))}>
            Validation condition:{' '}
          </h4>
          {documentation.validation_condition}
        </div>
      )}
    </>
  );
}

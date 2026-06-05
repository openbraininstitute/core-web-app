import { type TViewVariant, ViewVariant } from '@/constants';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/ui/molecules/select';
import { detailViewLabelClass } from '@/ui/segments/detail-view/variant-styles';
import { isType } from '@/util/type-guards';
import { classNames } from '@/util/utils';
import { cn } from '@/utils/css-class';

import type { ReactNode } from 'react';
import type { FlatValidationResult } from '@/features/model-analysis/viewer/container/hooks';

import styles from './select-analysis.module.css';

export interface SelectAnalysisProps {
  className?: string;
  value: string;
  onChange(value: string): void;
  results: FlatValidationResult[];
  variant?: TViewVariant;
}

export interface SelectAnalysisOption {
  label: string | FlatValidationResult;
  value: string;
}

export function SelectAnalysis({
  className,
  value,
  onChange,
  results,
  variant = ViewVariant.Light,
}: SelectAnalysisProps) {
  const options: SelectAnalysisOption[] = [
    { label: 'All', value: 'all' },
    ...results.map((result) => {
      return {
        label: result,
        value: result.id,
      };
    }),
  ];

  return (
    <div className={classNames(className, styles.selectAnalysis)}>
      <div className={cn('ml-3 inline-block', detailViewLabelClass(variant))}>SELECT ANALYSIS</div>
      <Select value={value} onValueChange={onChange}>
        <SelectTrigger
          size="default"
          className="min-w-70 h-11! text-lg! rounded-full bg-white border-gray-300 focus-visible:ring-0"
        >
          <SelectValue />
        </SelectTrigger>
        <SelectContent
          style={{ width: "var('--radix-select-trigger-width')" }}
          className="rounded-lg bg-white border-gray-300"
        >
          {options.map((option) => (
            <SelectItem
              checkClassName="text-primary-8"
              key={option.value}
              value={option.value}
              className={cn('cursor-pointer text-lg w-full [&_span:nth-child(2)]:w-full group')}
            >
              <ComboItemLabel label={option.label} />
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}

interface ComboItemLabelProps {
  label: ReactNode | FlatValidationResult;
}

function ComboItemLabel({ label }: ComboItemLabelProps) {
  if (!label) return null;

  if (isFlatValidationResult(label)) {
    return (
      <div className={`${styles.item} item`}>
        <div>{label.name}</div>
        <div
          className={cn(
            label.passed ? styles.pass : styles.fail,
            'group-data-[state=checked]:shadow-xl'
          )}
        />
      </div>
    );
  }

  return <div className="text-primary-8 font-bold">{label}</div>;
}

function isFlatValidationResult(
  data: FlatValidationResult | ReactNode
): data is FlatValidationResult {
  return isType(data, { name: 'string', passed: 'boolean' });
}

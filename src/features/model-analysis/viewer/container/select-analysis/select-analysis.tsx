/* eslint-disable react/no-unstable-nested-components */
import React, { ReactNode } from 'react';
import { Select } from 'antd';

import { FlatValidationResult } from '../hooks';

import { classNames } from '@/util/utils';
import { isType } from '@/util/type-guards';

import styles from './select-analysis.module.css';

export interface SelectAnalysisProps {
  className?: string;
  value: string;
  onChange(value: string): void;
  results: FlatValidationResult[];
}

export interface SelectAnalysisOption {
  label: string | FlatValidationResult;
  value: string;
}

export function SelectAnalysis({ className, value, onChange, results }: SelectAnalysisProps) {
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
      <div className="text-neutral-3 ml-3 inline-block">SELECT ANALYSIS</div>
      <Select<string, { label: string | FlatValidationResult }>
        options={options}
        className="min-w-[200px]"
        value={value}
        onChange={onChange}
        labelRender={(option) => (
          <div className="text-primary-8 font-bold">
            {isFlatValidationResult(option.label) ? option.label.name : option.label}
          </div>
        )}
        optionRender={(option) => <ComboItemLabel label={option.label} />}
      />
    </div>
  );
}

interface ComboItemLabelProps {
  label: ReactNode | FlatValidationResult;
}

function ComboItemLabel({ label }: ComboItemLabelProps) {
  if (!label) return null;

  return (
    <div className={styles.item}>
      {isFlatValidationResult(label) ? (
        <>
          <div>{label.name}</div>
          <div className={label.passed ? styles.pass : styles.fail} />
        </>
      ) : (
        `${label}`
      )}
    </div>
  );
}

function isFlatValidationResult(
  data: FlatValidationResult | ReactNode
): data is FlatValidationResult {
  return isType(data, { name: 'string', passed: 'boolean' });
}

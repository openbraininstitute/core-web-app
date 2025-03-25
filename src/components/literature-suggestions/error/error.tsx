import React from 'react';

import { classNames } from '@/util/utils';
import { isString, isType } from '@/util/type-guards';

import styles from './error.module.css';

export interface ErrorProps {
  className?: string;
  value: unknown;
}

export default function ErrorPanel({ className, value }: ErrorProps) {
  return <div className={classNames(className, styles.error)}>{renderError(value)}</div>;
}

function extractString(error: unknown) {
  if (error instanceof Error) return error.message;
  if (isString(error)) return error;
  return JSON.stringify(error);
}

function extractJSON(error: unknown) {
  const str = extractString(error);
  try {
    return JSON.parse(str);
  } catch {
    return str;
  }
}

function renderError(error: unknown): React.ReactNode {
  const value = extractJSON(error);
  if (isRateLimitError(value)) return renderRateLimitError(value);
  return <pre>{JSON.stringify(value, null, '  ')}</pre>;
}

interface RateLimitError {
  detail: {
    error: string;
    retry_after: number;
  };
}

export function isRateLimitError(data: unknown): data is RateLimitError {
  return isType(data, {
    detail: {
      error: 'string',
      retry_after: 'number',
    },
  });
}

function renderRateLimitError(value: RateLimitError): React.ReactNode {
  const t = Math.floor(value.detail.retry_after / 60);
  const minutes = t % 60;
  const hours = Math.floor((t - minutes) / 60);
  return (
    <>
      <div>Rate limit exceeded!</div>
      {hours === 0 && <div>Please try again in {minutes} minutes.</div>}
      {hours === 1 && <div>Please try again in one hour and {minutes} minutes.</div>}
      {hours > 1 && <div>Please try again in approximately {hours + 1} hours.</div>}
    </>
  );
}

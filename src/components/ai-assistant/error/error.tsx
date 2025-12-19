import type React from 'react';
import { isString, isType } from '@/util/type-guards';
import { classNames } from '@/util/utils';

import styles from './error.module.css';

interface ErrorProps {
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
  if (isInsufficentFundsError(value)) return renderInsufficentFundsError();
  if (isRateLimitError(value)) return renderRateLimitError(value);
  return <pre>{JSON.stringify(value, null, '  ')}</pre>;
}

interface InsufficentFundsError {
  message: 'Error: InsufficientFundsError';
}

function isInsufficentFundsError(data: unknown): data is InsufficentFundsError {
  return isType(data, {
    message: ['literal', 'Error: InsufficientFundsError'],
  });
}

function renderInsufficentFundsError() {
  return (
    <div>
      <div>We are sorry,</div>
      <div>but you don&apos;t have sufficient funds to use the AI Assistant.</div>
    </div>
  );
}

interface RateLimitError {
  detail: {
    error: string;
    retry_after: number;
  };
}

function isRateLimitError(data: unknown): data is RateLimitError {
  return isType(data, {
    detail: {
      error: 'string',
      retry_after: 'number',
    },
  });
}

function renderRateLimitError(value: RateLimitError): React.ReactNode {
  const t = Math.ceil(value.detail.retry_after / 60);
  const minutes = t % 60;
  const hours = Math.floor((t - minutes) / 60);
  const when = figureWhen(hours, minutes);
  return (
    <>
      <div>You have reached the limit of questions you can ask for free.</div>
      <div>Please use a virtual lab, or try agin in {when}.</div>
    </>
  );
}

/**
 * Create a user friendly text of the remaining time.
 */
function figureWhen(hours: number, minutes: number) {
  if (hours === 0) return `${minutes} minutes`;
  if (hours === 1) return `one hour and ${minutes} minutes`;
  return `approximately ${hours + 1} hours`;
}

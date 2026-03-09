import { ExclamationCircleOutlined } from '@ant-design/icons';

import { isString, isType } from '@/util/type-guards';
import { classNames } from '@/util/utils';

import type React from 'react';

import styles from './error.module.css';

interface ErrorProps {
  className?: string;
  value: unknown;
}

export default function ErrorPanel({ className, value }: ErrorProps) {
  return <div className={classNames(className, styles.errorContainer)}>{renderError(value)}</div>;
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
  if (isHealthCheckError(value)) return renderHealthCheckError(value);
  return renderGenericError();
}

interface InsufficentFundsError {
  message: 'Error: InsufficientFundsError';
}

function isInsufficentFundsError(data: unknown): data is InsufficentFundsError {
  return isType(data, {
    message: ['literal', 'Error: InsufficientFundsError', 'Error: AccountingReservationError'],
  });
}

function isHealthCheckError(data: unknown): data is string {
  return isString(data) && data === 'Unable to connect to AI assistant service';
}

function renderInsufficentFundsError() {
  return (
    <div className={styles.errorCard}>
      <div className={styles.errorIcon}>
        <ExclamationCircleOutlined />
      </div>
      <div className={styles.errorContent}>
        <h3 className={styles.errorTitle}>Insufficient Funds</h3>
        <p className={styles.errorMessage}>
          We are sorry, but your project doesn&apos;t have sufficient funds to use the AI Assistant.
        </p>
        <p className={styles.errorHint}>
          Please contact your Virtual Lab's administrator or use free chat credits when available.
        </p>
      </div>
    </div>
  );
}

function renderHealthCheckError(message: string) {
  return (
    <div className={styles.errorCard}>
      <div className={styles.errorIcon}>
        <ExclamationCircleOutlined />
      </div>
      <div className={styles.errorContent}>
        <h3 className={styles.errorTitle}>Connection Error</h3>
        <p className={styles.errorMessage}>{message}</p>
        <p className={styles.errorHint}>
          Please try again later or contact support if the issue persists.
        </p>
      </div>
    </div>
  );
}

function renderGenericError() {
  return (
    <div className={styles.errorCard}>
      <div className={styles.errorIcon}>
        <ExclamationCircleOutlined />
      </div>
      <div className={styles.errorContent}>
        <h3 className={styles.errorTitle}>Something went wrong</h3>
        <p className={styles.errorMessage}>
          We encountered an unexpected error while processing your request.
        </p>
      </div>
    </div>
  );
}

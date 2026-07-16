/**
 * ToolPayload — renders a section (Arguments or Result) in the active view mode.
 * Optionally renders the Display/Raw toggle inline with the label.
 */
import { Component, type ReactNode, useMemo } from 'react';

import { cn } from '@/utils/css-class';

import DisplayValue from './DisplayValue';
import { safeParse } from './format';
import RawJson from './RawJson';
import { ViewToggle } from './ViewToggle';

import styles from './tool-payload.module.css';

interface ToolPayloadProps {
  value: unknown;
  /** Label shown in the header row (e.g. "Arguments", "Result") */
  label?: string;
  mode: 'display' | 'raw';
  /** When true, renders the Display/Raw toggle in the header row */
  showToggle?: boolean;
  /** First section — no top separator line */
  isFirst?: boolean;
  className?: string;
}

export default function ToolPayload({
  value,
  label,
  mode,
  showToggle,
  isFirst,
  className,
}: ToolPayloadProps) {
  const parsed = useMemo(() => safeParse(value), [value]);

  return (
    <div className={className}>
      {/* Header row: label on left, toggle on right */}
      {(label || showToggle) && (
        <div className={cn(styles.sectionHeader, isFirst && styles.sectionHeaderFirst)}>
          {label && <span className={styles.sectionLabel}>{label}</span>}
          {showToggle && <ViewToggle />}
        </div>
      )}

      {/* Content: no box in display mode, bordered box in raw mode */}
      <div className={cn(styles.payloadContent, mode === 'raw' && styles.payloadContentRaw)}>
        <ErrorBoundaryFallback value={parsed}>
          {mode === 'display' ? <DisplayValue value={parsed} /> : <RawJson value={parsed} />}
        </ErrorBoundaryFallback>
      </div>
    </div>
  );
}

/* === Error Boundary — falls back to Raw JSON on render crash === */

interface ErrorBoundaryProps {
  value: unknown;
  children: ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
}

class ErrorBoundaryFallback extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  state: ErrorBoundaryState = { hasError: false };

  static getDerivedStateFromError(): ErrorBoundaryState {
    return { hasError: true };
  }

  componentDidCatch() {
    // Swallow — we fall back to RawJson
  }

  render() {
    if (this.state.hasError) {
      return <RawJson value={this.props.value} />;
    }
    return this.props.children;
  }
}

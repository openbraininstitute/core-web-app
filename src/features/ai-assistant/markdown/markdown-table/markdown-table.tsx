'use client';

import {
  CheckOutlined,
  CopyOutlined,
  DownloadOutlined,
  FullscreenOutlined,
} from '@ant-design/icons';
import React from 'react';

import { MINIMAL_PANEL_SIZE, usePanelWidth } from '@/features/ai-assistant/hooks';
import FullscreenDialog from '@/features/ai-assistant/message-item/plots/fullscreen-dialog/fullscreen-dialog';

import styles from './markdown-table.module.css';

/** Threshold above which the table switches to multi-line wrapping mode. */
const WIDE_PANEL_THRESHOLD = MINIMAL_PANEL_SIZE + 250;

/**
 * A polished, responsive table wrapper for markdown-rendered tables.
 *
 * - Small panel: single-line cells with ellipsis truncation, horizontal scroll,
 *   and hover tooltip to reveal full text.
 * - Large panel: cells wrap across multiple lines, no truncation.
 *
 * Subtle shadow indicators appear on the edges when content overflows.
 * Hover toolbar provides fullscreen and CSV download actions.
 */
export function MarkdownTable({ children, ...props }: React.TableHTMLAttributes<HTMLTableElement>) {
  const scrollRef = React.useRef<HTMLDivElement>(null);
  const tableRef = React.useRef<HTMLTableElement>(null);
  const dialogRef = React.useRef<HTMLDialogElement>(null);
  const [canScrollLeft, setCanScrollLeft] = React.useState(false);
  const [canScrollRight, setCanScrollRight] = React.useState(false);
  const { panelWidth } = usePanelWidth();
  const isCompact = panelWidth <= WIDE_PANEL_THRESHOLD;

  React.useEffect(() => {
    const el = scrollRef.current;
    if (!el) return undefined;

    function update() {
      if (!el) return;
      const { scrollLeft, scrollWidth, clientWidth } = el;
      setCanScrollLeft(scrollLeft > 2);
      setCanScrollRight(scrollLeft + clientWidth < scrollWidth - 2);
    }

    update();

    el.addEventListener('scroll', update, { passive: true });
    const observer = new ResizeObserver(update);
    observer.observe(el);

    return () => {
      el.removeEventListener('scroll', update);
      observer.disconnect();
    };
  }, []);

  const handleFullscreen = () => {
    dialogRef.current?.showModal();
  };

  const [isCopied, setIsCopied] = React.useState(false);

  const handleCopy = () => {
    const table = tableRef.current;
    if (!table) return;

    const rows = extractTableData(table);
    const tsv = rows.map((row) => row.join('\t')).join('\n');
    navigator.clipboard.writeText(tsv).then(() => {
      setIsCopied(true);
      setTimeout(() => setIsCopied(false), 2000);
    });
  };

  const handleDownloadCsv = () => {
    const table = tableRef.current;
    if (!table) return;

    const rows = extractTableData(table);
    const csv = rowsToCsv(rows);
    downloadBlob(csv, 'text/csv;charset=utf-8;', `table-${Date.now()}.csv`);
  };

  return (
    <>
      <div className={styles.tableOuter}>
        <div className={styles.toolbar} role="toolbar" aria-label="Table actions">
          <button
            type="button"
            className={styles.toolbarBtn}
            onClick={handleFullscreen}
            aria-label="View fullscreen"
            title="View fullscreen"
          >
            <FullscreenOutlined />
          </button>
          <button
            type="button"
            className={styles.toolbarBtn}
            onClick={handleDownloadCsv}
            aria-label="Download as CSV"
            title="Download as CSV"
          >
            <DownloadOutlined />
          </button>
          <button
            type="button"
            className={styles.toolbarBtn}
            onClick={handleCopy}
            aria-label="Copy as TSV"
            title="Copy to clipboard"
          >
            {isCopied ? <CheckOutlined /> : <CopyOutlined />}
          </button>
        </div>
        <div className={styles.shadowLeft} data-visible={canScrollLeft} aria-hidden="true" />
        <div className={styles.shadowRight} data-visible={canScrollRight} aria-hidden="true" />
        <div ref={scrollRef} className={styles.tableWrapper}>
          <table
            {...props}
            ref={tableRef}
            className={isCompact ? styles.tableCompact : styles.tableWide}
          >
            {children}
          </table>
        </div>
      </div>

      <FullscreenDialog dialogRef={dialogRef}>
        <div className={styles.fullscreenToolbar} role="toolbar" aria-label="Table actions">
          <button
            type="button"
            className={styles.fullscreenToolbarBtn}
            onClick={handleDownloadCsv}
            aria-label="Download as CSV"
            title="Download as CSV"
          >
            <DownloadOutlined />
          </button>
          <button
            type="button"
            className={styles.fullscreenToolbarBtn}
            onClick={handleCopy}
            aria-label="Copy to clipboard"
            title="Copy to clipboard"
          >
            {isCopied ? <CheckOutlined /> : <CopyOutlined />}
          </button>
        </div>
        <div className={styles.fullscreenTableWrapper}>
          <table {...props} className={styles.tableWide}>
            {children}
          </table>
        </div>
      </FullscreenDialog>
    </>
  );
}

/**
 * Custom <td> that:
 * - Compact mode: adds a title attribute for hover tooltip.
 * - Wide mode: wraps content in a line-clamped div (3 lines max) with title tooltip.
 */
export function MarkdownTd({ children, ...props }: React.TdHTMLAttributes<HTMLTableCellElement>) {
  const { panelWidth } = usePanelWidth();
  const isCompact = panelWidth <= WIDE_PANEL_THRESHOLD;
  const text = extractText(children);

  if (isCompact) {
    return (
      <td {...props} title={text}>
        {children}
      </td>
    );
  }

  return (
    <td {...props} title={text}>
      <div className={styles.cellClamp}>{children}</div>
    </td>
  );
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Recursively extract plain text from React children for the title attribute. */
function extractText(node: React.ReactNode): string {
  if (node == null || typeof node === 'boolean') return '';
  if (typeof node === 'string' || typeof node === 'number') return String(node);
  if (Array.isArray(node)) return node.map(extractText).join('');
  if (React.isValidElement(node)) {
    const element = node as React.ReactElement<{ children?: React.ReactNode }>;
    return extractText(element.props.children);
  }
  return '';
}

/** Extract a 2D string array from a <table> DOM element. */
function extractTableData(table: HTMLTableElement): string[][] {
  const rows: string[][] = [];

  const headerRow = table.querySelector('thead tr');
  if (headerRow) {
    const cells = headerRow.querySelectorAll('th, td');
    rows.push(Array.from(cells).map((cell) => (cell.textContent ?? '').trim()));
  }

  const bodyRows = table.querySelectorAll('tbody tr');
  for (const row of bodyRows) {
    const cells = row.querySelectorAll('td, th');
    rows.push(Array.from(cells).map((cell) => (cell.textContent ?? '').trim()));
  }

  return rows;
}

/** Escape a CSV field value (wrap in quotes if it contains comma, quote, or newline). */
function escapeCsvField(field: string): string {
  if (/[",\n\r]/.test(field)) {
    return `"${field.replace(/"/g, '""')}"`;
  }
  return field;
}

/** Convert a 2D array of strings to a CSV string. */
function rowsToCsv(rows: string[][]): string {
  return rows.map((row) => row.map(escapeCsvField).join(',')).join('\n');
}

/** Trigger a file download from a string blob. */
function downloadBlob(content: string, mimeType: string, filename: string) {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

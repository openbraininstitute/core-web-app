'use client';

import React from 'react';

import { MINIMAL_PANEL_SIZE, usePanelWidth } from '@/components/ai-assistant/hooks';

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
 */
export function MarkdownTable({ children, ...props }: React.TableHTMLAttributes<HTMLTableElement>) {
  const scrollRef = React.useRef<HTMLDivElement>(null);
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

  return (
    <div className={styles.tableOuter}>
      <div className={styles.shadowLeft} data-visible={canScrollLeft} aria-hidden="true" />
      <div className={styles.shadowRight} data-visible={canScrollRight} aria-hidden="true" />
      <div ref={scrollRef} className={styles.tableWrapper}>
        <table {...props} className={isCompact ? styles.tableCompact : styles.tableWide}>
          {children}
        </table>
      </div>
    </div>
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

/** Recursively extract plain text from React children for the title attribute. */
function extractText(node: React.ReactNode): string {
  if (node == null || typeof node === 'boolean') return '';
  if (typeof node === 'string' || typeof node === 'number') return String(node);
  if (Array.isArray(node)) return node.map(extractText).join('');
  if (typeof node === 'object' && 'props' in node) {
    const element = node as React.ReactElement<{ children?: React.ReactNode }>;
    return extractText(element.props.children);
  }
  return '';
}

'use client';

import React, { type PropsWithChildren } from 'react';

import {
  CodeBlockCopyButton,
  CodeBlockLanguageLabel,
  CodeBlock as DCodeBlock,
} from '@/ui/molecules/code-blocks';

import type { BundledLanguage } from 'shiki';

import styles from './highlighter.module.css';

export function Highlighter({ children }: PropsWithChildren) {
  const codeElement = children as React.ReactElement<{ children?: string; className?: string }>;
  const codeClassName = codeElement.props.className;
  const languageMatch = codeClassName?.match(/language-(\w+)/);
  const language = (languageMatch ? languageMatch[1] : 'text') as BundledLanguage;
  const code = codeElement.props.children || '';

  const wrapperRef = React.useRef<HTMLDivElement>(null);
  const scrollElRef = React.useRef<HTMLElement | null>(null);
  const [canScrollLeft, setCanScrollLeft] = React.useState(false);
  const [canScrollRight, setCanScrollRight] = React.useState(false);

  React.useEffect(() => {
    const wrapper = wrapperRef.current;
    if (!wrapper) return undefined;

    // Find the scrollable code container: it's the div inside .relative that
    // has secondary-scrollbar class (Tailwind utility) or overflow-x-auto.
    const candidates = wrapper.querySelectorAll('div');
    let scrollEl: HTMLElement | null = null;
    for (const el of candidates) {
      const style = getComputedStyle(el);
      if (style.overflowX === 'auto' && el.scrollWidth > el.clientWidth + 2) {
        scrollEl = el;
        break;
      }
    }

    // Fallback: pick first element with overflow-x auto even if not currently overflowing
    if (!scrollEl) {
      for (const el of candidates) {
        const style = getComputedStyle(el);
        if (style.overflowX === 'auto' && el !== wrapper.firstElementChild) {
          scrollEl = el;
          break;
        }
      }
    }

    if (!scrollEl) return undefined;
    scrollElRef.current = scrollEl;

    function update() {
      if (!scrollEl) return;
      const { scrollLeft, scrollWidth, clientWidth } = scrollEl;
      setCanScrollLeft(scrollLeft > 2);
      setCanScrollRight(scrollLeft + clientWidth < scrollWidth - 2);
    }

    update();

    scrollEl.addEventListener('scroll', update, { passive: true });
    const observer = new ResizeObserver(update);
    observer.observe(scrollEl);

    return () => {
      scrollEl?.removeEventListener('scroll', update);
      observer.disconnect();
    };
  }, []);

  return (
    <div ref={wrapperRef} className={styles.wrapper}>
      <DCodeBlock code={code} language={language} scrollableX className={styles.codeBlock}>
        <div className={styles.header}>
          <CodeBlockLanguageLabel className={styles.languageLabel} />
          <CodeBlockCopyButton className={styles.copyBtn} iconClassName={styles.copyIcon} />
        </div>
      </DCodeBlock>
      <div className={styles.shadowLeft} data-visible={canScrollLeft} aria-hidden="true" />
      <div className={styles.shadowRight} data-visible={canScrollRight} aria-hidden="true" />
    </div>
  );
}

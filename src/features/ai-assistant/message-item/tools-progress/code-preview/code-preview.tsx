'use client';

/**
 * CodePreview — renders a code string with shiki syntax highlighting.
 * Used inside ToolsProgress for execute-python/shell tool inputs/outputs.
 */
import { useEffect, useRef, useState } from 'react';

import { highlightCode } from '@/ui/molecules/code-blocks';

import type { BundledLanguage } from 'shiki';

import styles from './code-preview.module.css';

interface CodePreviewProps {
  code: string;
  language?: string;
}

export default function CodePreview({ code, language = 'text' }: CodePreviewProps) {
  const [html, setHtml] = useState<string>('');
  const mounted = useRef(false);
  const debounce = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    mounted.current = true;
    // Debounce: only highlight once code stops changing for 500ms.
    // Prevents async shiki calls from piling up during streaming.
    if (debounce.current) clearTimeout(debounce.current);
    debounce.current = setTimeout(() => {
      highlightCode(code, language as BundledLanguage, false)
        .then((highlighted) => {
          if (mounted.current) setHtml(highlighted);
        })
        .catch(() => {});
    }, 500);
    return () => {
      mounted.current = false;
      if (debounce.current) clearTimeout(debounce.current);
    };
  }, [code, language]);

  if (!html) {
    return (
      <pre className={styles.codePreview}>
        <code>{code}</code>
      </pre>
    );
  }

  return (
    <div
      className={styles.codePreviewHighlighted}
      // biome-ignore lint/security/noDangerouslySetInnerHtml: shiki output
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}

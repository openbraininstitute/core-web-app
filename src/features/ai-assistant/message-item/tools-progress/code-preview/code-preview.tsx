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

  useEffect(() => {
    mounted.current = true;
    highlightCode(code, language as BundledLanguage, false)
      .then((highlighted) => {
        if (mounted.current) setHtml(highlighted);
      })
      .catch(() => {
        // Fallback: no highlighting
      });
    return () => {
      mounted.current = false;
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

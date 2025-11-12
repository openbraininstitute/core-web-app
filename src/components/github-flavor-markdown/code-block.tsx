import React, { useState, useMemo, useCallback } from 'react';
import type { ComponentPropsWithoutRef } from 'react';
import type { ExtraProps } from 'react-markdown';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { oneDark } from 'react-syntax-highlighter/dist/esm/styles/prism';

interface CodeBlockProps extends ComponentPropsWithoutRef<'pre'>, ExtraProps {
  children?: React.ReactNode;
}

const createCustomPre = (onCopy: () => void, copied: boolean) => {
  const CustomPreComponent = function CustomPreComponent({
    children,
    className: propsClassName,
    ...props
  }: React.HTMLAttributes<HTMLPreElement>) {
    return (
      // eslint-disable-next-line react/jsx-props-no-spreading
      <pre {...props} className={`relative ${propsClassName || ''}`}>
        <button
          onClick={onCopy}
          className="absolute top-2 right-2 z-10 rounded bg-gray-700 px-2 py-1 text-xs text-white transition-colors hover:bg-gray-600"
          type="button"
        >
          {copied ? 'Copied!' : 'Copy'}
        </button>
        {children}
      </pre>
    );
  };
  CustomPreComponent.displayName = 'CustomPre';
  return CustomPreComponent;
};

/**
 * Component to handle code blocks (```language) in markdown.
 * Uses react-syntax-highlighter with Prism backend for syntax highlighting.
 */
export default function CodeBlock({ children, className, id }: CodeBlockProps) {
  const codeElement = children as React.ReactElement<{ children?: string; className?: string }>;
  const codeContent = codeElement.props.children;
  const codeClassName = codeElement.props.className;

  const languageMatch = codeClassName?.match(/language-(\w+)/);
  const language = languageMatch ? languageMatch[1] : null;

  const [copied, setCopied] = useState(false);

  const handleCopy = useCallback(async () => {
    if (!codeContent) return;
    try {
      await navigator.clipboard.writeText(codeContent.trim());
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (_) {
      // Silently ignore clipboard errors
    }
  }, [codeContent]);

  const CustomPre = useMemo(() => createCustomPre(handleCopy, copied), [handleCopy, copied]);

  if (!codeClassName || !codeContent || !language) {
    // Fallback: render pre normally if no className or content or language is found
    return (
      <pre className={className} id={id}>
        {children}
      </pre>
    );
  }

  return (
    <SyntaxHighlighter
      language={language}
      style={oneDark}
      PreTag={CustomPre}
      customStyle={{ paddingTop: '0.5rem' }}
      className={className}
      id={id}
    >
      {codeContent.trim()}
    </SyntaxHighlighter>
  );
}

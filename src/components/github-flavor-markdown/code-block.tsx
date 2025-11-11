import React from 'react';
import type { ComponentPropsWithoutRef } from 'react';
import type { ExtraProps } from 'react-markdown';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { vscDarkPlus } from 'react-syntax-highlighter/dist/esm/styles/prism';

interface CodeBlockProps extends ComponentPropsWithoutRef<'pre'>, ExtraProps {
  children?: React.ReactNode;
}

/**
 * Component to handle code blocks (```language) in markdown.
 * Uses react-syntax-highlighter with Prism backend for syntax highlighting.
 */
export default function CodeBlock({ children, className, id }: CodeBlockProps) {
  const codeElement = children as React.ReactElement<{ children: string; className: string }>;
  const codeContent = codeElement.props.children;
  const codeClassName = codeElement.props.className;

  const languageMatch = codeClassName.match(/language-(\w+)/);
  const language = languageMatch ? languageMatch[1] : null;

  if (language) {
    return (
      <SyntaxHighlighter
        language={language}
        style={vscDarkPlus}
        PreTag="div"
        className={className}
        id={id}
      >
        {codeContent.trim()}
      </SyntaxHighlighter>
    );
  }

  // Fallback: render pre normally
  return (
    <pre className={className} id={id}>
      {children}
    </pre>
  );
}

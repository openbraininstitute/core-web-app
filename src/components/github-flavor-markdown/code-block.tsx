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
  // Extract language and code content from the code element
  // react-markdown passes children as a <code> element with props.children containing the code string
  // and props.className containing "language-xxx"
  let language: string | null = null;
  let codeContent = '';

  if (React.isValidElement(children) && children.type === 'code') {
    const codeProps = children.props as { children?: string; className?: string };
    codeContent =
      typeof codeProps.children === 'string'
        ? codeProps.children
        : String(codeProps.children || '');

    // Extract language from the code element's className
    const codeClassName = codeProps.className || className;
    const languageMatch = codeClassName?.match(/language-(\w+)/);
    language = languageMatch ? languageMatch[1] : null;
  } else if (typeof children === 'string') {
    // Fallback: if children is a string, try to get language from className prop
    codeContent = children;
    const languageMatch = className?.match(/language-(\w+)/);
    language = languageMatch ? languageMatch[1] : null;
  }

  if (language && codeContent) {
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

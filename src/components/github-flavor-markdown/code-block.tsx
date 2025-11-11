import React, { useState } from 'react';
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
  const codeElement = children as React.ReactElement<{ children?: string; className?: string }>;
  const codeContent = codeElement.props.children;
  const codeClassName = codeElement.props.className;

  if (!codeClassName || !codeContent) {
    // Fallback: render pre normally if no className or content
    return (
      <pre className={className} id={id}>
        {children}
      </pre>
    );
  }

  const languageMatch = codeClassName.match(/language-(\w+)/);
  const language = languageMatch ? languageMatch[1] : null;

  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(codeContent.trim());
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  if (language) {
    const CustomPre = ({ children, ...props }: React.HTMLAttributes<HTMLPreElement>) => (
      <pre {...props} className={`relative ${props.className || ''}`}>
        <button
          onClick={handleCopy}
          className="absolute top-2 right-2 z-10 px-2 py-1 text-xs bg-gray-700 hover:bg-gray-600 text-white rounded transition-colors"
          type="button"
        >
          {copied ? 'Copied!' : 'Copy'}
        </button>
        {children}
      </pre>
    );

    return (
      <SyntaxHighlighter
        language={language}
        style={vscDarkPlus}
        PreTag={CustomPre}
        customStyle={{ paddingTop: '2.5rem' }}
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

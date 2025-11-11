import React from 'react';
import type { ComponentPropsWithoutRef } from 'react';
import type { ExtraProps } from 'react-markdown';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { vscDarkPlus } from 'react-syntax-highlighter/dist/esm/styles/prism';

interface CodeBlockProps extends ComponentPropsWithoutRef<'pre'>, ExtraProps {
  children?: React.ReactNode;
}

// Type guards for AST node structure
interface ElementNode {
  type: 'element';
  tagName: string;
  properties?: {
    className?: string | string[];
  };
  children?: Array<{ type: string; value?: string }>;
}

function isElementNode(node: unknown): node is ElementNode {
  return (
    typeof node === 'object' &&
    node !== null &&
    'type' in node &&
    (node as { type: unknown }).type === 'element'
  );
}

/**
 * Component to handle code blocks (```language) in markdown.
 * Uses react-syntax-highlighter with Prism backend for syntax highlighting.
 */
export default function CodeBlock({ children, node, className, id }: CodeBlockProps) {
  // Check if this pre contains a code element with a language class
  // The node prop gives us access to the AST structure
  if (node?.children && Array.isArray(node.children)) {
    const codeChild = node.children.find(
      (child) => isElementNode(child) && child.tagName === 'code'
    ) as ElementNode | undefined;

    if (codeChild) {
      const codeClassName = codeChild.properties?.className;
      const classNameStr = Array.isArray(codeClassName)
        ? codeClassName.join(' ')
        : String(codeClassName || '');
      const match = /language-(\w+)/.exec(classNameStr);

      if (match) {
        const language = match[1];

        // Extract code content from the AST node
        // The codeChild node contains text nodes with the actual code
        let codeContent = '';
        if (codeChild.children && Array.isArray(codeChild.children)) {
          codeContent = codeChild.children
            .map((child: { type: string; value?: string }) => {
              if (child.type === 'text' && 'value' in child) {
                return child.value || '';
              }
              return '';
            })
            .join('');
        }

        // Fallback: try to extract from React children if AST extraction fails
        if (!codeContent && React.isValidElement(children)) {
          const codeElement = children;
          const codeProps = codeElement.props as { children?: React.ReactNode };
          if (codeProps?.children) {
            codeContent = String(codeProps.children);
          }
        } else if (!codeContent && typeof children === 'string') {
          codeContent = children;
        }

        // Remove trailing newline if present
        codeContent = codeContent.replace(/\n$/, '');

        return (
          <SyntaxHighlighter
            language={language}
            style={vscDarkPlus}
            PreTag="div"
            className={className}
            id={id}
          >
            {codeContent}
          </SyntaxHighlighter>
        );
      }
    }
  }

  // Fallback: render pre normally (for code blocks without language or non-code pre elements)
  return (
    <pre className={className} id={id}>
      {children}
    </pre>
  );
}

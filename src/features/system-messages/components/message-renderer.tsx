/**
 * Message Renderer Component
 *
 * Renders system message content based on content type (HTML, Markdown, JSON).
 * Handles sanitization, template substitution, and safe rendering.
 *
 * @module components/message-renderer
 */

'use client';

import ReactMarkdown from 'react-markdown';
import rehypeRaw from 'rehype-raw';
import remarkGfm from 'remark-gfm';

import type { ITemplateContext, TMessageContentType } from '../types';
import { sanitizeHtml } from '../utils/sanitizer';
import { substituteTemplateVars } from '../utils/template';

// ============================================================================
// Types
// ============================================================================

/**
 * Props for the MessageRenderer component.
 */
export interface IMessageRendererProps {
  /** The message content to render */
  content: string;
  /** The content type determining how to parse and render */
  contentType: TMessageContentType;
  /** Context values for template placeholder substitution */
  context?: ITemplateContext;
  /** Additional CSS class name */
  className?: string;
}

/**
 * JSON template structure for structured content.
 */
interface IJsonTemplate {
  /** Template type identifier */
  type: string;
  /** Template sections/blocks */
  sections?: Array<{
    type: 'heading' | 'paragraph' | 'list' | 'link';
    content?: string;
    level?: number;
    items?: string[];
    href?: string;
    label?: string;
  }>;
  /** Fallback text content */
  text?: string;
}

// ============================================================================
// Component
// ============================================================================

/**
 * Renders system message content with support for HTML, Markdown, and JSON templates.
 *
 * Features:
 * - HTML content is sanitized to remove dangerous elements
 * - Markdown content is parsed with GFM extensions
 * - JSON templates are rendered as structured content
 * - Template placeholders ({{key}}) are substituted with context values
 *
 * @example
 * ```tsx
 * <MessageRenderer
 *   content="Hello {{userName}}, please contact support."
 *   contentType="markdown"
 *   context={{ userName: 'John' }}
 * />
 * ```
 */
export function MessageRenderer({
  content,
  contentType,
  context = {},
  className = '',
}: IMessageRendererProps) {
  // Substitute template placeholders with context values
  const processedContent = substituteTemplateVars(content, context);

  switch (contentType) {
    case 'html':
      return <HtmlRenderer content={processedContent} className={className} />;

    case 'markdown':
      return <MarkdownRenderer content={processedContent} className={className} />;

    case 'json':
      return <JsonRenderer content={processedContent} context={context} className={className} />;

    default:
      // Fallback: render as plain text
      return <p className={className}>{processedContent}</p>;
  }
}

// ============================================================================
// HTML Renderer
// ============================================================================

interface IHtmlRendererProps {
  content: string;
  className?: string;
}

/**
 * Renders sanitized HTML content.
 */
function HtmlRenderer({ content, className }: IHtmlRendererProps) {
  const sanitizedHtml = sanitizeHtml(content);

  return (
    <div
      className={className}
      // biome-ignore lint/security/noDangerouslySetInnerHtml: Content is sanitized by DOMPurify
      dangerouslySetInnerHTML={{ __html: sanitizedHtml }}
    />
  );
}

// ============================================================================
// Markdown Renderer
// ============================================================================

interface IMarkdownRendererProps {
  content: string;
  className?: string;
}

/**
 * Renders Markdown content with GFM extensions.
 */
function MarkdownRenderer({ content, className }: IMarkdownRendererProps) {
  return (
    <ReactMarkdown
      className={className}
      remarkPlugins={[remarkGfm]}
      rehypePlugins={[rehypeRaw]}
      components={{
        // Custom link component with security attributes
        a: ({ href, children }) => (
          <a
            href={href}
            target="_blank"
            rel="noopener noreferrer"
            className="text-primary-8 underline hover:text-primary-9 focus:outline-none focus:ring-2 focus:ring-primary-8 focus:ring-offset-1"
          >
            {children}
          </a>
        ),
        // Ensure paragraphs have proper spacing
        p: ({ children }) => <p className="mb-2 last:mb-0">{children}</p>,
        // Style lists consistently
        ul: ({ children }) => <ul className="list-disc pl-5 mb-2">{children}</ul>,
        ol: ({ children }) => <ol className="list-decimal pl-5 mb-2">{children}</ol>,
        li: ({ children }) => <li className="mb-1">{children}</li>,
        // Style emphasis
        strong: ({ children }) => <strong className="font-semibold">{children}</strong>,
        em: ({ children }) => <em className="italic">{children}</em>,
      }}
    >
      {content}
    </ReactMarkdown>
  );
}

// ============================================================================
// JSON Template Renderer
// ============================================================================

interface IJsonRendererProps {
  content: string;
  context: ITemplateContext;
  className?: string;
}

/**
 * Renders JSON template content as structured HTML.
 */
function JsonRenderer({ content, context, className }: IJsonRendererProps) {
  let template: IJsonTemplate;

  try {
    template = JSON.parse(content) as IJsonTemplate;
  } catch {
    // If JSON parsing fails, render as plain text
    return <p className={className}>{content}</p>;
  }

  // If template has a simple text field, render it
  if (template.text) {
    const processedText = substituteTemplateVars(template.text, context);
    return <p className={className}>{processedText}</p>;
  }

  // Render sections if present
  if (template.sections && Array.isArray(template.sections)) {
    return (
      <div className={className}>
        {template.sections.map((section, index) => (
          <JsonSection key={index} section={section} context={context} />
        ))}
      </div>
    );
  }

  // Fallback: render raw JSON as formatted text
  return (
    <pre className={`${className} text-sm bg-gray-100 p-2 rounded overflow-auto`}>
      {JSON.stringify(template, null, 2)}
    </pre>
  );
}

// ============================================================================
// JSON Section Renderer
// ============================================================================

interface IJsonSectionProps {
  section: NonNullable<IJsonTemplate['sections']>[number];
  context: ITemplateContext;
}

/**
 * Renders a single section from a JSON template.
 */
function JsonSection({ section, context }: IJsonSectionProps) {
  const processContent = (text: string | undefined) =>
    text ? substituteTemplateVars(text, context) : '';

  switch (section.type) {
    case 'heading': {
      const level = section.level || 2;
      const headingContent = processContent(section.content);
      const headingClasses: Record<number, string> = {
        1: 'text-2xl font-bold mb-3',
        2: 'text-xl font-semibold mb-2',
        3: 'text-lg font-medium mb-2',
        4: 'text-base font-medium mb-1',
        5: 'text-sm font-medium mb-1',
        6: 'text-xs font-medium mb-1',
      };
      const className = headingClasses[level] || headingClasses[2];

      switch (level) {
        case 1:
          return <h1 className={className}>{headingContent}</h1>;
        case 2:
          return <h2 className={className}>{headingContent}</h2>;
        case 3:
          return <h3 className={className}>{headingContent}</h3>;
        case 4:
          return <h4 className={className}>{headingContent}</h4>;
        case 5:
          return <h5 className={className}>{headingContent}</h5>;
        case 6:
          return <h6 className={className}>{headingContent}</h6>;
        default:
          return <h2 className={className}>{headingContent}</h2>;
      }
    }

    case 'paragraph':
      return <p className="mb-2">{processContent(section.content)}</p>;

    case 'list':
      return (
        <ul className="list-disc pl-5 mb-2">
          {section.items?.map((item, idx) => (
            <li key={idx} className="mb-1">
              {processContent(item)}
            </li>
          ))}
        </ul>
      );

    case 'link':
      return (
        <a
          href={section.href}
          target="_blank"
          rel="noopener noreferrer"
          className="text-primary-8 underline hover:text-primary-9 inline-block mb-2"
        >
          {processContent(section.label) || section.href}
        </a>
      );

    default:
      return null;
  }
}

// ============================================================================
// Exports
// ============================================================================

export default MessageRenderer;

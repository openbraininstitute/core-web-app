/**
 * HTML Sanitization Utility
 *
 * Provides secure HTML sanitization for system message content.
 * Uses DOMPurify to remove potentially dangerous HTML while preserving
 * safe formatting elements.
 *
 * @module utils/sanitizer
 */

// eslint-disable-next-line @typescript-eslint/no-require-imports
const DOMPurify = require("isomorphic-dompurify");

import { ALLOWED_HTML_ATTRIBUTES, ALLOWED_HTML_TAGS } from "../constants";

/**
 * Configuration options for HTML sanitization.
 */
export interface ISanitizeOptions {
  /**
   * Additional tags to allow beyond the default set.
   */
  additionalTags?: string[];
  /**
   * Additional attributes to allow beyond the default set.
   */
  additionalAttributes?: string[];
  /**
   * Whether to allow data attributes (data-*).
   * @default false
   */
  allowDataAttributes?: boolean;
}

/**
 * Sanitizes HTML content by removing potentially dangerous elements and attributes.
 *
 * By default, only safe formatting tags are allowed:
 * - `p`, `a`, `strong`, `em`, `ul`, `ol`, `li`, `br`
 *
 * And only safe attributes:
 * - `href`, `target`, `rel`, `class`
 *
 * @param html - The HTML string to sanitize
 * @param options - Optional configuration to extend allowed tags/attributes
 * @returns Sanitized HTML string safe for rendering
 *
 * @example
 * ```typescript
 * // Basic sanitization
 * const safe = sanitizeHtml('<p>Hello <strong>world</strong></p>');
 * // Result: '<p>Hello <strong>world</strong></p>'
 * ```
 *
 * @example
 * ```typescript
 * // Removes dangerous elements
 * const safe = sanitizeHtml('<p>Hello</p><script>alert("xss")</script>');
 * // Result: '<p>Hello</p>'
 * ```
 *
 * @example
 * ```typescript
 * // Removes dangerous attributes
 * const safe = sanitizeHtml('<a href="https://example.com" onclick="alert()">Link</a>');
 * // Result: '<a href="https://example.com">Link</a>'
 * ```
 */
export function sanitizeHtml(
  html: string,
  options: ISanitizeOptions = {},
): string {
  const {
    additionalTags = [],
    additionalAttributes = [],
    allowDataAttributes = false,
  } = options;

  const allowedTags = [...ALLOWED_HTML_TAGS, ...additionalTags];
  const allowedAttributes = [
    ...ALLOWED_HTML_ATTRIBUTES,
    ...additionalAttributes,
  ];

  // Build DOMPurify configuration
  const config = {
    ALLOWED_TAGS: allowedTags,
    ALLOWED_ATTR: allowedAttributes,
    // Prevent protocol-based XSS attacks
    ALLOW_UNKNOWN_PROTOCOLS: false,
    // Return string (not DOM node)
    RETURN_DOM: false,
    RETURN_DOM_FRAGMENT: false,
    // Allow data-* attributes if specified
    ALLOW_DATA_ATTR: allowDataAttributes,
  };

  return DOMPurify.sanitize(html, config);
}

/**
 * Checks if an HTML string contains any potentially dangerous content.
 *
 * This is useful for validation before storing content, to warn administrators
 * that their content will be modified during rendering.
 *
 * @param html - The HTML string to check
 * @returns True if the HTML contains content that would be removed by sanitization
 *
 * @example
 * ```typescript
 * containsDangerousHtml('<p>Safe content</p>'); // false
 * containsDangerousHtml('<script>alert("xss")</script>'); // true
 * containsDangerousHtml('<img onerror="alert()">'); // true
 * ```
 */
export function containsDangerousHtml(html: string): boolean {
  const sanitized = sanitizeHtml(html);
  // Compare lengths as a quick check - if content was removed, it was dangerous
  // This isn't perfect but catches most cases
  return sanitized.length !== html.length || sanitized !== html;
}

/**
 * Sanitizes HTML and returns both the result and information about what was removed.
 *
 * Useful for providing feedback to administrators about content modifications.
 *
 * @param html - The HTML string to sanitize
 * @param options - Optional configuration to extend allowed tags/attributes
 * @returns Object containing sanitized HTML and modification details
 *
 * @example
 * ```typescript
 * const result = sanitizeHtmlWithReport('<p>Hello</p><script>bad</script>');
 * // Result: {
 * //   sanitized: '<p>Hello</p>',
 * //   wasModified: true,
 * //   originalLength: 32,
 * //   sanitizedLength: 12
 * // }
 * ```
 */
export function sanitizeHtmlWithReport(
  html: string,
  options: ISanitizeOptions = {},
): {
  sanitized: string;
  wasModified: boolean;
  originalLength: number;
  sanitizedLength: number;
} {
  const sanitized = sanitizeHtml(html, options);

  return {
    sanitized,
    wasModified: sanitized !== html,
    originalLength: html.length,
    sanitizedLength: sanitized.length,
  };
}

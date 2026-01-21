/**
 * Template Substitution Utility
 *
 * Provides functions for substituting template variables in message content.
 * Supports {{key}} placeholder format with graceful handling of missing keys.
 *
 * @module utils/template
 */

/**
 * Regular expression to match template placeholders in the format {{key}}.
 * Captures the key name without the surrounding braces.
 */
const TEMPLATE_PLACEHOLDER_REGEX = /\{\{(\w+)\}\}/g;

/**
 * Options for template substitution behavior.
 */
export interface ISubstituteOptions {
  /**
   * How to handle missing keys in the context.
   * - 'preserve': Leave the placeholder as-is (e.g., "{{missingKey}}")
   * - 'empty': Replace with empty string
   * - 'remove': Same as 'empty', removes the placeholder entirely
   * @default 'preserve'
   */
  missingKeyBehavior?: "preserve" | "empty" | "remove";
}

/**
 * Substitutes template variables in content with values from the context.
 *
 * Template variables use the format {{key}} where 'key' corresponds to a
 * property in the context object. Keys are case-sensitive and must contain
 * only word characters (letters, numbers, underscores).
 *
 * @param content - The template string containing {{key}} placeholders
 * @param context - Object mapping keys to their replacement values
 * @param options - Optional configuration for substitution behavior
 * @returns The content with placeholders replaced by context values
 *
 * @example
 * ```typescript
 * const result = substituteTemplateVars(
 *   "Hello {{userName}}, contact {{supportEmail}} for help.",
 *   { userName: "John", supportEmail: "support@example.com" }
 * );
 * // Result: "Hello John, contact support@example.com for help."
 * ```
 *
 * @example
 * ```typescript
 * // Missing key with default behavior (preserve)
 * const result = substituteTemplateVars(
 *   "Hello {{userName}}, your ID is {{userId}}.",
 *   { userName: "John" }
 * );
 * // Result: "Hello John, your ID is {{userId}}."
 * ```
 *
 * @example
 * ```typescript
 * // Missing key with empty behavior
 * const result = substituteTemplateVars(
 *   "Hello {{userName}}, your ID is {{userId}}.",
 *   { userName: "John" },
 *   { missingKeyBehavior: 'empty' }
 * );
 * // Result: "Hello John, your ID is ."
 * ```
 */
export function substituteTemplateVars(
  content: string,
  context: Record<string, string | undefined>,
  options: ISubstituteOptions = {},
): string {
  const { missingKeyBehavior = "preserve" } = options;

  return content.replace(TEMPLATE_PLACEHOLDER_REGEX, (match, key: string) => {
    const value = context[key];

    if (value !== undefined) {
      return value;
    }

    // Handle missing keys based on configured behavior
    switch (missingKeyBehavior) {
      case "empty":
      case "remove":
        return "";
      case "preserve":
      default:
        return match;
    }
  });
}

/**
 * Extracts all template variable keys from a content string.
 *
 * Useful for validation or determining which context values are needed
 * before performing substitution.
 *
 * @param content - The template string to extract keys from
 * @returns Array of unique key names found in the template
 *
 * @example
 * ```typescript
 * const keys = extractTemplateKeys("Hello {{userName}}, contact {{supportEmail}}.");
 * // Result: ["userName", "supportEmail"]
 * ```
 */
export function extractTemplateKeys(content: string): string[] {
  const keys: string[] = [];
  let match: RegExpExecArray | null;

  // Reset regex state
  const regex = new RegExp(TEMPLATE_PLACEHOLDER_REGEX.source, "g");

  for (
    match = regex.exec(content);
    match !== null;
    match = regex.exec(content)
  ) {
    const key = match[1];
    if (!keys.includes(key)) {
      keys.push(key);
    }
  }

  return keys;
}

/**
 * Checks if a content string contains any template placeholders.
 *
 * @param content - The string to check for placeholders
 * @returns True if the content contains at least one {{key}} placeholder
 *
 * @example
 * ```typescript
 * hasTemplatePlaceholders("Hello {{name}}!"); // true
 * hasTemplatePlaceholders("Hello world!"); // false
 * ```
 */
export function hasTemplatePlaceholders(content: string): boolean {
  return TEMPLATE_PLACEHOLDER_REGEX.test(content);
}

/**
 * Error handler for PDF generation with Paged.js
 * Handles the "Unable to find element in cloned iframe" error
 *
 * TEMPORARY: "Editorial in Proof" style is disabled due to iframe cloning issues
 */

// List of disabled PDF styles (temporarily disabled)
export const DISABLED_PDF_STYLES = ['Editorial in Proof', 'Editorial in Proof style'];

/**
 * Check if a PDF style is disabled
 */
export function isPdfStyleDisabled(style: string | null | undefined): boolean {
  if (!style) return false;
  return DISABLED_PDF_STYLES.some((disabledStyle) =>
    style.toLowerCase().includes(disabledStyle.toLowerCase())
  );
}

/**
 * Filter out disabled PDF styles from a list of style options
 */
export function filterDisabledPdfStyles<
  T extends { label?: string; value?: string; name?: string },
>(styles: T[]): T[] {
  return styles.filter((style) => {
    const styleName = style.label || style.value || style.name || '';
    return !isPdfStyleDisabled(styleName);
  });
}

export class PdfGenerationError extends Error {
  constructor(
    message: string,
    public readonly style?: string,
    public readonly selector?: string
  ) {
    super(message);
    this.name = 'PdfGenerationError';
  }
}

/**
 * Safely queries an element in a cloned iframe
 * @param iframe - The cloned iframe document
 * @param selector - CSS selector to find the element
 * @param required - Whether the element is required (default: false)
 * @returns The element if found, null otherwise
 */
export function safeQuerySelector(
  iframe: HTMLIFrameElement | null,
  selector: string,
  required = false
): Element | null {
  if (!iframe?.contentDocument) {
    if (required) {
      throw new PdfGenerationError(
        `Iframe content document not available for selector: ${selector}`,
        undefined,
        selector
      );
    }
    return null;
  }

  const element = iframe.contentDocument.querySelector(selector);

  if (!element && required) {
    // Log available elements for debugging
    const availableElements = Array.from(iframe.contentDocument.querySelectorAll('*'))
      .slice(0, 10)
      .map((el) => el.tagName.toLowerCase())
      .join(', ');

    throw new PdfGenerationError(
      `Element not found: ${selector}. Available elements (first 10): ${availableElements}`,
      undefined,
      selector
    );
  }

  return element;
}

/**
 * Wrapper for PDF generation that handles errors gracefully
 * @param generateFn - The PDF generation function
 * @param style - The PDF style being used
 * @param fallbackFn - Optional fallback function if generation fails
 */
export async function safePdfGeneration<T>(
  generateFn: () => Promise<T>,
  style?: string,
  fallbackFn?: () => Promise<T>
): Promise<T> {
  // TEMPORARY: Block "Editorial in Proof" style before it even tries to generate
  if (isPdfStyleDisabled(style)) {
    const errorMessage = `The "${style}" PDF style is temporarily disabled due to technical issues. Please select a different style.`;
    console.warn(errorMessage);
    throw new PdfGenerationError(errorMessage, style, undefined);
  }

  try {
    return await generateFn();
  } catch (error) {
    if (
      error instanceof Error &&
      error.message.includes('Unable to find element in cloned iframe')
    ) {
      console.warn(`PDF generation failed for style "${style}": ${error.message}`, error);

      // If it's the "Editorial in Proof" style, block it
      if (isPdfStyleDisabled(style)) {
        const errorMessage = `The "${style}" PDF style is temporarily disabled due to technical issues. Please select a different style.`;
        throw new PdfGenerationError(errorMessage, style, undefined);
      }

      // Try fallback if available
      if (fallbackFn) {
        console.info('Attempting fallback PDF generation...');
        try {
          return await fallbackFn();
        } catch (fallbackError) {
          console.error('Fallback PDF generation also failed:', fallbackError);
        }
      }

      // Re-throw with more context
      throw new PdfGenerationError(
        `PDF generation failed for style "${style}": ${error.message}`,
        style,
        undefined
      );
    }

    // Re-throw other errors
    throw error;
  }
}

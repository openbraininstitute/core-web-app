'use client';

import { useEffect } from 'react';
import { handlePdfGenerationError } from '@/util/pdf-style-interceptor';

/**
 * Client-side PDF error handler component
 * Catches PDF generation errors and shows user-friendly messages
 *
 * TEMPORARY: This component handles errors for the disabled "Editorial in Proof" style
 */
export default function PdfErrorHandler() {
  useEffect(() => {
    // Intercept unhandled errors
    const errorHandler = (event: ErrorEvent) => {
      if (event.error instanceof Error) {
        if (handlePdfGenerationError(event.error)) {
          event.preventDefault();
        }
      }
    };

    // Intercept unhandled promise rejections
    const rejectionHandler = (event: PromiseRejectionEvent) => {
      if (event.reason instanceof Error) {
        if (handlePdfGenerationError(event.reason)) {
          event.preventDefault();
        }
      }
    };

    window.addEventListener('error', errorHandler);
    window.addEventListener('unhandledrejection', rejectionHandler);

    return () => {
      window.removeEventListener('error', errorHandler);
      window.removeEventListener('unhandledrejection', rejectionHandler);
    };
  }, []);

  return null; // This component doesn't render anything
}

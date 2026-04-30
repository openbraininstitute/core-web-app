import { useCallback, useEffect, useRef, useState } from 'react';

import { type ImportState, validateImportConfig } from './utils';

import type { ConfigSchema } from '@/features/scan-config/types';

export const initialImportState: ImportState = {
  mode: 'paste',
  rawInput: '',
  fileName: null,
  parseError: null,
  validationErrors: null,
  parsedConfig: null,
  isValid: false,
};

export function useImportValidation(schema: ConfigSchema) {
  const [state, setState] = useState<ImportState>(initialImportState);
  const debounceRef = useRef<NodeJS.Timeout>();

  const validateInput = useCallback(
    (rawJson: string) => {
      if (debounceRef.current) clearTimeout(debounceRef.current);

      debounceRef.current = setTimeout(() => {
        if (!rawJson.trim()) {
          setState((prev) => ({
            ...prev,
            rawInput: rawJson,
            parseError: null,
            validationErrors: null,
            parsedConfig: null,
            isValid: false,
          }));
          return;
        }

        const result = validateImportConfig(rawJson, schema);
        setState((prev) => ({
          ...prev,
          rawInput: rawJson,
          parseError: result.parseError,
          validationErrors: result.validationErrors,
          parsedConfig: result.parsedConfig,
          isValid: result.parsedConfig !== null,
        }));
      }, 300);
    },
    [schema]
  );

  // Cleanup debounce timer on unmount
  useEffect(() => {
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, []);

  return { state, setState, validateInput };
}

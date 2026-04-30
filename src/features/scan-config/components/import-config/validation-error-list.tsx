'use client';

import type { ErrorObject } from 'ajv';

interface ValidationErrorListProps {
  errors: ErrorObject[];
}

export function ValidationErrorList({ errors }: ValidationErrorListProps) {
  if (errors.length === 0) {
    return null;
  }

  return (
    <div className="max-h-48 overflow-y-auto rounded border border-red-200 bg-red-50 p-3">
      <ul className="space-y-1">
        {errors.map((error, index) => (
          <li
            key={`${error.instancePath}-${error.message}-${index}`}
            className="text-sm text-red-500"
          >
            <span className="font-mono">{error.instancePath || '/'}</span>: {error.message}
          </li>
        ))}
      </ul>
    </div>
  );
}

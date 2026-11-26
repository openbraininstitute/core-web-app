import { render } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import {
  DistanceFunctionField,
  DistanceFunctionNullableField,
} from '@/features/scan-config/components/ui-elements/distance-function/distance-function-field';
import { ScanConfigUIElementDict } from '@/features/scan-config/types';

// The outer components only do structural schema introspection (where `maxLength` lives) and
// delegate everything else to the shared editor, so mock the editor and assert the forwarded prop.
const lastProps = vi.hoisted(() => ({ current: null as Record<string, unknown> | null }));
vi.mock(
  '@/features/scan-config/components/ui-elements/distance-function/distance-function-input',
  () => ({
    DistanceFunctionInput: (props: Record<string, unknown>) => {
      lastProps.current = props;
      return <div data-testid="shared-editor" />;
    },
  })
);

const base = { title: 't', description: 'd' } as const;

describe('DistanceFunctionField (non-nullable)', () => {
  it('reads maxLength from the schema root and forwards it', () => {
    render(
      <DistanceFunctionField
        paramSchema={{
          ...base,
          ui_element: ScanConfigUIElementDict.DistanceFunctionInput,
          maxLength: 500,
        }}
        value=""
        onChange={() => {}}
      />
    );
    expect(lastProps.current?.maxLength).toBe(500);
  });
});

describe('DistanceFunctionNullableField', () => {
  it('reads maxLength from the string branch (anyOf[0]) and forwards it', () => {
    render(
      <DistanceFunctionNullableField
        paramSchema={{
          ...base,
          ui_element: ScanConfigUIElementDict.DistanceFunctionInputNullable,
          anyOf: [{ type: 'string', maxLength: 500 }, { type: 'null' }],
        }}
        value=""
        onChange={() => {}}
      />
    );
    expect(lastProps.current?.maxLength).toBe(500);
  });
});

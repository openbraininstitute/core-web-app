'use client';

import {
  DistanceFunctionInput,
  type DistanceFunctionInputProps,
} from '@/features/scan-config/components/ui-elements/distance-function/distance-function-input';

import type {
  DistanceFunctionInputField,
  DistanceFunctionInputNullableField,
} from '@/features/scan-config/types';

/** Props shared by both outer fields: everything the editor needs except `maxLength`. */
type SharedProps = Omit<DistanceFunctionInputProps, 'maxLength'>;

/**
 * Outer component for `distance_function_input` (non-nullable `str`). The 1:1 schema-introspecting
 * wrapper: it reads `maxLength` from the schema root and hands it, plus the shared props, to the
 * underlying {@link DistanceFunctionInput}. All editing/validation lives in that shared component.
 */
export function DistanceFunctionField({
  paramSchema,
  ...shared
}: SharedProps & { paramSchema: DistanceFunctionInputField }) {
  return <DistanceFunctionInput {...shared} maxLength={paramSchema.maxLength} />;
}

/**
 * Outer component for `distance_function_input_nullable` (`str | None`). The 1:1
 * schema-introspecting wrapper: it reads `maxLength` from the string branch (`anyOf[0]`) and hands
 * it, plus the shared props, to the underlying {@link DistanceFunctionInput}.
 */
export function DistanceFunctionNullableField({
  paramSchema,
  ...shared
}: SharedProps & { paramSchema: DistanceFunctionInputNullableField }) {
  return <DistanceFunctionInput {...shared} maxLength={paramSchema.anyOf[0].maxLength} />;
}

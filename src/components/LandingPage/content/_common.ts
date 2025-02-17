import { PortableTextBlock } from '@portabletext/react';
import { logError } from '@/util/logger';
import { assertType, TypeDef } from '@/util/type-guards';

/**
 * Check a type and log an explicit error in case of failure.
 * @returns `true` if the type is correct.
 */
export function tryType(typeName: string, data: unknown, type: TypeDef): boolean {
  try {
    assertType(data, type);
    return true;
  } catch (ex) {
    logError(`Invalid format for data ${typeName}!`, data, ex);
    return false;
  }
}

export type RichText = PortableTextBlock | PortableTextBlock[];

export const typeImage: Record<string, TypeDef> = {
  imageURL: 'string',
  imageWidth: 'number',
  imageHeight: 'number',
};

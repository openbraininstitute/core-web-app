import { TypeDef } from '@/util/type-guards';

// Shared type definitions that can be used on both server and client side
export const typeStringOrNull: TypeDef = ['|', 'string', 'null', 'undefined'];
export const typeNumberOrNull: TypeDef = ['|', 'number', 'null', 'undefined'];
export const typeBooleanOrNull: TypeDef = ['|', 'boolean', 'null', 'undefined'];
export const typeImage = {
  imageURL: 'string',
  imageWidth: 'number',
  imageHeight: 'number',
} satisfies TypeDef;

export type SnakeToKebab<S extends string> = S extends `${infer Head}_${infer Tail}`
  ? `${Head}-${SnakeToKebab<Tail>}`
  : S;

export type Nullish = null | undefined;
export type Prettify<T> = {
  [K in keyof T]: T[K];
} & {};

type KebabCaseHelper<S extends string> = S extends `${infer First}${infer Rest}`
  ? First extends Lowercase<First>
    ? First extends '_' | ' ' | '-'
      ? `-${KebabCaseHelper<Rest>}`
      : `${First}${KebabCaseHelper<Rest>}`
    : `-${Lowercase<First>}${KebabCaseHelper<Rest>}`
  : '';

export type NormalizeChars<S extends string> = S extends `${infer Head}${infer Tail}`
  ? Head extends '_' | ' '
    ? `-${NormalizeChars<Tail>}`
    : `${Head}${NormalizeChars<Tail>}`
  : S;

type KebabCaseCore<S extends string> = S extends `${infer First}${infer Rest}`
  ? First extends '_' | ' ' | '-'
    ? KebabCaseCore<Rest>
    : `${Lowercase<First>}${KebabCaseHelper<Rest>}`
  : S;

// Strict variant: rejects widened string types. Ensures hover shows concrete transformed literal unions.
export type KebabCase<S extends string> = string extends S ? never : KebabCaseCore<S>;

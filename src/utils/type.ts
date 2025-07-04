type SnakeToKebab<S extends string> = S extends `${infer Head}_${infer Tail}`
  ? `${Head}-${SnakeToKebab<Tail>}`
  : S;

type Nullish = null | undefined;
export type Prettify<T> = {
  [K in keyof T]: T[K];
} & {};

type KebabCaseHelper<S extends string> = S extends `${infer First}${infer Rest}`
  ? First extends Lowercase<First> | '-' | '_' | ' '
    ? `${First}${KebabCaseHelper<Rest>}`
    : `-${Lowercase<First>}${KebabCaseHelper<Rest>}`
  : '';

export type NormalizeChars<S extends string> = S extends `${infer Head}${infer Tail}`
  ? Head extends '_' | ' '
    ? `-${NormalizeChars<Tail>}`
    : `${Head}${NormalizeChars<Tail>}`
  : S;

export type KebabCase<S extends string> = S extends `${infer First}${infer Rest}`
  ? First extends Lowercase<First>
    ? `${First}${KebabCaseHelper<Rest>}`
    : `${Lowercase<First>}${KebabCaseHelper<Rest>}`
  : S;

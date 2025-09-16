export type SnakeToKebab<S extends string> = S extends `${infer Head}_${infer Tail}`
  ? `${Head}-${SnakeToKebab<Tail>}`
  : S;

export type Nullish = null | undefined;
export type Prettify<T> = {
  [K in keyof T]: T[K];
} & {};
export type Nullable<T> = {
  [K in keyof T]: T[K] | null;
};

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

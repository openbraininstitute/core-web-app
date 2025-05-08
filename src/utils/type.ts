export type SnakeToKebab<S extends string> = S extends `${infer Head}_${infer Tail}`
  ? `${Head}-${SnakeToKebab<Tail>}`
  : S;

export type Nullish = null | undefined;
export type Prettify<T> = {
  [K in keyof T]: T[K];
} & {};

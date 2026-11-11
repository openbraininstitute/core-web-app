# @tolokoban/type-guards

TypeScript does a very good job at type checking during compilation.
But sometimes, you need type checking at runtime.

Look at this example:

```ts
const resp = await fetch('get-favourite-paintings');
const data = await resp.json();
```

What is the type of `data`? You know what you expect, but you don't know what you will actually get.
So casting it like this is dangerous: `const data = await resp.json() as Paintings[]`.

TypeScript has a solution for this: [type guards](https://www.typescriptlang.org/docs/handbook/2/narrowing.html#using-type-predicates).

This library provides three functions (and fez syntaxic sugars) to write complex type guards in a concise way:

- `isType(data, typeDef)`: returns `true` is `data` is of type `typeDef`.
- `assertType(data, typeDef)`: throws an exception if `data` is not of type `typeDef`.
- `ensureType(data, typeDef, defaultValue)`: returns `data` is its type is `typeDef`, otherwise returns `defaultValue`. The result is ensured to be of type `typeDef`.

`TypeDef` is the type definition you will use is all of these functions.

Example:

```ts
interface Member {
  name: string;
  role?: 'admin' | 'user' | 'guest';
  birth: [year: number, month: number, day: number];
}

function isMemberArray(data: unknown): data is Member[] {
  return isType(data, [
    'array',
    {
      name: 'string',
      role: ['?', ['literal', 'admin', 'user', 'guest']],
    },
  ]);
}
```

See below for more examples on how to use it.

## Basic types

Basic types are defined by a single string:

- **`"boolean"`**: `isType(data, "boolean") === isBoolean(data)`
- **`"function"`**: `isType(data, "function") === isFunction(data)`
- **`"null"`**: `isType(data, "null") === isNull(data)`
- **`"number"`**: `isType(data, "number") === isNumber(data)`
- **`"string"`**: `isType(data, "string") === isString(data)`
- **`"undefined"`**: `isType(data, "undefined") === isUndefined(data)`
- **`"unknown"`**: `isType(data, "unknown") === isUnknown(data)`

## Range

If you need to check the bounds of a number, you can use `["number", { min?: number, max?: number }]`

```ts
const type: TypeDef = {
  percentage: ['number', { min: 0, max: 100 }],
  positiveNumber: ['number', { min: 0 }],
};
```

## Objects

Type definitions for objects are straigh forward:
`{ [key: string]: TypeDef }`

```ts
interface Person {
  firstname: string;
  lastname: string;
  age: number;
}

const typePerson: TypeDef = {
  firstname: 'string',
  lastname: 'string',
  age: 'number',
};

interface Troop {
  chief: Person;
  soldiers: Person[];
}

const typeTroop: TypeDef = {
  chief: typePerson,
  soldiers: ['array', typePerson],
};
```

## Arrays and tuples

For an array of variable length, but with all elements having the same type `myType`:

```ts
const type: TypeDef = ['array', myType];
```

For an array of constrained length, but with all elements having the same type `myType`:

```ts
const type1: TypeDef = ['array(3)', myType];
const type2: TypeDef = ['array', myType, 3];
const type3: TypeDef = ['array', myType, { min: 2 }];
const type4: TypeDef = ['array', myType, { max: 5 }];
const type5: TypeDef = ['array', myType, { min: 2, max: 5 }];
```

For arrays with elements of different types you can use
`["tuple", ...TypeDef[]]` or `["tuple...", ...TypeDef[], TypeDef]`:

```ts
type Operator = ['add' | 'mul', number, number];
const type: TypeDef = ['tuple', ['literal', 'add', 'mul'], 'number', 'number'];
```

```ts
type Operator = ['add' | 'mul', ...number[]];
const type: TypeDef = ['tuple...', ['literal', 'add', 'mul'], 'number'];
```

## Custom

Let's say you have a very specific need, like being able to check if a value is a string with an odd length. Then you will use a custom type:

```ts
const oddStringType: TypeDef = [
  'custom',
  (data: unknown) => isString(data) && data.length % 2 === 1,
];
```

## Recursivity

Suppose this type:

```ts
interface Tree {
  name: string;
  children?: Tree[];
}
```

To describe it with the TypeGuard library you can use the fact that a `TypeDef` can be a function that returns a `TypeGuard`.

```ts
const treeTypeDef = () => ({
  name: 'string',
  children: ['?', ['array', treeTypeDef]],
});
```

## Examples

```ts
import { assertType } from '@tolokoban/type-guards';

interface Article {
  id: string;
  name: string;
  price: number;
}

function printArticles(data: unknown): Article[] {
  assertType<Article[]>(data, [
    'array',
    {
      id: 'string',
      name: 'string',
      price: 'number',
    },
  ]);
  for (const article of data) {
    console.log(`#{article.name} #${article.id}`);
  }
}
```

```ts
interface Complex {
  r: number;
  i: number;
}
const complex = ensureType<Complex>(data, { r: 'number', i: 'number' }, { r: 1, i: 0 });
```

```ts
interpace PersonVersion1 {
  name: string
  female: boolean
}
interpace PersonVersion2 {
  name: string
  gender: "male" | "female" | "nonbinary" | "unknown"
}
const data = JSON.parse(LocalStorate.getItem("person") ?? "null")
const TypePersonVersion1 = {
  name: "string",
  female: "boolean"
}
const TypePersonVersion2 = {
  name: "string",
  gender: ["literal", "male", "female", "nonbinary", "unknown"]
}
const person = ensureType<PersonVersion2>(
  data,
  TypePersonVersion2,
  (value: unknown) => {
    if (isType<PersonVersion2>(value, TypePersonVersion2)) {
      return value
    }
    if (isType<PersonVersion1>(value, TypePersonVersion1)) {
      return {
        name: value.name,
        gender: value.female === true ? "female" : "unknown"
      }
    }
    return { name: "Anonymous", gender: "unknown" }
  }
)
```

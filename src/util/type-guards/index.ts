export function isObject(data: unknown): data is Record<string, unknown> {
  if (!data) return false;
  if (Array.isArray(data)) return false;
  return typeof data === 'object';
}

export function isString(data: unknown): data is string {
  return typeof data === 'string';
}

export function isNumber(data: unknown): data is number {
  return typeof data === 'number';
}

export function isNull(data: unknown): data is null {
  return typeof data === null;
}

export function isFunction(data: unknown): data is () => unknown {
  return typeof data === 'function';
}

export function isUndefined(data: unknown): data is undefined {
  return typeof data === 'undefined';
}

export function isBoolean(data: unknown): data is boolean {
  return typeof data === 'boolean';
}

export function isArrayBuffer(data: unknown): data is ArrayBuffer {
  if (!data) return false;
  return data instanceof ArrayBuffer;
}

export function isArrayBufferView(data: unknown): data is ArrayBufferView {
  if (!data) return false;
  return ArrayBuffer.isView(data);
}

export function isBufferSource(data: unknown): data is BufferSource {
  return isArrayBuffer(data) || isArrayBufferView(data);
}

export function isStringArray(data: unknown): data is string[] {
  if (!Array.isArray(data)) return false;
  // eslint-disable-next-line no-restricted-syntax
  for (const item of data) {
    if (!isString(item)) return false;
  }
  return true;
}

export function assertNumber(data: unknown, name = 'data'): asserts data is number {
  if (!isNumber(data)) {
    throw Error(`${name} was expected to be a number but we got ${typeof data}!`);
  }
}

export function assertString(data: unknown, name = 'data'): asserts data is string {
  if (!isString(data)) {
    throw Error(`${name} was expected to be a string but we got ${typeof data}!`);
  }
}

export function assertOptionalString(
  data: unknown,
  name = 'data'
): asserts data is string | undefined {
  if (data && !isString(data)) {
    throw Error(`${name} was expected to be a string but we got ${typeof data}!`);
  }
}

export function assertBoolean(data: unknown, name = 'data'): asserts data is boolean {
  if (!isBoolean(data)) {
    throw Error(`${name} was expected to be a boolean but we got ${typeof data}!`);
  }
}

export function assertObject(
  data: unknown,
  name = 'data'
): asserts data is Record<string, unknown> {
  if (!isObject(data)) {
    throw Error(`${name} was expected to be an object but we got ${typeof data}!`);
  }
}

export function assertArray(data: unknown, name = 'data'): asserts data is unknown[] {
  if (!Array.isArray(data)) {
    throw Error(`${name} was expected to be an Array but we got ${typeof data}!`);
  }
}

export function assertArrayBuffer(data: unknown, name = 'data'): asserts data is ArrayBuffer {
  if (!isArrayBuffer(data)) {
    throw Error(`${name} was expected to be an ArrayBuffer but we got ${typeof data}!`);
  }
}

export function assertOptionalArrayBuffer(
  data: unknown,
  name = 'data'
): asserts data is ArrayBuffer | undefined {
  if (data && !isArrayBuffer(data)) {
    throw Error(`${name} was expected to be an ArrayBuffer but we got ${typeof data}!`);
  }
}

export type TypeDefFunction = (data: unknown) => boolean;

export type TypeDefArray =
  | ['array', TypeDef]
  | ['array', TypeDef, number]
  | ['array', TypeDef, { min?: number; max?: number }];

export type TypeDef =
  | (() => TypeDef)
  | 'boolean'
  | 'function'
  | 'null'
  | 'number'
  | 'string'
  | 'undefined'
  | 'unknown'
  | ['custom', TypeDefFunction]
  | ['number', { min?: number; max?: number }]
  | ['|', ...TypeDef[]]
  | ['?', TypeDef]
  | TypeDefArray
  | ['map', TypeDef]
  | ['tuple', ...TypeDef[]]
  | ['tuple...', ...TypeDef[], TypeDef]
  | ['literal', ...string[]]
  | ['partial', { [name: string]: TypeDef }]
  | { [name: string]: TypeDef };

export function isType<T>(
  data: unknown,
  type: TypeDef,
  logErrors: string | null = null
): data is T {
  try {
    assertType<T>(data, type);
    return true;
  } catch (ex) {
    if (logErrors) {
      // eslint-disable-next-line no-console
      console.error('[Invalid type]', logErrors);
      // eslint-disable-next-line no-console
      console.error(data);
      // eslint-disable-next-line no-console
      console.debug(ex);
    }
    return false;
  }
}

export function assertType<T>(data: unknown, type: TypeDef, prefix = 'data'): asserts data is T {
  if (typeof type === 'function') return assertType(data, type(), prefix);

  if (type === 'unknown') return;

  if (type === 'null') {
    if (data !== null) {
      throw Error(`Expected ${prefix} to be a null and not a ${prettytypeof(data)}!`);
    }
    return;
  }
  if (typeof type === 'string') {
    if (typeof data !== type) {
      throw Error(`Expected ${prefix} to be a ${type} and not a ${prettytypeof(data)}!`);
    }
    return;
  }
  if (Array.isArray(type)) {
    const [kind] = type;
    switch (kind) {
      case 'array':
        assertTypeArray(data, prefix, type);
        return;
      case 'map':
        assertTypeMap(data, prefix, type);
        return;
      case '?':
        assertTypeOptional(data, prefix, type);
        return;
      case '|':
        assertTypeAlternative(data, prefix, type);
        return;
      case 'tuple':
        assertTypeTuple(data, prefix, type);
        return;
      case 'tuple...':
        assertTypeTupleWithRest(data, prefix, type);
        return;
      case 'partial':
        assertTypePartial(data, prefix, type);
        return;
      case 'literal':
        assertTypeLiteral(data, prefix, type);
        return;
      case 'custom':
        assertTypeCustom(data, prefix, type);
        return;
      default:
        throw Error(
          `Don't know how to create a type guard for this kind of type: ${JSON.stringify(type)}`
        );
    }
  }

  if (typeof data !== 'object')
    throw Error(`Expected ${prefix} to be an object and not a ${prettytypeof(data)}!`);

  const obj = data as { [key: string]: unknown };
  for (const name of Object.keys(type)) {
    if (typeof name !== 'string') continue;

    assertType(obj[name], type[name], `${prefix}.${name}`);
  }
}

function assertTypeTuple(
  data: unknown,
  prefix: string,
  [, ...types]: ['tuple', ...TypeDef[]]
): asserts data is unknown[] {
  assertArray(data);
  if (types.length > data.length) {
    throw Error(
      `Expected ${prefix}'s length to be at least ${types.length} and not ${data.length}!`
    );
  }
  for (let i = 0; i < types.length; i++) {
    const type: TypeDef = types[i] as TypeDef;
    assertType(data[i], type, `${prefix}[${i}]`);
  }
}

function assertTypeTupleWithRest(
  data: unknown,
  prefix: string,
  [, ...types]: ['tuple...', ...TypeDef[], TypeDef]
) {
  const last = types.length - 1;
  const fixTypes = types.slice(0, last);
  assertTypeTuple(data, prefix, ['tuple', ...fixTypes]);
  const rest = types[last];
  for (let i = last; i < data.length; i++) {
    assertType(data[i], rest, `${prefix}[${i}]`);
  }
}

function assertTypePartial(
  data: unknown,
  prefix: string,
  [, type]: ['partial', { [name: string]: TypeDef }]
) {
  assertObject(data, prefix);
  for (const name of Object.keys(type)) {
    if (typeof name !== 'string') continue;

    const attrib: unknown = data[name];
    if (typeof attrib !== 'undefined') {
      assertType(attrib, type[name], `${prefix}.${name}`);
    }
  }
}

function assertTypeArray(data: unknown, prefix: string, type: TypeDefArray) {
  if (!Array.isArray(data))
    throw Error(`Expected ${prefix} to be an array and not a ${prettytypeof(data)}!`);
  const [, subType, constraints] = type;
  if (constraints) {
    const len = data.length;
    if (isNumber(constraints)) {
      if (len !== constraints) {
        throw Error(`Expected ${prefix}'s length to be ${constraints} and not ${len}!`);
      }
    } else {
      const { min, max } = constraints;
      if (isNumber(min) && len < min) {
        throw Error(`Expected ${prefix}'s MIN length to be ${min} and not ${len}!`);
      }
      if (isNumber(max) && len > max) {
        throw Error(`Expected ${prefix}'s MAX length to be ${max} and not ${len}!`);
      }
    }
  }

  for (let i = 0; i < data.length; i += 1) {
    assertType(data[i], subType, `${prefix}[${i}]`);
  }
}

function assertTypeMap(data: unknown, prefix: string, type: ['map', TypeDef]) {
  if (!isObject(data))
    throw Error(`Expected ${prefix} to be an object and not a ${prettytypeof(data)}!`);
  const [, subType] = type;
  for (const key of Object.keys(data)) {
    if (typeof key === 'string') {
      assertType(data[key], subType, `${prefix}[${key}]`);
    }
  }
}

function assertTypeOptional(data: unknown, prefix: string, type: ['?', TypeDef]) {
  if (typeof data === 'undefined') return;

  const [, optionalType] = type;
  assertType(data, optionalType, prefix);
}

function assertTypeAlternative(data: unknown, prefix: string, type: ['|', ...TypeDef[]]) {
  const [, ...altTypes] = type;
  let lastException = Error(
    `No type has been defined for this alternative: ${JSON.stringify(type)}!`
  );
  for (const altType of altTypes) {
    try {
      assertType(data, altType, prefix);
      return;
    } catch (ex) {
      if (ex instanceof Error) lastException = ex;
    }
  }
  throw lastException;
}

function assertTypeLiteral(data: unknown, prefix: string, type: ['literal', ...string[]]) {
  const [, ...literals] = type;
  if (!isString(data)) {
    throw Error(
      `Expected ${prefix} to be a literal (${literals
        .map((item) => `"${item}"`)
        .join(' | ')}) and not a ${prettytypeof(data)}!`
    );
  }

  for (const literal of literals) {
    if (data === literal) return;
  }
  throw Error(
    `Expected ${prefix} to be a literal (${literals
      .map((item) => `"${item}"`)
      .join(' | ')}) and not a ${prettytypeof(data)} ("${data}")!`
  );
}

function assertTypeCustom(
  data: unknown,
  prefix: string,
  [, typeGuard]: ['custom', TypeDefFunction]
) {
  // Custom type guard.
  if (!typeGuard(data)) {
    throw Error(`Expected ${typeGuard.name}(${prefix}) to return true!`);
  }
}

/**
 * Basically, this function checks a `data` against a `type` and returns a `defaultValue`
 * if `data` is not of the expected type.
 *
 * But if the `defaultValue` is a function returning the expected `type`, then `ensureType`
 * can be use to update old data that you have retrieved from local storage, for example.
 *
 * @example
 * ```
 * interface Complex { r: number, i: number }
 * const complex = ensureType<Complex>(data, {r: "number", i: "number"}, { r: 1, i: 0 })
 * ```
 *
 * @example
 * ```
 * interpace PersonVersion1 {
 *   name: string
 *   female: boolean
 * }
 * interpace PersonVersion2 {
 *   name: string
 *   gender: "male" | "female" | "nonbinary" | "unknown"
 * }
 *
 * const data = JSON.parse(LocalStorate.getItem("person") ?? "null")
 * const TypePersonVersion1 = {
 *   name: "string",
 *   female: "boolean"
 * }
 * const TypePersonVersion2 = {
 *   name: "string",
 *   gender: ["literal", "male", "female", "nonbinary", "unknown"]
 * }
 * const person = ensureType<PersonVersion2>(
 *   data,
 *   TypePersonVersion2,
 *   (value: unknown) => {
 *     if (isType<PersonVersion2>(value, TypePersonVersion2)) {
 *       return value
 *     }
 *     if (isType<PersonVersion1>(value, TypePersonVersion1)) {
 *       return {
 *         name: value.name,
 *         gender: value.female === true ? "female" : "unknown"
 *       }
 *     }
 *     return { name: "Anonymous", gender: "unknown" }
 *   }
 * )
 * ```
 *
 * @param data Value with unknown type.
 * @param type The type to check against.
 * @param defaultValue If the type doesn't check, we can return `defaultValue`, or call it if this is a function.
 * @returns A value that is of the expected type.
 */
export function ensureType<T>(
  data: unknown,
  type: TypeDef,
  defaultValue: T | ((v: unknown) => T)
): T {
  if (isType<T>(data, type)) return data;

  return isType<T>(defaultValue, type) ? defaultValue : defaultValue(data);
}

function prettytypeof(data: unknown) {
  if (data === null) return 'null';
  if (typeof data === 'function') return `function ${data.name ?? ''}()`;
  return typeof data;
}

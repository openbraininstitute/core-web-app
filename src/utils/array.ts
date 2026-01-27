import isArray from 'es-toolkit/compat/isArray';
import isEmpty from 'es-toolkit/compat/isEmpty';
import isNil from 'es-toolkit/compat/isNil';

// Overload 1: checkNotEmpty is true, returns boolean
export function ensureArray<TElement>(options: {
  input?: TElement | ReadonlyArray<TElement> | null;
  checkNotEmpty: true;
  throwIfEmpty?: boolean;
}): boolean;

// Overload 2: checkNotEmpty is false or omitted, returns Array<TElement>
export function ensureArray<TElement>(options: {
  input?: TElement | ReadonlyArray<TElement> | null;
  checkNotEmpty?: false;
}): Array<TElement>;

export function ensureArray<TElement>({
  input,
  checkNotEmpty = false,
  throwIfEmpty = false,
}: {
  input?: TElement | ReadonlyArray<TElement> | null;
  checkNotEmpty?: boolean;
  throwIfEmpty?: boolean;
}): Array<TElement> | boolean {
  let resultArray: Array<TElement>;

  if (isNil(input)) {
    resultArray = [];
  } else if (isArray(input)) {
    resultArray = input as Array<TElement>;
  } else {
    resultArray = [input as TElement];
  }

  if (checkNotEmpty) {
    const arrayIsEmpty = isEmpty(resultArray);
    if (arrayIsEmpty && throwIfEmpty) {
      throw new Error('Resulting array must not be empty when throwIfEmpty is true.');
    }
    return !arrayIsEmpty;
  }
  return resultArray;
}

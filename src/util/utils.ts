import { format } from 'date-fns';
import capitalize from 'lodash/capitalize';
import _memoize from 'lodash/memoize';
import { ZodError } from 'zod';

export function createHeaders(
  token: string,
  extraOptions: Record<string, string> | null = {
    'Content-Type': 'application/json',
    Accept: '*/*',
  }
) {
  return new Headers({
    Authorization: `Bearer ${token}`,
    ...extraOptions,
  });
}

export function classNames(...classes: Array<string | null | undefined | boolean>) {
  return classes.filter(Boolean).join(' ');
}

export function getCurrentDate(separator: string = '_', returnAlsoTime = false) {
  const now = new Date();
  const timeDisplay = returnAlsoTime ? 'numeric' : undefined;
  const options = {
    day: 'numeric',
    month: 'numeric',
    year: 'numeric',
    hour: timeDisplay,
    minute: timeDisplay,
    second: timeDisplay,
  } as const;
  let formatted = new Intl.DateTimeFormat('en-GB', options).format(now);
  formatted = formatted.replaceAll('/', separator);
  return formatted;
}

export const normalizedDate = (date: string | number | Date) =>
  date instanceof Date ? date : new Date(date);

export const formatDate = (date: string | Date, formatStr: string = 'dd-MM-yyyy') =>
  format(new Date(date), formatStr);

export const normalizeString = (term: string) => term.trim().toLowerCase();

const conjunctionWords = ['and', 'but', 'or', 'nor', 'for', 'so', 'yet', 'of'];
const romanNumeralsRegex = /^\(?(?=[MDCLXVI])M*(C[MD]|D?C*)(X[CL]|L?X*)(I[XV]|V?I*)\)?$/;

const checkRomanSeperatedByDash = (str: string) => {
  const words = str.split('-');
  return words.every((word) => romanNumeralsRegex.test(word.toUpperCase()));
};

export function brainRegionTitleCaseExceptConjunctions(phrase: string) {
  const words = phrase.split(' ');
  const capitalizedWords = words.map((word) => {
    const lowerWord = word.toLowerCase();
    if (
      conjunctionWords.includes(lowerWord) ||
      romanNumeralsRegex.test(lowerWord.toUpperCase()) ||
      checkRomanSeperatedByDash(word)
    ) {
      return word;
    }
    return capitalize(word);
  });

  return capitalizedWords.join(' ');
}

export function fieldTitleSentenceCase(title: string) {
  const SKIP_LOWER = ['SEM', 'Mean ± STD', 'ME-model'];
  return SKIP_LOWER.includes(title) ? title : title.charAt(0) + title.slice(1).toLowerCase();
}

/* Creates an LRU (Least Recently Used) Map.
When the size of the map exceeds maxKeys,
the key that was accesed the least recently
is deleted.
*/
function makeLRUMap(maxKeys: number) {
  class LRUMap<K, V> {
    private maxKeys: number;

    private map: Map<K, V>;

    private lru: Map<K, null>;

    constructor() {
      this.maxKeys = maxKeys;
      this.map = new Map<K, V>();
      this.lru = new Map<K, null>();
    }

    // Helper method to update the access record
    private _updateLRU(key: K): void {
      this.lru.delete(key); // Remove the existing record
      this.lru.set(key, null); // Set it anew as the most recently used, value doesn't matter
    }

    // Helper method to maintain the size of the map
    private _checkSizeAndRemoveLRU(): void {
      if (this.map.size > this.maxKeys) {
        // Least recently used item is the first item in the LRU map
        const lruKey = this.lru.keys().next().value as K;
        this.lru.delete(lruKey);
        this.map.delete(lruKey);
      }
    }

    public set(key: K, value: V) {
      if (this.map.has(key) || this.map.size < this.maxKeys) {
        this._updateLRU(key); // Existing key or space available, update LRU
      }

      this.map.set(key, value);
      this._checkSizeAndRemoveLRU();
      return this; // For consistency with Map.set
    }

    public get(key: K): V | undefined {
      if (!this.map.has(key)) {
        return undefined; // Key doesn't exist, return undefined
      }

      this._updateLRU(key); // Key accessed, update LRU
      return this.map.get(key);
    }

    public has(key: K): boolean {
      return this.map.has(key);
    }

    public delete(key: K): boolean {
      if (this.map.has(key)) {
        this.lru.delete(key);
        return this.map.delete(key);
      }
      return false; // For consistency with native Map.delete behavior
    }

    public clear(): void {
      this.lru.clear();
      this.map.clear();
    }

    public get size(): number {
      return this.map.size;
    }
  }
  return LRUMap;
}

/* Custom memoize constructor that keeps at most maxSize
elements in the cache to prevent memory leaks.
Uses LRU instead of LRI as cache expiry mechanism.
Used in place of atomFamily.
https://jotai.org/docs/utilities/family#caveat-memory-leaks
*/
export function memoize<Param, T>(
  initialize: (param: Param) => T,
  resolver?: (a: Param) => string,
  maxSize?: number
) {
  if (maxSize === undefined) maxSize = 100; // eslint-disable-line
  const newFamily = _memoize(initialize, resolver);
  newFamily.cache = new (makeLRUMap(maxSize))();
  return newFamily;
}

export function formatTimeDifference(differenceInSeconds: number): string {
  if (differenceInSeconds < 60) {
    return `${differenceInSeconds} seconds`;
  }

  if (differenceInSeconds < 3600) {
    const minutes = Math.floor(differenceInSeconds / 60);
    const seconds = differenceInSeconds % 60;
    return `${minutes} minutes ${seconds} seconds`;
  }

  if (differenceInSeconds < 86400) {
    const hours = Math.floor(differenceInSeconds / 3600);
    const minutes = Math.floor((differenceInSeconds % 3600) / 60);
    return `${hours} hours ${minutes} minutes`;
  }

  const days = Math.floor(differenceInSeconds / 86400);
  const hours = Math.floor((differenceInSeconds % 86400) / 3600);
  return `${days} days ${hours} hours`;
}

// Antd email validation does not allow emails such as user@bbp (i.e. emails without top level domain) which is a valid email.
// The following regular expression to validate emails is taken from MDN and seems to be similar to what most browsers support
// https://developer.mozilla.org/en-US/docs/Web/HTML/Element/input/email#basic_validation
export const VALID_EMAIL_REGEXP =
  /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/;

export function getInitializationValue<T>(storageKey: string): T | null {
  const isClientProcessing = typeof window !== 'undefined';
  if (!isClientProcessing) return null;

  const queryParams = new URLSearchParams(window.location.search);
  const brainModelConfigId = queryParams.get('brainModelConfigId');

  const storageKeyWithBrainModelConfigId = `${storageKey}-${brainModelConfigId}`;
  const lastClicked = window.localStorage.getItem(storageKeyWithBrainModelConfigId);

  if (lastClicked && lastClicked !== 'null') {
    return JSON.parse(lastClicked) as T;
  }
  // first time
  return null;
}

export function setInitializationValue<T>(storageKey: string, dataToSave: T) {
  const isClientProcessing = typeof window !== 'undefined';
  if (!isClientProcessing) return;

  const queryParams = new URLSearchParams(window.location.search);
  const brainModelConfigId = queryParams.get('brainModelConfigId');

  const storageKeyWithBrainModelConfigId = `${storageKey}-${brainModelConfigId}`;
  window.localStorage.setItem(storageKeyWithBrainModelConfigId, JSON.stringify(dataToSave));
}

export const isStringEmpty = (str: string) => !str.trim() || !str.trim().length;
export const getZodErrorPath = ({ issues }: ZodError) => {
  return issues.reduce<Array<string | number>>((acc, curr) => {
    return [...acc, ...curr.path];
  }, []);
};

/**
 * Checks if the given input is a valid JSON.
 *
 * This function attempts to parse the input as JSON after converting it to a string.
 * If parsing is successful and the input is not falsy, it returns `true`.
 * Otherwise, it returns `false`.
 *
 * @param {*} str - The input to be checked for JSON validity.
 * @returns {boolean} `true` if the input is a valid JSON, otherwise `false`.
 */
export function isJSON(str: any) {
  try {
    JSON.parse(str);
    return true;
  } catch (e) {
    return false;
  }
}

/**
  Sign out from the app and keycloak.
*/
export function signOut() {
  window.location.href = `/app/log-out`;
}

export async function assertVLApiResponse(res: Response) {
  const data = await res.json();

  if (!res.ok) {
    const { message } = data;
    throw new Error(message || 'An error occurred while processing your request...', {
      cause: {
        ...data,
      },
    });
  }

  return data;
}

export function assertErrorMessage(e: any) {
  if (e instanceof Error) return e.message;
  return 'Something went wrong...';
}

export function getRandomIntInclusive(min: number, max: number) {
  const minCeiled = Math.ceil(min);
  const maxFloored = Math.floor(max);
  return Math.floor(Math.random() * (maxFloored - minCeiled + 1) + minCeiled);
}

const pascalToUnderscore = (str: string): string =>
  str.replace(/[A-Z]/g, (letter) => `_${letter.toLowerCase()}`).replace(/^_/, '');

export const createPascalToUnderscoreProxy = <T extends object>(obj: T): T => {
  const recursiveProxy = (innerTarget: any): any => {
    return new Proxy(innerTarget, {
      get(target, prop: string | symbol, receiver) {
        if (typeof prop === 'string') {
          const underscoreProp = pascalToUnderscore(prop);
          if (underscoreProp in target) {
            const value = Reflect.get(target, underscoreProp, receiver);
            if (value && typeof value === 'object' && !Array.isArray(value)) {
              return recursiveProxy(value);
            }
            return value;
          }
        }
        return Reflect.get(target, prop, receiver);
      },
      set(target, prop: string | symbol, value: any, receiver) {
        if (typeof prop === 'string') {
          const underscoreProp = pascalToUnderscore(prop);
          if (value && typeof value === 'object' && !Array.isArray(value)) {
            // eslint-disable-next-line
            value = recursiveProxy(value);
          }
          return Reflect.set(target, underscoreProp, value, receiver);
        }
        return Reflect.set(target, prop, value, receiver);
      },
    });
  };
  return recursiveProxy(obj);
};

import { EntityCoreIdentifiable } from '@/api/entitycore/types/shared/global';

export const switchStateType = {
  COUNT: 'count',
  DENSITY: 'density',
};

// formats the number in the 4th significant digit and uses US locale for commas in thousands
export const formatNumber = (num: number) => Number(num.toPrecision(4)).toLocaleString('en-US');

export const from64 = (str: string): string => Buffer.from(str, 'base64').toString('binary');

export const to64 = (str: string): string => Buffer.from(str, 'binary').toString('base64');

export function isNumeric(str: string) {
  if (typeof str !== 'string') return false; // we only process strings!
  return (
    !Number.isNaN(str) && // use type coercion to parse the _entirety_ of the string (`parseFloat` alone does not do this)...
    !Number.isNaN(parseFloat(str))
  ); // ...and ensure strings of whitespace fail
}

export const isValidBase64 = (str: string): boolean => {
  try {
    return (
      Buffer.from(Buffer.from(str, 'base64').toString('binary'), 'binary').toString('base64') ===
      str
    );
  } catch (err) {
    return false;
  }
};

export const detailUrlBuilder = <T extends EntityCoreIdentifiable>(basePath: string, resource: T) =>
  `${basePath}/${resource.id}`;

export const localCompareString = (a: string, b: string) => a.localeCompare(b);

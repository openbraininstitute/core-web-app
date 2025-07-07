import { BASE_EXPERIMENTAL_EXPLORE_PATH } from '@/constants/explore-section/paths';
import { ExperimentTypeNames } from '@/constants/explore-section/data-types/experiment-data-types';
import { EntityCoreIdentifiable } from '@/api/entitycore/types/shared/global';

export const switchStateType = {
  COUNT: 'count',
  DENSITY: 'density',
};

// formats the number in the 4th significant digit and uses US locale for commas in thousands
export const formatNumber = (num: number) => Number(num.toPrecision(4)).toLocaleString('en-US');

// sorter, used for ant d tables
const sorter = (a: any, b: any) =>
  Number.isNaN(a) && Number.isNaN(b) ? a - b : `${a}`.localeCompare(b);

const dateStringToUnix = (a: string) => Math.floor(new Date(a).getTime() / 1000);

export const from64 = (str: string): string => Buffer.from(str, 'base64').toString('binary');

export const to64 = (str: string): string => Buffer.from(str, 'binary').toString('base64');

const isEmpty = (obj: Object) => Object.keys(obj).length === 0;

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

const detailUrlOutsideLab = (
  projectLabel: string,
  resourceId: string,
  resourceType: ExperimentTypeNames
) => `${BASE_EXPERIMENTAL_EXPLORE_PATH}/${resourceType}/${to64(`${projectLabel}!/!${resourceId}`)}`;

export const localCompareString = (a: string, b: string) => a.localeCompare(b);

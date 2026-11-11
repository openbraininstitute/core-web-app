import { lowerCase, upperFirst } from 'es-toolkit/compat';

export function getParamLabel(param: string) {
  return upperFirst(lowerCase(param.split('.').at(-1))); // e.g. "initialize.random_seed" -> "Random seed"
}

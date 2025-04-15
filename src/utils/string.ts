import camelCase from 'lodash/camelCase';
import upperFirst from 'lodash/upperFirst';

export function toPascalCase(input: string) {
  return upperFirst(camelCase(input));
}

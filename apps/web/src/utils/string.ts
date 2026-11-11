import camelCase from 'es-toolkit/compat/camelCase';
import upperFirst from 'es-toolkit/compat/upperFirst';

export function toPascalCase(input: string) {
  return upperFirst(camelCase(input));
}

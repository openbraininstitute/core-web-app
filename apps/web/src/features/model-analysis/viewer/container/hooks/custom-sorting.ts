/**
 * Scientists want a custom ordering of the analysis results.
 * They give us a list, and wht is not in this list will be sorted
 * alphabetically after them.
 */
export function customSorting(a: { name: string }, b: { name: string }): number {
  const nameA = prefixName(a.name);
  const nameB = prefixName(b.name);
  if (nameA < nameB) return -1;
  if (nameA > nameB) return +1;
  return 0;
}

function prefixName(name: string) {
  const sanitizedName = name
    .toLocaleLowerCase()
    .split(/[^\p{Letter}]+/giu)
    .join(' ');
  let priority = 999;
  for (let i = 0; i < CUSTOM_ORDER.length; i++) {
    if (sanitizedName.includes(CUSTOM_ORDER[i])) {
      priority = i;
    }
  }
  const prefixedName = `${priority}`.padStart(3, '0') + sanitizedName;
  return prefixedName;
}

/**
 * The following validations must come first,
 * and in this order.
 */
const CUSTOM_ORDER = [
  'hyperpolarization',
  'input resistance validation',
  'spiking',
  'ais spiking',
  'depolarization block',
  'iv curve',
  'fi curve',
  'bpap',
  'back propagating action potential',
];

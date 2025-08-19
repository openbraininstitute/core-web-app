import { ReadonlyURLSearchParams } from 'next/navigation';

export function buildLink(
  searchParams: ReadonlyURLSearchParams,
  key: string,
  value: string
): string {
  const params = new URLSearchParams(searchParams.toString());

  const section = params.get('section');

  const newParams = new URLSearchParams();
  if (section) newParams.set('section', section);

  newParams.set(key, value);

  return `?${newParams.toString()}`;
}

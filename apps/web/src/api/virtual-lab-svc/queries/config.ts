import { virtualLabRootApi } from '@/api/virtual-lab-svc/utils';

import type { CountryConfig } from '@/api/virtual-lab-svc/queries/types';

const baseUri = '/config';

export async function getCountries(): Promise<Array<CountryConfig>> {
  const api = await virtualLabRootApi();
  return await api.get<Array<CountryConfig>>(`${baseUri}/countries`);
}

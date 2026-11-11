import { virtualLabRootApi } from '@/api/virtual-lab-svc/utils';

const baseUri = '/virtual-labs';

export async function getVirtualLabAccountingReport(virtualLabId: string): Promise<any> {
  const api = await virtualLabRootApi();
  const url = `${baseUri}/${virtualLabId}/accounting/reports`;

  return await api.get(url, {
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json',
    },
  });
}

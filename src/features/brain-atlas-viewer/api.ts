import { BRAIN_REGION_DOES_NOT_EXIST } from '@/constants/errors';

/**
 * Fetches the point cloud data from the Cells API
 *
 * @param url
 */
export const fetchPointCloud = (url: string, token: string) =>
  fetch(url, {
    method: 'get',
    headers: new Headers({
      Accept: '*/*',
      'nexus-token': token,
    }),
  }).then((response) => {
    if (!response.ok) {
      return response.json().then((errorData) => {
        if (errorData.message.includes('No region ids found with region')) {
          throw new Error(BRAIN_REGION_DOES_NOT_EXIST);
        }
        throw new Error(errorData.message);
      });
    }
    return response.arrayBuffer();
  });

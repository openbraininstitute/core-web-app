import authFetch from '@/authFetch';
import { basePath } from '@/config';
import { assertApiResponse } from '@/util/utils';
import { OneshotUsage, OneshotReservation } from '@/types/accounting';

export async function makeOneshotReservation(reservation: OneshotReservation) {
  const res = await authFetch(`${basePath}/api/accounting/reservation/oneshot`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(reservation),
  });

  return assertApiResponse(res);
}

export async function cancelOneshotReservation(jobId: string) {
  const res = await authFetch(`${basePath}/api/accounting/reservation/oneshot/${jobId}`, {
    method: 'DELETE',
  });

  return assertApiResponse(res);
}

export async function reportOneshotUsage(oneshotUsage: OneshotUsage) {
  const res = await authFetch(`${basePath}/api/accounting/usage/oneshot`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(oneshotUsage),
  });

  return assertApiResponse(res);
}

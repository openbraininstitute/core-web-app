import authFetch from '@/authFetch';
import { assertApiResponse } from '@/util/utils';
import {
  OneshotUsage,
  OneshotReservation,
  ServiceType,
  OneshotReservationResponse,
} from '@/types/accounting';

async function makeOneshotReservation(
  reservation: OneshotReservation
): Promise<OneshotReservationResponse> {
  const res = await authFetch('/api/accounting/reservation/oneshot', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(reservation),
  });

  return assertApiResponse(res);
}

async function cancelOneshotReservation(jobId: string) {
  const res = await authFetch('/api/accounting/reservation/oneshot/${jobId}', {
    method: 'DELETE',
  });

  return assertApiResponse(res);
}

async function reportOneshotUsage(oneshotUsage: OneshotUsage) {
  const res = await authFetch('/api/accounting/usage/oneshot', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(oneshotUsage),
  });

  return assertApiResponse(res);
}

export class OneshotSession {
  private params: OneshotReservation;

  constructor(params: Omit<OneshotReservation, 'type'>) {
    this.params = {
      ...params,
      type: ServiceType.Oneshot,
    };
  }

  async useWith<T>(executorFn: () => Promise<T>) {
    const reservationRes = await makeOneshotReservation(this.params);
    const { jobId } = reservationRes.data;

    let result: T;

    try {
      result = await executorFn();
    } catch (error) {
      await cancelOneshotReservation(jobId);
      throw error;
    } finally {
      await reportOneshotUsage({
        ...this.params,
        jobId,
        timestamp: new Date().toISOString(),
      });
    }

    return result;
  }
}

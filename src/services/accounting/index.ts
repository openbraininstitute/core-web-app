import authFetch from '@/authFetch';
import { assertApiResponse } from '@/util/utils';
import { OneshotUsage, OneshotReservation, OneshotReservationResponse } from '@/types/accounting';
import { accountingBaseUrl } from '@/config';

type OneShotReservationRequest = Omit<OneshotReservation, 'type' | 'userId'>;
type OneshotUsageReport = Omit<OneshotUsage, 'type'>;

async function makeOneshotReservation(
  reservation: OneShotReservationRequest
): Promise<OneshotReservationResponse> {
  const res = await authFetch('/api/accounting/reservation/oneshot', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(reservation),
  });

  return assertApiResponse(res);
}

async function cancelOneshotReservation(jobId: string) {
  const res = await authFetch(`/api/accounting/reservation/oneshot/${jobId}`, {
    method: 'DELETE',
  });

  return assertApiResponse(res);
}

async function reportOneshotUsage(oneshotUsageReport: OneshotUsageReport) {
  const res = await authFetch('/api/accounting/usage/oneshot', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(oneshotUsageReport),
  });

  return assertApiResponse(res);
}

export class OneshotSession {
  private reservationRequest: OneShotReservationRequest;

  private enabled: boolean;

  constructor(params: OneShotReservationRequest) {
    this.reservationRequest = params;
    this.enabled = !!accountingBaseUrl;
  }

  async useWith<T>(executorFn: () => Promise<T>) {
    if (!this.enabled) {
      return executorFn();
    }

    const reservationRes = await makeOneshotReservation(this.reservationRequest);
    const { jobId } = reservationRes.data;

    let result: T;

    try {
      result = await executorFn();
    } catch (error) {
      await cancelOneshotReservation(jobId);
      throw error;
    } finally {
      await reportOneshotUsage({
        ...this.reservationRequest,
        jobId,
        timestamp: new Date().toISOString(),
      });
    }

    return result;
  }
}

import { createApiHeaders } from './common';
import { PaymentMethod, VlabBalance, VlabBudgetTopup } from '@/types/virtual-lab/billing';
import { virtualLabApi } from '@/config';

type NewPaymentMethodPayload = {
  setupIntentId: string;
  name: string;
  email: string;
};

type NewBudgetTopUpPayload = {
  credit?: number;
  paymentMethodId?: string;
};

type VirtualLabPaymentMethodsResponse = {
  data: {
    virtual_lab_id: string;
    payment_methods: Array<PaymentMethod>;
  };
};

type VirtualLabBalanceResponse = {
  data: VlabBalance;
};

type VirtualLabCreditTopupResponse = {
  data: VlabBudgetTopup;
};

type AddVirtualLabPaymentMethodResponse = {
  data: {
    virtual_lab_id: string;
    payment_method: PaymentMethod;
  };
};

type DeletedVirtualLabPaymentMethodResponse = {
  data: {
    virtual_lab_id: string;
    payment_method_id: string;
    deleted: boolean;
    deleted_at: string;
  };
};

export type SetupIntentResponse = {
  data: {
    id: string;
    client_secret: string;
    customer_id: string;
  };
};

export async function generateSetupIntent(id: string, token: string): Promise<SetupIntentResponse> {
  const response = await fetch(`http://localhost:8000/virtual-labs/e2de03dc-2913-4c7f-b175-54b0f3b710b7/billing/setup-intent`, {
    method: 'POST',
    headers: createApiHeaders("eyJhbGciOiJSUzI1NiIsInR5cCIgOiAiSldUIiwia2lkIiA6ICJza2hnaTdjRWxFbEJzRFpnZXh1NGlvSzBNV081eGtQbWlXWENYang4eHVrIn0.eyJleHAiOjE4MjcyMTcyNjgsImlhdCI6MTc0MDkwMzY2OCwianRpIjoiZGM4MWY5MmUtODBhYi00YmQ4LWJmNmQtZTFhY2U2NWFmMDIzIiwiaXNzIjoiaHR0cDovL2tleWNsb2FrOjkwOTAvcmVhbG1zL29icC1yZWFsbSIsImF1ZCI6ImFjY291bnQiLCJzdWIiOiJmYzgyNzY1NS1hOTU3LTQ1N2QtYWMyYi1iZWEwN2E5NThiNjQiLCJ0eXAiOiJCZWFyZXIiLCJhenAiOiJvYnBhcHAiLCJzZXNzaW9uX3N0YXRlIjoiNGQyZTIyNTctYWZhYS00YjJmLWI4YTctYzg2Y2UyMjkyYzdjIiwiYWNyIjoiMSIsInJlYWxtX2FjY2VzcyI6eyJyb2xlcyI6WyJvZmZsaW5lX2FjY2VzcyIsInVtYV9hdXRob3JpemF0aW9uIl19LCJyZXNvdXJjZV9hY2Nlc3MiOnsiYWNjb3VudCI6eyJyb2xlcyI6WyJtYW5hZ2UtYWNjb3VudCIsIm1hbmFnZS1hY2NvdW50LWxpbmtzIiwidmlldy1wcm9maWxlIl19fSwic2NvcGUiOiJvcGVuaWQgcHJvZmlsZSBlbWFpbCIsInNpZCI6IjRkMmUyMjU3LWFmYWEtNGIyZi1iOGE3LWM4NmNlMjI5MmM3YyIsImVtYWlsX3ZlcmlmaWVkIjp0cnVlLCJuYW1lIjoidGVzdCB0ZXN0IiwicHJlZmVycmVkX3VzZXJuYW1lIjoidGVzdCIsImdpdmVuX25hbWUiOiJ0ZXN0IiwiZmFtaWx5X25hbWUiOiJ0ZXN0IiwiZW1haWwiOiJ0ZXN0QHRlc3QuY29tIn0.iBIl3IAuZ7Gu5V7zrxEbyiY5V5lksn_axk78bfN0FcQRFZ6X0-fx-PZfuhZGctVwfA7prL5fdP-wij_y4hxozI6jrO3rtTwE3jDEemn_sU7Qpzd-7RpHd0EolRh9k0_VVBNfNVZDaF6wjyYhv2MecN0uKw4EqYg9i5x0iK5Q9Z_Xlm195NMm8amXZVdEGP_Gb0xGC1eiR5RrpUy0kOibkp5Hzzj0FcFIU--PZevJQUbvHEvrfya5Xphgnxqllt9XObHhMJRC39l2ckFL-2MeHjucEw-X7bq5qSWiE_98jkRu_plRHsaORU1_2gNVSBkym-w7w2xyrvzslHZ21uVZNw"),
  });

  if (!response.ok) {
    throw new Error(`Status: ${response.status}`);
  }
  return response.json();
}

export async function getVirtualLabPaymentMethods(
  id: string,
  token: string
): Promise<VirtualLabPaymentMethodsResponse> {
  const response = await fetch(`${virtualLabApi.url}/virtual-labs/${id}/billing/payment-methods`, {
    method: 'GET',
    headers: createApiHeaders(token),
  });
  if (!response.ok) {
    throw new Error(`Status: ${response.status}`);
  }
  return response.json();
}

export async function getVirtualLabBalanceDetails(
  id: string,
  token: string
): Promise<VirtualLabBalanceResponse> {
  const response = await fetch(`${virtualLabApi.url}/virtual-labs/${id}/billing/balance`, {
    method: 'GET',
    headers: createApiHeaders(token),
  });
  if (!response.ok) {
    throw new Error(`Status: ${response.status}`);
  }
  return response.json();
}

export async function addVirtualLabBudget(
  id: string,
  payload: NewBudgetTopUpPayload,
  token: string
): Promise<VirtualLabCreditTopupResponse> {
  const response = await fetch(`${virtualLabApi.url}/virtual-labs/${id}/billing/budget-topup`, {
    method: 'POST',
    headers: {
      ...createApiHeaders(token),
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      credit: payload.credit,
      payment_method_id: payload.paymentMethodId,
    }),
  });
  if (!response.ok) {
    throw new Error(`Status: ${response.status}`);
  }
  return response.json();
}

export async function addNewPaymentMethodToVirtualLab(
  id: string,
  token: string,
  payload: NewPaymentMethodPayload
): Promise<AddVirtualLabPaymentMethodResponse> {
  const response = await fetch(`${virtualLabApi.url}/virtual-labs/${id}/billing/payment-methods`, {
    method: 'POST',
    headers: {
      ...createApiHeaders(token),
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    throw new Error(`Status: ${response.status}`);
  }
  return response.json();
}

export async function updateDefaultPaymentMethodToVirtualLab(
  id: string,
  token: string,
  paymentMethodId: string
): Promise<AddVirtualLabPaymentMethodResponse> {
  const response = await fetch(
    `${virtualLabApi.url}/virtual-labs/${id}/billing/payment-methods/default`,
    {
      method: 'PATCH',
      headers: {
        ...createApiHeaders(token),
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ payment_method_id: paymentMethodId }),
    }
  );

  if (!response.ok) {
    throw new Error(`Status: ${response.status}`);
  }
  return response.json();
}

export async function deletePaymentMethodToVirtualLab(
  id: string,
  token: string,
  paymentMethodId: string
): Promise<DeletedVirtualLabPaymentMethodResponse> {
  const response = await fetch(
    `${virtualLabApi.url}/virtual-labs/${id}/billing/payment-methods/${paymentMethodId}`,
    {
      method: 'DELETE',
      headers: createApiHeaders(token),
    }
  );

  if (!response.ok) {
    throw new Error(`Status: ${response.status}`);
  }
  return response.json();
}

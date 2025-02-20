export interface VlmResponse<T> {
  message: string;
  data: T;
}

export interface VlmError {
  error_code: string;
  message: string;
  details: string | Record<string, string> | null;
}

export interface VirtualLabAPIListData<ReponseType> {
  results: ReponseType[];
  page: number;
  size: number;
  page_size: number;
  total: number;
}

export function isVlmError(response: any): response is VlmError {
  return response?.error_code && response?.message;
}

export type VirtualLabInfo = {
  virtualLabId: string;
  projectId: string;
};

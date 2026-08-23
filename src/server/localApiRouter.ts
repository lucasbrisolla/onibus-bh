import {
  dispatchApiRequest,
  type ApiContractOperations,
  type ApiContractResponse,
} from './apiContractDispatcher.js';

export type LocalApiHandlers = ApiContractOperations;

export interface LocalApiRequest {
  method: string | undefined;
  url: string | undefined;
  handlers: LocalApiHandlers;
}

export type LocalApiResponse = ApiContractResponse;

export function resolveLocalApiRequest({
  method,
  url,
  handlers,
}: LocalApiRequest): Promise<LocalApiResponse | null> {
  return dispatchApiRequest({ method, url }, handlers);
}

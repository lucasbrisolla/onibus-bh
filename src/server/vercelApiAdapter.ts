import type { VercelRequest } from '@vercel/node';
import {
  dispatchApiRequest,
  type ApiContractOperations,
  type ApiContractRequest,
  type ApiContractResponse,
} from './apiContractDispatcher.js';
import { defaultApiOperations } from './apiOperations.js';

export type VercelApiRequest = Pick<VercelRequest, 'method' | 'url' | 'query'>;

export interface VercelApiResponse {
  status(statusCode: number): {
    json(body: unknown): unknown;
  };
}

function toContractRequest(request: VercelApiRequest): ApiContractRequest {
  return {
    method: request.method,
    url: request.url,
    query: request.query,
  };
}

export function resolveVercelApiRequest(
  request: VercelApiRequest,
  operations: ApiContractOperations = defaultApiOperations,
): Promise<ApiContractResponse | null> {
  return dispatchApiRequest(toContractRequest(request), operations);
}

export function createVercelApiHandler(
  operations: ApiContractOperations = defaultApiOperations,
) {
  return async function handleVercelApiRequest(
    request: VercelApiRequest,
    response: VercelApiResponse,
  ): Promise<void> {
    const result = await resolveVercelApiRequest(request, operations);
    if (!result) {
      return;
    }

    response.status(result.status).json(result.body);
  };
}

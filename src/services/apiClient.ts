import type { Prediction } from '../domain/types';

interface PredictionsResponse {
  predictions: Prediction[];
}

export class ApiClientError extends Error {
  constructor(
    message: string,
    public readonly status: number,
  ) {
    super(message);
    this.name = 'ApiClientError';
  }
}

async function readJson<T>(response: Response): Promise<T> {
  const data = (await response.json()) as T & { error?: { message?: string } };

  if (!response.ok) {
    throw new ApiClientError(data.error?.message ?? 'Erro ao consultar API', response.status);
  }

  return data;
}

export async function fetchStopPredictions(stopCode: string): Promise<Prediction[]> {
  const response = await fetch(`/api/paradas/${encodeURIComponent(stopCode)}/previsoes`);
  const data = await readJson<PredictionsResponse>(response);
  return data.predictions;
}

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
  let data: (T & { error?: { message?: string } }) | null = null;

  try {
    data = (await response.json()) as T & { error?: { message?: string } };
  } catch {
    if (!response.ok) {
      throw new ApiClientError('Erro ao consultar API', response.status);
    }

    throw new ApiClientError('Erro ao consultar API', response.status);
  }

  if (!response.ok) {
    throw new ApiClientError(data.error?.message ?? 'Erro ao consultar API', response.status);
  }

  return data;
}

export async function fetchStopPredictions(stopCode: string): Promise<Prediction[]> {
  let response: Response;

  try {
    response = await fetch(`/api/paradas/${encodeURIComponent(stopCode)}/previsoes`);
  } catch {
    throw new ApiClientError('Não foi possível conectar à API', 0);
  }

  const data = await readJson<PredictionsResponse>(response);
  return data.predictions;
}

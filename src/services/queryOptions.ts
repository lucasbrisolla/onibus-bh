import { fetchStopPredictions } from './apiClient';

// Previsões são dados voláteis: cada refresh explícito deve consultar a fonte.
// O QueryClient ainda deduplica chamadas simultâneas e mantém a última resposta.
export const STOP_PREDICTIONS_STALE_TIME_MS = 0;

let queryScopeSequence = 0;

export function createQueryScope(): string {
  queryScopeSequence += 1;
  return `app-${queryScopeSequence}`;
}

export function stopPredictionsQueryOptions(stopCode: string, queryScope = 'global') {
  const normalizedStopCode = stopCode.trim();

  return {
    queryKey: [queryScope, 'stop-predictions', normalizedStopCode] as const,
    queryFn: () => fetchStopPredictions(normalizedStopCode),
    staleTime: STOP_PREDICTIONS_STALE_TIME_MS,
  };
}

import { AppError, BadGatewayError, GatewayTimeoutError } from './errors';
import { parseJsonp } from './jsonp';
import { normalizePredictions } from './normalizers';

export const SIU_BASE_URL = 'http://bhz.siumobile.com.br:6060/siumobile-ws-v01/rest/ws';

const DEFAULT_TIMEOUT_MS = 8000;

export async function fetchJsonp(path: string, timeoutMs = DEFAULT_TIMEOUT_MS): Promise<unknown> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(`${SIU_BASE_URL}${path}`, { signal: controller.signal });

    if (!response.ok) {
      throw new BadGatewayError(`SIU Mobile respondeu com HTTP ${response.status}`);
    }

    return parseJsonp(await response.text());
  } catch (error) {
    if (error instanceof AppError) {
      throw error;
    }

    if (error instanceof Error && error.name === 'AbortError') {
      throw new GatewayTimeoutError('SIU Mobile não respondeu no tempo esperado', error);
    }

    throw new BadGatewayError('Falha ao consultar SIU Mobile', error);
  } finally {
    clearTimeout(timeout);
  }
}

export async function getStopPredictions(stopCode: string) {
  const payload = await fetchJsonp(
    `/V3/buscarPrevisoes/${encodeURIComponent(stopCode)}/false/0/null/jsonpCallback`,
  );

  return normalizePredictions(payload as Record<string, unknown>);
}

export async function getLines() {
  return fetchJsonp('/buscarLinhas/jsonpCallback');
}

export async function checkSiuHealth() {
  await fetchJsonp('/buscarLinhas/jsonpCallback', 5000);

  return { ok: true };
}

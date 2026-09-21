import { AppError, BadGatewayError, GatewayTimeoutError } from './errors.js';
import { parseJsonp } from './jsonp.js';

export const SIU_BASE_URL =
  'http://bhz.siumobile.com.br:6060/siumobiletacomapp/siumobile-ws-v01/rest/ws';

export const DEFAULT_JSONP_TIMEOUT_MS = 8000;

export interface JsonpRequestOptions {
  timeoutMs?: number;
}

export interface JsonpTransport {
  requestJsonp(path: string, options?: JsonpRequestOptions): Promise<unknown>;
}

export interface JsonpTransportOptions {
  baseUrl?: string;
  defaultTimeoutMs?: number;
  fetchImpl?: typeof fetch;
}

function joinUrl(baseUrl: string, path: string): string {
  return `${baseUrl.replace(/\/+$/, '')}/${path.replace(/^\/+/, '')}`;
}

export function createJsonpTransport(options: JsonpTransportOptions = {}): JsonpTransport {
  const baseUrl = options.baseUrl ?? SIU_BASE_URL;
  const defaultTimeoutMs = options.defaultTimeoutMs ?? DEFAULT_JSONP_TIMEOUT_MS;

  return {
    async requestJsonp(path, requestOptions = {}) {
      const controller = new AbortController();
      const timeoutMs = requestOptions.timeoutMs ?? defaultTimeoutMs;
      const timeout = setTimeout(() => controller.abort(), timeoutMs);

      try {
        const fetchImpl = options.fetchImpl ?? globalThis.fetch;
        const response = await fetchImpl(joinUrl(baseUrl, path), {
          signal: controller.signal,
        });

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
    },
  };
}

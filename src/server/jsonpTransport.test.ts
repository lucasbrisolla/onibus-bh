import { afterEach, describe, expect, it, vi } from 'vitest';

import { createJsonpTransport, SIU_BASE_URL } from './jsonpTransport';

function createFetchResponse(body: string, status = 200): Response {
  return new Response(body, { status });
}

describe('createJsonpTransport', () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it('monta a URL SIU, consulta a rede e faz o parsing da resposta JSONP', async () => {
    const fetchImpl = vi.fn(
      async (input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
        expect(input).toBe(`${SIU_BASE_URL}/buscarLinhas/jsonpCallback`);
        expect(init?.signal).toBeInstanceOf(AbortSignal);

        return createFetchResponse('jsonpCallback({"linhas":["8350"]})');
      },
    );
    const transport = createJsonpTransport({ fetchImpl });

    await expect(transport.requestJsonp('/buscarLinhas/jsonpCallback')).resolves.toEqual({
      linhas: ['8350'],
    });
    expect(fetchImpl).toHaveBeenCalledOnce();
  });

  it('traduz resposta HTTP inválida como falha upstream', async () => {
    const fetchImpl = vi.fn(async (): Promise<Response> => createFetchResponse('indisponível', 503));
    const transport = createJsonpTransport({ fetchImpl });

    await expect(transport.requestJsonp('/falha')).rejects.toMatchObject({
      statusCode: 502,
      code: 'bad_gateway',
      message: 'SIU Mobile respondeu com HTTP 503',
    });
  });

  it('traduz timeout como gateway timeout', async () => {
    vi.useFakeTimers();
    const fetchImpl = vi.fn(
      async (_input: RequestInfo | URL, init?: RequestInit): Promise<Response> =>
        new Promise<Response>((_resolve, reject) => {
          init?.signal?.addEventListener('abort', () => {
            const error = new Error('aborted');
            error.name = 'AbortError';
            reject(error);
          });
        }),
    );
    const transport = createJsonpTransport({ fetchImpl, defaultTimeoutMs: 25 });
    const request = transport.requestJsonp('/lenta');
    const rejection = expect(request).rejects.toMatchObject({
      statusCode: 504,
      code: 'gateway_timeout',
      message: 'SIU Mobile não respondeu no tempo esperado',
    });

    await vi.advanceTimersByTimeAsync(25);

    await rejection;
  });

  it('traduz JSONP inválido como falha upstream', async () => {
    const fetchImpl = vi.fn(async (): Promise<Response> => createFetchResponse('{"linhas":[]}'));
    const transport = createJsonpTransport({ fetchImpl });

    await expect(transport.requestJsonp('/jsonp-invalido')).rejects.toMatchObject({
      statusCode: 502,
      code: 'bad_gateway',
      message: 'Resposta JSONP inválida',
    });
  });

  it('traduz falha de rede como falha upstream', async () => {
    const networkError = new Error('socket closed');
    const fetchImpl = vi.fn(async (): Promise<Response> => {
      throw networkError;
    });
    const transport = createJsonpTransport({ fetchImpl });

    await expect(transport.requestJsonp('/rede-indisponivel')).rejects.toMatchObject({
      statusCode: 502,
      code: 'bad_gateway',
      message: 'Falha ao consultar SIU Mobile',
      cause: networkError,
    });
  });
});

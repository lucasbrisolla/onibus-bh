import type { VercelRequest, VercelResponse } from '@vercel/node';
import { toHttpError } from '../src/server/errors.js';
import { checkSiuHealth } from '../src/server/siuClient.js';

function sendError(response: VercelResponse, error: unknown) {
  const httpError = toHttpError(error);
  response.status(httpError.statusCode).json({
    error: {
      code: httpError.code,
      message: httpError.message,
    },
  });
}

export default async function handler(request: VercelRequest, response: VercelResponse) {
  if (request.method !== 'GET') {
    response.status(405).json({
      error: { code: 'method_not_allowed', message: 'Método não permitido' },
    });
    return;
  }

  try {
    response.status(200).json(await checkSiuHealth());
  } catch (error) {
    sendError(response, error);
  }
}

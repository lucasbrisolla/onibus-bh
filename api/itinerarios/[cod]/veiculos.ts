import type { VercelRequest, VercelResponse } from '@vercel/node';
import { BadRequestError, toHttpError } from '../../../src/server/errors.js';
import { getVehicles } from '../../../src/server/siuClient.js';

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

  const cod = Array.isArray(request.query.cod) ? request.query.cod[0] : request.query.cod;

  if (!cod || !/^\d+$/.test(cod)) {
    sendError(response, new BadRequestError('Código do itinerário inválido'));
    return;
  }

  try {
    response.status(200).json({ vehicles: await getVehicles(cod) });
  } catch (error) {
    sendError(response, error);
  }
}

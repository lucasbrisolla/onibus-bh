import type { VercelRequest, VercelResponse } from '@vercel/node';
import { BadRequestError, toHttpError } from '../../src/server/errors';
import { getNearbyStops } from '../../src/server/siuClient';

function sendError(response: VercelResponse, error: unknown) {
  const httpError = toHttpError(error);
  response.status(httpError.statusCode).json({
    error: {
      code: httpError.code,
      message: httpError.message,
    },
  });
}

function readNumberParam(value: string | string[] | undefined): number | null {
  const raw = Array.isArray(value) ? value[0] : value;
  if (!raw) {
    return null;
  }

  const parsed = Number(raw);
  return Number.isFinite(parsed) ? parsed : null;
}

export default async function handler(request: VercelRequest, response: VercelResponse) {
  if (request.method !== 'GET') {
    response.status(405).json({
      error: { code: 'method_not_allowed', message: 'Método não permitido' },
    });
    return;
  }

  const latitude = readNumberParam(request.query.lat);
  const longitude = readNumberParam(request.query.lng);

  if (latitude === null || longitude === null) {
    sendError(response, new BadRequestError('Latitude e longitude são obrigatórias'));
    return;
  }

  try {
    response.status(200).json({ stops: await getNearbyStops(latitude, longitude) });
  } catch (error) {
    sendError(response, error);
  }
}

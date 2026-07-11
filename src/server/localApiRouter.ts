import { toHttpError } from './errors';
import type { NearbyStop, Prediction, RoutePoint, Vehicle } from '../domain/types';

export interface LocalApiHandlers {
  getStopPredictions: (stopCode: string) => Promise<Prediction[]>;
  getNearbyStops: (latitude: number, longitude: number) => Promise<NearbyStop[]>;
  getRoutePoints: (serviceId: string) => Promise<RoutePoint[]>;
  getVehicles: (serviceId: string) => Promise<Vehicle[]>;
}

export interface LocalApiRequest {
  method: string | undefined;
  url: string | undefined;
  handlers: LocalApiHandlers;
}

export interface LocalApiResponse {
  status: number;
  body: unknown;
}

function apiError(error: unknown): LocalApiResponse {
  const httpError = toHttpError(error);

  return {
    status: httpError.statusCode,
    body: {
      error: {
        code: httpError.code,
        message: httpError.message,
      },
    },
  };
}

function methodNotAllowed(): LocalApiResponse {
  return {
    status: 405,
    body: {
      error: {
        code: 'method_not_allowed',
        message: 'Método não permitido',
      },
    },
  };
}

function badRequest(message: string): LocalApiResponse {
  return {
    status: 400,
    body: {
      error: {
        code: 'bad_request',
        message,
      },
    },
  };
}

function readNumber(value: string | null): number | null {
  if (!value) {
    return null;
  }

  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

export async function resolveLocalApiRequest({
  method,
  url,
  handlers,
}: LocalApiRequest): Promise<LocalApiResponse | null> {
  if (!url) {
    return null;
  }

  const parsedUrl = new URL(url, 'http://localhost');
  const { pathname } = parsedUrl;

  if (!pathname.startsWith('/api/')) {
    return null;
  }

  if (method !== 'GET') {
    return methodNotAllowed();
  }

  const predictionMatch = pathname.match(/^\/api\/paradas\/(\d+)\/previsoes$/);
  if (predictionMatch) {
    try {
      return {
        status: 200,
        body: { predictions: await handlers.getStopPredictions(predictionMatch[1]) },
      };
    } catch (error) {
      return apiError(error);
    }
  }

  if (pathname === '/api/paradas/proximas') {
    const latitude = readNumber(parsedUrl.searchParams.get('lat'));
    const longitude = readNumber(parsedUrl.searchParams.get('lng'));

    if (latitude === null || longitude === null) {
      return badRequest('Latitude e longitude são obrigatórias');
    }

    try {
      return {
        status: 200,
        body: { stops: await handlers.getNearbyStops(latitude, longitude) },
      };
    } catch (error) {
      return apiError(error);
    }
  }

  const routeMatch = pathname.match(/^\/api\/itinerarios\/(\d+)$/);
  if (routeMatch) {
    try {
      return {
        status: 200,
        body: { route: await handlers.getRoutePoints(routeMatch[1]) },
      };
    } catch (error) {
      return apiError(error);
    }
  }

  const vehiclesMatch = pathname.match(/^\/api\/itinerarios\/(\d+)\/veiculos$/);
  if (vehiclesMatch) {
    try {
      return {
        status: 200,
        body: { vehicles: await handlers.getVehicles(vehiclesMatch[1]) },
      };
    } catch (error) {
      return apiError(error);
    }
  }

  return null;
}

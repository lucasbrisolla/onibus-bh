import type { NearbyStop, Prediction, RoutePoint, Vehicle } from '../domain/types.js';
import {
  normalizeNearbyStops,
  normalizePredictions,
  normalizeRoutePoints,
  normalizeVehicles,
} from './normalizers.js';
import type { JsonpRequestOptions, JsonpTransport } from './jsonpTransport.js';

export type SiuJsonpTransport = JsonpTransport;

export interface SiuOperations {
  checkSiuHealth: () => Promise<{ ok: true }>;
  getLines: () => Promise<unknown>;
  getNearbyStops: (latitude: number, longitude: number) => Promise<NearbyStop[]>;
  getStopPredictions: (stopCode: string) => Promise<Prediction[]>;
  getRoutePoints: (serviceId: string) => Promise<RoutePoint[]>;
  getVehicles: (serviceId: string) => Promise<Vehicle[]>;
}

function request(
  transport: SiuJsonpTransport,
  path: string,
  options?: JsonpRequestOptions,
): Promise<unknown> {
  return options === undefined
    ? transport.requestJsonp(path)
    : transport.requestJsonp(path, options);
}

export function createSiuOperations(transport: SiuJsonpTransport): SiuOperations {
  return {
    async getStopPredictions(stopCode) {
      const payload = await request(
        transport,
        `/V3/buscarPrevisoes/${encodeURIComponent(stopCode)}/false/0/BHZ/retornoJSON`,
      );

      return normalizePredictions(payload as Record<string, unknown>);
    },

    async getNearbyStops(latitude, longitude) {
      const payload = await request(
        transport,
        `/V3/buscarParadasProximas/${encodeURIComponent(longitude)}/${encodeURIComponent(latitude)}/0/BHZ/retornoJSONH`,
      );

      return normalizeNearbyStops(payload as Record<string, unknown>);
    },

    async getRoutePoints(serviceId) {
      const payload = await request(
        transport,
        `/V3/buscarItinerario/${encodeURIComponent(serviceId)}/0/BHZ/retornoJSONItinerario`,
      );

      return normalizeRoutePoints(payload as Record<string, unknown>);
    },

    async getVehicles(serviceId) {
      const payload = await request(
        transport,
        `/V3/retornaVeiculosMapa/${encodeURIComponent(serviceId)}/0/BHZ/retornoJSONVeiculos`,
      );

      return normalizeVehicles(payload as Record<string, unknown>);
    },

    getLines() {
      return request(transport, '/buscarLinhas/jsonpCallback');
    },

    async checkSiuHealth() {
      await request(transport, '/buscarLinhas/jsonpCallback', { timeoutMs: 5000 });

      return { ok: true };
    },
  };
}

import {
  createJsonpTransport,
  DEFAULT_JSONP_TIMEOUT_MS,
} from './jsonpTransport.js';
import { createSiuOperations } from './siuOperations.js';

export {
  createJsonpTransport,
  DEFAULT_JSONP_TIMEOUT_MS,
  SIU_BASE_URL,
} from './jsonpTransport.js';
export type {
  JsonpRequestOptions,
  JsonpTransport,
  JsonpTransportOptions,
} from './jsonpTransport.js';
export { createSiuOperations } from './siuOperations.js';
export type { SiuJsonpTransport, SiuOperations } from './siuOperations.js';

const compatibilityTransport = createJsonpTransport();
const compatibilityOperations = createSiuOperations(compatibilityTransport);

export function fetchJsonp(path: string, timeoutMs = DEFAULT_JSONP_TIMEOUT_MS): Promise<unknown> {
  return compatibilityTransport.requestJsonp(path, { timeoutMs });
}

export const checkSiuHealth = compatibilityOperations.checkSiuHealth;
export const getLines = compatibilityOperations.getLines;
export const getNearbyStops = compatibilityOperations.getNearbyStops;
export const getStopPredictions = compatibilityOperations.getStopPredictions;
export const getRoutePoints = compatibilityOperations.getRoutePoints;
export const getVehicles = compatibilityOperations.getVehicles;

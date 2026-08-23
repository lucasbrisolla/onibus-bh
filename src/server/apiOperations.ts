import type { ApiContractOperations } from './apiContractDispatcher.js';
import {
  checkSiuHealth,
  getLines,
  getNearbyStops,
  getRoutePoints,
  getStopPredictions,
  getVehicles,
} from './siuClient.js';

export const defaultApiOperations: ApiContractOperations = {
  checkSiuHealth,
  getLines,
  getNearbyStops,
  getRoutePoints,
  getStopPredictions,
  getVehicles,
};

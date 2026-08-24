import type { ApiContractOperations } from './apiContractDispatcher.js';
import {
  checkSiuHealth,
  getLines,
  getNearbyStops,
  getRoutePoints,
  getStopPredictions,
  getVehicles,
} from './siuClient.js';
import {
  getMobilibusStopsInTile,
  getMobilibusDepartures,
  getMobilibusTimetable,
  searchMobilibusLines,
} from './mobilibusClient.js';

export const defaultApiOperations: ApiContractOperations = {
  checkSiuHealth,
  getLines,
  getNearbyStops,
  getRoutePoints,
  getStopPredictions,
  getVehicles,
  searchMobilibusLines,
  getMobilibusTimetable,
  getMobilibusStops: getMobilibusStopsInTile,
  getMobilibusDepartures,
};

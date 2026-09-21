import type { ApiContractOperations } from './apiContractDispatcher.js';
import { createJsonpTransport } from './jsonpTransport.js';
import { createSiuOperations } from './siuOperations.js';
import {
  getMobilibusStopsInTile,
  getMobilibusDepartures,
  getMobilibusTimetable,
  searchMobilibusLines,
} from './mobilibusClient.js';

const siuOperations = createSiuOperations(createJsonpTransport());

export const defaultApiOperations: ApiContractOperations = {
  ...siuOperations,
  searchMobilibusLines,
  getMobilibusTimetable,
  getMobilibusStops: getMobilibusStopsInTile,
  getMobilibusDepartures,
};

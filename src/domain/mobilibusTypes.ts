export const OTIMO_RMBH_PROJECT_ID = 501;
export const OTIMO_RMBH_NETWORK = 'Ótimo/RMBH';

export interface MobilibusLine {
  projectId: number;
  routeId: number;
  shortName: string;
  name: string;
  network: typeof OTIMO_RMBH_NETWORK;
  fare: number | null;
}

export interface MobilibusPlannedService {
  name: string;
  departures: string[];
}

export interface MobilibusPlannedDirection {
  name: string;
  services: MobilibusPlannedService[];
}

export interface MobilibusTimetable {
  projectId: number;
  routeId: number;
  directions: MobilibusPlannedDirection[];
}

export interface MobilibusMapTile {
  x: number;
  y: number;
  zoom: number;
}

export interface MobilibusStop {
  projectId: number;
  stopId: number;
  latitude: number;
  longitude: number;
  name: string;
  code: string | null;
  address: string | null;
  bearing: number | null;
}

export interface MobilibusDeparture {
  projectId: number;
  stopId: number;
  routeId: number;
  shortName: string;
  lineName: string;
  headsign: string;
  color: string | null;
  scheduledTime: string;
  nextDay: boolean;
  vehicleId: string | null;
  positionAge: number | null;
  gpsTime: string | null;
  bearing: number | null;
  delay: number | null;
  realtime: boolean;
}

export interface MobilibusStopDepartures {
  projectId: number;
  stopId: number;
  stopName: string;
  referenceTime: number | null;
  departures: MobilibusDeparture[];
}

export type MobilibusSearchStatus = 'initial' | 'loading' | 'results' | 'empty' | 'error';
export type MobilibusTimetableStatus = 'initial' | 'loading' | 'content' | 'empty' | 'error';
export type MobilibusStopsStatus = 'initial' | 'loading' | 'content' | 'empty' | 'error';
export type MobilibusDeparturesStatus = 'initial' | 'loading' | 'content' | 'empty' | 'error';

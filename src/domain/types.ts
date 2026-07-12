export type BusVariant = 'direto' | 'nao-direto' | 'not-applicable';
export type BusVariantFilter = 'qualquer' | 'direto' | 'nao-direto';

export interface Prediction {
  id: string;
  lineCode: string;
  description: string;
  destination: string;
  minutes: number;
  departureLabel?: string | null;
  queryTime: string | null;
  serviceId: string | null;
  vehicleId: string | null;
  color: number | null;
  accessibilityCode: number | null;
  variant: BusVariant;
}

export interface NearbyStop {
  code: string;
  publicCode: string;
  latitude: number;
  longitude: number;
  description: string;
  color: number | null;
}

export interface FavoriteStop {
  code: string;
  publicCode: string;
  latitude: number;
  longitude: number;
  description: string;
  color: number | null;
}

export interface RoutePoint {
  latitude: number;
  longitude: number;
}

export interface Vehicle {
  latitude: number;
  longitude: number;
  color: number | null;
  lineCode: string;
  vehicleId: string;
  bearing: number | null;
}

export type VehicleApproachState =
  | 'approaching'
  | 'passed'
  | 'vehicle-not-found'
  | 'no-live-vehicle'
  | 'route-unavailable';

export interface VehicleApproachInfo {
  state: VehicleApproachState;
  vehicleId: string | null;
  lineCode: string;
  minutes: number;
  message: string;
}

export interface AlertSettings {
  stopCode: string;
  lineCode: string;
  variantFilter: BusVariantFilter;
  minutesBefore: number;
  enabled: boolean;
  lastNotifiedPredictionId: string | null;
}

export interface AlertMatch {
  shouldNotify: boolean;
  prediction: Prediction | null;
  reason:
    | 'matched'
    | 'disabled'
    | 'missing-settings'
    | 'no-matching-line'
    | 'above-threshold'
    | 'already-notified';
}

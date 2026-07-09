export type BusVariant = 'direto' | 'nao-direto' | 'not-applicable';
export type BusVariantFilter = 'qualquer' | 'direto' | 'nao-direto';

export interface Prediction {
  id: string;
  lineCode: string;
  description: string;
  destination: string;
  minutes: number;
  queryTime: string | null;
  serviceId: string | null;
  variant: BusVariant;
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

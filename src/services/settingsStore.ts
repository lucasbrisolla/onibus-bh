import type { AlertSettings, BusVariantFilter } from '../domain/types';

const STORAGE_KEY = 'onibus-bh-alert-settings';
const VALID_VARIANT_FILTERS: BusVariantFilter[] = ['qualquer', 'direto', 'nao-direto'];

export const defaultSettings: AlertSettings = {
  stopCode: '',
  lineCode: '8350',
  variantFilter: 'qualquer',
  minutesBefore: 7,
  enabled: false,
  lastNotifiedPredictionId: null,
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function normalizeVariantFilter(value: unknown): BusVariantFilter {
  return typeof value === 'string' && VALID_VARIANT_FILTERS.includes(value as BusVariantFilter)
    ? (value as BusVariantFilter)
    : defaultSettings.variantFilter;
}

function normalizeMinutesBefore(value: unknown): number {
  return typeof value === 'number' && Number.isFinite(value) && value >= 1 && value <= 60
    ? value
    : defaultSettings.minutesBefore;
}

function normalizeSettings(value: unknown): AlertSettings {
  if (!isRecord(value)) {
    return defaultSettings;
  }

  return {
    stopCode: typeof value.stopCode === 'string' ? value.stopCode : defaultSettings.stopCode,
    lineCode: typeof value.lineCode === 'string' ? value.lineCode : defaultSettings.lineCode,
    variantFilter: normalizeVariantFilter(value.variantFilter),
    minutesBefore: normalizeMinutesBefore(value.minutesBefore),
    enabled: typeof value.enabled === 'boolean' ? value.enabled : defaultSettings.enabled,
    lastNotifiedPredictionId:
      typeof value.lastNotifiedPredictionId === 'string' || value.lastNotifiedPredictionId === null
        ? value.lastNotifiedPredictionId
        : defaultSettings.lastNotifiedPredictionId,
  };
}

export function loadSettings(): AlertSettings {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return defaultSettings;
    }

    return normalizeSettings(JSON.parse(raw));
  } catch {
    return defaultSettings;
  }
}

export function saveSettings(settings: AlertSettings): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(normalizeSettings(settings)));
  } catch {
    // Storage can be unavailable or full; settings will remain in memory only.
  }
}

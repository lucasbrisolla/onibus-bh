import type { AlertSettings, BusVariantFilter, FavoriteStop } from '../domain/types';

const STORAGE_KEY = 'onibus-bh-alert-settings';
const THEME_STORAGE_KEY = 'onibus-bh-theme';
const FAVORITES_STORAGE_KEY = 'onibus-bh-favorite-stops';
const VALID_VARIANT_FILTERS: BusVariantFilter[] = ['qualquer', 'direto', 'nao-direto'];
export type ThemeMode = 'light' | 'dark';

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

export function loadThemeMode(): ThemeMode {
  try {
    const raw = localStorage.getItem(THEME_STORAGE_KEY);
    return raw === 'dark' ? 'dark' : 'light';
  } catch {
    return 'light';
  }
}

export function saveThemeMode(themeMode: ThemeMode): void {
  try {
    localStorage.setItem(THEME_STORAGE_KEY, themeMode);
  } catch {
    // Storage can be unavailable or full; theme mode will remain in memory only.
  }
}

function normalizeFavoriteStop(value: unknown): FavoriteStop | null {
  if (!isRecord(value)) {
    return null;
  }

  if (
    typeof value.code !== 'string' ||
    typeof value.publicCode !== 'string' ||
    typeof value.description !== 'string' ||
    typeof value.latitude !== 'number' ||
    typeof value.longitude !== 'number'
  ) {
    return null;
  }

  return {
    code: value.code,
    publicCode: value.publicCode,
    description: value.description,
    latitude: value.latitude,
    longitude: value.longitude,
    color: typeof value.color === 'number' || value.color === null ? value.color : null,
  };
}

function normalizeFavoriteStops(value: unknown): FavoriteStop[] {
  if (!Array.isArray(value)) {
    return [];
  }

  const favorites: FavoriteStop[] = [];
  const seenCodes = new Set<string>();

  for (const item of value) {
    const favorite = normalizeFavoriteStop(item);

    if (!favorite || seenCodes.has(favorite.code)) {
      continue;
    }

    seenCodes.add(favorite.code);
    favorites.push(favorite);
  }

  return favorites;
}

export function loadFavoriteStops(): FavoriteStop[] {
  try {
    const raw = localStorage.getItem(FAVORITES_STORAGE_KEY);
    if (!raw) {
      return [];
    }

    return normalizeFavoriteStops(JSON.parse(raw));
  } catch {
    return [];
  }
}

export function saveFavoriteStops(favorites: FavoriteStop[]): void {
  try {
    localStorage.setItem(FAVORITES_STORAGE_KEY, JSON.stringify(normalizeFavoriteStops(favorites)));
  } catch {
    // Storage can be unavailable or full; favorites will remain in memory only.
  }
}

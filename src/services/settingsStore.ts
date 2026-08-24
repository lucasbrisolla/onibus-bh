import type { AlertSettings, BusVariantFilter, FavoriteStop } from '../domain/types';
import type { MobilibusStop } from '../domain/mobilibusTypes';

const STORAGE_KEY = 'onibus-bh-alert-settings';
const THEME_STORAGE_KEY = 'onibus-bh-theme';
const FAVORITES_STORAGE_KEY = 'onibus-bh-favorite-stops';
const MOBILIBUS_FAVORITES_STORAGE_KEY = 'onibus-bh-mobilibus-favorite-stops';
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

function normalizeMobilibusFavoriteStop(value: unknown): MobilibusStop | null {
  if (!isRecord(value)) {
    return null;
  }

  const projectId = value.projectId;
  const stopId = value.stopId;
  const latitude = value.latitude;
  const longitude = value.longitude;

  if (
    typeof projectId !== 'number' ||
    !Number.isSafeInteger(projectId) ||
    projectId <= 0 ||
    typeof stopId !== 'number' ||
    !Number.isSafeInteger(stopId) ||
    stopId <= 0 ||
    typeof latitude !== 'number' ||
    !Number.isFinite(latitude) ||
    typeof longitude !== 'number' ||
    !Number.isFinite(longitude) ||
    typeof value.name !== 'string' ||
    !value.name.trim()
  ) {
    return null;
  }

  return {
    projectId,
    stopId,
    latitude,
    longitude,
    name: value.name.trim(),
    code: typeof value.code === 'string' && value.code.trim() ? value.code.trim() : null,
    address:
      typeof value.address === 'string' && value.address.trim() ? value.address.trim() : null,
    bearing:
      typeof value.bearing === 'number' && Number.isFinite(value.bearing) ? value.bearing : null,
  };
}

function normalizeMobilibusFavoriteStops(value: unknown): MobilibusStop[] {
  if (!Array.isArray(value)) {
    return [];
  }

  const favorites: MobilibusStop[] = [];
  const seenStops = new Set<string>();

  for (const item of value) {
    const favorite = normalizeMobilibusFavoriteStop(item);
    if (!favorite) {
      continue;
    }

    const key = `${favorite.projectId}:${favorite.stopId}`;
    if (seenStops.has(key)) {
      continue;
    }

    seenStops.add(key);
    favorites.push(favorite);
  }

  return favorites;
}

export function loadMobilibusFavoriteStops(): MobilibusStop[] {
  try {
    const raw = localStorage.getItem(MOBILIBUS_FAVORITES_STORAGE_KEY);
    if (!raw) {
      return [];
    }

    return normalizeMobilibusFavoriteStops(JSON.parse(raw));
  } catch {
    return [];
  }
}

export function saveMobilibusFavoriteStops(favorites: MobilibusStop[]): void {
  try {
    localStorage.setItem(
      MOBILIBUS_FAVORITES_STORAGE_KEY,
      JSON.stringify(normalizeMobilibusFavoriteStops(favorites)),
    );
  } catch {
    // Storage can be unavailable or full; favorites will remain in memory only.
  }
}

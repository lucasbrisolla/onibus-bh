import type { AlertSettings } from '../domain/types';

const STORAGE_KEY = 'onibus-bh-alert-settings';

export const defaultSettings: AlertSettings = {
  stopCode: '',
  lineCode: '8350',
  variantFilter: 'qualquer',
  minutesBefore: 7,
  enabled: false,
  lastNotifiedPredictionId: null,
};

export function loadSettings(): AlertSettings {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) {
    return defaultSettings;
  }

  try {
    return { ...defaultSettings, ...JSON.parse(raw) } as AlertSettings;
  } catch {
    return defaultSettings;
  }
}

export function saveSettings(settings: AlertSettings): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
}

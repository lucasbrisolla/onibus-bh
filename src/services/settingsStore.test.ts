import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  defaultSettings,
  loadFavoriteStops,
  loadSettings,
  loadThemeMode,
  saveFavoriteStops,
  saveSettings,
  saveThemeMode,
} from './settingsStore';

const storageValue = (value: unknown) => JSON.stringify(value);

describe('settingsStore', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('returns defaults when stored JSON is invalid', () => {
    vi.stubGlobal('localStorage', {
      getItem: vi.fn(() => '{invalid'),
      setItem: vi.fn(),
    });

    expect(loadSettings()).toEqual(defaultSettings);
  });

  it('preserves defaults for missing fields in a partial payload', () => {
    vi.stubGlobal('localStorage', {
      getItem: vi.fn(() =>
        storageValue({
          stopCode: '1034',
          enabled: true,
        }),
      ),
      setItem: vi.fn(),
    });

    expect(loadSettings()).toEqual({
      ...defaultSettings,
      stopCode: '1034',
      enabled: true,
    });
  });

  it('falls back to defaults for invalid field types and variants', () => {
    vi.stubGlobal('localStorage', {
      getItem: vi.fn(() =>
        storageValue({
          stopCode: 1034,
          lineCode: false,
          variantFilter: 'expresso',
          minutesBefore: 0,
          enabled: 'true',
          lastNotifiedPredictionId: 123,
        }),
      ),
      setItem: vi.fn(),
    });

    expect(loadSettings()).toEqual(defaultSettings);
  });

  it('does not throw when localStorage getItem fails', () => {
    vi.stubGlobal('localStorage', {
      getItem: vi.fn(() => {
        throw new Error('blocked');
      }),
      setItem: vi.fn(),
    });

    expect(loadSettings()).toEqual(defaultSettings);
  });

  it('does not throw when localStorage setItem fails', () => {
    vi.stubGlobal('localStorage', {
      getItem: vi.fn(),
      setItem: vi.fn(() => {
        throw new Error('quota exceeded');
      }),
    });

    expect(() => saveSettings(defaultSettings)).not.toThrow();
  });

  it('returns light theme by default and dark when persisted', () => {
    vi.stubGlobal('localStorage', {
      getItem: vi.fn((key: string) => (key === 'onibus-bh-theme' ? 'dark' : null)),
      setItem: vi.fn(),
    });

    expect(loadThemeMode()).toBe('dark');
  });

  it('does not throw when saving theme mode fails', () => {
    vi.stubGlobal('localStorage', {
      getItem: vi.fn(),
      setItem: vi.fn(() => {
        throw new Error('quota exceeded');
      }),
    });

    expect(() => saveThemeMode('dark')).not.toThrow();
  });

  it('returns favorite stops from storage and filters invalid entries', () => {
    vi.stubGlobal('localStorage', {
      getItem: vi.fn((key: string) =>
        key === 'onibus-bh-favorite-stops'
          ? storageValue([
              {
                code: '13566',
                publicCode: '40134',
                description: 'ROD ANEL',
                latitude: -19.916136,
                longitude: -43.99563,
                color: 4,
              },
              {
                code: '13566',
                publicCode: '40134',
                description: 'ROD ANEL',
                latitude: -19.916136,
                longitude: -43.99563,
                color: 4,
              },
              { code: 1234 },
            ])
          : null,
      ),
      setItem: vi.fn(),
    });

    expect(loadFavoriteStops()).toEqual([
      {
        code: '13566',
        publicCode: '40134',
        description: 'ROD ANEL',
        latitude: -19.916136,
        longitude: -43.99563,
        color: 4,
      },
    ]);
  });

  it('does not throw when saving favorite stops fails', () => {
    vi.stubGlobal('localStorage', {
      getItem: vi.fn(),
      setItem: vi.fn(() => {
        throw new Error('quota exceeded');
      }),
    });

    expect(() =>
      saveFavoriteStops([
        {
          code: '13566',
          publicCode: '40134',
          description: 'ROD ANEL',
          latitude: -19.916136,
          longitude: -43.99563,
          color: 4,
        },
      ]),
    ).not.toThrow();
  });
});

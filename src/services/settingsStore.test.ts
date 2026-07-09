import { afterEach, describe, expect, it, vi } from 'vitest';
import { defaultSettings, loadSettings, saveSettings } from './settingsStore';

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
});

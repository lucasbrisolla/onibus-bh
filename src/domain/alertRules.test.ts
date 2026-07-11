import { describe, expect, it } from 'vitest';
import { findAlertMatch } from './alertRules';
import type { AlertSettings, Prediction } from './types';

const baseSettings: AlertSettings = {
  stopCode: '1234',
  lineCode: '8350',
  variantFilter: 'direto',
  minutesBefore: 7,
  enabled: true,
  lastNotifiedPredictionId: null,
};

const diretoPrediction: Prediction = {
  id: '8350-direto-5',
  lineCode: '8350',
  description: '8350 Direto Centro',
  destination: 'Centro',
  minutes: 5,
  queryTime: '10:00',
  serviceId: 'svc-direto',
  vehicleId: null,
  color: null,
  accessibilityCode: null,
  variant: 'direto',
};

describe('findAlertMatch', () => {
  it('matches an enabled alert under the minute threshold', () => {
    expect(findAlertMatch(baseSettings, [diretoPrediction])).toEqual({
      shouldNotify: true,
      prediction: diretoPrediction,
      reason: 'matched',
    });
  });

  it('does not match when alert is disabled', () => {
    expect(findAlertMatch({ ...baseSettings, enabled: false }, [diretoPrediction]).reason).toBe('disabled');
  });

  it('requires configured stop and line codes', () => {
    expect(findAlertMatch({ ...baseSettings, stopCode: '   ' }, [diretoPrediction]).reason).toBe('missing-settings');
    expect(findAlertMatch({ ...baseSettings, lineCode: '   ' }, [diretoPrediction]).reason).toBe('missing-settings');
  });

  it('matches configured line codes with extra spaces', () => {
    expect(findAlertMatch({ ...baseSettings, lineCode: ' 8350 ' }, [diretoPrediction])).toEqual({
      shouldNotify: true,
      prediction: diretoPrediction,
      reason: 'matched',
    });
  });

  it('does not match a different 8350 variant', () => {
    const prediction: Prediction = { ...diretoPrediction, id: '8350-nao-5', variant: 'nao-direto' };
    expect(findAlertMatch(baseSettings, [prediction]).reason).toBe('no-matching-line');
  });

  it('uses the closest prediction when multiple predictions match', () => {
    const laterPrediction: Prediction = { ...diretoPrediction, id: '8350-direto-6', minutes: 6 };
    const closestPrediction: Prediction = { ...diretoPrediction, id: '8350-direto-2', minutes: 2 };

    expect(findAlertMatch(baseSettings, [laterPrediction, closestPrediction])).toEqual({
      shouldNotify: true,
      prediction: closestPrediction,
      reason: 'matched',
    });
  });

  it('does not match above the minute threshold', () => {
    const prediction: Prediction = { ...diretoPrediction, id: '8350-direto-12', minutes: 12 };
    expect(findAlertMatch(baseSettings, [prediction]).reason).toBe('above-threshold');
  });

  it('does not notify the same prediction twice', () => {
    const settings = { ...baseSettings, lastNotifiedPredictionId: diretoPrediction.id };
    expect(findAlertMatch(settings, [diretoPrediction]).reason).toBe('already-notified');
  });
});

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

  it('does not match a different 8350 variant', () => {
    const prediction: Prediction = { ...diretoPrediction, id: '8350-nao-5', variant: 'nao-direto' };
    expect(findAlertMatch(baseSettings, [prediction]).reason).toBe('no-matching-line');
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

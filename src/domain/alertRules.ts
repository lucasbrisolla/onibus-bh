import { matchesVariantFilter } from './busVariant';
import type { AlertMatch, AlertSettings, Prediction } from './types';

export function findAlertMatch(settings: AlertSettings, predictions: Prediction[]): AlertMatch {
  if (!settings.enabled) {
    return { shouldNotify: false, prediction: null, reason: 'disabled' };
  }

  if (!settings.stopCode.trim() || !settings.lineCode.trim()) {
    return { shouldNotify: false, prediction: null, reason: 'missing-settings' };
  }

  const matchingLine = predictions.filter(
    prediction =>
      prediction.lineCode === settings.lineCode &&
      matchesVariantFilter(prediction.variant, settings.variantFilter),
  );

  if (matchingLine.length === 0) {
    return { shouldNotify: false, prediction: null, reason: 'no-matching-line' };
  }

  const closest = [...matchingLine].sort((a, b) => a.minutes - b.minutes)[0];

  if (closest.id === settings.lastNotifiedPredictionId) {
    return { shouldNotify: false, prediction: closest, reason: 'already-notified' };
  }

  if (closest.minutes > settings.minutesBefore) {
    return { shouldNotify: false, prediction: closest, reason: 'above-threshold' };
  }

  return { shouldNotify: true, prediction: closest, reason: 'matched' };
}

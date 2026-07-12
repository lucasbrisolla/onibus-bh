import { mount } from '@vue/test-utils';
import { describe, expect, it } from 'vitest';

import MobileBottomSheet from './MobileBottomSheet.vue';
import type { NearbyStop, Prediction } from '../domain/types';

const stop: NearbyStop = {
  code: '13566',
  publicCode: '40134',
  latitude: -19.916136,
  longitude: -43.99563,
  description: 'ROD ANEL RODOVIARIO CELSO MELLO AZEVEDO, 11749',
  color: 4,
};

const prediction: Prediction = {
  id: '8350-53564-25',
  lineCode: '8350',
  description: 'EST.SAO GABRIEL/EST.BARREIRO',
  destination: 'EST.SAO GABRIEL/EST.BARREIRO',
  minutes: 25,
  queryTime: '12/07/2026 09:03:09',
  serviceId: '53564',
  vehicleId: '41270',
  color: 4,
  accessibilityCode: 6,
  variant: 'nao-direto',
};

describe('MobileBottomSheet', () => {
  it('toggles between expanded and collapsed when the handle is tapped', async () => {
    const wrapper = mount(MobileBottomSheet, {
      props: {
        settings: {
          stopCode: '13566',
          lineCode: '8350',
          variantFilter: 'direto',
          minutesBefore: 7,
          enabled: true,
          lastNotifiedPredictionId: null,
        },
        predictions: [prediction],
        selectedPredictionId: null,
        statusMessage: 'OK',
        isLoading: false,
        permission: 'granted',
        lastUpdated: '09:03:09',
        selectedStop: stop,
        isSelectedStopFavorite: false,
      },
    });

    expect(wrapper.classes()).not.toContain('is-collapsed');
    expect(wrapper.find('.sheet-toggle').attributes('aria-expanded')).toBe('true');

    await wrapper.find('.sheet-toggle').trigger('click');

    expect(wrapper.classes()).toContain('is-collapsed');
    expect(wrapper.find('.sheet-toggle').attributes('aria-expanded')).toBe('false');

    await wrapper.find('.sheet-toggle').trigger('click');

    expect(wrapper.classes()).not.toContain('is-collapsed');
    expect(wrapper.find('.sheet-toggle').attributes('aria-expanded')).toBe('true');
  });
});

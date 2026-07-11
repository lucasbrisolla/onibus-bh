import { mount } from '@vue/test-utils';
import { describe, expect, it } from 'vitest';

import MapView from './MapView.vue';
import type { NearbyStop } from '../domain/types';

const stop: NearbyStop = {
  code: '13566',
  publicCode: '40134',
  latitude: -19.916136,
  longitude: -43.99563,
  description: 'ROD ANEL RODOVIARIO CELSO MELLO AZEVEDO, 11749',
  color: 4,
};

describe('MapView', () => {
  it('emits selected stop when a stop marker is clicked', async () => {
    const wrapper = mount(MapView, {
      props: {
        nearbyStops: [stop],
      },
      attachTo: document.body,
    });

    await wrapper.vm.$nextTick();
    const marker = wrapper.element.querySelector(
      '[title="ROD ANEL RODOVIARIO CELSO MELLO AZEVEDO, 11749"]',
    );
    expect(marker).not.toBeNull();

    marker?.dispatchEvent(new MouseEvent('click', { bubbles: true }));

    expect(wrapper.emitted('selectStop')).toEqual([[stop]]);
    wrapper.unmount();
  });

  it('renders the pilot stop icon for regular stop markers', async () => {
    const wrapper = mount(MapView, {
      props: {
        nearbyStops: [stop],
      },
      attachTo: document.body,
    });

    await wrapper.vm.$nextTick();

    expect(wrapper.element.querySelector('[data-map-icon="stop"]')).not.toBeNull();
    wrapper.unmount();
  });

  it('uses the stop icon for the monitored stop marker too', async () => {
    const wrapper = mount(MapView, {
      props: {
        monitoredStop: stop,
        nearbyStops: [stop],
      },
      attachTo: document.body,
    });

    await wrapper.vm.$nextTick();

    expect(wrapper.element.querySelector('.is-monitored [data-map-icon="stop"]')).not.toBeNull();
    expect(wrapper.text()).not.toContain('🚌');
    wrapper.unmount();
  });
});

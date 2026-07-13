import { mount } from '@vue/test-utils';
import { describe, expect, it } from 'vitest';

import MapView, {
  darkTileUrl,
  lightTileUrl,
  routeBasePathOptions,
  routeFlowPathOptions,
} from './MapView.vue';
import type { NearbyStop, Vehicle, VehicleApproachInfo } from '../domain/types';

const stop: NearbyStop = {
  code: '13566',
  publicCode: '40134',
  latitude: -19.916136,
  longitude: -43.99563,
  description: 'ROD ANEL RODOVIARIO CELSO MELLO AZEVEDO, 11749',
  color: 4,
};

const nearbyStop: NearbyStop = {
  code: '14276',
  publicCode: '40170',
  latitude: -19.916051,
  longitude: -43.991969,
  description: 'PCA CAPELA NOVA, 20',
  color: 4,
};

const vehicles: Vehicle[] = [
  {
    latitude: -19.915,
    longitude: -43.995,
    color: null,
    lineCode: '8350',
    vehicleId: '40743',
    bearing: null,
  },
  {
    latitude: -19.917,
    longitude: -43.994,
    color: null,
    lineCode: '8350',
    vehicleId: '40799',
    bearing: null,
  },
];

const selectedVehicleStatus: VehicleApproachInfo = {
  lineCode: '8350',
  minutes: 2,
  state: 'approaching',
  vehicleId: '40743',
  message: 'Ônibus 8350 está se aproximando da sua parada',
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
      '[title="Rod Anel Rodoviario Celso Mello Azevedo, 11749"]',
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

  it('shows a small permanent label with the address for the monitored stop', async () => {
    const wrapper = mount(MapView, {
      props: {
        monitoredStop: stop,
        nearbyStops: [stop],
      },
      attachTo: document.body,
    });

    await wrapper.vm.$nextTick();

    const monitoredStopLabel = wrapper.element.querySelector('.map-stop-tooltip');
    expect(monitoredStopLabel?.textContent).toContain('Rod Anel Rodoviario Celso Mello Azevedo, 11749');
    expect(monitoredStopLabel?.textContent).not.toContain('ROD ANEL');
    wrapper.unmount();
  });

  it('does not render the location badge copy when user location is active', async () => {
    const wrapper = mount(MapView, {
      props: {
        userLocation: {
          latitude: -19.916,
          longitude: -43.994,
        },
      },
      attachTo: document.body,
    });

    await wrapper.vm.$nextTick();

    expect(wrapper.text()).not.toContain('Sua posição');
    expect(wrapper.text()).not.toContain('Localização ativa');
    wrapper.unmount();
  });

  it('renders only the selected vehicle when a prediction card is chosen', async () => {
    const wrapper = mount(MapView, {
      props: {
        monitoredStop: stop,
        nearbyStops: [stop],
        vehicles,
        selectedVehicleId: '40743',
        selectedVehicleStatus,
      },
      attachTo: document.body,
    });

    await wrapper.vm.$nextTick();

    expect(wrapper.element.querySelector('[title="8350 - 40743"]')).not.toBeNull();
    expect(wrapper.element.querySelector('[title="8350 - 40799"]')).toBeNull();
    wrapper.unmount();
  });

  it('configures the route with a solid base and subtle animated inner stroke', () => {
    expect(routeBasePathOptions).toMatchObject({
      className: 'map-route-base-path',
      lineCap: 'round',
      lineJoin: 'round',
      opacity: 0.68,
      weight: 5,
    });

    expect(routeFlowPathOptions).toMatchObject({
      className: 'map-route-flow-path',
      dashArray: '2 12',
      lineCap: 'round',
      lineJoin: 'round',
      opacity: 0.42,
      weight: 3,
    });
  });

  it('emits when the compact stop visibility toggle is clicked', async () => {
    const wrapper = mount(MapView, {
      props: {
        nearbyStops: [stop],
        showNearbyStops: true,
      },
      attachTo: document.body,
    });

    await wrapper.find('.map-points-toggle').trigger('click');

    expect(wrapper.emitted('toggleNearbyStops')).toEqual([[false]]);
    wrapper.unmount();
  });

  it('emits when the compact map theme toggle is clicked', async () => {
    const wrapper = mount(MapView, {
      props: {
        themeMode: 'light',
      },
      attachTo: document.body,
    });

    await wrapper.find('.map-theme-toggle').trigger('click');

    expect(wrapper.emitted('toggleTheme')).toEqual([[]]);
    wrapper.unmount();
  });

  it('hides nearby stop markers but keeps the monitored stop visible when points are off', async () => {
    const wrapper = mount(MapView, {
      props: {
        monitoredStop: stop,
        nearbyStops: [stop, nearbyStop],
        showNearbyStops: false,
      },
      attachTo: document.body,
    });

    await wrapper.vm.$nextTick();

    expect(
      wrapper.element.querySelector('[title="Rod Anel Rodoviario Celso Mello Azevedo, 11749"]'),
    ).not.toBeNull();
    expect(wrapper.element.querySelector('[title="Pca Capela Nova, 20"]')).toBeNull();
    wrapper.unmount();
  });

  it('marks the dark base tile layer in dark mode', async () => {
    const wrapper = mount(MapView, {
      props: {
        themeMode: 'dark',
        nearbyStops: [stop],
      },
      attachTo: document.body,
    });

    await wrapper.vm.$nextTick();

    expect(document.body.querySelector('.map-base-tiles-dark')).not.toBeNull();
    expect(document.body.querySelector('.map-label-tiles-dark')).toBeNull();
    wrapper.unmount();
  });

  it('uses Carto Voyager in light mode and Carto Dark Matter in dark mode', () => {
    expect(lightTileUrl).toContain('/rastertiles/voyager/');
    expect(darkTileUrl).toContain('/dark_all/');
  });

});

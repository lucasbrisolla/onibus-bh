import { mount } from '@vue/test-utils';
import L from 'leaflet';
import { describe, expect, it, vi } from 'vitest';

import type { MobilibusStop } from '../domain/mobilibusTypes';
import MobilibusMap from './MobilibusMap.vue';
import { tilesFromBounds } from './mobilibusMapTiles';

const stop: MobilibusStop = {
  projectId: 501,
  stopId: 15192689,
  latitude: -19.93193292,
  longitude: -43.93043518,
  name: 'Av. Afonso Pena, 2323 - Parada DEOESP',
  code: null,
  address: 'Avenida Afonso Pena 2328',
  bearing: 340,
};

describe('MobilibusMap', () => {
  it('calcula tiles visíveis somente a partir do zoom mínimo', () => {
    const bounds = L.latLngBounds(
      [-19.94, -43.96],
      [-19.9, -43.92],
    );

    expect(tilesFromBounds(bounds, 13)).toEqual([]);
    expect(tilesFromBounds(bounds, 14)).toEqual([
      { x: 1547, y: 2279, zoom: 14 },
      { x: 1548, y: 2279, zoom: 14 },
    ]);
  });

  it('renderiza marcadores e solicita os tiles da área inicial', async () => {
    const wrapper = mount(MobilibusMap, {
      props: {
        stops: [stop],
        status: 'content',
      },
      attachTo: document.body,
    });

    await wrapper.vm.$nextTick();

    expect(wrapper.element.querySelector('[data-map-icon="mobilibus-stop"]')).not.toBeNull();
    expect(wrapper.element.querySelector(`[title="${stop.name}"]`)).not.toBeNull();
    expect(wrapper.text()).toContain('1 ponto visível');
    expect(wrapper.emitted('requestTiles')?.[0]).toEqual([[{ x: 1547, y: 2279, zoom: 14 }]]);
    expect(document.body.querySelector('.leaflet-control-attribution')?.textContent).toContain(
      'OpenStreetMap',
    );

    wrapper.unmount();
  });

  it('oculta marcadores e emite troca de tema pelos controles do mapa', async () => {
    const wrapper = mount(MobilibusMap, {
      props: {
        stops: [stop],
        status: 'content',
      },
      attachTo: document.body,
    });

    await wrapper.vm.$nextTick();
    await wrapper.find('.map-points-toggle').trigger('click');
    expect(wrapper.element.querySelector('[data-map-icon="mobilibus-stop"]')).toBeNull();

    await wrapper.find('.map-theme-toggle').trigger('click');
    expect(wrapper.emitted('toggleTheme')).toEqual([[]]);

    wrapper.unmount();
  });

  it('preserva a viewport ao trocar o tema e encerra o resize ao desmontar', async () => {
    const mapFactory = vi.spyOn(L, 'map');
    const invalidateSize = vi.spyOn(L.Map.prototype, 'invalidateSize');
    let triggerFrame: FrameRequestCallback | null = null;
    vi.spyOn(window, 'requestAnimationFrame').mockImplementation(callback => {
      triggerFrame = callback;
      return 1;
    });
    const wrapper = mount(MobilibusMap, { attachTo: document.body });
    const runFrame = () => (triggerFrame as FrameRequestCallback | null)?.(0);

    await wrapper.vm.$nextTick();
    const mapSurface = wrapper.element.querySelector('.map-surface') as HTMLElement;
    Object.defineProperties(mapSurface, {
      clientHeight: { configurable: true, value: 480 },
      clientWidth: { configurable: true, value: 640 },
    });
    runFrame();

    const map = mapFactory.mock.results.at(-1)?.value as L.Map;
    map.setView([-19.93, -44.01], 16);
    const centerBeforeThemeChange = map.getCenter();

    await wrapper.setProps({ themeMode: 'dark' });

    expect(wrapper.element.querySelector('.map-base-tiles-dark')).not.toBeNull();
    expect(map.getZoom()).toBe(16);
    expect(map.getCenter().lat).toBeCloseTo(centerBeforeThemeChange.lat);
    expect(map.getCenter().lng).toBeCloseTo(centerBeforeThemeChange.lng);

    invalidateSize.mockClear();
    window.dispatchEvent(new Event('resize'));
    runFrame();
    expect(invalidateSize).toHaveBeenCalledWith(false);

    wrapper.unmount();
    invalidateSize.mockClear();
    window.dispatchEvent(new Event('resize'));
    runFrame();
    expect(invalidateSize).not.toHaveBeenCalled();
  });

  it('emite o ponto selecionado ao clicar no marcador', async () => {
    const wrapper = mount(MobilibusMap, {
      props: {
        stops: [stop],
        status: 'content',
      },
      attachTo: document.body,
    });

    await wrapper.vm.$nextTick();
    await wrapper.find(`[title="${stop.name}"]`).trigger('click');

    expect(wrapper.emitted('selectStop')).toEqual([[stop]]);
    wrapper.unmount();
  });

  it('mostra erro recuperável dos pontos', async () => {
    const wrapper = mount(MobilibusMap, {
      props: {
        status: 'error',
        error: 'Mobilibus indisponível',
      },
      attachTo: document.body,
    });

    await wrapper.find('.mobilibus-map-message--error button').trigger('click');

    expect(wrapper.text()).toContain('Mobilibus indisponível');
    expect(wrapper.emitted('retry')).toEqual([[]]);
    wrapper.unmount();
  });
});

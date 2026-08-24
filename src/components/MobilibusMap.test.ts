import { mount } from '@vue/test-utils';
import L from 'leaflet';
import { describe, expect, it } from 'vitest';

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

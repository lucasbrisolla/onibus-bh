import { describe, expect, it } from 'vitest';
import {
  createMapBaseTileLayer,
  getMapBaseLayerConfig,
} from './mapBaseLayer';

describe('map base layer policy', () => {
  it('uses OpenStreetMap without a CARTO key and keeps attribution visible', () => {
    const light = getMapBaseLayerConfig('light', { cartoApiKey: '' });
    const dark = getMapBaseLayerConfig('dark', { cartoApiKey: '' });

    expect(light.provider).toBe('openstreetmap');
    expect(light.url).toBe('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png');
    expect(light.attribution).toContain('OpenStreetMap');
    expect(dark.provider).toBe('openstreetmap');
    expect(dark.className).toContain('map-base-tiles-dark-fallback');
    expect(dark.url).toBe(light.url);
  });

  it('uses the configured CARTO key for both themes', () => {
    const light = getMapBaseLayerConfig('light', { cartoApiKey: 'public-demo-key' });
    const dark = getMapBaseLayerConfig('dark', { cartoApiKey: 'public-demo-key' });

    expect(light.provider).toBe('carto');
    expect(light.url).toContain('/rastertiles/voyager/');
    expect(light.url).toContain('key=public-demo-key');
    expect(light.attribution).toContain('CARTO');
    expect(dark.provider).toBe('carto');
    expect(dark.url).toContain('/dark_all/');
    expect(dark.url).toContain('key=public-demo-key');
    expect(dark.className).toBe('map-base-tiles map-base-tiles-dark');
  });

  it('creates a Leaflet tile layer with the policy attribution', () => {
    const layer = createMapBaseTileLayer('light', { cartoApiKey: '' });

    expect(layer.options.attribution).toContain('OpenStreetMap');
    expect(layer.options.className).toBe('map-base-tiles');
    expect(layer.options.maxZoom).toBe(19);
  });
});

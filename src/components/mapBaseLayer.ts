import L from 'leaflet';

export type MapTheme = 'light' | 'dark';
export type MapBaseProvider = 'carto' | 'openstreetmap';

export interface MapBaseLayerOptions {
  cartoApiKey?: string;
}

export interface MapBaseLayerConfig {
  provider: MapBaseProvider;
  theme: MapTheme;
  url: string;
  attribution: string;
  className: string;
  maxZoom: number;
  subdomains: string[];
}

const CARTO_LIGHT_TILE_URL =
  'https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png';
const CARTO_DARK_TILE_URL =
  'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png';
const OPEN_STREET_MAP_TILE_URL = 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png';
const OPEN_STREET_MAP_ATTRIBUTION =
  '&copy; <a href="https://www.openstreetmap.org/copyright" rel="noopener noreferrer">OpenStreetMap</a> contributors';
const CARTO_ATTRIBUTION =
  OPEN_STREET_MAP_ATTRIBUTION +
  ' &copy; <a href="https://carto.com/attributions" rel="noopener noreferrer">CARTO</a>';
const defaultCartoApiKey = import.meta.env.VITE_CARTO_API_KEY?.trim() ?? '';

function appendCartoApiKey(url: string, apiKey: string): string {
  return url + '?key=' + encodeURIComponent(apiKey);
}

export function getMapBaseLayerConfig(
  theme: MapTheme,
  options: MapBaseLayerOptions = {},
): MapBaseLayerConfig {
  const cartoApiKey =
    options.cartoApiKey === undefined ? defaultCartoApiKey : options.cartoApiKey.trim();

  if (cartoApiKey) {
    return {
      provider: 'carto',
      theme,
      url: appendCartoApiKey(
        theme === 'dark' ? CARTO_DARK_TILE_URL : CARTO_LIGHT_TILE_URL,
        cartoApiKey,
      ),
      attribution: CARTO_ATTRIBUTION,
      className: theme === 'dark' ? 'map-base-tiles map-base-tiles-dark' : 'map-base-tiles',
      maxZoom: 20,
      subdomains: ['a', 'b', 'c', 'd'],
    };
  }

  return {
    provider: 'openstreetmap',
    theme,
    url: OPEN_STREET_MAP_TILE_URL,
    attribution: OPEN_STREET_MAP_ATTRIBUTION,
    className:
      theme === 'dark'
        ? 'map-base-tiles map-base-tiles-dark map-base-tiles-dark-fallback'
        : 'map-base-tiles',
    maxZoom: 19,
    subdomains: ['a', 'b', 'c'],
  };
}

export function createMapBaseTileLayer(
  theme: MapTheme,
  options: MapBaseLayerOptions = {},
): L.TileLayer {
  const config = getMapBaseLayerConfig(theme, options);

  return L.tileLayer(config.url, {
    attribution: config.attribution,
    className: config.className,
    maxZoom: config.maxZoom,
    subdomains: config.subdomains,
  });
}

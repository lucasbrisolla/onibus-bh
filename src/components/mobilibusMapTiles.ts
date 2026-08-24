import L from 'leaflet';
import type { MobilibusMapTile } from '../domain/mobilibusTypes';

export const MOBILIBUS_STOPS_MIN_ZOOM = 14;

function tileFromLatLng(latitude: number, longitude: number, zoom: number): MobilibusMapTile {
  const tileZoom = zoom - 2;
  const scale = 2 ** tileZoom;
  const latitudeRadians = (latitude * Math.PI) / 180;
  const x = Math.floor(((longitude + 180) / 360) * scale);
  const y = Math.floor(
    ((1 - Math.log(Math.tan(latitudeRadians) + 1 / Math.cos(latitudeRadians)) / Math.PI) / 2) * scale,
  );

  return { x, y, zoom };
}

export function tilesFromBounds(bounds: L.LatLngBounds, zoom: number): MobilibusMapTile[] {
  if (zoom < MOBILIBUS_STOPS_MIN_ZOOM) {
    return [];
  }

  const northWest = tileFromLatLng(bounds.getNorth(), bounds.getWest(), zoom);
  const southEast = tileFromLatLng(bounds.getSouth(), bounds.getEast(), zoom);
  const tileZoom = zoom - 2;
  const maxTileIndex = 2 ** tileZoom - 1;
  const minX = Math.max(0, Math.min(northWest.x, southEast.x));
  const maxX = Math.min(maxTileIndex, Math.max(northWest.x, southEast.x));
  const minY = Math.max(0, Math.min(northWest.y, southEast.y));
  const maxY = Math.min(maxTileIndex, Math.max(northWest.y, southEast.y));
  const tiles: MobilibusMapTile[] = [];

  for (let x = minX; x <= maxX; x += 1) {
    for (let y = minY; y <= maxY; y += 1) {
      tiles.push({ x, y, zoom });
    }
  }

  return tiles;
}

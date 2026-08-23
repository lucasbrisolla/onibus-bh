<script lang="ts">
import { mapRouteLayerStyles, type MapSceneRouteLayer as SceneRouteLayer } from './mapScene';

function createRoutePathOptions(layer: SceneRouteLayer) {
  return {
    className: layer.kind === 'base' ? 'map-route-base-path' : 'map-route-flow-path',
    color: layer.color,
    ...(layer.dashPattern ? { dashArray: layer.dashPattern } : {}),
    lineCap: layer.lineCap,
    lineJoin: layer.lineJoin,
    opacity: layer.opacity,
    weight: layer.weight,
  };
}

export const routeBasePathOptions = {
  ...createRoutePathOptions(mapRouteLayerStyles.base),
};

export const routeFlowPathOptions = {
  ...createRoutePathOptions(mapRouteLayerStyles.flow),
};

export const lightTileUrl = 'https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png';
export const darkTileUrl = 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png';
export type { UserLocation } from './mapScene';
</script>

<script setup lang="ts">
import { Crosshair, LocateFixed } from '@lucide/vue';
import { onBeforeUnmount, onMounted, ref, watch } from 'vue';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import type { NearbyStop, RoutePoint, Vehicle, VehicleApproachInfo } from '../domain/types';
import { createMapInteractionOptions } from './mapInteractionOptions';
import {
  createMapScene,
  type MapScene,
  type MapScenePopup,
  type MapSceneRouteLayer,
  type UserLocation as MapUserLocation,
} from './mapScene';

const props = withDefaults(
  defineProps<{
    monitoredStop?: NearbyStop | null;
    nearbyStops?: NearbyStop[];
    route?: RoutePoint[];
    vehicles?: Vehicle[];
    themeMode?: 'light' | 'dark';
    selectedVehicleId?: string | null;
    selectedVehicleStatus?: VehicleApproachInfo | null;
    userLocation?: MapUserLocation | null;
    isLocating?: boolean;
    locationStatus?: string;
    showNearbyStops?: boolean;
  }>(),
  {
    monitoredStop: null,
    nearbyStops: () => [],
    route: () => [],
    vehicles: () => [],
    themeMode: 'light',
    selectedVehicleId: null,
    selectedVehicleStatus: null,
    userLocation: null,
    isLocating: false,
    locationStatus: 'Use sua localização para encontrar pontos por perto.',
    showNearbyStops: true,
  },
);

const emit = defineEmits<{
  useCurrentLocation: [];
  selectStop: [stop: NearbyStop];
  moveMapArea: [payload: MapUserLocation];
  toggleNearbyStops: [showNearbyStops: boolean];
  toggleTheme: [];
}>();

const mapElement = ref<HTMLElement | null>(null);
let map: L.Map | null = null;
let stopLayer: L.LayerGroup | null = null;
let routeLayer: L.LayerGroup | null = null;
let vehicleLayer: L.LayerGroup | null = null;
let userLocationLayer: L.LayerGroup | null = null;
let baseTileLayer: L.TileLayer | null = null;
let resizeObserver: ResizeObserver | null = null;
let resizeFrameId: number | null = null;
let hasAutoFramedMap = false;
let suppressNextAreaSync = false;

const defaultCenter: L.LatLngTuple = [-19.916342, -43.993759];
const stopIconSvg = `
  <svg data-map-icon="stop" viewBox="0 0 24 24" aria-hidden="true">
    <path d="M20 10c0 4.993-5.539 10.193-7.399 11.799a1 1 0 0 1-1.202 0C9.539 20.193 4 14.993 4 10a8 8 0 0 1 16 0" />
    <circle cx="12" cy="10" r="3" />
  </svg>
`;
const vehicleIconSvg = `
  <svg data-map-icon="vehicle" viewBox="0 0 24 24" aria-hidden="true">
    <path d="M4 6 2 7" />
    <path d="M10 6h4" />
    <path d="m22 7-2-1" />
    <rect width="16" height="16" x="4" y="3" rx="2" />
    <path d="M4 11h16" />
    <path d="M8 15h.01" />
    <path d="M16 15h.01" />
    <path d="M6 19v2" />
    <path d="M18 21v-2" />
  </svg>
`;
const userLocationIconSvg = `
  <svg data-map-icon="user-location" viewBox="0 0 24 24" aria-hidden="true">
    <circle cx="12" cy="12" r="3.5" />
    <path d="M12 2v3" />
    <path d="M12 19v3" />
    <path d="M2 12h3" />
    <path d="M19 12h3" />
    <circle cx="12" cy="12" r="8" opacity="0.35" />
  </svg>
`;
const autoFitMaxZoom = 15;
const minimumAutoFitSpan = 0.01;

function createMarkerIcon(className: string, markup: string) {
  return L.divIcon({
    className: `map-marker ${className}`,
    html: `<span>${markup}</span>`,
    iconSize: [34, 34],
    iconAnchor: [17, 17],
  });
}

function updateBaseTileLayer() {
  if (!map) {
    return;
  }

  const isDarkMode = props.themeMode === 'dark';

  if (baseTileLayer) {
    map.removeLayer(baseTileLayer);
    baseTileLayer = null;
  }

  baseTileLayer = L.tileLayer(isDarkMode ? darkTileUrl : lightTileUrl, {
    className: isDarkMode ? 'map-base-tiles map-base-tiles-dark' : 'map-base-tiles',
    maxZoom: 20,
  });

  baseTileLayer.addTo(map);
}

function clearLayer(layer: L.Layer | null) {
  if (map && layer) {
    map.removeLayer(layer);
  }
}

function markProgrammaticViewportChange() {
  suppressNextAreaSync = true;
}

function invalidateMapSize() {
  if (!map || !mapElement.value) {
    return;
  }

  if (resizeFrameId !== null) {
    cancelAnimationFrame(resizeFrameId);
  }

  resizeFrameId = requestAnimationFrame(() => {
    resizeFrameId = null;

    if (!map || !mapElement.value) {
      return;
    }

    if (mapElement.value.clientWidth === 0 || mapElement.value.clientHeight === 0) {
      return;
    }

    map.invalidateSize(false);
  });
}

function buildMapScene(): MapScene {
  return createMapScene({
    monitoredStop: props.monitoredStop,
    nearbyStops: props.nearbyStops,
    route: props.route,
    vehicles: props.vehicles,
    selectedVehicleId: props.selectedVehicleId,
    selectedVehicleStatus: props.selectedVehicleStatus,
    userLocation: props.userLocation,
    showNearbyStops: props.showNearbyStops,
  });
}

function escapePopupText(value: string): string {
  return value.replace(/[&<>"']/g, character => {
    const entities: Record<string, string> = {
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#39;',
    };

    return entities[character] ?? character;
  });
}

function renderPopup(popup: MapScenePopup): string {
  return [
    `<strong>${escapePopupText(popup.title)}</strong>`,
    ...popup.body.map(line => `<br>${escapePopupText(line)}`),
  ].join('');
}

function createLeafletPathOptions(layer: MapSceneRouteLayer) {
  return {
    className: layer.kind === 'base' ? 'map-route-base-path' : 'map-route-flow-path',
    color: layer.color,
    ...(layer.dashPattern ? { dashArray: layer.dashPattern } : {}),
    lineCap: layer.lineCap,
    lineJoin: layer.lineJoin,
    opacity: layer.opacity,
    weight: layer.weight,
  };
}

function renderStops(scene: MapScene) {
  if (!map) {
    return;
  }

  clearLayer(stopLayer);
  stopLayer = L.layerGroup();

  for (const stop of scene.stops) {
    const marker = L.marker([stop.coordinate.latitude, stop.coordinate.longitude], {
      icon: createMarkerIcon(stop.role === 'monitored' ? 'is-monitored' : 'is-stop', stopIconSvg),
      title: stop.markerTitle,
      keyboard: true,
    });

    marker.bindPopup(renderPopup(stop.popup)).on('click', () => emit('selectStop', stop.source));

    if (stop.label) {
      marker.bindTooltip(stop.label.text, {
        className: 'map-stop-tooltip',
        direction: 'top',
        offset: [0, -18],
        opacity: 1,
        permanent: true,
      });
    }

    marker.addTo(stopLayer);
  }

  stopLayer.addTo(map);
}

function renderUserLocation(scene: MapScene) {
  if (!map) {
    return;
  }

  clearLayer(userLocationLayer);
  userLocationLayer = null;

  if (!scene.userLocation) {
    return;
  }

  userLocationLayer = L.layerGroup();
  L.marker([scene.userLocation.coordinate.latitude, scene.userLocation.coordinate.longitude], {
    icon: createMarkerIcon('is-user-location', userLocationIconSvg),
    title: scene.userLocation.markerTitle,
    zIndexOffset: 1000,
  })
    .bindPopup(renderPopup(scene.userLocation.popup))
    .addTo(userLocationLayer);

  userLocationLayer.addTo(map);
}

function renderRoute(scene: MapScene) {
  const currentMap = map;

  if (!currentMap) {
    return;
  }

  clearLayer(routeLayer);
  routeLayer = null;

  if (!scene.route) {
    return;
  }

  const routeCoordinates = scene.route.coordinates.map(
    point => [point.latitude, point.longitude] as L.LatLngTuple,
  );
  const routePaths = scene.route.layers.map(layer =>
    L.polyline(routeCoordinates, createLeafletPathOptions(layer)),
  );
  routeLayer = L.layerGroup(routePaths);

  try {
    routeLayer.addTo(currentMap);
  } catch {
    routeLayer = null;
  }
}

function renderVehicles(scene: MapScene) {
  const currentMap = map;

  if (!currentMap) {
    return;
  }

  clearLayer(vehicleLayer);
  vehicleLayer = L.layerGroup();

  for (const vehicle of scene.vehicles) {
    const marker = L.marker([vehicle.coordinate.latitude, vehicle.coordinate.longitude], {
      icon: createMarkerIcon(
        vehicle.isHighlighted ? 'is-vehicle is-selected-vehicle' : 'is-vehicle',
        vehicleIconSvg,
      ),
      title: vehicle.markerTitle,
      zIndexOffset: vehicle.isHighlighted ? 1200 : 0,
    });

    if (vehicle.label) {
      marker.bindTooltip(vehicle.label.text, {
        className: 'map-vehicle-tooltip',
        direction: 'top',
        offset: [0, -18],
        opacity: 1,
        permanent: true,
      });
    }

    marker.addTo(vehicleLayer);
  }

  try {
    vehicleLayer.addTo(currentMap);
  } catch {
    vehicleLayer = null;
  }
}

function createComfortableBounds(points: L.LatLngTuple[]) {
  const bounds = L.latLngBounds(points);
  const southWest = bounds.getSouthWest();
  const northEast = bounds.getNorthEast();
  const latSpan = Math.max(northEast.lat - southWest.lat, minimumAutoFitSpan);
  const lngSpan = Math.max(northEast.lng - southWest.lng, minimumAutoFitSpan);
  const center = bounds.getCenter();

  return L.latLngBounds(
    [center.lat - latSpan / 2, center.lng - lngSpan / 2],
    [center.lat + latSpan / 2, center.lng + lngSpan / 2],
  );
}

function fitMap() {
  if (!map) {
    return;
  }

  const scene = buildMapScene();

  if (!scene.bounds) {
    markProgrammaticViewportChange();
    map.setView(defaultCenter, 14);
    return;
  }

  const points: L.LatLngTuple[] = [
    [scene.bounds.southWest.latitude, scene.bounds.southWest.longitude],
    [scene.bounds.northEast.latitude, scene.bounds.northEast.longitude],
  ];

  markProgrammaticViewportChange();
  map.fitBounds(createComfortableBounds(points), { padding: [72, 72], maxZoom: autoFitMaxZoom });
}

function handleMapMoveEnd() {
  if (!map) {
    return;
  }

  if (suppressNextAreaSync) {
    suppressNextAreaSync = false;
    return;
  }

  const center = map.getCenter();
  emit('moveMapArea', {
    latitude: center.lat,
    longitude: center.lng,
  });
}

function buildAutoFrameSignature() {
  if (!props.userLocation) {
    return 'no-location';
  }

  return `${props.userLocation.latitude}:${props.userLocation.longitude}`;
}

function autoFrameMap(force = false) {
  if (!map) {
    return;
  }

  if (!force && hasAutoFramedMap) {
    return;
  }

  fitMap();
  hasAutoFramedMap = true;
}

function renderMapData() {
  const scene = buildMapScene();
  renderStops(scene);
  renderUserLocation(scene);
  renderRoute(scene);
  renderVehicles(scene);
  invalidateMapSize();
}

onMounted(() => {
  if (!mapElement.value) {
    return;
  }

  markProgrammaticViewportChange();
  map = L.map(mapElement.value, {
    zoomControl: false,
    attributionControl: false,
    ...createMapInteractionOptions(),
  }).setView(defaultCenter, 14);

  updateBaseTileLayer();

  L.control.zoom({ position: 'bottomright' }).addTo(map);
  map.on('moveend', handleMapMoveEnd);

  if (typeof ResizeObserver !== 'undefined' && mapElement.value) {
    resizeObserver = new ResizeObserver(() => {
      invalidateMapSize();
    });
    resizeObserver.observe(mapElement.value);
  }

  window.addEventListener('resize', invalidateMapSize);
  renderMapData();
  autoFrameMap(true);
  invalidateMapSize();
});

onBeforeUnmount(() => {
  if (resizeFrameId !== null) {
    cancelAnimationFrame(resizeFrameId);
    resizeFrameId = null;
  }

  resizeObserver?.disconnect();
  resizeObserver = null;
  window.removeEventListener('resize', invalidateMapSize);
  map?.off('moveend', handleMapMoveEnd);
  map?.remove();
  map = null;
});

watch(
  () => [
    props.monitoredStop,
    props.nearbyStops,
    props.showNearbyStops,
    props.userLocation,
    props.route,
    props.vehicles,
    props.selectedVehicleId,
    props.selectedVehicleStatus,
  ],
  () => renderMapData(),
  { deep: true },
);

watch(
  () => buildAutoFrameSignature(),
  () => {
    invalidateMapSize();
    autoFrameMap(true);
  },
);

watch(
  () => props.themeMode,
  () => updateBaseTileLayer(),
);
</script>

<template>
  <section class="map-panel">
    <div ref="mapElement" class="map-surface" aria-label="Mapa de ônibus e paradas"></div>
    <div class="map-toggle-controls">
      <button
        type="button"
        class="map-compact-toggle map-points-toggle"
        :class="{ 'is-active': showNearbyStops }"
        :aria-pressed="showNearbyStops"
        @click="emit('toggleNearbyStops', !showNearbyStops)"
      >
        <span>Mostrar pontos</span>
        <span class="compact-switch" aria-hidden="true">
          <span></span>
        </span>
      </button>
      <button
        type="button"
        class="map-compact-toggle map-theme-toggle"
        :class="{ 'is-active': themeMode === 'dark' }"
        :aria-pressed="themeMode === 'dark'"
        @click="emit('toggleTheme')"
      >
        <span>Modo escuro</span>
        <span class="compact-switch" aria-hidden="true">
          <span></span>
        </span>
      </button>
    </div>
    <div class="map-location-control">
      <button
        type="button"
        class="primary map-location-button"
        :aria-label="isLocating ? 'Localizando sua posição' : 'Usar minha localização'"
        :title="isLocating ? 'Localizando sua posição' : 'Usar minha localização'"
        :disabled="isLocating"
        @click="emit('useCurrentLocation')"
      >
        <LocateFixed v-if="!isLocating" aria-hidden="true" />
        <Crosshair v-else aria-hidden="true" />
      </button>
    </div>
  </section>
</template>

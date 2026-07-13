<script lang="ts">
export const routeBasePathOptions = {
  className: 'map-route-base-path',
  color: '#7c3aed',
  lineCap: 'round' as const,
  lineJoin: 'round' as const,
  opacity: 0.68,
  weight: 5,
};

export const routeFlowPathOptions = {
  className: 'map-route-flow-path',
  color: '#ddd6fe',
  dashArray: '2 12',
  lineCap: 'round' as const,
  lineJoin: 'round' as const,
  opacity: 0.42,
  weight: 3,
};

export const lightTileUrl = 'https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png';
export const darkTileUrl = 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png';
</script>

<script setup lang="ts">
import { Crosshair, LocateFixed } from '@lucide/vue';
import { onBeforeUnmount, onMounted, ref, watch } from 'vue';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import type { NearbyStop, RoutePoint, Vehicle, VehicleApproachInfo } from '../domain/types';
import { createMapInteractionOptions } from './mapInteractionOptions';

export interface UserLocation {
  latitude: number;
  longitude: number;
}

const props = withDefaults(
  defineProps<{
    monitoredStop?: NearbyStop | null;
    nearbyStops?: NearbyStop[];
    route?: RoutePoint[];
    vehicles?: Vehicle[];
    themeMode?: 'light' | 'dark';
    selectedVehicleId?: string | null;
    selectedVehicleStatus?: VehicleApproachInfo | null;
    userLocation?: UserLocation | null;
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
  moveMapArea: [payload: UserLocation];
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

function describeSelectedVehicleTooltip(vehicle: Vehicle): string {
  if (
    props.selectedVehicleStatus &&
    vehicle.vehicleId === props.selectedVehicleId &&
    Number.isFinite(props.selectedVehicleStatus.minutes)
  ) {
    return `${vehicle.lineCode} • ${props.selectedVehicleStatus.minutes} min`;
  }

  return vehicle.lineCode;
}

function createMarkerIcon(className: string, markup: string) {
  return L.divIcon({
    className: `map-marker ${className}`,
    html: `<span>${markup}</span>`,
    iconSize: [34, 34],
    iconAnchor: [17, 17],
  });
}

function formatDisplayText(value: string): string {
  const hasLetters = /\p{L}/u.test(value);
  const isAllCaps = hasLetters && value === value.toLocaleUpperCase('pt-BR');

  if (!isAllCaps) {
    return value;
  }

  return value.toLocaleLowerCase('pt-BR').replace(/\p{L}[\p{L}\p{M}]*/gu, word =>
    word.charAt(0).toLocaleUpperCase('pt-BR') + word.slice(1),
  );
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

function getVisibleVehicles() {
  if (!props.selectedVehicleId) {
    return props.vehicles;
  }

  return props.vehicles.filter(vehicle => vehicle.vehicleId === props.selectedVehicleId);
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

function renderStops() {
  if (!map) {
    return;
  }

  clearLayer(stopLayer);
  stopLayer = L.layerGroup();

  const stops = props.monitoredStop
    ? [
        props.monitoredStop,
        ...(props.showNearbyStops
          ? props.nearbyStops.filter(stop => stop.code !== props.monitoredStop?.code)
          : []),
      ]
    : props.showNearbyStops
      ? props.nearbyStops
      : [];

  for (const stop of stops) {
    const isMonitored = stop.code === props.monitoredStop?.code;
    const stopDescription = formatDisplayText(stop.description);
    const marker = L.marker([stop.latitude, stop.longitude], {
      icon: createMarkerIcon(isMonitored ? 'is-monitored' : 'is-stop', stopIconSvg),
      title: stopDescription,
      keyboard: true,
    });

    marker
      .bindPopup(
        `<strong>${stop.publicCode || stop.code}</strong><br>${stopDescription}<br><small>Clique para ver os ônibus desta parada.</small>`,
      )
      .on('click', () => emit('selectStop', stop));

    if (isMonitored) {
      marker.bindTooltip(stopDescription, {
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

function renderUserLocation() {
  if (!map) {
    return;
  }

  clearLayer(userLocationLayer);
  userLocationLayer = null;

  if (!props.userLocation) {
    return;
  }

  userLocationLayer = L.layerGroup();
  L.marker([props.userLocation.latitude, props.userLocation.longitude], {
    icon: createMarkerIcon('is-user-location', userLocationIconSvg),
    title: 'Sua posição',
    zIndexOffset: 1000,
  })
    .bindPopup('<strong>Sua posição</strong><br><small>Localização ativa no mapa.</small>')
    .addTo(userLocationLayer);

  userLocationLayer.addTo(map);
}

function renderRoute() {
  const currentMap = map;

  if (!currentMap) {
    return;
  }

  clearLayer(routeLayer);
  routeLayer = null;

  if (props.route.length === 0) {
    return;
  }

  const routeCoordinates = props.route.map(point => [point.latitude, point.longitude] as L.LatLngTuple);
  const routeBaseLayer = L.polyline(routeCoordinates, routeBasePathOptions);
  const routeFlowLayer = L.polyline(routeCoordinates, routeFlowPathOptions);
  routeLayer = L.layerGroup([routeBaseLayer, routeFlowLayer]);

  try {
    routeLayer.addTo(currentMap);
  } catch {
    routeLayer = null;
  }
}

function renderVehicles() {
  const currentMap = map;

  if (!currentMap) {
    return;
  }

  clearLayer(vehicleLayer);
  vehicleLayer = L.layerGroup();

  for (const vehicle of getVisibleVehicles()) {
    const marker = L.marker([vehicle.latitude, vehicle.longitude], {
      icon: createMarkerIcon(
        vehicle.vehicleId === props.selectedVehicleId ? 'is-vehicle is-selected-vehicle' : 'is-vehicle',
        vehicleIconSvg,
      ),
      title: `${vehicle.lineCode} - ${vehicle.vehicleId}`,
      zIndexOffset: vehicle.vehicleId === props.selectedVehicleId ? 1200 : 0,
    });

    if (vehicle.vehicleId === props.selectedVehicleId) {
      marker.bindTooltip(describeSelectedVehicleTooltip(vehicle), {
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

  const visibleVehicles = getVisibleVehicles();
  const points: L.LatLngTuple[] = [
    ...(props.monitoredStop ? [[props.monitoredStop.latitude, props.monitoredStop.longitude] as L.LatLngTuple] : []),
    ...props.nearbyStops.map(stop => [stop.latitude, stop.longitude] as L.LatLngTuple),
    ...(props.userLocation ? [[props.userLocation.latitude, props.userLocation.longitude] as L.LatLngTuple] : []),
    ...props.route.map(point => [point.latitude, point.longitude] as L.LatLngTuple),
    ...visibleVehicles.map(vehicle => [vehicle.latitude, vehicle.longitude] as L.LatLngTuple),
  ];

  if (points.length === 0) {
    markProgrammaticViewportChange();
    map.setView(defaultCenter, 14);
    return;
  }

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
  renderStops();
  renderUserLocation();
  renderRoute();
  renderVehicles();
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

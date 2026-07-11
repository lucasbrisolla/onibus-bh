<script setup lang="ts">
import { Crosshair, LocateFixed } from '@lucide/vue';
import { onBeforeUnmount, onMounted, ref, watch } from 'vue';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import type { NearbyStop, RoutePoint, Vehicle } from '../domain/types';

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
    userLocation?: UserLocation | null;
    isLocating?: boolean;
    locationStatus?: string;
  }>(),
  {
    monitoredStop: null,
    nearbyStops: () => [],
    route: () => [],
    vehicles: () => [],
    userLocation: null,
    isLocating: false,
    locationStatus: 'Use sua localização para encontrar pontos por perto.',
  },
);

const emit = defineEmits<{
  useCurrentLocation: [];
  selectStop: [stop: NearbyStop];
}>();

const mapElement = ref<HTMLElement | null>(null);
let map: L.Map | null = null;
let stopLayer: L.LayerGroup | null = null;
let routeLayer: L.Polyline | null = null;
let vehicleLayer: L.LayerGroup | null = null;
let userLocationLayer: L.LayerGroup | null = null;
let resizeObserver: ResizeObserver | null = null;
let resizeFrameId: number | null = null;

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
function createMarkerIcon(className: string, markup: string) {
  return L.divIcon({
    className: `map-marker ${className}`,
    html: `<span>${markup}</span>`,
    iconSize: [34, 34],
    iconAnchor: [17, 17],
  });
}

function clearLayer(layer: L.Layer | null) {
  if (map && layer) {
    map.removeLayer(layer);
  }
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
    ? [props.monitoredStop, ...props.nearbyStops.filter(stop => stop.code !== props.monitoredStop?.code)]
    : props.nearbyStops;

  for (const stop of stops) {
    const isMonitored = stop.code === props.monitoredStop?.code;
    L.marker([stop.latitude, stop.longitude], {
      icon: createMarkerIcon(isMonitored ? 'is-monitored' : 'is-stop', stopIconSvg),
      title: stop.description,
      keyboard: true,
    })
      .bindPopup(
        `<strong>${stop.publicCode || stop.code}</strong><br>${stop.description}<br><small>Clique para ver os ônibus desta parada.</small>`,
      )
      .on('click', () => emit('selectStop', stop))
      .addTo(stopLayer);
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
  if (!map) {
    return;
  }

  clearLayer(routeLayer);
  routeLayer = null;

  if (props.route.length === 0) {
    return;
  }

  routeLayer = L.polyline(
    props.route.map(point => [point.latitude, point.longitude]),
    { color: '#7c3aed', weight: 5, opacity: 0.75 },
  ).addTo(map);
}

function renderVehicles() {
  if (!map) {
    return;
  }

  clearLayer(vehicleLayer);
  vehicleLayer = L.layerGroup();

  for (const vehicle of props.vehicles) {
    L.marker([vehicle.latitude, vehicle.longitude], {
      icon: createMarkerIcon('is-vehicle', vehicleIconSvg),
      title: `${vehicle.lineCode} - ${vehicle.vehicleId}`,
    }).addTo(vehicleLayer);
  }

  vehicleLayer.addTo(map);
}

function fitMap() {
  if (!map) {
    return;
  }

  const points: L.LatLngTuple[] = [
    ...(props.monitoredStop ? [[props.monitoredStop.latitude, props.monitoredStop.longitude] as L.LatLngTuple] : []),
    ...props.nearbyStops.map(stop => [stop.latitude, stop.longitude] as L.LatLngTuple),
    ...(props.userLocation ? [[props.userLocation.latitude, props.userLocation.longitude] as L.LatLngTuple] : []),
    ...props.route.map(point => [point.latitude, point.longitude] as L.LatLngTuple),
    ...props.vehicles.map(vehicle => [vehicle.latitude, vehicle.longitude] as L.LatLngTuple),
  ];

  if (points.length === 0) {
    map.setView(defaultCenter, 14);
    return;
  }

  map.fitBounds(L.latLngBounds(points), { padding: [36, 36], maxZoom: 16 });
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

  map = L.map(mapElement.value, {
    zoomControl: false,
    attributionControl: false,
  }).setView(defaultCenter, 14);

  L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png', {
    maxZoom: 20,
  }).addTo(map);

  L.control.zoom({ position: 'bottomright' }).addTo(map);

  if (typeof ResizeObserver !== 'undefined' && mapElement.value) {
    resizeObserver = new ResizeObserver(() => {
      invalidateMapSize();
    });
    resizeObserver.observe(mapElement.value);
  }

  window.addEventListener('resize', invalidateMapSize);
  renderMapData();
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
  map?.remove();
  map = null;
});

watch(
  () => [props.monitoredStop, props.nearbyStops, props.userLocation, props.route, props.vehicles],
  () => renderMapData(),
  { deep: true },
);

watch(
  () => [props.monitoredStop, props.nearbyStops, props.userLocation, props.route],
  () => {
    invalidateMapSize();
    fitMap();
  },
  { deep: true },
);
</script>

<template>
  <section class="map-panel">
    <div ref="mapElement" class="map-surface" aria-label="Mapa de ônibus e paradas"></div>
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
    <div v-if="userLocation" class="map-user-badge">
      <span class="map-user-badge-icon" aria-hidden="true">
        <LocateFixed />
      </span>
      <div class="map-user-badge-copy">
        <strong>Sua posição</strong>
        <span>Localização ativa</span>
      </div>
    </div>
  </section>
</template>

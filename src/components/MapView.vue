<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue';
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

const defaultCenter: L.LatLngTuple = [-19.916342, -43.993759];
const stopIconSvg = `
  <svg data-map-icon="stop" viewBox="0 0 24 24" aria-hidden="true">
    <path d="M7 3h10a2 2 0 0 1 2 2v9a3 3 0 0 1-3 3l1.2 2.4a.7.7 0 0 1-.63 1H15.4a.7.7 0 0 1-.63-.39L13.8 18h-3.6l-.97 2.01a.7.7 0 0 1-.63.39H7.43a.7.7 0 0 1-.63-1L8 17a3 3 0 0 1-3-3V5a2 2 0 0 1 2-2Z" />
    <path d="M8 6.5h8v4H8z" />
    <circle cx="8.5" cy="14" r="1.1" />
    <circle cx="15.5" cy="14" r="1.1" />
  </svg>
`;
const stopCount = computed(() => {
  const monitored = props.monitoredStop ? [props.monitoredStop.code] : [];
  return new Set([...monitored, ...props.nearbyStops.map(stop => stop.code)]).size;
});

function createMarkerIcon(className: string, label: string) {
  return L.divIcon({
    className: `map-marker ${className}`,
    html: `<span>${label}</span>`,
    iconSize: [34, 34],
    iconAnchor: [17, 17],
  });
}

function clearLayer(layer: L.Layer | null) {
  if (map && layer) {
    map.removeLayer(layer);
  }
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
      icon: createMarkerIcon(isMonitored ? 'is-monitored' : 'is-stop', isMonitored ? '🚌' : stopIconSvg),
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
    icon: createMarkerIcon('is-user-location', '●'),
    title: 'Você está aqui',
    zIndexOffset: 1000,
  })
    .bindPopup('<strong>Você está aqui</strong>')
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
      icon: createMarkerIcon('is-vehicle', 'Ô'),
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
  fitMap();
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
  renderMapData();
});

onBeforeUnmount(() => {
  map?.remove();
  map = null;
});

watch(
  () => [props.monitoredStop, props.nearbyStops, props.userLocation, props.route, props.vehicles],
  () => renderMapData(),
  { deep: true },
);
</script>

<template>
  <section class="map-panel">
    <div ref="mapElement" class="map-surface" aria-label="Mapa de ônibus e paradas"></div>
    <div class="map-location-control">
      <button
        type="button"
        class="primary"
        :disabled="isLocating"
        @click="emit('useCurrentLocation')"
      >
        {{ isLocating ? 'Localizando...' : 'Usar minha localização' }}
      </button>
      <span>{{ locationStatus }}</span>
    </div>
    <p v-if="userLocation" class="map-user-badge">Você está aqui</p>
    <p class="map-points-badge">{{ stopCount }} pontos próximos</p>
    <p v-if="route.length === 0" class="map-hint">
      Rota disponível quando houver veículo em operação.
    </p>
  </section>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import type { NearbyStop, RoutePoint, Vehicle } from '../domain/types';

const props = withDefaults(
  defineProps<{
    monitoredStop?: NearbyStop | null;
    nearbyStops?: NearbyStop[];
    route?: RoutePoint[];
    vehicles?: Vehicle[];
  }>(),
  {
    monitoredStop: null,
    nearbyStops: () => [],
    route: () => [],
    vehicles: () => [],
  },
);

const mapElement = ref<HTMLElement | null>(null);
let map: L.Map | null = null;
let stopLayer: L.LayerGroup | null = null;
let routeLayer: L.Polyline | null = null;
let vehicleLayer: L.LayerGroup | null = null;

const defaultCenter: L.LatLngTuple = [-19.916342, -43.993759];
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
      icon: createMarkerIcon(isMonitored ? 'is-monitored' : 'is-stop', isMonitored ? 'P' : '•'),
      title: stop.description,
    }).addTo(stopLayer);
  }

  stopLayer.addTo(map);
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
  () => [props.monitoredStop, props.nearbyStops, props.route, props.vehicles],
  () => renderMapData(),
  { deep: true },
);
</script>

<template>
  <section class="map-panel">
    <div ref="mapElement" class="map-surface" aria-label="Mapa de ônibus e paradas"></div>
    <p class="map-points-badge">{{ stopCount }} pontos próximos</p>
    <p v-if="route.length === 0" class="map-hint">
      Rota disponível quando houver veículo em operação.
    </p>
  </section>
</template>

<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref, watch } from 'vue';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import type {
  MobilibusMapTile,
  MobilibusStop,
  MobilibusStopsStatus,
} from '../domain/mobilibusTypes';
import { darkTileUrl, lightTileUrl } from './MapView.vue';
import { MOBILIBUS_STOPS_MIN_ZOOM, tilesFromBounds } from './mobilibusMapTiles';

const DEFAULT_CENTER: L.LatLngTuple = [-19.916342, -43.993759];

const props = withDefaults(
  defineProps<{
    stops?: MobilibusStop[];
    status?: MobilibusStopsStatus;
    error?: string | null;
    selectedStopId?: number | null;
    themeMode?: 'light' | 'dark';
  }>(),
  {
    stops: () => [],
    status: 'initial',
    error: null,
    selectedStopId: null,
    themeMode: 'light',
  },
);

const emit = defineEmits<{
  requestTiles: [tiles: MobilibusMapTile[]];
  retry: [];
  selectStop: [stop: MobilibusStop];
  toggleTheme: [];
}>();

const mapElement = ref<HTMLElement | null>(null);
const showStops = ref(true);
const currentZoom = ref(MOBILIBUS_STOPS_MIN_ZOOM);
let map: L.Map | null = null;
let stopLayer: L.LayerGroup | null = null;
let baseTileLayer: L.TileLayer | null = null;
let resizeObserver: ResizeObserver | null = null;

const stopIconSvg = `
  <svg data-map-icon="mobilibus-stop" viewBox="0 0 24 24" aria-hidden="true">
    <path d="M20 10c0 4.993-5.539 10.193-7.399 11.799a1 1 0 0 1-1.202 0C9.539 20.193 4 14.993 4 10a8 8 0 1 1 16 0" />
    <circle cx="12" cy="10" r="3" />
  </svg>
`;

function createMarkerIcon(isSelected: boolean) {
  return L.divIcon({
    className: `map-marker is-stop is-mobilibus-stop${isSelected ? ' is-selected-mobilibus-stop' : ''}`,
    html: `<span>${stopIconSvg}</span>`,
    iconSize: [34, 34],
    iconAnchor: [17, 17],
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

function renderPopup(stop: MobilibusStop): string {
  const body = [
    stop.address,
    stop.code ? `Código: ${stop.code}` : null,
    'Ponto da rede Ótimo/RMBH.',
  ].filter((value): value is string => value !== null);

  return [`<strong>${escapePopupText(stop.name)}</strong>`, ...body.map(line => `<br>${escapePopupText(line)}`)].join('');
}

function updateBaseTileLayer() {
  if (!map) {
    return;
  }

  baseTileLayer?.remove();
  baseTileLayer = L.tileLayer(props.themeMode === 'dark' ? darkTileUrl : lightTileUrl, {
    className: props.themeMode === 'dark' ? 'map-base-tiles map-base-tiles-dark' : 'map-base-tiles',
    maxZoom: 20,
  });
  baseTileLayer.addTo(map);
}

function requestVisibleTiles() {
  if (!map) {
    return;
  }

  currentZoom.value = Math.round(map.getZoom());
  emit('requestTiles', tilesFromBounds(map.getBounds(), currentZoom.value));
}

function clearStopLayer() {
  if (map && stopLayer) {
    map.removeLayer(stopLayer);
  }
  stopLayer = null;
}

function renderStops() {
  if (!map) {
    return;
  }

  clearStopLayer();
  stopLayer = L.layerGroup();

  if (showStops.value) {
    const seenStopIds = new Set<number>();
    for (const stop of props.stops) {
      if (seenStopIds.has(stop.stopId)) {
        continue;
      }

      seenStopIds.add(stop.stopId);
      L.marker([stop.latitude, stop.longitude], {
        icon: createMarkerIcon(props.selectedStopId === stop.stopId),
        title: stop.name,
        keyboard: true,
      })
        .bindPopup(renderPopup(stop))
        .on('click', () => emit('selectStop', stop))
        .addTo(stopLayer);
    }
  }

  stopLayer.addTo(map);
}

function invalidateMapSize() {
  map?.invalidateSize(false);
}

function toggleStops() {
  showStops.value = !showStops.value;
  renderStops();
}

onMounted(() => {
  if (!mapElement.value) {
    return;
  }

  map = L.map(mapElement.value, {
    zoomControl: false,
    attributionControl: false,
  }).setView(DEFAULT_CENTER, MOBILIBUS_STOPS_MIN_ZOOM);
  updateBaseTileLayer();
  L.control.zoom({ position: 'bottomright' }).addTo(map);
  map.on('moveend', requestVisibleTiles);

  if (typeof ResizeObserver !== 'undefined') {
    resizeObserver = new ResizeObserver(invalidateMapSize);
    resizeObserver.observe(mapElement.value);
  }

  window.addEventListener('resize', invalidateMapSize);
  renderStops();
  requestVisibleTiles();
});

onBeforeUnmount(() => {
  resizeObserver?.disconnect();
  resizeObserver = null;
  window.removeEventListener('resize', invalidateMapSize);
  map?.off('moveend', requestVisibleTiles);
  map?.remove();
  map = null;
});

watch(
  () => props.stops,
  () => renderStops(),
  { deep: true },
);

watch(
  () => props.selectedStopId,
  () => renderStops(),
);

watch(
  () => props.themeMode,
  () => updateBaseTileLayer(),
);
</script>

<template>
  <section class="map-panel mobilibus-map-panel" aria-label="Mapa de pontos Mobilibus">
    <div ref="mapElement" class="map-surface" aria-label="Mapa de pontos da linha Mobilibus"></div>

    <div class="map-toggle-controls">
      <button
        type="button"
        class="map-compact-toggle map-points-toggle"
        :class="{ 'is-active': showStops }"
        :aria-pressed="showStops"
        @click="toggleStops"
      >
        <span>Mostrar pontos</span>
        <span class="compact-switch" aria-hidden="true"><span></span></span>
      </button>
      <button
        type="button"
        class="map-compact-toggle map-theme-toggle"
        :class="{ 'is-active': themeMode === 'dark' }"
        :aria-pressed="themeMode === 'dark'"
        @click="emit('toggleTheme')"
      >
        <span>Modo escuro</span>
        <span class="compact-switch" aria-hidden="true"><span></span></span>
      </button>
    </div>

    <p v-if="currentZoom < MOBILIBUS_STOPS_MIN_ZOOM" class="mobilibus-map-message" role="status">
      Aproxime o mapa para carregar os pontos Mobilibus.
    </p>
    <p v-else-if="status === 'loading' && stops.length === 0" class="mobilibus-map-message" role="status" aria-live="polite">
      Carregando pontos Mobilibus...
    </p>
    <p v-else-if="status === 'empty'" class="mobilibus-map-message" role="status">
      Nenhum ponto Mobilibus foi encontrado nesta área.
    </p>
    <div v-else-if="status === 'error'" class="mobilibus-map-message mobilibus-map-message--error" role="alert">
      <span>{{ error ?? 'Não foi possível carregar os pontos Mobilibus.' }}</span>
      <button type="button" class="primary" @click="emit('retry')">Tentar novamente</button>
    </div>
    <p v-else-if="stops.length > 0" class="mobilibus-map-count" role="status" aria-live="polite">
      {{ stops.length }} {{ stops.length === 1 ? 'ponto visível' : 'pontos visíveis' }}
    </p>
  </section>
</template>

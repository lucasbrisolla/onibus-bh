<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref, watch } from 'vue';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import type {
  MobilibusMapTile,
  MobilibusStop,
  MobilibusStopsStatus,
} from '../domain/mobilibusTypes';
import { createMapLifecycle, type MapLifecycle } from './mapLifecycle';
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
let mapLifecycle: MapLifecycle | null = null;
let stopLayer: L.LayerGroup | null = null;

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

function getMap(): L.Map | null {
  return mapLifecycle?.getMap() ?? null;
}

function requestVisibleTiles() {
  const currentMap = getMap();

  if (!currentMap) {
    return;
  }

  currentZoom.value = Math.round(currentMap.getZoom());
  emit('requestTiles', tilesFromBounds(currentMap.getBounds(), currentZoom.value));
}

function clearStopLayer() {
  const currentMap = getMap();

  if (currentMap && stopLayer) {
    currentMap.removeLayer(stopLayer);
  }
  stopLayer = null;
}

function renderStops() {
  const currentMap = getMap();

  if (!currentMap) {
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

  stopLayer.addTo(currentMap);
}

function toggleStops() {
  showStops.value = !showStops.value;
  renderStops();
}

function getCompactToggleThemeClasses(isActive: boolean): string {
  if (props.themeMode === 'dark') {
    return isActive
      ? 'tw:border-[#2dd4bf]! tw:bg-[rgba(15,36,35,0.94)]! tw:text-[#5eead4]!'
      : 'tw:border-[#28514d]! tw:bg-[rgba(15,36,35,0.94)]! tw:text-[#e5e7eb]!';
  }

  return isActive
    ? 'tw:border-[#99f6e4]! tw:bg-white/[0.94]! tw:text-[#0f766e]!'
    : 'tw:border-[#d0d5dd]! tw:bg-white/[0.94]! tw:text-[#344054]!';
}

onMounted(() => {
  if (!mapElement.value) {
    return;
  }

  mapLifecycle = createMapLifecycle({
    element: mapElement.value,
    themeMode: props.themeMode,
    initialView: {
      center: DEFAULT_CENTER,
      zoom: MOBILIBUS_STOPS_MIN_ZOOM,
    },
  });
  mapLifecycle.mount();
  mapLifecycle.listen('moveend', requestVisibleTiles);
  renderStops();
  requestVisibleTiles();
  mapLifecycle.invalidateSize();
});

onBeforeUnmount(() => {
  mapLifecycle?.destroy();
  mapLifecycle = null;
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
  themeMode => mapLifecycle?.setTheme(themeMode),
);
</script>

<template>
  <section
    class="map-panel mobilibus-map-panel tw:relative tw:h-full tw:min-h-[calc(100vh-79px)] tw:overflow-hidden tw:rounded-none tw:border-0 tw:bg-[#e8ece6] tw:shadow-none tw:dark:bg-[#0b1616] tw:max-[920px]:h-[58vh] tw:max-[920px]:min-h-[calc(100vh-62px)] tw:max-[920px]:rounded-[14px] tw:max-[920px]:border tw:max-[920px]:border-[#d0d5dd] tw:max-[920px]:shadow-[0_14px_34px_rgba(16,24,40,0.12)]"
    aria-label="Mapa de pontos Mobilibus"
  >
    <div ref="mapElement" class="map-surface tw:h-full tw:min-h-[calc(100vh-79px)] tw:max-[920px]:min-h-[calc(100vh-62px)]" aria-label="Mapa de pontos da linha Mobilibus"></div>

    <div class="map-toggle-controls tw:absolute tw:left-[18px] tw:top-[18px] tw:z-[700] tw:grid tw:max-w-[calc(100%-72px)] tw:justify-items-start tw:gap-2 tw:max-[920px]:top-3 tw:max-[920px]:left-3">
      <button
        type="button"
        class="map-compact-toggle map-points-toggle tw:inline-flex tw:items-center tw:gap-2 tw:rounded-full tw:border tw:border-[#d0d5dd] tw:bg-white/[.94] tw:px-[11px] tw:py-[7px] tw:text-[.76rem] tw:font-extrabold tw:text-[#344054] tw:shadow-[0_10px_24px_rgba(23,32,26,0.1)] tw:backdrop-blur-[10px] tw:transition-colors tw:duration-[160ms] tw:max-[920px]:px-[10px_8px_7px_10px]"
        :class="[
          { 'is-active': showStops },
          getCompactToggleThemeClasses(showStops),
        ]"
        :aria-pressed="showStops"
        @click="toggleStops"
      >
        <span>Mostrar pontos</span>
        <span class="compact-switch tw:inline-flex tw:h-[18px] tw:w-[30px] tw:items-center tw:rounded-full tw:bg-[#d0d5dd] tw:p-0.5 tw:transition-colors tw:duration-[160ms]" :class="showStops ? (themeMode === 'dark' ? 'tw:bg-[#2dd4bf]!' : 'tw:bg-[#0d9488]!') : (themeMode === 'dark' ? 'tw:bg-[#28514d]!' : 'tw:bg-[#d0d5dd]!')" aria-hidden="true">
          <span class="tw:size-3.5 tw:rounded-full tw:bg-white tw:shadow-[0_1px_3px_rgba(16,24,40,0.22)] tw:transition-transform tw:duration-[160ms]" :class="showStops ? 'tw:translate-x-3' : ''"></span>
        </span>
      </button>
      <button
        type="button"
        class="map-compact-toggle map-theme-toggle tw:hidden tw:items-center tw:gap-2 tw:rounded-full tw:border tw:border-[#d0d5dd] tw:bg-white/[.94] tw:px-[11px] tw:py-[7px] tw:text-[.76rem] tw:font-extrabold tw:text-[#344054] tw:shadow-[0_10px_24px_rgba(23,32,26,0.1)] tw:backdrop-blur-[10px] tw:transition-colors tw:duration-[160ms] tw:max-[920px]:inline-flex tw:max-[920px]:px-[10px_8px_7px_10px]"
        :class="[
          { 'is-active': themeMode === 'dark' },
          getCompactToggleThemeClasses(themeMode === 'dark'),
        ]"
        :aria-pressed="themeMode === 'dark'"
        @click="emit('toggleTheme')"
      >
        <span>Modo escuro</span>
        <span class="compact-switch tw:inline-flex tw:h-[18px] tw:w-[30px] tw:items-center tw:rounded-full tw:bg-[#d0d5dd] tw:p-0.5 tw:transition-colors tw:duration-[160ms]" :class="themeMode === 'dark' ? 'tw:bg-[#2dd4bf]!' : 'tw:bg-[#d0d5dd]!'" aria-hidden="true">
          <span class="tw:size-3.5 tw:rounded-full tw:bg-white tw:shadow-[0_1px_3px_rgba(16,24,40,0.22)] tw:transition-transform tw:duration-[160ms]" :class="themeMode === 'dark' ? 'tw:translate-x-3' : ''"></span>
        </span>
      </button>
    </div>

    <p
      v-if="currentZoom < MOBILIBUS_STOPS_MIN_ZOOM"
      class="mobilibus-map-message tw:absolute tw:bottom-[18px] tw:left-[18px] tw:z-[700] tw:m-0 tw:max-w-[min(420px,calc(100%-36px))] tw:rounded-[10px] tw:border tw:border-[#d0d5dd] tw:bg-white/[.95] tw:px-3 tw:py-2.5 tw:text-[.82rem] tw:font-bold tw:leading-[1.4] tw:text-[#344054] tw:shadow-[0_10px_24px_rgba(23,32,26,0.12)] tw:backdrop-blur-[8px] tw:dark:border-[#28514d] tw:dark:bg-[rgba(15,36,35,0.95)] tw:dark:text-[#c7d7d4]"
      role="status"
    >
      Aproxime o mapa para carregar os pontos Mobilibus.
    </p>
    <p
      v-else-if="status === 'loading' && stops.length === 0"
      class="mobilibus-map-message tw:absolute tw:bottom-[18px] tw:left-[18px] tw:z-[700] tw:m-0 tw:max-w-[min(420px,calc(100%-36px))] tw:rounded-[10px] tw:border tw:border-[#d0d5dd] tw:bg-white/[.95] tw:px-3 tw:py-2.5 tw:text-[.82rem] tw:font-bold tw:leading-[1.4] tw:text-[#344054] tw:shadow-[0_10px_24px_rgba(23,32,26,0.12)] tw:backdrop-blur-[8px] tw:dark:border-[#28514d] tw:dark:bg-[rgba(15,36,35,0.95)] tw:dark:text-[#c7d7d4]"
      role="status"
      aria-live="polite"
    >
      Carregando pontos Mobilibus...
    </p>
    <p
      v-else-if="status === 'empty'"
      class="mobilibus-map-message tw:absolute tw:bottom-[18px] tw:left-[18px] tw:z-[700] tw:m-0 tw:max-w-[min(420px,calc(100%-36px))] tw:rounded-[10px] tw:border tw:border-[#d0d5dd] tw:bg-white/[.95] tw:px-3 tw:py-2.5 tw:text-[.82rem] tw:font-bold tw:leading-[1.4] tw:text-[#344054] tw:shadow-[0_10px_24px_rgba(23,32,26,0.12)] tw:backdrop-blur-[8px] tw:dark:border-[#28514d] tw:dark:bg-[rgba(15,36,35,0.95)] tw:dark:text-[#c7d7d4]"
      role="status"
    >
      Nenhum ponto Mobilibus foi encontrado nesta área.
    </p>
    <div
      v-else-if="status === 'error'"
      class="mobilibus-map-message mobilibus-map-message--error tw:absolute tw:bottom-[18px] tw:left-[18px] tw:z-[700] tw:m-0 tw:flex tw:max-w-[min(420px,calc(100%-36px))] tw:items-center tw:gap-3 tw:rounded-[10px] tw:border tw:border-[#fda29b] tw:bg-[rgba(255,245,245,0.96)] tw:px-3 tw:py-2.5 tw:text-[0.82rem] tw:font-bold tw:leading-[1.4] tw:text-[#b42318] tw:shadow-[0_10px_24px_rgba(23,32,26,0.12)] tw:backdrop-blur-[8px] tw:dark:border-[#7f1d1d] tw:dark:bg-[rgba(59,23,23,0.96)] tw:dark:text-[#fecaca] tw:max-[920px]:items-stretch tw:max-[920px]:flex-col"
      role="alert"
    >
      <span>{{ error ?? 'Não foi possível carregar os pontos Mobilibus.' }}</span>
      <button type="button" class="primary tw:shrink-0 tw:border-bh-primary tw:bg-bh-primary tw:px-2.5 tw:py-2 tw:text-[.76rem] tw:text-white tw:dark:border-[#2dd4bf] tw:dark:bg-[#2dd4bf] tw:dark:text-[#082f2b]" @click="emit('retry')">
        Tentar novamente
      </button>
    </div>
    <p
      v-else-if="stops.length > 0"
      class="mobilibus-map-count tw:absolute tw:right-[18px] tw:top-[18px] tw:bottom-auto tw:left-auto tw:z-[700] tw:m-0 tw:rounded-[10px] tw:border tw:border-[#d0d5dd] tw:bg-white/[.95] tw:px-3 tw:py-2.5 tw:text-[.82rem] tw:font-bold tw:text-bh-primary-hover tw:shadow-[0_10px_24px_rgba(23,32,26,0.12)] tw:backdrop-blur-[8px] tw:dark:border-[#28514d] tw:dark:bg-[rgba(15,36,35,0.95)] tw:dark:text-[#c7d7d4]"
      role="status"
      aria-live="polite"
    >
      {{ stops.length }} {{ stops.length === 1 ? 'ponto visível' : 'pontos visíveis' }}
    </p>
  </section>
</template>

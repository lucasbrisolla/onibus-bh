import { reactive } from 'vue';
import type { FavoriteStop, NearbyStop, StopIdentity } from '../domain/types';

/**
 * Mantém distintos os identificadores SIU: `code` é o `cod` usado nas
 * previsões, enquanto `publicCode` é o `siu` apresentado ao usuário.
 */
export type SelectableStop = NearbyStop | FavoriteStop;

export interface StopSelectionState {
  nearbyStops: NearbyStop[];
  favoriteStops: FavoriteStop[];
  searchQuery: string;
  monitoredStop: SelectableStop | null;
  searchResults: SelectableStop[];
}

export interface FavoriteStopStore {
  load: () => FavoriteStop[];
  save: (favorites: FavoriteStop[]) => void;
}

export interface StopSelectionEffects {
  onStopSelected: (stop: StopIdentity) => void;
}

export interface StopSelectionDependencies {
  initialNearbyStops: NearbyStop[];
  initialSelectedStopCode: string;
  favorites: FavoriteStopStore;
  effects: StopSelectionEffects;
}

export interface StopSelection {
  state: StopSelectionState;
  setNearbyStops(stops: NearbyStop[]): void;
  syncSelectedStopCode(stopCode: string): void;
  updateSearch(query: string): void;
  selectStop(stop: SelectableStop): void;
  toggleFavorite(): void;
  removeFavorite(stopCode: string): void;
}

function cloneStop<T extends SelectableStop>(stop: T): T {
  return { ...stop };
}

function normalizeCode(value: string): string {
  return value.trim();
}

function normalizeSearchText(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLocaleLowerCase('pt-BR');
}

function distinctStops(stops: SelectableStop[]): SelectableStop[] {
  const seenCodes = new Set<string>();

  return stops.filter(stop => {
    const code = normalizeCode(stop.code);
    if (!code || seenCodes.has(code)) {
      return false;
    }

    seenCodes.add(code);
    return true;
  });
}

export function createStopSelection(
  dependencies: StopSelectionDependencies,
): StopSelection {
  let selectedStopCode = normalizeCode(dependencies.initialSelectedStopCode);
  let selectedStopSnapshot: SelectableStop | null = null;

  let loadedFavorites: FavoriteStop[] = [];
  try {
    loadedFavorites = dependencies.favorites.load();
  } catch {
    loadedFavorites = [];
  }

  const state = reactive<StopSelectionState>({
    nearbyStops: [],
    favoriteStops: loadedFavorites.map(cloneStop),
    searchQuery: '',
    monitoredStop: null,
    searchResults: [],
  });

  function findNearbyStop(code: string): NearbyStop | null {
    return state.nearbyStops.find(stop => normalizeCode(stop.code) === code) ?? null;
  }

  function findFavoriteStop(code: string): FavoriteStop | null {
    return state.favoriteStops.find(stop => normalizeCode(stop.code) === code) ?? null;
  }

  function resolveMonitoredStop(): SelectableStop | null {
    if (!selectedStopCode) {
      return null;
    }

    const nearbyStop = findNearbyStop(selectedStopCode);
    if (nearbyStop) {
      return cloneStop(nearbyStop);
    }

    if (selectedStopSnapshot && normalizeCode(selectedStopSnapshot.code) === selectedStopCode) {
      return cloneStop(selectedStopSnapshot);
    }

    const favoriteStop = findFavoriteStop(selectedStopCode);
    return favoriteStop ? cloneStop(favoriteStop) : null;
  }

  function availableStops(): SelectableStop[] {
    return distinctStops([
      ...state.nearbyStops,
      ...(selectedStopSnapshot ? [selectedStopSnapshot] : []),
      ...state.favoriteStops,
    ]).map(cloneStop);
  }

  function refreshDerivedState(): void {
    state.monitoredStop = resolveMonitoredStop();

    const query = normalizeSearchText(state.searchQuery.trim());
    state.searchResults = query
      ? availableStops()
          .filter(stop =>
            [stop.description, stop.code, stop.publicCode]
              .map(normalizeSearchText)
              .some(value => value.includes(query)),
          )
          .slice(0, 6)
      : [];
  }

  function updateSnapshotFromAvailableStops(): void {
    if (!selectedStopCode) {
      selectedStopSnapshot = null;
      return;
    }

    const nearbyStop = findNearbyStop(selectedStopCode);
    if (nearbyStop) {
      selectedStopSnapshot = cloneStop(nearbyStop);
      return;
    }

    if (selectedStopSnapshot && normalizeCode(selectedStopSnapshot.code) === selectedStopCode) {
      return;
    }

    const favoriteStop = findFavoriteStop(selectedStopCode);
    selectedStopSnapshot = favoriteStop ? cloneStop(favoriteStop) : null;
  }

  function setNearbyStops(stops: NearbyStop[]): void {
    state.nearbyStops = stops.map(cloneStop);
    updateSnapshotFromAvailableStops();
    refreshDerivedState();
  }

  function syncSelectedStopCode(stopCode: string): void {
    selectedStopCode = normalizeCode(stopCode);
    updateSnapshotFromAvailableStops();
    refreshDerivedState();
  }

  function updateSearch(query: string): void {
    state.searchQuery = query;
    refreshDerivedState();
  }

  function selectStop(stop: SelectableStop): void {
    const code = normalizeCode(stop.code);
    if (!code) {
      return;
    }

    const publicCode = normalizeCode(stop.publicCode) || code;
    selectedStopCode = code;
    selectedStopSnapshot = cloneStop({ ...stop, code, publicCode });
    state.searchQuery = '';
    refreshDerivedState();
    dependencies.effects.onStopSelected({ code, publicCode });
  }

  function persistFavorites(): void {
    try {
      dependencies.favorites.save(state.favoriteStops.map(cloneStop));
    } catch {
      // A storage adapter may be unavailable; the in-memory state remains usable.
    }
  }

  function toggleFavorite(): void {
    const monitoredStop = state.monitoredStop;
    if (!monitoredStop) {
      return;
    }

    const monitoredCode = normalizeCode(monitoredStop.code);
    const isFavorite = state.favoriteStops.some(
      favorite => normalizeCode(favorite.code) === monitoredCode,
    );

    state.favoriteStops = isFavorite
      ? state.favoriteStops.filter(favorite => normalizeCode(favorite.code) !== monitoredCode)
      : [cloneStop(monitoredStop), ...state.favoriteStops];
    refreshDerivedState();
    persistFavorites();
  }

  function removeFavorite(stopCode: string): void {
    const normalizedCode = normalizeCode(stopCode);
    const nextFavorites = state.favoriteStops.filter(
      favorite => normalizeCode(favorite.code) !== normalizedCode,
    );

    if (nextFavorites.length === state.favoriteStops.length) {
      return;
    }

    state.favoriteStops = nextFavorites;
    refreshDerivedState();
    persistFavorites();
  }

  setNearbyStops(dependencies.initialNearbyStops);

  return {
    state,
    setNearbyStops,
    syncSelectedStopCode,
    updateSearch,
    selectStop,
    toggleFavorite,
    removeFavorite,
  };
}

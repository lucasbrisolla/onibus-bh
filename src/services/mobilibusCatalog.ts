import { reactive } from 'vue';

import {
  OTIMO_RMBH_PROJECT_ID,
  type MobilibusDeparturesStatus,
  type MobilibusMapTile,
  type MobilibusStop,
  type MobilibusStopDepartures,
  type MobilibusStopsStatus,
} from '../domain/mobilibusTypes';

export interface MobilibusCatalogState {
  stops: MobilibusStop[];
  stopsStatus: MobilibusStopsStatus;
  stopsError: string | null;
  selectedStop: MobilibusStop | null;
  departuresStatus: MobilibusDeparturesStatus;
  departures: MobilibusStopDepartures | null;
  departuresError: string | null;
  favoriteStops: MobilibusStop[];
  isSelectedStopFavorite: boolean;
}

export type MobilibusStopsFetcher = (
  projectId: number,
  tile: MobilibusMapTile,
) => Promise<MobilibusStop[]>;

export type MobilibusDeparturesFetcher = (
  stop: MobilibusStop,
) => Promise<MobilibusStopDepartures>;

export interface MobilibusFavoriteStore {
  load(): MobilibusStop[];
  save(favorites: MobilibusStop[]): void;
}

export interface MobilibusCatalogOptions {
  fetchStops: MobilibusStopsFetcher;
  fetchDepartures: MobilibusDeparturesFetcher;
  favorites?: MobilibusFavoriteStore;
  projectId?: number;
}

export interface MobilibusCatalog {
  readonly state: MobilibusCatalogState;
  loadVisibleTiles(tiles: MobilibusMapTile[]): Promise<void>;
  retryVisibleTiles(): Promise<void>;
  selectStop(stop: MobilibusStop): Promise<void>;
  retryDepartures(): Promise<void>;
  toggleSelectedStopFavorite(): void;
  removeFavoriteStop(stop: MobilibusStop): void;
  openFavoriteStop(stop: MobilibusStop): Promise<void>;
  dispose(): void;
}

function tileKey(tile: MobilibusMapTile): string {
  return `${tile.x},${tile.y},${tile.zoom}`;
}

function describeError(error: unknown): string {
  return error instanceof Error && error.message
    ? error.message
    : 'Não foi possível carregar os pontos Mobilibus.';
}

function describeDeparturesError(error: unknown): string {
  return error instanceof Error && error.message
    ? error.message
    : 'Não foi possível consultar os ônibus deste ponto.';
}

function stopKey(stop: MobilibusStop): string {
  return `${stop.projectId}:${stop.stopId}`;
}

export function createMobilibusCatalog(options: MobilibusCatalogOptions): MobilibusCatalog {
  const state = reactive<MobilibusCatalogState>({
    stops: [],
    stopsStatus: 'initial',
    stopsError: null,
    selectedStop: null,
    departuresStatus: 'initial',
    departures: null,
    departuresError: null,
    favoriteStops: [...(options.favorites?.load() ?? [])],
    isSelectedStopFavorite: false,
  });
  const projectId = options.projectId ?? OTIMO_RMBH_PROJECT_ID;
  const stopsByTile = new Map<string, MobilibusStop[]>();
  const pendingTileRequests = new Map<string, Promise<MobilibusStop[]>>();
  let visibleTiles: MobilibusMapTile[] = [];
  let requestVersion = 0;
  let departuresRequestVersion = 0;
  let disposed = false;

  function syncSelectedFavorite(): void {
    const selectedStop = state.selectedStop;
    state.isSelectedStopFavorite =
      selectedStop !== null &&
      state.favoriteStops.some(favorite => stopKey(favorite) === stopKey(selectedStop));
  }

  function rebuildStops(tiles: MobilibusMapTile[]): void {
    const stopsById = new Map<number, MobilibusStop>();

    for (const tile of tiles) {
      for (const stop of stopsByTile.get(tileKey(tile)) ?? []) {
        stopsById.set(stop.stopId, stop);
      }
    }

    state.stops = [...stopsById.values()];
  }

  function requestTile(tile: MobilibusMapTile): Promise<MobilibusStop[]> {
    const key = tileKey(tile);
    const pending = pendingTileRequests.get(key);
    if (pending) {
      return pending;
    }

    const request = Promise.resolve()
      .then(() => options.fetchStops(projectId, tile))
      .finally(() => {
        if (pendingTileRequests.get(key) === request) {
          pendingTileRequests.delete(key);
        }
      });
    pendingTileRequests.set(key, request);
    return request;
  }

  async function loadVisibleTiles(tiles: MobilibusMapTile[]): Promise<void> {
    if (disposed) {
      return;
    }

    const uniqueTiles = [...new Map(tiles.map(tile => [tileKey(tile), tile])).values()];
    visibleTiles = uniqueTiles;

    if (uniqueTiles.length === 0) {
      requestVersion += 1;
      state.stops = [];
      state.stopsError = null;
      state.stopsStatus = 'initial';
      return;
    }

    const currentRequestVersion = ++requestVersion;
    const pendingTiles = uniqueTiles.filter(tile => !stopsByTile.has(tileKey(tile)));
    state.stopsError = null;
    rebuildStops(uniqueTiles);

    if (pendingTiles.length === 0) {
      state.stopsStatus = state.stops.length > 0 ? 'content' : 'empty';
      return;
    }

    state.stopsStatus = 'loading';
    const results = await Promise.allSettled(pendingTiles.map(requestTile));

    if (disposed || currentRequestVersion !== requestVersion) {
      return;
    }

    let firstError: unknown = null;
    for (const [index, result] of results.entries()) {
      if (result.status === 'fulfilled') {
        stopsByTile.set(tileKey(pendingTiles[index]), result.value);
      } else if (firstError === null) {
        firstError = result.reason;
      }
    }

    rebuildStops(uniqueTiles);

    if (firstError !== null) {
      state.stopsError = describeError(firstError);
      state.stopsStatus = 'error';
      return;
    }

    state.stopsStatus = state.stops.length > 0 ? 'content' : 'empty';
  }

  async function retryVisibleTiles(): Promise<void> {
    if (disposed || visibleTiles.length === 0) {
      return;
    }

    for (const tile of visibleTiles) {
      stopsByTile.delete(tileKey(tile));
    }

    await loadVisibleTiles(visibleTiles);
  }

  async function loadDepartures(stop: MobilibusStop, clearPrevious: boolean): Promise<void> {
    if (disposed) {
      return;
    }

    const currentRequestVersion = ++departuresRequestVersion;
    state.departuresError = null;
    state.departuresStatus = 'loading';
    if (clearPrevious) {
      state.departures = null;
    }

    try {
      const departures = await options.fetchDepartures(stop);
      if (
        disposed ||
        currentRequestVersion !== departuresRequestVersion ||
        state.selectedStop === null ||
        stopKey(state.selectedStop) !== stopKey(stop)
      ) {
        return;
      }

      state.departures = departures;
      state.departuresStatus = departures.departures.length > 0 ? 'content' : 'empty';
    } catch (error) {
      if (
        disposed ||
        currentRequestVersion !== departuresRequestVersion ||
        state.selectedStop === null ||
        stopKey(state.selectedStop) !== stopKey(stop)
      ) {
        return;
      }

      state.departures = null;
      state.departuresError = describeDeparturesError(error);
      state.departuresStatus = 'error';
    }
  }

  function selectStop(stop: MobilibusStop): Promise<void> {
    if (disposed) {
      return Promise.resolve();
    }

    state.selectedStop = stop;
    syncSelectedFavorite();
    return loadDepartures(stop, true);
  }

  function retryDepartures(): Promise<void> {
    const selectedStop = state.selectedStop;
    if (!selectedStop || disposed) {
      return Promise.resolve();
    }

    return loadDepartures(selectedStop, false);
  }

  function toggleSelectedStopFavorite(): void {
    const selectedStop = state.selectedStop;
    if (!selectedStop || disposed) {
      return;
    }

    const selectedKey = stopKey(selectedStop);
    state.favoriteStops = state.isSelectedStopFavorite
      ? state.favoriteStops.filter(favorite => stopKey(favorite) !== selectedKey)
      : [selectedStop, ...state.favoriteStops];
    syncSelectedFavorite();
    options.favorites?.save([...state.favoriteStops]);
  }

  function removeFavoriteStop(stop: MobilibusStop): void {
    if (disposed) {
      return;
    }

    const selectedKey = stopKey(stop);
    state.favoriteStops = state.favoriteStops.filter(favorite => stopKey(favorite) !== selectedKey);
    syncSelectedFavorite();
    options.favorites?.save([...state.favoriteStops]);
  }

  function openFavoriteStop(stop: MobilibusStop): Promise<void> {
    return selectStop(stop);
  }

  function dispose(): void {
    disposed = true;
    requestVersion += 1;
    departuresRequestVersion += 1;
    pendingTileRequests.clear();
  }

  return {
    state,
    loadVisibleTiles,
    retryVisibleTiles,
    selectStop,
    retryDepartures,
    toggleSelectedStopFavorite,
    removeFavoriteStop,
    openFavoriteStop,
    dispose,
  };
}

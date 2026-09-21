import { describe, expect, it, vi } from 'vitest';

import type {
  MobilibusMapTile,
  MobilibusStop,
  MobilibusStopDepartures,
} from '../domain/mobilibusTypes';
import { createMobilibusCatalog } from './mobilibusCatalog';

const firstTile: MobilibusMapTile = { x: 1547, y: 2279, zoom: 14 };
const secondTile: MobilibusMapTile = { x: 1548, y: 2279, zoom: 14 };

const firstStop: MobilibusStop = {
  projectId: 501,
  stopId: 15192689,
  latitude: -19.93193292,
  longitude: -43.93043518,
  name: 'Av. Afonso Pena, 2323 - Parada DEOESP',
  code: null,
  address: 'Avenida Afonso Pena 2328',
  bearing: 340,
};

const secondStop: MobilibusStop = {
  ...firstStop,
  stopId: 15192690,
  name: 'Av. Afonso Pena, 2324',
};

const firstDepartures: MobilibusStopDepartures = {
  projectId: 501,
  stopId: firstStop.stopId,
  stopName: firstStop.name,
  referenceTime: 1787529945917,
  departures: [],
};

const secondDepartures: MobilibusStopDepartures = {
  ...firstDepartures,
  stopId: secondStop.stopId,
  stopName: secondStop.name,
};

const defaultFetchDepartures = async (stop: MobilibusStop): Promise<MobilibusStopDepartures> => ({
  ...firstDepartures,
  stopId: stop.stopId,
  stopName: stop.name,
});

function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (reason?: unknown) => void;
  const promise = new Promise<T>((promiseResolve, promiseReject) => {
    resolve = promiseResolve;
    reject = promiseReject;
  });

  return { promise, resolve, reject };
}

describe('createMobilibusCatalog', () => {
  it('carrega tiles visíveis, deduplica pontos e reutiliza o cache', async () => {
    const fetchStops = vi.fn(async (_projectId: number, tile: MobilibusMapTile) =>
      tile.x === firstTile.x ? [firstStop] : [firstStop, secondStop],
    );
    const catalog = createMobilibusCatalog({ fetchStops, fetchDepartures: defaultFetchDepartures });

    await catalog.loadVisibleTiles([firstTile, firstTile, secondTile]);

    expect(fetchStops).toHaveBeenCalledTimes(2);
    expect(catalog.state.stops).toEqual([firstStop, secondStop]);
    expect(catalog.state.stopsStatus).toBe('content');

    await catalog.loadVisibleTiles([firstTile]);

    expect(fetchStops).toHaveBeenCalledTimes(2);
    expect(catalog.state.stops).toEqual([firstStop]);
    expect(catalog.state.stopsStatus).toBe('content');
  });

  it('descarta a resposta de uma área anterior quando uma área mais nova termina depois', async () => {
    const firstRequest = deferred<MobilibusStop[]>();
    const secondRequest = deferred<MobilibusStop[]>();
    const fetchStops = vi.fn((_projectId: number, tile: MobilibusMapTile) =>
      tile.x === firstTile.x ? firstRequest.promise : secondRequest.promise,
    );
    const catalog = createMobilibusCatalog({ fetchStops, fetchDepartures: defaultFetchDepartures });

    const firstLoad = catalog.loadVisibleTiles([firstTile]);
    const secondLoad = catalog.loadVisibleTiles([secondTile]);
    secondRequest.resolve([secondStop]);
    await secondLoad;

    expect(catalog.state.stops).toEqual([secondStop]);

    firstRequest.resolve([firstStop]);
    await firstLoad;

    expect(catalog.state.stops).toEqual([secondStop]);
    expect(catalog.state.stopsStatus).toBe('content');
  });

  it('expõe erro traduzido e permite repetir a área visível', async () => {
    const fetchStops = vi
      .fn<(_projectId: number, _tile: MobilibusMapTile) => Promise<MobilibusStop[]>>()
      .mockRejectedValueOnce(new Error('Pontos indisponíveis'))
      .mockResolvedValueOnce([firstStop]);
    const catalog = createMobilibusCatalog({ fetchStops, fetchDepartures: defaultFetchDepartures });

    await catalog.loadVisibleTiles([firstTile]);

    expect(catalog.state.stopsStatus).toBe('error');
    expect(catalog.state.stopsError).toBe('Pontos indisponíveis');

    await catalog.retryVisibleTiles();

    expect(catalog.state.stopsStatus).toBe('content');
    expect(catalog.state.stopsError).toBeNull();
    expect(catalog.state.stops).toEqual([firstStop]);
  });

  it('mantém os estados vazio e seleção do ponto atrás da interface', async () => {
    const catalog = createMobilibusCatalog({
      fetchStops: vi.fn(async () => []),
      fetchDepartures: defaultFetchDepartures,
    });

    await catalog.loadVisibleTiles([firstTile]);
    expect(catalog.state.stopsStatus).toBe('empty');

    catalog.selectStop(firstStop);
    expect(catalog.state.selectedStop).toEqual(firstStop);
  });

  it('consulta partidas ao selecionar, descarta respostas antigas e permite retry', async () => {
    const firstRequest = deferred<MobilibusStopDepartures>();
    const secondRequest = deferred<MobilibusStopDepartures>();
    const fetchDepartures = vi.fn((stop: MobilibusStop) =>
      stop.stopId === firstStop.stopId ? firstRequest.promise : secondRequest.promise,
    );
    const catalog = createMobilibusCatalog({
      fetchStops: vi.fn(async () => []),
      fetchDepartures,
    });

    const firstSelection = catalog.selectStop(firstStop);
    const secondSelection = catalog.selectStop(secondStop);
    expect(catalog.state.departuresStatus).toBe('loading');

    secondRequest.resolve(secondDepartures);
    await secondSelection;
    expect(catalog.state.departures).toEqual(secondDepartures);
    expect(catalog.state.departuresStatus).toBe('empty');

    firstRequest.resolve(firstDepartures);
    await firstSelection;
    expect(catalog.state.departures).toEqual(secondDepartures);

    const retryRequest = deferred<MobilibusStopDepartures>();
    fetchDepartures.mockReturnValueOnce(retryRequest.promise);
    const retry = catalog.retryDepartures();
    expect(catalog.state.departuresStatus).toBe('loading');
    retryRequest.resolve(secondDepartures);
    await retry;
    expect(catalog.state.departuresStatus).toBe('empty');
  });

  it('expõe erro de partidas e persiste favoritos, inclusive fora da área carregada', async () => {
    const fetchDepartures = vi
      .fn<(stop: MobilibusStop) => Promise<MobilibusStopDepartures>>()
      .mockRejectedValueOnce(new Error('Partidas indisponíveis'))
      .mockResolvedValueOnce(secondDepartures);
    const loadFavorites = vi.fn(() => []);
    const saveFavorites = vi.fn();
    const catalog = createMobilibusCatalog({
      fetchStops: vi.fn(async () => []),
      fetchDepartures,
      favorites: { load: loadFavorites, save: saveFavorites },
    });

    const selection = catalog.selectStop(secondStop);
    await selection;
    expect(catalog.state.departuresStatus).toBe('error');
    expect(catalog.state.departuresError).toBe('Partidas indisponíveis');

    await catalog.retryDepartures();
    expect(catalog.state.departuresStatus).toBe('empty');

    catalog.toggleSelectedStopFavorite();
    expect(catalog.state.favoriteStops).toEqual([secondStop]);
    expect(catalog.state.isSelectedStopFavorite).toBe(true);
    expect(saveFavorites).toHaveBeenLastCalledWith([secondStop]);

    catalog.removeFavoriteStop(secondStop);
    expect(catalog.state.favoriteStops).toEqual([]);
    expect(catalog.state.isSelectedStopFavorite).toBe(false);
    expect(loadFavorites).toHaveBeenCalledTimes(1);
  });
});

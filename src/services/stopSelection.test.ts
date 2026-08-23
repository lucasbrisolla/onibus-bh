import { describe, expect, it, vi } from 'vitest';

import type { FavoriteStop, NearbyStop } from '../domain/types';
import { createStopSelection } from './stopSelection';

const nearbyStop: NearbyStop = {
  code: '13566',
  publicCode: '40134',
  latitude: -19.916136,
  longitude: -43.99563,
  description: 'ROD ANEL RODOVIARIO CELSO MELLO AZEVEDO, 11749',
  color: 4,
};

const favoriteOutsideArea: FavoriteStop = {
  code: '99999',
  publicCode: '50001',
  latitude: -19.9,
  longitude: -43.9,
  description: 'RUA TESTE, 123',
  color: 4,
};

function createSelection(
  initialSelectedStopCode = '',
  initialNearbyStops: NearbyStop[] = [],
  initialFavorites: FavoriteStop[] = [favoriteOutsideArea],
  onStopSelected = vi.fn(),
) {
  return createStopSelection({
    initialNearbyStops,
    initialSelectedStopCode,
    favorites: {
      load: () => initialFavorites,
      save: vi.fn(),
    },
    effects: {
      onStopSelected,
    },
  });
}

describe('createStopSelection', () => {
  it('resolve a parada monitorada from nearby, then snapshot, then persisted favorites', () => {
    const selection = createSelection(favoriteOutsideArea.code);

    expect(selection.state.monitoredStop).toEqual(favoriteOutsideArea);

    selection.setNearbyStops([{ ...nearbyStop, code: favoriteOutsideArea.code }]);
    expect(selection.state.monitoredStop).toEqual({
      ...nearbyStop,
      code: favoriteOutsideArea.code,
    });

    selection.setNearbyStops([]);
    expect(selection.state.monitoredStop).toEqual({
      ...nearbyStop,
      code: favoriteOutsideArea.code,
    });
  });

  it('searches address, internal code and public code without mixing their identities', () => {
    const selection = createSelection('', [nearbyStop], []);

    selection.updateSearch('anel');
    expect(selection.state.searchResults).toEqual([nearbyStop]);

    selection.updateSearch(nearbyStop.code);
    expect(selection.state.searchResults).toEqual([nearbyStop]);

    selection.updateSearch(nearbyStop.publicCode);
    expect(selection.state.searchResults).toEqual([nearbyStop]);
  });

  it('clears the search and forwards a stop selection through the external effect adapter', () => {
    const onStopSelected = vi.fn();
    const selection = createSelection('', [nearbyStop], [], onStopSelected);
    selection.updateSearch('40134');

    selection.selectStop(nearbyStop);

    expect(selection.state.searchQuery).toBe('');
    expect(selection.state.monitoredStop).toEqual(nearbyStop);
    expect(onStopSelected).toHaveBeenCalledWith({ code: '13566', publicCode: '40134' });
  });

  it('resolves a stop when the configured internal code changes outside the loaded area', () => {
    const selection = createSelection();

    selection.syncSelectedStopCode(favoriteOutsideArea.code);
    expect(selection.state.monitoredStop).toEqual(favoriteOutsideArea);

    selection.syncSelectedStopCode('');
    expect(selection.state.monitoredStop).toBeNull();
  });

  it('persists favorite changes and keeps an opened stop available after removal', () => {
    const save = vi.fn();
    const selection = createStopSelection({
      initialNearbyStops: [nearbyStop],
      initialSelectedStopCode: '',
      favorites: {
        load: () => [favoriteOutsideArea],
        save,
      },
      effects: { onStopSelected: vi.fn() },
    });

    selection.selectStop(nearbyStop);
    selection.toggleFavorite();
    expect(selection.state.favoriteStops).toEqual([nearbyStop, favoriteOutsideArea]);
    expect(save).toHaveBeenLastCalledWith([nearbyStop, favoriteOutsideArea]);

    selection.toggleFavorite();
    expect(selection.state.favoriteStops).toEqual([favoriteOutsideArea]);

    selection.selectStop(favoriteOutsideArea);
    selection.removeFavorite(favoriteOutsideArea.code);
    expect(selection.state.favoriteStops).toEqual([]);
    expect(selection.state.monitoredStop).toEqual(favoriteOutsideArea);
    expect(save).toHaveBeenLastCalledWith([]);
  });
});

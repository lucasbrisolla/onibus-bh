import { useGeolocation } from '@vueuse/core';
import { onBeforeUnmount, ref, watch, type WatchStopHandle } from 'vue';

export interface CurrentLocation {
  latitude: number;
  longitude: number;
}

export interface CurrentLocationOptions extends PositionOptions {}

function normalizeLocation(
  coords: Pick<GeolocationCoordinates, 'latitude' | 'longitude'>,
): CurrentLocation | null {
  if (!Number.isFinite(coords.latitude) || !Number.isFinite(coords.longitude)) {
    return null;
  }

  return {
    latitude: coords.latitude,
    longitude: coords.longitude,
  };
}

export function useCurrentLocation(options: CurrentLocationOptions = {}) {
  const browserNavigator = typeof navigator === 'undefined' ? undefined : navigator;
  const geolocation = useGeolocation({
    ...options,
    navigator: browserNavigator,
    immediate: false,
  });
  const isRequesting = ref(false);
  let stopCoords: WatchStopHandle | undefined;
  let stopError: WatchStopHandle | undefined;
  let resolveRequest: ((location: CurrentLocation) => void) | undefined;
  let rejectRequest: ((error: unknown) => void) | undefined;

  function cleanup() {
    stopCoords?.();
    stopError?.();
    stopCoords = undefined;
    stopError = undefined;
    geolocation.pause();
    isRequesting.value = false;
  }

  function resolveLocation(location: CurrentLocation) {
    const resolve = resolveRequest;
    resolveRequest = undefined;
    rejectRequest = undefined;
    cleanup();
    resolve?.(location);
  }

  function rejectLocation(error: unknown) {
    const reject = rejectRequest;
    resolveRequest = undefined;
    rejectRequest = undefined;
    cleanup();
    reject?.(error);
  }

  function request(): Promise<CurrentLocation> {
    if (isRequesting.value) {
      return Promise.reject(new Error('Já existe uma solicitação de localização em andamento.'));
    }

    const currentNavigator = typeof navigator === 'undefined' ? undefined : navigator;
    const browserGeolocation = currentNavigator?.geolocation;

    if (!geolocation.isSupported.value || !browserGeolocation) {
      return Promise.reject(new Error('Seu navegador não informou suporte a localização.'));
    }

    isRequesting.value = true;

    return new Promise<CurrentLocation>((resolve, reject) => {
      resolveRequest = resolve;
      rejectRequest = reject;

      const getCurrentPosition = browserGeolocation.getCurrentPosition;
      if (typeof browserGeolocation.watchPosition !== 'function' && typeof getCurrentPosition === 'function') {
        getCurrentPosition.call(
          browserGeolocation,
          position => {
            const location = normalizeLocation(position.coords);
            if (!location) {
              rejectLocation(new Error('A localização retornada pelo navegador é inválida.'));
              return;
            }

            resolveLocation(location);
          },
          error => rejectLocation(error),
          options,
        );
        return;
      }

      stopCoords = watch(
        geolocation.coords,
        coords => {
          const location = normalizeLocation(coords);
          if (location) {
            resolveLocation(location);
          }
        },
      );
      stopError = watch(
        geolocation.error,
        error => {
          if (error) {
            rejectLocation(error);
          }
        },
      );

      try {
        geolocation.resume();
      } catch (error) {
        rejectLocation(error);
      }
    });
  }

  onBeforeUnmount(() => {
    if (isRequesting.value) {
      rejectLocation(new Error('A solicitação de localização foi cancelada.'));
      return;
    }

    cleanup();
  });

  return {
    isSupported: geolocation.isSupported,
    isRequesting,
    request,
  };
}

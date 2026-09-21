import L from 'leaflet';

import { createMapBaseTileLayer, type MapTheme } from './mapBaseLayer';

export interface MapLifecycleOptions {
  element: HTMLElement;
  themeMode: MapTheme;
  mapOptions?: L.MapOptions;
  initialView?: {
    center: L.LatLngTuple;
    zoom: number;
  };
}

export interface MapLifecycle {
  mount(): L.Map;
  getMap(): L.Map | null;
  listen(eventName: string, handler: L.LeafletEventHandlerFn): void;
  setTheme(themeMode: MapTheme): void;
  invalidateSize(): void;
  destroy(): void;
}

interface RegisteredListener {
  eventName: string;
  handler: L.LeafletEventHandlerFn;
}

export function createMapLifecycle(options: MapLifecycleOptions): MapLifecycle {
  let map: L.Map | null = null;
  let baseTileLayer: L.TileLayer | null = null;
  let resizeObserver: ResizeObserver | null = null;
  let resizeFrameId: number | null = null;
  let themeMode = options.themeMode;
  const registeredListeners: RegisteredListener[] = [];

  function scheduleInvalidateSize(): void {
    if (!map || resizeFrameId !== null) {
      return;
    }

    resizeFrameId = window.requestAnimationFrame(() => {
      resizeFrameId = null;

      if (!map) {
        return;
      }

      if (options.element.clientWidth === 0 || options.element.clientHeight === 0) {
        return;
      }

      map.invalidateSize(false);
    });
  }

  function mount(): L.Map {
    if (map) {
      return map;
    }

    const currentMap = L.map(options.element, {
      ...options.mapOptions,
      attributionControl: true,
      zoomControl: false,
    });
    map = currentMap;

    if (options.initialView) {
      currentMap.setView(options.initialView.center, options.initialView.zoom);
    }

    baseTileLayer = createMapBaseTileLayer(themeMode);
    baseTileLayer.addTo(currentMap);
    L.control.zoom({ position: 'bottomright' }).addTo(currentMap);

    if (typeof ResizeObserver !== 'undefined') {
      resizeObserver = new ResizeObserver(scheduleInvalidateSize);
      resizeObserver.observe(options.element);
    }

    window.addEventListener('resize', scheduleInvalidateSize);
    scheduleInvalidateSize();

    return currentMap;
  }

  function getMap(): L.Map | null {
    return map;
  }

  function listen(eventName: string, handler: L.LeafletEventHandlerFn): void {
    if (!map) {
      return;
    }

    map.on(eventName, handler);
    registeredListeners.push({ eventName, handler });
  }

  function setTheme(nextThemeMode: MapTheme): void {
    if (themeMode === nextThemeMode || !map || !baseTileLayer) {
      themeMode = nextThemeMode;
      return;
    }

    themeMode = nextThemeMode;
    map.removeLayer(baseTileLayer);
    baseTileLayer = createMapBaseTileLayer(nextThemeMode);
    baseTileLayer.addTo(map);
  }

  function invalidateSize(): void {
    scheduleInvalidateSize();
  }

  function destroy(): void {
    if (resizeFrameId !== null) {
      window.cancelAnimationFrame(resizeFrameId);
      resizeFrameId = null;
    }

    resizeObserver?.disconnect();
    resizeObserver = null;
    window.removeEventListener('resize', scheduleInvalidateSize);

    if (map) {
      for (const listener of registeredListeners) {
        map.off(listener.eventName, listener.handler);
      }

      map.remove();
    }

    registeredListeners.length = 0;
    baseTileLayer = null;
    map = null;
  }

  return {
    mount,
    getMap,
    listen,
    setTheme,
    invalidateSize,
    destroy,
  };
}

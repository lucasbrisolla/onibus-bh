import L from 'leaflet';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { createMapLifecycle } from './mapLifecycle';

function createMapElement(): HTMLDivElement {
  const element = document.createElement('div');
  Object.defineProperties(element, {
    clientHeight: { configurable: true, value: 480 },
    clientWidth: { configurable: true, value: 640 },
  });
  document.body.append(element);
  return element;
}

describe('createMapLifecycle', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('monta o mapa, troca o tema sem perder a viewport e remove listeners ao desmontar', () => {
    const element = createMapElement();
    const lifecycle = createMapLifecycle({
      element,
      themeMode: 'light',
      initialView: {
        center: [-19.916342, -43.993759],
        zoom: 14,
      },
    });
    const map = lifecycle.mount();
    const moveEnd = vi.fn();

    lifecycle.listen('moveend', moveEnd);
    map.setView([-19.93, -44.01], 15);
    const centerBeforeThemeChange = map.getCenter();
    moveEnd.mockClear();

    lifecycle.setTheme('dark');

    expect(element.classList.contains('leaflet-container')).toBe(true);
    expect(element.querySelector('.map-base-tiles-dark')).not.toBeNull();
    expect(map.getZoom()).toBe(15);
    expect(map.getCenter().lat).toBeCloseTo(centerBeforeThemeChange.lat);
    expect(map.getCenter().lng).toBeCloseTo(centerBeforeThemeChange.lng);

    map.fire('moveend');
    expect(moveEnd).toHaveBeenCalledTimes(1);

    lifecycle.destroy();
    map.fire('moveend');

    expect(moveEnd).toHaveBeenCalledTimes(1);
    expect(lifecycle.getMap()).toBeNull();
    expect(element.querySelector('.leaflet-control-zoom')).toBeNull();
    element.remove();
  });

  it('invalida o tamanho por resize e ResizeObserver, mas para após a desmontagem', () => {
    const element = createMapElement();
    const invalidateSize = vi.spyOn(L.Map.prototype, 'invalidateSize');
    let triggerAnimationFrame: FrameRequestCallback | null = null;
    const requestAnimationFrame = vi.spyOn(window, 'requestAnimationFrame').mockImplementation(callback => {
      triggerAnimationFrame = callback;
      return 1;
    });
    let triggerResizeObserver: (() => void) | null = null;
    const disconnect = vi.fn();

    vi.stubGlobal(
      'ResizeObserver',
      class {
        constructor(callback: ResizeObserverCallback) {
          triggerResizeObserver = () => callback([], {} as ResizeObserver);
        }

        observe() {}

        disconnect() {
          disconnect();
        }
      },
    );

    const lifecycle = createMapLifecycle({ element, themeMode: 'light' });
    lifecycle.mount();
    const runAnimationFrame = () => (triggerAnimationFrame as FrameRequestCallback | null)?.(0);
    const runResizeObserver = () => (triggerResizeObserver as (() => void) | null)?.();

    runAnimationFrame();
    invalidateSize.mockClear();

    window.dispatchEvent(new Event('resize'));
    runAnimationFrame();
    expect(invalidateSize).toHaveBeenCalledWith(false);

    invalidateSize.mockClear();
    runResizeObserver();
    runAnimationFrame();
    expect(invalidateSize).toHaveBeenCalledWith(false);

    lifecycle.destroy();
    expect(disconnect).toHaveBeenCalledTimes(1);
    invalidateSize.mockClear();
    window.dispatchEvent(new Event('resize'));
    runResizeObserver();

    expect(invalidateSize).not.toHaveBeenCalled();
    expect(requestAnimationFrame).toHaveBeenCalled();
    element.remove();
  });
});

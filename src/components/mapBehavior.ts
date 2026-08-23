import {
  createMapScene,
  type MapCoordinate,
  type MapScene,
  type MapSceneInput,
} from './mapScene';
import {
  createMapViewportPolicy,
  type MapViewportCommand,
  type MapViewportPolicy,
} from './mapViewportPolicy';

export type MapBehaviorEvent =
  | {
      type: 'scene-updated';
      input: MapSceneInput;
    }
  | {
      type: 'moveend';
      center: MapCoordinate;
    };

export interface MapBehaviorResult {
  scene: MapScene;
  viewport: MapViewportCommand;
}

export interface MapBehavior {
  dispatch(event: MapBehaviorEvent): MapBehaviorResult;
}

function createViewportSnapshot(input: MapSceneInput, scene: MapScene) {
  return {
    bounds: scene.bounds,
    monitoredStopCode: input.monitoredStop?.code ?? null,
    userLocation: input.userLocation ?? null,
  };
}

export function createMapBehavior(
  viewportPolicy: MapViewportPolicy = createMapViewportPolicy(),
): MapBehavior {
  let currentScene = createMapScene();

  function dispatch(event: MapBehaviorEvent): MapBehaviorResult {
    if (event.type === 'scene-updated') {
      currentScene = createMapScene(event.input);

      return {
        scene: currentScene,
        viewport: viewportPolicy.decide({
          type: 'scene-updated',
          snapshot: createViewportSnapshot(event.input, currentScene),
        }),
      };
    }

    return {
      scene: currentScene,
      viewport: viewportPolicy.decide(event),
    };
  }

  return { dispatch };
}

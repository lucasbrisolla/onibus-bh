export function createMapInteractionOptions() {
  return {
    zoomSnap: 0.25,
    zoomDelta: 0.5,
    bounceAtZoomLimits: false,
  } as const;
}

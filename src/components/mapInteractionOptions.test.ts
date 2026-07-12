import { describe, expect, it } from 'vitest';

import { createMapInteractionOptions } from './mapInteractionOptions';

describe('createMapInteractionOptions', () => {
  it('uses finer zoom steps for touch interactions', () => {
    expect(createMapInteractionOptions()).toMatchObject({
      zoomSnap: 0.25,
      zoomDelta: 0.5,
      bounceAtZoomLimits: false,
    });
  });
});

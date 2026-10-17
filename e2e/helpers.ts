import type { Page } from '@playwright/test';

const TILE_IMAGE = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+/p7sAAAAASUVORK5CYII=',
  'base64',
);

export async function mockMapTiles(page: Page): Promise<void> {
  await page.route(
    /^https:\/\/(?:[a-d]\.)?(?:tile\.openstreetmap\.org|basemaps\.cartocdn\.com)\//,
    route => route.fulfill({ status: 200, contentType: 'image/png', body: TILE_IMAGE }),
  );
}

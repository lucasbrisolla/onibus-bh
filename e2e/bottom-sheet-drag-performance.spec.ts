import { expect, test } from '@playwright/test';

test('desativa efeitos caros enquanto o bottom-sheet acompanha o dedo', async ({ page }) => {
  await page.setViewportSize({ width: 393, height: 852 });
  await page.goto('http://localhost:5173/', { waitUntil: 'domcontentloaded' });

  const sheet = page.locator('.mobile-bottom-sheet');
  await expect(sheet).toBeVisible();
  const box = await sheet.boundingBox();
  expect(box).not.toBeNull();

  const browserSession = await page.context().newCDPSession(page);
  await browserSession.send('Emulation.setCPUThrottlingRate', { rate: 4 });
  await page.evaluate(() => {
    const frames: number[] = [];
    const startedAt = performance.now();
    const collect = (time: number) => {
      frames.push(time);
      if (time < startedAt + 1800) {
        requestAnimationFrame(collect);
      }
    };
    (window as Window & { __bottomSheetFrames?: number[] }).__bottomSheetFrames = frames;
    requestAnimationFrame(collect);
  });
  const x = box!.x + box!.width / 2;
  const startY = box!.y + 18;

  await browserSession.send('Input.dispatchTouchEvent', {
    type: 'touchStart',
    touchPoints: [{ id: 1, x, y: startY }],
  });
  for (let index = 1; index <= 12; index += 1) {
    await browserSession.send('Input.dispatchTouchEvent', {
      type: 'touchMove',
      touchPoints: [{ id: 1, x, y: startY - (120 * index / 12) }],
    });
    await page.waitForTimeout(16);
  }

  await expect.poll(async () => sheet.evaluate(element => getComputedStyle(element).transitionProperty)).toBe('none');
  const draggingStyles = await sheet.evaluate(element => {
    const styles = getComputedStyle(element);
    return {
      backdropFilter: styles.backdropFilter,
      boxShadow: styles.boxShadow,
      transitionProperty: styles.transitionProperty,
    };
  });

  expect(draggingStyles.backdropFilter).toBe('none');
  expect(draggingStyles.boxShadow).toMatch(/none|rgba\(0, 0, 0, 0\)/);
  expect(draggingStyles.transitionProperty).toBe('none');

  await browserSession.send('Input.dispatchTouchEvent', {
    type: 'touchEnd',
    touchPoints: [],
  });
  await expect(sheet).toHaveClass(/is-full/);
  await expect(sheet).not.toHaveClass(/is-dragging/);
  await page.waitForTimeout(400);

  const frameMetrics = await page.evaluate(() => {
    const frames = (window as Window & { __bottomSheetFrames?: number[] }).__bottomSheetFrames ?? [];
    const gaps = frames.slice(1).map((time, index) => time - frames[index]);
    return {
      maxFrameGap: Math.max(...gaps),
      framesOver32ms: gaps.filter(gap => gap > 32).length,
    };
  });
  console.log(JSON.stringify({ afterFix: frameMetrics }));
});

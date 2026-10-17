import AxeBuilder from '@axe-core/playwright';
import { expect, test, type Page } from '@playwright/test';
import { mockMapTiles } from './helpers';

const settings = {
  stopCode: '13566',
  lineCode: '8350',
  variantFilter: 'qualquer',
  minutesBefore: 7,
  enabled: false,
  lastNotifiedPredictionId: null,
};

const prediction = {
  id: '8350-direto-4',
  lineCode: '8350',
  description: 'Estacao Barreiro / Estacao Sao Gabriel',
  destination: 'Estacao Sao Gabriel',
  minutes: 4,
  queryTime: null,
  serviceId: '53564',
  vehicleId: '40743',
  color: null,
  accessibilityCode: null,
  variant: 'direto',
};

const secondPrediction = {
  ...prediction,
  id: '8151-direto-17',
  lineCode: '8151',
  minutes: 17,
  serviceId: '53565',
  vehicleId: '40744',
};

const routePoints = [
  { latitude: -19.916136, longitude: -43.99563 },
  { latitude: -19.9152, longitude: -43.9948 },
  { latitude: -19.914713, longitude: -43.993678 },
];

const vehicles = [
  {
    latitude: -19.9154,
    longitude: -43.9949,
    color: null,
    lineCode: '8350',
    vehicleId: '40743',
    bearing: 45,
  },
];

const sections = [
  { id: 'mapa', label: 'Mapa' },
  { id: 'alerta', label: 'Alerta' },
  { id: 'otimo', label: 'Ótimo' },
  { id: 'favoritos', label: 'Favoritos' },
  { id: 'historico', label: 'Histórico' },
  { id: 'configuracoes', label: 'Configurações' },
] as const;

const themes = ['light', 'dark'] as const;
const mobileViewport = { width: 393, height: 852 };

async function prepareDesignFixture(
  page: Page,
  theme: (typeof themes)[number],
  viewport: 'desktop' | 'mobile' = 'desktop',
): Promise<void> {
  await page.setViewportSize(viewport === 'mobile' ? mobileViewport : { width: 1440, height: 900 });
  await page.addInitScript(
    ({ themeMode, alertSettings }) => {
      localStorage.setItem('onibus-bh-theme', themeMode);
      localStorage.setItem('onibus-bh-alert-settings', JSON.stringify(alertSettings));
    },
    { themeMode: theme, alertSettings: settings },
  );
  await mockMapTiles(page);
  await page.route('**/api/**', async route => {
    const pathname = new URL(route.request().url()).pathname;
    let body: unknown = {};

    if (pathname === '/api/paradas/13566/previsoes') body = { predictions: [prediction, secondPrediction] };
    else if (pathname === '/api/itinerarios/53564') body = { route: routePoints };
    else if (pathname === '/api/itinerarios/53564/veiculos') body = { vehicles };
    else if (pathname.includes('/mobilibus/projetos/501/pontos')) body = { stops: [] };

    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(body),
    });
  });
  await page.goto('/');
}

function parseCssColor(value: string): [number, number, number, number] {
  const channels = value.match(/[\d.]+/g)?.map(Number);
  if (!channels || channels.length < 3) throw new Error(`Cor CSS não reconhecida: ${value}`);
  return [channels[0], channels[1], channels[2], channels[3] ?? 1];
}

function composite(
  foreground: [number, number, number, number],
  background: [number, number, number, number],
): [number, number, number, number] {
  const alpha = foreground[3] + background[3] * (1 - foreground[3]);
  return [
    (foreground[0] * foreground[3] + background[0] * background[3] * (1 - foreground[3])) / alpha,
    (foreground[1] * foreground[3] + background[1] * background[3] * (1 - foreground[3])) / alpha,
    (foreground[2] * foreground[3] + background[2] * background[3] * (1 - foreground[3])) / alpha,
    alpha,
  ];
}

function luminance(color: [number, number, number, number]): number {
  const linear = color.slice(0, 3).map(channel => {
    const normalized = channel / 255;
    return normalized <= 0.04045
      ? normalized / 12.92
      : ((normalized + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * linear[0] + 0.7152 * linear[1] + 0.0722 * linear[2];
}

function contrastRatio(
  first: [number, number, number, number],
  second: [number, number, number, number],
): number {
  const [lighter, darker] = [luminance(first), luminance(second)].sort((a, b) => b - a);
  return (lighter + 0.05) / (darker + 0.05);
}

async function expandMobileSheet(page: Page, selector: string): Promise<void> {
  const sheet = page.locator(selector);
  await expect(sheet).toBeVisible();
  if (await sheet.evaluate(element => element.classList.contains('is-full'))) return;

  const box = await sheet.boundingBox();
  if (!box) throw new Error(`Painel mobile sem área renderizada: ${selector}`);

  const browserSession = await page.context().newCDPSession(page);
  const x = box.x + box.width / 2;
  const startY = box.y + 18;
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
  await browserSession.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
  await expect(sheet).toHaveClass(/is-full/);
  await expect(sheet).not.toHaveClass(/is-settling/);
}

async function navigateMobileSection(
  page: Page,
  section: (typeof sections)[number],
): Promise<void> {
  const navigation = page.getByRole('navigation', { name: 'Navegação inferior' });
  const moreSections = ['otimo', 'historico', 'configuracoes'];

  if (moreSections.includes(section.id)) {
    await navigation.getByRole('button', { name: 'Mais' }).click();
    await navigation
      .getByRole('group', { name: 'Mais opções' })
      .getByRole('button', { name: section.label })
      .click();
    await expect(navigation.getByRole('button', { name: 'Mais' })).toHaveAttribute(
      'aria-current',
      'page',
    );
  } else {
    const item = navigation.getByRole('button', { name: section.label });
    await item.click();
    await expect(item).toHaveAttribute('aria-current', 'page');
  }
}

async function expectPredictionIconContrast(
  page: Page,
  theme: (typeof themes)[number],
): Promise<void> {
  const badges = page.locator('[data-contrast-check="non-text"]:visible');
  await expect(badges).toHaveCount(2);

  const renderedIcons = await badges.evaluateAll(elements => elements.map(element => {
    const svg = element.querySelector('svg');
    if (!svg) throw new Error('Badge de ônibus sem ícone SVG.');
    const badgeStyle = getComputedStyle(element);
    const iconStyle = getComputedStyle(svg);
    const card = element.closest('.prediction-card');
    const opacityChain: number[] = [];
    let ancestor: Element | null = svg;
    while (ancestor) {
      opacityChain.push(Number(getComputedStyle(ancestor).opacity));
      if (ancestor.classList.contains('app-theme')) break;
      ancestor = ancestor.parentElement;
    }
    return {
      isNext: card?.classList.contains('is-next') ?? false,
      background: badgeStyle.backgroundColor,
      foreground: iconStyle.stroke === 'none'
        ? iconStyle.fill
        : iconStyle.stroke.toLowerCase() === 'currentcolor'
          ? iconStyle.color
          : iconStyle.stroke,
      opacityChain,
      display: iconStyle.display,
      visibility: iconStyle.visibility,
    };
  }));

  expect(renderedIcons.some(icon => icon.isNext)).toBe(true);
  expect(renderedIcons.some(icon => !icon.isNext)).toBe(true);
  for (const icon of renderedIcons) {
    expect(icon.display).not.toBe('none');
    expect(icon.visibility).not.toBe('hidden');
    expect(icon.opacityChain.every(opacity => opacity >= 0.99), JSON.stringify(icon)).toBe(true);
    const background = parseCssColor(icon.background);
    const foreground = parseCssColor(icon.foreground);
    expect(background[3], JSON.stringify(icon)).toBeGreaterThanOrEqual(0.99);
    expect(
      contrastRatio(foreground, background),
      `Contraste insuficiente no ícone ${icon.isNext ? 'Próximo' : 'comum'} (${theme}): ${JSON.stringify(icon)}`,
    ).toBeGreaterThanOrEqual(3);
  }
}

async function expectVehicleTooltipContrast(page: Page): Promise<void> {
  const tooltips = page.locator('.leaflet-tooltip.map-vehicle-tooltip');
  await expect(tooltips.first()).toBeVisible();
  await expect(tooltips.first()).toContainText('8350');

  const styles = await tooltips.evaluateAll(elements => elements.map(element => {
    const computed = getComputedStyle(element);
    return {
      background: computed.backgroundColor,
      color: computed.color,
      opacity: computed.opacity,
      display: computed.display,
      visibility: computed.visibility,
    };
  }));
  const renderedTooltips = styles.filter(style =>
    style.display !== 'none' && style.visibility !== 'hidden' && Number(style.opacity) > 0,
  );
  expect(renderedTooltips.length).toBeGreaterThan(0);

  const possibleTileBackgrounds = [
    parseCssColor('rgb(255, 255, 255)'),
    parseCssColor('rgb(11, 22, 22)'),
  ];
  for (const style of renderedTooltips) {
    const background = parseCssColor(style.background);
    const foreground = parseCssColor(style.color);
    expect(background[3]).toBeGreaterThanOrEqual(0.9);
    const opacity = Number(style.opacity);
    for (const tileBackground of possibleTileBackgrounds) {
      const renderedBackground = composite(
        [background[0], background[1], background[2], background[3] * opacity],
        tileBackground,
      );
      const textOverPill = composite(foreground, background);
      const renderedForeground = composite(
        [textOverPill[0], textOverPill[1], textOverPill[2], opacity],
        tileBackground,
      );
      expect(contrastRatio(renderedForeground, renderedBackground)).toBeGreaterThanOrEqual(4.5);
    }
  }
}

for (const theme of themes) {
  // Modos de falha cobertos: axe ignora SVGs decorativos com aria-hidden; o SVG Lucide
  // herda currentColor; Tailwind pode resolver classes de cor concorrentes pela ordem
  // do CSS, ignorando a ordem do atributo class; transparência ou opacity podem reduzir
  // o contraste; e os estados Próximo e comum usam combinações diferentes nos dois temas.
  test(`ícones dos ônibus mantêm contraste nos dois estados no tema ${theme}`, async ({ page }) => {
    await prepareDesignFixture(page, theme);
    await expectPredictionIconContrast(page, theme);
  });

  for (const section of sections) {
    test(`contraste ${theme} — ${section.label}`, async ({ page }, testInfo) => {
      await prepareDesignFixture(page, theme);
      const navigation = page.getByRole('navigation', { name: 'Navegação principal' });
      await navigation.getByRole('button', { name: section.label }).click();
      await expect(navigation.getByRole('button', { name: section.label })).toHaveAttribute(
        'aria-current',
        'page',
      );
      await page.waitForTimeout(200);

      const result = await new AxeBuilder({ page })
        .withRules(['color-contrast'])
        .exclude('.leaflet-tile-pane')
        .analyze();
      expect(result.violations, JSON.stringify(result.violations, null, 2)).toEqual([]);

      if (section.id === 'historico') {
        const button = page.getByRole('button', { name: 'Criar meu primeiro alerta' });
        const colors = await button.evaluate(element => {
          const app = document.querySelector('.app-theme');
          if (!app) throw new Error('Contêiner de tema não encontrado.');
          const probe = document.createElement('span');
          probe.style.color = 'var(--tw-color-bh-on-primary)';
          app.append(probe);
          const token = getComputedStyle(probe).color;
          probe.remove();
          return { color: getComputedStyle(element).color, token };
        });
        expect(colors.color).toBe(colors.token);
      }

      await page.screenshot({ path: testInfo.outputPath(`${theme}-${section.id}.png`), fullPage: true });
    });
  }

  test(`tooltip do ônibus mantém contraste no tema ${theme}`, async ({ page }) => {
    await prepareDesignFixture(page, theme);
    await expectVehicleTooltipContrast(page);
  });

  // Falhas mobile cobertas: a navegação muda os itens visíveis; o painel pode cortar
  // conteúdo no estado half; e menus responsivos escondem páginas em “Mais opções”.
  test(`ícones dos ônibus mantêm contraste no mobile no tema ${theme}`, async ({ page }, testInfo) => {
    await prepareDesignFixture(page, theme, 'mobile');
    await expandMobileSheet(page, '.mobile-bottom-sheet');
    await expectPredictionIconContrast(page, theme);
    await page.screenshot({ path: testInfo.outputPath(`${theme}-mobile-icons.png`) });
  });

  for (const section of sections) {
    test(`contraste mobile ${theme} — ${section.label}`, async ({ page }, testInfo) => {
      await prepareDesignFixture(page, theme, 'mobile');
      await navigateMobileSection(page, section);

      if (section.id === 'mapa' || section.id === 'alerta') {
        await expandMobileSheet(page, '.mobile-bottom-sheet');
      } else if (section.id === 'otimo') {
        await expandMobileSheet(page, '.mobilibus-mobile-bottom-sheet');
      }

      const result = await new AxeBuilder({ page })
        .withRules(['color-contrast'])
        .exclude('.leaflet-tile-pane')
        .analyze();
      expect(result.violations, JSON.stringify(result.violations, null, 2)).toEqual([]);
      await page.screenshot({ path: testInfo.outputPath(`${theme}-mobile-${section.id}.png`), fullPage: true });
    });
  }

  test(`tooltip do ônibus mantém contraste no mobile no tema ${theme}`, async ({ page }) => {
    await prepareDesignFixture(page, theme, 'mobile');
    await expectVehicleTooltipContrast(page);
  });
}

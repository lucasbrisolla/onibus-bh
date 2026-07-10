# Ônibus BH Núcleo Mapa Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the approved core experience: responsive monitoring dashboard with real map, stop context, predictions, and automatic refresh.

**Architecture:** Keep SIU access behind Vercel functions and normalize all SIU payloads in `src/server/normalizers.ts`. The Vue app becomes a shell composed of focused components: monitoring panel, prediction cards, and Leaflet map, with the same state feeding desktop and mobile layouts. `codItinerario` is derived from current predictions and never persisted.

**Tech Stack:** Vue 3, TypeScript, Vite, Vitest, Vercel Functions, Leaflet, browser Notifications.

---

## File Structure

- Modify `package.json` and `package-lock.json`: add `leaflet`.
- Modify `src/domain/types.ts`: add stop, route, and vehicle types; enrich prediction fields.
- Modify `src/server/siuClient.ts`: switch to documented SIU base and add map-related client methods.
- Modify `src/server/normalizers.ts`: add normalizers for nearby stops, route points, vehicles, and enriched predictions.
- Modify `src/server/normalizers.test.ts`: cover new SIU payload shapes.
- Create `api/paradas/proximas.ts`: proxy nearby stops by `lat`/`lng`.
- Create `api/itinerarios/[cod]/index.ts`: proxy route points by `codItinerario`.
- Create `api/itinerarios/[cod]/veiculos.ts`: proxy live vehicles by `codItinerario`.
- Modify `src/services/apiClient.ts`: add frontend methods for new API endpoints.
- Modify `src/services/apiClient.test.ts`: cover new frontend client methods.
- Create `src/services/mapDataService.ts`: derive route/vehicle requests from monitored predictions, with stale-response guards.
- Create `src/services/mapDataService.test.ts`: verify derived map data behavior.
- Replace `src/components/AlertSettingsForm.vue`, `PredictionList.vue`, and `StatusPanel.vue` usage with new layout components.
- Create `src/components/AppShell.vue`: responsive app frame and navigation.
- Create `src/components/MonitoringPanel.vue`: stop, line, alert controls, status, and prediction list for desktop.
- Create `src/components/PredictionCards.vue`: reusable prediction cards.
- Create `src/components/MapView.vue`: Leaflet map, stop markers, route polyline, vehicle markers.
- Create `src/components/MobileBottomSheet.vue`: compact mobile controls and predictions.
- Modify `src/App.vue`: orchestrate settings, predictions, nearby stops, and map data.
- Modify `src/style.css`: implement approved visual direction.
- Modify `src/App.test.ts`: assert new UI states and existing polling/notification behavior.

## Task 1: Add Map Data Types and Normalizers

**Files:**
- Modify: `src/domain/types.ts`
- Modify: `src/server/normalizers.ts`
- Test: `src/server/normalizers.test.ts`

- [ ] **Step 1: Write failing normalizer tests**

Add tests for:

```ts
it('normalizes nearby stops from SIU coordinates', () => {
  const result = normalizeNearbyStops({
    sucesso: true,
    paradas: [{ cod: 13566, siu: '40134', x: -43.99563, y: -19.916136, desc: 'ROD ANEL', cor: 4 }],
  });

  expect(result).toEqual([
    {
      code: '13566',
      publicCode: '40134',
      latitude: -19.916136,
      longitude: -43.99563,
      description: 'ROD ANEL',
      color: 4,
    },
  ]);
});

it('normalizes route points and skips invalid coordinates', () => {
  const result = normalizeRoutePoints({
    itinerarios: [{ coordX: -43.9, coordY: -19.9 }, { coordX: null, coordY: -19.8 }],
  });

  expect(result).toEqual([{ latitude: -19.9, longitude: -43.9 }]);
});

it('normalizes live vehicles with optional bearing', () => {
  const result = normalizeVehicles({
    veiculos: [{ lat: -19.91, long: -43.99, cor: 3, descricao: '8350', numVeicGestor: '40743', direcao: 135 }],
  });

  expect(result).toEqual([
    {
      latitude: -19.91,
      longitude: -43.99,
      color: 3,
      lineCode: '8350',
      vehicleId: '40743',
      bearing: 135,
    },
  ]);
});

it('enriches predictions with vehicle, color, and accessibility fields', () => {
  const result = normalizePredictions({
    horaConsulta: '10/07/2026 17:21:49',
    previsoes: [
      {
        sgLin: '8350',
        prev: '16 Minutos',
        tpAcess: 6,
        cor: 3,
        numVeicGestor: '40743',
        apelidoLinha: 'EST.SAO GABRIEL/EST.BARREIRO',
        codItinerario: 53564,
      },
    ],
  });

  expect(result[0]).toMatchObject({
    lineCode: '8350',
    minutes: 16,
    serviceId: '53564',
    vehicleId: '40743',
    color: 3,
    accessibilityCode: 6,
  });
});
```

- [ ] **Step 2: Run test to verify failure**

Run: `npm run test -- src/server/normalizers.test.ts`

Expected: FAIL because `normalizeNearbyStops`, `normalizeRoutePoints`, `normalizeVehicles`, and enriched fields do not exist.

- [ ] **Step 3: Implement types and normalizers**

Add interfaces:

```ts
export interface NearbyStop {
  code: string;
  publicCode: string;
  latitude: number;
  longitude: number;
  description: string;
  color: number | null;
}

export interface RoutePoint {
  latitude: number;
  longitude: number;
}

export interface Vehicle {
  latitude: number;
  longitude: number;
  color: number | null;
  lineCode: string;
  vehicleId: string;
  bearing: number | null;
}
```

Extend `Prediction` with:

```ts
vehicleId: string | null;
color: number | null;
accessibilityCode: number | null;
```

Implement normalizers using existing `isPlainRecord` and helpers, accepting numbers or numeric strings, and filtering invalid coordinates.

- [ ] **Step 4: Run test to verify pass**

Run: `npm run test -- src/server/normalizers.test.ts`

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/domain/types.ts src/server/normalizers.ts src/server/normalizers.test.ts
git commit -m "feat: normalize map data"
```

## Task 2: Add SIU and Frontend API Methods

**Files:**
- Modify: `src/server/siuClient.ts`
- Create: `api/paradas/proximas.ts`
- Create: `api/itinerarios/[cod]/index.ts`
- Create: `api/itinerarios/[cod]/veiculos.ts`
- Modify: `src/services/apiClient.ts`
- Test: `src/services/apiClient.test.ts`

- [ ] **Step 1: Write failing frontend API tests**

Add tests:

```ts
it('fetches nearby stops with lat and lng query params', async () => {
  vi.stubGlobal('fetch', vi.fn(async () => response(JSON.stringify({ stops: [] }), { status: 200 })));

  await expect(fetchNearbyStops(-19.916342, -43.993759)).resolves.toEqual([]);
  expect(fetch).toHaveBeenCalledWith('/api/paradas/proximas?lat=-19.916342&lng=-43.993759');
});

it('fetches route points by service id', async () => {
  vi.stubGlobal('fetch', vi.fn(async () => response(JSON.stringify({ route: [{ latitude: -19.9, longitude: -43.9 }] }), { status: 200 })));

  await expect(fetchRoutePoints('53564')).resolves.toEqual([{ latitude: -19.9, longitude: -43.9 }]);
  expect(fetch).toHaveBeenCalledWith('/api/itinerarios/53564');
});

it('fetches vehicles by service id', async () => {
  vi.stubGlobal('fetch', vi.fn(async () => response(JSON.stringify({ vehicles: [] }), { status: 200 })));

  await expect(fetchVehicles('53564')).resolves.toEqual([]);
  expect(fetch).toHaveBeenCalledWith('/api/itinerarios/53564/veiculos');
});
```

- [ ] **Step 2: Run test to verify failure**

Run: `npm run test -- src/services/apiClient.test.ts`

Expected: FAIL because new methods do not exist.

- [ ] **Step 3: Implement backend and frontend clients**

Update `SIU_BASE_URL`:

```ts
export const SIU_BASE_URL =
  'http://bhz.siumobile.com.br:6060/siumobiletacomapp/siumobile-ws-v01/rest/ws';
```

Add server methods:

```ts
export async function getNearbyStops(latitude: number, longitude: number) {
  const payload = await fetchJsonp(
    `/V3/buscarParadasProximas/${encodeURIComponent(longitude)}/${encodeURIComponent(latitude)}/0/BHZ/retornoJSONH`,
  );
  return normalizeNearbyStops(payload as Record<string, unknown>);
}

export async function getRoutePoints(serviceId: string) {
  const payload = await fetchJsonp(
    `/V3/buscarItinerario/${encodeURIComponent(serviceId)}/0/BHZ/retornoJSONItinerario`,
  );
  return normalizeRoutePoints(payload as Record<string, unknown>);
}

export async function getVehicles(serviceId: string) {
  const payload = await fetchJsonp(
    `/V3/retornaVeiculosMapa/${encodeURIComponent(serviceId)}/0/BHZ/retornoJSONVeiculos`,
  );
  return normalizeVehicles(payload as Record<string, unknown>);
}
```

Add Vercel handlers with GET-only validation:

- `/api/paradas/proximas?lat=-19.916342&lng=-43.993759` returns `{ stops }`.
- `/api/itinerarios/[cod]` returns `{ route }`.
- `/api/itinerarios/[cod]/veiculos` returns `{ vehicles }`.

Add frontend methods with `readJson`.

- [ ] **Step 4: Run tests**

Run: `npm run test -- src/services/apiClient.test.ts src/server/normalizers.test.ts`

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/server/siuClient.ts api/paradas/proximas.ts api/itinerarios src/services/apiClient.ts src/services/apiClient.test.ts
git commit -m "feat: add map api clients"
```

## Task 3: Add Map Data Service

**Files:**
- Create: `src/services/mapDataService.ts`
- Test: `src/services/mapDataService.test.ts`

- [ ] **Step 1: Write failing tests**

Create tests for:

```ts
it('selects the first matching prediction service id', () => {
  expect(selectMapServiceId(predictions, '8350')).toBe('53564');
});

it('returns null without matching finite prediction service id', () => {
  expect(selectMapServiceId([{ ...prediction, serviceId: null }], '8350')).toBeNull();
});
```

Also test `createMapDataLoader` ignores stale route/vehicle responses when a newer service id is requested first.

- [ ] **Step 2: Run test to verify failure**

Run: `npm run test -- src/services/mapDataService.test.ts`

Expected: FAIL because service does not exist.

- [ ] **Step 3: Implement service**

Export:

```ts
export function selectMapServiceId(predictions: Prediction[], lineCode: string): string | null;

export function createMapDataLoader(fetchers: {
  fetchRoutePoints: (serviceId: string) => Promise<RoutePoint[]>;
  fetchVehicles: (serviceId: string) => Promise<Vehicle[]>;
}): {
  load(serviceId: string): Promise<{ serviceId: string; route: RoutePoint[]; vehicles: Vehicle[] } | null>;
};
```

The loader increments a request id on every `load()` and returns `null` for stale responses.

- [ ] **Step 4: Run test**

Run: `npm run test -- src/services/mapDataService.test.ts`

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/services/mapDataService.ts src/services/mapDataService.test.ts
git commit -m "feat: derive map data from predictions"
```

## Task 4: Build Leaflet Map Component

**Files:**
- Modify: `package.json`
- Modify: `package-lock.json`
- Create: `src/components/MapView.vue`
- Test: `src/App.test.ts`

- [ ] **Step 1: Add Leaflet dependency**

Run: `npm install leaflet`

Expected: `leaflet` appears in dependencies and lockfile.

- [ ] **Step 2: Write failing render test**

In `src/App.test.ts`, add an assertion that the mounted app renders `.map-surface`, monitored stop marker text, and fallback text when no route is available.

- [ ] **Step 3: Run test to verify failure**

Run: `npm run test -- src/App.test.ts`

Expected: FAIL because map component is not rendered.

- [ ] **Step 4: Implement `MapView.vue`**

Use Leaflet in `onMounted`, import CSS:

```ts
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
```

Render a `<div ref="mapElement" class="map-surface"></div>` and maintain layers for:

- monitored stop marker;
- nearby stop markers;
- route polyline;
- vehicle markers.

Use custom `divIcon` markers instead of image assets to avoid bundler icon path issues.

- [ ] **Step 5: Run test**

Run: `npm run test -- src/App.test.ts`

Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add package.json package-lock.json src/components/MapView.vue src/App.test.ts
git commit -m "feat: add leaflet map view"
```

## Task 5: Build Responsive Dashboard UI

**Files:**
- Create: `src/components/AppShell.vue`
- Create: `src/components/MonitoringPanel.vue`
- Create: `src/components/PredictionCards.vue`
- Create: `src/components/MobileBottomSheet.vue`
- Modify: `src/App.vue`
- Modify: `src/style.css`
- Test: `src/App.test.ts`

- [ ] **Step 1: Write failing UI tests**

Update existing App tests to expect:

- `Ônibus BH`;
- `Monitoramento ativo`;
- `Parada monitorada`;
- `Próximos ônibus`;
- `Mapa`;
- `Favoritos`;
- `Histórico`;
- `Configurações`.

- [ ] **Step 2: Run test to verify failure**

Run: `npm run test -- src/App.test.ts`

Expected: FAIL because current app still renders the simple hero/form layout.

- [ ] **Step 3: Implement components and layout**

`AppShell` provides desktop sidebar and mobile nav slots.

`MonitoringPanel` receives current settings, status, permission, predictions, and emits:

- `updateSettings`;
- `requestPermission`;
- `useCurrentLocation`.

`PredictionCards` renders finite and non-finite predictions without showing `Infinity`.

`MobileBottomSheet` reuses the same controls in compact form.

`App.vue` keeps existing polling behavior and adds map state:

- `nearbyStops`;
- `route`;
- `vehicles`;
- `mapServiceId`;
- `loadNearbyStops`;
- `loadMapData`.

- [ ] **Step 4: Style to approved reference**

Implement:

- dark sidebar;
- light map/dashboard surface;
- purple primary actions;
- green active state;
- desktop two-column panel + map;
- mobile full-map layout and bottom sheet.

- [ ] **Step 5: Run focused tests**

Run: `npm run test -- src/App.test.ts`

Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add src/App.vue src/style.css src/components src/App.test.ts
git commit -m "feat: build monitoring dashboard"
```

## Task 6: Final Verification

**Files:**
- No source changes expected unless verification reveals issues.

- [ ] **Step 1: Run all tests**

Run: `npm run test`

Expected: PASS.

- [ ] **Step 2: Run typecheck**

Run: `npm run lint`

Expected: PASS.

- [ ] **Step 3: Run production build**

Run: `npm run build`

Expected: PASS.

- [ ] **Step 4: Start local dev server**

Run: `npm run dev -- --host 127.0.0.1 --port 5173`

Expected: local Vite URL available.

- [ ] **Step 5: Final commit if fixes were needed**

If verification required changes:

```bash
git add <changed-files>
git commit -m "fix: polish map dashboard verification"
```

## Self-Review

- Spec coverage: backend proxy, SIU base migration, stop/map/vehicle data, responsive dashboard, polling safeguards, and final verification are covered.
- Scope kept: favorites, history, advanced PWA, and push with app closed are not implemented.
- Type consistency: `NearbyStop`, `RoutePoint`, `Vehicle`, and enriched `Prediction` names are used consistently across tasks.
- Placeholder scan: no task relies on unresolved placeholders.

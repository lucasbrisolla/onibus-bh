# Ônibus BH MVP Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a personal Ônibus BH web app that runs on Vercel, reads bus predictions through serverless API routes, and sends a local browser notification when a configured bus is close.

**Architecture:** Create a fresh Vue 3 + Vite + TypeScript app with Vercel serverless functions under `api/`. Keep SIU Mobile integration isolated in backend library files, keep alert matching and 8350 variant logic in shared domain modules, and keep browser notification/localStorage behavior in focused frontend services.

**Tech Stack:** Vue 3, Vite, TypeScript, Vitest, `@vitejs/plugin-vue`, Vercel serverless functions, native Fetch API, Notification API, `localStorage`.

---

## File Structure

Create this structure:

```text
api/
  health.ts
  linhas.ts
  paradas/[cod]/previsoes.ts
src/
  App.vue
  main.ts
  style.css
  components/
    AlertSettingsForm.vue
    PredictionList.vue
    StatusPanel.vue
  domain/
    alertRules.ts
    alertRules.test.ts
    busVariant.ts
    busVariant.test.ts
    types.ts
  services/
    apiClient.ts
    notificationService.ts
    notificationService.test.ts
    settingsStore.ts
  server/
    errors.ts
    jsonp.ts
    jsonp.test.ts
    normalizers.ts
    normalizers.test.ts
    siuClient.ts
  test/
    setup.ts
index.html
package.json
tsconfig.json
tsconfig.node.json
vite.config.ts
vitest.config.ts
vercel.json
README.md
```

Responsibilities:

- `src/domain/*`: shared pure business logic. No browser APIs, no network.
- `src/server/*`: SIU Mobile integration, JSONP parsing, data normalization, server errors.
- `api/*`: thin Vercel handlers that validate request input and call `src/server/*`.
- `src/services/*`: frontend browser services: API calls, notifications, persistence.
- `src/components/*`: Vue UI only.

---

### Task 1: Scaffold Vue/Vite/TypeScript Project

**Files:**
- Create: `package.json`
- Create: `index.html`
- Create: `src/main.ts`
- Create: `src/App.vue`
- Create: `src/style.css`
- Create: `tsconfig.json`
- Create: `tsconfig.node.json`
- Create: `vite.config.ts`
- Create: `vitest.config.ts`
- Create: `src/test/setup.ts`
- Create: `vercel.json`

- [ ] **Step 1: Create `package.json`**

```json
{
  "name": "onibus-bh",
  "version": "0.1.0",
  "private": true,
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "vue-tsc --noEmit && vite build",
    "preview": "vite preview",
    "test": "vitest run",
    "test:watch": "vitest",
    "lint": "vue-tsc --noEmit"
  },
  "dependencies": {
    "@vitejs/plugin-vue": "^5.2.0",
    "vue": "^3.5.0"
  },
  "devDependencies": {
    "@types/node": "^22.10.0",
    "@vue/test-utils": "^2.4.6",
    "jsdom": "^25.0.1",
    "typescript": "^5.7.0",
    "vite": "^6.0.0",
    "vitest": "^2.1.8",
    "vue-tsc": "^2.1.10"
  }
}
```

- [ ] **Step 2: Create `index.html`**

```html
<!doctype html>
<html lang="pt-BR">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <meta name="theme-color" content="#14532d" />
    <title>Ônibus BH</title>
  </head>
  <body>
    <div id="app"></div>
    <script type="module" src="/src/main.ts"></script>
  </body>
</html>
```

- [ ] **Step 3: Create `src/main.ts`**

```ts
import { createApp } from 'vue';
import App from './App.vue';
import './style.css';

createApp(App).mount('#app');
```

- [ ] **Step 4: Create initial `src/App.vue`**

```vue
<template>
  <main class="app-shell">
    <section class="hero">
      <p class="eyebrow">Ônibus BH</p>
      <h1>Alerta pessoal de chegada</h1>
      <p class="summary">
        Configure uma parada, uma linha e um limite em minutos para acompanhar previsões enquanto o app estiver aberto.
      </p>
    </section>
  </main>
</template>
```

- [ ] **Step 5: Create `src/style.css`**

```css
:root {
  color: #17201a;
  background: #f7f8f3;
  font-family:
    Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
  font-synthesis: none;
  text-rendering: optimizeLegibility;
}

* {
  box-sizing: border-box;
}

body {
  margin: 0;
  min-width: 320px;
  min-height: 100vh;
}

button,
input,
select {
  font: inherit;
}

.app-shell {
  width: min(1040px, calc(100% - 32px));
  margin: 0 auto;
  padding: 32px 0;
}

.hero {
  padding: 28px 0;
}

.eyebrow {
  margin: 0 0 8px;
  color: #216869;
  font-size: 0.86rem;
  font-weight: 700;
  text-transform: uppercase;
}

h1 {
  margin: 0;
  max-width: 720px;
  font-size: clamp(2rem, 7vw, 4.5rem);
  line-height: 0.95;
}

.summary {
  max-width: 620px;
  color: #4d5a51;
  font-size: 1.05rem;
  line-height: 1.6;
}
```

- [ ] **Step 6: Create TypeScript and Vite configs**

`tsconfig.json`:

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "useDefineForClassFields": true,
    "module": "ESNext",
    "lib": ["ES2022", "DOM", "DOM.Iterable"],
    "skipLibCheck": true,
    "moduleResolution": "Bundler",
    "allowImportingTsExtensions": true,
    "resolveJsonModule": true,
    "isolatedModules": true,
    "noEmit": true,
    "jsx": "preserve",
    "strict": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "types": ["vitest/globals"]
  },
  "include": ["src/**/*.ts", "src/**/*.vue", "api/**/*.ts"],
  "references": [{ "path": "./tsconfig.node.json" }]
}
```

`tsconfig.node.json`:

```json
{
  "compilerOptions": {
    "composite": true,
    "skipLibCheck": true,
    "module": "ESNext",
    "moduleResolution": "Bundler",
    "allowSyntheticDefaultImports": true,
    "strict": true
  },
  "include": ["vite.config.ts", "vitest.config.ts"]
}
```

`vite.config.ts`:

```ts
import vue from '@vitejs/plugin-vue';
import { defineConfig } from 'vite';

export default defineConfig({
  plugins: [vue()],
});
```

`vitest.config.ts`:

```ts
import vue from '@vitejs/plugin-vue';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  plugins: [vue()],
  test: {
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.ts'],
  },
});
```

`src/test/setup.ts`:

```ts
import { afterEach, vi } from 'vitest';

afterEach(() => {
  vi.restoreAllMocks();
  localStorage.clear();
});
```

- [ ] **Step 7: Create `vercel.json`**

```json
{
  "cleanUrls": true,
  "trailingSlash": false
}
```

- [ ] **Step 8: Install dependencies**

Run: `npm install`

Expected: `package-lock.json` is created and dependencies install successfully.

- [ ] **Step 9: Verify scaffold**

Run: `npm run build`

Expected: build finishes successfully and creates `dist/`.

- [ ] **Step 10: Commit scaffold**

```bash
git add package.json package-lock.json index.html src tsconfig.json tsconfig.node.json vite.config.ts vitest.config.ts vercel.json
git commit -m "chore: scaffold vue vite app"
```

---

### Task 2: Add Domain Types, 8350 Variant Logic, and Alert Matching

**Files:**
- Create: `src/domain/types.ts`
- Create: `src/domain/busVariant.ts`
- Create: `src/domain/busVariant.test.ts`
- Create: `src/domain/alertRules.ts`
- Create: `src/domain/alertRules.test.ts`

- [ ] **Step 1: Create failing tests for 8350 variant classification**

`src/domain/busVariant.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { classifyBusVariant, matchesVariantFilter } from './busVariant';

describe('classifyBusVariant', () => {
  it('classifies 8350 direto from description text', () => {
    expect(classifyBusVariant({ lineCode: '8350', description: '8350 Direto Centro' })).toBe('direto');
  });

  it('classifies 8350 without direto text as nao-direto', () => {
    expect(classifyBusVariant({ lineCode: '8350', description: '8350 Estação Barreiro' })).toBe('nao-direto');
  });

  it('does not assign a variant to other lines', () => {
    expect(classifyBusVariant({ lineCode: '8208', description: '8208 Santa Tereza' })).toBe('not-applicable');
  });
});

describe('matchesVariantFilter', () => {
  it('accepts any 8350 variant when filter is qualquer', () => {
    expect(matchesVariantFilter('direto', 'qualquer')).toBe(true);
    expect(matchesVariantFilter('nao-direto', 'qualquer')).toBe(true);
  });

  it('requires matching direct variant when filter is direto', () => {
    expect(matchesVariantFilter('direto', 'direto')).toBe(true);
    expect(matchesVariantFilter('nao-direto', 'direto')).toBe(false);
  });

  it('requires matching non-direct variant when filter is nao-direto', () => {
    expect(matchesVariantFilter('nao-direto', 'nao-direto')).toBe(true);
    expect(matchesVariantFilter('direto', 'nao-direto')).toBe(false);
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npm run test -- src/domain/busVariant.test.ts`

Expected: FAIL because `src/domain/busVariant.ts` does not exist.

- [ ] **Step 3: Add domain types**

`src/domain/types.ts`:

```ts
export type BusVariant = 'direto' | 'nao-direto' | 'not-applicable';
export type BusVariantFilter = 'qualquer' | 'direto' | 'nao-direto';

export interface Prediction {
  id: string;
  lineCode: string;
  description: string;
  destination: string;
  minutes: number;
  queryTime: string | null;
  serviceId: string | null;
  variant: BusVariant;
}

export interface AlertSettings {
  stopCode: string;
  lineCode: string;
  variantFilter: BusVariantFilter;
  minutesBefore: number;
  enabled: boolean;
  lastNotifiedPredictionId: string | null;
}

export interface AlertMatch {
  shouldNotify: boolean;
  prediction: Prediction | null;
  reason:
    | 'matched'
    | 'disabled'
    | 'missing-settings'
    | 'no-matching-line'
    | 'above-threshold'
    | 'already-notified';
}
```

- [ ] **Step 4: Implement `src/domain/busVariant.ts`**

```ts
import type { BusVariant, BusVariantFilter } from './types';

interface VariantInput {
  lineCode: string;
  description: string;
}

function normalize(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();
}

export function classifyBusVariant(input: VariantInput): BusVariant {
  if (input.lineCode.trim() !== '8350') {
    return 'not-applicable';
  }

  return normalize(input.description).includes('direto') ? 'direto' : 'nao-direto';
}

export function matchesVariantFilter(variant: BusVariant, filter: BusVariantFilter): boolean {
  if (variant === 'not-applicable') {
    return true;
  }

  if (filter === 'qualquer') {
    return true;
  }

  return variant === filter;
}
```

- [ ] **Step 5: Run variant tests**

Run: `npm run test -- src/domain/busVariant.test.ts`

Expected: PASS.

- [ ] **Step 6: Create failing tests for alert matching**

`src/domain/alertRules.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { findAlertMatch } from './alertRules';
import type { AlertSettings, Prediction } from './types';

const baseSettings: AlertSettings = {
  stopCode: '1234',
  lineCode: '8350',
  variantFilter: 'direto',
  minutesBefore: 7,
  enabled: true,
  lastNotifiedPredictionId: null,
};

const diretoPrediction: Prediction = {
  id: '8350-direto-5',
  lineCode: '8350',
  description: '8350 Direto Centro',
  destination: 'Centro',
  minutes: 5,
  queryTime: '10:00',
  serviceId: 'svc-direto',
  variant: 'direto',
};

describe('findAlertMatch', () => {
  it('matches an enabled alert under the minute threshold', () => {
    expect(findAlertMatch(baseSettings, [diretoPrediction])).toEqual({
      shouldNotify: true,
      prediction: diretoPrediction,
      reason: 'matched',
    });
  });

  it('does not match when alert is disabled', () => {
    expect(findAlertMatch({ ...baseSettings, enabled: false }, [diretoPrediction]).reason).toBe('disabled');
  });

  it('does not match a different 8350 variant', () => {
    const prediction: Prediction = { ...diretoPrediction, id: '8350-nao-5', variant: 'nao-direto' };
    expect(findAlertMatch(baseSettings, [prediction]).reason).toBe('no-matching-line');
  });

  it('does not match above the minute threshold', () => {
    const prediction: Prediction = { ...diretoPrediction, id: '8350-direto-12', minutes: 12 };
    expect(findAlertMatch(baseSettings, [prediction]).reason).toBe('above-threshold');
  });

  it('does not notify the same prediction twice', () => {
    const settings = { ...baseSettings, lastNotifiedPredictionId: diretoPrediction.id };
    expect(findAlertMatch(settings, [diretoPrediction]).reason).toBe('already-notified');
  });
});
```

- [ ] **Step 7: Run alert tests to verify they fail**

Run: `npm run test -- src/domain/alertRules.test.ts`

Expected: FAIL because `findAlertMatch` does not exist.

- [ ] **Step 8: Implement `src/domain/alertRules.ts`**

```ts
import { matchesVariantFilter } from './busVariant';
import type { AlertMatch, AlertSettings, Prediction } from './types';

export function findAlertMatch(settings: AlertSettings, predictions: Prediction[]): AlertMatch {
  if (!settings.enabled) {
    return { shouldNotify: false, prediction: null, reason: 'disabled' };
  }

  if (!settings.stopCode.trim() || !settings.lineCode.trim()) {
    return { shouldNotify: false, prediction: null, reason: 'missing-settings' };
  }

  const matchingLine = predictions.filter(
    prediction =>
      prediction.lineCode === settings.lineCode &&
      matchesVariantFilter(prediction.variant, settings.variantFilter),
  );

  if (matchingLine.length === 0) {
    return { shouldNotify: false, prediction: null, reason: 'no-matching-line' };
  }

  const closest = [...matchingLine].sort((a, b) => a.minutes - b.minutes)[0];

  if (closest.id === settings.lastNotifiedPredictionId) {
    return { shouldNotify: false, prediction: closest, reason: 'already-notified' };
  }

  if (closest.minutes > settings.minutesBefore) {
    return { shouldNotify: false, prediction: closest, reason: 'above-threshold' };
  }

  return { shouldNotify: true, prediction: closest, reason: 'matched' };
}
```

- [ ] **Step 9: Run domain tests**

Run: `npm run test -- src/domain`

Expected: PASS.

- [ ] **Step 10: Commit domain logic**

```bash
git add src/domain
git commit -m "feat: add bus alert domain rules"
```

---

### Task 3: Add JSONP Parser and SIU Normalizers

**Files:**
- Create: `src/server/errors.ts`
- Create: `src/server/jsonp.ts`
- Create: `src/server/jsonp.test.ts`
- Create: `src/server/normalizers.ts`
- Create: `src/server/normalizers.test.ts`

- [ ] **Step 1: Create failing JSONP parser tests**

`src/server/jsonp.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { parseJsonp } from './jsonp';

describe('parseJsonp', () => {
  it('parses callback-wrapped JSON', () => {
    expect(parseJsonp('jsonpCallback({"sucesso":true})')).toEqual({ sucesso: true });
  });

  it('parses JSONP with whitespace', () => {
    expect(parseJsonp(' jsonpCallback ( {"linhas":[]} ); ')).toEqual({ linhas: [] });
  });

  it('rejects content without a callback wrapper', () => {
    expect(() => parseJsonp('{"sucesso":true}')).toThrow('Resposta JSONP inválida');
  });
});
```

- [ ] **Step 2: Run JSONP tests to verify they fail**

Run: `npm run test -- src/server/jsonp.test.ts`

Expected: FAIL because `parseJsonp` does not exist.

- [ ] **Step 3: Add server errors**

`src/server/errors.ts`:

```ts
export class AppError extends Error {
  constructor(
    message: string,
    public readonly statusCode: number,
    public readonly code: string,
    public readonly cause?: unknown,
  ) {
    super(message);
    this.name = new.target.name;
  }
}

export class BadRequestError extends AppError {
  constructor(message: string, cause?: unknown) {
    super(message, 400, 'bad_request', cause);
  }
}

export class NotFoundError extends AppError {
  constructor(message: string, cause?: unknown) {
    super(message, 404, 'not_found', cause);
  }
}

export class BadGatewayError extends AppError {
  constructor(message: string, cause?: unknown) {
    super(message, 502, 'bad_gateway', cause);
  }
}

export class GatewayTimeoutError extends AppError {
  constructor(message: string, cause?: unknown) {
    super(message, 504, 'gateway_timeout', cause);
  }
}

export function toHttpError(error: unknown): AppError {
  if (error instanceof AppError) {
    return error;
  }

  return new AppError('Erro interno', 500, 'internal_error', error);
}
```

- [ ] **Step 4: Implement `src/server/jsonp.ts`**

```ts
import { BadGatewayError } from './errors';

export function parseJsonp<T = unknown>(input: string): T {
  const trimmed = input.trim().replace(/;$/, '');
  const match = trimmed.match(/^[A-Za-z_$][\w$]*\s*\(([\s\S]*)\)$/);

  if (!match) {
    throw new BadGatewayError('Resposta JSONP inválida');
  }

  try {
    return JSON.parse(match[1]) as T;
  } catch (error) {
    throw new BadGatewayError('JSON interno da resposta JSONP é inválido', error);
  }
}
```

- [ ] **Step 5: Run JSONP parser tests**

Run: `npm run test -- src/server/jsonp.test.ts`

Expected: PASS.

- [ ] **Step 6: Create failing normalizer tests**

`src/server/normalizers.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { normalizePredictions } from './normalizers';

describe('normalizePredictions', () => {
  it('normalizes SIU predictions and marks 8350 direto', () => {
    const result = normalizePredictions({
      horaConsulta: '10:00',
      previsoes: [
        {
          codLinha: '8350',
          descLinha: '8350 Direto Centro',
          destino: 'Centro',
          tempo: '5 min',
          codItinerario: 'abc',
        },
      ],
    });

    expect(result).toEqual([
      {
        id: '8350-abc-5',
        lineCode: '8350',
        description: '8350 Direto Centro',
        destination: 'Centro',
        minutes: 5,
        queryTime: '10:00',
        serviceId: 'abc',
        variant: 'direto',
      },
    ]);
  });

  it('normalizes minutes from numeric fields', () => {
    const result = normalizePredictions({
      horaConsulta: null,
      previsoes: [{ linha: '8208', descricao: '8208', destino: 'Centro', tempo: 3 }],
    });

    expect(result[0]?.minutes).toBe(3);
    expect(result[0]?.variant).toBe('not-applicable');
  });
});
```

- [ ] **Step 7: Run normalizer tests to verify they fail**

Run: `npm run test -- src/server/normalizers.test.ts`

Expected: FAIL because `normalizePredictions` does not exist.

- [ ] **Step 8: Implement `src/server/normalizers.ts`**

```ts
import { classifyBusVariant } from '../domain/busVariant';
import type { Prediction } from '../domain/types';

type UnknownRecord = Record<string, unknown>;

function readString(record: UnknownRecord, keys: string[], fallback = ''): string {
  for (const key of keys) {
    const value = record[key];
    if (typeof value === 'string' && value.trim()) {
      return value.trim();
    }
    if (typeof value === 'number') {
      return String(value);
    }
  }
  return fallback;
}

function readMinutes(record: UnknownRecord): number {
  const raw = record.tempo ?? record.tempoMinutos ?? record.previsaoMinutos ?? record.minutos;

  if (typeof raw === 'number' && Number.isFinite(raw)) {
    return Math.max(0, Math.round(raw));
  }

  if (typeof raw === 'string') {
    const match = raw.match(/\d+/);
    if (match) {
      return Number(match[0]);
    }
  }

  return Number.POSITIVE_INFINITY;
}

export function normalizePredictions(payload: UnknownRecord): Prediction[] {
  const list = Array.isArray(payload.previsoes) ? payload.previsoes : [];
  const queryTime = typeof payload.horaConsulta === 'string' ? payload.horaConsulta : null;

  return list.map((item, index) => {
    const record = item as UnknownRecord;
    const lineCode = readString(record, ['codLinha', 'linha', 'sgl', 'codigoLinha']);
    const description = readString(record, ['descLinha', 'descricao', 'nomLinha', 'linha'], lineCode);
    const destination = readString(record, ['destino', 'descricaoDestino', 'sentido'], 'Destino não informado');
    const serviceId = readString(record, ['codItinerario', 'idItinerario', 'servico'], '') || null;
    const minutes = readMinutes(record);
    const id = `${lineCode}-${serviceId ?? index}-${minutes}`;

    return {
      id,
      lineCode,
      description,
      destination,
      minutes,
      queryTime,
      serviceId,
      variant: classifyBusVariant({ lineCode, description }),
    };
  });
}
```

- [ ] **Step 9: Run server tests**

Run: `npm run test -- src/server`

Expected: PASS.

- [ ] **Step 10: Commit parser and normalizers**

```bash
git add src/server
git commit -m "feat: add siu parsing and normalization"
```

---

### Task 4: Add SIU Client and Vercel API Routes

**Files:**
- Create: `src/server/siuClient.ts`
- Create: `api/health.ts`
- Create: `api/linhas.ts`
- Create: `api/paradas/[cod]/previsoes.ts`

- [ ] **Step 1: Implement `src/server/siuClient.ts`**

```ts
import { BadGatewayError, GatewayTimeoutError } from './errors';
import { parseJsonp } from './jsonp';
import { normalizePredictions } from './normalizers';

const SIU_BASE_URL = 'http://bhz.siumobile.com.br:6060/siumobile-ws-v01/rest/ws';
const DEFAULT_TIMEOUT_MS = 8000;

async function fetchJsonp(path: string, timeoutMs = DEFAULT_TIMEOUT_MS): Promise<unknown> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(`${SIU_BASE_URL}${path}`, { signal: controller.signal });

    if (!response.ok) {
      throw new BadGatewayError(`SIU Mobile respondeu com HTTP ${response.status}`);
    }

    return parseJsonp(await response.text());
  } catch (error) {
    if (error instanceof DOMException && error.name === 'AbortError') {
      throw new GatewayTimeoutError('SIU Mobile não respondeu no tempo esperado', error);
    }
    throw error;
  } finally {
    clearTimeout(timeout);
  }
}

export async function getStopPredictions(stopCode: string) {
  const payload = await fetchJsonp(`/V3/buscarPrevisoes/${encodeURIComponent(stopCode)}/false/0/null/jsonpCallback`);
  return normalizePredictions(payload as Record<string, unknown>);
}

export async function getLines() {
  const payload = await fetchJsonp('/buscarLinhas/jsonpCallback');
  return payload;
}

export async function checkSiuHealth() {
  await fetchJsonp('/buscarLinhas/jsonpCallback', 5000);
  return { ok: true };
}
```

- [ ] **Step 2: Create API response helper inside each route**

Use this helper pattern in every route:

```ts
import type { VercelRequest, VercelResponse } from '@vercel/node';
import { toHttpError } from '../src/server/errors';

function sendError(response: VercelResponse, error: unknown) {
  const httpError = toHttpError(error);
  response.status(httpError.statusCode).json({
    error: {
      code: httpError.code,
      message: httpError.message,
    },
  });
}
```

If TypeScript cannot resolve `@vercel/node`, add it in Task 1 dependencies as a dev dependency:

```json
"@vercel/node": "^5.0.0"
```

- [ ] **Step 3: Create `api/health.ts`**

```ts
import type { VercelRequest, VercelResponse } from '@vercel/node';
import { toHttpError } from '../src/server/errors';
import { checkSiuHealth } from '../src/server/siuClient';

function sendError(response: VercelResponse, error: unknown) {
  const httpError = toHttpError(error);
  response.status(httpError.statusCode).json({ error: { code: httpError.code, message: httpError.message } });
}

export default async function handler(request: VercelRequest, response: VercelResponse) {
  if (request.method !== 'GET') {
    response.status(405).json({ error: { code: 'method_not_allowed', message: 'Método não permitido' } });
    return;
  }

  try {
    response.status(200).json(await checkSiuHealth());
  } catch (error) {
    sendError(response, error);
  }
}
```

- [ ] **Step 4: Create `api/linhas.ts`**

```ts
import type { VercelRequest, VercelResponse } from '@vercel/node';
import { toHttpError } from '../src/server/errors';
import { getLines } from '../src/server/siuClient';

function sendError(response: VercelResponse, error: unknown) {
  const httpError = toHttpError(error);
  response.status(httpError.statusCode).json({ error: { code: httpError.code, message: httpError.message } });
}

export default async function handler(request: VercelRequest, response: VercelResponse) {
  if (request.method !== 'GET') {
    response.status(405).json({ error: { code: 'method_not_allowed', message: 'Método não permitido' } });
    return;
  }

  try {
    response.status(200).json(await getLines());
  } catch (error) {
    sendError(response, error);
  }
}
```

- [ ] **Step 5: Create `api/paradas/[cod]/previsoes.ts`**

```ts
import type { VercelRequest, VercelResponse } from '@vercel/node';
import { BadRequestError, toHttpError } from '../../../src/server/errors';
import { getStopPredictions } from '../../../src/server/siuClient';

function sendError(response: VercelResponse, error: unknown) {
  const httpError = toHttpError(error);
  response.status(httpError.statusCode).json({ error: { code: httpError.code, message: httpError.message } });
}

export default async function handler(request: VercelRequest, response: VercelResponse) {
  if (request.method !== 'GET') {
    response.status(405).json({ error: { code: 'method_not_allowed', message: 'Método não permitido' } });
    return;
  }

  const cod = Array.isArray(request.query.cod) ? request.query.cod[0] : request.query.cod;

  if (!cod || !/^\d+$/.test(cod)) {
    sendError(response, new BadRequestError('Código da parada inválido'));
    return;
  }

  try {
    response.status(200).json({ predictions: await getStopPredictions(cod) });
  } catch (error) {
    sendError(response, error);
  }
}
```

- [ ] **Step 6: Run typecheck**

Run: `npm run lint`

Expected: PASS. If `@vercel/node` is missing, install it with `npm install -D @vercel/node`, then rerun.

- [ ] **Step 7: Commit API routes**

```bash
git add api src/server/siuClient.ts package.json package-lock.json
git commit -m "feat: add vercel siu api routes"
```

---

### Task 5: Add Frontend Services for API, Settings, and Notifications

**Files:**
- Create: `src/services/apiClient.ts`
- Create: `src/services/settingsStore.ts`
- Create: `src/services/notificationService.ts`
- Create: `src/services/notificationService.test.ts`

- [ ] **Step 1: Create failing notification service tests**

`src/services/notificationService.test.ts`:

```ts
import { describe, expect, it, vi } from 'vitest';
import { createNotificationService } from './notificationService';

describe('createNotificationService', () => {
  it('reports unsupported browsers', () => {
    const service = createNotificationService({ NotificationClass: undefined });
    expect(service.getPermission()).toBe('unsupported');
  });

  it('does not send duplicate notifications for the same prediction', () => {
    const notificationSpy = vi.fn();
    class FakeNotification {
      static permission = 'granted';
      constructor(title: string, options?: NotificationOptions) {
        notificationSpy(title, options);
      }
    }

    const service = createNotificationService({ NotificationClass: FakeNotification as unknown as typeof Notification });
    service.notifyArrival({ id: 'a', lineCode: '8350', minutes: 5, destination: 'Centro' });
    service.notifyArrival({ id: 'a', lineCode: '8350', minutes: 5, destination: 'Centro' });

    expect(notificationSpy).toHaveBeenCalledTimes(1);
  });
});
```

- [ ] **Step 2: Run notification tests to verify they fail**

Run: `npm run test -- src/services/notificationService.test.ts`

Expected: FAIL because `notificationService.ts` does not exist.

- [ ] **Step 3: Implement `src/services/notificationService.ts`**

```ts
type PermissionState = NotificationPermission | 'unsupported';

interface NotificationDeps {
  NotificationClass: typeof Notification | undefined;
}

interface ArrivalInput {
  id: string;
  lineCode: string;
  minutes: number;
  destination: string;
}

export function createNotificationService(
  deps: NotificationDeps = { NotificationClass: globalThis.Notification },
) {
  const notifiedIds = new Set<string>();

  return {
    getPermission(): PermissionState {
      return deps.NotificationClass ? deps.NotificationClass.permission : 'unsupported';
    },

    async requestPermission(): Promise<PermissionState> {
      if (!deps.NotificationClass) {
        return 'unsupported';
      }

      return deps.NotificationClass.requestPermission();
    },

    notifyArrival(input: ArrivalInput): boolean {
      if (!deps.NotificationClass || deps.NotificationClass.permission !== 'granted') {
        return false;
      }

      if (notifiedIds.has(input.id)) {
        return false;
      }

      notifiedIds.add(input.id);
      new deps.NotificationClass(`Linha ${input.lineCode} chegando`, {
        body: `Previsão de ${input.minutes} min para ${input.destination}.`,
        tag: input.id,
      });
      return true;
    },
  };
}
```

- [ ] **Step 4: Implement `src/services/settingsStore.ts`**

```ts
import type { AlertSettings } from '../domain/types';

const STORAGE_KEY = 'onibus-bh-alert-settings';

export const defaultSettings: AlertSettings = {
  stopCode: '',
  lineCode: '8350',
  variantFilter: 'qualquer',
  minutesBefore: 7,
  enabled: false,
  lastNotifiedPredictionId: null,
};

export function loadSettings(): AlertSettings {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) {
    return defaultSettings;
  }

  try {
    return { ...defaultSettings, ...JSON.parse(raw) } as AlertSettings;
  } catch {
    return defaultSettings;
  }
}

export function saveSettings(settings: AlertSettings): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
}
```

- [ ] **Step 5: Implement `src/services/apiClient.ts`**

```ts
import type { Prediction } from '../domain/types';

interface PredictionsResponse {
  predictions: Prediction[];
}

export class ApiClientError extends Error {
  constructor(
    message: string,
    public readonly status: number,
  ) {
    super(message);
    this.name = 'ApiClientError';
  }
}

async function readJson<T>(response: Response): Promise<T> {
  const data = (await response.json()) as T & { error?: { message?: string } };

  if (!response.ok) {
    throw new ApiClientError(data.error?.message ?? 'Erro ao consultar API', response.status);
  }

  return data;
}

export async function fetchStopPredictions(stopCode: string): Promise<Prediction[]> {
  const response = await fetch(`/api/paradas/${encodeURIComponent(stopCode)}/previsoes`);
  const data = await readJson<PredictionsResponse>(response);
  return data.predictions;
}
```

- [ ] **Step 6: Run service tests and typecheck**

Run: `npm run test -- src/services && npm run lint`

Expected: PASS.

- [ ] **Step 7: Commit frontend services**

```bash
git add src/services
git commit -m "feat: add frontend alert services"
```

---

### Task 6: Build MVP UI and Monitoring Loop

**Files:**
- Modify: `src/App.vue`
- Modify: `src/style.css`
- Create: `src/components/AlertSettingsForm.vue`
- Create: `src/components/PredictionList.vue`
- Create: `src/components/StatusPanel.vue`

- [ ] **Step 1: Create `src/components/AlertSettingsForm.vue`**

```vue
<script setup lang="ts">
import type { AlertSettings, BusVariantFilter } from '../domain/types';

const props = defineProps<{ settings: AlertSettings }>();
const emit = defineEmits<{ update: [settings: AlertSettings]; requestPermission: [] }>();

function update<K extends keyof AlertSettings>(key: K, value: AlertSettings[K]) {
  emit('update', { ...props.settings, [key]: value });
}
</script>

<template>
  <form class="panel form-grid" @submit.prevent>
    <label>
      Código da parada
      <input :value="settings.stopCode" inputmode="numeric" placeholder="Ex: 1234" @input="update('stopCode', ($event.target as HTMLInputElement).value)" />
    </label>

    <label>
      Linha
      <input :value="settings.lineCode" placeholder="Ex: 8350" @input="update('lineCode', ($event.target as HTMLInputElement).value)" />
    </label>

    <label>
      Variante da 8350
      <select :value="settings.variantFilter" @change="update('variantFilter', ($event.target as HTMLSelectElement).value as BusVariantFilter)">
        <option value="qualquer">Qualquer 8350</option>
        <option value="direto">Somente Direto</option>
        <option value="nao-direto">Somente Não Direto</option>
      </select>
    </label>

    <label>
      Avisar quando faltar até
      <input :value="settings.minutesBefore" type="number" min="1" max="60" @input="update('minutesBefore', Number(($event.target as HTMLInputElement).value))" />
    </label>

    <div class="actions">
      <button type="button" class="primary" @click="update('enabled', !settings.enabled)">
        {{ settings.enabled ? 'Pausar monitoramento' : 'Ativar monitoramento' }}
      </button>
      <button type="button" @click="emit('requestPermission')">Permitir notificações</button>
    </div>
  </form>
</template>
```

- [ ] **Step 2: Create `src/components/PredictionList.vue`**

```vue
<script setup lang="ts">
import type { Prediction } from '../domain/types';

defineProps<{ predictions: Prediction[] }>();
</script>

<template>
  <section class="panel">
    <h2>Próximas previsões</h2>
    <p v-if="predictions.length === 0" class="muted">Nenhuma previsão carregada.</p>
    <ul v-else class="prediction-list">
      <li v-for="prediction in predictions" :key="prediction.id">
        <strong>{{ prediction.lineCode }}</strong>
        <span>{{ prediction.destination }}</span>
        <span v-if="prediction.variant !== 'not-applicable'" class="badge">
          {{ prediction.variant === 'direto' ? 'Direto' : 'Não Direto' }}
        </span>
        <span class="minutes">{{ prediction.minutes }} min</span>
      </li>
    </ul>
  </section>
</template>
```

- [ ] **Step 3: Create `src/components/StatusPanel.vue`**

```vue
<script setup lang="ts">
defineProps<{
  enabled: boolean;
  permission: string;
  lastUpdated: string | null;
  message: string;
}>();
</script>

<template>
  <section class="panel status-grid">
    <div>
      <span class="label">Monitoramento</span>
      <strong>{{ enabled ? 'Ativo' : 'Pausado' }}</strong>
    </div>
    <div>
      <span class="label">Notificações</span>
      <strong>{{ permission }}</strong>
    </div>
    <div>
      <span class="label">Última consulta</span>
      <strong>{{ lastUpdated ?? 'Ainda não consultou' }}</strong>
    </div>
    <p class="status-message">{{ message }}</p>
  </section>
</template>
```

- [ ] **Step 4: Replace `src/App.vue` with monitoring loop**

```vue
<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue';
import AlertSettingsForm from './components/AlertSettingsForm.vue';
import PredictionList from './components/PredictionList.vue';
import StatusPanel from './components/StatusPanel.vue';
import { findAlertMatch } from './domain/alertRules';
import type { AlertSettings, Prediction } from './domain/types';
import { fetchStopPredictions } from './services/apiClient';
import { createNotificationService } from './services/notificationService';
import { loadSettings, saveSettings } from './services/settingsStore';

const POLL_INTERVAL_MS = 45_000;

const settings = ref<AlertSettings>(loadSettings());
const predictions = ref<Prediction[]>([]);
const lastUpdated = ref<string | null>(null);
const statusMessage = ref('Configure uma parada e ative o monitoramento.');
const notificationService = createNotificationService();
const permission = ref(notificationService.getPermission());
let intervalId: number | undefined;

const canPoll = computed(() => settings.value.enabled && settings.value.stopCode.trim().length > 0);

watch(
  settings,
  value => {
    saveSettings(value);
  },
  { deep: true },
);

async function requestPermission() {
  permission.value = await notificationService.requestPermission();
}

function updateSettings(next: AlertSettings) {
  settings.value = next;
}

async function pollPredictions() {
  if (!canPoll.value) {
    return;
  }

  try {
    predictions.value = await fetchStopPredictions(settings.value.stopCode.trim());
    lastUpdated.value = new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });

    const match = findAlertMatch(settings.value, predictions.value);
    statusMessage.value = describeMatch(match.reason);

    if (match.shouldNotify && match.prediction) {
      const didNotify = notificationService.notifyArrival({
        id: match.prediction.id,
        lineCode: match.prediction.lineCode,
        minutes: match.prediction.minutes,
        destination: match.prediction.destination,
      });

      if (didNotify) {
        settings.value = { ...settings.value, lastNotifiedPredictionId: match.prediction.id };
      }
    }
  } catch (error) {
    statusMessage.value = error instanceof Error ? error.message : 'Erro ao consultar previsões.';
  }
}

function describeMatch(reason: string): string {
  const messages: Record<string, string> = {
    matched: 'Ônibus dentro do limite configurado.',
    disabled: 'Monitoramento pausado.',
    'missing-settings': 'Informe uma parada e uma linha.',
    'no-matching-line': 'Nenhuma previsão bate com a linha/variante configurada.',
    'above-threshold': 'Há previsão, mas ainda acima do limite configurado.',
    'already-notified': 'Previsão já notificada.',
  };

  return messages[reason] ?? 'Monitoramento atualizado.';
}

onMounted(() => {
  void pollPredictions();
  intervalId = window.setInterval(() => void pollPredictions(), POLL_INTERVAL_MS);
});

onBeforeUnmount(() => {
  if (intervalId) {
    window.clearInterval(intervalId);
  }
});
</script>

<template>
  <main class="app-shell">
    <section class="hero">
      <p class="eyebrow">Ônibus BH</p>
      <h1>Alerta pessoal de chegada</h1>
      <p class="summary">
        Monitore uma parada e receba aviso local quando a linha escolhida estiver perto.
      </p>
    </section>

    <section class="layout">
      <AlertSettingsForm :settings="settings" @update="updateSettings" @request-permission="requestPermission" />
      <StatusPanel :enabled="settings.enabled" :permission="permission" :last-updated="lastUpdated" :message="statusMessage" />
      <PredictionList :predictions="predictions" />
    </section>
  </main>
</template>
```

- [ ] **Step 5: Extend `src/style.css`**

Append this CSS:

```css
.layout {
  display: grid;
  grid-template-columns: minmax(0, 1fr);
  gap: 16px;
}

.panel {
  border: 1px solid #d6ded4;
  border-radius: 8px;
  background: #ffffff;
  padding: 18px;
}

.form-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 14px;
}

label {
  display: grid;
  gap: 6px;
  color: #35413a;
  font-size: 0.92rem;
  font-weight: 700;
}

input,
select {
  width: 100%;
  border: 1px solid #b8c4bb;
  border-radius: 6px;
  padding: 10px 12px;
  background: #fff;
  color: #17201a;
}

.actions {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  align-items: end;
  grid-column: 1 / -1;
}

button {
  border: 1px solid #9bb0a1;
  border-radius: 6px;
  padding: 10px 14px;
  background: #fff;
  color: #17201a;
  cursor: pointer;
}

button.primary {
  border-color: #14532d;
  background: #14532d;
  color: #fff;
}

.status-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 14px;
}

.label,
.muted {
  color: #68766d;
}

.label {
  display: block;
  margin-bottom: 4px;
  font-size: 0.8rem;
  text-transform: uppercase;
}

.status-message {
  grid-column: 1 / -1;
  margin: 0;
  color: #35413a;
}

.prediction-list {
  display: grid;
  gap: 10px;
  padding: 0;
  margin: 0;
  list-style: none;
}

.prediction-list li {
  display: grid;
  grid-template-columns: auto minmax(0, 1fr) auto auto;
  gap: 10px;
  align-items: center;
  border-top: 1px solid #edf1eb;
  padding-top: 10px;
}

.badge {
  border-radius: 999px;
  background: #e3f2ed;
  color: #14532d;
  padding: 4px 8px;
  font-size: 0.8rem;
  font-weight: 700;
}

.minutes {
  font-weight: 800;
}

@media (max-width: 720px) {
  .form-grid,
  .status-grid,
  .prediction-list li {
    grid-template-columns: 1fr;
  }
}
```

- [ ] **Step 6: Run build**

Run: `npm run build`

Expected: PASS.

- [ ] **Step 7: Commit MVP UI**

```bash
git add src/App.vue src/style.css src/components
git commit -m "feat: build alert monitoring ui"
```

---

### Task 7: Add README and Final Verification

**Files:**
- Create: `README.md`
- Modify: files only if verification exposes type/test failures.

- [ ] **Step 1: Create `README.md`**

```markdown
# Ônibus BH

App pessoal para acompanhar previsões de ônibus em Belo Horizonte e notificar o navegador quando uma linha monitorada estiver chegando.

## Escopo do MVP

- App novo em Vue 3, Vite e TypeScript.
- Deploy pela Vercel.
- API serverless em `/api/*` para consultar a SIU Mobile.
- Alerta local enquanto o app estiver aberto.
- Configuração salva no `localStorage`.
- Tratamento específico da linha 8350 Direto/Não Direto.

## Desenvolvimento

```sh
npm install
npm run dev
```

## Testes

```sh
npm run test
npm run build
```

## Deploy

O projeto foi desenhado para Vercel conectada ao GitHub. A Vercel deve usar:

- Build command: `npm run build`
- Output directory: `dist`
- Framework preset: Vite

## Limitação do MVP

As notificações funcionam enquanto o app está aberto. Notificações com o app fechado exigem Web Push, Service Worker e persistência de alertas, que ficaram fora do primeiro corte.
```

- [ ] **Step 2: Run full tests**

Run: `npm run test`

Expected: all tests PASS.

- [ ] **Step 3: Run production build**

Run: `npm run build`

Expected: build PASS.

- [ ] **Step 4: Start dev server for manual check**

Run: `npm run dev -- --host 127.0.0.1 --port 5173`

Expected: Vite prints a local URL at `http://127.0.0.1:5173/`.

- [ ] **Step 5: Manual browser checks**

Open `http://127.0.0.1:5173/` and verify:

- page renders without console-blocking errors;
- settings form accepts stop code, line, variant, and minute threshold;
- notification permission button changes browser permission flow;
- empty state appears before predictions load;
- mobile width does not overlap fields or cards.

- [ ] **Step 6: Stop dev server**

Stop the Vite process with `Ctrl+C`.

- [ ] **Step 7: Commit docs and fixes**

```bash
git add README.md
git commit -m "docs: add project readme"
```

- [ ] **Step 8: Push implementation branch**

Run: `git push origin main`

Expected: GitHub receives all MVP commits.

---

## Self-Review

Spec coverage:

- Refeito do zero: Task 1 scaffolds a new app.
- Vue 3 + Vite + TypeScript: Task 1.
- Vercel serverless API: Task 4.
- SIU Mobile encapsulated behind backend: Tasks 3 and 4.
- JSONP parser: Task 3.
- Normalized predictions: Task 3.
- Alert settings in `localStorage`: Task 5.
- Local browser notifications: Task 5.
- Monitoring loop while app is open: Task 6.
- 8350 Direto/Não Direto rule: Task 2 and Task 3.
- Error states instead of `alert()`: Tasks 4, 5, and 6.
- Tests for parser, normalization, 8350, alert rule, duplicate notification: Tasks 2, 3, and 5.
- README and deploy notes: Task 7.

Placeholder scan:

- No `TBD` or incomplete implementation steps.
- Future items are explicitly outside the MVP and not part of implementation steps.

Type consistency:

- `Prediction`, `AlertSettings`, `BusVariant`, and `BusVariantFilter` are defined once in `src/domain/types.ts`.
- `findAlertMatch`, `classifyBusVariant`, and `matchesVariantFilter` names are consistent across tests and implementations.
- API response shape is consistently `{ predictions: Prediction[] }`.

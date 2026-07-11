# Dashboard Interatividade Base Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Tornar a dashboard parecida com um produto interativo: sidebar funcional, busca de pontos e botão de geolocalização direto no mapa.

**Architecture:** O estado de navegação fica no `App.vue` e é repassado para `AppShell`. A busca fica no topo do shell e seleciona paradas já carregadas. O `MapView` recebe estado e eventos para acionar geolocalização e destacar a parada selecionada.

**Tech Stack:** Vue 3, TypeScript, Vue Test Utils, Vitest, Leaflet.

---

### Task 1: Sidebar com navegação real

**Files:**
- Modify: `src/App.vue`
- Modify: `src/components/AppShell.vue`
- Test: `src/App.test.ts`

- [ ] **Step 1: Write failing tests**

Add tests asserting that clicking `Mapa`, `Favoritos`, `Histórico`, and `Configurações` changes the active view and renders a real section title instead of leaving the screen unchanged.

- [ ] **Step 2: Run test to verify it fails**

Run: `npm run test -- src/App.test.ts`

- [ ] **Step 3: Implement navigation state**

Create an `activeSection` state in `App.vue`; pass it into `AppShell`; emit `navigate` from sidebar/mobile/topbar buttons; render lightweight content panels for non-monitoring sections.

- [ ] **Step 4: Run test to verify it passes**

Run: `npm run test -- src/App.test.ts`

- [ ] **Step 5: Commit**

Commit message: `feat: make dashboard navigation interactive`

### Task 2: Busca funcional de paradas carregadas

**Files:**
- Modify: `src/App.vue`
- Modify: `src/components/AppShell.vue`
- Test: `src/App.test.ts`

- [ ] **Step 1: Write failing tests**

Add a test typing into the top search box and selecting a visible loaded stop. Assert that the app updates `settings.stopCode` and shows the selected stop as monitored.

- [ ] **Step 2: Run test to verify it fails**

Run: `npm run test -- src/App.test.ts`

- [ ] **Step 3: Implement search**

Keep `searchQuery` in `App.vue`, derive matching stops from `nearbyStops`, pass results to `AppShell`, and emit `select-stop` when the user chooses a result.

- [ ] **Step 4: Run test to verify it passes**

Run: `npm run test -- src/App.test.ts`

- [ ] **Step 5: Commit**

Commit message: `feat: add loaded stop search`

### Task 3: Botão de geolocalização no mapa

**Files:**
- Modify: `src/App.vue`
- Modify: `src/components/MapView.vue`
- Modify: `src/style.css`
- Test: `src/App.test.ts`

- [ ] **Step 1: Write failing tests**

Add tests asserting the map renders a geolocation button and clicking it calls `navigator.geolocation.getCurrentPosition`; also assert loading/error labels appear.

- [ ] **Step 2: Run test to verify it fails**

Run: `npm run test -- src/App.test.ts`

- [ ] **Step 3: Implement map control**

Move location UX into `MapView` via props `isLocating` and `locationStatus`, emit `use-current-location`, and update `App.vue` to track locating/error state.

- [ ] **Step 4: Run test to verify it passes**

Run: `npm run test -- src/App.test.ts`

- [ ] **Step 5: Commit**

Commit message: `feat: add map geolocation control`

### Final Verification

- [ ] Run `npm run test`
- [ ] Run `npm run lint`
- [ ] Run `npm run build`
- [ ] Confirm `git status --short --branch` is clean

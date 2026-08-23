# Padrão mobile para “Mostrar pontos” — Plano de Implementação

> **Para agentes de implementação:** use obrigatoriamente `superpowers:subagent-driven-development` (recomendado) ou `superpowers:executing-plans` para executar este plano tarefa por tarefa. Marque cada etapa com caixas de seleção (`- [ ]`).

**Objetivo:** iniciar `Mostrar pontos` desligado em viewports mobile e ligado em desktop, preservando a escolha atual do usuário após redimensionamentos.

**Arquitetura:** um helper puro e testável encapsulará a consulta ao breakpoint CSS de `920px`. `App.vue` continuará sendo o dono do estado e calculará o valor somente na inicialização; `MapView.vue` permanecerá responsável apenas por exibir o valor recebido e emitir toggles.

**Stack:** Vue 3, TypeScript, Vite e Vitest.

---

## Mapa de arquivos

- Criar `src/services/viewport.ts`: constante do breakpoint e helper que decide o valor inicial.
- Criar `src/services/viewport.test.ts`: testes unitários do helper para mobile, desktop e fallback.
- Modificar `src/App.vue:103`: usar o helper em vez de iniciar sempre com `true`.
- Não modificar `src/components/MapView.vue`: o componente já recebe `showNearbyStops` e mantém o estado fornecido pelo pai.

## Tarefa 1: escrever os testes que falham

**Arquivos:**

- Criar: `src/services/viewport.test.ts`

- [ ] **Etapa 1: adicionar os casos de comportamento**

Criar testes que injetem uma função `matchMedia`, evitando dependência do suporte do jsdom:

```ts
import { describe, expect, it } from 'vitest';

import { getInitialShowNearbyStops } from './viewport';

describe('getInitialShowNearbyStops', () => {
  it('desliga Mostrar pontos em viewport mobile', () => {
    expect(getInitialShowNearbyStops(() => ({ matches: true }))).toBe(false);
  });

  it('liga Mostrar pontos em viewport desktop', () => {
    expect(getInitialShowNearbyStops(() => ({ matches: false }))).toBe(true);
  });

  it('liga Mostrar pontos quando matchMedia não está disponível', () => {
    expect(getInitialShowNearbyStops()).toBe(true);
  });
});
```

- [ ] **Etapa 2: executar os testes para confirmar a falha**

Executar:

```sh
npm run test -- src/services/viewport.test.ts
```

Resultado esperado: falha de TypeScript/Vitest porque `src/services/viewport.ts` ainda não existe e `getInitialShowNearbyStops` não pode ser importado.

## Tarefa 2: implementar o helper mínimo

**Arquivos:**

- Criar: `src/services/viewport.ts`

- [ ] **Etapa 1: adicionar a constante e o helper**

Implementar:

```ts
export const MOBILE_BREAKPOINT = 920;

type MatchMedia = (query: string) => { matches: boolean };

export function getInitialShowNearbyStops(matchMedia?: MatchMedia): boolean {
  if (!matchMedia) {
    return true;
  }

  return !matchMedia(`(max-width: ${MOBILE_BREAKPOINT}px)`).matches;
}
```

O helper recebe a dependência opcionalmente para ser determinístico nos testes. A ausência de `matchMedia` usa `true` como fallback seguro.

- [ ] **Etapa 2: executar os testes unitários**

Executar:

```sh
npm run test -- src/services/viewport.test.ts
```

Resultado esperado: os três testes passam.

## Tarefa 3: conectar o helper ao estado de `App.vue`

**Arquivos:**

- Modificar: `src/App.vue:1-105`

- [ ] **Etapa 1: importar o helper**

Adicionar ao bloco de imports:

```ts
import { getInitialShowNearbyStops } from './services/viewport';
```

- [ ] **Etapa 2: calcular o valor inicial somente uma vez**

Substituir:

```ts
const showNearbyStops = ref(true);
```

por:

```ts
const showNearbyStops = ref(
  getInitialShowNearbyStops(
    typeof window === 'undefined' ? undefined : window.matchMedia.bind(window),
  ),
);
```

Não adicionar listener de `resize`: o valor deve continuar estável depois da inicialização e preservar a decisão do usuário.

- [ ] **Etapa 3: rodar a suíte de testes**

Executar:

```sh
npm run test
```

Resultado esperado: todos os testes existentes e os novos passam, incluindo os testes de `MapView` para emissão do toggle e ocultação das paradas próximas.

## Tarefa 4: verificar tipos, build e escopo do diff

**Arquivos:**

- Verificar: `src/services/viewport.ts`, `src/services/viewport.test.ts`, `src/App.vue`

- [ ] **Etapa 1: validar lint/tipos**

Executar:

```sh
npm run lint
```

Resultado esperado: `vue-tsc --noEmit` termina com código `0`.

- [ ] **Etapa 2: validar build**

Executar:

```sh
npm run build
```

Resultado esperado: a checagem de tipos e o build Vite terminam com código `0`.

- [ ] **Etapa 3: conferir que mudanças não relacionadas ficaram intactas**

Executar:

```sh
git status --short
git diff -- src/App.vue src/services/viewport.ts src/services/viewport.test.ts
```

Confirmar que somente os arquivos da tarefa foram alterados além das mudanças pré-existentes do usuário (`backlog.md` e arquivos não rastreados).

- [ ] **Etapa 4: commit da implementação**

```sh
git add src/App.vue src/services/viewport.ts src/services/viewport.test.ts
git commit -m "feat: desativar pontos por padrão no mobile"
```

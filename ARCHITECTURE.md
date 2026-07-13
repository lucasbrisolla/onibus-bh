# Arquitetura do Ônibus BH

## Objetivo

O **Ônibus BH** é um app web para acompanhar ônibus de Belo Horizonte usando a API do SIU Mobile BH. O fluxo principal é:

1. encontrar uma parada no mapa;
2. selecionar a parada;
3. ver endereço e código público;
4. consultar próximos ônibus;
5. acompanhar rota e posição do ônibus selecionado.

## Stack

- Vue 3
- Vite
- TypeScript
- Leaflet
- Vitest
- Vercel Functions em `api/`
- Node.js `>=20`

## Fluxo de dados

```text
UI Vue
  ↓
src/services/apiClient.ts
  ↓
/api/* ou middleware local do Vite
  ↓
src/server/siuClient.ts
  ↓
SIU Mobile BH
  ↓
src/server/normalizers.ts
  ↓
tipos de domínio e UI
```

## Estrutura principal

```text
api/
  health.ts
  linhas.ts
  paradas/[cod]/previsoes.ts
  paradas/proximas.ts
  itinerarios/[cod]/index.ts
  itinerarios/[cod]/veiculos.ts

src/
  components/
  domain/
  server/
  services/
  App.vue
  style.css
```

## Camadas

### `src/domain/`

Regras puras e tipos compartilhados.

- `alertRules.ts`: lógica de disparo de alerta.
- `busVariant.ts`: classificação de variantes, com regra especial para a linha `8350`.
- `types.ts`: contratos internos.

### `src/server/`

Código server-side compartilhado entre Vercel e ambiente local.

- `siuClient.ts`: chamadas à SIU.
- `jsonp.ts`: parsing de respostas SIU.
- `normalizers.ts`: adaptação para tipos internos.
- `localApiRouter.ts`: suporte a `/api/*` no `npm run dev`.
- `errors.ts`: tratamento padronizado de erro.

### `api/`

Funções serverless para produção.

O browser deve sempre consumir `/api/*`, nunca a SIU diretamente.

### `src/services/`

Serviços do frontend.

- `apiClient.ts`: cliente HTTP do app.
- `mapDataService.ts`: seleção de itinerário, rota, veículos e leitura do ônibus selecionado.
- `notificationService.ts`: Notification API.
- `settingsStore.ts`: persistência em `localStorage`.

### `src/components/`

Composição da interface.

- `AppShell.vue`: sidebar, topbar e navegação.
- `MapView.vue`: mapa Leaflet, marcadores e trajetória.
- `MonitoringPanel.vue`: monitoramento, previsões e status.
- `MobileBottomSheet.vue`: versão mobile do painel.
- `PredictionCards.vue`: lista resumida de próximos ônibus.

## Regras de domínio importantes

### Paradas: `cod` e `siu`

A SIU retorna:

- `cod`: identificador interno usado em previsões;
- `siu`: código público mostrado ao usuário.

Regra:

- buscar previsões com `cod`;
- exibir `siu` e descrição na UI.

### Linha `8350`

A linha `8350` tem tratamento específico para classificação de variante, usado nas regras de monitoramento.

## Ambiente local

Durante `npm run dev`, o projeto depende de:

- `src/server/localApiRouter.ts`
- `vite.config.ts`

Esse middleware local não deve ser removido sem reposição equivalente.

## Mapa

O `MapView.vue` recebe:

- parada monitorada;
- paradas próximas;
- estado de exibição das paradas próximas;
- rota atual;
- veículos do itinerário;
- localização do usuário;
- ônibus selecionado.

Comportamentos arquiteturais relevantes:

- clicar em parada troca a parada monitorada;
- clicar em card de previsão seleciona um ônibus específico;
- quando há seleção, o mapa prioriza somente o ônibus selecionado;
- o usuário pode ocultar paradas próximas sem ocultar a parada monitorada;
- o ajuste automático de viewport não deve ocorrer a cada polling.
- o modo claro usa CartoDB Voyager e o modo escuro usa CartoDB Dark Matter.
- a rota é renderizada em duas camadas Leaflet: base roxa contínua e traço interno sutil animado.

## Interface mobile

O `MobileBottomSheet.vue` usa três estados internos:

- `peek`: alça recolhida;
- `half`: painel intermediário;
- `full`: painel expandido.

Gestos verticais movem o painel um nível por vez. O mapa também expõe controles compactos para mostrar/ocultar pontos e alternar o modo escuro no mobile.

## Normalização visual de textos

Alguns textos vindos da SIU chegam em caixa alta. A normalização visual para caixa normal acontece na camada de apresentação, sem alterar os dados brutos usados por seleção, polling ou regras de domínio.

## Deploy

O deploy é orientado a Vercel com build Vite.

Ponto importante:

- imports server-side usados no runtime ESM da Vercel devem permanecer compatíveis com Node.js moderno.

## Referência complementar

Para decisões estáveis de produto e comportamento, consultar:

```text
docs/decisions.md
```

# Arquitetura do Ônibus BH

## Objetivo do app

O **Ônibus BH** é um app web para acompanhar ônibus de Belo Horizonte usando a API do SIU Mobile BH. A experiência principal é:

1. encontrar uma parada no mapa;
2. clicar na parada;
3. ver a rua/código do ponto;
4. carregar os próximos ônibus daquela parada;
5. acompanhar rota, veículos e alerta de chegada.

O produto está sendo construído como web app responsivo, com possibilidade de virar PWA depois.

## Stack atual

- Vue 3
- Vite
- TypeScript
- Leaflet
- Vitest
- Vercel Functions em `api/`
- API SIU Mobile BH via proxy backend/local

Runtime esperado:

```sh
node >=20
```

## Estado atual do branch

Branch de trabalho:

```text
feat/nucleo-mapa
```

Worktree atual:

```text
/home/lucas/.config/superpowers/worktrees/onibus-bh/nucleo-mapa
```

O checkout principal informado pelo usuário é:

```text
/home/lucas/onibus-bh
```

Antes de continuar, conferir onde está o branch:

```sh
git worktree list
git status --short --branch
```

## Fluxo de dados principal

```text
Usuário
  ↓
App Vue
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
UI: painel, mapa, previsões, rota e veículos
```

## API SIU Mobile BH

Base atual:

```text
http://bhz.siumobile.com.br:6060/siumobiletacomapp/siumobile-ws-v01/rest/ws
```

Endpoints usados:

```text
/V3/buscarPrevisoes/{cod}/false/0/BHZ/retornoJSON
/V3/buscarParadasProximas/{lng}/{lat}/0/BHZ/retornoJSONH
/V3/buscarItinerario/{codItinerario}/0/BHZ/retornoJSONItinerario
/V3/retornaVeiculosMapa/{codItinerario}/0/BHZ/retornoJSONVeiculos
```

As respostas vêm em JSONP-like. O parser fica em:

```text
src/server/jsonp.ts
```

## Código da parada: ponto crítico

A SIU retorna dois identificadores para paradas próximas:

- `cod`: código interno usado para buscar previsões;
- `siu`: código público/visível para o usuário.

Exemplo real:

```json
{
  "cod": 13566,
  "siu": "40134",
  "desc": "ROD ANEL RODOVIARIO CELSO MELLO AZEVEDO, 11749"
}
```

Para buscar previsões, usar o `cod`:

```text
/V3/buscarPrevisoes/13566/false/0/BHZ/retornoJSON
```

Na UI, mostrar o `siu` quando existir, porque ele é mais familiar para o usuário.

## Estrutura de pastas

```text
api/
  health.ts
  linhas.ts
  paradas/[cod]/previsoes.ts
  paradas/proximas.ts
  itinerarios/[cod]/index.ts
  itinerarios/[cod]/veiculos.ts

src/
  domain/
    alertRules.ts
    busVariant.ts
    types.ts

  server/
    errors.ts
    jsonp.ts
    localApiRouter.ts
    normalizers.ts
    siuClient.ts

  services/
    apiClient.ts
    mapDataService.ts
    notificationService.ts
    settingsStore.ts

  components/
    AppShell.vue
    MapView.vue
    MobileBottomSheet.vue
    MonitoringPanel.vue
    PredictionCards.vue

  App.vue
  style.css
```

## Camadas

### `src/domain/`

Regras puras, sem browser e sem rede.

- `alertRules.ts`: decide se uma previsão deve notificar.
- `busVariant.ts`: classifica a linha 8350 em Direto/Não Direto.
- `types.ts`: tipos compartilhados.

### `src/server/`

Código de backend compartilhado por Vercel Functions e pelo middleware local do Vite.

- `siuClient.ts`: chama a API SIU.
- `jsonp.ts`: extrai JSON de respostas JSONP-like.
- `normalizers.ts`: transforma payload SIU em tipos internos.
- `localApiRouter.ts`: simula `/api/*` no `npm run dev`.
- `errors.ts`: erros HTTP padronizados.

### `api/`

Funções serverless para produção/Vercel.

O navegador não deve chamar SIU diretamente. Sempre passar por `/api/*`.

### `src/services/`

Serviços do frontend.

- `apiClient.ts`: chama `/api/*` no browser.
- `mapDataService.ts`: escolhe itinerário e carrega rota/veículos.
- `notificationService.ts`: Notification API.
- `settingsStore.ts`: persistência em `localStorage`.

### `src/components/`

UI Vue.

- `AppShell.vue`: layout, sidebar, topbar e busca.
- `MapView.vue`: Leaflet, pontos, rota, veículos, localização e clique em parada.
- `MonitoringPanel.vue`: configurações, status, ponto selecionado e previsões.
- `MobileBottomSheet.vue`: painel mobile.
- `PredictionCards.vue`: cards dos próximos ônibus.

## Mapa

O mapa usa Leaflet e tiles Carto:

```text
https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png
```

O `MapView.vue` recebe:

- `monitoredStop`
- `nearbyStops`
- `route`
- `vehicles`
- `userLocation`
- `isLocating`
- `locationStatus`

Eventos emitidos:

- `selectStop`
- `useCurrentLocation`

Ao clicar em uma parada:

1. `MapView` emite `selectStop(stop)`;
2. `App.vue` salva `stop.code` em `settings.stopCode`;
3. o painel mostra `stop.publicCode` e `stop.description`;
4. o app força `pollPredictions({ force: true })`;
5. as previsões aparecem em `PredictionCards`.

## Dev local e `/api/*`

Importante: Vite puro não executa Vercel Functions. Para evitar erro em desenvolvimento, o projeto tem middleware local em:

```text
src/server/localApiRouter.ts
vite.config.ts
```

Assim, `npm run dev` consegue responder rotas como:

```text
/api/paradas/13566/previsoes
/api/paradas/proximas?lat=-19%2E916342&lng=-43%2E993759
/api/itinerarios/53564
/api/itinerarios/53564/veiculos
```

## Coordenadas e bug do Vite/esbuild

O Vite/esbuild pode interpretar coordenadas decimais na URL de forma errada se o ponto `.` aparecer cru em alguns contextos.

Por isso `fetchNearbyStops()` codifica `.` como `%2E`:

```text
-19.916342 → -19%2E916342
```

Não remover essa proteção sem testar em `npm run dev`.

## Atualização automática

Estado atual:

```ts
const POLL_INTERVAL_MS = 45_000;
```

Pedido pendente do usuário:

```text
trocar para 5 segundos
```

Ao implementar:

- trocar para `5_000`;
- atualizar textos que dizem “a cada 45s”;
- verificar se não há requisições concorrentes;
- manter a proteção `isPolling`.

## Ícones do mapa

Estado atual:

- paradas comuns usam um SVG inline de parada/ônibus em `MapView.vue`;
- parada selecionada usa o mesmo ícone com destaque laranja;
- veículos ainda usam marcador com `Ô`;
- localização do usuário usa marcador azul.

Pedido visual em andamento:

- melhorar os ícones para substituir completamente a aparência de “bolas pretas”;
- o usuário pediu para testar um ícone por vez.

Último ajuste feito:

```text
cc595ca fix: replace stop marker dots with icon
```

## Testes

Suíte atual validada:

```sh
npm run test
npm run lint
npm run build
```

Última validação conhecida:

- 64 testes passando;
- typecheck ok;
- build ok.

Arquivos de teste importantes:

- `src/App.test.ts`
- `src/components/MapView.test.ts`
- `src/server/localApiRouter.test.ts`
- `src/server/normalizers.test.ts`
- `src/services/apiClient.test.ts`
- `src/services/mapDataService.test.ts`

## Próximos passos recomendados

1. Testar visualmente o ícone atual no navegador.
2. Se aprovado, criar os demais ícones:
   - veículo;
   - localização;
   - parada selecionada mais destacada.
3. Trocar atualização automática para 5 segundos.
4. Melhorar histórico/favoritos, que ainda são seções placeholder.
5. Depois considerar PWA e notificações mais robustas.

## Checklist rápido para retomar

```sh
cd /home/lucas/.config/superpowers/worktrees/onibus-bh/nucleo-mapa
git status --short --branch
npm run test
npm run lint
npm run build
npm run dev
```

Se quiser continuar a partir do checkout principal:

```sh
cd /home/lucas/onibus-bh
git worktree list
```

Então decidir se vai:

- continuar no worktree `feat/nucleo-mapa`;
- mergear o branch para `main`;
- abrir PR.

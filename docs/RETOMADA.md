# Retomada do projeto Ônibus BH

## Situação atual

O projeto deve seguir pela branch principal:

```text
main
```

Checkout principal:

```text
/home/lucas/onibus-bh
```

O trabalho que antes estava no worktree `feat/nucleo-mapa` foi trazido para a `main`.

Antes de continuar:

```sh
cd /home/lucas/onibus-bh
git status --short --branch
```

## Leia primeiro

Documentos principais:

```text
AGENTS.md
docs/ARCHITECTURE.md
docs/RETOMADA.md
```

`docs/ARCHITECTURE.md` é a fonte mais completa sobre arquitetura, APIs, fluxo do mapa e próximos passos.

## O que já existe

- App Vue 3 + Vite + TypeScript.
- Dashboard responsiva com sidebar escura.
- Mapa Leaflet como núcleo da experiência.
- Pontos/paradas no mapa.
- Clique em ponto seleciona a parada.
- Painel mostra código público e rua da parada selecionada.
- Clique em parada busca previsões daquela parada.
- Busca de paradas carregadas pela topbar.
- Geolocalização.
- Marcador “Você está aqui”.
- Rota e veículos quando há `codItinerario`.
- API Vercel em `api/`.
- Middleware local do Vite para `/api/*`.
- Parser JSONP e normalizadores SIU.
- Regras de alerta e variantes da linha 8350.
- Notification API básica enquanto o app está aberto.
- Testes unitários.

## Última validação conhecida

Antes do merge para `main`, após o commit `cc595ca fix: replace stop marker dots with icon`:

```sh
npm run test
npm run lint
npm run build
```

Resultado:

- 64 testes passando;
- typecheck passando;
- build passando.

Depois foram adicionados commits de documentação:

```text
ed34726 docs: add architecture and agent handoff
38d43ad docs: refresh handoff notes
```

Depois do merge para `main`, rode novamente validação antes de continuar trabalho funcional.

## Commits recentes importantes

```text
38d43ad docs: refresh handoff notes
ed34726 docs: add architecture and agent handoff
cc595ca fix: replace stop marker dots with icon
c071d52 feat: add pilot stop map icon
d338403 fix: show selected stop details and local api
f6a8fd0 fix: load stop predictions from map markers
00af353 fix: encode nearby stop coordinates
27c0e0a feat: make dashboard controls interactive
027e371 feat: show map stops by default
e7732a4 feat: build monitoring dashboard
054d34f feat: add leaflet map view
```

## Ponto crítico: `cod` versus `siu`

A SIU retorna dois identificadores de parada:

- `cod`: código interno usado para buscar previsões;
- `siu`: código público/visível ao usuário.

Exemplo real:

```json
{
  "cod": 13566,
  "siu": "40134",
  "desc": "ROD ANEL RODOVIARIO CELSO MELLO AZEVEDO, 11749"
}
```

Para buscar previsão, usar `cod`:

```text
/V3/buscarPrevisoes/13566/false/0/BHZ/retornoJSON
```

Na UI:

- salvar/consultar com `cod`;
- mostrar `siu` e `desc`.

## Coordenada de referência

```text
lat=-19.916342
lng=-43.993759
```

Paradas próximas observadas:

- `cod: 11073`, `siu: 40135`
- `cod: 13566`, `siu: 40134`

Previsões testadas:

- `cod: 13566`: retornou `6350`, `8151`, `8350`.
- `cod: 11073`: retornou `4501`, `6350`, `8151`, `8350`.

## Dev local

Rodar:

```sh
cd /home/lucas/onibus-bh
npm run dev
```

O Vite deve servir em:

```text
http://127.0.0.1:5173/
```

Se escolher outra porta, usar a porta do terminal.

Importante: Vite puro não executa Vercel Functions por padrão. O projeto tem middleware local:

```text
src/server/localApiRouter.ts
vite.config.ts
```

Ele responde `/api/*` durante `npm run dev`.

## Bug já corrigido: coordenadas no Vite

`fetchNearbyStops()` codifica pontos decimais como `%2E`:

```text
-19.916342 → -19%2E916342
```

Isso evita erro do Vite/esbuild com loader derivado de casas decimais.

Não remover sem testar `npm run dev`.

## Arquivos principais

- `src/App.vue`
- `src/components/AppShell.vue`
- `src/components/MapView.vue`
- `src/components/MonitoringPanel.vue`
- `src/components/MobileBottomSheet.vue`
- `src/components/PredictionCards.vue`
- `src/services/apiClient.ts`
- `src/services/mapDataService.ts`
- `src/server/siuClient.ts`
- `src/server/localApiRouter.ts`
- `src/server/normalizers.ts`
- `src/domain/types.ts`
- `src/domain/alertRules.ts`
- `src/domain/busVariant.ts`
- `api/paradas/[cod]/previsoes.ts`
- `api/paradas/proximas.ts`
- `api/itinerarios/[cod]/index.ts`
- `api/itinerarios/[cod]/veiculos.ts`

## Testes importantes

- `src/App.test.ts`
- `src/components/MapView.test.ts`
- `src/server/localApiRouter.test.ts`
- `src/server/normalizers.test.ts`
- `src/services/apiClient.test.ts`
- `src/services/mapDataService.test.ts`

## Pendências atuais

1. Trocar atualização automática para 5 segundos.
   - Estado atual: `POLL_INTERVAL_MS = 45_000`.
   - Pedido do usuário: `5_000`.
   - Atualizar textos que dizem “45s”.

2. Continuar refinamento de ícones.
   - O usuário quer substituir bolas pretas por ícones.
   - Paradas comuns e parada selecionada já usam SVG de parada.
   - Veículos/localização ainda podem melhorar.
   - Testar um ícone por vez.

3. Favoritos e histórico ainda são placeholders.

4. PWA ainda não implementado.

5. Notificações mobile/browser ainda são básicas.

## Como retomar

```sh
cd /home/lucas/onibus-bh
git status --short --branch
npm run test
npm run lint
npm run build
npm run dev
```

Depois testar visualmente:

- mapa carrega;
- pontos aparecem;
- clicar em ponto mostra rua/código;
- previsões aparecem no painel;
- geolocalização mostra “Você está aqui”;
- ícone de parada substitui a bolinha preta.

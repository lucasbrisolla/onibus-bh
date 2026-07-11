# Instruções para agentes

## Comunicação

- Responder em PT-BR.
- Preservar acentuação gráfica em arquivos Markdown.
- Todo output direcionado ao usuário deve começar com `.` para facilitar identificação de context drifting.
- Ser direto, mas manter contexto suficiente para retomada por outro agente.
- Ao informar status, citar evidência concreta: comando executado, teste passado, arquivo alterado ou commit.

## Contexto do projeto

Este repositório contém o novo app **Ônibus BH**, um web app para acompanhar ônibus de Belo Horizonte usando a API do SIU Mobile BH.

Objetivo de produto:

- encontrar paradas no mapa;
- clicar em uma parada;
- ver rua/código do ponto;
- carregar próximos ônibus daquela parada;
- acompanhar rota/veículos;
- futuramente virar PWA e notificar melhor no celular/browser.

Referência visual principal: dashboard com sidebar escura, mapa dominante, marcadores visuais e painel de monitoramento responsivo.

## Estado importante da sessão atual

O trabalho mais recente está no branch:

```text
feat/nucleo-mapa
```

Worktree usado:

```text
/home/lucas/.config/superpowers/worktrees/onibus-bh/nucleo-mapa
```

Checkout principal informado pelo usuário:

```text
/home/lucas/onibus-bh
```

Antes de retomar, sempre conferir:

```sh
git worktree list
git status --short --branch
```

## Documentação de arquitetura

Leia primeiro:

```text
docs/ARCHITECTURE.md
```

Esse arquivo contém:

- fluxo de dados;
- estrutura de pastas;
- endpoints SIU;
- detalhes do mapa;
- diferença entre `cod` e `siu`;
- middleware local do Vite;
- próximos passos.

## Stack

- Vue 3
- Vite
- TypeScript
- Leaflet
- Vitest
- Vercel Functions em `api/`
- Node.js `>=20`

## Comandos úteis

```sh
npm install
npm run dev
npm run test
npm run lint
npm run build
```

Validação completa antes de dizer que algo está pronto:

```sh
npm run test
npm run lint
npm run build
```

## Estrutura principal

```text
api/
  paradas/[cod]/previsoes.ts
  paradas/proximas.ts
  itinerarios/[cod]/index.ts
  itinerarios/[cod]/veiculos.ts

src/domain/
  alertRules.ts
  busVariant.ts
  types.ts

src/server/
  siuClient.ts
  jsonp.ts
  normalizers.ts
  localApiRouter.ts
  errors.ts

src/services/
  apiClient.ts
  mapDataService.ts
  notificationService.ts
  settingsStore.ts

src/components/
  AppShell.vue
  MapView.vue
  MonitoringPanel.vue
  MobileBottomSheet.vue
  PredictionCards.vue
```

## Regras críticas do domínio

### Paradas: `cod` versus `siu`

A SIU retorna:

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

Para previsões, usar `cod`:

```text
/V3/buscarPrevisoes/13566/false/0/BHZ/retornoJSON
```

Na UI, mostrar `siu` e `desc`.

### Linha 8350

A linha `8350` tem variantes importantes:

- Direto;
- Não Direto;
- Qualquer.

O alerta deve respeitar o filtro de variante configurado.

## API e ambiente local

Não chamar a SIU diretamente do browser. Usar `/api/*`.

Em produção, `/api/*` vem das Vercel Functions em `api/`.

Em desenvolvimento com `npm run dev`, Vite não executa Vercel Functions por padrão. O projeto já tem middleware local:

```text
src/server/localApiRouter.ts
vite.config.ts
```

Não remover esse middleware sem substituir por outro fluxo local.

## Bug conhecido já corrigido: coordenadas no Vite

`fetchNearbyStops()` codifica pontos decimais como `%2E` para evitar erro do Vite/esbuild com URLs de coordenadas.

Exemplo:

```text
-19.916342 → -19%2E916342
```

Não desfazer sem testar `npm run dev`.

## Estado atual de features

Já existe:

- dashboard responsiva com sidebar;
- mapa Leaflet;
- pontos/paradas no mapa;
- clique em ponto seleciona parada;
- painel mostra código público e rua do ponto selecionado;
- busca de paradas carregadas;
- geolocalização;
- marcador “Você está aqui”;
- endpoint de paradas próximas;
- endpoint de previsões;
- endpoint de rota;
- endpoint de veículos;
- middleware local para `/api/*`;
- alertas/notificações básicas enquanto o app está aberto.

Ainda incompleto/pendente:

- atualização automática deve mudar para 5 segundos;
- ícones de mapa ainda estão em iteração visual;
- favoritos e histórico ainda são placeholders;
- PWA ainda não implementado;
- notificação mobile robusta ainda não implementada.

## Ícones do mapa

O usuário pediu para substituir “bolas pretas” por ícones melhores.

Último estado:

- paradas comuns usam SVG inline em `MapView.vue`;
- parada selecionada usa o mesmo ícone com destaque laranja;
- veículos ainda usam marcador simples com `Ô`;
- localização usa marcador azul.

Importante: o usuário pediu para testar um ícone por vez. Não trocar todos os ícones de uma vez sem confirmar.

Últimos commits relevantes:

```text
cc595ca fix: replace stop marker dots with icon
c071d52 feat: add pilot stop map icon
d338403 fix: show selected stop details and local api
f6a8fd0 fix: load stop predictions from map markers
```

## Polling

Estado atual no código:

```ts
const POLL_INTERVAL_MS = 45_000;
```

Pedido do usuário:

```text
atualização a cada 5 segundos
```

Ao implementar:

- trocar para `5_000`;
- atualizar textos que dizem “45s”;
- manter proteção contra requisições concorrentes (`isPolling`);
- rodar testes.

## Cuidados ao editar

- Usar `apply_patch` para alterações manuais.
- Não commitar `node_modules/` ou `dist/`.
- Não usar `alert()` na UI.
- Preferir testes antes de alterar comportamento.
- Ao mexer em polling/notificação, proteger contra respostas obsoletas e requisições concorrentes.
- Ao mexer em mapa, testar `MapView.test.ts` e `App.test.ts`.
- Ao mexer em SIU/API, testar `normalizers`, `apiClient` e `localApiRouter`.

## Retomada rápida

```sh
cd /home/lucas/.config/superpowers/worktrees/onibus-bh/nucleo-mapa
git status --short --branch
npm run test
npm run lint
npm run build
npm run dev
```

Depois abrir:

```text
http://127.0.0.1:5173/
```

Se o Vite escolher outra porta, usar a porta mostrada no terminal.

# Retomada do projeto Ônibus BH

## Contexto rápido

- Branch atual: `main`
- Diretório: `/home/lucas/onibus-bh`

Antes de continuar:

```sh
cd /home/lucas/onibus-bh
git status --short --branch
```

## Ler primeiro

1. `README.md`
2. `RETOMADA.md`
3. `ARCHITECTURE.md`
4. `DESIGN.md`

## O que está funcionando

- dashboard responsiva com sidebar e topbar;
- mapa Leaflet com tema claro/escuro;
- seleção de parada pelo mapa ou busca;
- cards de previsão com seleção de ônibus específico;
- rota e posição do ônibus selecionado no mapa;
- filtro visual para mostrar apenas o ônibus clicado;
- geolocalização com marcador no mapa;
- endpoints locais e serverless em `/api/*`;
- alertas básicos com `localStorage` e Notification API.

## Estado atual da interface

- sidebar e dark mode usam paleta teal;
- mapa troca tiles no dark mode;
- badge principal do mapa mostra linha e minutos, como `8350 - 2 min`;
- box textual de `Sua posição` foi removido;
- viewport do mapa não deve mais dar zoom out a cada atualização.

## Próximos passos sugeridos

1. revisar favoritos e histórico, que ainda são placeholders;
2. validar build e fluxo de deploy na Vercel após os ajustes recentes;
3. evoluir PWA e notificações com app em segundo plano;
4. reduzir complexidade de `App.vue` se continuar crescendo.

## Validação recomendada

```sh
npm run test
npm run lint
npm run build
```

## Arquivos mais sensíveis

- `src/App.vue`
- `src/components/MapView.vue`
- `src/components/MonitoringPanel.vue`
- `src/services/mapDataService.ts`
- `src/server/localApiRouter.ts`
- `src/server/normalizers.ts`

## Observações de domínio

- previsões usam `cod` da parada;
- UI mostra `siu` quando existir;
- a linha `8350` continua com tratamento específico.

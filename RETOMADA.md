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
- bottom sheet mobile com estados `peek`, `half` e `full`;
- toggles compactos no mapa para mostrar pontos e alternar modo escuro no mobile;
- endpoints locais e serverless em `/api/*`;
- transporte JSONP da SIU separado das operações, com timeout, parsing e erros upstream centralizados;
- alertas básicos com `localStorage` e Notification API.

## Estado atual da interface

- sidebar e dark mode usam paleta teal;
- mapa usa uma política compartilhada: CARTO Voyager/Dark Matter quando VITE_CARTO_API_KEY está configurada e OpenStreetMap como fallback sem marca d’água;
- os dois mapas reutilizam `src/components/mapLifecycle.ts` para montagem, resize, tema e desmontagem do Leaflet;
- o catálogo de pontos Ótimo/RMBH usa `src/services/mobilibusCatalog.ts` para cache, concorrência, estados e seleção;
- FAB de localização usa teal;
- marcadores de parada invertem contraste no dark mode;
- badge principal do mapa mostra linha e minutos, como `8350 - 2 min`;
- cards de previsão não exibem `vehicleId` nem `Chegando`;
- descrições em caixa alta vindas da SIU são normalizadas visualmente para caixa normal;
- rota do ônibus usa linha roxa contínua com traço interno translúcido animado;
- box textual de `Sua posição` foi removido;
- viewport do mapa não deve mais dar zoom out a cada atualização.

## Próximos passos sugeridos

1. implementar o histórico de alertas; favoritos municipais e Ótimo/RMBH já estão persistidos localmente;
2. validar o deploy real na Vercel e conferir a paridade das rotas `/api/*`; a build local já está validada;
3. evoluir o PWA com Service Worker e notificações em segundo plano usando Web Push;
4. reavaliar a decomposição de `App.vue` se o arquivo voltar a crescer; as regras principais já estão nos módulos de monitoramento, seleção e catálogo.

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
- a linha `8350` continua com tratamento específico;
- a classificação da `8350` reconhece `Direto` e `Direta`;
- previsões programadas por horário de saída precisam ter ids únicos por horário.

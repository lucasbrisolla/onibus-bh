# Recomendações de stack

**Data:** 27 de setembro de 2026  
**Status:** adoção gradual em andamento

## Resumo executivo

O projeto já tem uma base coerente com Vue 3, Vite, TypeScript, Leaflet e funções da Vercel. O maior gargalo atual não é o framework HTTP: é a quantidade de estado remoto, cache, polling e sincronização implementada manualmente.

As três evoluções com maior potencial são:

1. **TanStack Query + Zod** para estado remoto e contratos de resposta.
2. **Nuxt 4 + Nitro + Tailwind** para consolidar frontend e backend quando a aplicação crescer.
3. **Drizzle ORM + PostgreSQL serverless** para transformar preferências locais em dados persistentes e multiusuário.

Não é recomendável instalar as três frentes ao mesmo tempo. A ordem deve acompanhar a necessidade do produto.

## 1. TanStack Query + Zod

### Problema atual

O [predictionMonitor](../src/services/predictionMonitor.ts#L140) implementa manualmente polling, agendamento, requisição ativa, proteção contra respostas antigas, estados de carregamento e atualização em foco. O [mobilibusCatalog](../src/services/mobilibusCatalog.ts#L77) também mantém cache por tile, deduplicação e controle de concorrência.

Além disso, o [apiClient](../src/services/apiClient.ts#L54) transforma respostas JSON usando casts genéricos. Isso fornece tipagem no código, mas não valida o formato real recebido em runtime.

### O que a stack entrega

O TanStack Query para Vue concentra fetching, cache, sincronização, atualização em background e deduplicação de estado remoto. A documentação oficial destaca que a biblioteca reduz a necessidade de código próprio para esses ciclos: [TanStack Query para Vue](https://tanstack.com/query/latest/docs/framework/vue/overview).

O Zod deve validar respostas na fronteira da API antes que elas entrem no domínio da aplicação.

### Ganho esperado

- Menos código de polling e cache.
- Estados de loading, erro e atualização mais consistentes.
- Menos requisições duplicadas.
- Melhor aproveitamento dos dados entre mapa, painel e cards.
- Contratos de resposta detectados em runtime.

### Estratégia de adoção

1. Configurar um `QueryClient` único.
2. Migrar previsões da parada.
3. Migrar rota e veículos.
4. Migrar pontos e partidas Mobilibus.
5. Remover gradualmente o polling próprio do `predictionMonitor`.

As regras de alerta, seleção de previsão e notificações continuam no domínio. O TanStack Query deve cuidar do estado remoto, não substituir as regras de negócio.

### Primeira fatia implementada

- `@tanstack/vue-query` foi instalado e o plugin foi registrado em [main.ts](../src/main.ts#L1).
- O cliente compartilhado e suas políticas ficam em [queryClient.ts](../src/services/queryClient.ts#L1).
- A consulta de previsões usa `queryClient.fetchQuery` por meio de [queryOptions.ts](../src/services/queryOptions.ts#L1).
- O `predictionMonitor` continua responsável pelo polling de 10 segundos e pelas regras de alerta nesta primeira etapa. Com `staleTime` igual a zero, cada refresh explícito consulta a fonte, enquanto o QueryClient ainda deduplica chamadas simultâneas e conserva a resposta mais recente.

O próximo corte deve migrar rota e veículos para o mesmo padrão. Depois disso, poderemos retirar responsabilidades equivalentes do monitor e do catálogo sem misturar cache remoto com regras de negócio.

## 2. Nuxt 4 + Nitro + Tailwind

### Problema atual

O projeto possui páginas e seções coordenadas manualmente em [App.vue](../src/App.vue#L397), funções serverless em `api/`, um adaptador Vercel e um middleware local específico em [vite.config.ts](../vite.config.ts#L11). O dispatcher compartilhado em [apiContractDispatcher.ts](../src/server/apiContractDispatcher.ts#L152) precisa interpretar as rotas manualmente.

### O que a stack entrega

O Nuxt usa Nitro como camada de servidor. Nitro oferece endpoints, middleware, configuração de runtime, deploy em diferentes ambientes e regras híbridas de renderização no mesmo projeto. A documentação oficial também lista Vercel como preset suportado: [servidor Nuxt/Nitro](https://nuxt.com/docs/4.x/getting-started/server) e [deploy do Nuxt](https://nuxt.com/docs/4.x/getting-started/deployment).

### Ganho esperado

- Convenções de páginas e rotas.
- Menos configuração própria entre Vite, Vercel e desenvolvimento local.
- Frontend e API no mesmo modelo de execução.
- Caminho preparado para SSR, cache e páginas híbridas.
- Melhor organização quando o produto deixar de ser uma única tela coordenada por `App.vue`.

### Riscos e estratégia

Essa é a maior migração das três. O Leaflet e o mapa precisam continuar client-only para evitar problemas de SSR e hidratação. A migração deve começar com uma prova de conceito pequena, inicialmente mantendo o comportamento de SPA, e só depois avaliar SSR nas páginas adequadas.

Não é uma migração prioritária enquanto a aplicação continuar pequena e sem necessidade de SEO ou múltiplas rotas públicas.

## 3. Drizzle ORM + PostgreSQL serverless

### Problema atual

Configurações, tema e favoritos são persistidos somente no `localStorage` pelo [settingsStore](../src/services/settingsStore.ts#L54). Isso funciona para um uso local, mas não permite conta, sincronização entre dispositivos ou alertas persistentes.

### O que a stack entrega

O Drizzle permite definir schema e migrations em TypeScript, consultar PostgreSQL com uma API SQL-like e operar em ambientes serverless. A documentação oficial o descreve como leve e preparado para serverless: [visão geral do Drizzle](https://orm.drizzle.team/docs/overview) e [PostgreSQL com Drizzle](https://orm.drizzle.team/docs/get-started-postgresql).

### Modelo inicial sugerido

```text
users
favorite_stops
monitoring_profiles
notification_subscriptions
alert_events
```

As previsões não devem ser gravadas a cada 10 segundos. O banco deve armazenar preferências, favoritos, inscrições e eventos; os dados de transporte continuam vindo das fontes externas em tempo real.

### Quando adotar

Essa stack passa a valer a pena quando houver necessidade de:

- login;
- favoritos sincronizados;
- alertas persistentes;
- uso em múltiplos dispositivos;
- histórico ou métricas do produto.

Antes disso, adicionar banco aumentaria custo operacional sem resolver uma dor imediata.

## Decisão sobre Fastify

Fastify não é prioridade neste projeto. As rotas atuais são pequenas, serverless e já compartilham operações por meio de adapters. Introduzir outro framework HTTP agora criaria uma camada adicional antes de existir uma necessidade concreta.

Se o dispatcher manual crescer muito sem uma migração para Nuxt, Hono seria uma alternativa a avaliar por trabalhar com Web Standards e ter suporte a Vercel e Node: [documentação oficial do Hono](https://hono.dev/docs). Ainda assim, isso é uma decisão posterior, não parte da primeira etapa.

## Ordem recomendada

1. **Agora:** TanStack Query na consulta de previsões, preservando as regras do `predictionMonitor`.
2. **Em seguida:** schemas de resposta com Zod e migração gradual das consultas Mobilibus.
3. **Quando houver necessidade de conta:** Drizzle + PostgreSQL.
4. **Quando a estrutura de páginas/API justificar:** avaliar migração progressiva para Nuxt + Nitro.

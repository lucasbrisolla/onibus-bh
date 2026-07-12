# Instruções para agentes

## Comunicação

- Responder em PT-BR.
- Preservar acentuação gráfica em arquivos Markdown.
- Todo output direcionado ao usuário deve começar com `.`.
- Ser direto e sempre citar evidência concreta ao reportar progresso.

## Repositório

- Branch principal: `main`
- Checkout principal: `/home/lucas/onibus-bh`

Antes de retomar:

```sh
cd /home/lucas/onibus-bh
git status --short --branch
```

## Leitura inicial

Ler nesta ordem:

1. `README.md`
2. `RETOMADA.md`
3. `ARCHITECTURE.md`
4. `DESIGN.md`

## Escopo deste arquivo

`AGENTS.md` deve conter apenas instruções operacionais para agentes.

Não duplicar aqui:

- arquitetura detalhada;
- decisões visuais;
- changelog da sessão;
- backlog extenso.

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

Validação completa antes de concluir trabalho relevante:

```sh
npm run test
npm run lint
npm run build
```

## Regras críticas

- Não chamar a SIU diretamente do browser; usar `/api/*`.
- Em desenvolvimento, preservar o middleware local de `src/server/localApiRouter.ts`.
- Para previsões, usar o `cod` interno da parada; na UI, mostrar `siu` quando existir.
- Não desfazer a codificação de coordenadas em `fetchNearbyStops()` sem validar `npm run dev`.

## Referências rápidas

- Arquitetura: `ARCHITECTURE.md`
- Design e UX: `DESIGN.md`
- Estado atual e próximos passos: `RETOMADA.md`

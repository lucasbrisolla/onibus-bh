# Ônibus BH

Ônibus BH é um aplicativo semelhante ao SIU Mobile BH mas com interface web/mobile moderna, avisos de ônibus em tempo real, monitoramento para quando você precisar sair do trabalho na hora certa

## Documentação

- `README.md`: visão geral e comandos principais.
- `RETOMADA.md`: estado atual e próximos passos.
- `ARCHITECTURE.md`: estrutura técnica e fluxo de dados.
- `DESIGN.md`: decisões visuais, UX e paleta.
- `docs/decisions.md`: decisões estáveis de produto e arquitetura.
- `AGENTS.md`: instruções operacionais para agentes.

## Escopo do MVP

- App em Vue 3, Vite e TypeScript.
- Deploy pela Vercel.
- API serverless em `/api/*` para consultar a SIU Mobile.
- Alerta local enquanto o app estiver aberto.
- Configuração salva no `localStorage`.
- Tratamento específico da linha 8350 Direto/Não Direto.
- Mapa Leaflet com CartoDB Voyager no modo claro e CartoDB Dark Matter no modo escuro.
- Interface mobile com bottom sheet retrátil, alternância de tema e controle de visibilidade dos pontos no mapa.

## Requisitos

- Node.js `>=20`.

## Desenvolvimento

```sh
npm install
npm run dev
```

## Testes e build

```sh
npm run test
npm run build
```

Para verificação de tipos:

```sh
npm run lint
```

## Deploy na Vercel

O projeto foi desenhado para Vercel conectada ao GitHub. A Vercel deve usar:

- Build command: `npm run build`
- Output directory: `dist`
- Framework preset: Vite

## Limitação do MVP

As notificações funcionam enquanto o app está aberto. Notificações com o app fechado exigem Web Push, Service Worker e persistência de alertas, que ficaram fora do primeiro corte.

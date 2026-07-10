# Ônibus BH

App pessoal para acompanhar previsões de ônibus em Belo Horizonte e notificar o navegador quando uma linha monitorada estiver chegando.

## Escopo do MVP

- App em Vue 3, Vite e TypeScript.
- Deploy pela Vercel.
- API serverless em `/api/*` para consultar a SIU Mobile.
- Alerta local enquanto o app estiver aberto.
- Configuração salva no `localStorage`.
- Tratamento específico da linha 8350 Direto/Não Direto.

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

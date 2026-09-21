<p align="center">
  <img
    src="public/onibus-bh-screenshot.png"
    alt="Tela principal do Ônibus BH com mapa, parada selecionada e previsões de chegada"
    width="960"
  />
</p>

<h1 align="center">Ônibus BH</h1>

<p align="center">
  Acompanhe o transporte público de Belo Horizonte e consulte a rede Ótimo/RMBH em um único painel.
</p>

<p align="center">
  <a href="#funcionalidades">Funcionalidades</a> ·
  <a href="#desenvolvimento-local">Desenvolvimento local</a> ·
  <a href="#arquitetura">Arquitetura</a> ·
  <a href="#documentação">Documentação</a>
</p>

## Visão geral

O Ônibus BH é uma aplicação web responsiva para encontrar paradas, consultar previsões e acompanhar ônibus no mapa. O produto reúne a rede municipal de Belo Horizonte e uma experiência complementar para linhas da rede metropolitana Ótimo/RMBH.

O fluxo municipal consulta a SIU Mobile BH no servidor e entrega ao navegador apenas respostas do próprio app, por meio de `/api/*`. A integração metropolitana usa a Mobilibus como fonte complementar, mantendo redes, identidades e tipos de informação separados na interface.

## Funcionalidades

- Encontrar paradas próximas usando o mapa ou a localização do dispositivo.
- Buscar uma parada por endereço, código interno ou código público.
- Consultar previsões de chegada em tempo real na rede municipal.
- Selecionar uma previsão e acompanhar a rota e a posição do ônibus no mapa.
- Salvar paradas municipais e pontos Ótimo/RMBH como favoritos no dispositivo.
- Consultar o catálogo de linhas e horários planejados da rede Ótimo/RMBH.
- Configurar alertas locais quando um ônibus se aproxima.
- Alternar entre tema claro e escuro, incluindo a camada base do mapa.
- Usar uma experiência mobile com bottom sheet e controles compactos no mapa.

## Fontes de transporte

O app mantém as fontes de transporte separadas para preservar o significado de cada dado.

| Fonte | Informações | Experiência |
| --- | --- | --- |
| SIU municipal | Paradas, previsões, itinerários e veículos | Monitoramento em tempo real em Belo Horizonte |
| Mobilibus · Ótimo/RMBH | Linhas, pontos, partidas e horários planejados | Consulta da rede metropolitana |

Horários planejados não representam, por si só, a posição atual de um veículo ou uma previsão de chegada.

## Stack

- Vue 3
- TypeScript
- Vite
- Leaflet
- Vitest
- Vercel Functions
- Node.js `24.x`

O arquivo [`.nvmrc`](.nvmrc) indica a linha Node 24 para quem usa `nvm`. A Vercel seleciona a versão 24.x mais recente disponível, e a versão instalada localmente deve atender ao requisito definido em [`package.json`](package.json).

## Desenvolvimento local

### Pré-requisitos

- Node.js `24.x`
- npm
- `nvm` é opcional, mas pode usar o `.nvmrc` para selecionar o runtime do projeto.

### Instalar e iniciar

Se você usa `nvm`, selecione o runtime definido pelo projeto:

```sh
nvm install
nvm use
```

Instale as dependências e inicie o servidor de desenvolvimento:

```sh
npm install
npm run dev
```

O Vite disponibiliza a aplicação em `http://localhost:5173`. O middleware local preserva as rotas `/api/*` durante o desenvolvimento, sem chamadas diretas do navegador à SIU.

### Mapa-base

Por padrão, os mapas usam tiles do OpenStreetMap com atribuição visível. Isso evita depender de uma credencial para iniciar o projeto e impede a marca d’água de desenvolvimento do CARTO.

Para usar os estilos CARTO Voyager e Dark Matter, copie .env.example para .env.local, preencha VITE_CARTO_API_KEY com uma chave pública restrita aos domínios autorizados e reinicie o Vite. A chave não deve ser commitada.

### Validar o projeto

Execute os comandos abaixo antes de publicar uma alteração:

```sh
npm run test
npm run lint
npm run build
```

Os comandos executam, respectivamente, a suíte de testes, a verificação de tipos com `vue-tsc` e a build de produção com saída em `dist/`.

Para testar a build localmente depois de gerá-la:

```sh
npm run preview
```

## Arquitetura

O navegador consome apenas o contrato interno do app:

```text
Interface Vue
    ↓
src/services/apiClient.ts
    ↓
/api/* ou middleware local do Vite
    ↓
SIU Mobile BH ou Mobilibus
    ↓
Normalizadores e tipos de domínio
```

As regras de transporte ficam concentradas no servidor e nos módulos de domínio. Isso evita expor integrações externas ao navegador e permite que o ambiente local e a Vercel compartilhem o mesmo contrato HTTP.

### Estrutura principal

| Caminho | Responsabilidade |
| --- | --- |
| `src/components/` | Shell da aplicação, painel de monitoramento, mapa e experiência mobile |
| `src/domain/` | Tipos compartilhados e regras puras de domínio |
| `src/services/` | Cliente HTTP, seleção de paradas, monitoramento e persistência local |
| `src/server/` | Cliente das fontes externas, normalização e roteamento local |
| `api/` | Funções serverless usadas no deploy da Vercel |
| `public/` | Arquivos estáticos, incluindo a imagem de apresentação |

## Deploy na Vercel

O projeto usa a configuração padrão de uma aplicação Vite:

- **Build command:** `npm run build`
- **Output directory:** `dist`
- **Framework preset:** Vite
- **Runtime:** Node.js `24.x`

## Documentação

- [`RETOMADA.md`](RETOMADA.md): estado atual do produto e próximos passos.
- [`ARCHITECTURE.md`](ARCHITECTURE.md): estrutura técnica e fluxo de dados.
- [`DESIGN.md`](DESIGN.md): decisões visuais, UX e paleta.
- [`docs/decisions.md`](docs/decisions.md): decisões estáveis de produto e arquitetura.
- [`docs/mobilibus-otimo-api-research.md`](docs/mobilibus-otimo-api-research.md): pesquisa sobre Mobilibus, Ótimo e SIU.
- [`AGENTS.md`](AGENTS.md): instruções operacionais para agentes.

## Limitações conhecidas

- As notificações funcionam enquanto o app está aberto. Notificações com o app fechado exigem Web Push, Service Worker e persistência de alertas.
- A disponibilidade e a atualização dos dados dependem das fontes de transporte externas.
- Os horários planejados da rede Ótimo/RMBH não devem ser interpretados como previsões em tempo real.

## Licença

Este projeto está disponível sob a [licença MIT](LICENSE).

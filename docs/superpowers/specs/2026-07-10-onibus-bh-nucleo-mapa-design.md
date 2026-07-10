# Ônibus BH — Núcleo mapa e monitoramento

## Contexto

O app atual já monitora uma parada, consulta previsões pela SIU Mobile BH e dispara notificação local enquanto a aba está aberta. A próxima versão deve deixar de parecer um formulário simples e virar uma experiência de produto: painel de monitoramento com mapa em tempo real, responsivo e inspirado na referência visual aprovada.

A referência principal é a imagem enviada em `ChatGPT Image 10 de jul. de 2026, 17_15_29.png`: sidebar escura no desktop, mapa dominante, painel de alerta/previsões, e no celular mapa em tela cheia com bottom sheet.

## Objetivo

Criar o núcleo da nova experiência:

- monitoramento de uma parada e linha;
- mapa real com parada monitorada e paradas próximas;
- próximas previsões com atualização automática;
- desktop com sidebar/painel/mapa;
- mobile com mapa e card inferior;
- base preparada para favoritos, histórico e PWA, sem implementar essas frentes agora.

## Fora de escopo

- Push com app fechado.
- Histórico completo de viagens/previsões.
- Favoritos persistidos com múltiplas rotas.
- PWA avançado com service worker e Web Push.
- Login, conta ou sincronização entre dispositivos.
- Cálculo próprio de rota.

## Experiência principal

O fluxo principal é parada primeiro:

1. O usuário monitora uma parada.
2. Informa ou ajusta a linha desejada.
3. Define quantos minutos antes quer ser avisado.
4. O app atualiza automaticamente as previsões.
5. O mapa mostra a parada monitorada, contexto próximo e, quando disponível, rota/veículo derivados da previsão atual.

No desktop, a tela usa três regiões:

- sidebar escura com navegação visual;
- painel de monitoramento à esquerda;
- mapa ocupando a maior área.

No mobile:

- top bar compacta;
- mapa em tela cheia;
- bottom sheet com linha, alerta e próximas previsões;
- navegação inferior visualmente preparada para Mapa, Favoritos, Histórico e Configurações.

## Dados e API

Todas as chamadas à SIU devem continuar passando por `api/`, nunca direto do browser.

A base SIU passa a seguir o padrão documentado como atual:

```text
http://bhz.siumobile.com.br:6060/siumobiletacomapp/siumobile-ws-v01/rest/ws
```

Os endpoints V3 devem usar `BHZ` como cidade e callbacks oficiais quando aplicável:

- previsões: `V3/buscarPrevisoes/{codParada}/false/0/BHZ/retornoJSON`;
- paradas próximas: `V3/buscarParadasProximas/{lng}/{lat}/0/BHZ/retornoJSONH`;
- paradas da linha com coordenadas: `V3/buscarParadasPorLinhaComCoordenadas/{codLinha}/0/BHZ/retornoJSONH`;
- itinerário: `V3/buscarItinerario/{codItinerario}/0/BHZ/retornoJSONItinerario`;
- veículos no mapa: `V3/retornaVeiculosMapa/{codItinerario}/0/BHZ/retornoJSONVeiculos`.

O campo `cod` da parada é o identificador persistido e usado para previsões. O campo `siu` é apenas o código visível para o usuário.

`codItinerario` não deve ser salvo como configuração permanente. Ele vem das previsões atuais e só deve ser usado para buscar rota/veículos enquanto estiver válido.

## Modelo de dados

Adicionar tipos para:

- parada próxima: `cod`, `siu`, `x`, `y`, `desc`, `cor`;
- veículo: `lat`, `long`, `cor`, `descricao`, `numVeicGestor`, `direcao`;
- itinerário: pontos `coordX`, `coordY`;
- previsão enriquecida: manter campos atuais e incluir, quando disponíveis, `vehicleId`, `color`, `accessibilityCode`.

## Componentes

Componentes esperados:

- `AppShell`: layout desktop/mobile, sidebar/top/bottom nav.
- `MonitoringPanel`: parada, linha, alerta, toggle e status.
- `PredictionCards`: lista de próximas previsões com destaque para a próxima.
- `MapView`: mapa, camada base, parada monitorada, paradas próximas, rota e veículos quando disponíveis.
- `MobileBottomSheet`: versão compacta do painel para celular.
- `SearchBar`: busca simples por parada/endereço inicialmente preparada para usar localização/paradas próximas.

Os componentes devem seguir Vue 3 + TypeScript e padrões atuais do repo.

## Atualização automática

O polling de previsões continua em torno de 45 segundos para evitar abuso da SIU.

Chamadas de mapa podem ter cadências diferentes:

- paradas próximas: sob demanda;
- itinerário: sob demanda e cacheável por `codItinerario`;
- veículos: apenas quando o mapa estiver usando um `codItinerario` ativo; cadência menor pode ser avaliada depois.

Toda chamada recorrente precisa manter proteção contra requisições concorrentes e respostas obsoletas.

## Estados e erros

A UI deve mostrar:

- monitoramento ativo/pausado;
- carregando previsões;
- última atualização;
- erro de API com mensagem curta;
- ausência de previsões;
- permissão de notificação negada ou pendente;
- mapa sem `codItinerario` quando não houver veículo/rota disponível.

Não usar `alert()`.

## Visual

Direção visual:

- sidebar escura e compacta;
- verde para estado ativo;
- roxo como cor de ação/realce;
- cartões claros com bordas suaves;
- mapa como superfície principal;
- texto denso o suficiente para uso diário, sem hero marketing.

No mobile, evitar excesso de controles permanentes sobre o mapa. A ação principal fica no card inferior.

## Testes

Cobrir:

- normalização de paradas próximas;
- normalização de veículos e itinerário;
- enriquecimento de previsão com `numVeicGestor`, `cor` e acessibilidade;
- cliente de API frontend para novos endpoints;
- comportamento de polling sem requisições concorrentes;
- renderização básica dos estados principais do app.

Antes de concluir implementação, rodar:

```sh
npm run test
npm run lint
npm run build
```

## Critérios de aceite

- A tela principal se parece com o núcleo da referência aprovada.
- O usuário consegue ver uma parada/linha monitorada, próximas previsões e atualização automática.
- O app funciona bem em mobile e desktop.
- O mapa mostra a parada monitorada e paradas próximas quando disponíveis.
- A arquitetura continua usando `api/` como proxy da SIU.
- O código não depende de chamar SIU direto do navegador.
- Favoritos, histórico e PWA aparecem apenas como preparação visual ou técnica, sem prometer comportamento completo.

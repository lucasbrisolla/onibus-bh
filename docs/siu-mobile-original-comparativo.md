# Comparativo entre SIU Mobile BH original e Ônibus BH

Data da análise: 13 de julho de 2026.

## Fonte analisada

- APK original: `research-local/apks/siu-mobile-bh-1.31.1.apk`
- Extração temporária: `/tmp/siu-mobile-bh-apk`
- App criado: `/home/lucas/onibus-bh`

## Como é o SIU Mobile BH original

O SIU Mobile BH original é um app Cordova/WebView. O APK contém uma aplicação web em `assets/www`, com páginas HTML separadas, jQuery Mobile, JavaScript global, Leaflet e plugins Cordova.

Evidências:

- `assets/www/index.html` carrega `cordova.js`, jQuery, jQuery Mobile e `js/json.js`.
- `assets/www/js/json.js` define `pracaApp = "BHZ"`, `tipoMapa = "Leaflet"`, versão `1.31.0`, pacote `com.tacom.siumobilebh` e a base `http://bhz.siumobile.com.br:6060/siumobiletacomapp/siumobile-ws-v01/rest/ws/`.
- `assets/www/cordova_plugins.js` lista plugins de geolocalização, diálogos nativos, acessibilidade mobile, statusbar, insomnia, background mode, badge e notificação local.

## Fluxo principal do app original

O menu principal é uma lista de entradas separadas:

- Encontrar no Mapa;
- Minhas Paradas;
- Pesquisar por Linha;
- Paradas Próximas;
- Notificações;
- Alarme, quando habilitado por parâmetro;
- Configurações;
- Ajuda;
- modo `Pessoa com deficiência?`.

O fluxo é centrado em telas diferentes, não em um dashboard único. A navegação alterna entre arquivos como `mnuPrincipal.html`, `mapa.html`, `pesquisaLinha.html`, `retornaParadas.html`, `retornaPrevisao.html`, `retornaFavoritos.html` e `notificacoes.html`.

## Dados e API no original

O app original chama diretamente a API SIU a partir do WebView, via JSONP.

Exemplos encontrados:

- previsão: `V3/buscarPrevisoes/{codParada}/{somenteAcessiveis}/{usuario}/{cidade}/{callback}`;
- linhas: `buscarLinhas/{callback}`;
- paradas por linha: `V3/buscarParadasPorLinha/...`;
- notificações de parada: `V3/verificaNotificacaoParada/{codParada}/{cidade}/{callback}`;
- mapa: paradas próximas, paradas por linha com coordenadas e veículos no mapa.

O app original também registra uso do sistema periodicamente e usa `localStorage` para preferências, favoritos, cidade, atualização automática, notificações visualizadas e identificação local do usuário.

## Interface e experiência do original

O original é funcional, mas tem cara de app mobile legado:

- telas em jQuery Mobile;
- listas grandes com botões e rodapé fixo;
- muitos estados em variáveis globais;
- HTML gerado por concatenação de string;
- muito texto explicativo dentro da interface;
- navegação por páginas HTML;
- visual baseado em ícones bitmap e CSS antigo;
- modo de acessibilidade PNE como fluxo próprio.

Na previsão, o app mostra parada, código SIU, lista de próximos ônibus, hora da última atualização, favorito, botão de horários, botão de atualizar e atalho para mapa do veículo. Ele pode filtrar veículos acessíveis e alternar entre uma linha pesquisada e todas as linhas.

## Como é o app que criamos

O Ônibus BH é um app web moderno em Vue 3, Vite e TypeScript, com dashboard único, mapa dominante e painel de monitoramento.

Evidências no projeto:

- `README.md` define Vue 3, Vite, TypeScript, Leaflet, Vercel e `/api/*`.
- `ARCHITECTURE.md` define camadas `src/domain`, `src/server`, `src/services`, `src/components` e serverless em `api/`.
- `src/App.vue` concentra estado de monitoramento, busca, localização, favoritos, tema, previsões, rota e veículos.
- `src/components/MapView.vue` renderiza mapa Leaflet com paradas, rota, veículos, tema claro/escuro e localização.
- `src/components/MonitoringPanel.vue` renderiza parada selecionada, próximos ônibus, configurações, controles e status.
- `src/server/siuClient.ts` centraliza chamadas à SIU no servidor, evitando chamada direta do browser.

## Comparação objetiva

| Tema | SIU Mobile BH original | Ônibus BH criado |
| --- | --- | --- |
| Plataforma | Cordova/WebView empacotando HTML local | Web app Vue/Vite com PWA possível |
| Arquitetura | Páginas HTML separadas, JS global e jQuery Mobile | Componentes Vue, TypeScript, domínio, serviços e server-side |
| API | Browser/WebView chama SIU via JSONP diretamente | Browser chama `/api/*`; servidor chama SIU |
| UX principal | Menu de opções e telas separadas | Dashboard com mapa e monitoramento integrados |
| Mapa | Tela própria, com paradas/veículos/rotas | Elemento central da experiência |
| Previsões | Lista por parada, botão atualizar, atualização automática opcional | Cards compactos, polling de 10 segundos e seleção de ônibus específico |
| Favoritos | Implementado como `Minhas Paradas` via `localStorage` | Existe estrutura básica, ainda precisa refinamento |
| Notificações | Geral, por parada, local notification Cordova e suporte a background mode | Notification API básica enquanto app está aberto |
| Acessibilidade PNE | Fluxo próprio com validação de cartão, avisar motorista e desembarque | Ainda não implementado |
| Visual | Legado, listas densas, ícones bitmap, muito texto | Tema teal, dark mode, bottom sheet mobile, UI mais enxuta |
| Manutenibilidade | Difícil: strings HTML, globais, `eval`, JSONP | Melhor: tipos, testes, normalizadores e camadas separadas |

## O que copiamos bem

- Uso correto do `cod` interno para previsão e do `siu` como código público exibido.
- Busca de paradas próximas e previsão por parada.
- Mapa com paradas, veículos e rota.
- Favoritos locais como direção de produto.
- Atualização recorrente de previsões.
- Foco em saber quando o ônibus vai chegar.

## Onde o nosso app já melhora

- Não expõe a SIU diretamente no browser.
- Tem arquitetura testável e tipada.
- Une mapa e previsão em uma experiência mais rápida.
- Mostra menos ruído técnico, como `vehicleId`.
- Permite selecionar um ônibus específico e filtrar visualmente o mapa.
- Tem tema claro/escuro e UI mobile mais atual.
- Normaliza visualmente textos em caixa alta.

## Lacunas em relação ao original

- Favoritos ainda não têm a maturidade de `Minhas Paradas`.
- Falta quadro de horários por linha/parada.
- Falta tela de notificações gerais e notificações por parada vindas da SIU.
- Falta modo de acessibilidade/PNE.
- Falta filtro por veículo acessível.
- Falta configuração de atualização automática equivalente.
- Falta fluxo completo de alarme/local notification em segundo plano.
- Falta busca por linha com abertura das paradas da linha no mapa.

## Leitura de produto

O SIU Mobile original é mais completo em cobertura funcional, principalmente por já carregar anos de fluxos: favoritos, horários, notificações, PNE, alarme e configurações.

O Ônibus BH criado é melhor como produto moderno para o fluxo diário principal: abrir o mapa, escolher uma parada, ver os ônibus chegando, selecionar um ônibus e acompanhar no mapa. A diferença central é que o original é um catálogo de funcionalidades em telas separadas; o nosso é um painel orientado à decisão imediata.

## Próximos passos recomendados

1. Trazer `Minhas Paradas` para o mesmo nível do original, com endereço visível, apelido e acesso rápido.
2. Implementar busca por linha e visualização de paradas da linha no mapa.
3. Adicionar quadro de horários por linha/parada.
4. Integrar notificações gerais e notificações por parada da SIU.
5. Evoluir notificações em segundo plano com PWA/Web Push ou wrapper nativo.
6. Decidir se o modo PNE entra no escopo do produto ou fica explicitamente fora.

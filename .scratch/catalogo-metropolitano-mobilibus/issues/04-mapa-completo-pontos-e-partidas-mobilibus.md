# 04 — Mapa completo, pontos e partidas Mobilibus

**O que construir:** abrir a aba `Linhas` com o mapa metropolitano completo, mostrar os pontos Mobilibus da área visível e permitir selecionar um ponto para consultar as partidas e os ônibus informados pela fonte.

**Relacionado a:** 03 — Exibir mapa e pontos da Linha Mobilibus.

**Status:** completed

- [x] A aba `Linhas` monta o mapa Mobilibus mesmo sem uma linha pesquisada ou selecionada.
- [x] O mapa ocupa a área principal da aba, com exploração de zoom e deslocamento equivalente ao mapa SIU.
- [x] Os pontos de todos os tiles Mobilibus visíveis são carregados, deduplicados por `stopId` e descartados quando deixam a área atual.
- [x] Os detalhes do ponto permanecem disponíveis em um painel lateral no mesmo padrão estrutural do Monitoramento, sem esconder o mapa completo.
- [x] O cabeçalho explicativo, o campo `Buscar linha` e o estado inicial de pesquisa foram removidos da aba, deixando o painel lateral dedicado ao ponto e às partidas.
- [x] Cada marcador de ponto é clicável, acessível e preserva `projectId` e `stopId` próprios da Mobilibus.
- [x] O ponto selecionado recebe destaque visual e seus dados públicos aparecem no painel lateral.
- [x] O browser consulta somente `/api/*`; a integração externa usa `GET /departures?stop_id={stopId}&project_id={projectId}` no servidor.
- [x] O contrato próprio expõe `GET /api/mobilibus/projetos/{projectId}/pontos/{stopId}/partidas`, valida projeto e ponto e retorna o envelope normalizado de partidas.
- [x] Partidas com veículo/posição informados são marcadas como `Em tempo real`; demais partidas são marcadas como `Programado`.
- [x] A interface mostra linha, destino, horário, identificação do veículo e idade da posição quando disponíveis, sem transformar horário planejado em previsão atual.
- [x] O painel do ponto oferece uma barra numérica para filtrar localmente as opções carregadas por linha, veículo ou destino, sem nova chamada à API.
- [x] O ponto selecionado exibe estados de carregamento, vazio e erro recuperável.
- [x] Cache e deduplicação das partidas são isolados por projeto e ponto, com validade curta para reduzir chamadas sem esconder atualização.
- [x] A integração permanece isolada do domínio SIU: não converte pontos Mobilibus em `NearbyStop`, não altera previsões municipais e não coloca veículos metropolitanos na camada do mapa.
- [x] Testes de módulo, contrato HTTP, adapters, cliente browser, mapa e aplicação montada cobrem seleção, normalização, cache, estados, nova tentativa e coexistência com SIU.
- [x] Testes, lint, verificação de tipos e build de produção passam.

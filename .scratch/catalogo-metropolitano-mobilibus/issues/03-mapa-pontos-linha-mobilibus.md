# 03 — Exibir mapa e pontos da Linha Mobilibus

**What to build:** apresentar, na aba `Linhas`, um mapa contextual da Linha Mobilibus selecionada com os pontos metropolitanos visíveis, usando a mesma linguagem de exploração do mapa SIU sem misturar fontes ou identidades.

**Blocked by:** 01 — Pesquisar linhas da Ótimo/RMBH e 02 — Consultar horários planejados de uma Linha Mobilibus.

**Status:** completed

- [x] Selecionar uma linha abre, na própria aba `Linhas`, um mapa contextual com o nome da linha e os pontos Mobilibus disponíveis na área visível.
- [x] O mapa reaproveita a linguagem do mapa SIU: base clara/escura, zoom, marcadores acessíveis, popups, controle de visibilidade dos pontos e layout responsivo.
- [x] O browser consulta somente `/api/*`; a integração externa usa `GET /api/mobilibus/projetos/{projectId}/pontos?tile={x},{y},{zoom}`.
- [x] O contrato aceita apenas o projeto Ótimo/RMBH (`projectId=501`) e valida tiles com coordenadas inteiras e zoom suportado.
- [x] O módulo Mobilibus consulta `stops?project_id=501&tile=x,y,zoom`, concentra timeout, normalização, cache e tradução de falhas e permite transporte e relógio fake nos testes.
- [x] O mapa calcula os tiles visíveis usando Web Mercator e só consulta pontos a partir do zoom mínimo documentado pela fonte.
- [x] Pontos de tiles visíveis são deduplicados por `stopId`, preservando coordenadas, nome, endereço e código público quando fornecidos.
- [x] Marcadores mostram nome e endereço do ponto em popup, sem exibir identificadores técnicos como conteúdo principal e sem usar `NearbyStop`/identidade SIU.
- [x] O carregamento de pontos, mapa vazio, falha recuperável e nova tentativa são estados visíveis e não interrompem monitoramento, previsões, mapa ou favoritos SIU.
- [x] Trocar a linha limpa os pontos da linha anterior, invalida respostas antigas e mantém a seleção apenas em memória.
- [x] O mapa continua utilizável quando a linha não possui pontos carregados ou quando a API Mobilibus está indisponível.
- [x] Nenhum veículo, previsão em tempo real ou parada municipal é apresentado como dado da Linha Mobilibus.
- [x] Testes no módulo Mobilibus, dispatcher, adapters, cliente HTTP, mapa e aplicação montada cobrem tiles, normalização, cache, deduplicação, estados, isolamento e responsividade estrutural.
- [x] Testes, verificação de tipos e build de produção passam.

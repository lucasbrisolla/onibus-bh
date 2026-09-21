# 03: Aprofundar o catálogo metropolitano de pontos

**What to build:** Ao abrir e explorar o catálogo Ótimo/RMBH, o passageiro deve carregar os pontos da área visível com cache, deduplicação, estados claros e proteção contra respostas antigas, podendo selecionar um ponto e repetir uma consulta com falha.

**Blocked by:** None (can start immediately).

**Status:** completed

- [x] O catálogo carrega os pontos dos tiles visíveis e atualiza a lista quando a área do mapa muda.
- [x] Tiles repetidos ou já carregados não geram consultas desnecessárias.
- [x] Respostas de uma área anterior não sobrescrevem a área mais recente.
- [x] Os estados inicial, carregando, conteúdo, vazio e erro são apresentados de forma coerente.
- [x] O passageiro consegue repetir o carregamento quando os pontos falham.
- [x] Selecionar um ponto continua atualizando o destaque do mapa e preparando a consulta de partidas.
- [x] O cache, a deduplicação, as versões de requisição e a tradução de erros ficam concentrados no module do catálogo.
- [x] A apresentação recebe estado e emite ações, sem manter a implementação de concorrência ou persistência.
- [x] Testes cobrem viewport, cache, respostas antigas, erro, retry e seleção pela interface do module.
- [x] Um teste de integração confirma que a tela Ótimo continua funcionando na aplicação.
- [x] Testes, lint, verificação de tipos e build passam.

# 04: Integrar partidas, favoritos e composição do catálogo

**What to build:** Depois de selecionar um ponto Ótimo/RMBH, o passageiro deve consultar, filtrar e repetir partidas, salvar o ponto como favorito e reabri-lo depois, sem respostas antigas ou detalhes do catálogo espalhados no módulo raiz.

**Blocked by:** 03 — Aprofundar o catálogo metropolitano de pontos.

**Status:** completed

- [x] Selecionar um ponto inicia uma consulta de partidas e limpa o resultado do ponto anterior.
- [x] Respostas de partidas antigas são descartadas quando outro ponto é selecionado ou a tela é desmontada.
- [x] Os estados de carregamento, conteúdo, vazio e erro das partidas são apresentados corretamente.
- [x] O passageiro consegue filtrar partidas por linha, ônibus ou destino.
- [x] O passageiro consegue repetir uma consulta de partidas com falha.
- [x] O ponto selecionado pode ser salvo e removido dos favoritos.
- [x] Favoritos persistem entre sessões e podem ser reabertos fora da área atualmente carregada.
- [x] O module do catálogo concentra seleção, partidas, favoritos e estados de concorrência.
- [x] O módulo raiz fica responsável apenas pela composição da navegação e pela integração entre seções.
- [x] Testes cobrem seleção, filtro, retry, respostas antigas, persistência, remoção e abertura de favoritos.
- [x] Um teste de integração confirma que falhas Mobilibus não interrompem o monitoramento SIU municipal.
- [x] Testes, lint, verificação de tipos e build passam.

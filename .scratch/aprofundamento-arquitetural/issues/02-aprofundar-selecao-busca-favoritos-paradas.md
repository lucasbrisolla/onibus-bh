# 02 — Aprofundar seleção, busca e favoritos de paradas

**What to build:** permitir que o passageiro encontre, selecione, preserve e favorite paradas por uma capacidade coesa, mantendo o ponto monitorado disponível mesmo quando ele não estiver entre as paradas próximas atuais.

**Blocked by:** 01 — Extrair o monitoramento de previsões e alertas.

**Status:** completed

- [x] A parada monitorada é resolvida, nesta ordem, entre paradas próximas, snapshot da seleção atual e favoritos persistidos.
- [x] A busca encontra paradas por endereço, `cod` ou `siu`, sem confundir o identificador interno usado nas previsões com o código público apresentado ao usuário.
- [x] Selecionar uma parada limpa a previsão anterior e a busca, abre o monitoramento, atualiza o `cod` configurado e solicita uma consulta imediata.
- [x] Favoritar, desfavoritar, remover e reabrir uma parada preserva a persistência e os comportamentos atuais da interface.
- [x] Uma parada favorita fora da área carregada continua visível e pode ser aberta normalmente.
- [x] O módulo expõe uma interface pequena de estado e comandos para Vue, enquanto persistência e efeitos externos entram por adapters substituíveis.
- [x] A aplicação montada cobre busca, seleção e favoritos pelo comportamento visível, com testes focados do módulo apenas para regras que não exigem DOM.
- [x] Testes, verificação de tipos e build de produção passam.

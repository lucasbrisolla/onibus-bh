# 02: Compartilhar o ciclo de vida dos mapas Leaflet

**What to build:** Os mapas municipal e Ótimo/RMBH devem reutilizar o mesmo ciclo de montagem, resize, troca de tema e desmontagem, sem alterar os marcadores, rotas, paradas, veículos ou eventos específicos de cada mapa.

**Blocked by:** 01 — Centralizar a política do mapa-base e remover a marca d’água.

**Status:** completed

- [x] Os dois adapters usam o ciclo Leaflet compartilhado para montar e destruir suas instâncias.
- [x] Resize da janela, ResizeObserver e atualizações após mudanças de layout continuam funcionando.
- [x] A desmontagem remove observers, listeners, controles e instâncias sem atualizações posteriores.
- [x] A troca de tema continua reutilizando a política de mapa-base do ticket 01.
- [x] A cena, os eventos e a política de viewport específicos de cada mapa permanecem preservados.
- [x] Testes de montagem, resize, tema e desmontagem passam nos dois adapters.
- [x] O module compartilhado absorve comportamento real; não sobra apenas uma função de repasse shallow.
- [x] Testes, lint, verificação de tipos e build passam.

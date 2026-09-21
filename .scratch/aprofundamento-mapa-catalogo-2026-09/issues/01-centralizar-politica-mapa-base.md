# 01: Centralizar a política do mapa-base e remover a marca d’água

**What to build:** Os mapas municipal e Ótimo/RMBH devem abrir com tiles válidos, sem a marca d’água “API KEY REQUIRED”, mantendo estilos claro e escuro, atribuição visível e configuração segura do provedor.

**Blocked by:** None (can start immediately).

**Status:** completed

- [x] Existe uma única política de mapa-base para os dois adapters Leaflet.
- [x] Os estilos claro e escuro carregam sem marca d’água em desenvolvimento e produção.
- [x] A credencial pública é fornecida por configuração de ambiente e não é gravada no repositório.
- [x] A atribuição exigida pelo provedor permanece visível nos dois mapas.
- [x] A troca de tema preserva o mapa, o centro, o zoom e os marcadores atuais.
- [x] Testes cobrem configuração, estilos, credencial, atribuição e integração observável dos dois mapas.
- [x] Testes, lint, verificação de tipos e build passam.

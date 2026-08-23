# 03 — Construir a cena declarativa do mapa

**What to build:** manter a leitura e as interações atuais do mapa por meio de uma cena declarativa que transforme dados de domínio em paradas, localização, rota, veículos, labels e bounds antes que o adapter Leaflet os renderize.

**Blocked by:** None — can start immediately.

**Status:** completed

- [x] A cena representa parada monitorada, paradas próximas, localização do usuário, rota e veículos visíveis sem expor tipos do Leaflet.
- [x] Ocultar paradas próximas mantém a parada monitorada visível.
- [x] Selecionar um veículo limita a cena a esse veículo e mantém o destaque com linha e minutos quando a previsão estiver disponível.
- [x] Labels de paradas continuam normalizando visualmente textos em caixa alta sem alterar os dados de domínio.
- [x] A rota mantém sua base roxa contínua e o traço interno discreto, e os bounds incluem apenas os elementos relevantes à cena.
- [x] O adapter Vue/Leaflet traduz a cena para camadas e eventos sem decidir regras de visibilidade, labels ou composição de bounds.
- [x] A fachada pública do mapa permite testar a cena sem DOM ou mapa real, mantendo testes leves de integração do adapter.
- [x] Testes, verificação de tipos e build de produção passam.

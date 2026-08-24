# 04 — Extrair a política de viewport do mapa

**What to build:** permitir que o passageiro explore o mapa sem reenquadramentos causados pelo polling, usando uma política testável que diferencie mudanças estruturais, comandos programáticos e movimentos manuais.

**Blocked by:** 03 — Construir a cena declarativa do mapa.

**Status:** completed

- [x] A política produz comandos declarativos para manter a visão, enquadrar bounds, usar a visão padrão ou comunicar uma mudança manual de área.
- [x] A montagem inicial e mudanças estruturais relevantes podem enquadrar a cena com padding e zoom máximo compatíveis com a experiência atual.
- [x] Atualizações frequentes de rota ou veículos não provocam reenquadramento automático recorrente.
- [x] Um movimento iniciado pelo próprio mapa não é comunicado como exploração manual do passageiro.
- [x] Um movimento manual emite o centro da nova área para atualizar as paradas próximas.
- [x] A política não depende de tipos do Leaflet, e o adapter apenas executa seus comandos e converte eventos.
- [x] Testes puros cobrem as transições e comandos; testes do adapter comprovam a integração essencial com o mapa.
- [x] Testes, verificação de tipos e build de produção passam.

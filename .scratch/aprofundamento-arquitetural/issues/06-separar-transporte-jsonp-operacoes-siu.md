# 06 — Separar transporte JSONP e operações SIU

**What to build:** manter as consultas de transporte confiáveis ao separar rede, timeout, parsing e erros upstream das operações que constroem paths SIU e normalizam previsões, paradas, itinerários e veículos.

**Blocked by:** 05 — Unificar o contrato HTTP local e Vercel.

**Status:** ready-for-agent

- [ ] O transporte JSONP recebe um path e concentra URL base, fetch, timeout, parsing e tradução de falhas upstream.
- [ ] As operações SIU recebem o transporte por uma interface substituível e concentram construção de paths, codificação de parâmetros e escolha do normalizador.
- [ ] Previsões usam o `cod` interno da parada, e os retornos continuam preservando o `siu` público para apresentação.
- [ ] A consulta de paradas próximas preserva a ordem longitude/latitude e a codificação atual das coordenadas.
- [ ] As regras da linha `8350`, ids de partidas programadas e demais normalizações permanecem inalteradas.
- [ ] O dispatcher compartilhado consegue executar seus casos de uso com um transporte fake, sem mock global de rede.
- [ ] Testes do transporte cobrem sucesso, resposta HTTP inválida, timeout, JSONP inválido e falha de rede; testes das operações cobrem paths e normalizadores escolhidos.
- [ ] O browser continua consumindo exclusivamente `/api/*`, e os adapters local e Vercel mantêm seus contratos.
- [ ] Testes, verificação de tipos e build de produção passam.

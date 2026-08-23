# 01 — Extrair o monitoramento de previsões e alertas

**What to build:** oferecer ao passageiro um monitoramento previsível por meio de um módulo profundo que concentre polling, retomada, concorrência, descarte de respostas obsoletas, preservação da previsão selecionada, status e notificações, mantendo a experiência atual da aplicação.

**Blocked by:** None — can start immediately.

**Status:** completed

- [x] Uma parada configurada recebe uma consulta imediata e novas consultas a cada 10 segundos, mesmo com os alertas pausados.
- [x] O ciclo consulta imediatamente ao montar a aplicação e ao receber foco, `pageshow`, retorno à visibilidade ou seleção explícita de uma parada.
- [x] Consultas sobrepostas são impedidas e resultados incompatíveis com a parada ou as configurações que originaram a requisição são descartados sem alterar a interface ou notificar.
- [x] Uma falha limpa previsões obsoletas, seleção e horário da última atualização, apresenta o erro ao usuário e mantém o próximo ciclo agendado.
- [x] Um resultado aceito preserva primeiro o identificador selecionado, depois o mesmo veículo e serviço, depois serviço, linha e destino equivalentes; sem correspondência, usa a primeira previsão disponível.
- [x] Somente previsões com minutos finitos participam da regra de alerta, e uma notificação bem-sucedida persiste o identificador necessário para impedir repetição.
- [x] Rota e veículos são atualizados a partir da previsão aceita ou da seleção explícita, mantendo a proteção contra respostas obsoletas do mapa.
- [x] O módulo recebe adapters substituíveis para busca, notificação, relógio e agendamento e expõe uma interface pequena de comandos e estado observável para Vue.
- [x] O componente principal fica responsável por composição e handlers de tela, sem manter as regras internas de polling, snapshot, concorrência, seleção preservada ou deduplicação.
- [x] Testes no seam do módulo e na aplicação montada cobrem os comportamentos acima sem afirmar detalhes internos.
- [x] Testes, verificação de tipos e build de produção passam.

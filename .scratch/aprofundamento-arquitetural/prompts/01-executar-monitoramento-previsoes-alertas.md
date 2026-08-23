# Prompt — executar o ticket 01

Trabalhe no repositório `/run/media/lucas/9618ecad-f1b2-4372-998c-efd159046c22/home/lucas/onibus-bh` e implemente integralmente o ticket 01 do aprofundamento arquitetural.

## Fontes de verdade

Leia integralmente, antes de editar:

1. `AGENTS.md` e a documentação que ele exigir;
2. `.scratch/aprofundamento-arquitetural/spec.md`;
3. `.scratch/aprofundamento-arquitetural/issues/01-extrair-monitoramento-previsoes-alertas.md`;
4. os módulos e testes atuais envolvidos no monitoramento, nas notificações, nas regras de alerta e no carregamento do mapa.

O ticket 01 define o escopo e os critérios de aceite. A spec define as decisões e restrições compartilhadas. Preserve as alterações já existentes no worktree e mantenha o vocabulário de domínio do projeto.

## Execução

1. Inspecione o status do Git e identifique as mudanças preexistentes que precisam ser preservadas. Este passo termina quando cada arquivo já alterado estiver distinguido do trabalho do ticket.
2. Trace o comportamento atual do monitoramento desde os eventos da aplicação até previsões, alertas e atualização do mapa. Este passo termina quando todos os critérios do ticket estiverem associados a comportamento existente ou a uma lacuna explícita.
3. Estabeleça os testes do seam público do monitoramento e mantenha testes de aplicação para os fluxos visíveis. Este passo termina quando os casos de polling, retomada, concorrência, staleness, seleção, erro, notificação e mapa estiverem cobertos por expectativas de comportamento.
4. Extraia o módulo profundo e integre-o à aplicação. Mantenha a interface pequena, injete os adapters definidos pela spec e preserve as decisões estáveis do produto. Este passo termina quando o componente principal apenas compuser o módulo e encaminhar ações de tela relacionadas ao ticket.
5. Execute os testes focados durante a implementação e corrija todas as regressões dentro do escopo. Este passo termina com os testes relacionados verdes.
6. Execute `npm run test`, `npm run lint` e `npm run build`. Este passo termina apenas quando os três comandos passarem.
7. Revise o diff contra todos os critérios de aceite do ticket. Este passo termina quando cada critério estiver comprovado por código e teste, sem mudanças incidentais fora do escopo.

## Entrega

Ao concluir, informe:

- o comportamento entregue;
- as principais decisões de interface do módulo;
- os arquivos alterados;
- os testes adicionados ou ajustados;
- o resultado dos três comandos de validação;
- qualquer risco residual ou critério que não tenha sido satisfeito.

Não faça commit nem push sem solicitação explícita.

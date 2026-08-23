# Prompt — executar o ticket 02

Trabalhe no repositório `/run/media/lucas/9618ecad-f1b2-4372-998c-efd159046c22/home/lucas/onibus-bh` e implemente integralmente o ticket 02 do aprofundamento arquitetural.

O blocker do ticket 02 está satisfeito: o ticket 01 foi implementado pelos commits `c68df7c` e `795a83b`. Preserve a interface pública do monitoramento extraído e integre a seleção de paradas por meio dela.

## Fontes de verdade

Leia integralmente, antes de editar:

1. `AGENTS.md` e a documentação que ele exigir;
2. `.scratch/aprofundamento-arquitetural/spec.md`;
3. `.scratch/aprofundamento-arquitetural/issues/02-aprofundar-selecao-busca-favoritos-paradas.md`;
4. os módulos e testes atuais envolvidos em parada monitorada, busca, seleção, favoritos, configurações persistidas e monitoramento de previsões.

Ao definir a identidade de uma parada ou a interface de persistência, consulte em `docs/mobilibus-otimo-api-research.md` as seções “Identificadores que não devem ser confundidos” e “Introduzir Mobilibus como fonte separada”. Neste ticket, preserve explicitamente `cod` e `siu` da SIU e concentre essas suposições no novo módulo. A integração Mobilibus pertence a uma spec futura.

O ticket 02 define o escopo e os critérios de aceite. A spec define as decisões e restrições compartilhadas. Preserve as alterações já existentes no worktree e mantenha o vocabulário de domínio do projeto.

## Execução

1. Inspecione o status do Git, confirme os commits do blocker e identifique as mudanças preexistentes que precisam ser preservadas. Este passo termina quando cada arquivo já alterado estiver distinguido do trabalho do ticket.
2. Trace o comportamento atual desde paradas próximas, snapshot e favoritos até busca, seleção, persistência e consulta imediata pelo monitoramento. Este passo termina quando cada critério do ticket estiver associado a um comportamento existente ou a uma lacuna explícita.
3. Estabeleça testes no seam público do novo módulo e mantenha testes da aplicação montada para os fluxos visíveis. Este passo termina quando resolução da parada monitorada, busca por endereço/`cod`/`siu`, seleção, favoritos e reabertura fora da área carregada estiverem cobertos por comportamento observável.
4. Extraia um módulo profundo para seleção, busca e favoritos e integre-o à aplicação e ao monitoramento. Use uma interface pequena de estado e comandos; receba persistência e efeitos externos por adapters substituíveis. Este passo termina quando o componente principal apenas compuser o módulo e encaminhar ações de tela relacionadas ao ticket.
5. Verifique a identidade das paradas em toda a fatia. Este passo termina quando `cod` for usado nas previsões, `siu` continuar sendo apresentado ao usuário e nenhuma interface tratar os dois campos como strings intercambiáveis.
6. Execute os testes focados durante a implementação e corrija todas as regressões dentro do escopo. Este passo termina com os testes relacionados verdes.
7. Execute `npm run test`, `npm run lint` e `npm run build`. Este passo termina apenas quando os três comandos passarem sem flags ou preparação manual adicional.
8. Revise o diff contra todos os critérios de aceite do ticket. Este passo termina quando cada critério estiver comprovado por código e teste, sem implementação antecipada de Mobilibus nem mudanças incidentais fora do escopo.

## Entrega

Ao concluir, informe:

- o comportamento entregue;
- as principais decisões da interface do módulo;
- como `cod`, `siu`, snapshot e favoritos foram preservados;
- os arquivos alterados;
- os testes adicionados ou ajustados;
- o resultado dos três comandos de validação;
- qualquer risco residual ou critério que não tenha sido satisfeito.

Não faça commit nem push sem solicitação explícita.

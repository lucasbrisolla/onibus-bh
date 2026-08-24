# Prompt — executar o ticket 05

Trabalhe no repositório `/run/media/lucas/9618ecad-f1b2-4372-998c-efd159046c22/home/lucas/onibus-bh` e implemente integralmente o ticket 05 do aprofundamento arquitetural.

O ticket 05 não possui blocker e pode ser executado independentemente do ticket 04. Use o estado atual da `main` como baseline, preserve qualquer trabalho posterior já existente no worktree e concentre esta implementação no contrato HTTP compartilhado entre Vite e Vercel.

## Fontes de verdade

Leia integralmente, antes de editar:

1. `AGENTS.md` e a documentação que ele exigir;
2. `.scratch/aprofundamento-arquitetural/spec.md`;
3. `.scratch/aprofundamento-arquitetural/issues/05-unificar-contrato-http-local-vercel.md`;
4. `.scratch/aprofundamento-arquitetural/issues/06-separar-transporte-jsonp-operacoes-siu.md`, apenas para respeitar a fronteira do próximo ticket;
5. `src/server/localApiRouter.ts`, `src/server/localApiRouter.test.ts`, `src/server/errors.ts` e `src/server/siuClient.ts`;
6. todos os handlers atuais em `api/`, além de `vite.config.ts` e `vercel.json`;
7. `src/services/apiClient.ts` e seus testes, para preservar os contratos consumidos pelo browser;
8. a seção “Unificar contrato HTTP local/Vercel” em `research-local/reviews/architecture-review-20260712-213542.html`.

O ticket 05 define o escopo e os critérios de aceite. A spec define as decisões e restrições compartilhadas. Preserve as alterações preexistentes no worktree e mantenha o vocabulário de domínio do projeto.

## Contratos que devem permanecer compatíveis

O dispatcher deve reconhecer, em desenvolvimento e produção:

- `GET /api/health`;
- `GET /api/linhas`;
- `GET /api/paradas/proximas?lat={latitude}&lng={longitude}`;
- `GET /api/paradas/{cod}/previsoes`;
- `GET /api/itinerarios/{cod}`;
- `GET /api/itinerarios/{cod}/veiculos`.

Preserve os envelopes atuais:

- saúde: `{ ok: true }`;
- linhas: payload atual devolvido pela operação SIU;
- paradas: `{ stops: [...] }`;
- previsões: `{ predictions: [...] }`;
- itinerário: `{ route: [...] }`;
- veículos: `{ vehicles: [...] }`;
- erros: `{ error: { code, message } }`.

Preserve também as validações e mensagens observáveis atuais: somente `GET`; `cod` numérico para parada e itinerário; latitude e longitude finitas e obrigatórias; tradução de `AppError`; e erro interno canônico para falhas desconhecidas.

## Fronteira arquitetural

Crie um dispatcher profundo que receba uma requisição HTTP neutra e operações substituíveis e devolva uma resposta HTTP canônica. O dispatcher concentra:

- reconhecimento de rota;
- método permitido;
- leitura e validação de path e query;
- chamada da operação adequada;
- envelopes de sucesso;
- respostas de rota desconhecida, método inválido e parâmetro inválido;
- tradução de erros para status e envelope canônicos.

Vite e Vercel são adapters finos. Eles convertem seus objetos de runtime para a requisição neutra, executam o dispatcher e escrevem a resposta canônica. O middleware Vite continua chamando `next()` para caminhos que não pertencem a `/api/*`; um caminho desconhecido dentro de `/api/*` recebe a resposta canônica definida pelo dispatcher.

As operações SIU atuais entram como dependências do dispatcher. A separação entre transporte JSONP e operações SIU pertence ao ticket 06. A integração Mobilibus usará este seam futuramente, mas não faz parte deste ticket.

## Execução

1. Inspecione o status do Git e identifique todas as mudanças preexistentes que precisam ser preservadas. Em seguida, catalogue o comportamento atual de cada handler Vercel, do roteador local e do cliente do browser. Este passo termina quando método, parâmetros, status, envelope de sucesso e envelope de erro de cada rota estiverem registrados a partir do código atual.
2. Associe cada duplicação entre `api/*` e `localApiRouter.ts` a uma responsabilidade do dispatcher ou do adapter. Este passo termina quando validação, roteamento e tradução de erros tiverem uma única futura fonte de verdade e apenas conversões de runtime permanecerem nos adapters.
3. Defina uma interface neutra pequena para requisição, resposta e operações. Evite tipos de Vite, Connect ou Vercel no módulo de contrato. Este passo termina quando o dispatcher puder ser chamado em teste apenas com objetos TypeScript e funções fake.
4. Escreva testes no seam do dispatcher antes de concluir a migração. Cubra todas as seis rotas em sucesso e, para os formatos aplicáveis, método inválido, parâmetro ausente, parâmetro inválido, rota desconhecida, `AppError` e erro inesperado. Este passo termina quando todos os caminhos de contrato estiverem provados sem iniciar Vite, Vercel ou servidor real.
5. Implemente o dispatcher compartilhado e concentre nele as regras catalogadas. Preserve a ordem longitude/latitude ao encaminhar paradas próximas e os identificadores recebidos pelas operações SIU. Este passo termina quando nenhuma regra de rota, validação, envelope ou erro estiver duplicada nos adapters.
6. Transforme `localApiRouter.ts` e o middleware de `vite.config.ts` em adapters do dispatcher. Adicione paridade local para saúde e linhas e preserve o encadeamento de rotas fora de `/api/*`. Este passo termina quando as seis rotas executarem localmente pelo mesmo contrato usado em produção.
7. Transforme os arquivos em `api/` em adapters Vercel finos. Eles podem permanecer como pontos de entrada físicos exigidos pelo runtime, mas devem compartilhar a tradução request/response e não repetir método, validação, envelopes ou tratamento de erros. Este passo termina quando alterar uma regra HTTP exigir editar somente o dispatcher.
8. Escreva testes de compatibilidade dos adapters com requests e responses fake. Para casos representativos de sucesso, erro de validação e erro upstream, comprove que Vite e Vercel produzem o mesmo status e corpo. Este passo termina quando a paridade for demonstrada sem iniciar servidores reais.
9. Revise e ajuste os testes antigos. Mantenha testes que comprovem conversões essenciais dos adapters e remova expectativas redundantes que passem a testar detalhes internos do dispatcher por outro seam. Este passo termina quando cada comportamento possuir uma prova no nível mais alto e estável disponível.
10. Execute os testes focados durante a implementação e corrija todas as regressões dentro do escopo. Este passo termina com os testes do dispatcher, dos adapters, do cliente e do servidor relacionados verdes.
11. Execute `npm run test`, `npm run lint` e `npm run build`. Este passo termina apenas quando os três comandos passarem sem flags ou preparação manual adicional.
12. Revise o diff contra todos os critérios de aceite do ticket. Este passo termina quando cada critério estiver comprovado por código e teste, sem separar antecipadamente o transporte SIU, adicionar endpoints Mobilibus, alterar contratos públicos ou introduzir mudanças incidentais fora do escopo.

## Entrega

Ao concluir, informe:

- o comportamento entregue;
- a interface neutra do dispatcher;
- as operações recebidas como dependências;
- como cada uma das seis rotas foi centralizada;
- como os adapters Vite e Vercel ficaram limitados à tradução de runtime;
- como a paridade entre desenvolvimento e produção foi comprovada;
- os arquivos alterados;
- os testes adicionados, ajustados ou removidos;
- o resultado dos três comandos de validação;
- qualquer risco residual ou critério que não tenha sido satisfeito.

Não faça commit nem push sem solicitação explícita.

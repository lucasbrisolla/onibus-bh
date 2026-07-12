# Decisões do projeto Ônibus BH

Este arquivo registra decisões estáveis do produto e da arquitetura para evitar que regras importantes fiquem espalhadas entre código, testes e memória de sessão.

## 1. Previsões usam `cod`, UI mostra `siu`

- A API da SIU retorna `cod` e `siu` para paradas.
- O app usa `cod` para consultar previsões.
- O app mostra `siu` ao usuário sempre que existir.

## 2. O browser não chama a SIU diretamente

- Toda consulta do frontend deve passar por `/api/*`.
- Em produção, isso acontece pelas funções em `api/`.
- Em desenvolvimento, isso acontece via `src/server/localApiRouter.ts`.

## 3. A linha `8350` tem tratamento de domínio próprio

- A classificação de variante da `8350` é parte da regra de negócio.
- Essa lógica pertence ao domínio, não à camada visual.

## 4. O mapa reage à seleção de um ônibus específico

- Clicar em um card de previsão seleciona um ônibus específico.
- Quando há seleção, o mapa prioriza somente esse ônibus.
- O objetivo é reduzir ruído visual e facilitar leitura de trajetória.

## 5. O box principal do mapa usa linha e minutos

- O destaque do ônibus selecionado deve usar a linha e o tempo estimado.
- Exemplo: `8350 - 2 min`.
- O `vehicleId` é detalhe técnico e não deve ser o destaque principal da interface.

## 6. O mapa não deve recentrar a cada polling

- Atualizações frequentes de veículos não devem causar `zoom out` recorrente.
- O enquadramento automático deve acontecer apenas em mudanças estruturais relevantes.

## 7. Dark mode também afeta os tiles do mapa

- O modo escuro não é só troca de cards e shell.
- O mapa deve trocar a camada base para tiles escuros.

## 8. A sidebar segue a identidade teal

- A identidade principal do produto usa escala teal.
- Isso vale para sidebar, estados ativos, botões primários e dark mode.

## 9. O endereço da parada é mais importante que o código

- Em `Ponto selecionado`, o endereço é o elemento de maior destaque.
- O código do ponto fica em segundo plano.

## 10. Geolocalização no mapa é discreta

- A localização do usuário pode aparecer como marcador no mapa.
- O box textual de `Sua posição` não faz parte da UI principal.

## 11. O middleware local do Vite é parte da experiência de desenvolvimento

- O fluxo local depende de `src/server/localApiRouter.ts`.
- Não remover isso sem manter uma alternativa equivalente para `/api/*`.

## 12. Cada documento tem uma responsabilidade única

- `AGENTS.md`: instruções operacionais para agentes.
- `RETOMADA.md`: estado atual e próximos passos.
- `ARCHITECTURE.md`: estrutura técnica e fluxo de dados.
- `DESIGN.md`: decisões visuais e UX.
- `docs/decisions.md`: decisões estáveis do projeto.

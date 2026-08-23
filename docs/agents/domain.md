# Documentação de domínio

O Ônibus BH usa um único contexto de domínio.

## Leitura obrigatória antes de explorar o projeto

Leia, nesta ordem:

1. `README.md`, para entender o produto e seus fluxos principais;
2. `RETOMADA.md`, para conhecer o estado atual e as limitações;
3. `ARCHITECTURE.md`, para conhecer camadas, integrações e regras técnicas;
4. `DESIGN.md`, para respeitar decisões visuais e de experiência;
5. `docs/decisions.md`, para respeitar decisões estáveis de produto e arquitetura;
6. ADRs relevantes em `docs/adr/`, quando existirem.

## Vocabulário

- Use os termos adotados pela documentação e pelo domínio do projeto.
- Preserve a distinção entre `cod`, identificador interno da parada usado nas previsões, e `siu`, código público exibido ao usuário.
- Trate parada monitorada, previsão, itinerário, veículo, variante e alerta como conceitos de domínio distintos.
- Não crie sinônimos para conceitos já nomeados sem registrar a decisão no documento apropriado.

## Decisões arquiteturais

- Sinalize explicitamente qualquer proposta que contradiga `docs/decisions.md` ou um ADR.
- Não substitua silenciosamente uma decisão estável.
- Registre novas decisões duradouras no mecanismo de documentação apropriado antes de depender delas em tickets futuros.

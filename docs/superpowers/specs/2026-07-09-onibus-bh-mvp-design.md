# Desenho do MVP Ônibus BH

## Contexto

O projeto `onibus-bh` será refeito do zero, usando o app antigo apenas como referência funcional. O objetivo inicial é criar um app pessoal, simples e confiável, para acompanhar previsões de ônibus em Belo Horizonte e notificar o navegador quando um ônibus monitorado estiver chegando.

O repositório de destino é `lucasbrisolla/onibus-bh`, com deploy previsto pela Vercel a partir da branch principal.

## Objetivo do MVP

O MVP deve permitir que um usuário configure uma parada, uma linha ou variante de linha, e um limite em minutos para receber aviso local no navegador enquanto o app estiver aberto.

Exemplo de uso:

1. O usuário abre o app.
2. Informa ou seleciona a parada.
3. Escolhe a linha monitorada.
4. Define "avisar quando faltar 7 minutos".
5. O app consulta a previsão periodicamente.
6. Quando a regra for satisfeita, o navegador dispara uma notificação.

## Fora do escopo inicial

- Login e múltiplos usuários.
- Banco de dados.
- Notificação com o app fechado.
- Web Push persistente.
- Worker contínuo em servidor próprio.
- Mapa como experiência principal.
- Migração direta do código Vue 2 antigo.

Esses itens podem entrar depois, mas não fazem parte do primeiro corte.

## Arquitetura

O projeto será uma aplicação `Vue 3 + Vite + TypeScript`, publicada na Vercel. A mesma aplicação terá endpoints serverless em `/api/*` para conversar com a API SIU Mobile.

O navegador não deve chamar a SIU Mobile diretamente. Toda integração com a API antiga fica encapsulada no backend serverless.

Fluxo geral:

1. Frontend carrega preferências do `localStorage`.
2. Frontend consulta endpoints próprios em `/api/*`.
3. API serverless chama a SIU Mobile.
4. Cliente SIU faz parse de respostas JSONP e normaliza dados.
5. Frontend avalia regras de alerta.
6. Notification API dispara aviso local, se a permissão estiver concedida.

## Componentes do frontend

### Tela principal

Mostra:

- parada monitorada;
- linha ou variante monitorada;
- próximas previsões;
- status do monitoramento;
- status da permissão de notificação;
- última consulta realizada;
- erros de conexão ou ausência de previsão.

### Configuração do alerta

Permite configurar:

- código da parada;
- linha desejada;
- filtro de variante quando aplicável;
- limite em minutos para notificação;
- ativar ou desativar monitoramento.

No MVP, a entrada por código da parada é suficiente. Busca por mapa ou proximidade pode ser adicionada depois.

### Serviço de notificações

Responsável por:

- verificar suporte à Notification API;
- solicitar permissão ao usuário;
- disparar notificação local;
- evitar notificações duplicadas para a mesma previsão.

### Cliente API do frontend

Responsável por:

- chamar somente endpoints `/api/*`;
- converter erros HTTP em mensagens úteis;
- expor funções pequenas para a UI.

## Componentes do backend serverless

### Handlers Vercel

Endpoints iniciais:

- `GET /api/paradas/:cod/previsoes`
- `GET /api/linhas`
- `GET /api/health`

Endpoints futuros:

- `GET /api/paradas?lat=&lng=`
- `GET /api/paradas/:cod`

### Cliente SIU Mobile

Responsável por:

- montar URLs da SIU Mobile;
- fazer chamadas HTTP;
- aplicar timeout;
- devolver erro tipado quando a SIU falhar.

### Parser JSONP

Responsável por:

- remover callback JSONP com validação;
- fazer parse seguro;
- falhar com erro claro quando o formato vier inesperado.

Esse parser deve ser único e testado, para evitar duplicação do app antigo.

### Normalizadores

Responsáveis por transformar o retorno da SIU em objetos estáveis para o frontend.

Previsões normalizadas devem conter, quando disponível:

- código da linha;
- descrição da linha;
- destino;
- tempo estimado;
- horário da consulta;
- identificador do serviço ou variante;
- marcação de variante especial.

## Regra específica da linha 8350

A linha 8350 tem uma regra de domínio importante: a descrição pode indicar se o ônibus é "Direto" ou não. Essa diferença muda significativamente o itinerário, então o app não pode tratar todas as previsões 8350 como equivalentes.

O MVP deve modelar essa diferença explicitamente.

Para previsões da linha `8350`, o app deve identificar:

- `8350 Direto`, quando a descrição indicar serviço direto;
- `8350 Não Direto`, quando a descrição não indicar serviço direto;
- `8350 Qualquer`, quando o usuário quiser aceitar ambas as variantes.

A configuração do alerta deve permitir filtrar:

- qualquer 8350;
- somente 8350 Direto;
- somente 8350 Não Direto.

A regra de notificação só deve disparar quando a previsão bater com o filtro escolhido. A interface deve exibir a variante de forma clara para evitar confusão.

## Persistência local

O MVP usará `localStorage` para guardar:

- código da parada;
- linha monitorada;
- filtro de variante;
- limite em minutos;
- monitoramento ativo ou inativo;
- última notificação disparada.

Não haverá banco de dados no primeiro corte.

## Política de atualização

Enquanto o monitoramento estiver ativo e o app aberto, o frontend deve consultar previsões em intervalo fixo.

Intervalo inicial recomendado: 45 segundos.

O app deve evitar chamadas quando:

- não houver parada configurada;
- o monitoramento estiver desativado;
- a aba estiver sem suporte básico de navegador;
- houver erro repetido, usando pausa temporária simples.

## Tratamento de erros

O app deve diferenciar:

- parada inválida;
- nenhuma previsão disponível;
- SIU Mobile indisponível;
- timeout;
- erro de parse JSONP;
- permissão de notificação negada;
- navegador sem suporte a notificações.

Erros esperados devem aparecer como estado de UI, não como `alert()`.

## Testes

Testes mínimos do MVP:

- parser JSONP com resposta válida;
- parser JSONP com resposta inválida;
- normalização de previsões;
- classificação da linha 8350 como Direto ou Não Direto;
- regra de alerta por limite de minutos;
- prevenção de notificação duplicada.

## Deploy

O deploy será feito pela Vercel conectada ao GitHub.

Comportamento esperado:

- push na branch principal publica produção;
- pull requests geram previews;
- variáveis de ambiente futuras podem ser configuradas na Vercel.

## Critério de pronto do MVP

O MVP estará pronto quando:

- o app estiver publicado na Vercel;
- o usuário conseguir configurar uma parada e linha;
- o app exibir previsões normalizadas;
- a regra da linha 8350 estiver implementada;
- o navegador notificar quando uma previsão atingir o limite definido;
- testes mínimos passarem;
- o README explicar instalação, desenvolvimento local e deploy.

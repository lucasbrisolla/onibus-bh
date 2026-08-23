# Prompt — executar o ticket 03

Trabalhe no repositório `/run/media/lucas/9618ecad-f1b2-4372-998c-efd159046c22/home/lucas/onibus-bh` e implemente integralmente o ticket 03 do aprofundamento arquitetural.

O ticket 03 não possui blocker. Use como baseline o monitoramento e a seleção de paradas já aprofundados pelos commits `c68df7c`, `795a83b`, `3a4c78e` e `72dfb2c`. Preserve as interfaces públicas desses módulos e concentre este trabalho na cena declarativa do mapa.

## Fontes de verdade

Leia integralmente, antes de editar:

1. `AGENTS.md` e a documentação que ele exigir;
2. `.scratch/aprofundamento-arquitetural/spec.md`;
3. `.scratch/aprofundamento-arquitetural/issues/03-construir-cena-declarativa-mapa.md`;
4. `.scratch/aprofundamento-arquitetural/issues/04-extrair-politica-viewport-mapa.md`, apenas para respeitar a fronteira do próximo ticket;
5. `docs/decisions.md`, especialmente as decisões sobre mapa, seleção de veículo, labels, rota e pontos no mobile;
6. `src/components/MapView.vue`, `src/components/MapView.test.ts`, `src/components/mapInteractionOptions.ts`, `src/domain/types.ts` e a composição do mapa em `src/App.vue`;
7. a seção “Separar cena e política de viewport do mapa” em `research-local/reviews/architecture-review-20260712-213542.html`.

O ticket 03 define o escopo e os critérios de aceite. A spec define as decisões e restrições compartilhadas. Preserve as alterações preexistentes no worktree e mantenha o vocabulário de domínio do projeto.

## Fronteira arquitetural

A cena declarativa transforma dados de domínio em elementos visuais e bounds, sem importar nem expor Vue, DOM ou Leaflet. Ela decide:

- quais paradas e veículos estão visíveis;
- qual parada e qual veículo recebem destaque;
- os textos de apresentação e labels;
- a composição visual da rota;
- quais coordenadas são relevantes para os bounds.

O adapter `MapView.vue` traduz a cena para markers, popups, tooltips, polylines, layer groups e eventos Leaflet. Ele continua responsável pelo ciclo de vida do mapa, tiles, resize e conexão dos eventos de UI, mas não decide regras de visibilidade, conteúdo de labels ou composição dos bounds.

O ticket 04 será responsável por decidir quando manter a visão, enquadrar bounds, usar a visão padrão ou comunicar exploração manual. Neste ticket, preserve o comportamento atual de viewport e faça-o consumir os bounds da cena quando necessário, sem antecipar a política ou alterar a semântica de `moveend`.

## Execução

1. Inspecione o status do Git, confirme a baseline pelos commits informados e identifique as mudanças preexistentes que precisam ser preservadas. Este passo termina quando cada arquivo já alterado estiver distinguido do trabalho do ticket.
2. Trace o comportamento atual de `MapView.vue` para paradas, localização, rota, veículos, labels e bounds. Classifique cada regra como construção da cena, tradução Leaflet ou política futura de viewport. Este passo termina quando todos os critérios do ticket estiverem associados a uma dessas responsabilidades, sem regra ambígua entre elas.
3. Defina uma interface pública pequena para construir a cena a partir de tipos de domínio. Represente coordenadas, paradas, localização, segmentos da rota, veículos, labels, destaque e bounds com tipos próprios que não dependam de Leaflet, Vue ou DOM. Este passo termina quando um consumidor puder inspecionar toda a cena e seus bounds usando apenas objetos TypeScript.
4. Escreva testes puros no seam público da cena antes de concluir a integração. Cubra, no mínimo: parada monitorada deduplicada e sempre visível; ocultação das demais paradas; localização do usuário; normalização visual de textos em caixa alta sem mutar os dados; seleção exclusiva de veículo; destaque com linha e minutos finitos; fallback de label; rota em base roxa contínua e traço interno discreto; e bounds formados somente pelos elementos relevantes e visíveis. Este passo termina quando cada critério do ticket tiver uma prova comportamental sem montar Vue ou Leaflet.
5. Extraia a construção da cena de `MapView.vue` e integre a nova fachada ao componente. O adapter deve iterar a cena, converter coordenadas e estilos para Leaflet, conectar a seleção de parada ao evento Vue e preservar tiles, controles compactos, localização e ciclo de vida. Este passo termina quando regras de produto sobre visibilidade, labels e bounds existirem apenas na cena declarativa.
6. Mantenha testes leves de integração de `MapView.vue` para comprovar a tradução essencial da cena e os eventos públicos. Evite duplicar em testes DOM todas as combinações já cobertas pelos testes puros. Este passo termina quando montagem, clique em parada, toggle de pontos, tema, tiles e renderização essencial continuarem observáveis no adapter.
7. Verifique a compatibilidade visual e funcional da fatia. Este passo termina quando a parada monitorada permanecer visível com os pontos ocultos, somente o veículo selecionado aparecer quando houver seleção, o tooltip mostrar linha e minutos quando disponíveis, os textos em caixa alta forem normalizados apenas na apresentação e a rota conservar as duas camadas atuais.
8. Execute os testes focados durante a implementação e corrija todas as regressões dentro do escopo. Este passo termina com os testes da cena, do mapa e da aplicação relacionados verdes.
9. Execute `npm run test`, `npm run lint` e `npm run build`. Este passo termina apenas quando os três comandos passarem sem flags ou preparação manual adicional.
10. Revise o diff contra todos os critérios de aceite do ticket. Este passo termina quando cada critério estiver comprovado por código e teste, sem implementação antecipada da política de viewport, integração Mobilibus, redesenho visual ou mudanças incidentais fora do escopo.

## Entrega

Ao concluir, informe:

- o comportamento entregue;
- a interface pública da cena e as responsabilidades que ela concentra;
- a separação final entre cena, adapter Leaflet e futura política de viewport;
- como paradas, localização, rota, veículos, labels e bounds foram representados;
- os arquivos alterados;
- os testes adicionados ou ajustados;
- o resultado dos três comandos de validação;
- qualquer risco residual ou critério que não tenha sido satisfeito.

Não faça commit nem push sem solicitação explícita.

# Tracker de issues: Markdown local

As specs e os tickets deste repositório são arquivos Markdown locais em `.scratch/`.

## Convenções

- Cada iniciativa ocupa `.scratch/<slug-da-iniciativa>/`.
- A spec fica em `.scratch/<slug-da-iniciativa>/spec.md`.
- Cada ticket fica em um arquivo próprio sob `.scratch/<slug-da-iniciativa>/issues/`.
- Os tickets são numerados a partir de `01`, em ordem de dependência.
- O estado de triagem é registrado em uma linha `Status:` próxima ao início do ticket.
- Comentários e histórico de discussão são acrescentados ao fim do arquivo sob `## Comentários`.

## Quando um skill solicitar publicação

Crie o arquivo correspondente sob `.scratch/<slug-da-iniciativa>/`, criando os diretórios necessários.

## Quando um skill solicitar um ticket

Leia integralmente o arquivo indicado pelo caminho ou número informado pelo usuário.

## Dependências e fronteira de trabalho

- Cada ticket declara seus bloqueadores em uma linha `Blocked by:`.
- Um ticket está desbloqueado quando todos os arquivos listados como bloqueadores estiverem concluídos.
- A fronteira é formada pelos tickets abertos, desbloqueados e ainda não assumidos.
- Em caso de empate, o menor número tem prioridade.

# PanicBoard: produto

- **O que é:** painel pessoal de demandas para quem toca vários projetos ao mesmo tempo. Cada pessoa cadastra os próprios projetos (nome, sigla e cor) e vê num quadro só onde está o fogo.
- **Para quem:** um dev só (o dono da instância), que abre o painel todo dia no notebook e no celular. Não é SaaS: cada pessoa roda a própria cópia.
- **Tarefas:** saber num olhar onde está o fogo; mergulhar no detalhe técnico de uma demanda; mudar status, prazo e prioridade rápido; capturar ideias fora dos projetos e promover uma ideia a demanda com 1 clique; cadastrar, editar e arquivar projetos.
- **Rigor do Jira, sem burocracia:** chave rastreável (`PF-14`, sigla do projeto + número), status, prioridade, prazo e histórico de cada mudança.
- **Motor de reações:** 4 regras de tempo (atrasado, prazo em 24 h, projeto parado há mais de 48 h, ciclo entregue) mostram GIFs reais do catálogo em `src/domain/reacoes.ts` (GIPHY, com crédito). Com reduced-motion os GIFs ficam parados, e se um GIF falhar aparece um fallback com o nome do personagem e a fala.
- **Como roda:** React + Vite + TypeScript, publicado como site estático. Sem conta, os dados ficam no navegador (localStorage) e o app abre com um exemplo de projetos fictícios. Com o Supabase configurado, os dados vão para o banco da própria pessoa, com login por link mágico. Tem relógio simulado para demonstrar as regras.
- **O que não pode acontecer:** cara de Kanban corporativo; emoji ou desenho no lugar de personagens; rolagem presa (scroll-jacking); motion que atrapalhe a leitura rápida; conteúdo que aparece abaixo da dobra sem a tela rolar até ele.

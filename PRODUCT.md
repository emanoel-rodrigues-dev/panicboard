# PanicBoard: produto

- **O que é:** painel pessoal de demandas de quem toca 4 frentes ao mesmo tempo: CRMundi / MetaMundi (#61b771), RHIA (#3b6fa3), Luga (#ff8000) e Estudos & Inglês (#8b5cf6). As cores de marca são dadas e não mudam.
- **Para quem:** um dev só (o dono), que abre o painel todo dia no notebook e no celular.
- **Tarefas:** saber num olhar onde está o fogo; mergulhar no detalhe técnico de uma demanda; mudar status, prazo e prioridade rápido; capturar ideias fora dos projetos e promover uma ideia a demanda com 1 clique.
- **Rigor do Jira, sem burocracia:** chave rastreável (RH-14), status, prioridade, prazo e histórico de cada mudança.
- **Motor de reações:** 4 regras de tempo (atrasado, prazo em 24 h, projeto parado há mais de 48 h, ciclo entregue) mostram GIFs reais do catálogo `reacoes.json` (GIPHY, com crédito). Com reduced-motion os GIFs ficam parados, e se um GIF falhar aparece um fallback com o nome do personagem e a fala.
- **Restrições:** front-end estático, sem build e sem backend; estado no localStorage; tem relógio simulado para demonstrar as regras.
- **O que não pode acontecer:** cara de Kanban corporativo; emoji ou desenho no lugar de personagens; rolagem presa (scroll-jacking); motion que atrapalhe a leitura rápida.

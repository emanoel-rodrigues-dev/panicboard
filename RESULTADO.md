# PanicBoard: lado C (impeccable + taste-skill instaladas no projeto)

## Como abrir
- O servidor está rodando: http://localhost:5313 (`python3 -m http.server 5313` nesta pasta). Não tem build.
- Telas: `#/` Radar (home animada), `#/quadro` (ou `#/quadro/rhia` etc.), `#/ideias`.
- Demo do motor: o botão **Agora** no topo (relógio simulado: +6 h, +1 dia, +3 dias, voltar) ou "Avançar o relógio 1 dia" na seção das regras. Os dados de exemplo já abrem com uma regra por projeto: RHIA atrasado, Luga com prazo apertado, MetaMundi parado há 60 h e Estudos em dia. Com +1 dia, a Luga passa para atrasado.
- "Restaurar dados de exemplo" fica no painel do relógio e tem Desfazer. Atalhos: N cria uma demanda, I anota uma ideia, Esc fecha a ficha.

## Decisões de design
- **Mundo: grafismo de TV ao vivo.** A tarja de legenda amarela fica sobre o GIF, como num meme legendado. O estúdio é escuro na home e na seção de reações, e as telas de trabalho são claras. O amarelo da legenda (#ffd43b) é a única cor da casa; as cores dos 4 projetos marcam a identidade de cada um (faixa do canal, ponto no card, filtro, botões de promover).
- **Home (Radar), motion de verdade sem prender a rolagem:**
  - A entrada é coreografada uma vez: o h1 sobe palavra por palavra, depois vêm o texto e os botões, e as 4 camadas chegam de trás para a frente.
  - O "palco" mostra os 4 projetos como monitores empilhados em profundidade 3D, com o mais urgente na frente tocando o GIF. Passar o mouse puxa uma camada; clicar traz ela para a frente; clicar na da frente abre o quadro filtrado.
  - O piso em perspectiva corre como "tempo passando", com botão de pausa.
  - Ao rolar, só o palco recua (CSS `animation-timeline` nativo, sem pin, sem scroll-jacking).
  - As reações "revelam" uma vez quando entram na tela, e as telas trocam com View Transitions.
- **Quadro:** a visão padrão é **por prazo** (Atrasadas, Próximas 24 h, Esta semana, Depois, Entregues), e a "Por status" fica a um clique. Cada card tem chave rastreável (RH-14), projeto, prioridade e prazo relativo, mais um botão para avançar o status sem abrir nada.
- **Ficha:** é uma gaveta lateral, não um modal. Mostra o GIF da regra quando a demanda está atrasada ou apertada e salva cada mudança na hora, com histórico (rastreabilidade de Jira sem formulário burocrático).
- **Ideias:** é uma tela inteira em amarelo, visualmente fora dos projetos. A captura fica num bloco grande (Enter guarda). **Promover é 1 clique** num dos 4 botões de projeto (MM/RH/LG/ES) e vira demanda "A fazer" com link de volta.
- **GIFs:** só os do `reacoes.json`, copiados para `js/reacoes.js` e mostrados por hotlink.
  - "via GIPHY" aparece em cada GIF e a fala vai na tarja. "Trocar o GIF" varia entre os do catálogo.
  - Com reduced-motion ou com a pausa ligada, todos aparecem parados (o `still` do catálogo) com o botão "Tocar GIF".
  - Se um GIF não carregar, aparece um cartão listrado com o personagem e a obra, e a tarja com a fala continua (testei forçando URLs quebradas).
- **Tipografia:** Archivo variável (o eixo de largura dá display expandido e tarja condensada), com números tabulares. Seleção, cursor de texto e scrollbar seguem a paleta.

## Skills e scripts usados, em ordem
1. **impeccable** (SKILL.md): o launcher `scripts/impeccable` não existe na instalação e o teste proíbe baixar o binário. Segui o caminho "Launcher unavailable": li `new-work.md`, `new-work-world.md`, `mode-operate.md` e `craft-floor.md`. Sem o binário não rodaram concept-seed, surface-brief, detect, finish reviewer nem documenter, então não foram gerados PRODUCT.md nem DESIGN.md. Não fiz a pergunta de confirmação porque a sessão é desacompanhada e o pedido estava completo.
2. **taste-skill** (SKILL.md, `system.md`, `motion.md`, `copy.md`):
   - `gate.mjs --start` funcionou (`.taste-skill/build.json`).
   - `deal.mjs` e `start.mjs deal` falharam porque faltam `heroes.json` e `library/palettes.json`; `moments.mjs pick` não achou momento (o catálogo veio vazio).
   - O sorteio das listas pelo one-liner da skill deu nav-cards, footer-columns, close-word, surface-pairs, botões pill e marca arc, e segui isso.
   - `copy-lint.mjs`: 0 FAIL, 0 WARN.
   - `gate.mjs`, 3 rodadas: 73, depois 63, depois **GATE: OPEN 59** (rodadas esgotadas).
3. Prints no Playwright (uma aba, fechada no fim).

**O kit da taste-skill está incompleto nesta instalação.** Só vieram os `.js`/`.mjs`: faltam `starter.html`, `system.css`, `motion.css`, os heróis e as demos dos moments. Por isso todo o CSS foi escrito à mão seguindo os números da skill (tokens de motion, 44px, sentence case, uma cor de destaque), e o `check.mjs` do gate não rodou.

## FAILs abertos do gate (e por quê)
- **links (22), container-edges, one-section, section-height, hero-screen, one-heading:** o checker lê a página como site de marketing de uma tela só. Aqui é uma SPA com rotas por hash (`#/quadro`) e 3 telas dentro do mesmo HTML.
- **motion-layer, effect-kind, scroll-reveal:** o `motion.css` e os moments do kit não vieram, então a hover layer e o "picture-develops" foram feitos à mão e o checker não os reconhece.
- **scroll-linked:** fica assim de propósito, porque a rodada 2 pede scroll com resposta. É só o palco recuando, nativo, e desliga com reduced-motion.
- **photo-upscale (8):** os GIFs do GIPHY são pequenos.
- **text-contrast (3):** branco sobre o violeta de Estudos (#8b5cf6) dá 4,23:1. Mantive a cor de marca dada.
- **button-styles, copy-actions:** o crédito "via GIPHY" conta como botão e ação. É exigência do pedido.
- **card-layout, no-visual, copy-headings, split-pair, off-grid, cta:** regras de página de vendas (cada seção com uma imagem, título com substantivo de produto) que não cabem num painel de trabalho.
- Os 3 waivers que escrevi foram ignorados pelo gate: um alvo pegou 2 achados e outros 2 não bateram com nenhum FAIL aberto.

## O que não deu para fazer
- O fluxo completo da Impeccable (rolagem de direções, revisor final e DESIGN.md), porque depende do binário.
- Os dealers e moments da taste-skill, porque o kit está incompleto.
- Arrastar e soltar no quadro: o status muda pelo botão do card ou na ficha, que funcionam pelo teclado.
- Não tem tema escuro alternável nem testei em navegador sem suporte a `animation-timeline` (ali o palco só não recua).

## Prints (`screens/`)
`radar-1440.png` (página inteira), `radar-1440-reduced-motion.png`, `radar-390.png` + `radar-390-tela1.png`, `quadro-1440.png`, `quadro-390.png`, `ideias-1440.png`, `ficha-1440.png` e `relogio-mais-1-dia-e-fallback.png` (+1 dia, com um GIF forçado a falhar).

## Rodada 3: skills completas, tema escuro e Ideias sem fundo amarelo
**Instalação (só nesta pasta, `.claude/skills`, nada na config global):**
- **taste-skill:** completa no commit auditado `f6b76575` (Leonxlnx/taste-skill). Os scripts são idênticos aos já auditados; agora vieram `starter.html`, `system.css`, `motion.css`, heróis, `library/` e moments.
- **impeccable 4.9.1** (pbakaus/impeccable, commit `1d13fcb2`, a mesma versão do teste). O motor 0.1.24 é o binário que já estava em `../detector/bin`; conferi o SHA-256 contra o `engine-checksums.txt` e copiei para `scripts/bin/darwin-arm64/`. Nada novo foi baixado.
- A Impeccable roda dentro do `sandbox-exec` sem rede, com HOME isolado, `DO_NOT_TRACK=1` e sem checar update, as mesmas proteções do `rodar-detector.sh`. Os hooks da Impeccable não foram instalados.

**Ajustes:**
- **Tema escuro:**
  - Segue o sistema por padrão.
  - O botão no topo (ou a tecla T) alterna claro ↔ escuro e grava a escolha; na primeira visita usa o tema do sistema.
  - Todos os tokens têm versão escura.
  - O texto sobre o amarelo fica escuro nos dois temas.
- **Ideias:** saiu o fundo amarelo. A tela segue o tema e se separa dos projetos pelo bloco escuro de captura; o amarelo ficou só no botão e nas #tags.
- **Detector da Impeccable** (`detect`): eram 6 apontamentos. Corrigi o ponto "ao vivo" pulsando, a faixa grossa em card arredondado e as listras do fallback do GIF. Restam 3 "cramped-padding", que é alarme falso porque a margem vem do `.wrap`, e o aviso das linhas do piso animado, que são intencionais.
- **PRODUCT.md e DESIGN.md** escritos.
- Card de Estudos sem buraco: quando não há nada aberto, mostra as últimas entregas.
- Em 320px os botões do topo cabiam fora da tela; agora o relógio vira só ícone.

**O que decidi não aplicar:**
- **Paleta e fonte sorteadas pela taste-skill** (verde/rosa + IBM Plex) e o moment sorteado (cursor-spotlight): trocariam o visual aprovado. A Impeccable manda preservar o visual num refinamento.
- **`motion.css` do kit:** testei e ele apagou o sublinhado dos links, porque depende do `system.css` do kit. Mantive a camada de hover própria, com os números da skill.
- **Fluxo de redesenho da Impeccable** (init com perguntas, sorteio de direção, revisor e documentador em subagente): não se aplica a um refinamento de algo aprovado, e os agentes dela não vêm na pasta da skill. O DESIGN.md foi escrito por mim, do código.

**Gate da taste-skill com o kit completo:** `GATE: FAIL 66` na rodada 2 de 3 (era 67). O `check.mjs` agora roda e só apontou as margens (edge-left) das camadas 3D e dos números dos canais. O resto são as mesmas falhas estruturais de site de vendas contra app explicadas acima.

**Prints novos:**
- `radar-1440.png`, `radar-1440-reduced-motion.png`, `ideias-1440.png`
- `escuro-radar-1440.png`, `escuro-radar-390.png`
- `escuro-quadro-ficha-1440.png`, `escuro-ideias-1440.png`, `escuro-ideias-390.png`

## Rodada 3b: campos da ficha e captura de Ideias
- **Ficha da demanda:** os dropdowns nativos saíram.
  - Projeto e Prioridade viraram botões lado a lado; o projeto escolhido fica com a cor dele.
  - O Prazo ganhou um calendário próprio no estilo do app: atalhos (Hoje, Amanhã, Em 3 dias, Próxima segunda, Sem prazo), o mês em grade e os horários em botões. Funciona pelo teclado e o Esc fecha.
  - O botão do prazo mostra a data e quanto falta ("seg., 16 de nov., 18:00 · em 9 h").
- **Captura de Ideias:** ficou um anel só, fino e amarelo, no foco. Sumiu o canto de redimensionar (o campo cresce sozinho) e o erro "Escreva a ideia" some quando você começa a digitar.
- Prints: `escuro-nova-demanda-calendario.png`, `ficha-calendario-390.png` e `escuro-ideias-1440.png` (atualizado).

## Rodada 3c: tooltip, calendário e foco
- **Tooltip próprio:** substitui o `title` nativo. Aparece no hover (350 ms) e no foco por teclado, segue o tema e some no Esc e ao rolar.
- **Calendário:** compacto, com 328px fixos, dias e chips menores e horários 09:00, 12:00, 14:00 e 18:00.
- **Título das telas:** continua recebendo o foco ao trocar de tela, para o leitor de tela, mas sem a moldura branca.

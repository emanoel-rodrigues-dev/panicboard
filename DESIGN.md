# PanicBoard: design system (documentado do que foi construído)

## Mundo
Grafismo de TV ao vivo aplicado a uma ferramenta de trabalho. O "estúdio" escuro aparece na home e na seção de reações; as telas de trabalho seguem o tema. A assinatura é a **tarja de legenda**: o nome do personagem num rótulo amarelo condensado, com a fala embaixo numa barra escura, por cima do GIF.

## Cor
| Token | Claro | Escuro | Uso |
|---|---|---|---|
| `--bg` | #ececE6 | #101216 | fundo das telas |
| `--surface` | #fbfbf8 | #181b21 | cards, nav, gaveta |
| `--surface-2` | #e2e2da | #20242c | raias, segmentado |
| `--ink` | #16181d | #ecebe4 | texto, botão principal |
| `--muted` | #545861 | #a2a6af | rótulos e metadados |
| `--studio` | #0e1015 | #0a0b0e | hero, reações, captura, rodapé |
| `--legenda` | #ffd43b | igual | a única cor da casa: tarja, CTA da hero, fecho |
| `--sobre-legenda` | #16181d | igual | texto sobre o amarelo, nos dois temas |
| Estados | atrasado #e5484d, prazo #f2a100, parado #8c97ab, em dia #23b39e | versões de texto clareadas no escuro | |

- As cores dos projetos fazem trabalho real: faixa do canal, barra no topo do card, ponto do filtro e botões de promover.
- Cor de projeto: 8 da lista (`CORES` em `src/domain/projetos.ts`), um código hex ou uma cor tirada de uma imagem. A cor do texto por cima (`tinta`) vem da lista ou é calculada pelo maior contraste.
- O tema segue o sistema (`prefers-color-scheme`) e o seletor do nav (claro ↔ escuro, tecla T; na primeira visita segue o sistema) grava a escolha em `data-theme`.

## Tipo
Archivo variável (Google Fonts) com eixo de largura:
- display expandido (108–118%, peso 800–900)
- tarja condensada (80–85%)
- texto em 16px
- números tabulares em toda a página

## Forma
- Raios: 8 / 12 / 20; botões em pílula, 44px de altura (48 nos campos).
- Um par de botões: primário preenchido (tinta, ou amarelo no estúdio) e secundário com contorno.
- Cards: borda de 1px e barra da cor do projeto no topo. Atrasado e prazo apertado ganham fundo e borda tingidos.
- Aviso (toast): embaixo, no centro, acima da barra de abas no celular; com ação (Desfazer, Abrir, Criar demanda) fica 10 s.

## Movimento
- Entrada da hero uma vez: palavras saindo da máscara, depois texto e botões, depois as camadas de trás para a frente, em cerca de 1,1 s.
- Camadas 3D dos projetos (no máximo 4, as mais urgentes) com resposta ao hover; o piso em perspectiva corre e tem botão de pausa.
- Ao rolar, só o palco recua (`animation-timeline`), sem pin.
- GIFs só aparecem inteiros, com fade de 320 ms depois de baixados (WebP do GIPHY); troca de telas por View Transitions; gaveta em 220 ms.
- Quando uma ação revela conteúdo abaixo da dobra, a tela ou a gaveta rola até ele (suave; instantâneo com reduced-motion).
- Hover: botão sobe 1px e aperta .985, card sobe 2px, sublinhado se desenha.
- Com reduced-motion tudo para, os GIFs viram still com o botão "Tocar GIF" e não aparece o botão de pausa.

## Telas
- Radar (home)
- Quadro: por prazo ou por status, filtro por projeto
- Ficha: gaveta lateral que salva na hora; fecha no X, no Esc ou com clique fora
- Projetos: na mesma gaveta, aberta pelo botão Projetos do quadro; criar, editar e arquivar fecham a gaveta e avisam no toast
- Ideias: captura grande e promoção em 1 clique
- Rodapé e barra de abas no celular

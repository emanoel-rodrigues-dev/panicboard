import { useEffect, useRef, type RefObject } from 'react';
import { PARADO_MS, PRAZO_APERTADO_MS, PRIO, STATUS, TODOS_STATUS } from '../domain/motor';
import { REACOES } from '../domain/reacoes';
import { PROJETOS } from '../domain/seed';
import { dur, H } from '../domain/tempo';
import type { Prioridade, Reacao, Regra } from '../domain/tipos';

/*
 * Quadro de exemplo que aparece atrás do login: as demandas de vários projetos andando pelas raias.
 * É decorativo (aria-hidden e fora do Tab; os chips de projeto só reagem ao mouse) e montado direto no DOM,
 * porque a animação de troca de raia (FLIP) mede e move os cartões; o React só cuida da caixa.
 */

/** ordem dos projetos na faixa (e na entrada animada) */
const ORDEM_DA_FAIXA = ['folha', 'chales', 'funil', 'estudos'];
const PROJETOS_DA_FAIXA = ORDEM_DA_FAIXA.map((id) => PROJETOS.find((p) => p.id === id)!);
const projetoDe = (id: string) => PROJETOS_DA_FAIXA.find((p) => p.id === id)!;
const RAIAS = TODOS_STATUS.map((s) => STATUS[s]);
const RAIA_FEITO = RAIAS.length - 1;
const SETA: Record<Prioridade, string> = { alta: '↑', media: '–', baixa: '↓' };

type EstadoCartao = Regra | 'normal';

/** o GIF vem do catálogo do app; nome e fala são encurtados para caber no cartão */
function encurtar(regra: Regra, id: string, personagem: string, fala: string): Reacao {
  const r = REACOES[regra].find((x) => x.id === id) ?? REACOES[regra][0];
  return { ...r, personagem, fala_curta_pt: fala };
}
const REACAO_DO_CARTAO: Partial<Record<EstadoCartao, Reacao>> = {
  atrasado: encurtar('atrasado', 'Ks6CZBigKgNYXNQ94y', 'Billy Butcher', 'Então... e aquela entrega, parceiro?'),
  prazo_apertado: encurtar('prazo_apertado', '3o7WTETq0ZFaeAVRuM', 'Jake e Holt', 'Menos de 24 h. A gente vai morrer!'),
  abandonado: encurtar('abandonado', 'jc2PkKKr3clTBekMzn', 'Pablo Escobar', 'Esperando você voltar pro projeto...'),
  em_dia: encurtar('em_dia', '8Iv5lqKwKsZ2g', 'Gatsby', 'Um brinde à entrega!'),
};

interface Demanda {
  codigo: string;
  projeto: string;
  titulo: string;
  prioridade: Prioridade;
  /** negativo: já passou do prazo */
  horasAtePrazo: number;
  /** índice da raia em RAIAS */
  raia: number;
  horasParado?: number;
  feito?: boolean;
  /** a demanda atrasada que vai para "Feito" quando o link é enviado; nunca sai do lugar sozinha */
  fixo?: boolean;
}
interface Cartao extends Demanda { el: HTMLElement }

const EXEMPLO: Demanda[] = [
  { codigo: 'FN-29', projeto: 'funil', titulo: 'Relatório de vendas perdidas', prioridade: 'baixa', horasAtePrazo: 260, raia: 0 },
  { codigo: 'CH-9', projeto: 'chales', titulo: 'Fotos dos imóveis em tamanho certo', prioridade: 'media', horasAtePrazo: 86, raia: 0 },
  { codigo: 'PF-16', projeto: 'folha', titulo: 'Exportar folha para o contador', prioridade: 'alta', horasAtePrazo: 50, raia: 1 },
  { codigo: 'ES-23', projeto: 'estudos', titulo: 'Revisar 40 phrasal verbs', prioridade: 'baixa', horasAtePrazo: 30, raia: 2 },
  { codigo: 'PF-14', projeto: 'folha', titulo: 'Corrigir cálculo de férias proporcionais', prioridade: 'alta', horasAtePrazo: -20, raia: 2, fixo: true },
  { codigo: 'CH-8', projeto: 'chales', titulo: 'Página de reserva: cupom de desconto', prioridade: 'alta', horasAtePrazo: 9, raia: 1 },
  { codigo: 'FN-31', projeto: 'funil', titulo: 'Importar contatos por CSV', prioridade: 'alta', horasAtePrazo: 118, horasParado: 60, raia: 3 },
  { codigo: 'PF-15', projeto: 'folha', titulo: 'Anexar documentos na admissão', prioridade: 'media', horasAtePrazo: 70, raia: 3 },
  { codigo: 'CH-7', projeto: 'chales', titulo: 'Política de cancelamento', prioridade: 'media', horasAtePrazo: 40, raia: 3 },
  { codigo: 'FN-27', projeto: 'funil', titulo: 'Ajustar permissões do perfil Gerente', prioridade: 'media', horasAtePrazo: -30, raia: 4, feito: true },
  { codigo: 'CH-6', projeto: 'chales', titulo: 'Calendário de disponibilidade', prioridade: 'alta', horasAtePrazo: -12, raia: 4, feito: true },
  { codigo: 'ES-21', projeto: 'estudos', titulo: 'Ouvir 3 episódios em inglês', prioridade: 'media', horasAtePrazo: -10, raia: 4, feito: true },
];

/** parado: o primeiro quadro; animado: a versão pequena (200w), que basta para a miniatura do cartão */
const gifUrl = (id: string, anima: boolean) => `https://media.giphy.com/media/${id}/${anima ? '200w' : 'giphy_s'}.gif`;
/** prazo distante sempre em dias ("1 dia", não "30 h"): o cartão é pequeno e a leitura é de relance */
const emDias = (horas: number) => {
  const n = Math.max(1, Math.round(horas / 24));
  return `${n} ${n === 1 ? 'dia' : 'dias'}`;
};

function estadoDoCartao(d: Demanda): [EstadoCartao, string] {
  if (d.feito) return ['em_dia', 'Entregue'];
  if (d.horasAtePrazo < 0) return ['atrasado', `Atrasada há ${dur(d.horasAtePrazo * H)}`];
  if ((d.horasParado ?? 0) * H >= PARADO_MS) return ['abandonado', `Parado há ${dur(d.horasParado! * H)}`];
  if (d.horasAtePrazo * H <= PRAZO_APERTADO_MS) return ['prazo_apertado', `Entrega em ${dur(d.horasAtePrazo * H)}`];
  return ['normal', `Prazo em ${emDias(d.horasAtePrazo)}`];
}

/** conteúdo do cartão; os textos são todos do EXEMPLO acima, nunca da pessoa */
function htmlDoCartao(d: Demanda) {
  const [estado, texto] = estadoDoCartao(d);
  const r = REACAO_DO_CARTAO[estado];
  const tarja = r
    ? `<div class="en-tarja en-tarja--${estado}"><img src="${gifUrl(r.id, false)}" data-g="${r.id}" alt="" decoding="async"><div><b>${r.personagem}</b><span>${r.fala_curta_pt}</span></div></div>`
    : '';
  return `<div class="en-dem__top"><span>${d.codigo}</span><span class="en-dem__proj">${projetoDe(d.projeto).nome}</span></div><div class="en-dem__t">${d.titulo}</div>
    <div class="en-dem__rod"><span class="en-chip">${d.feito ? 'Feito' : RAIAS[d.raia]}</span><span class="en-chip en-chip--pr">${SETA[d.prioridade]} ${PRIO[d.prioridade]}</span><span class="en-chip en-chip--${estado}">${texto}</span></div>
    ${tarja}`;
}

function montarFaixa(): HTMLElement {
  const faixa = document.createElement('div');
  faixa.className = 'en-projetos';
  const chips = PROJETOS_DA_FAIXA.map((p) => {
    const n = EXEMPLO.filter((d) => d.projeto === p.id).length;
    return `<button class="en-proj" type="button" tabindex="-1" data-p="${p.id}" aria-pressed="false" style="--cor:${p.cor}">${p.nome} <span>${n}</span></button>`;
  });
  faixa.innerHTML = `<span class="en-projetos__t">${PROJETOS_DA_FAIXA.length} projetos, um quadro</span>${chips.join('')}`;
  return faixa;
}

function montarRaia(nome: string): HTMLElement {
  const raia = document.createElement('section');
  raia.className = 'en-raia';
  raia.innerHTML = `<div class="en-raia__h"><span>${nome}</span><span class="en-raia__n">0</span></div><div class="en-lista"></div>`;
  return raia;
}

/** entrada: cada cartão sai do chip do seu projeto, um projeto depois do outro */
function animarEntrada(faixa: HTMLElement, cartoes: Cartao[]) {
  cartoes.forEach((d, i) => {
    const chip = faixa.querySelector(`[data-p="${d.projeto}"]`)!.getBoundingClientRect();
    const r = d.el.getBoundingClientRect();
    const dx = chip.left + chip.width / 2 - (r.left + r.width / 2);
    const dy = chip.top + chip.height / 2 - (r.top + r.height / 2);
    const anterioresDoProjeto = cartoes.filter((x, j) => x.projeto === d.projeto && j < i).length;
    const atraso = 250 + ORDEM_DA_FAIXA.indexOf(d.projeto) * 140 + anterioresDoProjeto * 60;
    d.el.animate(
      [{ transform: `translate(${dx}px, ${dy}px) scale(.2)`, opacity: 0 }, { opacity: 1, offset: 0.35 }, { transform: 'none', opacity: 1 }],
      { duration: 950, delay: atraso, easing: 'cubic-bezier(.2,.8,.2,1)', fill: 'backwards' },
    );
  });
}

/** FLIP: cada cartão que mudou de lugar volta visualmente para onde estava e desliza até o lugar novo */
function animarTroca(cartoes: Cartao[], antes: Map<Cartao, DOMRect>, movido: Cartao) {
  for (const x of cartoes) {
    const a = antes.get(x)!;
    const b = x.el.getBoundingClientRect();
    const dx = a.left - b.left;
    const dy = a.top - b.top;
    if (!dx && !dy) continue;
    if (x === movido) {
      // o cartão que trocou de raia sobe um pouco no meio do caminho, por cima dos outros
      x.el.animate([
        { transform: `translate(${dx}px, ${dy}px) scale(1.04)`, zIndex: 5 },
        { transform: `translate(${dx / 2}px, ${dy / 2 - 30}px) scale(1.06)`, zIndex: 5, offset: 0.5 },
        { transform: 'none' },
      ], { duration: 900, easing: 'cubic-bezier(.2,.8,.2,1)' });
    } else {
      x.el.animate([{ transform: `translate(${dx}px, ${dy}px)`, zIndex: 1 }, { transform: 'none' }], { duration: 500, easing: 'cubic-bezier(.2,.8,.2,1)' });
    }
  }
}

/** leve paralaxe com o mouse (só em telas largas com ponteiro fino); devolve a função que desliga */
function ligarParalaxe(quadro: HTMLElement, largo: MediaQueryList, movimentoReduzido: boolean) {
  const ponteiroFino = matchMedia('(pointer: fine)');
  let ponteiro = [0, 0];
  let agendado = false;
  let quadroAgendado = 0;
  const aoMover = (e: PointerEvent) => {
    if (!largo.matches || !ponteiroFino.matches || movimentoReduzido) return;
    ponteiro = [e.clientX / innerWidth - 0.5, e.clientY / innerHeight - 0.5];
    if (agendado) return;
    agendado = true;
    quadroAgendado = requestAnimationFrame(() => {
      agendado = false;
      const [x, y] = ponteiro;
      quadro.style.setProperty('--ry', `${-8 + x * 2}deg`);
      quadro.style.setProperty('--rx', `${2 - y * 1.5}deg`);
    });
  };
  addEventListener('pointermove', aoMover, { passive: true });
  return () => { cancelAnimationFrame(quadroAgendado); removeEventListener('pointermove', aoMover); };
}

/**
 * Escala o quadro por uma altura fixa (faixa + ~3 cartões), para ele não pular quando um cartão muda de raia.
 * Em tela larga, o topo da faixa de projetos fica na altura do topo do formulário (`palco`).
 */
function encaixar(cena: HTMLElement, quadro: HTMLElement, faixa: HTMLElement, largo: MediaQueryList, palco: HTMLElement | null) {
  const larguraLivre = cena.clientWidth - parseFloat(getComputedStyle(cena).paddingRight);
  const larguraQuadro = quadro.offsetWidth;
  quadro.style.transition = 'none';
  if (!largo.matches || !palco) {
    quadro.style.setProperty('--ty', '0px');
    quadro.style.setProperty('--s', Math.min(1, (larguraLivre - 8) / larguraQuadro).toFixed(3));
  } else {
    const topo = palco.getBoundingClientRect().top;
    const alturaLivre = cena.getBoundingClientRect().bottom - topo - 24;
    quadro.style.setProperty('--s', Math.min(1.15, (larguraLivre * 0.98) / larguraQuadro, alturaLivre / (faixa.offsetHeight + 12 + 430)).toFixed(3));
    // --ty muda a posição medida da faixa: duas passadas de correção bastam para alinhar
    let ty = 0;
    for (let i = 0; i < 2; i++) {
      quadro.style.setProperty('--ty', `${ty.toFixed(1)}px`);
      ty += topo - faixa.getBoundingClientRect().top;
    }
    quadro.style.setProperty('--ty', `${ty.toFixed(1)}px`);
  }
  // força o navegador a aplicar o encaixe sem transição antes de religá-la
  void quadro.offsetWidth;
  quadro.style.transition = '';
}

interface Vitrine { enviar: (sim: boolean) => void; desmontar: () => void }

/** monta o quadro dentro de `quadro` e põe os cartões para andar; `desmontar` desfaz tudo */
function criarVitrine(cena: HTMLElement, quadro: HTMLElement, palco: RefObject<HTMLElement | null>): Vitrine {
  const movimentoReduzido = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const largo = matchMedia('(min-width: 961px)');
  const timers: number[] = [];
  const intervalos: number[] = [];
  const depois = (f: () => void, ms: number) => { timers.push(window.setTimeout(f, ms)); };
  let enviado = false;
  let vez = 0;
  let tocando: HTMLImageElement | null = null;

  /* ---------- montagem ---------- */
  quadro.classList.add('en-quadro--entrando');
  const faixa = montarFaixa();
  quadro.appendChild(faixa);
  const raias = RAIAS.map((nome) => quadro.appendChild(montarRaia(nome)));
  const lista = (raia: number) => raias[raia].querySelector('.en-lista')!;
  const cartoes: Cartao[] = EXEMPLO.map((d) => ({ ...d, el: document.createElement('article') }));
  const pintar = (d: Cartao) => {
    const [estado] = estadoDoCartao(d);
    d.el.className = `en-dem en-dem--${estado}${quadro.dataset.foco === d.projeto ? ' en-dem--foco' : ''}`;
    d.el.style.setProperty('--cor', projetoDe(d.projeto).cor);
    d.el.innerHTML = htmlDoCartao(d);
  };
  const contar = () => raias.forEach((s) => {
    s.querySelector('.en-raia__n')!.textContent = String(s.querySelectorAll('.en-dem:not(.en-dem--sai)').length);
  });
  cartoes.forEach((d) => { pintar(d); lista(d.raia).appendChild(d.el); });
  contar();

  /* ---------- faixa de projetos: passar o mouse num projeto acende os cartões dele ---------- */
  const focar = (id: string | null) => {
    if (id) quadro.dataset.foco = id;
    else delete quadro.dataset.foco;
    cartoes.forEach((d) => d.el.classList.toggle('en-dem--foco', d.projeto === id));
    faixa.querySelectorAll<HTMLElement>('.en-proj').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.p === id)));
  };
  const chip = (e: Event) => (e.target as HTMLElement).closest<HTMLElement>('.en-proj');
  faixa.addEventListener('pointerover', (e) => { const b = chip(e); if (b) focar(b.dataset.p!); });
  faixa.addEventListener('pointerleave', () => focar(null));
  faixa.addEventListener('click', (e) => { const b = chip(e); if (b) focar(quadro.dataset.foco === b.dataset.p ? null : b.dataset.p!); });

  /* ---------- entrada ---------- */
  // dois quadros de espera: a entrada mede os cartões já desenhados
  let quadroDaEntrada = requestAnimationFrame(() => {
    quadroDaEntrada = requestAnimationFrame(() => {
      if (movimentoReduzido) { quadro.classList.remove('en-quadro--entrando'); return; }
      animarEntrada(faixa, cartoes);
      depois(() => quadro.classList.remove('en-quadro--entrando'), 2200);
    });
  });

  /* ---------- GIFs: todos parados; só um toca por vez, em rodízio (a tela não compete com o formulário) ---------- */
  const tocar = (img: HTMLImageElement) => {
    if (movimentoReduzido) return;
    if (tocando && tocando !== img && tocando.isConnected) tocando.src = gifUrl(tocando.dataset.g!, false);
    tocando = img;
    img.src = gifUrl(img.dataset.g!, true);
  };
  const tocarOProximo = () => {
    if (document.hidden) return;
    const visiveis = [...quadro.querySelectorAll<HTMLImageElement>('.en-tarja img')].filter((i) => i.offsetParent);
    if (visiveis.length) tocar(visiveis[(visiveis.indexOf(tocando!) + 1) % visiveis.length]);
  };

  /* ---------- cartões andando ---------- */
  const naRaia = (raia: number) => cartoes.filter((x) => x.raia === raia && !x.el.classList.contains('en-dem--sai'));
  const mover = (d: Cartao, raia: number, fim?: () => void) => {
    const antes = new Map(cartoes.map((x) => [x, x.el.getBoundingClientRect()]));
    d.raia = raia;
    if (raia === RAIA_FEITO) d.feito = true;
    pintar(d);
    lista(raia).prepend(d.el);
    contar();
    const gif = d.el.querySelector<HTMLImageElement>('.en-tarja img');
    if (gif?.offsetParent) tocar(gif);
    if (movimentoReduzido) { fim?.(); return; }
    animarTroca(cartoes, antes, d);
    if (fim) depois(fim, 950);
  };
  // o quadro nunca esvazia: quando "Feito" passa de 3, o mais antigo volta ao começo como demanda nova
  const equilibrar = () => {
    if (naRaia(RAIA_FEITO).length <= 3) return;
    const ordem = Array.from(lista(RAIA_FEITO).children);
    const velho = cartoes
      .filter((x) => x.raia === RAIA_FEITO && !x.fixo)
      .sort((a, b) => ordem.indexOf(b.el) - ordem.indexOf(a.el))[0];
    velho.el.classList.add('en-dem--sai');
    contar();
    depois(() => {
      velho.el.classList.remove('en-dem--sai');
      velho.feito = false;
      velho.raia = naRaia(0).length < 3 ? 0 : 1;
      velho.horasAtePrazo = 72 + Math.round(Math.random() * 120);
      velho.horasParado = 0;
      velho.codigo = velho.codigo.replace(/\d+$/, (n) => String(+n + 10));
      pintar(velho);
      velho.el.classList.add('en-dem--entra');
      lista(velho.raia).appendChild(velho.el);
      contar();
      depois(() => velho.el.classList.remove('en-dem--entra'), 600);
    }, 460);
  };
  // um cartão só anda se a raia de origem continuar com alguém e a de destino tiver menos de 3
  const andar = () => {
    if (enviado || document.hidden || quadro.dataset.foco) return;
    const passos = [[3, 4], [2, 3], [1, 2], [0, 1]];
    for (let i = 0; i < passos.length; i++) {
      const [de, para] = passos[(vez + i) % passos.length];
      const candidatos = naRaia(de).filter((x) => !x.fixo);
      if (candidatos.length >= 2 && (para === RAIA_FEITO || naRaia(para).length < 3)) {
        vez = (vez + i + 1) % passos.length;
        mover(candidatos[candidatos.length - 1], para, equilibrar);
        return;
      }
    }
  };
  if (!movimentoReduzido) {
    depois(() => intervalos.push(window.setInterval(andar, 4000)), 2600);
    depois(tocarOProximo, 2400);
    intervalos.push(window.setInterval(tocarOProximo, 6000));
  }

  /* ---------- paralaxe e encaixe na tela ---------- */
  const desligarParalaxe = ligarParalaxe(quadro, largo, movimentoReduzido);
  const reencaixar = () => encaixar(cena, quadro, faixa, largo, palco.current);
  const observador = new ResizeObserver(reencaixar);
  observador.observe(cena);
  if (palco.current) observador.observe(palco.current);
  reencaixar();
  void document.fonts.ready.then(reencaixar);

  return {
    enviar: (sim) => {
      enviado = sim;
      const atrasada = cartoes.find((x) => x.fixo)!;
      if (sim && atrasada.raia !== RAIA_FEITO) depois(() => mover(atrasada, RAIA_FEITO), 500);
    },
    desmontar: () => {
      timers.forEach(clearTimeout);
      intervalos.forEach(clearInterval);
      cancelAnimationFrame(quadroDaEntrada);
      desligarParalaxe();
      observador.disconnect();
      quadro.replaceChildren();
      quadro.removeAttribute('style');
      quadro.classList.remove('en-quadro--entrando');
      delete quadro.dataset.foco;
    },
  };
}

/** O quadro animado. `palco` é a caixa do formulário: em tela larga o topo do quadro fica na mesma altura. */
export function QuadroVitrine({ palco, enviado }: { palco: RefObject<HTMLElement | null>; enviado: boolean }) {
  const cenaRef = useRef<HTMLDivElement>(null);
  const quadroRef = useRef<HTMLDivElement>(null);
  const vitrine = useRef<Vitrine | null>(null);

  // monta uma vez; no StrictMode o React monta, desmonta e monta de novo, e o desmontar limpa tudo
  useEffect(() => {
    const v = criarVitrine(cenaRef.current!, quadroRef.current!, palco);
    vitrine.current = v;
    return () => { v.desmontar(); vitrine.current = null; };
  }, [palco]);

  useEffect(() => { vitrine.current?.enviar(enviado); }, [enviado]);

  return <div className="en-cena" ref={cenaRef} aria-hidden="true"><div className="en-quadro" ref={quadroRef} /></div>;
}

import { useEffect, useRef, type RefObject } from 'react';
import { flushSync } from 'react-dom';
import { pularAnimacao } from './animarCartoes';

const EASE = 'cubic-bezier(.2, .8, .2, 1)';
/** mouse e caneta: quanto mover antes de a pressão virar arrasto (abaixo disso ainda é um clique) */
const DISTANCIA = 5;
/** toque: quanto segurar parado para pegar o cartão; mover antes disso é rolar a tela */
const SEGURAR_MS = 320;
const TOLERANCIA = 10;
/** perto da borda da tela (ou do quadro) a rolagem anda sozinha */
const BORDA = 64;
const VELOCIDADE = 18;
/** seleciona o que não pode iniciar o arrasto: os botões do próprio cartão */
const FORA = '.cartao__avancar, [class*="adiar"]';

/** a faixa da tela que não está sob a barra do topo nem sob a de abas do celular */
function areaVisivel() {
  const topo = document.querySelector('.nav')?.getBoundingClientRect().bottom ?? 0;
  const abas = document.querySelector('.tabbar')?.getBoundingClientRect();
  return { topo, base: abas && abas.height > 0 ? abas.top : window.innerHeight };
}

interface Opcoes {
  /** a coluna aceita a demanda? (só ela fica destacada ao passar por cima) */
  aceita: (id: string, raia: string) => boolean;
  soltar: (id: string, raia: string) => void;
  reduz: boolean;
}

interface Sessao {
  pointerId: number;
  toque: boolean;
  cartao: HTMLElement;
  id: string;
  x0: number; y0: number; x: number; y: number;
  ativa: boolean;
  fantasma?: HTMLElement;
  /** onde, dentro do cartão, o ponteiro o segurou */
  ox: number; oy: number;
  alvo: HTMLElement | null;
  timer?: number;
  raf?: number;
}

/**
 * Arrastar e soltar dos cartões do Quadro, com eventos de ponteiro (mouse, toque e caneta) e sem biblioteca.
 * Cada cartão precisa de `data-cartao="<id>"` e cada coluna de `data-raia="<id>"`, dentro de `raiz`.
 * Arrasta-se uma cópia (o fantasma); o cartão de origem fica esmaecido até soltar. Esc cancela.
 * No toque, segurar um instante pega o cartão; mexer antes disso continua sendo rolar a página.
 */
export function useArrastarCartoes(raiz: RefObject<HTMLElement | null>, opcoes: Opcoes) {
  const op = useRef(opcoes);
  useEffect(() => { op.current = opcoes; });

  useEffect(() => {
    const quadro = raiz.current;
    if (!quadro) return;
    let s: Sessao | null = null;
    const html = document.documentElement;

    const marcarAlvo = (novo: HTMLElement | null) => {
      if (!s || s.alvo === novo) return;
      s.alvo?.removeAttribute('data-alvo');
      novo?.setAttribute('data-alvo', '');
      s.alvo = novo;
    };
    const buscarAlvo = () => {
      if (!s) return;
      const raia = document.elementFromPoint(s.x, s.y)?.closest<HTMLElement>('[data-raia]');
      marcarAlvo(raia && quadro.contains(raia) && op.current.aceita(s.id, raia.dataset.raia!) ? raia : null);
    };
    const posicionar = () => {
      if (!s?.fantasma) return;
      s.fantasma.style.transform = `translate3d(${s.x - s.ox}px, ${s.y - s.oy}px, 0) scale(1.03)`;
      buscarAlvo();
    };
    const velocidade = (d: number) => Math.ceil(Math.min(1, d / BORDA) * VELOCIDADE);
    const rolar = () => {
      if (!s?.ativa) return;
      const { x, y } = s;
      const { topo, base } = areaVisivel();
      if (y < topo + BORDA) window.scrollBy(0, -velocidade(topo + BORDA - y));
      else if (y > base - BORDA) window.scrollBy(0, velocidade(y - (base - BORDA)));
      const r = quadro.getBoundingClientRect();
      if (x < r.left + BORDA) quadro.scrollLeft -= velocidade(r.left + BORDA - x);
      else if (x > r.right - BORDA) quadro.scrollLeft += velocidade(x - (r.right - BORDA));
      buscarAlvo(); // a tela andou, mas o ponteiro não: a coluna sob ele pode ter mudado
      s.raf = requestAnimationFrame(rolar);
    };

    const iniciar = () => {
      if (!s || s.ativa) return;
      s.ativa = true;
      clearTimeout(s.timer);
      const r = s.cartao.getBoundingClientRect();
      s.ox = s.x0 - r.left; s.oy = s.y0 - r.top;
      const f = s.cartao.cloneNode(true) as HTMLElement;
      // a cópia é só imagem: sem atributos de dados (não pode ser achada nem ativada) e fora da árvore de acessibilidade
      for (const el of [f, ...f.querySelectorAll<HTMLElement>('*')]) for (const a of [...el.attributes]) if (a.name.startsWith('data-')) el.removeAttribute(a.name);
      f.classList.add('cartao--fantasma');
      f.setAttribute('aria-hidden', 'true');
      f.inert = true;
      f.style.width = `${r.width}px`;
      document.body.append(f);
      s.fantasma = f;
      s.cartao.dataset.origem = '';
      html.dataset.arrastando = '';
      window.getSelection()?.removeAllRanges();
      if (s.toque) navigator.vibrate?.(10);
      posicionar();
      s.raf = requestAnimationFrame(rolar);
    };

    /** a cópia voa até o retângulo de `destino` e some; `destino` fica escondido durante o voo */
    const pousar = (f: HTMLElement, destino: HTMLElement, depois?: () => void) => {
      if (op.current.reduz) { f.remove(); depois?.(); return; }
      const r = destino.getBoundingClientRect();
      const duracao = 220;
      const fim = `translate3d(${r.left}px, ${r.top}px, 0) scale(1)`;
      const v = f.animate([{ transform: f.style.transform, boxShadow: getComputedStyle(f).boxShadow }, { transform: fim, boxShadow: '0 0 0 0 transparent' }], { duration: duracao, easing: EASE, fill: 'forwards' });
      destino.animate([{ opacity: 0 }, { opacity: 0 }], { duration: duracao });
      v.onfinish = v.oncancel = () => { f.remove(); depois?.(); };
    };

    const limparOuvintes = () => {
      window.removeEventListener('pointermove', aoMover);
      window.removeEventListener('pointerup', aoSoltar);
      window.removeEventListener('pointercancel', aoCancelar);
      window.removeEventListener('keydown', aoTecla);
      window.removeEventListener('touchmove', aoTocar);
      window.removeEventListener('contextmenu', aoMenu);
    };

    const encerrar = (confirmar: boolean) => {
      const c = s;
      if (!c) return;
      s = null;
      limparOuvintes();
      clearTimeout(c.timer);
      cancelAnimationFrame(c.raf ?? 0);
      if (!c.ativa) return;
      delete html.dataset.arrastando;
      c.alvo?.removeAttribute('data-alvo');
      // o clique que o navegador dispara ao soltar não pode abrir a ficha
      const engolir = (e: Event) => { e.stopPropagation(); e.preventDefault(); };
      window.addEventListener('click', engolir, { capture: true, once: true });
      setTimeout(() => window.removeEventListener('click', engolir, true), 60);

      const f = c.fantasma!;
      const raia = c.alvo?.dataset.raia;
      const voltar = () => pousar(f, c.cartao, () => c.cartao.removeAttribute('data-origem'));
      if (!confirmar || !raia) return voltar();

      // o cartão muda de coluna: o React o recria na coluna nova; pularAnimacao evita o deslize, o fantasma já faz esse papel
      pularAnimacao.add(c.id);
      flushSync(() => op.current.soltar(c.id, raia));
      pularAnimacao.delete(c.id);
      const novo = quadro.querySelector<HTMLElement>(`[data-cartao="${CSS.escape(c.id)}"]`);
      if (!novo || novo === c.cartao) return voltar();
      const r = novo.getBoundingClientRect();
      const { topo, base } = areaVisivel();
      if (r.top >= topo && r.bottom <= base) return pousar(f, novo);
      // caiu fora da tela (coluna comprida): rola até ele e ele aparece no lugar, sem voo
      f.remove();
      novo.scrollIntoView({ block: 'nearest', behavior: op.current.reduz ? 'instant' : 'smooth' });
      if (!op.current.reduz) novo.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 260, easing: EASE });
    };

    function aoMover(e: PointerEvent) {
      if (!s || e.pointerId !== s.pointerId) return;
      s.x = e.clientX; s.y = e.clientY;
      if (!s.ativa) {
        const d = Math.hypot(s.x - s.x0, s.y - s.y0);
        if (s.toque) { if (d > TOLERANCIA) encerrar(false); } // mexeu antes de segurar: é rolagem
        else if (d > DISTANCIA) iniciar();
        return;
      }
      e.preventDefault();
      posicionar();
    }
    function aoSoltar(e: PointerEvent) { if (s && e.pointerId === s.pointerId) encerrar(true); }
    function aoCancelar(e: PointerEvent) { if (s && e.pointerId === s.pointerId) encerrar(false); }
    function aoTecla(e: KeyboardEvent) { if (e.key === 'Escape' && s?.ativa) { e.preventDefault(); encerrar(false); } }
    // com o cartão na mão, o dedo não pode rolar a página
    function aoTocar(e: TouchEvent) { if (s?.ativa && e.cancelable) e.preventDefault(); }
    function aoMenu(e: Event) { if (s?.toque) e.preventDefault(); }

    const aoPressionar = (e: PointerEvent) => {
      if (s || !e.isPrimary || (e.pointerType === 'mouse' && e.button !== 0)) return;
      const alvo = e.target as Element;
      const cartao = alvo.closest<HTMLElement>('[data-cartao]');
      if (!cartao || alvo.closest(FORA)) return;
      s = { pointerId: e.pointerId, toque: e.pointerType === 'touch', cartao, id: cartao.dataset.cartao!, x0: e.clientX, y0: e.clientY, x: e.clientX, y: e.clientY, ativa: false, ox: 0, oy: 0, alvo: null };
      if (s.toque) s.timer = window.setTimeout(iniciar, SEGURAR_MS);
      window.addEventListener('pointermove', aoMover);
      window.addEventListener('pointerup', aoSoltar);
      window.addEventListener('pointercancel', aoCancelar);
      window.addEventListener('keydown', aoTecla);
      window.addEventListener('touchmove', aoTocar, { passive: false });
      window.addEventListener('contextmenu', aoMenu);
    };

    quadro.addEventListener('pointerdown', aoPressionar);
    return () => {
      quadro.removeEventListener('pointerdown', aoPressionar);
      if (s) {
        s.fantasma?.remove();
        s.cartao.removeAttribute('data-origem');
        s.alvo?.removeAttribute('data-alvo');
        delete html.dataset.arrastando;
        cancelAnimationFrame(s.raf ?? 0);
        clearTimeout(s.timer);
        limparOuvintes();
        s = null;
      }
    };
  }, [raiz]);
}

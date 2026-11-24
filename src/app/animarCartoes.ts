import { useLayoutEffect, useRef, type RefObject } from 'react';

const ESPERA = 'cubic-bezier(.2, .8, .2, 1)';
/** abaixo disso é só o cartão assentando (hover, arredondamento), não uma mudança de lugar */
const LIMITE = 4;

/** cartões que já chegam animados por outro lado (o fantasma do arrastar): o deslize deles é pulado uma vez */
export const pularAnimacao = new Set<string>();

type Posicoes = Map<string, { x: number; y: number }>;

/**
 * Anima o Quadro: o cartão que mudou de lugar desliza até o lugar novo (os vizinhos acompanham)
 * e o cartão novo entra com um fade curto. Cada cartão precisa de `data-cartao="<id>"`.
 * `chave` identifica a organização e o filtro: ao trocá-los o quadro muda inteiro, sem animar.
 */
export function useAnimarCartoes(quadro: RefObject<HTMLElement | null>, chave: string, reduz: boolean) {
  const anterior = useRef<{ chave: string; pos: Posicoes } | null>(null);
  useLayoutEffect(() => {
    const raiz = quadro.current;
    if (!raiz) return;
    // posições em relação ao quadro (rolar a página ou o quadro não conta como mudança)
    const base = raiz.getBoundingClientRect();
    const cartoes = [...raiz.querySelectorAll<HTMLElement>('[data-cartao]')];
    const pos: Posicoes = new Map();
    for (const el of cartoes) {
      const r = el.getBoundingClientRect();
      pos.set(el.dataset.cartao!, { x: r.left - base.left + raiz.scrollLeft, y: r.top - base.top });
    }
    const ant = anterior.current;
    anterior.current = { chave, pos };
    if (reduz || !ant || ant.chave !== chave) return;
    for (const el of cartoes) {
      const id = el.dataset.cartao!;
      if (pularAnimacao.delete(id)) continue;
      const velha = ant.pos.get(id);
      if (!velha) {
        // quadro que ainda estava vazio (carregando) não conta: só entram cartões criados com o quadro já cheio
        if (ant.pos.size) el.animate([{ opacity: 0, transform: 'translateY(-6px)' }, { opacity: 1, transform: 'none' }], { duration: 200, easing: ESPERA });
        continue;
      }
      const nova = pos.get(id)!;
      const dx = velha.x - nova.x;
      const dy = velha.y - nova.y;
      if (Math.abs(dx) < LIMITE && Math.abs(dy) < LIMITE) continue;
      el.animate([{ transform: `translate(${dx}px, ${dy}px)`, zIndex: 2 }, { transform: 'none', zIndex: 2 }], { duration: 320, easing: ESPERA });
    }
  });
}

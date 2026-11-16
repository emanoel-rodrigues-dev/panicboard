import { useEffect, useRef } from 'react';

/** Tooltip próprio no lugar do title nativo: hover (350 ms) e foco por teclado em qualquer [data-tip]. */
export function Dica() {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const dica = ref.current!;
    let timer: ReturnType<typeof setTimeout> | undefined;
    let alvo: HTMLElement | null = null;
    const mostrar = (el: HTMLElement, atraso: number) => {
      clearTimeout(timer); alvo = el;
      timer = setTimeout(() => {
        if (alvo !== el || !document.contains(el)) return;
        dica.textContent = el.dataset.tip ?? ''; dica.classList.add('is-on');
        const r = el.getBoundingClientRect(); const w = dica.offsetWidth; const h = dica.offsetHeight;
        const x = Math.min(Math.max(8, r.left + r.width / 2 - w / 2), innerWidth - w - 8);
        const acima = r.top - h - 8 > 64;
        dica.style.left = `${x}px`; dica.style.top = `${acima ? r.top - h - 8 : r.bottom + 8}px`;
      }, atraso);
    };
    const esconder = () => { clearTimeout(timer); alvo = null; dica.classList.remove('is-on'); };
    const sobre = (e: PointerEvent) => { const el = (e.target as Element).closest<HTMLElement>('[data-tip]'); if (el && el !== alvo) mostrar(el, 350); else if (!el && alvo) esconder(); };
    const foco = (e: FocusEvent) => { const el = (e.target as Element).closest<HTMLElement>('[data-tip]'); if (el && (e.target as Element).matches(':focus-visible')) mostrar(el, 0); else esconder(); };
    const tecla = (e: KeyboardEvent) => { if (e.key === 'Escape') esconder(); };
    document.addEventListener('pointerover', sobre);
    document.addEventListener('focusin', foco);
    document.addEventListener('keydown', tecla, true);
    const fora = ['focusout', 'pointerdown', 'scroll'] as const;
    fora.forEach((t) => document.addEventListener(t, esconder, true));
    return () => {
      clearTimeout(timer);
      document.removeEventListener('pointerover', sobre);
      document.removeEventListener('focusin', foco);
      document.removeEventListener('keydown', tecla, true);
      fora.forEach((t) => document.removeEventListener(t, esconder, true));
    };
  }, []);
  return <div ref={ref} className="dica" aria-hidden="true" />;
}

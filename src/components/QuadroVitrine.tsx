import { useEffect, useRef, type RefObject } from 'react';

/*
 * Quadro de exemplo que aparece atrás do login: as demandas de vários projetos andando pelas raias.
 * É decorativo (aria-hidden e fora do Tab; os chips de projeto só reagem ao mouse) e montado direto no DOM dentro do efeito,
 * porque a animação de troca de raia (FLIP) mede e move os cartões; o React só cuida da caixa.
 */

const PROJ: Record<string, [string, string]> = { folha: ['Ponto & Folha', '#3b6fa3'], chales: ['Chalés Serra Azul', '#ff8000'], funil: ['Funil CRM', '#61b771'], estudos: ['Estudos & Inglês', '#8b5cf6'] };
const RAIAS = ['Backlog', 'A fazer', 'Fazendo', 'Em revisão', 'Feito'];
type Est = 'atrasado' | 'prazo' | 'parado' | 'normal' | 'dia';
// reação por estado, do catálogo do app (src/domain/reacoes.ts), com a fala encurtada para caber no cartão
const REAC: Partial<Record<Est, [string, string, string]>> = {
  atrasado: ['Ks6CZBigKgNYXNQ94y', 'Billy Butcher', 'Então... e aquela entrega, parceiro?'],
  prazo: ['3o7WTETq0ZFaeAVRuM', 'Jake e Holt', 'Menos de 24 h. A gente vai morrer!'],
  parado: ['jc2PkKKr3clTBekMzn', 'Pablo Escobar', 'Esperando você voltar pro projeto...'],
  dia: ['8Iv5lqKwKsZ2g', 'Gatsby', 'Um brinde à entrega!'],
};
interface Dem { k: string; p: string; t: string; pr: 'Alta' | 'Média' | 'Baixa'; h: number; r: number; parado?: number; feito?: boolean; fixo?: boolean; el: HTMLElement }
type Base = Omit<Dem, 'el'>;
// r = raia inicial; o PF-14 (fixo) é a demanda atrasada que vai para "Feito" quando o link é enviado
const EXEMPLO: Base[] = [
  { k: 'FN-29', p: 'funil', t: 'Relatório de vendas perdidas', pr: 'Baixa', h: 260, r: 0 },
  { k: 'CH-9', p: 'chales', t: 'Fotos dos imóveis em tamanho certo', pr: 'Média', h: 86, r: 0 },
  { k: 'PF-16', p: 'folha', t: 'Exportar folha para o contador', pr: 'Alta', h: 50, r: 1 },
  { k: 'ES-23', p: 'estudos', t: 'Revisar 40 phrasal verbs', pr: 'Baixa', h: 30, r: 2 },
  { k: 'PF-14', p: 'folha', t: 'Corrigir cálculo de férias proporcionais', pr: 'Alta', h: -20, r: 2, fixo: true },
  { k: 'CH-8', p: 'chales', t: 'Página de reserva: cupom de desconto', pr: 'Alta', h: 9, r: 1 },
  { k: 'FN-31', p: 'funil', t: 'Importar contatos por CSV', pr: 'Alta', h: 118, parado: 60, r: 3 },
  { k: 'PF-15', p: 'folha', t: 'Anexar documentos na admissão', pr: 'Média', h: 70, r: 3 },
  { k: 'CH-7', p: 'chales', t: 'Política de cancelamento', pr: 'Média', h: 40, r: 3 },
  { k: 'FN-27', p: 'funil', t: 'Ajustar permissões do perfil Gerente', pr: 'Média', h: -30, r: 4, feito: true },
  { k: 'CH-6', p: 'chales', t: 'Calendário de disponibilidade', pr: 'Alta', h: -12, r: 4, feito: true },
  { k: 'ES-21', p: 'estudos', t: 'Ouvir 3 episódios em inglês', pr: 'Média', h: -10, r: 4, feito: true },
];

const gifUrl = (id: string, anima: boolean) => `https://media.giphy.com/media/${id}/${anima ? '200w' : 'giphy_s'}.gif`;
const dias = (h: number) => { const n = Math.max(1, Math.round(h / 24)); return `${n} ${n === 1 ? 'dia' : 'dias'}`; };
const estado = (d: Base): [Est, string] => d.feito ? ['dia', 'Entregue'] : d.h < 0 ? ['atrasado', `Atrasada há ${-d.h} h`] : d.parado ? ['parado', `Parado há ${dias(d.parado)}`] : d.h <= 24 ? ['prazo', `Entrega em ${d.h} h`] : ['normal', `Prazo em ${dias(d.h)}`];

function html(d: Dem) {
  const [e, txt] = estado(d), [nome] = PROJ[d.p], seta = d.pr === 'Alta' ? '↑' : d.pr === 'Baixa' ? '↓' : '–', r = REAC[e];
  return `<div class="en-dem__top"><span>${d.k}</span><span class="en-dem__proj">${nome}</span></div><div class="en-dem__t">${d.t}</div>
    <div class="en-dem__rod"><span class="en-chip">${d.feito ? 'Feito' : RAIAS[d.r]}</span><span class="en-chip en-chip--pr">${seta} ${d.pr}</span><span class="en-chip en-chip--${e}">${txt}</span></div>
    ${r ? `<div class="en-tarja en-tarja--${e}"><img src="${gifUrl(r[0], false)}" data-g="${r[0]}" alt="" decoding="async"><div><b>${r[1]}</b><span>${r[2]}</span></div></div>` : ''}`;
}

interface Controle { enviar: (sim: boolean) => void }

/** O quadro animado. `palco` é a caixa do formulário: em tela larga o topo do quadro fica na mesma altura. */
export function QuadroVitrine({ palco, enviado }: { palco: RefObject<HTMLElement | null>; enviado: boolean }) {
  const cenaRef = useRef<HTMLDivElement>(null), quadroRef = useRef<HTMLDivElement>(null), controle = useRef<Controle | null>(null);

  useEffect(() => {
    const cena = cenaRef.current!, quadro = quadroRef.current!;
    const menos = matchMedia('(prefers-reduced-motion: reduce)').matches, largo = matchMedia('(min-width: 961px)'), fino = matchMedia('(pointer: fine)');
    const timers: number[] = [], intervalos: number[] = [];
    const depois = (f: () => void, ms: number) => { timers.push(window.setTimeout(f, ms)); };
    let enviadoAgora = false, passo = 0, tocando: HTMLImageElement | null = null;

    quadro.classList.add('en-quadro--entrando');
    // faixa de projetos: passar o mouse (ou focar) num projeto acende os cartões dele
    const faixa = document.createElement('div'); faixa.className = 'en-projetos';
    const base = EXEMPLO.map((d) => ({ ...d }));
    faixa.innerHTML = `<span class="en-projetos__t">${Object.keys(PROJ).length} projetos, um quadro</span>` + Object.entries(PROJ).map(([id, [nome, cor]]) =>
      `<button class="en-proj" type="button" tabindex="-1" data-p="${id}" aria-pressed="false" style="--cor:${cor}">${nome} <span>${base.filter((d) => d.p === id).length}</span></button>`).join('');
    quadro.appendChild(faixa);
    const listas = RAIAS.map((nome) => { const s = document.createElement('section'); s.className = 'en-raia'; s.innerHTML = `<div class="en-raia__h"><span>${nome}</span><span class="en-raia__n">0</span></div><div class="en-lista"></div>`; quadro.appendChild(s); return s; });
    const lista = (r: number) => listas[r].querySelector('.en-lista')!;
    const DEM: Dem[] = base.map((d) => ({ ...d, el: document.createElement('article') }));
    const pintar = (d: Dem) => { const [e] = estado(d); d.el.className = `en-dem en-dem--${e}${quadro.dataset.foco === d.p ? ' en-dem--foco' : ''}`; d.el.style.setProperty('--cor', PROJ[d.p][1]); d.el.innerHTML = html(d); };
    DEM.forEach((d) => { pintar(d); lista(d.r).appendChild(d.el); });
    const contar = () => listas.forEach((s) => (s.querySelector('.en-raia__n')!.textContent = String(s.querySelectorAll('.en-dem:not(.en-dem--sai)').length)));
    contar();

    const focar = (id: string | null) => { if (id) quadro.dataset.foco = id; else delete quadro.dataset.foco; DEM.forEach((d) => d.el.classList.toggle('en-dem--foco', d.p === id)); faixa.querySelectorAll<HTMLElement>('.en-proj').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.p === id))); };
    const chip = (e: Event) => (e.target as HTMLElement).closest<HTMLElement>('.en-proj');
    faixa.addEventListener('pointerover', (e) => { const b = chip(e); if (b) focar(b.dataset.p!); });
    faixa.addEventListener('pointerleave', () => focar(null));
    faixa.addEventListener('click', (e) => { const b = chip(e); if (b) focar(quadro.dataset.foco === b.dataset.p ? null : b.dataset.p!); });

    // entrada: cada cartão sai do chip do seu projeto
    const entrada = () => {
      if (menos) { quadro.classList.remove('en-quadro--entrando'); return; }
      const ids = Object.keys(PROJ);
      DEM.forEach((d, i) => { const c = faixa.querySelector(`[data-p="${d.p}"]`)!.getBoundingClientRect(), r = d.el.getBoundingClientRect();
        const dx = c.left + c.width / 2 - (r.left + r.width / 2), dy = c.top + c.height / 2 - (r.top + r.height / 2);
        const atraso = 250 + ids.indexOf(d.p) * 140 + DEM.filter((x, j) => x.p === d.p && j < i).length * 60;
        d.el.animate([{ transform: `translate(${dx}px, ${dy}px) scale(.2)`, opacity: 0 }, { opacity: 1, offset: .35 }, { transform: 'none', opacity: 1 }], { duration: 950, delay: atraso, easing: 'cubic-bezier(.2,.8,.2,1)', fill: 'backwards' }); });
      depois(() => quadro.classList.remove('en-quadro--entrando'), 2200);
    };
    let raf = requestAnimationFrame(() => { raf = requestAnimationFrame(entrada); });

    // GIFs: todos parados no primeiro quadro; só um toca por vez, em rodízio (a tela não compete com o formulário)
    const tocar = (img: HTMLImageElement) => { if (menos) return; if (tocando && tocando !== img && tocando.isConnected) tocando.src = gifUrl(tocando.dataset.g!, false); tocando = img; img.src = gifUrl(img.dataset.g!, true); };
    const rodizio = () => { if (document.hidden) return; const vis = [...quadro.querySelectorAll<HTMLImageElement>('.en-tarja img')].filter((i) => i.offsetParent); if (vis.length) tocar(vis[(vis.indexOf(tocando!) + 1) % vis.length]); };

    // FLIP: mover um cartão de raia com animação suave
    const mover = (d: Dem, raia: number, fim?: () => void) => {
      const antes = new Map(DEM.map((x) => [x, x.el.getBoundingClientRect()]));
      d.r = raia; if (raia === 4) d.feito = true; pintar(d); lista(raia).prepend(d.el); contar();
      const reacao = d.el.querySelector<HTMLImageElement>('.en-tarja img'); if (reacao?.offsetParent) tocar(reacao);
      if (menos) { fim?.(); return; }
      DEM.forEach((x) => { const a = antes.get(x)!, b = x.el.getBoundingClientRect(), dx = a.left - b.left, dy = a.top - b.top; if (!dx && !dy) return;
        const s = x === d; x.el.animate([{ transform: `translate(${dx}px, ${dy}px)${s ? ' scale(1.04)' : ''}`, zIndex: s ? 5 : 1 }, ...(s ? [{ transform: `translate(${dx / 2}px, ${dy / 2 - 30}px) scale(1.06)`, zIndex: 5, offset: .5 }] : []), { transform: 'none' }], { duration: s ? 900 : 500, easing: 'cubic-bezier(.2,.8,.2,1)' }); });
      if (fim) depois(fim, 950);
    };
    const naRaia = (r: number) => DEM.filter((x) => x.r === r && !x.el.classList.contains('en-dem--sai'));
    // o quadro nunca esvazia: quando "Feito" passa de 3, o mais antigo volta ao Backlog como demanda nova
    const equilibrar = () => {
      if (naRaia(4).length <= 3) return;
      const ordem = Array.from(lista(4).children);
      const velho = DEM.filter((x) => x.r === 4 && !x.fixo).sort((a, b) => ordem.indexOf(b.el) - ordem.indexOf(a.el))[0];
      velho.el.classList.add('en-dem--sai'); contar();
      depois(() => { velho.el.classList.remove('en-dem--sai'); velho.feito = false; velho.r = naRaia(0).length < 3 ? 0 : 1; velho.h = 72 + Math.round(Math.random() * 120); velho.parado = 0; velho.k = velho.k.replace(/\d+$/, (n) => String(+n + 10));
        pintar(velho); velho.el.classList.add('en-dem--entra'); lista(velho.r).appendChild(velho.el); contar(); depois(() => velho.el.classList.remove('en-dem--entra'), 600); }, 460);
    };
    // um cartão só anda se a raia de origem continuar com alguém e a de destino tiver menos de 3
    const andar = () => {
      if (enviadoAgora || document.hidden || quadro.dataset.foco) return;
      const ordem = [[3, 4], [2, 3], [1, 2], [0, 1]];
      for (let i = 0; i < ordem.length; i++) { const [de, para] = ordem[(passo + i) % ordem.length], cand = naRaia(de).filter((x) => !x.fixo);
        if (cand.length >= 2 && (para === 4 || naRaia(para).length < 3)) { passo = (passo + i + 1) % ordem.length; mover(cand[cand.length - 1], para, equilibrar); return; } }
    };
    if (!menos) {
      depois(() => intervalos.push(window.setInterval(andar, 4000)), 2600);
      depois(rodizio, 2400); intervalos.push(window.setInterval(rodizio, 6000));
    }

    // leve paralaxe com o mouse (só em telas largas)
    let pend = [0, 0], agendado = false, rafP = 0;
    const aoMover = (e: PointerEvent) => { if (!largo.matches || !fino.matches || menos) return; pend = [e.clientX / innerWidth - .5, e.clientY / innerHeight - .5];
      if (agendado) return; agendado = true; rafP = requestAnimationFrame(() => { agendado = false; const [x, y] = pend; quadro.style.setProperty('--ry', `${-8 + x * 2}deg`); quadro.style.setProperty('--rx', `${2 - y * 1.5}deg`); }); };
    addEventListener('pointermove', aoMover, { passive: true });

    // escala por uma altura fixa (faixa + ~3 cartões), para o quadro não pular quando um cartão muda de raia;
    // em tela larga, o topo da faixa de projetos fica na altura do topo do formulário
    const encaixar = () => {
      const w = cena.clientWidth - parseFloat(getComputedStyle(cena).paddingRight), qw = quadro.offsetWidth;
      quadro.style.transition = 'none';
      if (!largo.matches || !palco.current) { quadro.style.setProperty('--ty', '0px'); quadro.style.setProperty('--s', Math.min(1, (w - 8) / qw).toFixed(3)); }
      else {
        const topo = palco.current.getBoundingClientRect().top, livre = cena.getBoundingClientRect().bottom - topo - 24;
        quadro.style.setProperty('--s', Math.min(1.15, (w * .98) / qw, livre / (faixa.offsetHeight + 12 + 430)).toFixed(3));
        let ty = 0; for (let i = 0; i < 2; i++) { quadro.style.setProperty('--ty', `${ty.toFixed(1)}px`); ty += topo - faixa.getBoundingClientRect().top; }
        quadro.style.setProperty('--ty', `${ty.toFixed(1)}px`);
      }
      void quadro.offsetWidth; quadro.style.transition = '';
    };
    const ro = new ResizeObserver(encaixar); ro.observe(cena); if (palco.current) ro.observe(palco.current);
    encaixar(); document.fonts.ready.then(encaixar);

    controle.current = {
      enviar: (sim) => { enviadoAgora = sim; const pf = DEM.find((x) => x.fixo)!; if (sim && pf.r !== 4) depois(() => mover(pf, 4), 500); },
    };

    return () => {
      timers.forEach(clearTimeout); intervalos.forEach(clearInterval); cancelAnimationFrame(raf); cancelAnimationFrame(rafP);
      removeEventListener('pointermove', aoMover); ro.disconnect(); controle.current = null;
      quadro.replaceChildren(); quadro.removeAttribute('style'); quadro.classList.remove('en-quadro--entrando'); delete quadro.dataset.foco;
    };
  }, [palco]);

  useEffect(() => { controle.current?.enviar(enviado); }, [enviado]);

  return <div className="en-cena" ref={cenaRef} aria-hidden="true"><div className="en-quadro" ref={quadroRef} /></div>;
}

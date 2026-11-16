import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { flushSync } from 'react-dom';
import { Contexto, type AcaoAviso, type App as AppCtx, type Rota } from './app/contexto';
import { lerRota, useHoraReal, useMedia } from './app/hooks';
import { Aviso } from './components/Aviso';
import { Dica } from './components/Dica';
import { Ficha, type AlvoFicha } from './components/Ficha';
import { Nav, nomeTema, proximoTema, rotuloRelogio, type Tema } from './components/Nav';
import { Projetos, type Editando } from './components/Projetos';
import { Rodape, Tabbar } from './components/Rodape';
import { preferencia, type Repositorio } from './data/armazenamento';
import { avancarStatus } from './domain/acoes';
import { avaliar, REGRAS, STATUS } from './domain/motor';
import { ativos, proj } from './domain/projetos';
import type { Modo } from './domain/raias';
import { montarExemplo } from './domain/seed';
import { H } from './domain/tempo';
import type { Estado } from './domain/tipos';
import { Ideias } from './screens/Ideias';
import { Quadro } from './screens/Quadro';
import { Radar } from './screens/Radar';

interface Props { repo: Repositorio; inicial: Estado; avisoInicial?: string }

/** depois: 'demanda' quando o cadastro veio do Nova demanda sem nenhum projeto (ao criar, segue para a demanda) */
type Gaveta = AlvoFicha | { tipo: 'projetos'; editando: Editando; depois?: 'demanda' };

export function App({ repo, inicial, avisoInicial }: Props) {
  const [S, setS] = useState(inicial);
  // relógio simulado: só na memória da sessão, nunca salvo junto com os dados (bug 6)
  const [deslocamentoH, setDeslocamentoH] = useState(0);
  const real = useHoraReal();
  const t = real + deslocamentoH * H;
  const reduz = useMedia('(prefers-reduced-motion: reduce)');
  const [rota, setRota] = useState<Rota>(lerRota);
  const [modo, setModoSt] = useState<Modo>(() => (preferencia.ler('modo', 'prazo') === 'status' ? 'status' : 'prazo'));
  const [pausado, setPausado] = useState(() => preferencia.ler('pausado', '0') === '1');
  const [tocando, setTocando] = useState<Set<string>>(() => new Set());
  const [frente, setFrente] = useState<string | null>(null);
  const [ideiasFiltro, setIdeiasFiltro] = useState<'abertas' | 'promovidas'>('abertas');
  const [tema, setTema] = useState<Tema>(() => (document.documentElement.dataset.theme === 'dark' ? 'dark' : 'light'));
  const [aviso, setAviso] = useState<{ msg: string; acao?: AcaoAviso; on: boolean }>({ msg: '', on: false });
  const [ficha, setFicha] = useState<Gaveta | null>(null);
  const [fichaAberta, setFichaAberta] = useState(false);

  const primeiro = useRef(true);
  const foco = useRef<string[] | null>(null);
  const voltaFoco = useRef<Element | null>(null);
  const pendente = useRef<(() => void) | null>(null);
  const timerAviso = useRef<ReturnType<typeof setTimeout>>(undefined);
  const timerFicha = useRef<ReturnType<typeof setTimeout>>(undefined);

  // salva a cada mudança do estado (menos no primeiro render)
  useEffect(() => { if (primeiro.current) { primeiro.current = false; return; } repo.salvar(S); }, [S, repo]);

  const atualizar = useCallback((fn: (s: Estado) => Estado) => setS(fn), []);
  const avisar = useCallback((msg: string, acao?: AcaoAviso) => {
    setAviso({ msg, acao, on: true });
    clearTimeout(timerAviso.current);
    // com ação (Desfazer, Abrir) o aviso fica mais tempo na tela
    timerAviso.current = setTimeout(() => setAviso((a) => ({ ...a, on: false })), acao ? 10000 : 6000);
  }, []);
  const focarDepois = useCallback((s: string | string[]) => { foco.current = Array.isArray(s) ? s : [s]; }, []);
  useEffect(() => {
    if (!foco.current) return;
    for (const s of foco.current) { const el = document.querySelector<HTMLElement>(s); if (el) { el.focus(); break; } }
    foco.current = null;
  });
  useEffect(() => { if (avisoInicial) avisar(avisoInicial); }, [avisoInicial, avisar]);

  /* ---------- ficha (gaveta) ---------- */
  const abrir = useCallback((alvo: Gaveta) => {
    clearTimeout(timerFicha.current);
    pendente.current?.();
    voltaFoco.current = document.activeElement;
    flushSync(() => { setFicha(alvo); setFichaAberta(false); });
    requestAnimationFrame(() => setFichaAberta(true));
    focarDepois(alvo.tipo === 'novo' ? '#f-titulo' : alvo.tipo === 'projetos' && alvo.editando ? '#p-nome' : '.ficha__fechar');
  }, [focarDepois]);
  const fecharFicha = useCallback(() => {
    if (!ficha) return;
    pendente.current?.(); // salva o que estava sendo digitado antes de fechar (bug 1)
    setFichaAberta(false);
    clearTimeout(timerFicha.current);
    timerFicha.current = setTimeout(() => setFicha(null), reduz ? 0 : 220);
    const volta = voltaFoco.current as HTMLElement | null;
    if (volta && document.contains(volta)) volta.focus();
  }, [ficha, reduz]);
  const abrirFicha = useCallback((id: string) => abrir({ tipo: 'item', id }), [abrir]);
  const abrirProjetos = useCallback((editando: Editando = null) => abrir({ tipo: 'projetos', editando }), [abrir]);
  /** projetoNovo: o projeto acabou de ser criado e ainda não está no S desta closure */
  const novaDemanda = useCallback((pid?: string, projetoNovo = false) => {
    if (projetoNovo && pid) { abrir({ tipo: 'novo', projeto: pid }); return; }
    const lista = ativos(S.projetos);
    if (!lista.length) { abrir({ tipo: 'projetos', editando: 'novo', depois: 'demanda' }); avisar('Cadastre um projeto antes da primeira demanda.'); return; }
    abrir({ tipo: 'novo', projeto: lista.some((p) => p.id === pid) ? pid! : lista[0].id });
  }, [abrir, avisar, S.projetos]);
  useEffect(() => { document.body.classList.toggle('com-ficha', fichaAberta); }, [fichaAberta]);
  // clique fora fecha a gaveta; o que abre outra gaveta (cartão, Nova demanda, Projetos) e o aviso não contam
  useEffect(() => {
    if (!fichaAberta) return;
    const ABRE = '[data-gaveta], [data-abrir], [data-nova], [data-abrir-projetos], [data-projeto-novo], .aviso, .dica';
    const clique = (e: MouseEvent) => { const el = e.target as Element; if (el.isConnected && !el.closest(ABRE)) fecharFicha(); };
    document.addEventListener('click', clique);
    return () => document.removeEventListener('click', clique);
  }, [fichaAberta, fecharFicha]);

  /* ---------- relógio e dados de exemplo ---------- */
  const avancarRelogio = useCallback((h: number) => {
    const novoDesl = h === 0 ? 0 : deslocamentoH + h;
    const t2 = real + novoDesl * H;
    const mud = ativos(S.projetos).map((p) => {
      const antes = avaliar(S.itens, p.id, t).regra; const depois = avaliar(S.itens, p.id, t2).regra;
      return depois !== antes ? `${p.curto}: ${depois ? REGRAS[depois].nome : 'sem alerta'}` : null;
    }).filter(Boolean);
    setDeslocamentoH(novoDesl); setFrente(null);
    avisar(`${h === 0 ? 'Relógio de volta para agora' : `Relógio em ${rotuloRelogio(novoDesl)}`}. ${mud.length ? mud.join(' · ') : 'Nenhuma reação mudou.'}`);
  }, [S, deslocamentoH, real, t, avisar]);

  const restaurarExemplo = useCallback(() => {
    const antes = S;
    // cópia de segurança no armazenamento: os dados não dependem só do botão Desfazer (bug 5)
    repo.guardarCopia(antes, 'antes-de-restaurar');
    setS(montarExemplo(Date.now())); setDeslocamentoH(0); setFrente(null);
    avisar('Dados de exemplo restaurados.', { rotulo: 'Desfazer', fn: () => setS(antes) });
  }, [S, repo, avisar]);

  const avancarItem = useCallback((id: string) => {
    const i = S.itens.find((x) => x.id === id);
    if (!i) return;
    const S2 = avancarStatus(S, id, t);
    const novo = S2.itens.find((x) => x.id === id)!;
    if (novo.status === i.status) return;
    setS(S2);
    const a = avaliar(S2.itens, i.projeto, t);
    avisar(`${i.id} foi para ${STATUS[novo.status]}.${a.regra === 'em_dia' ? ` ${proj(S.projetos, i.projeto).curto} fechou o ciclo.` : ''}`);
  }, [S, t, avisar]);

  /* ---------- tema ---------- */
  useLayoutEffect(() => { const r = document.documentElement; r.dataset.temaEscolha = tema; r.dataset.theme = tema; }, [tema]);
  const trocarTema = useCallback(() => {
    const prox = proximoTema(tema);
    preferencia.gravar('tema', prox); setTema(prox); avisar(`Tema ${nomeTema(prox)}.`);
  }, [tema, avisar]);

  /* ---------- rotas (com View Transitions) ---------- */
  useEffect(() => {
    const mudou = () => {
      const nova = lerRota();
      const trocar = () => flushSync(() => setRota(nova));
      if (nova.nome !== rota.nome && document.startViewTransition && !reduz) document.startViewTransition(trocar);
      else trocar();
    };
    window.addEventListener('hashchange', mudou);
    return () => window.removeEventListener('hashchange', mudou);
  }, [rota.nome, reduz]);
  const rotaAnterior = useRef(rota.nome);
  useLayoutEffect(() => {
    document.documentElement.dataset.tela = rota.nome;
    if (rotaAnterior.current === rota.nome) return;
    rotaAnterior.current = rota.nome;
    scrollTo(0, 0);
    document.querySelector<HTMLElement>(`[data-view="${rota.nome}"] h1`)?.focus({ preventScroll: true });
  }, [rota.nome]);
  useLayoutEffect(() => { document.documentElement.classList.toggle('is-pausado', pausado); }, [pausado]);

  /* ---------- atalhos de teclado ---------- */
  useEffect(() => {
    const tecla = (e: KeyboardEvent) => {
      if (e.key === 'Escape') return fecharFicha();
      const el = e.target as Element;
      if (el.closest('input, textarea, select, [contenteditable]') || e.metaKey || e.ctrlKey || e.altKey) return;
      const k = e.key.toLowerCase();
      if (k === 'n') { e.preventDefault(); novaDemanda(); }
      if (k === 't') { e.preventDefault(); trocarTema(); }
      if (k === 'i') { e.preventDefault(); if (lerRota().nome !== 'ideias') location.hash = '#/ideias'; setTimeout(() => document.querySelector<HTMLElement>('#nova-ideia')?.focus(), 60); }
    };
    document.addEventListener('keydown', tecla);
    return () => document.removeEventListener('keydown', tecla);
  }, [fecharFicha, novaDemanda, trocarTema]);

  const parado = reduz || pausado;
  const ctx = useMemo<AppCtx>(() => ({
    S, t, deslocamentoH, rota, parado, reduz, pausado, tocando, modo, frente, ideiasFiltro,
    atualizar, avisar, focarDepois, avancarItem, abrirFicha, novaDemanda, abrirProjetos, avancarRelogio, restaurarExemplo,
    alternarGif: (k) => setTocando((s) => { const n = new Set(s); if (n.has(k)) n.delete(k); else n.add(k); return n; }),
    alternarPausa: () => { setPausado((p) => { preferencia.gravar('pausado', p ? '0' : '1'); return !p; }); setTocando(new Set()); },
    setModo: (m) => { setModoSt(m); preferencia.gravar('modo', m); },
    setFrente, setIdeiasFiltro,
  }), [S, t, deslocamentoH, rota, parado, reduz, pausado, tocando, modo, frente, ideiasFiltro, atualizar, avisar, focarDepois, avancarItem, abrirFicha, novaDemanda, abrirProjetos, avancarRelogio, restaurarExemplo]);

  return (
    <Contexto.Provider value={ctx}>
      <Nav tema={tema} onTema={trocarTema} />
      <main id="top">
        <div className="view" data-view="radar" hidden={rota.nome !== 'radar'}>{rota.nome === 'radar' && <Radar />}</div>
        <div className="view" data-view="quadro" hidden={rota.nome !== 'quadro'}>{rota.nome === 'quadro' && <Quadro />}</div>
        <div className="view view--ideias" data-view="ideias" hidden={rota.nome !== 'ideias'}>{rota.nome === 'ideias' && <Ideias />}</div>
      </main>
      <Rodape />
      <aside className={fichaAberta ? 'gaveta is-aberta' : 'gaveta'} data-gaveta="" role="dialog" aria-modal="false" aria-labelledby="gaveta-h" hidden={!ficha}>
        {ficha && (ficha.tipo === 'projetos'
          ? <Projetos key={`projetos-${ficha.editando}`} inicial={ficha.editando} depois={ficha.depois} onFechar={fecharFicha} />
          : <Ficha key={ficha.tipo === 'item' ? ficha.id : 'novo'} alvo={ficha} onFechar={fecharFicha} registrarPendente={(fn) => { pendente.current = fn; }} />)}
      </aside>
      <Tabbar />
      <Aviso {...aviso} onAcao={() => { aviso.acao?.fn(); setAviso((a) => ({ ...a, on: false })); }} />
      <Dica />
    </Contexto.Provider>
  );
}

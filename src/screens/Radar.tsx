import { Fragment, useEffect, useRef, useState } from 'react';
import { useApp } from '../app/contexto';
import { Gif } from '../components/Gif';
import { Ico, vars } from '../components/Icone';
import { REACOES } from '../domain/reacoes';
import { ABERTO, avaliarTodos, estadoItem, prazoTexto, reacao, REGRAS, type Avaliacao } from '../domain/motor';
import { proj } from '../domain/projetos';
import { dur, fmtData } from '../domain/tempo';
import type { Item, Projeto, Regra } from '../domain/tipos';

const titulo = (n: number) => (n === 1 ? 'Demandas do seu projeto, num quadro só' : `Demandas dos seus ${n} projetos, num quadro só`);
/** "a, b e c" */
const juntar = (xs: string[]) => (xs.length > 1 ? `${xs.slice(0, -1).join(', ')} e ${xs.at(-1)}` : xs[0] ?? '');
/** o palco foi desenhado para até 4 camadas; os demais projetos ficam nos cartões abaixo */
const CAMADAS = 4;
// a entrada da hero e a revelação das reações acontecem uma vez por visita
let entradaFeita = false;
let reacoesReveladas = false;

export function Radar() {
  const { S, t } = useApp();
  const av = avaliarTodos(S.itens, S.projetos, t);
  const noRadar = new Set(av.map((a) => a.pid));
  const prox = S.itens.filter((i) => noRadar.has(i.projeto) && ABERTO(i) && i.prazo && Date.parse(i.prazo) >= t).sort((a, b) => Date.parse(a.prazo!) - Date.parse(b.prazo!))[0];
  return (
    <>
      <Hero av={av} />
      {av.length > 0 && (
        <section className="sec" id="canais" aria-labelledby="canais-h">
          <div className="wrap">
            <h2 id="canais-h">{av.length === 1 ? 'O projeto agora. ' : `Os ${av.length} projetos agora. `}<span className="muted">Um olhar e você sabe onde está o fogo.</span></h2>
            <div className="canais" data-canais="">{av.map((a) => <Canal key={a.pid} a={a} />)}</div>
          </div>
        </section>
      )}
      <Reacoes av={av} />
      <section className="sec fecho" aria-label="Abrir o quadro">
        <div className="wrap">
          <p className="fecho__h"><a href="#/quadro" className="fecho__link">Abrir o quadro<svg className="m-arrow" viewBox="0 0 16 16" aria-hidden="true"><path d="M3 8h9M8.5 4.5 12 8l-3.5 3.5" /></svg></a></p>
          <p className="fecho__nota" data-fecho-nota="">{prox ? `Próxima entrega: ${prox.id}, ${prox.titulo}, em ${dur(Date.parse(prox.prazo!) - t)}.` : 'Nenhuma entrega com prazo pela frente.'}</p>
        </div>
      </section>
    </>
  );
}

function frase(a: Avaliacao, p: Projeto, t: number) {
  if (a.regra === 'atrasado') return `${p.curto} tem ${a.atrasados.length === 1 ? 'uma demanda atrasada' : `${a.atrasados.length} demandas atrasadas`}`;
  if (a.regra === 'prazo_apertado') return `${p.curto} entrega em ${dur(Date.parse(a.apertados[0].prazo!) - t)}`;
  if (a.regra === 'abandonado') return `${p.curto} está parado há ${dur(a.parado)}`;
  if (a.regra === 'em_dia') return `${p.curto} fechou o ciclo`;
  return `${p.curto} segue no ritmo`;
}

function Hero({ av }: { av: Avaliacao[] }) {
  const { S, t, deslocamentoH, reduz, pausado, alternarPausa, abrirProjetos } = useApp();
  const TITULO = av.length ? titulo(av.length) : 'Nenhum projeto no radar';
  const [entrando, setEntrando] = useState(() => !entradaFeita && !reduz);
  useEffect(() => {
    entradaFeita = true;
    document.documentElement.classList.add('m-enter-done');
    if (!entrando) return;
    const id = setTimeout(() => setEntrando(false), 1500);
    return () => clearTimeout(id);
  }, [entrando]);
  // até 4 projetos: um por um; com mais, só os que pedem atenção e um resumo dos calmos
  const calmos = av.length > CAMADAS ? av.filter((a) => a.regra === null) : [];
  const partes = av.filter((a) => !calmos.includes(a)).map((a) => frase(a, proj(S.projetos, a.pid), t));
  const resto = calmos.length === 1 ? ' O outro segue no ritmo, nos cartões abaixo.' : calmos.length ? ` Os outros ${calmos.length} seguem no ritmo, nos cartões abaixo.` : '';
  return (
    <section className={entrando ? 'hero is-in' : 'hero'} data-enter="" aria-labelledby="hero-h">
      <div className="hero__chao" aria-hidden="true" />
      <div className="wrap hero__grid">
        <div className="hero__txt">
          <p className="hero__aovivo"><span className="pontoaovivo" aria-hidden="true" /><span data-hero-hora="">{`${deslocamentoH ? 'Relógio simulado' : 'Ao vivo'} · ${fmtData.format(t)}`}</span></p>
          {entrando
            ? <h1 id="hero-h" tabIndex={-1} aria-label={TITULO}>{TITULO.split(' ').map((w, n) => <Fragment key={n}>{n > 0 && ' '}<span className="palavra" aria-hidden="true"><span style={vars({ '--w': n })}>{w}</span></span></Fragment>)}</h1>
            : <h1 id="hero-h" tabIndex={-1} style={av.length ? undefined : { hyphens: 'manual' }}>{TITULO}</h1>}
          <p className="hero__lead" data-hero-lead="">{av.length
            ? `Agora: ${partes.length ? `${juntar(partes)}.` : 'tudo no ritmo.'}${resto} Clique num projeto para ver as demandas.`
            : 'Cadastre um projeto e o PanicBoard passa a vigiar os prazos das demandas dele.'}</p>
          <div className="btn-row">
            {av.length
              ? <a className="btn btn--primary" href="#/quadro">Abrir o quadro <svg className="m-arrow" viewBox="0 0 16 16" aria-hidden="true"><path d="M3 8h9M8.5 4.5 12 8l-3.5 3.5" /></svg></a>
              : <button className="btn btn--primary" type="button" data-projeto-novo="" onClick={() => abrirProjetos('novo')}>Cadastrar projeto</button>}
            <a className="btn btn--secondary" href="#/ideias">Anotar uma ideia</a>
          </div>
        </div>
        {av.length > 0
          ? <Palco av={[...av.filter((a) => a.itens.length), ...av.filter((a) => !a.itens.length)].slice(0, CAMADAS)} />
          : <PalcoVazio />}
      </div>
      <button className="pausa" type="button" data-pausa="" aria-pressed={pausado} aria-label={pausado ? 'Retomar o movimento da tela' : 'Pausar o movimento da tela'} onClick={alternarPausa}>
        <svg className="ico ico--pausa" viewBox="0 0 24 24" aria-hidden="true"><path d="M9 6v12M15 6v12" /></svg>
        <svg className="ico ico--tocar" viewBox="0 0 24 24" aria-hidden="true"><path d="M8 5.5v13l10-6.5z" /></svg>
      </button>
    </section>
  );
}

/** Os 4 projetos como monitores empilhados; o da frente toca o GIF.
 * O style é escrito à mão porque o CSS procura o texto literal "--i:0" (o React escreveria "--i: 0"). */
function Palco({ av }: { av: Avaliacao[] }) {
  const { S, frente, setFrente, focarDepois } = useApp();
  const naFrente = frente && av.some((a) => a.pid === frente) ? frente : av[0].pid;
  const ordem = [av.find((a) => a.pid === naFrente)!, ...av.filter((a) => a.pid !== naFrente)];
  const clicar = (pid: string) => {
    if (pid === naFrente) { location.hash = `#/quadro/${pid}`; return; }
    setFrente(pid); focarDepois(`[data-camada-btn="${pid}"]`);
  };
  return (
    <div className="hero__palco" data-palco="" aria-label={av.length === 1 ? 'O projeto e o estado dele' : `Os ${av.length} projetos mais urgentes, do mais urgente para o mais calmo`}>
      {ordem.map((a, i) => {
        const p = proj(S.projetos, a.pid);
        const r = a.regra ? reacao(a.regra, S.girar, a.pid) : null;
        const naPonta = i === 0;
        return (
          <div key={p.id} className="camada" ref={(el) => el?.setAttribute('style', `--i:${i};--pc:${p.cor};--pt:${p.tinta}`)} data-camada={p.id}>
            <button className="camada__alvo" type="button" data-camada-btn={p.id} aria-label={naPonta ? `Ver demandas de ${p.curto} no quadro` : `Trazer ${p.curto} para a frente`} onClick={() => clicar(p.id)} />
            <div className="camada__cab"><span className="camada__nome">{p.nome}</span><span className="camada__estado"><Ico n={a.regra || 'normal'} />{a.estado}</span></div>
            <div className="camada__corpo">
              {r
                ? <Gif key={r.id} r={r} chave={`palco-${p.id}`} tarja={naPonta} tocar={naPonta ? undefined : false} />
                : <div className="camada__calma"><strong>{a.estado}</strong><span>{`${a.abertos.length} abertas, nenhuma regra disparada`}</span></div>}
            </div>
          </div>
        );
      }).reverse()}
    </div>
  );
}

/** sem projetos: uma camada só, que leva ao cadastro (mesmo desenho das camadas do palco) */
function PalcoVazio() {
  const { abrirProjetos } = useApp();
  return (
    <div className="hero__palco" data-palco="">
      <div className="camada" ref={(el) => el?.setAttribute('style', '--i:0;--pc:#5c6370;--pt:#ffffff')}>
        <button className="camada__alvo" type="button" aria-label="Cadastrar o primeiro projeto" onClick={() => abrirProjetos('novo')} />
        <div className="camada__cab"><span className="camada__nome">Seu primeiro projeto</span><span className="camada__estado"><Ico n="normal" />Aguardando</span></div>
        <div className="camada__corpo"><div className="camada__calma"><strong>Cadastre um projeto</strong><span>Ele aparece aqui, com o GIF da regra do momento.</span></div></div>
      </div>
    </div>
  );
}

function ItemCanal({ i, prazo, est }: { i: Item; prazo: string; est: string }) {
  const { abrirFicha } = useApp();
  return <li><button type="button" className="canal__item" data-abrir={i.id} onClick={() => abrirFicha(i.id)}><span className="canal__id">{i.id}</span><span className="canal__tit">{i.titulo}</span><span className={`canal__prazo est-t--${est}`}>{prazo}</span></button></li>;
}

function Canal({ a }: { a: Avaliacao }) {
  const { S, t } = useApp();
  const p = proj(S.projetos, a.pid);
  const proximas = a.abertos.slice().sort((x, y) => (Date.parse(x.prazo ?? '') || 9e15) - (Date.parse(y.prazo ?? '') || 9e15)).slice(0, 3);
  const entregues = a.feitos.slice().sort((x, y) => Date.parse(y.atualizado) - Date.parse(x.atualizado)).slice(0, 3);
  return (
    <article className="canal" style={vars({ '--pc': p.cor, '--pt': p.tinta })}>
      <header className="canal__cab"><h3>{p.nome}</h3><span className="canal__sigla">{p.sigla}</span></header>
      <p className={`canal__estado est--${a.regra || 'normal'}`}><Ico n={a.regra || 'normal'} /><span>{a.estado}</span></p>
      <dl className="canal__nums">
        <div><dt>Abertas</dt><dd>{a.abertos.length}</dd></div>
        <div><dt>Atrasadas</dt><dd>{a.atrasados.length}</dd></div>
        <div><dt>Mexeu</dt><dd>{a.ultima ? `há ${dur(t - a.ultima)}` : '—'}</dd></div>
      </dl>
      <ul className="canal__lista">
        {proximas.length
          ? proximas.map((i) => <ItemCanal key={i.id} i={i} prazo={prazoTexto(i, t)} est={estadoItem(i, t)} />)
          : a.feitos.length
            ? <><li className="canal__vazio">Nada aberto. Entregues por último:</li>{entregues.map((i) => <ItemCanal key={i.id} i={i} prazo={`Entregue há ${dur(t - Date.parse(i.atualizado))}`} est="feito" />)}</>
            : <li className="canal__vazio">Nada aberto neste ciclo.</li>}
      </ul>
      <a className="link canal__ver" href={`#/quadro/${p.id}`}>{`Ver as ${a.itens.length} demandas de ${p.curto}`}</a>
    </article>
  );
}

function Reacoes({ av }: { av: Avaliacao[] }) {
  const { S, reduz, atualizar } = useApp();
  const ref = useRef<HTMLElement>(null);
  const [fase, setFase] = useState<'' | 'pre' | 'revelado'>(() => (reacoesReveladas ? 'revelado' : reduz || !('IntersectionObserver' in window) ? '' : 'pre'));
  useEffect(() => {
    if (fase !== 'pre' || !ref.current) return;
    const io = new IntersectionObserver((ents) => {
      if (ents.some((e) => e.isIntersecting)) { reacoesReveladas = true; setFase('revelado'); io.disconnect(); }
    }, { threshold: 0.3 });
    io.observe(ref.current);
    return () => io.disconnect();
  }, [fase]);
  const classe = ['sec sec--estudio', fase && 'pre-revelar', fase === 'revelado' && 'is-revelado'].filter(Boolean).join(' ');
  return (
    <section ref={ref} className={classe} id="reacoes" data-moment="picture-develops" aria-labelledby="reacoes-h">
      <div className="wrap">
        <div className="reacoes__topo">
          <h2 id="reacoes-h">Quatro regras de tempo, quatro reações</h2>
          <BotaoAvancar />
        </div>
        <div className="regras" data-regras="">
          {(Object.keys(REGRAS) as Regra[]).map((k) => {
            const R = REGRAS[k];
            const quem = av.filter((a) => a.regra === k);
            const lista = REACOES[k];
            const r = reacao(k, S.girar);
            const n = (S.girar[k] || 0) % lista.length;
            return (
              <article key={k} className={`regra est--${k}`}>
                <Gif key={r.id} r={r} chave={`regra-${k}`} />
                <div className="regra__txt">
                  <h3><Ico n={k} />{R.nome}</h3>
                  <p>{R.regra}</p>
                  <p className="regra__quem">{quem.length
                    ? <>Agora em {quem.map((a, j) => <Fragment key={a.pid}>{j > 0 && ', '}<a className="link" href={`#/quadro/${a.pid}`}>{proj(S.projetos, a.pid).curto}</a></Fragment>)}</>
                    : <span className="muted">Nenhum projeto nesta regra agora.</span>}</p>
                  <button className="link regra__trocar" type="button" data-girar={k} onClick={() => atualizar((s) => ({ ...s, girar: { ...s.girar, [k]: (s.girar[k] || 0) + 1 } }))}>{`Trocar o GIF (${n + 1} de ${lista.length})`}</button>
                </div>
              </article>
            );
          })}
        </div>
      </div>
    </section>
  );
}

function BotaoAvancar() {
  const { avancarRelogio } = useApp();
  return <button className="btn btn--secondary" type="button" data-avancar="24" onClick={() => avancarRelogio(24)}>Avançar o relógio 1 dia</button>;
}

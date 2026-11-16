import { useApp } from '../app/contexto';
import { Ico, TagProjeto, vars } from '../components/Icone';
import { proximoStatus } from '../domain/acoes';
import { avaliar, estadoItem, PENDENTE, prazoTexto, PRIO, REGRAS, STATUS } from '../domain/motor';
import { ativos, proj } from '../domain/projetos';
import { montarRaias } from '../domain/raias';
import type { Item } from '../domain/tipos';

export function Quadro() {
  const { S, t, rota, modo, setModo, abrirProjetos } = useApp();
  const lista = ativos(S.projetos);
  // projeto arquivado ou inexistente na URL cai em "Todos"
  const filtro = lista.some((p) => p.id === rota.sub) ? rota.sub : 'todos';
  const filtros = [{ id: 'todos', curto: 'Todos', cor: 'var(--ink)' }, ...lista];
  // demandas de projetos arquivados ficam guardadas, fora do quadro
  const visiveis = S.itens.filter((i) => lista.some((p) => p.id === i.projeto));
  const itens = visiveis.filter((i) => filtro === 'todos' || i.projeto === filtro);
  const raias = montarRaias(itens, modo, t);
  return (
    <section className="tela" aria-labelledby="quadro-h">
      <div className="wrap">
        <div className="tela__topo">
          <h1 id="quadro-h" tabIndex={-1}>Quadro</h1>
          <div className="seg" role="group" aria-label="Organizar por">
            <button type="button" data-modo="prazo" aria-pressed={modo === 'prazo'} onClick={() => setModo('prazo')}>Por prazo</button>
            <button type="button" data-modo="status" aria-pressed={modo === 'status'} onClick={() => setModo('status')}>Por status</button>
          </div>
        </div>
        <div className="filtros" role="group" aria-label="Filtrar por projeto" data-filtros="">
          {filtros.map((p) => {
            const n = visiveis.filter((i) => (p.id === 'todos' || i.projeto === p.id) && PENDENTE(i)).length;
            const regra = p.id !== 'todos' ? avaliar(S.itens, p.id, t).regra : null;
            return (
              <a key={p.id} className="filtro" href={`#/quadro${p.id === 'todos' ? '' : `/${p.id}`}`} style={vars({ '--pc': p.cor })} aria-current={filtro === p.id ? 'page' : undefined}>
                {p.id !== 'todos' && <span className="ptag__dot" />}<span>{p.curto}</span><span className="filtro__n">{n}</span>
                {regra && <span className={`filtro__est est--${regra}`} data-tip={REGRAS[regra].nome}><Ico n={regra} /></span>}
              </a>
            );
          })}
          <button className="filtro" type="button" data-abrir-projetos="" onClick={() => abrirProjetos()}><Ico n="editar" /><span>Projetos</span></button>
        </div>
        <div className="raias" data-raias="">
          {raias.map((r) => (
            <section key={r.id} className="raia" aria-labelledby={`raia-${r.id}`}>
              <h2 className="raia__h" id={`raia-${r.id}`}>{r.est && <Ico n={r.est} c={`est-t--${r.est}`} />}<span>{r.nome}</span><span className="raia__n">{r.itens.length}</span></h2>
              <div className="raia__lista">
                {r.itens.length ? r.itens.map((i) => <Cartao key={i.id} i={i} />) : <p className="raia__vazia">{r.id === 'atrasadas' ? 'Nada atrasado. Siga assim.' : 'Vazio.'}</p>}
              </div>
            </section>
          ))}
        </div>
      </div>
    </section>
  );
}

function Cartao({ i }: { i: Item }) {
  const { S, t, modo, abrirFicha, avancarItem, focarDepois } = useApp();
  const p = proj(S.projetos, i.projeto);
  const est = estadoItem(i, t);
  const prox = proximoStatus(i.status);
  return (
    <article className={`cartao est-c--${est}`} style={vars({ '--pc': p.cor })}>
      <button className="cartao__abrir" type="button" data-abrir={i.id} onClick={() => abrirFicha(i.id)}>
        <span className="cartao__topo"><span className="cartao__id">{i.id}</span><TagProjeto p={p} /><span className={`cartao__prio prio--${i.prioridade}`} data-tip={`Prioridade ${PRIO[i.prioridade].toLowerCase()}`}><Ico n={i.prioridade} /><span className="sr">{`Prioridade ${PRIO[i.prioridade]}`}</span></span></span>
        <span className="cartao__tit">{i.titulo}</span>
        <span className="cartao__pe"><span className={`cartao__prazo est-t--${est}`}>{(est === 'atrasado' || est === 'prazo_apertado') && <Ico n={est} />}{prazoTexto(i, t)}</span>{modo === 'prazo' && <span className="cartao__status">{STATUS[i.status]}</span>}{i.checklist.length > 0 && <span className="cartao__ck">{`${i.checklist.filter((c) => c.feito).length}/${i.checklist.length}`}</span>}</span>
      </button>
      {prox && <button className="cartao__avancar" type="button" data-avancar-item={i.id} aria-label={`Mover ${i.id} para ${STATUS[prox]}`} data-tip={`Mover para ${STATUS[prox]}`} onClick={() => { focarDepois([`[data-avancar-item="${i.id}"]`, `[data-view="quadro"] [data-abrir="${i.id}"]`]); avancarItem(i.id); }}><Ico n={prox === 'feito' ? 'feito' : 'seta'} /></button>}
    </article>
  );
}

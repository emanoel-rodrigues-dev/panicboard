import { useState } from 'react';
import { useApp } from '../app/contexto';
import { Adiar } from '../components/Adiar';
import { Ico, TagProjeto, vars } from '../components/Icone';
import { NovaNaRaia } from '../components/NovaNaRaia';
import { proximoStatus } from '../domain/acoes';
import { avaliar, estadoItem, pedeAtencao, estaPendente, pendentesDoProjeto, prazoTexto, PRIO, REGRAS, STATUS } from '../domain/motor';
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
  // criação direto na coluna: uma de cada vez; em "Todos", o projeto é escolhido ali e fica para a próxima
  const [compondo, setCompondo] = useState<string | null>(null);
  const [projNovo, setProjNovo] = useState<string | null>(null);
  const projetoDaColuna = filtro !== 'todos' ? filtro : lista.some((p) => p.id === projNovo) ? projNovo! : lista[0]?.id;
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
            const n = (p.id === 'todos' ? visiveis.filter(estaPendente) : pendentesDoProjeto(visiveis, p.id)).length;
            const regra = p.id !== 'todos' ? avaliar(S.itens, p.id, t).regra : null;
            return (
              <a key={p.id} className="filtro" href={`#/quadro${p.id === 'todos' ? '' : `/${p.id}`}`} style={vars({ '--pc': p.cor })} aria-current={filtro === p.id ? 'page' : undefined}>
                {p.id !== 'todos' && <span className="ptag__dot" />}<span>{p.curto}</span><span className="filtro__n">{n}</span>
                {regra && <span className={`filtro__est est--${regra}`} data-tip={REGRAS[regra].nome}><Ico nome={regra} /></span>}
              </a>
            );
          })}
          <button className="filtro" type="button" data-abrir-projetos="" onClick={() => abrirProjetos()}><Ico nome="editar" /><span>Projetos</span></button>
        </div>
        {lista.length === 0 && (
          <div className="ideias__vazio" data-quadro-vazio="">
            <p>Nenhum projeto ativo. As demandas aparecem aqui depois que você cadastrar um.</p>
            <div className="btn-row"><button className="btn btn--primary" type="button" onClick={() => abrirProjetos('novo')}>Cadastrar projeto</button></div>
          </div>
        )}
        <div className="raias" data-raias="" hidden={lista.length === 0}>
          {raias.map((r) => (
            <section key={r.id} className="raia" aria-labelledby={`raia-${r.id}`}>
              <h2 className="raia__h" id={`raia-${r.id}`}>{r.est && <Ico nome={r.est} classe={`est-t--${r.est}`} />}<span>{r.nome}</span><span className="raia__n">{r.itens.length}</span></h2>
              <div className="raia__lista">
                {r.itens.length ? r.itens.map((i) => <Cartao key={i.id} i={i} />) : <p className="raia__vazia">{r.id === 'atrasadas' ? 'Nada atrasado. Siga assim.' : 'Vazio.'}</p>}
                {projetoDaColuna && (
                  <NovaNaRaia key={`${modo}-${r.id}`} raia={r.id} nomeRaia={r.nome} aberta={compondo === `${modo}-${r.id}`} onAbrir={() => setCompondo(`${modo}-${r.id}`)}
                    onFechar={() => setCompondo((c) => (c === `${modo}-${r.id}` ? null : c))} projeto={projetoDaColuna} escolher={filtro === 'todos'} onProjeto={setProjNovo} />
                )}
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
        <span className="cartao__topo">
          <span className="cartao__id">{i.id}</span>
          <TagProjeto p={p} />
          <span className={`cartao__prio prio--${i.prioridade}`} data-tip={`Prioridade ${PRIO[i.prioridade].toLowerCase()}`}>
            <Ico nome={i.prioridade} />
            <span className="sr">{`Prioridade ${PRIO[i.prioridade]}`}</span>
          </span>
        </span>
        <span className="cartao__tit">{i.titulo}</span>
        <span className="cartao__pe">
          <span className={`cartao__prazo est-t--${est}`}>{pedeAtencao(est) && <Ico nome={est} />}{prazoTexto(i, t)}</span>
          {modo === 'prazo' && <span className="cartao__status">{STATUS[i.status]}</span>}
          {i.checklist.length > 0 && <span className="cartao__ck">{`${i.checklist.filter((c) => c.feito).length}/${i.checklist.length}`}</span>}
        </span>
      </button>
      {prox && (
        <button className="cartao__avancar" type="button" data-avancar-item={i.id} aria-label={`Mover ${i.id} para ${STATUS[prox]}`} data-tip={`Mover para ${STATUS[prox]}`}
          onClick={() => { focarDepois([`[data-avancar-item="${i.id}"]`, `[data-view="quadro"] [data-abrir="${i.id}"]`]); avancarItem(i.id); }}>
          <Ico nome={prox === 'feito' ? 'feito' : 'seta'} />
        </button>
      )}
      {i.prazo && i.status !== 'feito' && <Adiar i={i} />}
    </article>
  );
}

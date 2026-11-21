import { useEffect, useRef, useState, type FormEvent, type KeyboardEvent } from 'react';
import { $, useApp } from '../app/contexto';
import { useFecharAoSair } from '../app/hooks';
import { adicionarPasso, criarItem, editarPasso, excluirItem, marcarPasso, mudarCampo, removerPasso, type Campo, type NovosDados } from '../domain/acoes';
import { estadoItem, pedeAtencao, prazoTexto, PRIO, reacao, REGRAS, STATUS, TODOS_STATUS } from '../domain/motor';
import { ativos, proj } from '../domain/projetos';
import { fmtCurta, H, isoParaLocal, paraLocal, prazoRotulo } from '../domain/tempo';
import type { Item, Prioridade } from '../domain/tipos';
import { Calendario } from './Calendario';
import { Gif } from './Gif';
import { Ico, TagProjeto, vars } from './Icone';

export type AlvoFicha = { tipo: 'item'; id: string } | { tipo: 'novo'; projeto: string };

interface Props {
  alvo: AlvoFicha;
  onFechar: () => void;
  /** a ficha entrega aqui a função que salva o que ainda está sendo digitado (chamada antes de fechar) */
  registrarPendente: (fn: (() => void) | null) => void;
}

export function Ficha({ alvo, onFechar, registrarPendente }: Props) {
  const { S, t, atualizar, avisar, abrirFicha } = useApp();
  const existente = alvo.tipo === 'item' ? S.itens.find((x) => x.id === alvo.id) : undefined;
  const novo = alvo.tipo === 'novo';
  const [rascunho, setRascunho] = useState<NovosDados>(() => ({ projeto: alvo.tipo === 'novo' ? alvo.projeto : '', titulo: '', status: 'fazer', prioridade: 'media', prazo: new Date(t + 72 * H).toISOString(), descricao: '', checklist: [] }));
  const i: NovosDados & Partial<Item> = existente ?? rascunho;
  const p = proj(S.projetos, i.projeto);

  // texto em edição: salva ao sair do campo e também antes de fechar
  const [titulo, setTitulo] = useState(existente?.titulo ?? '');
  const [descricao, setDescricao] = useState(existente?.descricao ?? '');
  const [erroTitulo, setErroTitulo] = useState(false);
  const [passo, setPasso] = useState('');
  const [editando, setEditando] = useState<{ indice: number; texto: string } | null>(null);
  const [calAberto, setCalAberto] = useState(false);
  const textos = useRef({ titulo, descricao });
  textos.current = { titulo, descricao };

  const salvarCampo = (nome: Campo, valor: string) => { if (existente) atualizar((s) => mudarCampo(s, existente.id, nome, valor, t)); };
  const salvarTextos = () => { salvarCampo('titulo', textos.current.titulo); salvarCampo('descricao', textos.current.descricao); };
  useEffect(() => {
    if (!existente) return;
    registrarPendente(salvarTextos);
    return () => registrarPendente(null);
  });

  // calendário: Esc e clique fora fecham só ele, não a ficha
  useFecharAoSair(calAberto, setCalAberto, '[data-prazo]', '[data-prazo-abrir]');

  const mudar = (nome: 'status' | 'prioridade' | 'projeto', valor: string) => {
    if (novo) setRascunho((r) => ({ ...r, [nome]: valor }));
    else if (nome !== 'projeto') salvarCampo(nome, valor);
  };
  const prazoLocal = isoParaLocal(i.prazo);
  const escolherPrazo = (d: Date | null, fechar: boolean) => {
    if (novo) setRascunho((r) => ({ ...r, prazo: d ? d.toISOString() : null }));
    else salvarCampo('prazo', d ? paraLocal(d) : '');
    if (fechar) { setCalAberto(false); $('[data-prazo-abrir]')?.focus(); }
  };
  const marcar = (n: number, feito: boolean) => {
    if (novo) setRascunho((r) => ({ ...r, checklist: r.checklist.map((c, k) => (k === n ? { ...c, feito } : c)) }));
    else atualizar((s) => marcarPasso(s, existente!.id, n, feito, t));
  };
  const salvarPasso = () => {
    if (!editando) return;
    const { indice: n, texto: txt } = editando;
    if (novo) { if (txt.trim()) setRascunho((r) => ({ ...r, checklist: r.checklist.map((c, k) => (k === n ? { ...c, t: txt.trim() } : c)) })); }
    else atualizar((s) => editarPasso(s, existente!.id, n, txt, t));
    setEditando(null);
    setTimeout(() => $(`[data-ck-editar="${n}"]`)?.focus());
  };
  const tirarPasso = (n: number) => {
    const texto = i.checklist[n].t;
    if (novo) setRascunho((r) => ({ ...r, checklist: r.checklist.filter((_, k) => k !== n) }));
    else {
      const r = removerPasso(S, existente!.id, n, t);
      if (!r) return;
      atualizar(() => r[0]);
      avisar(`Passo removido: ${texto}`, { rotulo: 'Desfazer', fn: () => atualizar(r[1]) });
    }
    $('#f-ck')?.focus();
  };
  const excluir = () => {
    if (!existente) return;
    const r = excluirItem(S, existente.id);
    if (!r) return;
    onFechar();
    atualizar(() => r[0]);
    avisar(`${existente.id} excluída.`, { rotulo: 'Desfazer', fn: () => atualizar(r[1]) });
  };
  const addPasso = () => {
    const txt = passo.trim();
    if (!txt) { $('#f-ck')?.focus(); return; }
    if (novo) setRascunho((r) => ({ ...r, checklist: [...r.checklist, { t: txt, feito: false }] }));
    else atualizar((s) => adicionarPasso(s, existente!.id, txt, t));
    setPasso(''); $('#f-ck')?.focus();
  };
  const criar = (e: FormEvent) => {
    e.preventDefault();
    if (!novo) return;
    const tit = titulo.trim();
    if (!tit) { setErroTitulo(true); $('#f-titulo')?.focus(); return; }
    const [S2, item] = criarItem(S, { ...rascunho, titulo: tit, descricao }, t);
    atualizar(() => S2);
    onFechar();
    avisar(`${item.id} criada em ${proj(S.projetos, item.projeto).curto}.`, { rotulo: 'Abrir a ficha', fn: () => abrirFicha(item.id) });
  };

  const est = existente ? estadoItem(existente, t) : 'normal';
  const r = existente && pedeAtencao(est) ? reacao(est, S.girar, existente.id) : null;

  return (
    <form className="ficha" data-ficha="" noValidate style={vars({ '--pc': p.cor })} onSubmit={criar}>
      <div className="ficha__cab">
        <p className="ficha__id">{existente ? <>{`${existente.id} · `}<TagProjeto p={p} /></> : 'Nova demanda'}</p>
        <button className="ficha__fechar" type="button" data-fechar="" aria-label="Fechar a ficha" onClick={onFechar}><Ico nome="fechar" /></button>
      </div>
      <h2 id="gaveta-h" className="ficha__h">{existente ? existente.titulo : 'O que precisa ser feito?'}</h2>
      {r && existente && pedeAtencao(est) && (
        <div className={`ficha__reacao est--${est}`}><Gif key={r.id} r={r} chave={`ficha-${existente.id}`} classe="gif--mini" /><p><strong>{`${prazoTexto(existente, t)}.`}</strong>{` ${REGRAS[est].regra}`}</p></div>
      )}
      <div className="campo">
        <label htmlFor="f-titulo">Título</label>
        <input id="f-titulo" name="titulo" value={titulo} autoComplete="off" aria-describedby="f-titulo-erro" aria-invalid={erroTitulo || undefined}
          onChange={(e) => { setTitulo(e.target.value); if (e.target.value.trim()) setErroTitulo(false); }} onBlur={() => salvarCampo('titulo', titulo)} />
        <p className="field__error" id="f-titulo-erro" hidden={!erroTitulo}>Escreva um título para a demanda.</p>
      </div>
      {novo && (
        <fieldset className="campo"><legend>Projeto</legend><div className="opcoes">
          {ativos(S.projetos).map((x) => <label key={x.id} className="opc opc--proj" style={vars({ '--pc': x.cor, '--pt': x.tinta })}><input type="radio" name="projeto" value={x.id} checked={x.id === i.projeto} onChange={() => mudar('projeto', x.id)} /><span><i className="ptag__dot" aria-hidden="true" />{x.curto}</span></label>)}
        </div></fieldset>
      )}
      <fieldset className="campo"><legend>Status</legend><div className="seg seg--status">
        {TODOS_STATUS.map((s) => <label key={s}><input type="radio" name="status" value={s} checked={i.status === s} onChange={() => mudar('status', s)} /><span>{STATUS[s]}</span></label>)}
      </div></fieldset>
      <fieldset className="campo"><legend>Prioridade</legend><div className="opcoes">
        {(Object.keys(PRIO) as Prioridade[]).map((k) => <label key={k} className={`opc opc--prio prio--${k}`}><input type="radio" name="prioridade" value={k} checked={i.prioridade === k} onChange={() => mudar('prioridade', k)} /><span><Ico nome={k} />{PRIO[k]}</span></label>)}
      </div></fieldset>
      <div className="campo prazo" data-prazo="">
        <span className="campo__rot" id="f-prazo-rot">Prazo</span>
        <button type="button" className="prazo__btn" data-prazo-abrir="" aria-expanded={calAberto} aria-controls="prazo-pop" aria-labelledby="f-prazo-rot f-prazo-txt" onClick={() => setCalAberto((v) => !v)}>
          <Ico nome="calendario" /><span id="f-prazo-txt">{prazoRotulo(prazoLocal, t)}</span>
        </button>
        <input type="hidden" name="prazo" id="f-prazo" value={prazoLocal} />
        <div className="prazo__pop" id="prazo-pop" role="dialog" aria-label="Escolher prazo" hidden={!calAberto}>
          {calAberto && <Calendario valor={prazoLocal} t={t} onEscolher={escolherPrazo} />}
        </div>
      </div>
      <div className="campo">
        <label htmlFor="f-desc">Detalhes técnicos</label>
        <textarea id="f-desc" name="descricao" rows={5} value={descricao} onChange={(e) => setDescricao(e.target.value)} onBlur={() => salvarCampo('descricao', descricao)} />
      </div>
      <fieldset className="campo"><legend>Checklist</legend>
        <ul className="ck">{i.checklist.map((c, n) => (editando?.indice === n
          ? <li key={n} className="ck__novo">
              <label className="sr" htmlFor="f-ck-ed">{`Editar o passo ${c.t}`}</label>
              <input id="f-ck-ed" autoFocus autoComplete="off" value={editando.texto} onChange={(e) => setEditando({ indice: n, texto: e.target.value })}
                onKeyDown={(e: KeyboardEvent) => { if (e.key === 'Enter') { e.preventDefault(); salvarPasso(); } if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); setEditando(null); } }} />
              <button className="btn btn--secondary" type="button" onClick={salvarPasso}>Salvar</button>
            </li>
          : <li key={n}>
              <label><input type="checkbox" data-ck={n} checked={c.feito} onChange={(e) => marcar(n, e.target.checked)} /><span>{c.t}</span></label>
              <button className="ck__acao" type="button" data-ck-editar={n} aria-label={`Editar o passo ${c.t}`} data-tip="Editar" onClick={() => setEditando({ indice: n, texto: c.t })}><Ico nome="editar" /></button>
              <button className="ck__acao" type="button" data-ck-remover={n} aria-label={`Remover o passo ${c.t}`} data-tip="Remover" onClick={() => tirarPasso(n)}><Ico nome="lixo" /></button>
            </li>))}</ul>
        <div className="ck__novo">
          <label className="sr" htmlFor="f-ck">Novo passo</label>
          <input id="f-ck" placeholder="Novo passo" autoComplete="off" value={passo} onChange={(e) => setPasso(e.target.value)} onKeyDown={(e: KeyboardEvent) => { if (e.key === 'Enter') { e.preventDefault(); addPasso(); } }} />
          <button className="btn btn--secondary" type="button" data-ck-add="" onClick={addPasso}>Adicionar passo</button>
        </div>
      </fieldset>
      {existente
        ? <>
            <section className="hist" aria-labelledby="hist-h"><h3 id="hist-h">Histórico</h3><ol>
              {existente.historico.map((h, n) => <li key={n}><time dateTime={h.em}>{fmtCurta.format(Date.parse(h.em))}</time><span>{h.texto}</span></li>).reverse()}
            </ol></section>
            <p className="ficha__salvo">Cada mudança é salva na hora e entra no histórico.</p>
            <div className="ficha__acoes"><button className="btn btn--secondary" type="button" data-excluir={existente.id} onClick={excluir}>Excluir demanda</button></div>
          </>
        : <div className="ficha__acoes"><button className="btn btn--primary" type="submit">Criar demanda</button><button className="btn btn--secondary" type="button" data-fechar="" onClick={onFechar}>Cancelar</button></div>}
    </form>
  );
}

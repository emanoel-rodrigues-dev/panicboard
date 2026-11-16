import { useRef, useState, type FormEvent, type KeyboardEvent } from 'react';
import { useApp } from '../app/contexto';
import { Ico, vars } from '../components/Icone';
import { descartarIdeia, novaIdeia, promoverIdeia } from '../domain/acoes';
import { ativos, proj } from '../domain/projetos';
import { dur } from '../domain/tempo';
import { trechosComTags } from '../domain/texto';
import type { Ideia } from '../domain/tipos';

export function Ideias() {
  const { S, ideiasFiltro, setIdeiasFiltro, atualizar, avisar, t } = useApp();
  const [texto, setTexto] = useState('');
  const [erro, setErro] = useState(false);
  const campo = useRef<HTMLTextAreaElement>(null);
  const lista = S.ideias.filter((d) => (ideiasFiltro === 'abertas' ? !d.promovida : d.promovida)).sort((a, b) => Date.parse(b.criado) - Date.parse(a.criado));

  const guardar = (e?: FormEvent) => {
    e?.preventDefault();
    const txt = texto.trim();
    if (!txt) { setErro(true); campo.current?.focus(); return; }
    setErro(false);
    atualizar((s) => novaIdeia(s, txt, t));
    setTexto(''); setIdeiasFiltro('abertas'); campo.current?.focus();
    avisar('Ideia guardada fora dos projetos.');
  };
  const tecla = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); guardar(); }
  };

  return (
    <section className="tela" aria-labelledby="ideias-h">
      <div className="wrap">
        <div className="tela__topo">
          <h1 id="ideias-h" tabIndex={-1}>Ideias soltas</h1>
          <p className="ideias__sub">Ficam fora dos projetos até você promover uma delas a demanda.</p>
        </div>
        <form className="captura" data-captura="" noValidate onSubmit={guardar}>
          <label htmlFor="nova-ideia" className="captura__rot">Nova ideia</label>
          <div className="captura__linha">
            <textarea ref={campo} id="nova-ideia" rows={2} placeholder="Escreva do jeito que veio. Use #tag se quiser." aria-describedby="nova-ideia-dica nova-ideia-erro" aria-invalid={erro || undefined}
              value={texto} onChange={(e) => { setTexto(e.target.value); if (e.target.value.trim()) setErro(false); }} onKeyDown={tecla} />
            <button className="btn btn--primary" type="submit">Guardar ideia</button>
          </div>
          <p className="captura__dica" id="nova-ideia-dica">Enter guarda, Shift + Enter quebra a linha. Atalho em qualquer tela: tecla I.</p>
          <p className="field__error" id="nova-ideia-erro" hidden={!erro}>Escreva a ideia antes de guardar.</p>
        </form>
        <div className="seg seg--ideias" role="group" aria-label="Mostrar">
          <button type="button" data-ideias-filtro="abertas" aria-pressed={ideiasFiltro === 'abertas'} onClick={() => setIdeiasFiltro('abertas')}>Soltas</button>
          <button type="button" data-ideias-filtro="promovidas" aria-pressed={ideiasFiltro === 'promovidas'} onClick={() => setIdeiasFiltro('promovidas')}>Promovidas</button>
        </div>
        <div className="ideias" data-ideias="">
          {lista.length
            ? lista.map((d) => <CartaoIdeia key={d.id} d={d} />)
            : <p className="ideias__vazio">{ideiasFiltro === 'abertas' ? 'Nenhuma ideia solta. A próxima que aparecer, anote aqui em cima.' : 'Nenhuma ideia promovida ainda.'}</p>}
        </div>
      </div>
    </section>
  );
}

function CartaoIdeia({ d }: { d: Ideia }) {
  const { S, t, atualizar, avisar, abrirFicha, abrirProjetos } = useApp();
  const item = d.promovida ? S.itens.find((i) => i.id === d.promovida) : undefined;
  const promover = (pid: string) => {
    const r = promoverIdeia(S, d.id, pid, t);
    if (!r) return;
    atualizar(() => r[0]);
    avisar(`Virou ${r[1].id} em ${proj(S.projetos, pid).curto}.`, { rotulo: 'Abrir a ficha', fn: () => abrirFicha(r[1].id) });
  };
  const descartar = () => {
    const r = descartarIdeia(S, d.id);
    if (!r) return;
    atualizar(() => r[0]);
    avisar(`${d.id} descartada.`, { rotulo: 'Desfazer', fn: () => atualizar(r[1]) });
  };
  return (
    <article className="ideia">
      <p className="ideia__txt">{trechosComTags(d.texto).map((x, n) => (x.tipo === 'tag' ? <span key={n} className="hashtag">{`#${x.valor}`}</span> : x.valor))}</p>
      <p className="ideia__quando">{`${d.id} · há ${dur(t - Date.parse(d.criado))}`}</p>
      {item
        ? <p className="ideia__virou">Virou <button className="link" type="button" data-abrir={item.id} onClick={() => abrirFicha(item.id)}>{item.id}</button>{` em ${proj(S.projetos, item.projeto).curto}`}</p>
        : <>
            <div className="ideia__promo" role="group" aria-label={`Promover ${d.id} a demanda de um projeto`}>
              <span className="ideia__promo-rot">Promover para</span>
              {ativos(S.projetos).length === 0 && <button className="link" type="button" onClick={() => abrirProjetos('novo')}>Cadastrar um projeto</button>}
              {ativos(S.projetos).map((p) => <button key={p.id} type="button" className="promo" style={vars({ '--pc': p.cor, '--pt': p.tinta })} data-promover={d.id} data-proj={p.id} aria-label={`Promover a demanda de ${p.curto}`} onClick={() => promover(p.id)}>{p.sigla}</button>)}
            </div>
            <button className="ideia__descartar" type="button" data-descartar={d.id} aria-label={`Descartar ${d.id}`} onClick={descartar}><Ico n="lixo" /></button>
          </>}
    </article>
  );
}

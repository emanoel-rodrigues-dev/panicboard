// Transições de estado puras: recebem o Estado e devolvem um novo, sem mutar o original.
import { FLUXO, PRIO, STATUS } from './motor';
import { proj } from './projetos';
import { fmtCurta } from './tempo';
import { tituloDaIdeia } from './texto';
import type { Estado, Ideia, Item, Prioridade, Regra, Status } from './tipos';

export type Campo = 'status' | 'prioridade' | 'prazo' | 'titulo' | 'descricao';

const iso = (t: number) => new Date(t).toISOString();

function registrar(i: Item, texto: string, t: number) {
  i.atualizado = iso(t);
  i.historico = [...i.historico, { em: i.atualizado, texto }];
}

/** Aplica a mudança num clone do item. Devolve null se nada mudou. */
function aplicar(i: Item, nome: Campo, valor: string, t: number): Item | null {
  const c: Item = { ...i };
  if (nome === 'status' && valor !== i.status) { registrar(c, `Movida de ${STATUS[i.status]} para ${STATUS[valor as Status]}`, t); c.status = valor as Status; return c; }
  if (nome === 'prioridade' && valor !== i.prioridade) { registrar(c, `Prioridade ${PRIO[i.prioridade]} → ${PRIO[valor as Prioridade]}`, t); c.prioridade = valor as Prioridade; return c; }
  if (nome === 'prazo') {
    const novo = valor ? new Date(valor).toISOString() : null;
    if (novo === i.prazo) return null;
    c.prazo = novo; registrar(c, novo ? `Prazo para ${fmtCurta.format(Date.parse(novo))}` : 'Prazo removido', t); return c;
  }
  if (nome === 'titulo' && valor.trim() && valor.trim() !== i.titulo) { c.titulo = valor.trim(); registrar(c, 'Título editado', t); return c; }
  if (nome === 'descricao' && valor !== i.descricao) { c.descricao = valor; registrar(c, 'Detalhes editados', t); return c; }
  return null;
}

const trocarItem = (S: Estado, novo: Item): Estado => ({ ...S, itens: S.itens.map((x) => (x.id === novo.id ? novo : x)) });

export function mudarCampo(S: Estado, id: string, nome: Campo, valor: string, t: number): Estado {
  const i = S.itens.find((x) => x.id === id);
  const novo = i && aplicar(i, nome, valor, t);
  return novo ? trocarItem(S, novo) : S;
}

/** Próximo status no fluxo (backlog vai para "A fazer"); undefined se já está feito. */
export const proximoStatus = (s: Status): Status | undefined => FLUXO[FLUXO.indexOf(s) + 1];

export function avancarStatus(S: Estado, id: string, t: number): Estado {
  const i = S.itens.find((x) => x.id === id);
  const prox = i && proximoStatus(i.status);
  return prox ? mudarCampo(S, id, 'status', prox, t) : S;
}

/**
 * Adia o prazo em alguns dias, no mesmo horário. Se a conta ainda cair no passado (estava atrasada),
 * conta a partir de hoje. Sem prazo ou já entregue: nada muda.
 */
export function adiarPrazo(S: Estado, id: string, dias: number, t: number): Estado {
  const i = S.itens.find((x) => x.id === id);
  if (!i?.prazo || i.status === 'feito') return S;
  const d = new Date(i.prazo); d.setDate(d.getDate() + dias);
  if (d.getTime() <= t) {
    const hoje = new Date(t); d.setFullYear(hoje.getFullYear(), hoje.getMonth(), hoje.getDate() + dias);
  }
  return mudarCampo(S, id, 'prazo', d.toISOString(), t);
}

export function marcarPasso(S: Estado, id: string, n: number, feito: boolean, t: number): Estado {
  const i = S.itens.find((x) => x.id === id);
  if (!i?.checklist[n]) return S;
  const c: Item = { ...i, checklist: i.checklist.map((p, k) => (k === n ? { ...p, feito } : p)) };
  registrar(c, `${feito ? 'Concluído' : 'Reaberto'}: ${i.checklist[n].t}`, t);
  return trocarItem(S, c);
}

export function adicionarPasso(S: Estado, id: string, texto: string, t: number): Estado {
  const i = S.itens.find((x) => x.id === id);
  if (!i) return S;
  const c: Item = { ...i, checklist: [...i.checklist, { t: texto, feito: false }] };
  registrar(c, `Passo adicionado: ${texto}`, t);
  return trocarItem(S, c);
}

export type NovosDados = Pick<Item, 'projeto' | 'titulo' | 'status' | 'prioridade' | 'prazo' | 'descricao' | 'checklist'>;

export function criarItem(S: Estado, dados: NovosDados, t: number, origem = 'Demanda criada'): [Estado, Item] {
  const p = proj(S.projetos, dados.projeto);
  let n = (S.seq[p.id] || 0) + 1;
  // a sigla pode ter mudado ou passado de um projeto para outro: o código nunca se repete
  while (S.itens.some((i) => i.id === `${p.sigla}-${n}`)) n++;
  const em = iso(t);
  const item: Item = { ...dados, id: `${p.sigla}-${n}`, criado: em, atualizado: em, historico: [{ em, texto: origem }] };
  return [{ ...S, seq: { ...S.seq, [p.id]: n }, itens: [...S.itens, item] }, item];
}

/** Próxima chave livre do projeto (a sigla pode ter mudado ou passado de um projeto para outro: o código nunca se repete). */
function proximaChave(S: Estado, pid: string): [string, number] {
  const p = proj(S.projetos, pid);
  let n = (S.seq[p.id] || 0) + 1;
  while (S.itens.some((i) => i.id === `${p.sigla}-${n}`)) n++;
  return [`${p.sigla}-${n}`, n];
}

/**
 * Move a demanda para outro projeto: ela ganha a chave do projeto novo (PF-14 vira CH-9), no mesmo lugar da lista,
 * e a ideia que virou essa demanda passa a apontar para a chave nova. A chave antiga não é reaproveitada.
 * Devolve também a função que traz de volta (chave e projeto antigos, mantendo o que mudou depois).
 */
export function moverItem(S: Estado, id: string, pid: string, t: number): [Estado, Item, (s: Estado) => Estado] | null {
  const i = S.itens.find((x) => x.id === id);
  if (!i || i.projeto === pid || !S.projetos.some((p) => p.id === pid)) return null;
  const [chave, n] = proximaChave(S, pid);
  const de = proj(S.projetos, i.projeto), para = proj(S.projetos, pid);
  const novo: Item = { ...i, id: chave, projeto: pid };
  registrar(novo, `Movida de ${de.curto} (${id}) para ${para.curto}`, t);
  const trocarIdeia = (s: Estado, a: string, b: string) => s.ideias.map((d) => (d.promovida === a ? { ...d, promovida: b } : d));
  const desfazer = (s: Estado): Estado => {
    if (s.itens.some((x) => x.id === id)) return s;
    return {
      ...s,
      itens: s.itens.map((x) => {
        if (x.id !== chave) return x;
        const volta: Item = { ...x, id, projeto: i.projeto };
        registrar(volta, `Voltou para ${de.curto} (${id})`, t);
        return volta;
      }),
      ideias: trocarIdeia(s, chave, id),
    };
  };
  return [{ ...S, seq: { ...S.seq, [pid]: n }, itens: S.itens.map((x) => (x.id === id ? novo : x)), ideias: trocarIdeia(S, id, chave) }, novo, desfazer];
}

export function novaIdeia(S: Estado, texto: string, t: number): Estado {
  const seqIdeia = (S.seqIdeia || S.ideias.length) + 1;
  const ideia: Ideia = { id: `ID-${seqIdeia}`, texto, criado: iso(t), promovida: null };
  return { ...S, seqIdeia, ideias: [...S.ideias, ideia] };
}

export function promoverIdeia(S: Estado, ideiaId: string, pid: string, t: number): [Estado, Item] | null {
  const ideia = S.ideias.find((x) => x.id === ideiaId);
  if (!ideia || ideia.promovida) return null;
  const [S2, item] = criarItem(S, { projeto: pid, titulo: tituloDaIdeia(ideia.texto), status: 'fazer', prioridade: 'media', prazo: null, descricao: ideia.texto, checklist: [] }, t, `Promovida da ideia ${ideia.id}`);
  return [{ ...S2, ideias: S2.ideias.map((x) => (x.id === ideiaId ? { ...x, promovida: item.id } : x)) }, item];
}

/** Remove a ideia e devolve também a função que a recoloca na mesma posição. */
export function descartarIdeia(S: Estado, id: string): [Estado, (s: Estado) => Estado] | null {
  const n = S.ideias.findIndex((x) => x.id === id);
  if (n < 0) return null;
  const fora = S.ideias[n];
  const desfazer = (s: Estado): Estado => { const ideias = [...s.ideias]; ideias.splice(n, 0, fora); return { ...s, ideias }; };
  return [{ ...S, ideias: S.ideias.filter((x) => x.id !== id) }, desfazer];
}

export const girarGif = (S: Estado, regra: Regra): Estado => ({ ...S, girar: { ...S.girar, [regra]: (S.girar[regra] || 0) + 1 } });

export function editarPasso(S: Estado, id: string, n: number, texto: string, t: number): Estado {
  const i = S.itens.find((x) => x.id === id);
  const novo = texto.trim();
  if (!i?.checklist[n] || !novo || novo === i.checklist[n].t) return S;
  const c: Item = { ...i, checklist: i.checklist.map((p, k) => (k === n ? { ...p, t: novo } : p)) };
  registrar(c, `Passo editado: ${i.checklist[n].t} → ${novo}`, t);
  return trocarItem(S, c);
}

/**
 * Remove o passo e devolve também a função que o recoloca na mesma posição.
 * O desfazer mexe só nesse passo: o que foi marcado ou editado depois da remoção continua valendo.
 */
export function removerPasso(S: Estado, id: string, n: number, t: number): [Estado, (s: Estado) => Estado] | null {
  const i = S.itens.find((x) => x.id === id);
  const fora = i?.checklist[n];
  if (!i || !fora) return null;
  const c: Item = { ...i, checklist: i.checklist.filter((_, k) => k !== n) };
  registrar(c, `Passo removido: ${fora.t}`, t);
  const desfazer = (s: Estado): Estado => ({
    ...s,
    itens: s.itens.map((x) => {
      if (x.id !== id) return x;
      const checklist = [...x.checklist];
      checklist.splice(Math.min(n, checklist.length), 0, fora);
      return { ...x, checklist, historico: [...x.historico, { em: iso(t), texto: `Passo devolvido: ${fora.t}` }] };
    }),
  });
  return [trocarItem(S, c), desfazer];
}

/**
 * Exclui a demanda e devolve também a função que a recoloca (mesma posição e mesmo código).
 * O contador do projeto não volta: o código excluído nunca é reaproveitado por outra demanda.
 * Ideias promovidas para ela voltam a ficar soltas, e o desfazer liga de novo.
 */
export function excluirItem(S: Estado, id: string): [Estado, (s: Estado) => Estado] | null {
  const n = S.itens.findIndex((x) => x.id === id);
  if (n < 0) return null;
  const fora = S.itens[n];
  const ideias = S.ideias.filter((d) => d.promovida === id).map((d) => d.id);
  const desfazer = (s: Estado): Estado => {
    const itens = [...s.itens];
    itens.splice(Math.min(n, itens.length), 0, fora);
    return { ...s, itens, ideias: s.ideias.map((d) => (ideias.includes(d.id) && !d.promovida ? { ...d, promovida: id } : d)) };
  };
  return [{ ...S, itens: S.itens.filter((x) => x.id !== id), ideias: S.ideias.map((d) => (d.promovida === id ? { ...d, promovida: null } : d)) }, desfazer];
}

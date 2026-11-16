// Transições de estado puras: recebem o Estado e devolvem um novo, sem mutar o original.
import { FLUXO, PRIO, proj, STATUS } from './motor';
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
  const p = proj(dados.projeto);
  const n = (S.seq[p.id] || 0) + 1;
  const em = iso(t);
  const item: Item = { ...dados, id: `${p.sigla}-${n}`, criado: em, atualizado: em, historico: [{ em, texto: origem }] };
  return [{ ...S, seq: { ...S.seq, [p.id]: n }, itens: [...S.itens, item] }, item];
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

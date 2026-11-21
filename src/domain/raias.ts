import { FLUXO, PENDENTE, porAtualizacao, porPrazo, PRAZO_APERTADO_MS, STATUS, TODOS_STATUS } from './motor';
import { H } from './tempo';
import type { EstadoItem, Item, Status } from './tipos';

export type Modo = 'prazo' | 'status';
export interface Raia { id: string; nome: string; est: EstadoItem | null; itens: Item[] }

const SEMANA_MS = 7 * 24 * H;
const PESO = { alta: 0, media: 1, baixa: 2 } as const;
/** dentro de cada raia: alta prioridade primeiro; empate, o prazo mais perto */
const porPrioridade = (a: Item, b: Item) => PESO[a.prioridade] - PESO[b.prioridade] || porPrazo(a, b);

export function montarRaias(itens: Item[], modo: Modo, t: number): Raia[] {
  if (modo === 'status') {
    const status: Status[] = itens.some((i) => i.status === 'backlog') ? TODOS_STATUS : FLUXO;
    return status.map((s) => ({ id: s, nome: STATUS[s], est: s === 'feito' ? 'feito' : null, itens: itens.filter((i) => i.status === s).sort(s === 'feito' ? porAtualizacao : porPrioridade) }));
  }
  // por prazo: tudo que não foi entregue, inclusive backlog
  const pend = itens.filter(PENDENTE).sort(porPrioridade);
  const em = (i: Item) => (i.prazo ? Date.parse(i.prazo) - t : null);
  const entre = (i: Item, min: number, max: number) => { const d = em(i); return d !== null && d >= min && d <= max; };
  return [
    { id: 'atrasadas', nome: 'Atrasadas', est: 'atrasado', itens: pend.filter((i) => { const d = em(i); return d !== null && d < 0; }) },
    { id: 'h24', nome: 'Próximas 24 h', est: 'prazo_apertado', itens: pend.filter((i) => entre(i, 0, PRAZO_APERTADO_MS)) },
    { id: 'semana', nome: 'Esta semana', est: null, itens: pend.filter((i) => { const d = em(i); return d !== null && d > PRAZO_APERTADO_MS && d <= SEMANA_MS; }) },
    { id: 'depois', nome: 'Depois ou sem prazo', est: null, itens: pend.filter((i) => { const d = em(i); return d === null || d > SEMANA_MS; }) },
    { id: 'feitas', nome: 'Entregues', est: 'feito', itens: itens.filter((i) => i.status === 'feito').sort(porAtualizacao) },
  ];
}

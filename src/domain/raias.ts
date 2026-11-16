import { FLUXO, PENDENTE, porPrazo, STATUS } from './motor';
import { H } from './tempo';
import type { EstadoItem, Item, Status } from './tipos';

export type Modo = 'prazo' | 'status';
export interface Raia { id: string; nome: string; est: EstadoItem | 'atrasado' | 'prazo_apertado' | null; itens: Item[] }

const recentes = (a: Item, b: Item) => Date.parse(b.atualizado) - Date.parse(a.atualizado);

export function montarRaias(itens: Item[], modo: Modo, t: number): Raia[] {
  if (modo === 'status') {
    const status: Status[] = itens.some((i) => i.status === 'backlog') ? ['backlog', ...FLUXO] : FLUXO;
    return status.map((s) => ({ id: s, nome: STATUS[s], est: s === 'feito' ? 'feito' : null, itens: itens.filter((i) => i.status === s) }));
  }
  // por prazo: tudo que não foi entregue, inclusive backlog
  const pend = itens.filter(PENDENTE).sort(porPrazo);
  const em = (i: Item) => (i.prazo ? Date.parse(i.prazo) - t : null);
  const entre = (i: Item, min: number, max: number) => { const d = em(i); return d !== null && d >= min && d <= max; };
  return [
    { id: 'atrasadas', nome: 'Atrasadas', est: 'atrasado', itens: pend.filter((i) => { const d = em(i); return d !== null && d < 0; }) },
    { id: 'h24', nome: 'Próximas 24 h', est: 'prazo_apertado', itens: pend.filter((i) => entre(i, 0, 24 * H)) },
    { id: 'semana', nome: 'Esta semana', est: null, itens: pend.filter((i) => { const d = em(i); return d !== null && d > 24 * H && d <= 7 * 24 * H; }) },
    { id: 'depois', nome: 'Depois ou sem prazo', est: null, itens: pend.filter((i) => { const d = em(i); return d === null || d > 7 * 24 * H; }) },
    { id: 'feitas', nome: 'Entregues', est: 'feito', itens: itens.filter((i) => i.status === 'feito').sort(recentes) },
  ];
}

import { FLUXO, estaPendente, porAtualizacao, porPrazo, PRAZO_APERTADO_MS, STATUS, TODOS_STATUS } from './motor';
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
  const pend = itens.filter(estaPendente).sort(porPrioridade);
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

/** dia + dias, às 18:00 locais (o horário padrão dos atalhos do calendário) */
function as18h(t: number, dias: number): string {
  const d = new Date(t); d.setDate(d.getDate() + dias); d.setHours(18, 0, 0, 0);
  return d.toISOString();
}

/**
 * O que a demanda criada direto numa coluna já recebe, para cair nessa mesma coluna.
 * null: a coluna não aceita criação (já atrasada ou já entregue).
 */
export function padraoDaRaia(raia: string, t: number): { status: Status; prazo: string | null } | null {
  const proximas18h = () => { const hoje = new Date(t); return as18h(t, hoje.getHours() < 18 ? 0 : 1); };
  switch (raia) {
    case 'h24': return { status: 'fazer', prazo: proximas18h() };
    case 'semana': return { status: 'fazer', prazo: as18h(t, 3) };
    case 'depois': return { status: 'fazer', prazo: null };
    case 'backlog': return { status: 'backlog', prazo: null };
    case 'fazer': case 'fazendo': case 'revisao': return { status: raia, prazo: as18h(t, 3) };
    default: return null;
  }
}

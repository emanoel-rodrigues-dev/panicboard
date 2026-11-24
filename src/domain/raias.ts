import { mudarCampo } from './acoes';
import { FLUXO, estaPendente, porAtualizacao, porPrazo, PRAZO_APERTADO_MS, STATUS, TODOS_STATUS } from './motor';
import { H } from './tempo';
import type { Estado, EstadoItem, Item, Status } from './tipos';

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
export function as18h(t: number, dias: number): string {
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

/**
 * O que acontece ao soltar uma demanda numa coluna (arrastar e soltar).
 * Por status: ela vai para aquele status, em qualquer direção. Por prazo: o status fica e só o prazo muda,
 * com o mesmo padrão de criar direto na coluna; uma entregue que sai de "Entregues" volta para "A fazer".
 * "Entregues" marca como feita. null: a coluna não aceita (Atrasadas) ou a demanda já está nela.
 */
export function soltarNaRaia(S: Estado, id: string, raia: string, modo: Modo, t: number): Estado | null {
  const i = S.itens.find((x) => x.id === id);
  if (!i) return null;
  const atual = montarRaias([i], modo, t).find((r) => r.itens.length);
  if (!atual || atual.id === raia) return null;
  let S2 = S;
  if (raia === 'feitas' || raia === 'feito') S2 = mudarCampo(S2, id, 'status', 'feito', t);
  else if (modo === 'status') {
    if (!(raia in STATUS)) return null;
    S2 = mudarCampo(S2, id, 'status', raia, t);
  } else {
    const padrao = padraoDaRaia(raia, t);
    if (!padrao) return null;
    if (i.status === 'feito') S2 = mudarCampo(S2, id, 'status', 'fazer', t);
    S2 = mudarCampo(S2, id, 'prazo', padrao.prazo ?? '', t);
  }
  return S2 === S ? null : S2;
}

/** Desfaz o soltar: devolve o status e o prazo que a demanda tinha, sem tocar no resto (edições feitas depois ficam). */
export function desfazerSoltar(S: Estado, antes: Item, t: number): Estado {
  return mudarCampo(mudarCampo(S, antes.id, 'status', antes.status, t), antes.id, 'prazo', antes.prazo ?? '', t);
}

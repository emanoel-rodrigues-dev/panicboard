// Motor de reações: as 4 regras de tempo e o estado de cada demanda.
import { REACOES } from './reacoes';
import { PROJETOS } from './seed';
import { dur, H } from './tempo';
import type { Estado, EstadoItem, Item, Prioridade, Projeto, Reacao, Regra, Status } from './tipos';

export const STATUS: Record<Status, string> = { backlog: 'Backlog', fazer: 'A fazer', fazendo: 'Fazendo', revisao: 'Em revisão', feito: 'Feito' };
export const FLUXO: Status[] = ['fazer', 'fazendo', 'revisao', 'feito'];
export const PRIO: Record<Prioridade, string> = { alta: 'Alta', media: 'Média', baixa: 'Baixa' };

/** Em execução: conta para as regras do motor (backlog ainda não é compromisso). */
export const ABERTO = (i: Item) => i.status === 'fazer' || i.status === 'fazendo' || i.status === 'revisao';
/** Ainda não entregue: é o que aparece e é contado no quadro, inclusive backlog. */
export const PENDENTE = (i: Item) => i.status !== 'feito';

export const REGRAS: Record<Regra, { nome: string; regra: string; ordem: number }> = {
  atrasado: { nome: 'Atraso crítico', regra: 'O prazo passou e a demanda não foi concluída.', ordem: 0 },
  prazo_apertado: { nome: 'Prazo apertado', regra: 'Uma entrega vence nas próximas 24 horas.', ordem: 1 },
  abandonado: { nome: 'Projeto parado', regra: 'Há trabalho em andamento, mas nada se mexe há mais de 48 horas.', ordem: 2 },
  em_dia: { nome: 'Tudo em dia', regra: 'Todas as demandas do ciclo foram entregues.', ordem: 4 },
};

export const proj = (id: string): Projeto => PROJETOS.find((p) => p.id === id)!;

/** ordenação por prazo, sem prazo vai para o fim */
export const porPrazo = (a: Item, b: Item) => (Date.parse(a.prazo ?? '') || 9e15) - (Date.parse(b.prazo ?? '') || 9e15);

export function estadoItem(i: Item, t: number): EstadoItem {
  if (i.status === 'feito') return 'feito';
  if (!i.prazo || !ABERTO(i)) return 'normal';
  const p = Date.parse(i.prazo);
  if (p < t) return 'atrasado';
  if (p - t <= 24 * H) return 'prazo_apertado';
  return 'normal';
}

export function prazoTexto(i: Item, t: number): string {
  if (i.status === 'feito') return 'Entregue';
  if (!i.prazo) return 'Sem prazo';
  const d = Date.parse(i.prazo) - t;
  return d < 0 ? `Atrasada há ${dur(d)}` : `Vence em ${dur(d)}`;
}

export interface Avaliacao {
  pid: string;
  itens: Item[];
  abertos: Item[];
  atrasados: Item[];
  apertados: Item[];
  andamento: Item[];
  feitos: Item[];
  ultima: number;
  parado: number;
  regra: Regra | null;
  estado: string;
}

export function avaliar(todos: Item[], pid: string, t: number): Avaliacao {
  const itens = todos.filter((i) => i.projeto === pid);
  const abertos = itens.filter(ABERTO);
  const atrasados = abertos.filter((i) => estadoItem(i, t) === 'atrasado').sort(porPrazo);
  const apertados = abertos.filter((i) => estadoItem(i, t) === 'prazo_apertado').sort(porPrazo);
  const andamento = itens.filter((i) => i.status === 'fazendo' || i.status === 'revisao');
  const ultima = Math.max(...itens.map((i) => Date.parse(i.atualizado)), 0);
  const parado = t - ultima;
  const feitos = itens.filter((i) => i.status === 'feito');
  const base = { pid, itens, abertos, atrasados, apertados, andamento, feitos, ultima, parado };
  const desde = (i: Item) => dur(Date.parse(i.prazo!) - t);
  if (atrasados.length) return { ...base, regra: 'atrasado', estado: atrasados.length > 1 ? `${atrasados.length} atrasadas, a pior há ${desde(atrasados[0])}` : `Atrasada há ${desde(atrasados[0])}` };
  if (apertados.length) return { ...base, regra: 'prazo_apertado', estado: `Entrega em ${desde(apertados[0])}` };
  if (andamento.length && parado >= 48 * H) return { ...base, regra: 'abandonado', estado: `Parado há ${dur(parado)}` };
  if (!abertos.length && feitos.length) return { ...base, regra: 'em_dia', estado: 'Ciclo entregue' };
  return { ...base, regra: null, estado: abertos.length ? 'Andando no ritmo' : 'Sem demandas' };
}

export const ordemRegra = (r: Regra | null) => (r ? REGRAS[r].ordem : 3);

/** os 4 projetos avaliados, do mais urgente para o mais calmo */
export const avaliarTodos = (itens: Item[], t: number) => PROJETOS.map((p) => avaliar(itens, p.id, t)).sort((a, b) => ordemRegra(a.regra) - ordemRegra(b.regra));

function hash(s: string) { let h = 0; for (const c of s) h = (h * 31 + c.charCodeAt(0)) | 0; return Math.abs(h); }

/** GIF da regra para um projeto/demanda: varia pela chave e pelo "Trocar o GIF" */
export function reacao(regra: Regra, girar: Estado['girar'], chave = ''): Reacao {
  const lista = REACOES[regra];
  return lista[(hash(chave) + (girar[regra] || 0)) % lista.length];
}

export const nomeCurto = (r: Reacao) => r.personagem.split(/[(:]/)[0].trim();

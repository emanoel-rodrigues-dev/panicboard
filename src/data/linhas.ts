// Estado do app <-> linhas das tabelas do Supabase. Funções puras.
import type { Estado, Ideia, Item, Projeto } from '../domain/tipos';

export interface LinhaProjeto extends Omit<Projeto, 'arquivado'> { arquivado: boolean; ordem: number }
export type LinhaDemanda = Item;
export interface LinhaIdeia extends Ideia { ordem: number }
export interface LinhaContadores { seq: Record<string, number>; seq_ideia: number; girar: Estado['girar'] }

/** colunas que a leitura da demanda pede ao banco: tem que cobrir tudo que o app grava (o teste confere) */
export const COLUNAS_DEMANDA = 'id, projeto, titulo, status, prioridade, prazo, descricao, checklist, imagens, historico, criado, atualizado';

export interface Linhas {
  projetos: LinhaProjeto[];
  demandas: LinhaDemanda[];
  ideias: LinhaIdeia[];
  contadores: LinhaContadores | null;
}

/** o banco devolve datas como "2026-11-16T15:00:00+00:00"; o app usa o ISO do JavaScript */
const iso = (d: string) => new Date(d).toISOString();
const isoOuNulo = (d: string | null) => (d ? iso(d) : null);

export function estadoParaLinhas(S: Estado): Linhas {
  return {
    projetos: S.projetos.map((p, ordem) => ({ id: p.id, sigla: p.sigla, nome: p.nome, curto: p.curto, cor: p.cor, tinta: p.tinta, arquivado: !!p.arquivado, ordem })),
    demandas: S.itens.map((i) => ({ id: i.id, projeto: i.projeto, titulo: i.titulo, status: i.status, prioridade: i.prioridade, prazo: i.prazo, descricao: i.descricao, checklist: i.checklist, imagens: i.imagens ?? [], historico: i.historico, criado: i.criado, atualizado: i.atualizado })),
    ideias: S.ideias.map((d, ordem) => ({ id: d.id, texto: d.texto, criado: d.criado, promovida: d.promovida, ordem })),
    contadores: { seq: S.seq, seq_ideia: S.seqIdeia, girar: S.girar },
  };
}

export const linhasVazias = (l: Linhas) => !l.projetos.length && !l.demandas.length && !l.ideias.length && !l.contadores;

export function linhasParaEstado(l: Linhas): Estado {
  const porOrdem = <T extends { ordem: number }>(xs: T[]) => [...xs].sort((a, b) => a.ordem - b.ordem);
  return {
    versao: 2,
    projetos: porOrdem(l.projetos).map(({ ordem: _o, arquivado, ...p }) => (arquivado ? { ...p, arquivado } : p)),
    // sem imagens, o campo fica de fora (como nas demandas criadas antes delas)
    itens: l.demandas.map(({ imagens, ...i }) => ({ ...i, ...(imagens?.length ? { imagens } : {}), prazo: isoOuNulo(i.prazo), criado: iso(i.criado), atualizado: iso(i.atualizado) })),
    ideias: porOrdem(l.ideias).map(({ ordem: _o, ...d }) => ({ ...d, criado: iso(d.criado) })),
    seq: l.contadores?.seq ?? {},
    seqIdeia: l.contadores?.seq_ideia ?? 0,
    girar: l.contadores?.girar ?? {},
  };
}

export interface Mudancas<T> { gravar: T[]; apagar: string[] }

/** o que mudou de uma lista de linhas para outra, comparando pelo id */
export function diferenca<T extends { id: string }>(antes: T[], depois: T[]): Mudancas<T> {
  const velho = new Map(antes.map((x) => [x.id, JSON.stringify(x)]));
  const ids = new Set(depois.map((x) => x.id));
  return {
    gravar: depois.filter((x) => velho.get(x.id) !== JSON.stringify(x)),
    apagar: antes.filter((x) => !ids.has(x.id)).map((x) => x.id),
  };
}

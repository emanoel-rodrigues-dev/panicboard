import { describe, expect, it } from 'vitest';
import { alertasNovos, textoAlerta } from './alertas';
import { mudarCampo } from './acoes';
import { montarExemplo } from './seed';
import { estaParado, PARADO_MS } from './motor';
import { dur, H } from './tempo';
import type { Item } from './tipos';

const T = Date.parse('2026-11-16T15:00:00Z');
const S = montarExemplo(T);
const ativos = new Set(S.projetos.map((p) => p.id));

/** o exemplo tem demandas paradas em Fazendo; estes testes olham só os avisos de prazo */
const novosDePrazo = (...args: Parameters<typeof alertasNovos>) => alertasNovos(...args).filter((x) => x.estado !== 'parado');

describe('alertas de prazo', () => {
  it('avisa a atrasada e a de prazo apertado, uma vez só', () => {
    const a = novosDePrazo(S.itens, ativos, T, new Set());
    expect(a.map((x) => [x.item.id, x.estado])).toEqual([['PF-14', 'atrasado'], ['CH-8', 'prazo_apertado']]);
    expect(novosDePrazo(S.itens, ativos, T, new Set(a.map((x) => x.chave)))).toEqual([]);
  });

  it('mudar o prazo gera um aviso novo; projeto arquivado não avisa', () => {
    const avisados = new Set(novosDePrazo(S.itens, ativos, T, new Set()).map((x) => x.chave));
    const S2 = mudarCampo(S, 'CH-8', 'prazo', new Date(T + 2 * H).toISOString(), T);
    expect(novosDePrazo(S2.itens, ativos, T, avisados).map((x) => x.item.id)).toEqual(['CH-8']);
    expect(novosDePrazo(S.itens, new Set(['funil']), T, new Set())).toEqual([]);
  });

  it('texto: uma pelo nome, várias pelo total', () => {
    const a = novosDePrazo(S.itens, ativos, T, new Set());
    expect(textoAlerta([a[0]], dur, T).titulo).toBe('PF-14 atrasou');
    expect(textoAlerta(a, dur, T)).toEqual({ titulo: '2 demandas precisam de atenção', corpo: '1 atrasada e 1 com prazo apertado: PF-14, CH-8' });
  });
});

describe('aviso de demanda parada', () => {
  const projeto = S.projetos[0].id;
  const demanda = (extra: Partial<Item>): Item => ({ ...S.itens[0], id: 'X-1', projeto, titulo: 'Tela de teste', status: 'fazendo', prazo: null, atualizado: new Date(T - PARADO_MS).toISOString(), ...extra });

  it('fazendo ou em revisão sem mexer por 48 h avisa; antes disso, não', () => {
    for (const status of ['fazendo', 'revisao'] as const) {
      expect(alertasNovos([demanda({ status })], ativos, T, new Set()).map((x) => x.estado)).toEqual(['parado']);
      expect(alertasNovos([demanda({ status, atualizado: new Date(T - PARADO_MS + 60_000).toISOString() })], ativos, T, new Set())).toEqual([]);
    }
    expect(estaParado(demanda({}), T)).toBe(true);
  });

  it('a fazer, backlog e entregue paradas não avisam', () => {
    for (const status of ['fazer', 'backlog', 'feito'] as const) {
      expect(alertasNovos([demanda({ status, atualizado: new Date(T - 30 * 24 * H).toISOString() })], ativos, T, new Set())).toEqual([]);
      expect(estaParado(demanda({ status, atualizado: new Date(T - 30 * 24 * H).toISOString() }), T)).toBe(false);
    }
  });

  it('avisa uma vez; mexer na demanda e ela parar de novo gera aviso novo', () => {
    const [a] = alertasNovos([demanda({})], ativos, T, new Set());
    expect(alertasNovos([demanda({})], ativos, T, new Set([a.chave]))).toEqual([]);
    const depois = T + 5 * 24 * H;
    expect(alertasNovos([demanda({ atualizado: new Date(T + H).toISOString() })], ativos, depois, new Set([a.chave])).map((x) => x.estado)).toEqual(['parado']);
  });

  it('atrasada e parada recebe só o aviso do prazo; projeto arquivado não avisa', () => {
    const atrasada = demanda({ prazo: new Date(T - H).toISOString() });
    expect(alertasNovos([atrasada], ativos, T, new Set()).map((x) => x.estado)).toEqual(['atrasado']);
    expect(alertasNovos([demanda({})], new Set(), T, new Set())).toEqual([]);
  });

  it('texto: uma parada pelo nome; várias, com os três tipos juntos', () => {
    const [a] = alertasNovos([demanda({ atualizado: new Date(T - 3 * 24 * H).toISOString() })], ativos, T, new Set());
    expect(textoAlerta([a], dur, T)).toEqual({ titulo: `X-1 parada há ${dur(3 * 24 * H)}`, corpo: 'Tela de teste · Fazendo' });
    const doPrazo = ['PF-14', 'CH-8'].map((id) => S.itens.find((i) => i.id === id)!);
    const todos = alertasNovos([...doPrazo, demanda({})], ativos, T, new Set());
    expect(todos.map((x) => x.estado)).toEqual(['atrasado', 'prazo_apertado', 'parado']);
    expect(textoAlerta(todos, dur, T)).toEqual({ titulo: '3 demandas precisam de atenção', corpo: '1 atrasada, 1 com prazo apertado e 1 parada: PF-14, CH-8, X-1' });
  });
});

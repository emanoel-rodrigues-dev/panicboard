import { describe, expect, it } from 'vitest';
import { arquivarProjeto } from '../domain/projetos';
import { montarExemplo } from '../domain/seed';
import { diferenca, estadoParaLinhas, linhasParaEstado, linhasVazias } from './linhas';

const T = Date.parse('2026-11-16T15:00:00Z');

describe('estado <-> linhas do Supabase', () => {
  it('ida e volta devolve o mesmo estado, com a ordem e o arquivado', () => {
    const S = arquivarProjeto(montarExemplo(T), 'chales', true);
    expect(linhasParaEstado(estadoParaLinhas(S))).toEqual(S);
  });

  it('aceita as datas no formato do Postgres', () => {
    const l = estadoParaLinhas(montarExemplo(T));
    l.demandas[0] = { ...l.demandas[0], criado: '2026-11-16 15:00:00+00', prazo: null };
    const S = linhasParaEstado(l);
    expect(S.itens[0].criado).toBe('2026-11-16T15:00:00.000Z');
    expect(S.itens[0].prazo).toBeNull();
  });

  it('banco vazio é reconhecido', () => {
    expect(linhasVazias({ projetos: [], demandas: [], ideias: [], contadores: null })).toBe(true);
  });

  it('diferença grava só o que mudou e apaga o que saiu', () => {
    const a = [{ id: '1', v: 1 }, { id: '2', v: 2 }, { id: '3', v: 3 }];
    const b = [{ id: '1', v: 1 }, { id: '2', v: 9 }, { id: '4', v: 4 }];
    expect(diferenca(a, b)).toEqual({ gravar: [{ id: '2', v: 9 }, { id: '4', v: 4 }], apagar: ['3'] });
  });
});

import { describe, expect, it } from 'vitest';
import { alertasNovos, textoAlerta } from './alertas';
import { mudarCampo } from './acoes';
import { montarExemplo } from './seed';
import { dur, H } from './tempo';

const T = Date.parse('2026-11-16T15:00:00Z');
const S = montarExemplo(T);
const ativos = new Set(S.projetos.map((p) => p.id));

describe('alertas de prazo', () => {
  it('avisa a atrasada e a de prazo apertado, uma vez só', () => {
    const a = alertasNovos(S.itens, ativos, T, new Set());
    expect(a.map((x) => [x.item.id, x.estado])).toEqual([['PF-14', 'atrasado'], ['CH-8', 'prazo_apertado']]);
    expect(alertasNovos(S.itens, ativos, T, new Set(a.map((x) => x.chave)))).toEqual([]);
  });

  it('mudar o prazo gera um aviso novo; projeto arquivado não avisa', () => {
    const avisados = new Set(alertasNovos(S.itens, ativos, T, new Set()).map((x) => x.chave));
    const S2 = mudarCampo(S, 'CH-8', 'prazo', new Date(T + 2 * H).toISOString(), T);
    expect(alertasNovos(S2.itens, ativos, T, avisados).map((x) => x.item.id)).toEqual(['CH-8']);
    expect(alertasNovos(S.itens, new Set(['funil']), T, new Set())).toEqual([]);
  });

  it('texto: uma pelo nome, várias pelo total', () => {
    const a = alertasNovos(S.itens, ativos, T, new Set());
    expect(textoAlerta([a[0]], dur, T).titulo).toBe('PF-14 atrasou');
    expect(textoAlerta(a, dur, T)).toEqual({ titulo: '2 demandas precisam de atenção', corpo: '1 atrasada e 1 com prazo apertado: PF-14, CH-8' });
  });
});

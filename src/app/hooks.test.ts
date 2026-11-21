import { describe, expect, it } from 'vitest';
import { arquivarProjeto } from '../domain/projetos';
import { montarExemplo } from '../domain/seed';
import type { Rota } from './contexto';
import { projetoDaNovaDemanda } from './hooks';

describe('projeto em que uma nova demanda abre', () => {
  const S = montarExemplo(Date.parse('2026-11-16T15:00:00Z'));
  const quadro = (sub: string): Rota => ({ nome: 'quadro', sub });

  it('no quadro filtrado, o projeto do filtro', () => {
    expect(projetoDaNovaDemanda(S.projetos, quadro('chales'))).toBe('chales');
  });

  it('sem filtro, o primeiro projeto ativo', () => {
    expect(projetoDaNovaDemanda(S.projetos, quadro('todos'))).toBe('funil');
    expect(projetoDaNovaDemanda(S.projetos, { nome: 'radar', sub: 'chales' })).toBe('funil');
  });

  it('filtro de projeto arquivado cai no primeiro ativo', () => {
    expect(projetoDaNovaDemanda(arquivarProjeto(S, 'chales', true).projetos, quadro('chales'))).toBe('funil');
  });

  it('sem projeto ativo, nenhum', () => {
    expect(projetoDaNovaDemanda([], quadro('chales'))).toBeNull();
  });
});

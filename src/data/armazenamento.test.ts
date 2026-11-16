import { describe, expect, it } from 'vitest';
import { CHAVE, lerEstado } from './armazenamento';

const T = Date.parse('2026-11-16T15:00:00Z');
const armazem = (inicial: Record<string, string> = {}) => {
  const m = new Map(Object.entries(inicial));
  return { getItem: (k: string) => m.get(k) ?? null, setItem: (k: string, v: string) => void m.set(k, v), m };
};

describe('bug 4: dados salvos com defeito', () => {
  it('guarda a cópia do que estava salvo e avisa, em vez de perder em silêncio', () => {
    const a = armazem({ [CHAVE]: '{"versao":1,"itens":[' });
    const carga = lerEstado(a, T);
    expect(a.m.get(`${CHAVE}.defeito`)).toBe('{"versao":1,"itens":[');
    expect(carga.aviso).toMatch(/defeito/);
    expect(carga.estado.itens.length).toBeGreaterThan(0);
  });

  it('versão desconhecida também é preservada', () => {
    const a = armazem({ [CHAVE]: '{"versao":3,"itens":[],"ideias":[],"seq":{}}' });
    lerEstado(a, T);
    expect(a.m.has(`${CHAVE}.defeito`)).toBe(true);
  });

  it('sem nada salvo abre o exemplo sem aviso', () => {
    expect(lerEstado(armazem(), T).aviso).toBeUndefined();
  });

  it('bug 6: estado antigo com relógio simulado salvo é lido sem o deslocamento', () => {
    const a = armazem({ [CHAVE]: JSON.stringify({ versao: 1, itens: [], ideias: [], seq: {}, seqIdeia: 0, girar: {}, deslocamentoH: 72 }) });
    expect('deslocamentoH' in lerEstado(a, T).estado).toBe(false);
  });

  it('versão 1 (projetos fixos no código) é migrada com um projeto por demanda', () => {
    const item = { id: 'AB-4', projeto: 'abc', titulo: 'X', status: 'fazer', prioridade: 'media', prazo: null, descricao: '', checklist: [], historico: [], criado: '', atualizado: '' };
    const a = armazem({ [CHAVE]: JSON.stringify({ versao: 1, itens: [item], ideias: [], seq: { abc: 4 }, seqIdeia: 0, girar: {} }) });
    const { estado } = lerEstado(a, T);
    expect(estado.versao).toBe(2);
    expect(estado.projetos).toEqual([expect.objectContaining({ id: 'abc', sigla: 'AB', nome: 'Abc' })]);
  });
});

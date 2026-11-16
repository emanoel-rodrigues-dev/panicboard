import { describe, expect, it } from 'vitest';
import { avancarStatus, criarItem, descartarIdeia, mudarCampo, promoverIdeia } from './acoes';
import { avaliar, avaliarTodos, estadoItem, PENDENTE } from './motor';
import { montarRaias } from './raias';
import { montarExemplo } from './seed';
import { H } from './tempo';
import { trechosComTags, tituloDaIdeia } from './texto';

const T = Date.parse('2026-11-16T15:00:00Z');
const exemplo = () => montarExemplo(T);

describe('motor de reações com os dados de exemplo', () => {
  it('abre com uma regra por projeto', () => {
    const S = exemplo();
    const regra = (pid: string) => avaliar(S.itens, pid, T).regra;
    expect(regra('rhia')).toBe('atrasado');
    expect(regra('luga')).toBe('prazo_apertado');
    expect(regra('meta')).toBe('abandonado');
    expect(regra('estudos')).toBe('em_dia');
  });

  it('com +1 dia a Luga passa para atrasado', () => {
    expect(avaliar(exemplo().itens, 'luga', T + 24 * H).regra).toBe('atrasado');
  });

  it('ordena do mais urgente para o mais calmo', () => {
    expect(avaliarTodos(exemplo().itens, T).map((a) => a.pid)).toEqual(['rhia', 'luga', 'meta', 'estudos']);
  });

  it('backlog não dispara regra de atraso', () => {
    const S = exemplo();
    const S2 = mudarCampo(S, 'RH-14', 'status', 'backlog', T);
    expect(estadoItem(S2.itens.find((i) => i.id === 'RH-14')!, T)).toBe('normal');
  });
});

describe('bug 2: demanda em backlog no quadro por prazo', () => {
  it('aparece numa raia de prazo e conta como pendente', () => {
    const S = mudarCampo(exemplo(), 'RH-14', 'status', 'backlog', T);
    const raias = montarRaias(S.itens.filter((i) => i.projeto === 'rhia'), 'prazo', T);
    const ids = raias.flatMap((r) => r.itens.map((i) => i.id));
    expect(ids).toContain('RH-14');
    expect(S.itens.filter((i) => i.projeto === 'rhia' && PENDENTE(i)).map((i) => i.id)).toContain('RH-14');
  });

  it('sem prazo vai para "Depois ou sem prazo"', () => {
    let S = mudarCampo(exemplo(), 'RH-14', 'status', 'backlog', T);
    S = mudarCampo(S, 'RH-14', 'prazo', '', T);
    const depois = montarRaias(S.itens, 'prazo', T).find((r) => r.id === 'depois')!;
    expect(depois.itens.map((i) => i.id)).toContain('RH-14');
  });
});

describe('bug 3: #tags e apóstrofo', () => {
  it("mantém o apóstrofo como texto e separa a tag", () => {
    expect(trechosComTags("Revisar don't e won't #ingles")).toEqual([
      { tipo: 'texto', valor: "Revisar don't e won't " },
      { tipo: 'tag', valor: 'ingles' },
    ]);
  });

  it('título da ideia promovida tira as tags e corta em 90', () => {
    expect(tituloDaIdeia("Copo d'água #casa  na mesa")).toBe("Copo d'água na mesa");
    expect(tituloDaIdeia('a'.repeat(120))).toHaveLength(89);
  });
});

describe('ações', () => {
  it('avançar de backlog vai para A fazer e registra no histórico', () => {
    const S = avancarStatus(mudarCampo(exemplo(), 'RH-16', 'status', 'backlog', T), 'RH-16', T + H);
    const i = S.itens.find((x) => x.id === 'RH-16')!;
    expect(i.status).toBe('fazer');
    expect(i.historico.at(-1)!.texto).toBe('Movida de Backlog para A fazer');
  });

  it('não muta o estado original', () => {
    const S = exemplo();
    const antes = JSON.stringify(S);
    mudarCampo(S, 'RH-14', 'titulo', 'Outro', T);
    expect(JSON.stringify(S)).toBe(antes);
  });

  it('cria com a próxima chave do projeto', () => {
    const [S, item] = criarItem(exemplo(), { projeto: 'rhia', titulo: 'X', status: 'fazer', prioridade: 'media', prazo: null, descricao: '', checklist: [] }, T);
    expect(item.id).toBe('RH-17');
    expect(S.seq.rhia).toBe(17);
  });

  it('promove a ideia uma vez só e liga a demanda', () => {
    const r = promoverIdeia(exemplo(), 'ID-1', 'estudos', T)!;
    expect(r[0].ideias.find((x) => x.id === 'ID-1')!.promovida).toBe(r[1].id);
    expect(promoverIdeia(r[0], 'ID-1', 'estudos', T)).toBeNull();
  });

  it('descartar e desfazer devolve a ideia na mesma posição', () => {
    const S = exemplo();
    const [S2, desfazer] = descartarIdeia(S, 'ID-3')!;
    expect(S2.ideias.map((x) => x.id)).not.toContain('ID-3');
    expect(desfazer(S2).ideias.map((x) => x.id)).toEqual(S.ideias.map((x) => x.id));
  });
});

import { describe, expect, it } from 'vitest';
import { adiarPrazo, avancarStatus, criarItem, descartarIdeia, editarPasso, excluirItem, marcarPasso, mudarCampo, promoverIdeia, removerPasso } from './acoes';
import { avaliar, avaliarTodos, estadoItem, estaPendente } from './motor';
import { arquivarProjeto, coresDaImagem, criarProjeto, editarProjeto, lerHex, sugerirSigla, tintaPara, validarProjeto } from './projetos';
import { montarRaias, padraoDaRaia } from './raias';
import { montarExemplo } from './seed';
import { H } from './tempo';
import { trechosComTags, tituloDaIdeia } from './texto';

const T = Date.parse('2026-11-16T15:00:00Z');
const exemplo = () => montarExemplo(T);

describe('motor de reações com os dados de exemplo', () => {
  it('abre com uma regra por projeto', () => {
    const S = exemplo();
    const regra = (pid: string) => avaliar(S.itens, pid, T).regra;
    expect(regra('folha')).toBe('atrasado');
    expect(regra('chales')).toBe('prazo_apertado');
    expect(regra('funil')).toBe('abandonado');
    expect(regra('estudos')).toBe('em_dia');
  });

  it('com +1 dia os Chalés passam para atrasado', () => {
    expect(avaliar(exemplo().itens, 'chales', T + 24 * H).regra).toBe('atrasado');
  });

  it('ordena do mais urgente para o mais calmo', () => {
    expect(avaliarTodos(exemplo().itens, exemplo().projetos, T).map((a) => a.pid)).toEqual(['folha', 'chales', 'funil', 'estudos']);
  });

  it('backlog não dispara regra de atraso', () => {
    const S = exemplo();
    const S2 = mudarCampo(S, 'PF-14', 'status', 'backlog', T);
    expect(estadoItem(S2.itens.find((i) => i.id === 'PF-14')!, T)).toBe('normal');
  });
});

describe('demanda em backlog no quadro por prazo', () => {
  it('aparece numa raia de prazo e conta como pendente', () => {
    const S = mudarCampo(exemplo(), 'PF-14', 'status', 'backlog', T);
    const raias = montarRaias(S.itens.filter((i) => i.projeto === 'folha'), 'prazo', T);
    const ids = raias.flatMap((r) => r.itens.map((i) => i.id));
    expect(ids).toContain('PF-14');
    expect(S.itens.filter((i) => i.projeto === 'folha' && estaPendente(i)).map((i) => i.id)).toContain('PF-14');
  });

  it('sem prazo vai para "Depois ou sem prazo"', () => {
    let S = mudarCampo(exemplo(), 'PF-14', 'status', 'backlog', T);
    S = mudarCampo(S, 'PF-14', 'prazo', '', T);
    const depois = montarRaias(S.itens, 'prazo', T).find((r) => r.id === 'depois')!;
    expect(depois.itens.map((i) => i.id)).toContain('PF-14');
  });
});

describe('#tags e apóstrofo', () => {
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
    const S = avancarStatus(mudarCampo(exemplo(), 'PF-16', 'status', 'backlog', T), 'PF-16', T + H);
    const i = S.itens.find((x) => x.id === 'PF-16')!;
    expect(i.status).toBe('fazer');
    expect(i.historico.at(-1)!.texto).toBe('Movida de Backlog para A fazer');
  });

  it('não muta o estado original', () => {
    const S = exemplo();
    const antes = JSON.stringify(S);
    mudarCampo(S, 'PF-14', 'titulo', 'Outro', T);
    expect(JSON.stringify(S)).toBe(antes);
  });

  it('cria com a próxima chave do projeto', () => {
    const [S, item] = criarItem(exemplo(), { projeto: 'folha', titulo: 'X', status: 'fazer', prioridade: 'media', prazo: null, descricao: '', checklist: [] }, T);
    expect(item.id).toBe('PF-17');
    expect(S.seq.folha).toBe(17);
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

describe('cadastro de projetos', () => {
  const dados = { nome: 'Site da Padaria', curto: '', sigla: 'sp', cor: '#d6336c' };

  it('cria com id, sigla em maiúsculas, nome curto e a tinta da cor', () => {
    const [S, p] = criarProjeto(exemplo(), dados)!;
    expect(p).toMatchObject({ id: 'site-da-padaria', sigla: 'SP', curto: 'Site da Padaria', tinta: '#ffffff' });
    expect(S.projetos.at(-1)).toEqual(p);
    const [, item] = criarItem(S, { projeto: p.id, titulo: 'X', status: 'fazer', prioridade: 'media', prazo: null, descricao: '', checklist: [] }, T);
    expect(item.id).toBe('SP-1');
  });

  it('não aceita nome vazio nem sigla repetida', () => {
    const S = exemplo();
    expect(validarProjeto(S.projetos, { ...dados, nome: ' ' }).nome).toBeTruthy();
    expect(validarProjeto(S.projetos, { ...dados, sigla: 'pf' }).sigla).toMatch(/PF/);
    expect(validarProjeto(S.projetos, { ...dados, sigla: 'PF' }, 'folha')).toEqual({});
    expect(criarProjeto(S, { ...dados, sigla: '' })).toBeNull();
  });

  it('sigla trocada não repete o código de uma demanda que já existe', () => {
    let S = editarProjeto(exemplo(), 'folha', { nome: 'Ponto & Folha', curto: '', sigla: 'XX', cor: '#3b6fa3' })!;
    S = editarProjeto(S, 'chales', { nome: 'Chalés', curto: '', sigla: 'PF', cor: '#ff8000' })!;
    const [, item] = criarItem(S, { projeto: 'chales', titulo: 'X', status: 'fazer', prioridade: 'media', prazo: null, descricao: '', checklist: [] }, T);
    expect(S.itens.some((i) => i.id === item.id)).toBe(false);
  });

  it('arquivado sai do radar, mas as demandas continuam guardadas', () => {
    const S = arquivarProjeto(exemplo(), 'folha', true);
    expect(avaliarTodos(S.itens, S.projetos, T).map((a) => a.pid)).not.toContain('folha');
    expect(S.itens.some((i) => i.projeto === 'folha')).toBe(true);
    expect(arquivarProjeto(S, 'folha', false).projetos.find((p) => p.id === 'folha')!.arquivado).toBe(false);
  });

  it('sugere a sigla pelas iniciais', () => {
    expect(sugerirSigla('Loja da Ana')).toBe('LD');
    expect(sugerirSigla('Ímã')).toBe('IM');
  });

  it('aceita outra cor em hex e escolhe a tinta de maior contraste', () => {
    expect(lerHex('2F9E44')).toBe('#2f9e44');
    expect(lerHex('#abc')).toBe('#aabbcc');
    expect(lerHex('verde')).toBeNull();
    expect(tintaPara('#ffe066')).toBe('#16181d');
    expect(tintaPara('#1b1f3b')).toBe('#ffffff');
    const [, p] = criarProjeto(exemplo(), { ...dados, cor: '#FFE066' })!;
    expect(p).toMatchObject({ cor: '#ffe066', tinta: '#16181d' });
    expect(validarProjeto([], { ...dados, cor: '#12' }).cor).toBeTruthy();
  });

  it('tira as cores principais da imagem, da mais frequente, sem o fundo branco', () => {
    const px = (cores: [number, number, number, number, number][]) => new Uint8ClampedArray(cores.flatMap(([r, g, b, a, n]) => Array.from({ length: n }, () => [r, g, b, a]).flat()));
    const img = px([[255, 255, 255, 255, 50], [214, 51, 108, 255, 30], [212, 50, 110, 255, 5], [59, 111, 163, 255, 10], [0, 0, 0, 0, 99]]);
    expect(coresDaImagem(img)).toEqual(['#d6336c', '#3b6fa3']);
  });
});

describe('extras', () => {
  it('edita e remove passo do checklist, com histórico', () => {
    let S = editarPasso(exemplo(), 'FN-31', 0, 'Mapear todas as colunas', T);
    let i = S.itens.find((x) => x.id === 'FN-31')!;
    expect(i.checklist[0]).toEqual({ t: 'Mapear todas as colunas', feito: true });
    expect(i.historico.at(-1)!.texto).toBe('Passo editado: Mapear colunas → Mapear todas as colunas');
    expect(editarPasso(S, 'FN-31', 0, '  ', T)).toBe(S);
    S = removerPasso(S, 'FN-31', 1, T)![0];
    i = S.itens.find((x) => x.id === 'FN-31')!;
    expect(i.checklist.map((p) => p.t)).toEqual(['Mapear todas as colunas', 'Conferir duplicados']);
    expect(i.historico.at(-1)!.texto).toBe('Passo removido: Rodar em homologação');
  });

  it('desfazer a remoção de um passo devolve ele no lugar sem perder o que foi marcado depois', () => {
    const [S1, desfazer] = removerPasso(exemplo(), 'PF-14', 0, T)!;
    const S2 = marcarPasso(S1, 'PF-14', 0, true, T + H);
    const i = desfazer(S2).itens.find((x) => x.id === 'PF-14')!;
    expect(i.checklist).toEqual([
      { t: 'Reproduzir com o caso do dia 31', feito: true },
      { t: 'Corrigir arredondamento', feito: true },
      { t: 'Teste de regressão', feito: false },
    ]);
    expect(i.historico.at(-1)!.texto).toBe('Passo devolvido: Reproduzir com o caso do dia 31');
  });

  it('exclui a demanda, solta a ideia promovida e o desfazer devolve tudo', () => {
    const [S1, item] = promoverIdeia(exemplo(), 'ID-1', 'estudos', T)!;
    const [S2, desfazer] = excluirItem(S1, item.id)!;
    expect(S2.itens.some((x) => x.id === item.id)).toBe(false);
    expect(S2.ideias.find((x) => x.id === 'ID-1')!.promovida).toBeNull();
    const S3 = desfazer(S2);
    expect(S3.itens.map((x) => x.id)).toEqual(S1.itens.map((x) => x.id));
    expect(S3.ideias.find((x) => x.id === 'ID-1')!.promovida).toBe(item.id);
  });

  it('código de demanda excluída não é reaproveitado', () => {
    const [S1, a] = criarItem(exemplo(), { projeto: 'folha', titulo: 'A', status: 'fazer', prioridade: 'media', prazo: null, descricao: '', checklist: [] }, T);
    const [S2] = excluirItem(S1, a.id)!;
    const [, b] = criarItem(S2, { projeto: 'folha', titulo: 'B', status: 'fazer', prioridade: 'media', prazo: null, descricao: '', checklist: [] }, T);
    expect(b.id).not.toBe(a.id);
  });

  it('dentro da raia, alta prioridade vem antes; empate pelo prazo', () => {
    const S = exemplo();
    const semana = montarRaias(S.itens, 'prazo', T).find((r) => r.id === 'semana')!;
    const pesos = semana.itens.map((i) => ({ alta: 0, media: 1, baixa: 2 })[i.prioridade]);
    expect(pesos).toEqual([...pesos].sort());
    const fazer = montarRaias(S.itens, 'status', T).find((r) => r.id === 'fazer')!;
    expect(fazer.itens[0].prioridade).toBe('alta');
  });
});

describe('criar na coluna do quadro', () => {
  const vazio = () => ({ ...exemplo(), itens: [] });
  // horas locais: o padrão usa 18:00 do fuso de quem usa
  const horas = [[0, 0], [8, 0], [17, 59], [18, 0], [23, 59]].map(([h, m]) => new Date(2026, 10, 18, h, m).getTime());

  it.each(['h24', 'semana', 'depois'])('a demanda criada em "%s" cai na mesma coluna a qualquer hora', (raia) => {
    for (const t of horas) {
      const [S] = criarItem(vazio(), { projeto: 'folha', titulo: 'Nova', prioridade: 'media', descricao: '', checklist: [], ...padraoDaRaia(raia, t)! }, t);
      const onde = montarRaias(S.itens, 'prazo', t).find((r) => r.itens.length)!.id;
      expect(onde, new Date(t).toString()).toBe(raia);
    }
  });

  it('por status, nasce no status da coluna; backlog sem prazo', () => {
    const t = horas[1];
    for (const s of ['fazer', 'fazendo', 'revisao'] as const) expect(padraoDaRaia(s, t)).toMatchObject({ status: s, prazo: expect.any(String) });
    expect(padraoDaRaia('backlog', t)).toEqual({ status: 'backlog', prazo: null });
  });

  it('Atrasadas, Entregues e Feito não têm criação', () => {
    for (const r of ['atrasadas', 'feitas', 'feito']) expect(padraoDaRaia(r, horas[1])).toBeNull();
  });
});

describe('adiar o prazo pelo cartão', () => {
  const t = new Date(2026, 10, 18, 10, 0).getTime();
  const comPrazo = (prazo: Date | null, status: 'fazer' | 'feito' = 'fazer') =>
    criarItem({ ...exemplo(), itens: [] }, { projeto: 'folha', titulo: 'X', status, prioridade: 'media', prazo: prazo && prazo.toISOString(), descricao: '', checklist: [] }, t);
  const prazoDe = (S: ReturnType<typeof exemplo>, id: string) => new Date(S.itens.find((i) => i.id === id)!.prazo!);

  it('prazo no futuro: soma os dias e mantém o horário', () => {
    const [S, i] = comPrazo(new Date(2026, 10, 20, 14, 0));
    expect(prazoDe(adiarPrazo(S, i.id, 1, t), i.id)).toEqual(new Date(2026, 10, 21, 14, 0));
    expect(prazoDe(adiarPrazo(S, i.id, 7, t), i.id)).toEqual(new Date(2026, 10, 27, 14, 0));
  });

  it('atrasada há dias: conta a partir de hoje, no mesmo horário, e sai do atraso', () => {
    const [S, i] = comPrazo(new Date(2026, 10, 14, 18, 0));
    expect(prazoDe(adiarPrazo(S, i.id, 1, t), i.id)).toEqual(new Date(2026, 10, 19, 18, 0));
  });

  it('atrasada de ontem com +1 dia: fica para hoje no mesmo horário, se ainda não passou', () => {
    const [S, i] = comPrazo(new Date(2026, 10, 17, 18, 0));
    expect(prazoDe(adiarPrazo(S, i.id, 1, t), i.id)).toEqual(new Date(2026, 10, 18, 18, 0));
  });

  it('registra no histórico; sem prazo ou entregue não muda', () => {
    const [S, i] = comPrazo(new Date(2026, 10, 20, 14, 0));
    expect(adiarPrazo(S, i.id, 1, t).itens[0].historico.length).toBe(2);
    const [S2, sem] = comPrazo(null);
    expect(adiarPrazo(S2, sem.id, 1, t)).toBe(S2);
    const [S3, feita] = comPrazo(new Date(2026, 10, 20, 14, 0), 'feito');
    expect(adiarPrazo(S3, feita.id, 1, t)).toBe(S3);
  });
});
